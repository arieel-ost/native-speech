import { parseArgs } from "node:util";
import { resolve, basename, extname } from "node:path";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

// --- CLI ---

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "samples-dir": { type: "string", default: "scripts/recordings/socks" },
    "output-dir": { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Usage: bun run scripts/speechbrain-test.ts [options]

Runs SpeechBrain lang-id (107 languages) and accent-id (16 English accents)
on all audio samples, then compares against ground truth.

Options:
  --samples-dir    Path to samples directory (default: "scripts/recordings/socks")
  --output-dir     Output directory (default: "scripts/results/speechbrain-<timestamp>")
  --help, -h       Show this help

Requires: python with speechbrain, torchaudio installed
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

interface SBResult {
  file: string;
  langId: {
    predicted: string;
    confidence: number;
    top5: { language: string; confidence: number }[];
    error?: string;
  };
  accentId: {
    predicted: string;
    confidence: number;
    top5: { accent: string; confidence: number }[];
    error?: string;
  };
}

// --- Config ---

const samplesDir = values["samples-dir"]!;
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const outputDir = values["output-dir"] ?? `scripts/results/speechbrain-${timestamp}`;

// --- Accent matching ---

// Map SpeechBrain lang-id labels to our ground truth
const LANG_TO_ACCENT: Record<string, string[]> = {
  de: ["german"],
  fr: ["french"],
  ru: ["russian"],
  hi: ["indian"],
  en: ["american", "american-texan", "australian", "british"],
  gl: ["galician"],
  es: ["galician"], // Galician is close to Spanish/Portuguese
  pt: ["galician"],
};

// Map SpeechBrain accent-id labels to our ground truth
const ACCENT_LABEL_MAP: Record<string, string[]> = {
  us: ["american", "american-texan"],
  england: ["british"],
  australia: ["australian"],
  indian: ["indian"],
  scotland: ["british"],
  ireland: ["british"],
  canada: ["american"],
  african: ["african"],
};

function matchLangId(predicted: string, groundTruth: string): "correct" | "partial" | "wrong" {
  const lang = predicted.split(":")[0].trim().toLowerCase();
  const gt = groundTruth.toLowerCase();

  const matches = LANG_TO_ACCENT[lang] ?? [];
  if (matches.includes(gt)) return "correct";

  // Special: "en" is correct for native English speakers
  if (lang === "en" && ["american", "american-texan", "australian"].includes(gt)) return "correct";

  // Partial: same language family
  if (gt === "german" && ["nl", "da", "sv", "no"].includes(lang)) return "partial";
  if (gt === "russian" && ["uk", "pl", "cs", "bg"].includes(lang)) return "partial";
  if (gt === "galician" && ["es", "pt", "it", "ca"].includes(lang)) return "partial";
  if (gt === "french" && ["it", "es", "pt", "ro"].includes(lang)) return "partial";
  if (gt === "indian" && ["ta", "bn", "ur", "te"].includes(lang)) return "correct";

  return "wrong";
}

function matchAccentId(predicted: string, groundTruth: string): "correct" | "partial" | "wrong" {
  const accent = predicted.toLowerCase();
  const gt = groundTruth.toLowerCase();

  const matches = ACCENT_LABEL_MAP[accent] ?? [];
  if (matches.includes(gt)) return "correct";

  // Non-English L1 speakers — accent-id isn't designed for them
  if (!["american", "american-texan", "australian", "british", "indian"].includes(gt)) return "partial";

  return "wrong";
}

// --- Main ---

async function main() {
  // Verify python + speechbrain
  try {
    execSync("python -c \"import torchaudio; torchaudio.list_audio_backends = lambda: ['ffmpeg']; import speechbrain\"", {
      stdio: "pipe",
      env: { ...process.env, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "1" },
    });
  } catch {
    console.error("Error: python with speechbrain not found. Run: pip install speechbrain torchaudio transformers");
    process.exit(1);
  }

  // Load samples
  const samplesPath = resolve(samplesDir, "samples.json");
  const samples: Sample[] = JSON.parse(await Bun.file(samplesPath).text());
  console.log(`Loaded ${samples.length} samples`);
  console.log(`Output: ${outputDir}\n`);

  await mkdir(outputDir, { recursive: true });

  // Run SpeechBrain Python script — two separate processes to avoid OOM
  const pyScript = resolve("scripts/lib/speechbrain-classify.py").replace(/\\/g, "/");
  const langOutput = resolve(outputDir, "lang-results.json").replace(/\\/g, "/");
  const accentOutput = resolve(outputDir, "accent-results.json").replace(/\\/g, "/");
  const rawOutput = resolve(outputDir, "raw-results.json").replace(/\\/g, "/");
  const audioDir = resolve(samplesDir).replace(/\\/g, "/");
  const execEnv = { ...process.env, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "1", MKL_NUM_THREADS: "1" };

  console.log("Running SpeechBrain classification (first run downloads ~1GB of models)...\n");

  // Pass 1: Language ID (lighter model)
  console.log("--- Pass 1: Language ID ---");
  try {
    execSync(
      `python "${pyScript}" "${audioDir}" --model lang -o "${langOutput}" --cache-dir "scripts/.speechbrain-cache"`,
      { stdio: "inherit", timeout: 600000, env: execEnv },
    );
  } catch (err: any) {
    console.error("Lang-ID pass failed:", err.message);
  }

  // Pass 2: Accent ID (heavier XLSR model — separate process for memory)
  console.log("\n--- Pass 2: Accent ID ---");
  try {
    execSync(
      `python "${pyScript}" "${audioDir}" --model accent -o "${accentOutput}" --cache-dir "scripts/.speechbrain-cache"`,
      { stdio: "inherit", timeout: 600000, env: execEnv },
    );
  } catch (err: any) {
    console.error("Accent-ID pass failed:", err.message);
  }

  // Merge results from both passes
  const langResults: SBResult[] = await Bun.file(langOutput).exists()
    ? JSON.parse(await Bun.file(langOutput).text())
    : [];
  const accentResults: SBResult[] = await Bun.file(accentOutput).exists()
    ? JSON.parse(await Bun.file(accentOutput).text())
    : [];

  const sbResults: SBResult[] = samples.map((s) => {
    const lr = langResults.find((r) => r.file === s.file);
    const ar = accentResults.find((r) => r.file === s.file);
    return {
      file: s.file,
      langId: lr?.langId ?? { predicted: "", confidence: 0, top5: [], error: "not run" },
      accentId: ar?.accentId ?? { predicted: "", confidence: 0, top5: [], error: "not run" },
    };
  });

  // Save merged results
  await Bun.write(rawOutput, JSON.stringify(sbResults, null, 2));

  // Match with ground truth
  console.log("\n--- Results ---\n");

  let langCorrect = 0, langPartial = 0, langWrong = 0;
  let accentCorrect = 0, accentPartial = 0, accentWrong = 0;

  for (const sbr of sbResults) {
    const sample = samples.find((s) => s.file === sbr.file);
    if (!sample) continue;

    const langMatch = sbr.langId.error ? "wrong" : matchLangId(sbr.langId.predicted, sample.accent);
    const accentMatch = sbr.accentId.error ? "wrong" : matchAccentId(sbr.accentId.predicted, sample.accent);

    if (langMatch === "correct") langCorrect++;
    else if (langMatch === "partial") langPartial++;
    else langWrong++;

    if (accentMatch === "correct") accentCorrect++;
    else if (accentMatch === "partial") accentPartial++;
    else accentWrong++;

    const langIcon = langMatch === "correct" ? "✓" : langMatch === "partial" ? "~" : "✗";
    const accentIcon = accentMatch === "correct" ? "✓" : accentMatch === "partial" ? "~" : "✗";

    const langTop = sbr.langId.top5?.slice(0, 3).map((l) => `${l.language}(${l.confidence}%)`).join(", ") ?? "error";
    const accentTop = sbr.accentId.top5?.slice(0, 3).map((a) => `${a.accent}(${a.confidence}%)`).join(", ") ?? "error";

    console.log(`${sbr.file} (${sample.accent})`);
    console.log(`  Lang-ID:   ${langIcon} ${sbr.langId.predicted ?? "?"} [${langTop}]`);
    console.log(`  Accent-ID: ${accentIcon} ${sbr.accentId.predicted ?? "?"} [${accentTop}]`);
  }

  const n = samples.length;
  console.log(`\n--- Summary ---`);
  console.log(`Lang-ID:   ${langCorrect}/${n} correct, ${langPartial}/${n} partial, ${langWrong}/${n} wrong`);
  console.log(`Accent-ID: ${accentCorrect}/${n} correct, ${accentPartial}/${n} partial, ${accentWrong}/${n} wrong`);

  // Generate report
  const reportMd = generateReport(samples, sbResults);
  await Bun.write(resolve(outputDir, "report.md"), reportMd);
  console.log(`\nReport: ${outputDir}/report.md`);
}

function generateReport(samples: Sample[], results: SBResult[]): string {
  const lines: string[] = [];
  lines.push(`# SpeechBrain Classification — ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("**Models:** lang-id-voxlingua107-ecapa (107 languages), accent-id-commonaccent-xlsr (16 English accents)  ");
  lines.push(`**Samples:** ${samples.length}  `);
  lines.push("");

  // Lang-ID table
  lines.push("## Language Identification (L1 Detection)");
  lines.push("");
  lines.push("| Sample | Ground Truth | Predicted L1 | Confidence | Match | Top 3 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const sbr of results) {
    const sample = samples.find((s) => s.file === sbr.file);
    if (!sample) continue;
    const sampleName = basename(sbr.file, extname(sbr.file));
    const match = sbr.langId.error ? "error" : matchLangId(sbr.langId.predicted, sample.accent);
    const icon = match === "correct" ? "✓" : match === "partial" ? "~" : "✗";
    const top3 = sbr.langId.top5?.slice(0, 3).map((l) => `${l.language}(${l.confidence}%)`).join(", ") ?? "—";
    lines.push(`| ${sampleName} | ${sample.accent} | ${sbr.langId.predicted ?? "error"} | ${sbr.langId.confidence ?? "—"}% | ${icon} ${match} | ${top3} |`);
  }

  // Accent-ID table
  lines.push("");
  lines.push("## English Accent Classification");
  lines.push("");
  lines.push("| Sample | Ground Truth | Predicted Accent | Confidence | Match | Top 3 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const sbr of results) {
    const sample = samples.find((s) => s.file === sbr.file);
    if (!sample) continue;
    const sampleName = basename(sbr.file, extname(sbr.file));
    const match = sbr.accentId.error ? "error" : matchAccentId(sbr.accentId.predicted, sample.accent);
    const icon = match === "correct" ? "✓" : match === "partial" ? "~" : "✗";
    const top3 = sbr.accentId.top5?.slice(0, 3).map((a) => `${a.accent}(${a.confidence}%)`).join(", ") ?? "—";
    lines.push(`| ${sampleName} | ${sample.accent} | ${sbr.accentId.predicted ?? "error"} | ${sbr.accentId.confidence ?? "—"}% | ${icon} ${match} | ${top3} |`);
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by speechbrain-test.ts*");
  lines.push("");
  return lines.join("\n");
}

main();
