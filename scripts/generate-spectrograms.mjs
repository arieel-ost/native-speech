/**
 * Pre-generates spectrogram PNG images for all phoneme reference audio files.
 *
 * Uses the EXACT same rendering parameters as Spectrogram.tsx:
 * - FFT size: 2048
 * - Mel-scale frequency mapping (60 Hz floor)
 * - dB scale with -80 dB floor
 * - "hot" colormap (black → purple → red → orange → yellow → white)
 *
 * Output: public/audio/phonemes/<name>_spectrogram.png alongside each .mp3
 */

import { readFile, readdir, writeFile } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";
import sharp from "sharp";
import FFT from "fft.js";

const PHONEME_DIR = "public/audio/phonemes";
const FFT_SIZE = 2048;
const HALF_BINS = FFT_SIZE / 2;
const IMG_WIDTH = 400;
const IMG_HEIGHT = 200;
const MIN_FREQ_HZ = 60;
const DB_FLOOR = -80;

// ---- Exact copy of Spectrogram.tsx color map ----
function heatColor(value) {
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.2) {
    const t = v / 0.2;
    return [Math.round(t * 80), 0, Math.round(t * 120)];
  }
  if (v < 0.4) {
    const t = (v - 0.2) / 0.2;
    return [80 + Math.round(t * 175), 0, 120 - Math.round(t * 120)];
  }
  if (v < 0.6) {
    const t = (v - 0.4) / 0.2;
    return [255, Math.round(t * 140), 0];
  }
  if (v < 0.8) {
    const t = (v - 0.6) / 0.2;
    return [255, 140 + Math.round(t * 115), 0];
  }
  const t = (v - 0.8) / 0.2;
  return [255, 255, Math.round(t * 255)];
}

// ---- Exact copy of Spectrogram.tsx Mel helpers ----
function hzToMel(hz) {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel) {
  return 700 * (10 ** (mel / 2595) - 1);
}

function rowToBin(row, canvasHeight, fftSize, sampleRate) {
  const maxFreq = sampleRate / 2;
  const melMax = hzToMel(maxFreq);
  const melMin = hzToMel(MIN_FREQ_HZ);
  const mel = melMax - (row / canvasHeight) * (melMax - melMin);
  const hz = melToHz(mel);
  return Math.round((hz / maxFreq) * (fftSize / 2));
}

// ---- Decode MP3 to raw PCM using ffmpeg ----
async function decodeMp3(filePath) {
  // ffmpeg outputs raw 32-bit float PCM to stdout
  const buf = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ac 1 -ar 44100 -v quiet -`,
    { maxBuffer: 50 * 1024 * 1024 }
  );
  const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  return { samples, sampleRate: 44100 };
}

// ---- FFT-based STFT (replaces the O(n²) manual DFT) ----
function computeSpectrogram(samples, sampleRate) {
  const w = IMG_WIDTH;
  const h = IMG_HEIGHT;
  const hopSize = Math.max(1, Math.floor(samples.length / w));
  const fft = new FFT(FFT_SIZE);

  // RGB buffer (3 bytes per pixel)
  const pixels = Buffer.alloc(w * h * 3);

  for (let col = 0; col < w; col++) {
    const start = col * hopSize;

    // Extract frame with Hann window
    const input = fft.createComplexArray();
    for (let i = 0; i < FFT_SIZE; i++) {
      const sample = start + i < samples.length ? samples[start + i] : 0;
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
      input[i * 2] = sample * hann;     // real
      input[i * 2 + 1] = 0;             // imaginary
    }

    // Run FFT
    const output = fft.createComplexArray();
    fft.transform(output, input);

    // Compute magnitudes
    const magnitudes = new Float32Array(HALF_BINS);
    for (let k = 0; k < HALF_BINS; k++) {
      const re = output[k * 2];
      const im = output[k * 2 + 1];
      magnitudes[k] = Math.sqrt(re * re + im * im);
    }

    // Map to rows using Mel scale (same as Spectrogram.tsx)
    for (let row = 0; row < h; row++) {
      const bin = rowToBin(row, h, FFT_SIZE, sampleRate);
      const clampedBin = Math.min(bin, HALF_BINS - 1);
      const mag = magnitudes[clampedBin] || 0.00001;
      const dB = 20 * Math.log10(mag / FFT_SIZE);
      const norm = Math.max(0, Math.min(1, (dB - DB_FLOOR) / -DB_FLOOR));
      const [r, g, b] = heatColor(norm);
      const idx = (row * w + col) * 3;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }

  return pixels;
}

// ---- Main ----
async function main() {
  // Check ffmpeg is available
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    console.error("ffmpeg not found. Install it: https://ffmpeg.org/download.html");
    process.exit(1);
  }

  const files = (await readdir(PHONEME_DIR)).filter(f => f.endsWith(".mp3"));
  console.log(`Generating spectrograms for ${files.length} phoneme files (${IMG_WIDTH}x${IMG_HEIGHT}px)...\n`);

  let ok = 0, fail = 0;

  for (const file of files) {
    const name = file.replace(".mp3", "");
    const mp3Path = join(PHONEME_DIR, file);
    const pngPath = join(PHONEME_DIR, `${name}_spectrogram.png`);

    try {
      const { samples, sampleRate } = await decodeMp3(mp3Path);
      const pixels = computeSpectrogram(samples, sampleRate);

      await sharp(pixels, {
        raw: { width: IMG_WIDTH, height: IMG_HEIGHT, channels: 3 },
      })
        .png()
        .toFile(pngPath);

      console.log(`✓ ${name}_spectrogram.png (${samples.length} samples)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${name} — ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} generated, ${fail} failed`);

  // Update phoneme-map.json to include spectrogram and 3x paths
  const mapPath = join(PHONEME_DIR, "phoneme-map.json");
  const map = JSON.parse(await readFile(mapPath, "utf-8"));
  const newMap = {};
  for (const [ipa, entry] of Object.entries(map)) {
    // entry may be a string (old format) or an object (new format)
    const audioPath = typeof entry === "string" ? entry : entry.audio;
    const base = audioPath.replace(".mp3", "");
    newMap[ipa] = {
      audio: audioPath,
      spectrogram: `${base}_spectrogram.png`,
      audio3x: `${base}_3x.mp3`,
      spectrogram3x: `${base}_3x_spectrogram.png`,
    };
  }
  await writeFile(mapPath, JSON.stringify(newMap, null, 2));
  console.log("Updated phoneme-map.json with spectrogram and 3x paths");
}

main();
