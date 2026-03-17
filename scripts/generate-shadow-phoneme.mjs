/**
 * Generates shadow-mode phoneme audio + spectrograms for all phonemes.
 *
 * Shadow audio = 1s leading silence + original audio + 0.5s trailing silence
 * This ensures spectrograms align across all modes (record, listen & repeat,
 * shadow overlay) with consistent timing.
 *
 * Output per phoneme base (e.g. "th_voiceless"):
 *   <name>_shadow.mp3           + <name>_shadow_spectrogram.png
 *   <name>_3x_shadow.mp3        + <name>_3x_shadow_spectrogram.png
 *
 * Usage:
 *   node scripts/generate-shadow-phoneme.mjs           # all phonemes
 *   node scripts/generate-shadow-phoneme.mjs th_voiceless  # single phoneme
 */

import { execSync } from "child_process";
import { join } from "path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import sharp from "sharp";
import FFT from "fft.js";

const PHONEME_DIR = "public/audio/phonemes";
const SAMPLE_RATE = 44100;

// Must match AUTO_STOP_BUFFER in ShadowingPlayer.tsx
const LEAD_SILENCE_SECONDS = 1;
const TRAIL_SILENCE_SECONDS = 0.5;
const LEAD_SAMPLES = SAMPLE_RATE * LEAD_SILENCE_SECONDS;
const TRAIL_SAMPLES = SAMPLE_RATE * TRAIL_SILENCE_SECONDS;

// Spectrogram params (must match Spectrogram.tsx / generate-spectrograms.mjs)
const FFT_SIZE = 2048;
const HALF_BINS = FFT_SIZE / 2;
const IMG_WIDTH = 400;
const IMG_HEIGHT = 200;
const MIN_FREQ_HZ = 60;
const DB_FLOOR = -80;

function heatColor(value) {
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.2) { const t = v / 0.2; return [Math.round(t * 80), 0, Math.round(t * 120)]; }
  if (v < 0.4) { const t = (v - 0.2) / 0.2; return [80 + Math.round(t * 175), 0, 120 - Math.round(t * 120)]; }
  if (v < 0.6) { const t = (v - 0.4) / 0.2; return [255, Math.round(t * 140), 0]; }
  if (v < 0.8) { const t = (v - 0.6) / 0.2; return [255, 140 + Math.round(t * 115), 0]; }
  const t = (v - 0.8) / 0.2;
  return [255, 255, Math.round(t * 255)];
}

function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
function melToHz(mel) { return 700 * (10 ** (mel / 2595) - 1); }

function rowToBin(row, h, fftSize, sampleRate) {
  const maxFreq = sampleRate / 2;
  const melMax = hzToMel(maxFreq);
  const melMin = hzToMel(MIN_FREQ_HZ);
  const mel = melMax - (row / h) * (melMax - melMin);
  return Math.round((melToHz(mel) / maxFreq) * (fftSize / 2));
}

