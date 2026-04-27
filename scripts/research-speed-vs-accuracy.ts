/**
 * Speed vs Accuracy Benchmark for Phoneme Analysis
 *
 * Tests 8 model/schema configurations against 30 speechocean762 samples
 * with expert ground truth. Measures latency and accuracy.
 *
 * Usage:
 *   bun run scripts/research-speed-vs-accuracy.ts              # full run (30 samples)
 *   bun run scripts/research-speed-vs-accuracy.ts --limit 2    # dry run (2 samples)
 */

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { readdir, mkdir } from "node:fs/promises";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values: cliArgs } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    limit: { type: "string", short: "l" },
    delay: { type: "string", default: "2000" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (cliArgs.help) {
  console.log(`
Usage: bun run scripts/research-speed-vs-accuracy.ts [options]

Options:
  --limit, -l   Max samples to process (default: all 30)
  --delay       Delay between API calls in ms (default: 2000)
  --help, -h    Show this help
`);
  process.exit(0);
}

const sampleLimit = cliArgs.limit ? parseInt(cliArgs.limit, 10) : Infinity;
const delayMs = parseInt(cliArgs.delay!, 10);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpeechoceanSample {
  file: string;
  text: string;
  duration: number;
  score_accuracy: number;
  score_fluency: number;
  score_prosodic: number;
  score_total: number;
  tier: "low" | "mid" | "high";
  words: {
    text: string;
    accuracy: number;
    mispronunciations?: { canonical: string; produced: string }[];
  }[];
  phonemes?: {
    text: string;
    accuracy: number;
    word: string;
  }[];
}

interface Config {
  id: string;
  model: string;
  schema: "full" | "light";
  thinkingBudget: number;
}

interface RawResult {
  configId: string;
  sampleFile: string;
  latencyMs: number;
  response?: any;
  error?: string;
}

// ---------------------------------------------------------------------------
// Configs
// ---------------------------------------------------------------------------

const CONFIGS: Config[] = [
  // Phase 1: all models, thinking off
  { id: "A", model: "gemini-2.5-flash",              schema: "full",  thinkingBudget: 0 },
  { id: "B", model: "gemini-2.5-flash",              schema: "light", thinkingBudget: 0 },
  { id: "C", model: "gemini-2.5-flash-lite",         schema: "full",  thinkingBudget: 0 },
  { id: "D", model: "gemini-2.5-flash-lite",         schema: "light", thinkingBudget: 0 },
  { id: "E", model: "gemini-3-flash-preview",        schema: "full",  thinkingBudget: 0 },
  { id: "F", model: "gemini-3-flash-preview",        schema: "light", thinkingBudget: 0 },
  { id: "G", model: "gemini-3.1-flash-lite-preview", schema: "full",  thinkingBudget: 0 },
  { id: "H", model: "gemini-3.1-flash-lite-preview", schema: "light", thinkingBudget: 0 },
  // Phase 2: thinking budget sweep on winners (E=accuracy, H=speed)
  { id: "E1k",  model: "gemini-3-flash-preview",        schema: "full",  thinkingBudget: 1024 },
  { id: "E4k",  model: "gemini-3-flash-preview",        schema: "full",  thinkingBudget: 4096 },
  { id: "E16k", model: "gemini-3-flash-preview",        schema: "full",  thinkingBudget: 16384 },
  { id: "H1k",  model: "gemini-3.1-flash-lite-preview", schema: "light", thinkingBudget: 1024 },
  { id: "H4k",  model: "gemini-3.1-flash-lite-preview", schema: "light", thinkingBudget: 4096 },
  { id: "H16k", model: "gemini-3.1-flash-lite-preview", schema: "light", thinkingBudget: 16384 },
];

// ---------------------------------------------------------------------------
// REST-format schemas (no SDK Type enum — plain strings for REST API)
// ---------------------------------------------------------------------------

const fullSchema = {
  type: "OBJECT",
  properties: {
    simple: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER", description: "Overall pronunciation score 1-10" },
        summary: { type: "STRING", description: "Short friendly summary" },
        strengths: { type: "ARRAY", items: { type: "STRING" }, description: "1-3 strengths" },
        improvements: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              issue: { type: "STRING" },
              tip: { type: "STRING" },
            },
            required: ["issue", "tip"],
          },
        },
      },
      required: ["score", "summary", "strengths", "improvements"],
    },
    detailed: {
      type: "OBJECT",
      properties: {
        accent: {
          type: "OBJECT",
          properties: {
            detectedLanguage: { type: "STRING" },
            confidence: { type: "STRING" },
            telltalePatterns: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["detectedLanguage", "confidence", "telltalePatterns"],
        },
        phonemeAnalysis: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              phoneme: { type: "STRING" },
              word: { type: "STRING" },
              rating: { type: "STRING" },
              produced: { type: "STRING" },
              expected: { type: "STRING" },
              substitution: { type: "STRING", nullable: true },
            },
            required: ["phoneme", "word", "rating", "produced", "expected"],
          },
        },
        prosody: {
          type: "OBJECT",
          properties: {
            stressAccuracy: { type: "STRING" },
            rhythmNotes: { type: "STRING" },
            intonationNotes: { type: "STRING" },
          },
          required: ["stressAccuracy", "rhythmNotes", "intonationNotes"],
        },
        overallScore: { type: "NUMBER", description: "Overall score 1-10" },
        tips: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              targetSound: { type: "STRING" },
              exercise: { type: "STRING" },
              practiceWord: { type: "STRING" },
            },
            required: ["targetSound", "exercise", "practiceWord"],
          },
        },
      },
      required: ["accent", "phonemeAnalysis", "prosody", "overallScore", "tips"],
    },
    textMatch: { type: "STRING" },
    wordScores: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          index: { type: "NUMBER" },
          score: { type: "NUMBER", description: "1-10" },
          rating: { type: "STRING" },
          issue: { type: "STRING", nullable: true },
        },
        required: ["word", "index", "score", "rating"],
      },
    },
  },
  required: ["simple", "detailed", "textMatch", "wordScores"],
};

