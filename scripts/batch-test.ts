import { parseArgs } from "node:util";
import { resolve, basename, extname } from "node:path";
import { mkdir } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { voiceProfileSchema } from "./lib/schemas";
import { buildProfilePrompt } from "./lib/prompts";

const MIME_TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};

// --- CLI ---

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    models: { type: "string", short: "m", default: "gemini-2.5-flash,gemini-3-flash-preview,gemini-3.1-pro-preview" },
    "samples-dir": { type: "string", default: "scripts/recordings/socks" },
    "output-dir": { type: "string" },
    delay: { type: "string", default: "1000" },
    "prompt-variant": { type: "string", short: "p" },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Usage: bun run scripts/batch-test.ts [options]

Options:
  --models, -m     Comma-separated model IDs (default: "gemini-2.5-flash,gemini-3-flash-preview,gemini-3.1-pro-preview")
  --samples-dir    Path to samples directory (default: "scripts/recordings/socks")
  --output-dir     Output directory (default: "scripts/results/batch-<timestamp>")
  --delay          Delay between requests in ms (default: 1000)
  -p, --prompt-variant  Prompt variant suffix (e.g., "2" loads profile2.md)
  --verbose, -v    Print per-request details
  --help, -h       Show this help
`);
  process.exit(0);
}

// --- Types ---

interface Sample {
  file: string;
  accent: string;
  gender: string;
  label: string;
}

interface RunResult {
  sample: Sample;
  model: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  result?: any;
}

// --- Config ---

const models = values.models!.split(",").map((m) => m.trim());
const samplesDir = values["samples-dir"]!;
const delay = parseInt(values.delay!, 10);
const verbose = values.verbose!;

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const outputDir = values["output-dir"] ?? `scripts/results/batch-${timestamp}`;
const rawDir = resolve(outputDir, "raw");

// --- Accent matching ---

type AccuracyLevel = "correct" | "partial" | "wrong";

// Word-boundary-aware check: "american" matches "American English" but not "Latin American"
function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(text);
}

// Each ground truth accent maps to: correct keywords, partial keywords
const ACCENT_RULES: Record<string, { correct: string[]; partial: string[] }> = {
  german:          { correct: ["german", "germany"],   partial: ["germanic", "european", "dutch", "austrian"] },
  french:          { correct: ["french", "france"],     partial: ["romance", "francophone"] },
  indian:          { correct: ["indian", "india", "hindi", "south asian", "bengali", "tamil", "punjabi"], partial: ["asian"] },
  australian:      { correct: ["australian", "australia", "aussie"], partial: ["british", "new zealand"] },
  russian:         { correct: ["russian", "russia"],    partial: ["slavic", "eastern european", "ukrainian"] },
  american:        { correct: ["american", "general american", "usa", "united states"], partial: ["north american", "canadian", "midwestern"] },
  "american-texan": { correct: ["texan", "southern american", "texas"], partial: ["american", "southern"] },
  galician:        { correct: ["galician", "spanish", "iberian", "spain"], partial: ["portuguese", "latin", "romance"] },
};

function matchAccent(detected: string, groundTruth: string): AccuracyLevel {
  const rules = ACCENT_RULES[groundTruth.toLowerCase()];
  if (!rules) {
    // Fallback for unknown ground truth: direct word match
    return hasWord(detected, groundTruth) ? "correct" : "wrong";
  }

  for (const kw of rules.correct) {
    if (hasWord(detected, kw)) return "correct";
  }
  for (const kw of rules.partial) {
    if (hasWord(detected, kw)) return "partial";
  }
  return "wrong";
}

function matchGender(detected: string, groundTruth: string): boolean {
  return detected.toLowerCase() === groundTruth.toLowerCase();
}

// --- Main ---

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY not set. Bun auto-loads .env.local — make sure it exists.");
    process.exit(1);
  }

  // Load samples
  const samplesPath = resolve(samplesDir, "samples.json");
  const samples: Sample[] = JSON.parse(await Bun.file(samplesPath).text());
  console.log(`Loaded ${samples.length} samples from ${samplesPath}`);
  console.log(`Models: ${models.join(", ")}`);
  console.log(`Output: ${outputDir}\n`);

  // Create output dirs
  await mkdir(rawDir, { recursive: true });

  // Build prompt once (same for all)
  const variant = values["prompt-variant"];
  const prompt = await buildProfilePrompt({ locale: "en", variant });
  if (variant) console.log(`Prompt variant: profile${variant}.md`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const allResults: RunResult[] = [];

  // Run each model sequentially to avoid quota bursts
  for (const model of models) {
    console.log(`\n--- Model: ${model} ---`);

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const audioPath = resolve(samplesDir, sample.file);
      const sampleName = basename(sample.file, extname(sample.file));

      // Read audio
      const file = Bun.file(audioPath);
      if (!(await file.exists())) {
        console.error(`  Skipping ${sample.file}: file not found`);
        allResults.push({ sample, model, success: false, latencyMs: 0, error: "FILE_NOT_FOUND" });
        continue;
      }

      const ext = extname(sample.file).toLowerCase();
      const mimeType = MIME_TYPES[ext];
      if (!mimeType) {
        console.error(`  Skipping ${sample.file}: unsupported extension "${ext}"`);
        allResults.push({ sample, model, success: false, latencyMs: 0, error: "UNSUPPORTED_FORMAT" });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");

      if (verbose) {
        console.log(`  [${i + 1}/${samples.length}] ${sample.file} (${(arrayBuffer.byteLength / 1024).toFixed(0)} KB)`);
      } else {
        process.stdout.write(`  ${sampleName}... `);
      }

      const startTime = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { data: base64Audio, mimeType } },
              { text: prompt },
            ],
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: voiceProfileSchema,
          },
        });

        const latencyMs = Date.now() - startTime;
        let rawText = response.text ?? "{}";
        // Strip markdown code fences if model ignores responseMimeType
        rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        const result = JSON.parse(rawText);

        const runResult: RunResult = { sample, model, success: true, latencyMs, result };
        allResults.push(runResult);

        // Save individual result
        const outFile = resolve(rawDir, `${sampleName}-${model.replace(/[/.]/g, "-")}.json`);
        await Bun.write(outFile, JSON.stringify({ meta: { model, sample, latencyMs, timestamp: new Date().toISOString() }, result }, null, 2));

        const gender = result.speaker?.estimatedGender ?? "?";
        const accent = result.accent?.detectedLanguage ?? "?";
        const score = result.overallScore ?? "?";
        const genderOk = matchGender(gender, sample.gender);
        const accentOk = matchAccent(accent, sample.accent);

        if (verbose) {
          console.log(`    ${latencyMs}ms | gender: ${gender} ${genderOk ? "✓" : "✗"} | accent: ${accent} (${accentOk}) | score: ${score}`);
        } else {
          console.log(`${latencyMs}ms | ${genderOk ? "✓" : "✗"} ${gender} | ${accentOk} ${accent} | ${score}`);
        }
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = err.message?.includes("429")
          ? "429 RESOURCE_EXHAUSTED"
          : err.message?.includes("404")
            ? "404 MODEL_NOT_FOUND"
            : err.message?.slice(0, 100) ?? "UNKNOWN_ERROR";

        allResults.push({ sample, model, success: false, latencyMs, error: errorMsg });

        if (verbose) {
          console.log(`    ERROR: ${errorMsg} (${latencyMs}ms)`);
        } else {
          console.log(`ERROR: ${errorMsg}`);
        }
      }

      // Delay between requests
      await Bun.sleep(delay);
    }
  }

  // --- Generate reports ---
  console.log("\n\nGenerating reports...");

  const reportJson = generateJsonReport(samples, models, allResults);
  const reportMd = generateMarkdownReport(samples, models, allResults, reportJson);

  await Bun.write(resolve(outputDir, "report.json"), JSON.stringify(reportJson, null, 2));
  await Bun.write(resolve(outputDir, "report.md"), reportMd);

  console.log(`\nResults saved to ${outputDir}/`);
  console.log(`  report.md  — human-readable comparison`);
  console.log(`  report.json — structured data`);
  console.log(`  raw/       — ${allResults.filter((r) => r.success).length} individual results`);
}

// --- Report generation ---

interface ModelStats {
  model: string;
  total: number;
  genderCorrect: number;
  accentCorrect: number;
  accentPartial: number;
  avgScore: number;
  avgLatency: number;
  errors: number;
}

function generateJsonReport(samples: Sample[], models: string[], results: RunResult[]) {
  const perModel: Record<string, ModelStats> = {};

  for (const model of models) {
    const modelResults = results.filter((r) => r.model === model);
    const successful = modelResults.filter((r) => r.success);

    let genderCorrect = 0;
    let accentCorrect = 0;
    let accentPartial = 0;
    let totalScore = 0;
    let totalLatency = 0;

    for (const r of successful) {
      const gender = r.result?.speaker?.estimatedGender ?? "";
      const accent = r.result?.accent?.detectedLanguage ?? "";
      const score = r.result?.overallScore ?? 0;

      if (matchGender(gender, r.sample.gender)) genderCorrect++;
      const am = matchAccent(accent, r.sample.accent);
      if (am === "correct") accentCorrect++;
      if (am === "partial") accentPartial++;
      totalScore += score;
      totalLatency += r.latencyMs;
    }

    perModel[model] = {
      model,
      total: modelResults.length,
      genderCorrect,
      accentCorrect,
      accentPartial,
      avgScore: successful.length > 0 ? +(totalScore / successful.length).toFixed(1) : 0,
      avgLatency: successful.length > 0 ? Math.round(totalLatency / successful.length) : 0,
      errors: modelResults.filter((r) => !r.success).length,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    models,
    sampleCount: samples.length,
    perModel,
    results: results.map((r) => ({
      file: r.sample.file,
      model: r.model,
      success: r.success,
      latencyMs: r.latencyMs,
      error: r.error,
      detectedGender: r.result?.speaker?.estimatedGender,
      detectedAccent: r.result?.accent?.detectedLanguage,
      score: r.result?.overallScore,
      groundTruthGender: r.sample.gender,
      groundTruthAccent: r.sample.accent,
    })),
  };
}

function generateMarkdownReport(samples: Sample[], models: string[], results: RunResult[], report: any): string {
  const lines: string[] = [];
  lines.push(`# Batch Voice Profile Test — ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(`**Models:** ${models.join(", ")}  `);
  lines.push(`**Samples:** ${samples.length}  `);
  lines.push("");

  // --- Comparison table ---
  lines.push("## Per-Sample Results");
  lines.push("");

  // Header
  const headerCols = ["Sample", "Ground Truth"];
  for (const model of models) {
    const short = model.replace("gemini-", "").replace("-preview", "");
    headerCols.push(`${short}: Gender`, `${short}: Accent`, `${short}: Score`);
  }
  lines.push(`| ${headerCols.join(" | ")} |`);
  lines.push(`| ${headerCols.map(() => "---").join(" | ")} |`);

  // Rows
  for (const sample of samples) {
    const sampleName = basename(sample.file, extname(sample.file));
    const row = [sampleName, `${sample.gender} / ${sample.accent}`];

    for (const model of models) {
      const r = results.find((r) => r.model === model && r.sample.file === sample.file);
      if (!r || !r.success) {
        row.push(r?.error ?? "—", "—", "—");
        continue;
      }

      const gender = r.result?.speaker?.estimatedGender ?? "?";
      const accent = r.result?.accent?.detectedLanguage ?? "?";
      const score = r.result?.overallScore ?? "?";

      const genderOk = matchGender(gender, sample.gender);
      const accentMatch = matchAccent(accent, sample.accent);

      const genderIcon = genderOk ? "✓" : "✗";
      const accentIcon = accentMatch === "correct" ? "✓" : accentMatch === "partial" ? "~" : "✗";

      row.push(`${genderIcon} ${gender}`, `${accentIcon} ${accent}`, String(score));
    }

    lines.push(`| ${row.join(" | ")} |`);
  }

  // --- Summary stats ---
  lines.push("");
  lines.push("## Model Summary");
  lines.push("");
  lines.push("| Metric | " + models.map((m) => m.replace("gemini-", "").replace("-preview", "")).join(" | ") + " |");
  lines.push("| --- | " + models.map(() => "---").join(" | ") + " |");

  const stats = report.perModel as Record<string, ModelStats>;
  const successful = (m: string) => stats[m].total - stats[m].errors;

  lines.push(`| Gender accuracy | ${models.map((m) => {
    const s = stats[m];
    const n = successful(m);
    return n > 0 ? `${s.genderCorrect}/${n} (${((s.genderCorrect / n) * 100).toFixed(0)}%)` : "—";
  }).join(" | ")} |`);

  lines.push(`| Accent correct | ${models.map((m) => {
    const s = stats[m];
    const n = successful(m);
    return n > 0 ? `${s.accentCorrect}/${n} (${((s.accentCorrect / n) * 100).toFixed(0)}%)` : "—";
  }).join(" | ")} |`);

  lines.push(`| Accent partial | ${models.map((m) => {
    const s = stats[m];
    const n = successful(m);
    return n > 0 ? `${s.accentPartial}/${n}` : "—";
  }).join(" | ")} |`);

  lines.push(`| Avg score | ${models.map((m) => stats[m].avgScore || "—").join(" | ")} |`);
  lines.push(`| Avg latency | ${models.map((m) => stats[m].avgLatency ? `${stats[m].avgLatency}ms` : "—").join(" | ")} |`);
  lines.push(`| Success rate | ${models.map((m) => {
    const s = stats[m];
    const n = successful(m);
    return `${n}/${s.total} (${((n / s.total) * 100).toFixed(0)}%)`;
  }).join(" | ")} |`);
  lines.push(`| Errors | ${models.map((m) => stats[m].errors).join(" | ")} |`);

  lines.push("");
  lines.push("---");
  lines.push(`*Generated by batch-test.ts*`);
  lines.push("");

  return lines.join("\n");
}

main();
