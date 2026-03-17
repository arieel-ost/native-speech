# Phoneme Drills

> In-depth architecture for the phoneme-focused drill system. Updated: 2026-03-17.

## Overview

Phoneme drills are a focused practice mode that targets individual sounds through a structured progression: isolated sound → minimal pair → word → short phrase. Unlike sentence-level drills (DrillSession), phoneme drills use pre-recorded reference audio, real-time spectrogram visualization, and four distinct recording modes.

---

## Data Model

**Source:** `src/lib/mock-data.ts` — `PhonemeDrill` type and `mockPhonemeDrills` array

Each phoneme drill has:
- `id` — unique identifier (e.g., `"en-th-voiceless"`)
- `language` — `"english"` or `"german"`
- `phoneme` — target IPA symbol (e.g., `"θ"`)
- `name` — display name (e.g., `"Voiceless TH"`)
- `steps` — ordered array of `PhonemeDrillStep`:

| Field | Type | Example |
|-------|------|---------|
| `id` | string | `"th-voiceless-isolated"` |
| `type` | `"isolated" \| "minimal_pair" \| "word" \| "short_phrase"` | `"isolated"` |
| `prompt` | string | `"θ"` or `"thin"` |
| `ipa` | string | `"/θ/"` |
| `instruction` | string | Guidance for the learner |

---

## Asset Pipeline

Pre-recorded audio and spectrograms live in `public/audio/phonemes/`. The asset map is in `phoneme-map.json`.

### Per-Phoneme Assets (41 phonemes)

Each phoneme entry in `phoneme-map.json` has:

| Field | Description | Example |
|-------|-------------|---------|
| `audio` | Raw single pronunciation | `/audio/phonemes/th_voiceless.mp3` |
| `spectrogram` | Spectrogram of raw audio | `/audio/phonemes/th_voiceless_spectrogram.png` |
| `audio3x` | 3× repeated pronunciation | `/audio/phonemes/th_voiceless_3x.mp3` |
| `spectrogram3x` | Spectrogram of 3× audio | `/audio/phonemes/th_voiceless_3x_spectrogram.png` |
| `audioShadow` | Shadow variant: 1s silence + audio + 0.5s silence | `/audio/phonemes/th_voiceless_shadow.mp3` |
| `spectrogramShadow` | Spectrogram of shadow variant | `/audio/phonemes/th_voiceless_shadow_spectrogram.png` |
| `audio3xShadow` | Shadow variant of 3× audio | `/audio/phonemes/th_voiceless_3x_shadow.mp3` |
| `spectrogram3xShadow` | Spectrogram of 3× shadow | `/audio/phonemes/th_voiceless_3x_shadow_spectrogram.png` |
| `durationShadow` | Pre-calculated duration in seconds | `1.827` |
| `duration3xShadow` | Pre-calculated 3× duration in seconds | `4.213` |

### Shadow Audio Format

All modes use the shadow variant for consistent spectrogram alignment:

```
┌─────────┬──────────────────┬──────────┐
│ 1s lead │  phoneme audio   │ 0.5s pad │
│ silence │                  │ silence  │
└─────────┴──────────────────┴──────────┘
```

The leading silence gives visual preparation time on the spectrogram. The trailing silence ensures the spectrogram captures the full decay. Pre-rendered spectrograms match these padded audio files exactly.

### Generation Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate-shadow-phoneme.mjs` | Generates shadow variants (1s lead + audio + 0.5s trail) for all phonemes via ffmpeg |
| `scripts/add-durations-to-map.mjs` | Decodes shadow MP3s, writes `durationShadow` / `duration3xShadow` to phoneme-map.json |

Both scripts require `ffmpeg` on PATH.

### Phoneme ID Resolution

Some drills use IPA symbols not present in `phoneme-map.json`. The `PHONEME_ALIASES` table in `PhonemeDrillSession.tsx` handles this:

| Drill IPA | Maps to | Reason |
|-----------|---------|--------|
| `ɹ` | `r` | English R variant |
| `iː` | `i` | Long vowel → short base |
| `ɪ/iː` | `ɪ` | Pair → use short I assets |
| `yː` | `u` | German ü → closest available |
| `øː` | `ə` | German ö → closest available |
| `ç/x` | `x` | CH pair → velar fricative |

**Known limitation:** Asset lookup uses the drill-level `phoneme` field, not the step-level `ipa`. This means all steps in a drill share the same reference audio. For minimal pairs like ship/sheep, only one phoneme's reference plays. See [GitHub issue #12](https://github.com/arieel-ost/native-speech/issues/12) for the step-level lookup feature request.

---

## Component Architecture

```
PhonemeDrillSession
├── ShadowingPlayer          ← 4 recording modes + speed control
│   └── (internal refs)      ← MediaRecorder, Audio element, timers
├── SpectrogramDiff           ← Reference vs user spectrogram comparison
│   ├── Spectrogram (ref)    ← Pre-rendered image or live canvas
│   └── Spectrogram (user)   ← Live FFT from AudioBuffer or MediaStream
├── AudioPlayer              ← Playback of user's recording
└── Feedback Card            ← Score, phoneme comparison, tip
```