const lightSchema = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER", description: "Pronunciation quality score 1-10" },
    summary: { type: "STRING", description: "Short friendly 1-2 sentence summary" },
    tip: { type: "STRING", description: "One concrete actionable tip" },
    phonemeRating: { type: "STRING", description: "good, acceptable, or needs_work" },
    produced: { type: "STRING", description: "What sound the speaker actually produced" },
    expected: { type: "STRING", description: "What a native speaker would produce" },
  },
  required: ["score", "summary", "tip", "phonemeRating", "produced", "expected"],
};

// ---------------------------------------------------------------------------
// Prompts (inlined from production routes)
// ---------------------------------------------------------------------------

function buildFullPrompt(text: string): string {
  return `You are an expert phonetician and accent coach. Listen carefully to this audio recording and analyse the SOUNDS — how they are physically produced — not just the words.

The speaker was asked to read: "${text}"
Target phonemes to focus on: general

Provide TWO views of your analysis plus a per-word scoring:

1. "detailed" — Full technical analysis: accent origin and telltale patterns, per-phoneme production quality (tongue position, voicing, aspiration, vowel quality) with IPA, sound substitutions, stress/rhythm/intonation, and concrete practice exercises. Be honest and detailed.

2. "simple" — A friendly plain-language summary of the SAME analysis above. No technical terms, no IPA symbols, no phonetics jargon. Describe sounds using everyday words (e.g., 'the "th" sounded like a "d"'). Include what went well and practical tips. Be honest but encouraging.

3. "wordScores" — For EVERY word in the prompt text, in reading order, assign a pronunciation quality score (1-10) and rate it as good/acceptable/needs_work. If a word had issues, briefly note what was wrong. Include ALL words, even small ones like "the", "is", "a".

All views must reflect the same underlying analysis — the simple view is an accessible overview of the detailed findings.

IMPORTANT: Respond entirely in English.`;
}

