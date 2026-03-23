import { parseArgs } from "node:util";
import { resolve, basename, extname } from "node:path";
import { mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// --- CLI ---

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "samples-dir": { type: "string", default: "scripts/recordings/socks" },
    locales: { type: "string", default: "en-US,en-GB,en-AU,en-IN" },
    "output-dir": { type: "string" },
    delay: { type: "string", default: "500" },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Usage: bun run scripts/azure-test.ts [options]

Options:
  --samples-dir    Path to samples directory (default: "scripts/recordings/socks")
  --locales        Comma-separated locales (default: "en-US,en-GB,en-AU,en-IN")
  --output-dir     Output directory (default: "scripts/results/azure-<timestamp>")
  --delay          Delay between requests in ms (default: 500)
  --verbose, -v    Print per-request details
  --help, -h       Show this help

Environment:
  AZURE_SPEECH_KEY       Azure Speech Services key (required)
  AZURE_SPEECH_REGION    Azure region (required, e.g., "eastus")
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

interface LocaleResult {
  locale: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  pronunciationScore: number;
  recognizedText: string;
  words: WordResult[];
}

interface WordResult {
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: PhonemeResult[];
  syllables: SyllableResult[];
}

interface PhonemeResult {
  phoneme: string;
  accuracyScore: number;
  nbestPhonemes: { phoneme: string; score: number }[];
}

interface SyllableResult {
  syllable: string;
  accuracyScore: number;
}

interface SampleResult {
  sample: Sample;
  localeResults: LocaleResult[];
  bestLocale: string;
  bestScore: number;
  error?: string;
}

// --- Config ---

const samplesDir = values["samples-dir"]!;
const locales = values.locales!.split(",").map((l) => l.trim());
const delay = parseInt(values.delay!, 10);
const verbose = values.verbose!;

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const outputDir = values["output-dir"] ?? `scripts/results/azure-${timestamp}`;
const rawDir = resolve(outputDir, "raw");
const wavDir = resolve(outputDir, "wav");

// --- Accent inference from locale ---

const LOCALE_TO_ACCENT: Record<string, string[]> = {
  "en-US": ["american", "american-texan"],
  "en-GB": ["british"],
  "en-AU": ["australian"],
  "en-IN": ["indian"],
};

function inferAccent(localeResults: LocaleResult[]): { bestLocale: string; bestScore: number } {
  let bestLocale = "";
  let bestScore = -1;
  for (const r of localeResults) {
    if (r.pronunciationScore > bestScore) {
      bestScore = r.pronunciationScore;
      bestLocale = r.locale;
    }
  }
  return { bestLocale, bestScore };
}

function accentMatchFromLocale(bestLocale: string, groundTruth: string): "correct" | "partial" | "wrong" {
  const gt = groundTruth.toLowerCase();
  const accents = LOCALE_TO_ACCENT[bestLocale] ?? [];
  if (accents.includes(gt)) return "correct";
  // Non-English L1 speakers won't match any locale — that's expected
  // If best locale is en-US and ground truth is non-English, it's not "wrong" — it's "N/A"
  if (!["american", "american-texan", "australian", "indian", "british"].includes(gt)) return "partial";
  return "wrong";
}

// --- WAV conversion ---

function convertToWav(inputPath: string, outputPath: string): boolean {
  try {
    // Normalize to forward slashes for ffmpeg on Windows bash
    const input = inputPath.replace(/\\/g, "/");
    const output = outputPath.replace(/\\/g, "/");
    execSync(
      `ffmpeg -y -i "${input}" -ar 16000 -ac 1 -sample_fmt s16 "${output}"`,
      { stdio: ["pipe", "pipe", "pipe"] }
    );
    return true;
  } catch (err: any) {
    if (verbose) console.error(`    ffmpeg error: ${err.stderr?.toString().slice(-200)}`);
    return false;
  }
}

// --- Azure Speech recognition ---

function assessPronunciation(
  wavPath: string,
  locale: string,
  speechKey: string,
  speechRegion: string,
): Promise<LocaleResult> {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechRecognitionLanguage = locale;

    const audioData = readFileSync(wavPath);
    const audioConfig = sdk.AudioConfig.fromWavFileInput(audioData);

    // Unscripted assessment (no reference text) — matches our free speech samples
    const pronConfig = new sdk.PronunciationAssessmentConfig(
      "",
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      false,
    );
    pronConfig.phonemeAlphabet = "IPA";
    pronConfig.nbestPhonemeCount = 3;
    pronConfig.enableProsodyAssessment = true;
    // @ts-ignore — not in typings yet but supported by the service
    pronConfig.enableTwoPassUnscriptedAssessment = true;

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(recognizer);

    recognizer.recognizeOnceAsync(
      (result) => {
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          const pronResult = sdk.PronunciationAssessmentResult.fromResult(result);

          // Parse JSON for per-word and per-phoneme details
          const jsonStr = result.properties.getProperty(
            sdk.PropertyId.SpeechServiceResponse_JsonResult,
          );
          let words: WordResult[] = [];
          try {
            const json = JSON.parse(jsonStr);
            const nBest = json.NBest?.[0];
            if (nBest?.Words) {
              words = nBest.Words.map((w: any) => ({
                word: w.Word,
                accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
                errorType: w.PronunciationAssessment?.ErrorType ?? "None",
                phonemes: (w.Phonemes ?? []).map((p: any) => ({
                  phoneme: p.Phoneme,
                  accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? 0,
                  nbestPhonemes: (p.PronunciationAssessment?.NBestPhonemes ?? []).map((nb: any) => ({
                    phoneme: nb.Phoneme,
                    score: nb.Score,
                  })),
                })),
                syllables: (w.Syllables ?? []).map((s: any) => ({
                  syllable: s.Syllable,
                  accuracyScore: s.PronunciationAssessment?.AccuracyScore ?? 0,
                })),
              }));
            }
          } catch {
            // JSON parsing failed — continue with empty words
          }

          resolve({
            locale,
            accuracyScore: pronResult.accuracyScore,
            fluencyScore: pronResult.fluencyScore,
            completenessScore: pronResult.completenessScore,
            prosodyScore: pronResult.prosodyScore ?? null,
            pronunciationScore: pronResult.pronunciationScore,
            recognizedText: result.text ?? "",
            words,
          });
        } else if (result.reason === sdk.ResultReason.NoMatch) {
          reject(new Error(`No speech recognized (locale: ${locale})`));
        } else {
          reject(new Error(`Recognition failed: ${sdk.ResultReason[result.reason]}`));
        }

        recognizer.close();
        speechConfig.close();
        audioConfig.close();
      },
      (err) => {
        recognizer.close();
        speechConfig.close();
        audioConfig.close();
        reject(new Error(`Recognition error: ${err}`));
      },
    );
  });
}