function decodeMp3(filePath) {
  const buf = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ac 1 -ar ${SAMPLE_RATE} -v quiet -`,
    { maxBuffer: 50 * 1024 * 1024 },
  );
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function encodeMp3(samples, outputPath) {
  const tmpPath = outputPath.replace(/\.mp3$/, "_tmp.raw");
  const pcmBuf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  writeFileSync(tmpPath, pcmBuf);
  execSync(
    `ffmpeg -f f32le -ar ${SAMPLE_RATE} -ac 1 -i "${tmpPath}" -b:a 128k -y "${outputPath}" -v quiet`,
    { maxBuffer: 50 * 1024 * 1024 },
  );
  unlinkSync(tmpPath);
}

function computeSpectrogram(samples) {
  const w = IMG_WIDTH, h = IMG_HEIGHT;
  const hopSize = Math.max(1, Math.floor(samples.length / w));
  const fft = new FFT(FFT_SIZE);
  const pixels = Buffer.alloc(w * h * 3);

  for (let col = 0; col < w; col++) {
    const start = col * hopSize;
    const input = fft.createComplexArray();
    for (let i = 0; i < FFT_SIZE; i++) {
      const sample = start + i < samples.length ? samples[start + i] : 0;
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
      input[i * 2] = sample * hann;
      input[i * 2 + 1] = 0;
    }
    const output = fft.createComplexArray();
    fft.transform(output, input);
    const magnitudes = new Float32Array(HALF_BINS);
    for (let k = 0; k < HALF_BINS; k++) {
      const re = output[k * 2], im = output[k * 2 + 1];
      magnitudes[k] = Math.sqrt(re * re + im * im);
    }
    for (let row = 0; row < h; row++) {
      const bin = rowToBin(row, h, FFT_SIZE, SAMPLE_RATE);
      const clampedBin = Math.min(bin, HALF_BINS - 1);
      const mag = magnitudes[clampedBin] || 0.00001;
      const dB = 20 * Math.log10(mag / FFT_SIZE);
      const norm = Math.max(0, Math.min(1, (dB - DB_FLOOR) / -DB_FLOOR));
      const [r, g, b] = heatColor(norm);
      const idx = (row * w + col) * 3;
      pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b;
    }
  }
  return pixels;
}

/** Create shadow audio: 1s lead + original + 0.5s trail */
function createShadowSamples(originalSamples) {
  const totalLength = LEAD_SAMPLES + originalSamples.length + TRAIL_SAMPLES;
  const shadow = new Float32Array(totalLength);
  shadow.set(originalSamples, LEAD_SAMPLES); // zeros on both ends = silence
  return shadow;
}

async function processSingle(inputMp3, audioOut, specOut) {
  if (!existsSync(inputMp3)) {
    console.log(`  skip ${inputMp3} (not found)`);
    return false;
  }

  const samples = decodeMp3(inputMp3);
  const shadowSamples = createShadowSamples(samples);

  encodeMp3(shadowSamples, audioOut);

  const pixels = computeSpectrogram(shadowSamples);
  await sharp(pixels, { raw: { width: IMG_WIDTH, height: IMG_HEIGHT, channels: 3 } })
    .png()
    .toFile(specOut);

  const dur = (shadowSamples.length / SAMPLE_RATE).toFixed(2);
  console.log(`  ✓ ${audioOut} (${dur}s)`);
  return true;
}

async function main() {
  // Check ffmpeg
  try { execSync("ffmpeg -version", { stdio: "ignore" }); }
  catch { console.error("ffmpeg not found."); process.exit(1); }

  const singleBase = process.argv[2];

  // Collect base names to process
  let baseNames;
  if (singleBase) {
    baseNames = [singleBase];
  } else {
    // Extract all unique base names from phoneme-map.json
    const map = JSON.parse(readFileSync(join(PHONEME_DIR, "phoneme-map.json"), "utf-8"));
    const bases = new Set();
    for (const entry of Object.values(map)) {
      // entry.audio is like "/audio/phonemes/th_voiceless.mp3"
      const base = entry.audio.replace(/^\/audio\/phonemes\//, "").replace(/\.mp3$/, "");
      bases.add(base);
    }
    baseNames = [...bases].sort();
  }

  console.log(`Generating shadow audio+spectrograms for ${baseNames.length} phonemes`);
  console.log(`  Lead silence: ${LEAD_SILENCE_SECONDS}s | Trail silence: ${TRAIL_SILENCE_SECONDS}s\n`);

  let ok = 0, fail = 0;

  for (const base of baseNames) {
    console.log(`[${base}]`);

    // Single variant: base_shadow.mp3
    try {
      const did = await processSingle(
        join(PHONEME_DIR, `${base}.mp3`),
        join(PHONEME_DIR, `${base}_shadow.mp3`),
        join(PHONEME_DIR, `${base}_shadow_spectrogram.png`),
      );
      if (did) ok++;
    } catch (e) { console.error(`  ✗ single: ${e.message}`); fail++; }

    // 3x variant: base_3x_shadow.mp3
    try {
      const did = await processSingle(
        join(PHONEME_DIR, `${base}_3x.mp3`),
        join(PHONEME_DIR, `${base}_3x_shadow.mp3`),
        join(PHONEME_DIR, `${base}_3x_shadow_spectrogram.png`),
      );
      if (did) ok++;
    } catch (e) { console.error(`  ✗ 3x: ${e.message}`); fail++; }
  }

  // Update phoneme-map.json with shadow paths for all entries
  const mapPath = join(PHONEME_DIR, "phoneme-map.json");
  const map = JSON.parse(readFileSync(mapPath, "utf-8"));
  for (const [ipa, entry] of Object.entries(map)) {
    const base = entry.audio.replace(/^\/audio\/phonemes\//, "").replace(/\.mp3$/, "");
    entry.audioShadow = `/audio/phonemes/${base}_shadow.mp3`;
    entry.spectrogramShadow = `/audio/phonemes/${base}_shadow_spectrogram.png`;
    entry.audio3xShadow = `/audio/phonemes/${base}_3x_shadow.mp3`;
    entry.spectrogram3xShadow = `/audio/phonemes/${base}_3x_shadow_spectrogram.png`;
  }
  writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
  console.log(`\nUpdated phoneme-map.json with shadow paths`);

  console.log(`Done: ${ok} generated, ${fail} failed`);
}

main();