function buildLightPrompt(text: string): string {
  return `You are an expert phonetician and pronunciation coach. Listen carefully to this audio recording.

The speaker is practicing pronunciation. They were asked to say: "${text}"
Target phoneme: general

Evaluate how well they produced the sounds. This is a sentence reading exercise.

Be specific about:
- Whether the sounds were correctly produced
- What the speaker actually said vs what was expected
- One clear, physical tip for improvement (tongue position, lip shape, airflow, voicing)

Be encouraging but honest. If they got it right, celebrate that!

IMPORTANT: Respond entirely in English.`;
}

// ---------------------------------------------------------------------------
// Gemini REST API call
// ---------------------------------------------------------------------------

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY not set.");
  process.exit(1);
}

async function callGemini(
  model: string,
  base64Audio: string,
  mimeType: string,
  prompt: string,
  schema: object,
  thinkingBudget: number = 0,
): Promise<{ latencyMs: number; response?: any; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { data: base64Audio, mime_type: mimeType } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: schema,
      thinking_config: { thinking_budget: thinkingBudget },
    },
  };

  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      const errBody = await res.text();
      return { latencyMs, error: `HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { latencyMs, error: "No text in response" };
    }

    const parsed = JSON.parse(text);
    return { latencyMs, response: parsed };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { latencyMs, error: err.message?.slice(0, 200) ?? "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Accuracy metrics
// ---------------------------------------------------------------------------

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? NaN : num / den;
}

function mae(xs: number[], ys: number[]): number {
  if (xs.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < xs.length; i++) sum += Math.abs(xs[i] - ys[i]);
  return sum / xs.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const samplesDir = resolve("scripts/recordings/speechocean");
  const samplesPath = resolve(samplesDir, "samples.json");

  if (!(await Bun.file(samplesPath).exists())) {
    console.error(`Error: ${samplesPath} not found.`);
    console.error("Download speechocean762 samples first.");
    process.exit(1);
  }

  const allSamples: SpeechoceanSample[] = JSON.parse(
    await Bun.file(samplesPath).text()
  );
  const samples = allSamples.slice(0, sampleLimit);

  console.log(`Samples: ${samples.length}/${allSamples.length}`);
  console.log(`Configs: ${CONFIGS.length} (${CONFIGS.map(c => c.id).join(", ")})`);
  console.log(`Total calls: ${samples.length * CONFIGS.length}`);
  console.log(`Delay: ${delayMs}ms\n`);

  // Pre-load all audio as base64
  const audioMap = new Map<string, string>();
  for (const s of samples) {
    const path = resolve(samplesDir, s.file);
    const buf = await Bun.file(path).arrayBuffer();
    audioMap.set(s.file, Buffer.from(buf).toString("base64"));
  }
  console.log(`Loaded ${audioMap.size} audio files\n`);

  // Load previous results for incremental mode
  const dateStr = new Date().toISOString().slice(0, 10);
  const rawJsonPath = resolve(`docs/research/${dateStr}-speed-vs-accuracy-raw.json`);
  const mdPath = resolve(`docs/research/${dateStr}-speed-vs-accuracy.md`);

  let results: RawResult[] = [];
  const doneKeys = new Set<string>();

  if (await Bun.file(rawJsonPath).exists()) {
    const prev = JSON.parse(await Bun.file(rawJsonPath).text());
    results = prev.results ?? [];
    for (const r of results) {
      if (!r.error) doneKeys.add(`${r.configId}:${r.sampleFile}`);
    }
    console.log(`Incremental: ${doneKeys.size} completed combos loaded, skipping.\n`);
  }

  // Run all configs x samples
  for (const config of CONFIGS) {
    console.log(`\n--- Config ${config.id}: ${config.model} / ${config.schema} / think=${config.thinkingBudget} ---`);
    const schema = config.schema === "full" ? fullSchema : lightSchema;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const key = `${config.id}:${sample.file}`;

      if (doneKeys.has(key)) {
        process.stdout.write(`  [${i + 1}/${samples.length}] ${sample.file} SKIP\n`);
        continue;
      }

      const base64 = audioMap.get(sample.file)!;
      const prompt = config.schema === "full"
        ? buildFullPrompt(sample.text)
        : buildLightPrompt(sample.text);

      process.stdout.write(`  [${i + 1}/${samples.length}] ${sample.file}... `);

      const { latencyMs, response, error } = await callGemini(
        config.model, base64, "audio/wav", prompt, schema, config.thinkingBudget
      );

      const result: RawResult = {
        configId: config.id,
        sampleFile: sample.file,
        latencyMs,
        response,
        error,
      };
      results.push(result);

      if (error) {
        console.log(`ERROR ${latencyMs}ms: ${error.slice(0, 80)}`);
      } else {
        const score = config.schema === "full"
          ? response?.detailed?.overallScore ?? response?.simple?.score ?? "?"
          : response?.score ?? "?";
        console.log(`${latencyMs}ms | score: ${score}`);
      }

      // Save incrementally
      await Bun.write(rawJsonPath, JSON.stringify({ results }, null, 2));

      // Rate limit delay
      if (i < samples.length - 1 || config !== CONFIGS[CONFIGS.length - 1]) {
        await Bun.sleep(delayMs);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Generate report
  // ---------------------------------------------------------------------------
  console.log("\n\nGenerating report...");

  const report = generateReport(samples, results);
  await Bun.write(rawJsonPath, JSON.stringify({ results, report: report.json }, null, 2));
  await Bun.write(mdPath, report.markdown);

  console.log(`\nOutput:`);
  console.log(`  ${rawJsonPath}`);
  console.log(`  ${mdPath}`);
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

interface ConfigMetrics {
  configId: string;
  model: string;
  schema: string;
  thinkingBudget: number;
  count: number;
  errors: number;
  latency: { avg: number; p50: number; p95: number; min: number; max: number };
  latencyByDuration: {
    short: { avg: number; count: number };
    medium: { avg: number; count: number };
    long: { avg: number; count: number };
  };
  sentenceCorrelation: number;
  sentenceMAE: number;
  wordCorrelation?: number;
  wordMAE?: number;
  mispronDetectionRate?: number;
}

function generateReport(
  samples: SpeechoceanSample[],
  results: RawResult[]
): { json: any; markdown: string } {
  const sampleMap = new Map(samples.map(s => [s.file, s]));
  const metrics: ConfigMetrics[] = [];

  for (const config of CONFIGS) {
    const configResults = results.filter(r => r.configId === config.id && !r.error);
    const allConfigResults = results.filter(r => r.configId === config.id);

    // Latency
    const latencies = configResults.map(r => r.latencyMs).sort((a, b) => a - b);
    const latency = latencies.length > 0 ? {
      avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      min: latencies[0],
      max: latencies[latencies.length - 1],
    } : { avg: 0, p50: 0, p95: 0, min: 0, max: 0 };

    // Latency by duration bucket
    const buckets = { short: [] as number[], medium: [] as number[], long: [] as number[] };
    for (const r of configResults) {
      const s = sampleMap.get(r.sampleFile);
      if (!s) continue;
      const bucket = s.duration < 4 ? "short" : s.duration < 8 ? "medium" : "long";
      buckets[bucket].push(r.latencyMs);
    }
    const latencyByDuration = {
      short: { avg: avg(buckets.short), count: buckets.short.length },
      medium: { avg: avg(buckets.medium), count: buckets.medium.length },
      long: { avg: avg(buckets.long), count: buckets.long.length },
    };

    // Sentence-level accuracy
    const geminiScores: number[] = [];
    const expertScores: number[] = [];
    for (const r of configResults) {
      const s = sampleMap.get(r.sampleFile);
      if (!s) continue;
      const geminiScore = config.schema === "full"
        ? (r.response?.detailed?.overallScore ?? r.response?.simple?.score)
        : r.response?.score;
      if (typeof geminiScore === "number") {
        geminiScores.push(geminiScore);
        expertScores.push(s.score_accuracy);
      }
    }

    const sentenceCorrelation = pearsonCorrelation(geminiScores, expertScores);
    const sentenceMAE_ = mae(geminiScores, expertScores);

    // Word-level accuracy (full schema only)
    let wordCorrelation: number | undefined;
    let wordMAE_: number | undefined;
    let mispronDetectionRate: number | undefined;

    if (config.schema === "full") {
      const gWordScores: number[] = [];
      const eWordScores: number[] = [];
      let mispronTotal = 0;
      let mispronDetected = 0;

      for (const r of configResults) {
        const s = sampleMap.get(r.sampleFile);
        if (!s || !r.response?.wordScores) continue;

        const geminiWords: { word: string; score: number }[] = r.response.wordScores;
        const expertWords = s.words;

        // Match by position (both in reading order)
        const len = Math.min(geminiWords.length, expertWords.length);
        for (let i = 0; i < len; i++) {
          const gw = geminiWords[i];
          const ew = expertWords[i];
          if (typeof gw.score === "number" && typeof ew.accuracy === "number") {
            gWordScores.push(gw.score);
            eWordScores.push(ew.accuracy);
          }
          // Mispronunciation detection
          if (ew.mispronunciations && ew.mispronunciations.length > 0) {
            mispronTotal++;
            if (gw.score <= 5) mispronDetected++;
          }
        }
      }

      if (gWordScores.length > 2) {
        wordCorrelation = pearsonCorrelation(gWordScores, eWordScores);
        wordMAE_ = mae(gWordScores, eWordScores);
      }
      if (mispronTotal > 0) {
        mispronDetectionRate = mispronDetected / mispronTotal;
      }
    }

    metrics.push({
      configId: config.id,
      model: config.model,
      schema: config.schema,
      thinkingBudget: config.thinkingBudget,
      count: configResults.length,
      errors: allConfigResults.length - configResults.length,
      latency,
      latencyByDuration,
      sentenceCorrelation,
      sentenceMAE: sentenceMAE_,
      wordCorrelation,
      wordMAE: wordMAE_,
      mispronDetectionRate,
    });
  }

  // Build markdown
  const md = buildMarkdown(metrics, samples, results, sampleMap);

  return { json: { metrics, generatedAt: new Date().toISOString() }, markdown: md };
}

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function fmt(n: number | undefined, decimals = 2): string {
  if (n === undefined || isNaN(n)) return "-";
  return n.toFixed(decimals);
}

function buildMarkdown(
  metrics: ConfigMetrics[],
  samples: SpeechoceanSample[],
  results: RawResult[],
  sampleMap: Map<string, SpeechoceanSample>
): string {
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# Speed vs Accuracy Benchmark — ${date}`);
  lines.push("");
  lines.push(`**Samples:** ${samples.length} (speechocean762, Mandarin L1 speakers)  `);
  lines.push(`**Configs:** ${CONFIGS.length}  `);
  lines.push(`**Phase 1:** A-H (thinking off), **Phase 2:** E/H with thinking budgets 1k/4k/16k  `);
  lines.push("");

  // 1. Latency Summary
  lines.push("## 1. Latency Summary");
  lines.push("");
  lines.push("| Config | Model | Schema | Think | Avg | P50 | P95 | Min | Max | Errors |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const m of metrics) {
    const shortModel = m.model.replace("gemini-", "");
    const think = m.thinkingBudget === 0 ? "off" : `${m.thinkingBudget}`;
    lines.push(`| ${m.configId} | ${shortModel} | ${m.schema} | ${think} | ${m.latency.avg}ms | ${m.latency.p50}ms | ${m.latency.p95}ms | ${m.latency.min}ms | ${m.latency.max}ms | ${m.errors} |`);
  }
  lines.push("");

  // 2. Latency by Duration
  lines.push("## 2. Latency by Audio Duration");
  lines.push("");
  lines.push("| Config | Short (<4s) | Medium (4-8s) | Long (>8s) |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const m of metrics) {
    const s = m.latencyByDuration;
    lines.push(`| ${m.configId} | ${s.short.avg}ms (n=${s.short.count}) | ${s.medium.avg}ms (n=${s.medium.count}) | ${s.long.avg}ms (n=${s.long.count}) |`);
  }
  lines.push("");

  // 3. Accuracy Summary
  lines.push("## 3. Accuracy Summary");
  lines.push("");
  lines.push("| Config | Schema | Think | Sentence r | Sentence MAE | Word r | Word MAE | Mispron Detect |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const m of metrics) {
    const think = m.thinkingBudget === 0 ? "off" : `${m.thinkingBudget}`;
    lines.push(`| ${m.configId} | ${m.schema} | ${think} | ${fmt(m.sentenceCorrelation)} | ${fmt(m.sentenceMAE)} | ${fmt(m.wordCorrelation)} | ${fmt(m.wordMAE)} | ${m.mispronDetectionRate !== undefined ? (m.mispronDetectionRate * 100).toFixed(0) + "%" : "-"} |`);
  }
  lines.push("");

  // 4. Speed vs Accuracy
  lines.push("## 4. Speed vs Accuracy");
  lines.push("");
  lines.push("| Config | Model | Schema | Think | Avg Latency | Sentence r | Sentence MAE |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: |");
  for (const m of metrics) {
    const shortModel = m.model.replace("gemini-", "");
    const think = m.thinkingBudget === 0 ? "off" : `${m.thinkingBudget}`;
    lines.push(`| ${m.configId} | ${shortModel} | ${m.schema} | ${think} | ${m.latency.avg}ms | ${fmt(m.sentenceCorrelation)} | ${fmt(m.sentenceMAE)} |`);
  }
  lines.push("");

  // 5. Per-Sample Detail Table
  lines.push("## 5. Per-Sample Details");
  lines.push("");
  lines.push("<details><summary>Click to expand</summary>");
  lines.push("");
  const configIds = CONFIGS.map(c => c.id);
  lines.push(`| Sample | Duration | Expert | ${configIds.map(id => `${id} score`).join(" | ")} | ${configIds.map(id => `${id} ms`).join(" | ")} |`);
  lines.push(`| --- | ---: | ---: | ${configIds.map(() => "---:").join(" | ")} | ${configIds.map(() => "---:").join(" | ")} |`);

  for (const sample of samples) {
    const row = [sample.file, `${sample.duration}s`, String(sample.score_accuracy)];
    // Scores
    for (const cid of configIds) {
      const r = results.find(r => r.configId === cid && r.sampleFile === sample.file && !r.error);
      if (!r) { row.push("-"); continue; }
      const cfg = CONFIGS.find(c => c.id === cid)!;
      const score = cfg.schema === "full"
        ? (r.response?.detailed?.overallScore ?? r.response?.simple?.score ?? "-")
        : (r.response?.score ?? "-");
      row.push(String(score));
    }
    // Latencies
    for (const cid of configIds) {
      const r = results.find(r => r.configId === cid && r.sampleFile === sample.file);
      row.push(r ? `${r.latencyMs}` : "-");
    }
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");

  // 6. Recommendation
  lines.push("## 6. Recommendation");
  lines.push("");

  // Find best for short drills (light schema, lowest latency with acceptable accuracy)
  const lightMetrics = metrics.filter(m => m.schema === "light");
  const fullMetrics = metrics.filter(m => m.schema === "full");

  const bestLight = lightMetrics
    .filter(m => m.count > 0)
    .sort((a, b) => a.latency.avg - b.latency.avg)[0];
  const bestFull = fullMetrics
    .filter(m => m.count > 0 && !isNaN(m.sentenceCorrelation))
    .sort((a, b) => (b.sentenceCorrelation ?? 0) - (a.sentenceCorrelation ?? 0))[0];

  if (bestLight) {
    lines.push(`**Best for short drills (speed):** Config ${bestLight.configId} — ${bestLight.model} / light schema — ${bestLight.latency.avg}ms avg, sentence r=${fmt(bestLight.sentenceCorrelation)}`);
  }
  if (bestFull) {
    lines.push(`**Best for sentences (accuracy):** Config ${bestFull.configId} — ${bestFull.model} / full schema — sentence r=${fmt(bestFull.sentenceCorrelation)}, word r=${fmt(bestFull.wordCorrelation)}, ${bestFull.latency.avg}ms avg`);
  }
  lines.push("");
  lines.push("---");
  lines.push(`*Generated by research-speed-vs-accuracy.ts*`);
  lines.push("");

  return lines.join("\n");
}

main();
