/**
 * Adds pre-calculated durations to phoneme-map.json.
 * Reads each shadow MP3, decodes to PCM via ffmpeg, and stores duration in seconds.
 *
 * Adds to each entry:
 *   durationShadow:    duration of single shadow audio (seconds)
 *   duration3xShadow:  duration of 3x shadow audio (seconds)
 *
 * Usage: node scripts/add-durations-to-map.mjs
 */

import { execSync } from "child_process";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

const PHONEME_DIR = "public/audio/phonemes";
const SAMPLE_RATE = 44100;

function getDuration(filePath) {
  if (!existsSync(filePath)) return null;
  const buf = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ac 1 -ar ${SAMPLE_RATE} -v quiet -`,
    { maxBuffer: 50 * 1024 * 1024 },
  );
  const samples = buf.length / 4;
  return Math.round((samples / SAMPLE_RATE) * 1000) / 1000; // 3 decimal places
}

const mapPath = join(PHONEME_DIR, "phoneme-map.json");
const map = JSON.parse(readFileSync(mapPath, "utf-8"));

let count = 0;
for (const [ipa, entry] of Object.entries(map)) {
  const base = entry.audio.replace(/^\/audio\/phonemes\//, "").replace(/\.mp3$/, "");

  const shadowPath = join(PHONEME_DIR, `${base}_shadow.mp3`);
  const shadow3xPath = join(PHONEME_DIR, `${base}_3x_shadow.mp3`);

  const dur = getDuration(shadowPath);
  const dur3x = getDuration(shadow3xPath);

  if (dur != null) entry.durationShadow = dur;
  if (dur3x != null) entry.duration3xShadow = dur3x;

  console.log(`${ipa}: shadow=${dur}s, 3x=${dur3x}s`);
  count++;
}

writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
console.log(`\nUpdated ${count} entries in phoneme-map.json with durations`);
