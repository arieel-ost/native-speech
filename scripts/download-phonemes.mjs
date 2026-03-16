import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const PHONEMES = [
  // Consonants
  { ipa: "p", name: "p", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/p-1it7yor.mp3" },
  { ipa: "b", name: "b", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/b-1r9c1qm.mp3" },
  { ipa: "t", name: "t", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/t-1ygqg9g.mp3" },
  { ipa: "d", name: "d", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/d-9gcnn8.mp3" },
  { ipa: "k", name: "k", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/k-19h13fx.mp3" },
  { ipa: "g", name: "g", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/g-yfu8hw.mp3" },
  { ipa: "m", name: "m", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/m-guw48u.mp3" },
  { ipa: "n", name: "n", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/n-1smc314.mp3" },
  { ipa: "ŋ", name: "ng", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/eng-k596t3.mp3" },
  { ipa: "tʃ", name: "ch", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/voiceless_affricate-1athyop.mp3" },
  { ipa: "dʒ", name: "jh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/voiced_affricate-1f87c12.mp3" },
  { ipa: "f", name: "f", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/f-1o300yb.mp3" },
  { ipa: "v", name: "v", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/v-1byjed.mp3" },
  { ipa: "θ", name: "th_voiceless", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/theta-ip7r5s.mp3" },
  { ipa: "ð", name: "th_voiced", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/eth-icm6j7.mp3" },
  { ipa: "s", name: "s", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/s-uozw9d.mp3" },
  { ipa: "z", name: "z", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/z-4qicum.mp3" },
  { ipa: "ʃ", name: "sh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/sh-fpj6ik.mp3" },
  { ipa: "ʒ", name: "zh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/zh-fy90bw.mp3" },
  { ipa: "h", name: "h", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/h-1mgl9zt.mp3" },
  { ipa: "w", name: "w", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/w-1dz44nh.mp3" },
  { ipa: "j", name: "y", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/j-x57k1g.mp3" },
  { ipa: "r", name: "r", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/r-1xq1912.mp3" },
  { ipa: "l", name: "l", url: "https://cdn.vocabulary.com/media/dictionary/ipa/consonants/l-1o1w14c.mp3" },
  // Vowels
  { ipa: "i", name: "ee", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/i-gvz91l.mp3" },
  { ipa: "ɪ", name: "ih", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/small_cap_i-p6cj9p.mp3" },
  { ipa: "eɪ", name: "ey", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/e-qxx7n8.mp3" },
  { ipa: "ɛ", name: "eh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/epsilon-yoyztd.mp3" },
  { ipa: "æ", name: "ae", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/ash-qgmo8e.mp3" },
  { ipa: "ʌ", name: "uh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/mid_central-gqxn5h.mp3" },
  { ipa: "ə", name: "schwa", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/mid_central-gqxn5h.mp3" },
  { ipa: "u", name: "oo", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/u-1mr7xyn.mp3" },
  { ipa: "ʊ", name: "uh_short", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/horseshoe-1inthj0.mp3" },
  { ipa: "oʊ", name: "oh", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/o-c3q2rv.mp3" },
  { ipa: "ɔ", name: "aw", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/open_o-1olavce.mp3" },
  { ipa: "ɑ", name: "ah", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/ah-1f3x3pk.mp3" },
  { ipa: "aɪ", name: "ai", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/ai-vmgin8.mp3" },
  { ipa: "aʊ", name: "ow", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/ow-mmmc8y.mp3" },
  { ipa: "ɔɪ", name: "oi", url: "https://cdn.vocabulary.com/media/dictionary/ipa/vowels/oi-15ych4z.mp3" },
  // Less common
  { ipa: "x", name: "x_velar", url: "https://cdn.vocabulary.com/media/dictionary/ipa/less-common-sounds/x-1rkf9v4.mp3" },
  { ipa: "ʔ", name: "glottal_stop", url: "https://cdn.vocabulary.com/media/dictionary/ipa/less-common-sounds/glottal_stop-f5amoj.mp3" },
];

const OUT_DIR = "public/audio/phonemes";

async function download(phoneme) {
  try {
    const res = await fetch(phoneme.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${OUT_DIR}/${phoneme.name}.mp3`;
    await writeFile(path, buf);
    console.log(`✓ ${phoneme.name}.mp3 (${phoneme.ipa}) — ${buf.length} bytes`);
    return true;
  } catch (e) {
    console.error(`✗ ${phoneme.name}.mp3 (${phoneme.ipa}) — ${e.message}`);
    return false;
  }
}

// Note: ə and ʌ share the same URL (same sound file)
console.log(`Downloading ${PHONEMES.length} phoneme sounds to ${OUT_DIR}/...\n`);

let ok = 0, fail = 0;
// Download in batches of 5
for (let i = 0; i < PHONEMES.length; i += 5) {
  const batch = PHONEMES.slice(i, i + 5);
  const results = await Promise.all(batch.map(download));
  results.forEach(r => r ? ok++ : fail++);
}

console.log(`\nDone: ${ok} downloaded, ${fail} failed`);

// Also save the mapping as JSON for use in the app
const mapping = Object.fromEntries(PHONEMES.map(p => [p.ipa, `/audio/phonemes/${p.name}.mp3`]));
await writeFile(`${OUT_DIR}/phoneme-map.json`, JSON.stringify(mapping, null, 2));
console.log("Saved phoneme-map.json");