// --- Main ---

async function main() {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    console.error("Error: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set in .env.local");
    process.exit(1);
  }

  // Load samples
  const samplesPath = resolve(samplesDir, "samples.json");
  const samples: Sample[] = JSON.parse(await Bun.file(samplesPath).text());
  console.log(`Loaded ${samples.length} samples from ${samplesPath}`);
  console.log(`Locales: ${locales.join(", ")}`);
  console.log(`Output: ${outputDir}\n`);

  // Create output dirs
  await mkdir(rawDir, { recursive: true });
  await mkdir(wavDir, { recursive: true });

  // Convert all MP3s to WAV first
  console.log("Converting audio to WAV (16kHz mono 16-bit)...");
  const wavPaths: Map<string, string> = new Map();

  for (const sample of samples) {
    const inputPath = resolve(samplesDir, sample.file);
    const sampleName = basename(sample.file, extname(sample.file));
    const wavPath = resolve(wavDir, `${sampleName}.wav`);

    if (!existsSync(inputPath)) {
      console.error(`  Skipping ${sample.file}: not found`);
      continue;
    }

    if (convertToWav(inputPath, wavPath)) {
      wavPaths.set(sample.file, wavPath);
      if (verbose) console.log(`  ${sample.file} → ${sampleName}.wav`);
    } else {
      console.error(`  Failed to convert ${sample.file}`);
    }
  }
  console.log(`Converted ${wavPaths.size}/${samples.length} files\n`);

  // Run assessment
  const allResults: SampleResult[] = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const sampleName = basename(sample.file, extname(sample.file));
    const wavPath = wavPaths.get(sample.file);

    if (!wavPath) {
      allResults.push({
        sample,
        localeResults: [],
        bestLocale: "",
        bestScore: 0,
        error: "WAV_CONVERSION_FAILED",
      });
      continue;
    }

    console.log(`[${i + 1}/${samples.length}] ${sample.file} (${sample.label})`);
    const localeResults: LocaleResult[] = [];

    for (const locale of locales) {
      if (verbose) process.stdout.write(`  ${locale}... `);

      try {
        const result = await assessPronunciation(wavPath, locale, speechKey, speechRegion);
        localeResults.push(result);

        // Save individual result
        const outFile = resolve(rawDir, `${sampleName}-${locale}.json`);
        await Bun.write(outFile, JSON.stringify({ sample, locale, result }, null, 2));

        if (verbose) {
          console.log(
            `accuracy: ${result.accuracyScore} | fluency: ${result.fluencyScore} | pron: ${result.pronunciationScore}` +
              (result.prosodyScore != null ? ` | prosody: ${result.prosodyScore}` : "") +
              ` | words: ${result.words.length}`,
          );
        }
      } catch (err: any) {
        if (verbose) console.log(`ERROR: ${err.message}`);
        else console.log(`  ${locale}: ERROR - ${err.message}`);
      }

      await Bun.sleep(delay);
    }

    const { bestLocale, bestScore } = inferAccent(localeResults);
    const accentMatch = accentMatchFromLocale(bestLocale, sample.accent);

    if (!verbose) {
      const scores = localeResults.map((r) => `${r.locale}:${r.pronunciationScore}`).join(" | ");
      console.log(`  ${scores} → best: ${bestLocale} (${accentMatch})`);
    }

    allResults.push({ sample, localeResults, bestLocale, bestScore });
  }

  // --- Generate reports ---
  console.log("\n\nGenerating reports...");

  const reportJson = generateJsonReport(samples, locales, allResults);
  const reportMd = generateMarkdownReport(samples, locales, allResults);

  await Bun.write(resolve(outputDir, "report.json"), JSON.stringify(reportJson, null, 2));
  await Bun.write(resolve(outputDir, "report.md"), reportMd);

  console.log(`\nResults saved to ${outputDir}/`);
  console.log(`  report.md  — human-readable comparison`);
  console.log(`  report.json — structured data`);
  console.log(`  raw/       — ${allResults.reduce((n, r) => n + r.localeResults.length, 0)} individual results`);
  console.log(`  wav/       — converted audio files`);
}

