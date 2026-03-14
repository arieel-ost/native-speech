# Word-Level Pronunciation Highlighting — Design

## Goal

Add word-by-word visual feedback during and after pronunciation practice:
- **During speech:** neutral highlight tracks current word position ("I'm listening")
- **After speech:** color-coded overlay shows pronunciation quality per word (green/yellow/red)
- Support both **known-text drills** (user reads given passage) and **free speech** (user speaks freely)

## Research Summary

Evaluated 12+ services across 4 categories. Full landscape:

### Purpose-built pronunciation assessment
- **Azure Pronunciation Assessment** — browser SDK, real-time streaming, per-word + per-phoneme + prosody scores, scripted + unscripted modes, $0.022/min, 5hr free/month
- SpeechAce, SpeechSuper, ELSA API — REST-only, no real-time, limited browser support

### Cloud STT with word confidence
- Deepgram, AssemblyAI, Google Cloud STT, AWS Transcribe, Speechmatics, Soniox — all provide per-word confidence + timestamps, but confidence measures transcription certainty, NOT pronunciation quality

### Client-side / free
- **Web Speech API** — real-time interim transcripts, free, Chrome/Edge only, no per-word data
- **Vosk browser** — WASM, offline, real-time word confidence, but unmaintained (3yr)
- Whisper browser (Transformers.js) — word timestamps but no confidence, not real-time

### Extend existing pipeline
- **Gemini prompt extension** — add word-level scores to existing JSON response, post-recording only

## Design Board Review

7 reviewers (Architect, Developer, Devil's Advocate, UX, DevOps, Financial, Hacker). Key findings:

### Kill list
- **Vosk (E):** unmaintained, 50MB model, bandwidth cost at scale
- **Deepgram + Gemini (B):** double-billing, WebSocket-on-Vercel unsolved, confidence != pronunciation quality

### Key UX insight
Real-time quality colors during speech create split-attention and learner anxiety. Better approach:
1. During speech: neutral highlight (blue pulse) tracks position
2. After speech: animate color-coded results as a reveal

This means real-time position tracking (not quality scoring) is sufficient during recording.

### Critical findings
- STT confidence != pronunciation quality (only Azure actually scores pronunciation)
- Known-text and free-speech are fundamentally different problems — ship known-text first
- Two-phase rendering (live tracking -> final analysis) needs explicit transition design

## Chosen Approach — 3-Step Incremental Plan

### Step 0: Gemini Prompt Extension (no worktree, ~1 hour)
Extend existing `/api/analyze` Gemini prompt to return word-level pronunciation scores in structured JSON. Validates whether Gemini can produce useful per-word data at all.

**Changes:**
- Add `wordScores` array to JSON schema in `/api/analyze/route.ts`
- Each entry: `{ word, index, score (1-10), rating ("good"|"acceptable"|"needs_work"), issues?: string[] }`
- Display word-level results in existing feedback components

### Step 1: Web Speech API + Gemini (worktree, ~1 day)
Branch: `research/transcribe-webspeech`

Real-time word position tracking using browser SpeechRecognition, plus post-recording Gemini analysis with word-level scores from Step 0.

**Architecture:**
- `SpeechRecognition` runs alongside `MediaRecorder` during recording
- Interim results matched against known drill text to advance word highlight
- Neutral color (blue pulse) during speech = position tracking only
- On recording end: send audio to Gemini as before
- Gemini response includes word-level scores -> animate color overlay

**Shared UI component:**
```typescript
interface WordHighlightState {
  word: string
  index: number
  status: 'pending' | 'active' | 'scored'
  score?: number        // 1-10 from Gemini
  rating?: 'good' | 'acceptable' | 'needs_work'
}
```

### Step 2: Azure Pronunciation Assessment (worktree, ~2 days)
Branch: `research/transcribe-azure`

Purpose-built pronunciation scoring with real-time per-word + per-phoneme accuracy.

**Architecture:**
- Thin `/api/speech-token` route issues short-lived Azure tokens
- Azure Speech SDK runs in browser, streams mic audio directly to Azure
- Returns real-time word-level accuracy, fluency, completeness, prosody
- Evaluate whether Azure can REPLACE Gemini entirely for pronunciation analysis
- If so: simpler architecture (one service), richer data (phoneme + syllable scores)

**Evaluation criteria vs Step 1:**
- Latency (time from spoken word to highlight)
- Scoring accuracy (does it match manual assessment on 10 test recordings?)
- Data richness (phoneme-level detail?)
- Cost comparison (Azure alone vs Gemini alone vs both)

## Data Flow

### Known-text drills (primary)
```
User sees drill text -> speaks ->
  [real-time] SpeechRecognition/Azure tracks position, highlights current word ->
  [post-recording] Gemini/Azure scores each word ->
  [display] Words colored by pronunciation quality + detailed feedback below
```

### Free speech (secondary, deferred)
```
User speaks freely ->
  [real-time] Words appear as transcribed (neutral color) ->
  [post-recording] Analysis scores pronunciation ->
  [display] Transcribed words colored by quality
```

## Exit Criteria

| Metric | Target |
|--------|--------|
| Latency (word highlight) | < 500ms from spoken word |
| Word alignment accuracy | > 90% words correctly matched to reference |
| Scoring usefulness | Scores correlate with manual assessment |
| Bundle size impact | < 5MB additional |
| Browser support | Chrome + Edge minimum |
