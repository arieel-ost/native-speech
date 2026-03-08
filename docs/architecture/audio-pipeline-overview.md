# NativeSpeechAI: Audio Architecture & Feature Overview

## 1. AI Models & Pipeline Roles

Building a precision speech pedagogy tool requires balancing latency, mathematical accuracy, and actionable coaching. The architecture relies on different models for different tasks.

### Gemini (Native Multimodal LLM)

Processes raw audio waveforms natively, bypassing lossy text transcription.

**Role:** Qualitative coaching, prosody evaluation, and translating phonetic data into anatomical instructions via structured JSON. Highly cost-effective for an MVP, but susceptible to conversational "auto-correct" bias and lacks deterministic mathematical scoring.

### Kaldi / Vosk

Lightweight, legacy C++ toolkit.

**Role:** Real-time, on-device streaming. Essential for zero-latency word-spotting and live UI highlighting while the user speaks.

### POWSM (Phonetic Open Whisper-style Speech Model)

State-of-the-art (late 2025) open-weight model.

**Role:** Outputs exact International Phonetic Alphabet (IPA) strings. Highly accurate for detecting phonetic variations without requiring massive GPU clusters.

### WavLM / HuBERT

Deep self-supervised acoustic extractors.

**Role:** Generates multi-dimensional tensors from audio. When combined with forced alignment and a classifier, they output deterministic Goodness of Pronunciation (GOP) scores for granular tracking.

### OpenSMILE

Open-source Digital Signal Processing (DSP) tool.

**Role:** Extracts hard mathematical values (Hertz, decibels) for pitch, formants, and breathiness instantly on the backend.

## 2. Extractable Sound Features

Moving beyond simple transcription, the backend can isolate physical and acoustic realities to serve diverse coaching needs.

### Articulatory Mechanics (Accent Neutralization)

- **Voice Onset Time (VOT):** Delay in vocal cord vibration (crucial for English plosives like /p/ and /t/).
- **Vowel Space Mapping:** Detecting centralized or "lazy" vowels.
- **Consonant Substitution:** Flagging exact phonetic mismatches (e.g., /s/ instead of /θ/).

### Prosody & Intonation (Acting & Public Speaking)

- **Pitch Contours:** Tracking rising/falling melody (e.g., up-speak or monotone delivery).
- **Lexical Stress & Rhythm:** Flagging robotic syllable-timing versus natural stress-timing.

### Resonance & Timbre (Identity & Vocal Presence)

- **Fundamental Frequency (F0):** Baseline pitch.
- **Formant Frequencies (F1, F2):** Resonance balance determining the "brightness" or "darkness" of the voice.
- **Vocal Quality:** Measuring breathiness, nasality, and vocal fry (creakiness).

## 3. Architectural Possibilities & MVP Strategy

Raw acoustic data must be translated into an actionable heuristic layer to provide actual value.

### Phase 1 (The MVP Backend)

Leverage AI automation by pushing raw audio and target text to Gemini 3.1 Flash-Lite. Enforce a strict system prompt ("Clinical Phonetician Persona") to output a structured JSON scorecard. This handles qualitative feedback and pedagogical advice instantly without complex backend infrastructure.

### Phase 2 (The Deep-Tech Expansion)

- **Real-time Frontend:** Integrate Vosk via WebSockets for live word highlighting.
- **The Heuristic Middle Layer:** Run OpenSMILE/POWSM locally to extract deterministic mismatches (e.g., "F0 rose by 40% at the end of the sentence").
- **Pedagogical Translation:** Pass these hard mathematical anomalies to the LLM to generate targeted coaching (e.g., "Drop your pitch on the final word to project authority in this read," or "Rest your top teeth on your bottom lip to create friction for the /v/ sound").
