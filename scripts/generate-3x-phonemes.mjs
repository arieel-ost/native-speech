/**
 * Generates 3x-repeated phoneme audio files for isolated drill steps.
 * Each output is: [phoneme] [400ms silence] [phoneme] [400ms silence] [phoneme]
 *
 * Uses ffmpeg to decode MP3 → raw PCM, concatenates in JS with silence gaps,
 * then re-encodes to MP3 via ffmpeg.
 *
 * Output: public/audio/phonemes/<name>_3x.mp3
 */

import { readdir, writeFile, readFile } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";

const PHONEME_DIR = "public/audio/phonemes";
const SAMPLE_RATE = 44100;
const SILENCE_DURATION_MS = 400;
const SILENCE_SAMPLES = Math.round(SAMPLE_RATE * (SILENCE_DURATION_MS / 1000));
const REPETITIONS = 3;

function decodeMp3(filePath) {
  const buf = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ac 1 -ar ${SAMPLE_RATE} -v quiet -`,
    { maxBuffer: 50 * 1024 * 1024 },
  );
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function encodeMp3(samples, outputPath) {
  // Write raw PCM to ffmpeg stdin, encode to MP3
  const pcmBuf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  execSync(
    `ffmpeg -f f32le -ar ${SAMPLE_RATE} -ac 1 -i pipe:0 -b:a 128k -y "${outputPath}" -v quiet`,
    { input: pcmBuf, maxBuffer: 50 * 1024 * 1024 },
  );
}

function createRepeated(samples, reps, silenceSamples) {
  const silence = new Float32Array(silenceSamples); // zero-filled = silence
  const totalLength = samples.length * reps + silenceSamples * (reps - 1);
  const result = new Float32Array(totalLength);

  let offset = 0;
  for (let i = 0; i < reps; i++) {
    result.set(samples, offset);
    offset += samples.length;
    if (i < reps - 1) {
      result.set(silence, offset);
      offset += silenceSamples;
    }
  }

  return result;
}

async function main() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    console.error("ffmpeg not found.");
    process.exit(1);
  }

  const files = (await readdir(PHONEME_DIR)).filter(
    (f) => f.endsWith(".mp3") && !f.endsWith("_3x.mp3"),
  );

  console.log(`Generating ${REPETITIONS}x repeated audio for ${files.length} phonemes...\n`);

  let ok = 0, fail = 0;

  for (const file of files) {
    const name = file.replace(".mp3", "");
    const inputPath = join(PHONEME_DIR, file);
    const outputPath = join(PHONEME_DIR, `${name}_3x.mp3`);

    try {
      const samples = decodeMp3(inputPath);
      const repeated = createRepeated(samples, REPETITIONS, SILENCE_SAMPLES);
      encodeMp3(repeated, outputPath);
      console.log(`✓ ${name}_3x.mp3 (${samples.length} → ${repeated.length} samples)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${name} — ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} generated, ${fail} failed`);
}

main();
