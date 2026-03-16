/**
 * Shared spectrogram rendering utilities.
 *
 * Used by:
 * - Spectrogram.tsx (live mode — browser main thread)
 * - spectrogram.worker.ts (static mode — Web Worker with fft.js)
 * - generate-spectrograms.mjs (build-time PNG generation)
 */

export const FFT_SIZE = 2048;
export const HALF_BINS = FFT_SIZE / 2;
export const MIN_FREQ_HZ = 60;
export const DB_FLOOR = -80;
export const SMOOTHING = 0.3;

/** "Hot" colourmap: black → purple → red → orange → yellow → white */
export function heatColor(value: number): [number, number, number] {
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

export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

export function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

/** Map pixel row (0=top=high freq, height-1=bottom=low freq) to FFT bin index */
export function rowToBin(
  row: number,
  canvasHeight: number,
  fftSize: number,
  sampleRate: number,
): number {
  const maxFreq = sampleRate / 2;
  const melMax = hzToMel(maxFreq);
  const melMin = hzToMel(MIN_FREQ_HZ);
  const mel = melMax - (row / canvasHeight) * (melMax - melMin);
  const hz = melToHz(mel);
  return Math.round((hz / maxFreq) * (fftSize / 2));
}
