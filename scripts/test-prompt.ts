import { parseArgs } from "node:util";
import { GoogleGenAI } from "@google/genai";
import { combinedSchema, assessmentSchema, phonemeFeedbackSchema, voiceProfileSchema } from "./lib/schemas";
import { buildAnalyzePrompt, buildAssessPrompt, buildPhonemePrompt, buildProfilePrompt } from "./lib/prompts";

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    mode: { type: "string", short: "m", default: "analyze" },
    model: { type: "string", default: "gemini-3-flash-preview" },
    prompt: { type: "string", short: "p" },
    phonemes: { type: "string", default: "general" },
    locale: { type: "string", short: "l", default: "en" },
    passage: { type: "string" },
    language: { type: "string", default: "english" },
    output: { type: "string", short: "o" },
    "no-schema": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Usage: bun run scripts/test-prompt.ts <audio-file> [options]

Positional:
  <audio-file>          Path to audio file (.webm, .wav, .mp3, .ogg, .m4a, .flac)

Options:
  --mode, -m            "analyze" | "assess" | "phoneme" | "profile"  (default: "analyze")
  --model               Gemini model ID                     (default: "gemini-3-flash-preview")
  --prompt, -p          Text the speaker was reading         (required for analyze/phoneme)
  --phonemes            Target phonemes, e.g. "θ,ð"         (default: "general")
  --locale, -l          Response language: en|ru|es|fr       (default: "en")
  --passage             Assessment passage text              (for assess mode)
  --language            Target language: english|german      (for assess mode, default: "english")
  -o, --output          Output path                          (default: scripts/results/<timestamp>.json)
  --no-schema           Disable schema enforcement (raw LLM output)
  --dry-run             Print assembled prompt without calling Gemini
  --verbose, -v         Print timing, token usage, raw response
  --help, -h            Show this help

Models available on free tier:
  gemini-3-flash-preview        (default, fast + capable)
  gemini-2.5-flash              (proven, used in production routes)
  gemini-2.5-pro                (better reasoning, lower quota)
`);
  process.exit(0);
}

const mode = values.mode as "analyze" | "assess" | "phoneme" | "profile";
const audioPath = positionals[0];

if (!audioPath) {
  console.error("Error: audio file path is required. Use --help for usage.");
  process.exit(1);
}

if (!["analyze", "assess", "phoneme", "profile"].includes(mode)) {
  console.error(`Error: invalid mode "${mode}". Must be analyze, assess, phoneme, or profile.`);
  process.exit(1);
}

if ((mode === "analyze" || mode === "phoneme") && !values.prompt) {
  console.error(`Error: --prompt is required for ${mode} mode.`);
  process.exit(1);
}
if (mode === "assess" && !values.passage) {
  console.error("Error: --passage is required for assess mode.");
  process.exit(1);
}

const ext = audioPath.slice(audioPath.lastIndexOf(".")).toLowerCase();
const mimeType = SUPPORTED_EXTENSIONS[ext];
if (!mimeType) {
  console.error(`Error: unsupported file extension "${ext}". Supported: ${Object.keys(SUPPORTED_EXTENSIONS).join(", ")}`);
  process.exit(1);
}

// Build prompt
let prompt: string;
let schema: object | undefined;

switch (mode) {
  case "analyze":
    prompt = await buildAnalyzePrompt({
      promptText: values.prompt!,
      phonemes: values.phonemes!,
      locale: values.locale!,
    });
    schema = combinedSchema;
    break;
  case "assess":
    prompt = await buildAssessPrompt({
      passage: values.passage!,
      targetLanguage: values.language!,
      locale: values.locale!,
    });
    schema = assessmentSchema;
    break;
  case "phoneme":
    prompt = await buildPhonemePrompt({
      promptText: values.prompt!,
      phonemes: values.phonemes!,
      locale: values.locale!,
    });
    schema = phonemeFeedbackSchema;
    break;
  case "profile":
    prompt = await buildProfilePrompt({
      locale: values.locale!,
    });
    schema = voiceProfileSchema;
    break;
}

if (values["no-schema"]) {
  schema = undefined;
}

// Dry run
if (values["dry-run"]) {
  console.log("=== DRY RUN ===");
  console.log(`Mode: ${mode}`);
  console.log(`Model: ${values.model}`);
  console.log(`Audio: ${audioPath} (${mimeType})`);
  console.log(`Schema: ${schema ? "enforced" : "disabled"}`);
  console.log(`Locale: ${values.locale}`);
  console.log("\n--- Prompt ---");
  console.log(prompt);
  console.log("\n--- Schema keys ---");
  if (schema && "properties" in schema) {
    console.log(Object.keys((schema as { properties: Record<string, unknown> }).properties).join(", "));
  } else {
    console.log("(none)");
  }
  process.exit(0);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY not set. Bun auto-loads .env.local — make sure it exists.");
  process.exit(1);
}

// Read audio file
const file = Bun.file(audioPath);
if (!(await file.exists())) {
  console.error(`Error: file not found: ${audioPath}`);
  process.exit(1);
}

const arrayBuffer = await file.arrayBuffer();
const base64Audio = Buffer.from(arrayBuffer).toString("base64");
const audioSizeBytes = arrayBuffer.byteLength;

console.log(`Sending ${mode} request to ${values.model}...`);
console.log(`Audio: ${audioPath} (${(audioSizeBytes / 1024).toFixed(1)} KB)`);

// Call Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const startTime = Date.now();

const response = await ai.models.generateContent({
  model: values.model!,
  contents: [
    {
      inlineData: {
        data: base64Audio,
        mimeType,
      },
    },
    prompt,
  ],
  config: schema
    ? {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    : undefined,
});

const latencyMs = Date.now() - startTime;
const rawText = response.text ?? "{}";
let tokenInfo: { prompt?: number; response?: number; total?: number } = {};

if (values.verbose) {
  console.log(`\nLatency: ${latencyMs}ms`);
  console.log(`Raw response (first 500 chars): ${rawText.slice(0, 500)}`);
  if (response.usageMetadata) {
    tokenInfo = {
      prompt: response.usageMetadata.promptTokenCount,
      response: response.usageMetadata.candidatesTokenCount,
      total: response.usageMetadata.totalTokenCount,
    };
    console.log(`Tokens — prompt: ${tokenInfo.prompt}, response: ${tokenInfo.response}, total: ${tokenInfo.total}`);
  }
}

const result = JSON.parse(rawText);

// Build output envelope
const now = new Date();
const timestamp = now.toISOString();
const fileTimestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

const output = {
  meta: {
    timestamp,
    model: values.model,
    mode,
    audioFile: audioPath,
    audioSizeBytes,
    ...(values.prompt && { promptText: values.prompt }),
    ...(values.passage && { passage: values.passage }),
    ...(mode !== "assess" && mode !== "profile" && { phonemes: values.phonemes }),
    locale: values.locale,
    schemaEnforced: !!schema,
    latencyMs,
    ...(tokenInfo.total && { tokens: tokenInfo }),
  },
  result,
};

// Write output
const outputPath =
  values.output ??
  `scripts/results/${fileTimestamp}-${mode}-${values.model!.replace(/[/.]/g, "-")}.json`;

await Bun.write(outputPath, JSON.stringify(output, null, 2));

// Print summary
const score = mode === "analyze"
  ? result.simple?.score ?? result.detailed?.overallScore
  : mode === "assess" || mode === "profile"
    ? result.overallScore
    : result.score;

console.log(`\nDone in ${latencyMs}ms`);
console.log(`Score: ${score ?? "N/A"}`);
console.log(`Output: ${outputPath}`);