// --- Report generation ---

function generateJsonReport(samples: Sample[], locales: string[], results: SampleResult[]) {
  return {
    timestamp: new Date().toISOString(),
    locales,
    sampleCount: samples.length,
    results: results.map((r) => ({
      file: r.sample.file,
      groundTruthAccent: r.sample.accent,
      groundTruthGender: r.sample.gender,
      bestLocale: r.bestLocale,
      bestScore: r.bestScore,
      error: r.error,
      localeScores: Object.fromEntries(
        r.localeResults.map((lr) => [
          lr.locale,
          {
            accuracy: lr.accuracyScore,
            fluency: lr.fluencyScore,
            completeness: lr.completenessScore,
            prosody: lr.prosodyScore,
            pronunciation: lr.pronunciationScore,
          },
        ]),
      ),
    })),
  };
}

function generateMarkdownReport(samples: Sample[], locales: string[], results: SampleResult[]): string {
  const lines: string[] = [];
  lines.push(`# Azure Speech Pronunciation Assessment — ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(`**Locales tested:** ${locales.join(", ")}  `);
  lines.push(`**Samples:** ${samples.length}  `);
  lines.push(`**Mode:** Unscripted (free speech, no reference text)  `);
  lines.push("");

  // --- Score table ---
  lines.push("## Pronunciation Scores by Locale");
  lines.push("");

  const header = ["Sample", "Ground Truth", ...locales.map((l) => `${l} Score`), "Best Locale", "Match"];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);

  for (const r of results) {
    const sampleName = basename(r.sample.file, extname(r.sample.file));
    const row: string[] = [sampleName, `${r.sample.gender} / ${r.sample.accent}`];

    for (const locale of locales) {
      const lr = r.localeResults.find((lr) => lr.locale === locale);
      row.push(lr ? String(lr.pronunciationScore) : "—");
    }

    const match = r.bestLocale ? accentMatchFromLocale(r.bestLocale, r.sample.accent) : "—";
    const matchIcon = match === "correct" ? "✓" : match === "partial" ? "~" : "✗";
    row.push(r.bestLocale || "—", `${matchIcon} ${match}`);

    lines.push(`| ${row.join(" | ")} |`);
  }

  // --- Detailed scores table ---
  lines.push("");
  lines.push("## Detailed Scores (en-US)");
  lines.push("");
  lines.push("| Sample | Accuracy | Fluency | Completeness | Prosody | Pronunciation | Recognized Text |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  for (const r of results) {
    const sampleName = basename(r.sample.file, extname(r.sample.file));
    const us = r.localeResults.find((lr) => lr.locale === "en-US");
    if (!us) {
      lines.push(`| ${sampleName} | — | — | — | — | — | — |`);
      continue;
    }
    const text = us.recognizedText.length > 60 ? us.recognizedText.slice(0, 57) + "..." : us.recognizedText;
    lines.push(
      `| ${sampleName} | ${us.accuracyScore} | ${us.fluencyScore} | ${us.completenessScore} | ${us.prosodyScore ?? "—"} | ${us.pronunciationScore} | ${text} |`,
    );
  }

  // --- Phoneme issues summary ---
  lines.push("");
  lines.push("## Low-Scoring Phonemes (en-US, accuracy < 60)");
  lines.push("");
  lines.push("| Sample | Word | Phoneme (IPA) | Accuracy | Alternatives |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const r of results) {
    const sampleName = basename(r.sample.file, extname(r.sample.file));
    const us = r.localeResults.find((lr) => lr.locale === "en-US");
    if (!us) continue;
    for (const word of us.words) {
      for (const ph of word.phonemes) {
        if (ph.accuracyScore < 60) {
          const alts = ph.nbestPhonemes.length > 0
            ? ph.nbestPhonemes.map((a) => `${a.phoneme}(${a.score})`).join(", ")
            : "—";
          lines.push(`| ${sampleName} | ${word.word} | ${ph.phoneme} | ${ph.accuracyScore} | ${alts} |`);
        }
      }
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by azure-test.ts*");
  lines.push("");

  return lines.join("\n");
}

main();
