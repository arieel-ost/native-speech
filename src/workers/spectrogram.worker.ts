/**
 * Web Worker for computing spectrogram RGBA pixel data from raw PCM samples.
 * Uses fft.js (O(n log n)) instead of the naive O(n²) DFT.
 */

import FFT from "fft.js";
import {
  FFT_SIZE,
  HALF_BINS,
  DB_FLOOR,
  heatColor,
  rowToBin,
} from "../lib/spectrogram-utils";

export interface SpectrogramWorkerInput {
  samples: Float32Array;
  sampleRate: number;
  width: number;
  height: number;
}

export interface SpectrogramWorkerOutput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

self.onmessage = (e: MessageEvent<SpectrogramWorkerInput>) => {
  const { samples, sampleRate, width, height } = e.data;

  const hopSize = Math.max(1, Math.floor(samples.length / width));
  const fft = new FFT(FFT_SIZE);

  // RGBA pixel buffer (4 bytes per pixel)
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let col = 0; col < width; col++) {
    const start = col * hopSize;

    // Build complex input array with Hann window
    const input = fft.createComplexArray();
    for (let i = 0; i < FFT_SIZE; i++) {
      const sample = start + i < samples.length ? samples[start + i] : 0;
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
      input[i * 2] = sample * hann;
      input[i * 2 + 1] = 0;
    }

    // Run FFT
    const output = fft.createComplexArray();
    fft.transform(output, input);

    // Compute magnitudes for the first half of bins
    const magnitudes = new Float32Array(HALF_BINS);
    for (let k = 0; k < HALF_BINS; k++) {
      const re = output[k * 2];
      const im = output[k * 2 + 1];
      magnitudes[k] = Math.sqrt(re * re + im * im);
    }

    // Map to canvas rows using Mel scale
    for (let row = 0; row < height; row++) {
      const bin = rowToBin(row, height, FFT_SIZE, sampleRate);
      const clampedBin = Math.min(bin, HALF_BINS - 1);
      const mag = magnitudes[clampedBin] || 0.00001;
      const dB = 20 * Math.log10(mag / FFT_SIZE);
      const norm = Math.max(0, Math.min(1, (dB - DB_FLOOR) / -DB_FLOOR));
      const [r, g, b] = heatColor(norm);
      const idx = (row * width + col) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }

  const result: SpectrogramWorkerOutput = { pixels, width, height };
  (self as unknown as Worker).postMessage(result, [pixels.buffer]);
};