---

## PhonemeDrillSession

**Source:** `src/components/practice/PhonemeDrillSession.tsx`

Props: `drill: PhonemeDrill`

Manages the drill flow: step navigation, asset lookup, recording orchestration, Gemini analysis, and feedback display.

### Asset Selection Logic

```typescript
getPhonemeAssets(ipa, stepType) → { audio, spectrogram, duration }
```

- `isolated` steps → use `audio3xShadow` / `spectrogram3xShadow` / `duration3xShadow` (3× repetition for longer practice)
- All other steps → use `audioShadow` / `spectrogramShadow` / `durationShadow` (single pronunciation)
- Falls back to non-shadow variants if shadow files are missing
- Duration is always synchronously available from JSON (no async decode needed)

### Analysis Flow

1. User records audio via ShadowingPlayer
2. `handleRecorded` receives blob + AudioBuffer
3. FormData sent to `POST /api/analyze-phoneme` with: `audio`, `prompt`, `phonemes`, `locale`, `mode: "phoneme"`
4. Response contains `PhonemeFeedback`: score (0–10), summary, tip, phonemeRating, produced/expected IPA
5. Session saved to localStorage via `addSession()` with `phonemeScores` array

### Step Navigation

Progress dots at the top show completed (green), active, and upcoming steps. Previous/Next buttons and dot clicks navigate between steps, resetting all recording and feedback state.

---

## ShadowingPlayer — Recording Modes

**Source:** `src/components/practice/ShadowingPlayer.tsx`

Four recording modes, all using the same auto-stop mechanism:

| Mode | Button | Behavior |
|------|--------|----------|
| **Listen** | ▶ | Play reference audio at selected speed. No recording. |
| **Record** | ● | Record user audio. Auto-stops after `refDuration + 0.5s`. |
| **Listen & Repeat** | 🔄 | Play reference → 500ms pause → record. Auto-stops. |
| **Shadow** | 🎙️ | 3-2-1 countdown → play reference + record simultaneously. Auto-stops. |

### Auto-Stop Timing

All recording modes use `startRecordingWithAutoStop()`:

```
Recording duration = maxRecordDuration + AUTO_STOP_BUFFER (0.5s)
```

Where `maxRecordDuration` comes from `phoneme-map.json`'s pre-calculated `durationShadow` or `duration3xShadow`. This ensures user recordings align with reference spectrograms for overlay comparison.

During any active phase, **all buttons are disabled** — there is no manual stop. The auto-stop timer handles everything.

### Echo Cancellation

Shadow mode records simultaneously with reference playback. Even with headphones, Chrome's echo cancellation uses the OS audio output stream as a reference signal and suppresses correlated input — which includes the user's voice during shadowing. Shadow mode passes `{ disableEchoCancellation: true }` to `getUserMedia` to prevent this.

### Speed Control

Three speeds: 0.6×, 0.8×, 1.0×. Applied to reference audio playback via `HTMLAudioElement.playbackRate`. Speed does not affect recording duration (auto-stop uses the actual audio duration).

---

## Spectrogram System

**Source:** `src/components/practice/Spectrogram.tsx`, `SpectrogramDiff.tsx`

### Reference Spectrogram

Pre-rendered PNG loaded from `phoneme-map.json`'s `spectrogramShadow` or `spectrogram3xShadow` path. Displayed as an `<img>` element with a playback progress cursor overlay during reference audio playback.

### User Spectrogram

Generated live in the browser using Web Audio API FFT:

1. **During recording:** Renders from live `MediaStream` via `AnalyserNode` — shows spectrogram building in real-time
2. **After recording:** Re-renders from decoded `AudioBuffer` for a clean final spectrogram

FFT parameters: 2048-point window, frequency range 0–8000 Hz, mel-scale frequency mapping, viridis-inspired color palette.

### Comparison Modes

`SpectrogramDiff` offers two views (toggled by user):

| Mode | Display |
|------|---------|
| **Side by Side** | Reference and user spectrograms stacked vertically |
| **Overlay** | User spectrogram overlaid on reference with opacity blending |

---

## Feedback Display

The feedback card shows:

| Element | Condition | Content |
|---------|-----------|---------|
| Score | Always | `X / 10` with color coding |
| Phoneme comparison | When `produced ≠ expected` | "You said: /produced/ → Target: /expected/" |
| Summary | Always | Natural-language feedback from Gemini |
| Tip | When provided | Actionable pronunciation advice |

---

## API Route — POST /api/analyze-phoneme

**Source:** `src/app/api/analyze-phoneme/route.ts`

Phoneme-specific analysis endpoint. Sends audio to Gemini 2.5 Flash with a prompt focused on single-phoneme evaluation. Returns structured JSON:

```typescript
{
  score: number;          // 0–10
  summary: string;        // Natural language feedback
  tip: string;            // Actionable advice
  phonemeRating: "good" | "acceptable" | "needs_work";
  produced?: string;      // What was heard (IPA)
  expected?: string;      // What was expected (IPA)
}
```

Rate-limited identically to `/api/analyze`: `X-Learner-ID` header + IP, 30 calls/day.
