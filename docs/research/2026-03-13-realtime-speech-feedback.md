# Real-Time Speech Feedback Architecture Research

**Date:** 2026-03-13
**Status:** Complete
**Author:** Research conducted with Claude Code (multi-agent investigation)

---

## 1. Executive Summary

### Recommendation: Client-Side Audio Feedback (No Live Transcription)

After investigating 20+ options across client-side, cloud streaming, hybrid, and self-hosted categories — and stress-testing the proposed architecture through an 8-person design board review — the recommendation is a **focused, zero-cost client-side approach**:

1. **Web Audio API AnalyserNode** — waveform visualization + volume monitoring (1-2 days)
2. **@ricky0123/vad-web** — Voice Activity Detection for speech/silence detection + API call gating (1-2 days)
3. **Silence gate on existing Gemini flow** — reject recordings with < 2s of detected speech (half day)

**Total: ~3-4 days, $0 recurring cost.**

**Critically: Do NOT add live transcription via Web Speech API.** The design board unanimously flagged this as counterproductive for a pronunciation app with non-native speakers. Garbled transcriptions of accented speech will demoralize users, and the undisclosed audio transmission to Google creates privacy/compliance risk. The waveform visualization already solves the "is my mic working?" problem without these downsides.

### Why This Matters

The current recording experience shows nothing — users stare at "Recording..." with zero feedback. This causes:
- Anxiety: "Is my mic even on?"
- Wasted API calls: silent/noise recordings sent to Gemini
- Poor UX: no sense of progress during recording

The recommended approach provides visual confirmation (waveform), audio quality awareness (volume warnings), and smart gating (reject bad recordings) — all for free.

---

## 2. Landscape Scan Results

### Categories of Available Options

Research covered 20+ web searches across all categories. Here's what exists:

#### Client-Side (Free, No API)

| Option | Real-Time | Accent Handling | Status | Notes |
|--------|-----------|----------------|--------|-------|
| **Web Speech API** | Yes (interim results) | Poor-mediocre for non-native | Browser-native, actively maintained | Chrome/Edge only; sends audio to Google |
| **Web Audio API (AnalyserNode)** | Yes | N/A (audio processing, not recognition) | Browser-native | Universally supported; waveform, RMS, FFT |
| **Vosk-Browser (WASM)** | Yes | Reasonable (20+ languages) | Active (alphacep/vosk-api) | ~50MB model download; MIT license |
| **Whisper.cpp (WASM)** | Yes (tiny/base models) | Good (680K hrs training) | Active (ggml-org/whisper.cpp) | 40-500MB models; too heavy for mobile |
| **Silero VAD** | Yes (frame-by-frame) | N/A (detection only) | Active (snakers4/silero-vad) | 87.7% TPR; MIT; ~2MB model |
| **Picovoice Cobra VAD** | Yes | N/A (detection only) | Active | 98.9% TPR; freemium licensing |

#### Cloud Streaming (Paid, High Accuracy)

| Option | Streaming | Accent Quality | Pricing | Pronunciation Features |
|--------|-----------|---------------|---------|----------------------|
| **Deepgram Nova-3** | WebSocket, sub-300ms | Good, custom training available | $0.0077/min ($200 free credits) | Word confidence scores only |
| **AssemblyAI Universal-2** | WebSocket, ~300ms P50 | Best-in-class for accented speech | $0.0025/min ($50 free credits) | Word confidence scores only |
| **Google Cloud STT** | Yes | Good (125+ languages) | $0.024/min (60 min/mo free) | None |
| **AWS Transcribe** | Yes | Good (ties with AssemblyAI on some benchmarks) | $0.024-0.030/min (60 min/mo free) | None |
| **Soniox** | Yes, token-level ms latency | 60+ languages | ~$0.12/hr streaming | None |
| **Gladia (Solaria-1)** | Yes, 103ms partial latency | 100+ languages | $0.55/hr all-inclusive | None |
| **OpenAI Whisper API** | Batch only (no streaming) | Good | $0.006/min (cheapest) | None |

#### Pronunciation Assessment APIs (Specialized)

| Option | Real-Time | Features | Pricing |
|--------|-----------|----------|---------|
| **Azure Speech Pronunciation Assessment** | Yes, streaming | Phoneme/syllable/word accuracy, IPA, prosody, fluency, completeness | $0.017/min (5hr/mo free) |
| **Speechace API** | Yes | Phoneme scoring, syllable stress, patented tech | Commercial (contact for pricing) |
| **ELSA Speech API** | Yes | 95%+ accuracy, 200M+ hours accented data, phoneme comparison | Commercial (contact for pricing) |

#### Multimodal / LLM-Based

| Option | Streaming | Notes | Pricing |
|--------|-----------|-------|---------|
| **Gemini Live API** | Yes (WebSocket bidirectional) | Transcription + could do real-time pronunciation hints; context window billing trap | ~$0.0015/min audio input |
| **OpenAI Realtime API** | Yes (WebSocket + WebRTC) | Speech-to-speech; no pronunciation scoring; combine with Azure for scoring | Premium pricing |

#### VAD Libraries for Browser

| Library | NPM Downloads | Stars | Model Size | Accuracy |
|---------|--------------|-------|-----------|----------|
| **@ricky0123/vad-web** | Growing | 3K+ | ~2-5MB (ONNX) | Good (wraps Silero) |
| **hark** | Stable | 600+ | None (amplitude-based) | Basic |
| **Picovoice Cobra** | Growing | N/A | Small | 98.9% TPR |

#### Waveform Visualization Libraries

| Library | NPM Weekly Downloads | Notes |
|---------|---------------------|-------|
| **wavesurfer.js** | ~477K | Most popular; React wrapper available |
| **react-audio-visualize** | Growing | React-native, lighter |
| **Meyda** | Moderate | Audio feature extraction (RMS, spectral, etc.) |
| **Custom canvas** | N/A | ~40 lines with AnalyserNode + rAF |

### Competitor Technology Stacks

| App | Approach | Key Tech |
|-----|----------|----------|
| **ELSA Speak** | Proprietary deep learning; 200M+ hours accented English from 195 countries; phoneme-level comparison to native speaker model | Custom ML models, not off-the-shelf STT |
| **BoldVoice** | Custom AI "ears" trained for accented English; phoneme-level IPA feedback; $21M raised | Built custom because generic ASR fails at pronunciation |
| **Speechling** | Human tutors review recordings (NOT AI-based feedback) | No AI pronunciation assessment |
| **Glossika** | Spaced repetition; recording for self-assessment | No confirmed AI scoring |
| **FluentU** | Video-based immersive learning; speech recognition for exercises | Standard STT integration |
| **Accent Hero** | Web-based pronunciation practice | Unknown specifics |
| **Pronounce** | AI speech checking for professional English | Unknown specifics |

**Key insight:** Top pronunciation apps (ELSA, BoldVoice) built custom models because generic speech recognition is inadequate for pronunciation assessment. They don't use off-the-shelf STT — they train purpose-built phoneme classifiers on massive accented speech datasets.

---

## 3. Detailed Findings per Shortlisted Option

### 3.1 Web Audio API + AnalyserNode (RECOMMENDED — Layer 1)

**How it works:** Create an `AudioContext` from the existing `getUserMedia` MediaStream. Connect a `MediaStreamSourceNode` to an `AnalyserNode`. Poll `getByteTimeDomainData()` or `getFloatTimeDomainData()` via `requestAnimationFrame` for waveform rendering. Compute RMS amplitude from the sample buffer for volume metering.

**Architecture:**
```
getUserMedia stream → AudioContext → MediaStreamSourceNode → AnalyserNode
                                                                  ↓
                                                    getByteTimeDomainData()
                                                          ↓
                                              Canvas/SVG waveform rendering
                                              RMS computation → volume meter
                                              Clipping detection (samples near ±1.0)
                                              Silence detection (RMS below threshold)
```

**Pros:**
- Universally supported (all modern browsers including Safari, Firefox, mobile)
- Zero cost, zero network, zero privacy concern
- Can share the same MediaStream with MediaRecorder (no conflicts)
- Lightweight — negligible CPU overhead
- Provides exactly what users need: visual "mic is alive" confirmation

**Cons:**
- Doesn't provide transcription (but that's a feature, not a bug — see board review)
- Basic amplitude analysis, not speech recognition
- Requires manual tuning of fftSize, smoothingTimeConstant, thresholds

**Browser support:** Universal (Web Audio API: 98%+ global support)

**Implementation complexity:** 1-2 days

**Key code pattern:**
```typescript
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
source.connect(analyser);

const dataArray = new Uint8Array(analyser.frequencyBinCount);
function draw() {
  analyser.getByteTimeDomainData(dataArray);
  // Render waveform from dataArray
  // Compute RMS: sqrt(mean(samples^2))
  requestAnimationFrame(draw);
}
draw();
```

### 3.2 @ricky0123/vad-web — Voice Activity Detection (RECOMMENDED — Layer 1)

**How it works:** Wraps the Silero VAD model (trained on 6000+ hours) in ONNX Runtime Web (WASM). Runs inference on audio frames in the browser. Fires events: `onSpeechStart`, `onSpeechEnd`, `onMisfire`. Can process the same MediaStream as MediaRecorder.

**Pros:**
- Accurate speech/silence classification (87.7% TPR at 5% FPR)
- Runs entirely client-side — no network, no cost, no privacy concern
- Small model (~2MB ONNX + ONNX Runtime WASM ~3MB)
- WebWorker execution — doesn't block main thread
- Enables smart API gating: don't send silence to Gemini

**Cons:**
- ~5MB total WASM+model download on first use (mitigated by lazy loading)
- ONNX WASM may fail on very old/low-end devices
- Could have false negatives on quiet, accented speakers (needs validation)
- Adds a new failure mode (WASM loading) that needs graceful handling

**Browser support:** All browsers with WASM support (97%+)

**Implementation complexity:** 2-3 days (including lifecycle management, error handling, lazy loading)

**NPM:** `@ricky0123/vad-web` — actively maintained, React wrapper available (`@ricky0123/vad-react`)

**Integration point:** After `getUserMedia()` in DrillSession.tsx. The VAD consumes the same stream. Events drive UI state and post-recording decisions.

### 3.3 Browser Web Speech API (NOT RECOMMENDED for MVP)

**How it works:** `SpeechRecognition` / `webkitSpeechRecognition` API. Browser captures audio, streams to Google's servers, returns transcription with interim results. Cannot accept an existing MediaStream — opens its own mic connection.

**Why NOT recommended (board consensus + technical research):**

1. **UX harm for accented speakers:** When a Russian speaker says "think" and the transcript shows "sink" — in a pronunciation app — that's the app telling them they're pronouncing it wrong, even though the real Gemini analysis hasn't happened yet. 4/8 board reviewers flagged this independently.

2. **iOS Safari: completely unsupported.** All iOS browsers use WebKit under the hood, and WebKit does not implement SpeechRecognition. This is not a partial gap — it's a total blackout on iOS. For a mobile-first language learning app, this is disqualifying.

3. **Android Chrome: conflicts with MediaRecorder.** Android enforces single-app microphone access at the OS level. When MediaRecorder holds the mic, SpeechRecognition starts but produces zero transcripts. This breaks the core recording pipeline on the primary mobile platform.

4. **Firefox: not supported at all.** No implementation, no plans announced.

5. **Privacy/compliance risk:** Sends audio to Google's speech services without user consent or disclosure. Voice data is biometric under GDPR Article 9. No Data Processing Agreement with Google for Web Speech API. No deletion capability.

6. **Designed for transcription, not pronunciation.** The API actively tries to "correct" mispronunciations to match known words — the opposite of what pronunciation training needs. Real-world reports say it's "overly lenient" for language learning.

7. **Redundant:** The waveform visualization already proves the mic is capturing audio. A pulsing waveform is a better "mic works" indicator than garbled text.

**When to reconsider:** If user feedback specifically requests a live transcript, and you're willing to add consent flows and privacy disclosures. Consider Gemini Live API instead at that point.

### 3.4 Deepgram Nova-3 (DEFERRED — Phase 2+ option)

**How it works:** WebSocket streaming from browser to `wss://api.deepgram.com/v1/listen`. Sends audio chunks, receives JSON transcriptions in real-time.

**Key findings:**
- Sub-300ms latency for streaming results
- Word-level confidence scores (0-1 float) with timestamps — useful as pronunciation proxy
- Custom model training for accents (but requires significant data)
- Nova-3 Multilingual supports code-switching
- **Security concern:** API key exposure in client code — needs a proxy server (Next.js API route)

**Pricing:** $0.0077/min streaming ($200 free credits). At 1000 recordings/day × 30s avg = ~$3.85/day = ~$115/month.

**When to adopt:** When you need accurate real-time transcription that works cross-browser AND you have revenue to justify the cost. Use the word-level confidence scores as pronunciation indicators.

### 3.5 AssemblyAI Universal-2 (DEFERRED — Phase 2+ option)

**Key findings:**
- Best-in-class accent handling per independent benchmarks
- 93.3% Word Accuracy Rate on Global English
- ~300ms P50 streaming latency
- Word-level confidence scores
- **Billing gotcha:** Billed for entire WebSocket connection duration, including idle time

**Pricing:** $0.0025/min base ($50 free credits). Cheapest cloud option but connection-time billing can inflate costs.

**When to adopt:** Same as Deepgram. AssemblyAI edges ahead on accent accuracy but has the connection-time billing trap.

### 3.6 Azure Speech Pronunciation Assessment (DEFERRED — Most Interesting for Future)

**This is the standout option for future consideration.** It's the only major cloud provider with purpose-built pronunciation scoring.

**Features unique to Azure:**
- Phoneme-level accuracy scores (IPA alphabet)
- Syllable-level scoring
- Word-level accuracy with miscue detection (omission, insertion, repetition, mispronunciation)
- Prosody scoring (stress, intonation, speed, rhythm) — en-US only
- Fluency and completeness scoring
- 33 supported languages/locales
- JavaScript SDK with WebRTC support

**Pricing:** $0.017/min ($1.02/hr). Free tier: 5 hours/month. No extra charge for pronunciation features beyond base STT pricing.

**Why deferred:** Would duplicate Gemini's role. The right move is to evaluate Azure as a potential **Gemini replacement** (not addition) when:
- Gemini's pronunciation analysis quality is insufficient
- You need standardized phoneme-level scoring (IPA)
- You want real-time pronunciation feedback during recording (not just after)

**Key source:** [Azure Pronunciation Assessment docs](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)

### 3.7 Gemini Live API (DEFERRED — Phase 2 candidate)

**How it works:** WebSocket bidirectional streaming. Audio streamed in, responses streamed out. Can combine transcription AND pronunciation analysis in a single stream.

**Key findings:**
- Audio tokenized at 25 tokens/second (1,500 tokens/min)
- Cost: ~$0.0015/min for audio input (cheapest cloud option)
- **Context window billing trap:** In Live API sessions, all previous turns are re-processed, so costs accumulate over long sessions
- Free tier: 10 RPM, 250K TPM, 250 requests/day (was cut 50-80% in Dec 2025)
- React starter app available: [github.com/google-gemini/live-api-web-console](https://github.com/google-gemini/live-api-web-console)

**Unique advantage:** Could provide real-time pronunciation hints during recording — not just transcription but actual analysis feedback as the user speaks. This is the only option that could combine STT + pronunciation assessment in one stream.

**Why deferred:** Complexity of managing WebSocket sessions, context window cost accumulation, and it's still an LLM doing transcription (not a dedicated STT engine). Best explored when the app has proven product-market fit.

---

## 4. Comparison Matrix

| Criterion | Web Audio API | @ricky0123/vad-web | Web Speech API | Deepgram | AssemblyAI | Azure Pronunciation | Gemini Live |
|-----------|--------------|-------------------|----------------|----------|------------|---------------------|-------------|
| **Cost** | $0 | $0 | $0 | $0.0077/min | $0.0025/min | $0.017/min | ~$0.0015/min |
| **Real-time** | Yes | Yes | Yes (interim) | Yes (WebSocket) | Yes (WebSocket) | Yes (SDK) | Yes (WebSocket) |
| **Accent handling** | N/A | N/A | Poor | Good | Best | Purpose-built | Good |
| **Pronunciation scoring** | No | No | No | No | No | **Yes (phoneme-level)** | Via prompting |
| **Browser support** | 98%+ | 97%+ (WASM) | Chrome/Edge desktop only (no iOS, no Firefox, conflicts on Android) | All (WebSocket) | All (WebSocket) | All (SDK) | All (WebSocket) |
| **Privacy** | Local only | Local only | Sends to Google | Your API key | Your API key | Your API key | Your API key |
| **Implementation** | 1-2 days | 2-3 days | 2-3 days | 3-5 days | 3-5 days | 5-7 days | 5-7 days |
| **Download size** | 0 | ~5MB WASM | 0 | SDK ~50KB | SDK ~50KB | SDK ~100KB | SDK ~50KB |
| **Free tier** | ∞ | ∞ | ∞ | $200 credits | $50 credits | 5hr/mo | Shared w/ Flash |

---

## 5. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DrillSession.tsx                             │
│                                                                 │
│  ┌──────────────────┐     ┌───────────────────────────────────┐ │
│  │  getUserMedia()   │────▶│        MediaStream                │ │
│  └──────────────────┘     └──────┬──────────┬─────────────────┘ │
│                                  │          │                    │
│                    ┌─────────────┘          └──────────────┐    │
│                    ▼                                       ▼    │
│  ┌─────────────────────────────┐    ┌──────────────────────────┐│
│  │     MediaRecorder           │    │  AudioContext             ││
│  │  (existing, unchanged)      │    │  ┌──────────────────────┐││
│  │                             │    │  │ MediaStreamSourceNode │││
│  │  webm/opus blob on stop     │    │  └──────────┬───────────┘││
│  └─────────────┬───────────────┘    │             │            ││
│                │                    │  ┌──────────▼───────────┐││
│                │                    │  │    AnalyserNode       │││
│                │                    │  │  ┌─────────────────┐ │││
│                │                    │  │  │ Waveform Viz    │ │││
│                │                    │  │  │ RMS Meter       │ │││
│                │                    │  │  │ Clipping Detect │ │││
│                │                    │  │  │ Silence Detect  │ │││
│                │                    │  │  └─────────────────┘ │││
│                │                    │  └──────────────────────┘││
│                │                    └──────────────────────────┘│
│                │                                                │
│                │              ┌─────────────────────────────┐   │
│                │              │  @ricky0123/vad-web         │   │
│                │              │  (ONNX WASM WebWorker)      │   │
│                │              │                             │   │
│                │              │  onSpeechStart → UI update  │   │
│                │              │  onSpeechEnd → UI update    │   │
│                │              │  speechDuration tracking    │   │
│                │              └──────────────┬──────────────┘   │
│                │                             │                  │
│                ▼                             ▼                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              POST /api/analyze (existing route)             ││
│  │                                                             ││
│  │  GATE: speechDuration >= 2s? ──▶ If no: reject w/ message  ││
│  │  METADATA: avgAmplitude, noiseEstimate, speechRatio         ││
│  │                                                             ││
│  │  Audio blob → Gemini 2.5 Flash → Pronunciation Feedback    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Single MediaStream, multiple consumers.** AudioContext and MediaRecorder both consume the same getUserMedia stream without conflict. VAD also consumes this stream via its own AudioContext or by receiving audio frames.

2. **No live transcription.** The waveform + VAD provides sufficient "mic is alive" feedback. Live transcription was rejected for UX, privacy, and browser compatibility reasons (see Board Review, Appendix).

3. **VAD gates API calls.** If total detected speech is < 2 seconds when recording stops, reject the recording with a helpful error message instead of sending to Gemini. This saves API cost and improves UX.

4. **Lazy-load WASM.** The ONNX runtime + Silero model (~5MB) loads on first recording attempt, not on page load. Show the record button as briefly disabled with "Preparing audio..." until ready.

5. **Graceful degradation.** If WASM fails to load (old device), skip VAD silently — recording still works, just without the speech gate. If AudioContext fails, skip visualization — recording still works.

### Suggested Hook Architecture

```typescript
// useAudioPipeline.ts — single hook owning all audio consumers
function useAudioPipeline() {
  return {
    // State
    isReady: boolean,        // WASM loaded, AudioContext active
    isRecording: boolean,
    isSpeaking: boolean,     // VAD speech detection
    rmsLevel: number,        // 0-1 amplitude
    waveformData: Uint8Array,
    audioQuality: {
      tooQuiet: boolean,
      tooLoud: boolean,
      silenceDetected: boolean,
    },
    speechDuration: number,  // seconds of detected speech

    // Actions
    startRecording: () => Promise<void>,
    stopRecording: () => { blob: Blob, metadata: AudioMetadata },

    // Capability detection (run on mount)
    capabilities: {
      hasAudioContext: boolean,
      hasVAD: boolean,
    },
  };
}
```

---

## 6. Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **VAD false negatives on accented speech** | Medium | Medium | Validate with 20+ accented speech samples before shipping. Set conservative thresholds (< 2s, not < 5s). |
| **WASM fails on low-end devices** | Low | Low | Graceful degradation — skip VAD, recording still works. Log failures. |
| **Multiple audio consumers cause performance issues on mobile** | Medium | Low | AnalyserNode is lightweight; VAD runs in WebWorker. Monitor and shed waveform frame rate first. |
| **5MB WASM download on slow connections** | Low | Medium | Lazy-load, aggressive caching (Cache-Control: immutable), version in filename. |
| **AudioContext suspended by browser** | Low | Medium | Resume on user gesture (click record). Standard pattern. |
| **Users still confused about mic working** | Low | Low | Waveform is universally understood visual feedback. Add "Listening..." text label. |

---

## 7. Suggested Implementation Order

### Phase 1: Ship in 3-4 days (zero cost)

**Day 1-2: Waveform + Volume Meter**
- Create `useAudioPipeline` hook
- Add AudioContext + AnalyserNode to existing getUserMedia stream
- Render waveform visualization (canvas or wavesurfer.js)
- Add RMS-based volume indicator (too quiet / good / too loud)
- Add silence detection warning (no audio detected after 3s)

**Day 2-3: VAD Integration**
- Add @ricky0123/vad-web with lazy loading
- Wire up onSpeechStart/onSpeechEnd events
- Track total speech duration during recording
- Add "Speech detected" / "No speech" indicator

**Day 3-4: API Gating + Polish**
- Gate: reject recordings < 2s speech with helpful error
- Add audio quality metadata to FormData (avgAmplitude, speechRatio)
- Handle all degradation paths (no WASM, no AudioContext)
- Test on mobile Chrome, desktop Chrome, Safari (degraded mode)

### Phase 2: Future Enhancements (when user feedback warrants)

| Enhancement | Trigger | Cost |
|-------------|---------|------|
| **Mic calibration pre-recording step** | Users confused by volume | Free (already have AnalyserNode) |
| **Auto-stop on prolonged silence** | Users forget to stop recording | Free (already have VAD) |
| **Azure Pronunciation Assessment** | Need standardized phoneme scoring | $0.017/min (5hr/mo free) |
| **Gemini Live API** | Need real-time pronunciation hints during recording | ~$0.0015/min |
| **Deepgram/AssemblyAI streaming** | Need accurate cross-browser live transcription | $0.0025-0.0077/min |

### Phase 3: When to Replace Gemini

If pronunciation analysis quality becomes a bottleneck, evaluate in this order:
1. **Azure Speech Pronunciation Assessment** — purpose-built, phoneme-level IPA scoring, prosody analysis
2. **Speechace API** — patented pronunciation technology, syllabus stress scoring
3. **Custom model** — only if scale justifies (10K+ daily users)

---

## 8. Appendix: Design Board Review Transcript

### Board Composition

| Role | Verdict | Key Finding |
|------|---------|-------------|
| Tech Architect | ⚠️ Concerns | Dual mic access is structural problem; need state machine; no resource budget for 4 concurrent consumers |
| Developer | ⚠️ Concerns | VAD integration underestimated; state complexity explosion; need `useAudioPipeline` hook |
| Devil's Advocate | ⚠️ Concerns | Live transcription is a UX trap; VAD cost savings are pennies; privacy is buried |
| UX Design Thinker | ⚠️ Concerns | Live transcription will demoralize accented speakers; too many simultaneous signals; volume warnings interrupt flow |
| Ops/DevOps | ⚠️ Concerns | No observability on client-side layers; WASM caching strategy needed; need client error reporter |
| Hacker | ⚠️ Concerns | Ship waveform in 1 day, not 4 weeks; Web Speech API is a trap; VAD is nice-to-have |
| Financial | ✅ Approved | Zero recurring cost holds up; set trigger threshold for upgrading to paid services |
| Compliance/Privacy | ⚠️ Concerns | Web Speech API = undisclosed biometric data to Google; no privacy policy; GDPR Article 9 |

---

### Tech Architect Review

**Verdict:** ⚠️ Concerns

**Concerns:**
- Dual microphone access (SpeechRecognition opens its own mic) is a fundamental constraint, not just a risk. On mobile, two concurrent mic access requests can conflict or fail silently.
- Four concurrent audio consumers have no resource budget. On mid-range Android (likely user profile for non-native speakers), this is a performance concern. Need priority ordering for graceful degradation.
- VAD and SpeechRecognition overlap in detecting "is the user speaking?" — conflicting signals not addressed.
- No clear component boundary design. Need a single `useAudioSession` hook with explicit cleanup ordering.
- 5MB WASM download has no loading strategy specified (eager vs lazy, caching, UX during download).

**Suggestions:**
- Define a state machine: `idle → initializing → ready → recording → processing → result`
- Lazy-load VAD behind dynamic import with "Loading audio engine..." state
- Add `audioCapabilities` detection step before initializing
- Consider time-slicing AnalyserNode and VAD through shared AudioContext

**What looks good:**
- 3-layer separation is sound (free client → free browser → paid server)
- Deferring cloud streaming STT is correct at this scale
- VAD-based gating is highest-ROI item
- "Enhance existing Layer 3" avoids rewrite

---

### Developer Review

**Verdict:** ⚠️ Concerns

**Concerns:**
- VAD integration underestimated at "1-2 days" — ONNX WASM hosting on Vercel, lifecycle management, WebWorker teardown on unmount is closer to 2-3 days
- State complexity explosion: adding three concurrent subsystems to a clean `idle | recording | processing | done` state machine will create interleaved useEffects mess
- Web Speech API is flaky — `no-speech`, `network`, `aborted` errors frequent; can stop firing events mid-session
- "93%+ browser support" is misleading — also requires internet connection for Google's servers
- Missing AnalyserNode config details (fftSize, smoothingTimeConstant, polling frequency)

**Suggestions:**
- Create `useAudioPipeline` hook that owns MediaStream and orchestrates all consumers
- Gate SpeechRecognition behind capability check, don't block core recording flow
- Ship Layers 1-2 together, Layer 3 separately (different risk profiles)
- Add VAD-based auto-stop after 5+ seconds silence as stretch goal
- Specify ONNX model hosting strategy (public/, CDN, or bundled)

**What looks good:**
- Building on existing getUserMedia stream rather than refactoring
- VAD-based API gating is high-value, low-effort
- Implementation order is correct (waveform first, then VAD, then transcription)
- Codebase is well-positioned for these additions

---

### Devil's Advocate Review

**Verdict:** ⚠️ Concerns

**Concerns:**
1. **SpeechRecognition as "just an indicator" is a UX trap.** Users WILL interpret live text as the app's judgment of their pronunciation. You can't show text during a pronunciation exercise and expect users to ignore it. A pulsing "hearing you" dot achieves the same goal without confusion.

2. **Audio routing problem nobody's addressing.** SpeechRecognition creates its own mic connection. On Chrome Android, dual-mic-access is undertested territory. Has anyone prototyped this on an actual mid-range Android phone?

3. **VAD cost savings is false economy.** At 100-1000 recordings/day on Gemini 2.5 Flash, daily API cost is < $1-5. Adding 5MB WASM + new failure mode (false negatives on accented speakers) to save pennies. The real justification should be UX improvement, not cost savings.

4. **"3-4 weeks" is fantasy scheduling.** Each layer is 2-3 weeks of real work including testing.

5. **Privacy risk buried as item 5 when it should be item 1.** Audio to Google without consent for non-native speakers (EU/GDPR relevant) is a trust-breaking moment.

**Suggestions:**
- Replace SpeechRecognition with simple audio level indicator
- Validate VAD on accented speech before committing (20 samples)
- Ship Layer 1 alone first, measure impact

**What looks good:**
- Solving the zero-feedback problem is correct
- Deferring cloud STT and Whisper WASM is smart discipline
- AnalyserNode for waveform/RMS is the right starting point
- Layered approach is sound economic thinking

---

### UX Design Thinker Review

**Verdict:** ⚠️ Concerns

**Concerns:**
1. **Live transcription will actively harm user confidence.** Non-native speakers already anxious about pronunciation will see garbled words appearing — devastating signal. The waveform already proves mic works.

2. **Too many simultaneous signals.** Passage text + waveform + volume warnings + VAD indicator + transcript = 5 channels competing for attention during what should be focused reading.

3. **Volume warnings risk interrupting flow.** "Too quiet" warning mid-sentence breaks concentration. Volume feedback belongs before recording, not during.

4. **2-second gate needs clear recovery UX.** "Recording rejected" without guidance creates a dead end. Need: explanation + immediate retry button + return to same passage.

5. **Browser fragmentation creates inconsistent experiences.** Chrome gets full features, Safari gets partial — user switching devices will be confused.

**Suggestions:**
- Drop live transcription entirely — waveform is sufficient
- Simplify to two signals: waveform + single status line
- Move volume calibration to pre-recording step
- Design rejection screen as helpful, not punitive
- VAD failure should fall back silently (users don't know what VAD is)

**What looks good:**
- Waveform is the right core idea — universally understood
- Silence gate prevents wasted analysis
- Audio quality metadata to Gemini is invisible improvement
- Graceful degradation approach is correct

---

### Ops/DevOps Review

**Verdict:** ⚠️ Concerns

**Concerns:**
1. 5MB WASM on Vercel CDN needs proper Cache-Control headers and static asset placement
2. Zero observability on three new client-side subsystems — debugging "it doesn't work" becomes guesswork
3. Web Speech API silent failure risk — can stop firing events, 60s timeout
4. WASM memory pressure on low-end mobile devices
5. Stale cached WASM after rollback could create broken hybrid state

**Suggestions:**
- Add lightweight client error reporter (`navigator.sendBeacon`)
- Set 10s timeout on WASM model loading
- Add client health/readiness state machine
- Put ONNX/WASM in `public/models/` with versioned filenames
- Document minimum browser/device requirements

**What looks good:**
- No new secrets, servers, or API keys — cleanest possible deployment
- Lazy-loading strategy is correct
- Existing API route change is minor and backwards-compatible
- No new infrastructure to maintain

---

### Hacker Review

**Verdict:** ⚠️ Concerns

**Concerns:**
1. **3-4 weeks wildly over-scoped.** Waveform is 1 day, solves 80% of the problem.
2. Web Speech API is a trap — flaky, Chrome-only, bad for accented speakers.
3. VAD is nice-to-have, not need-to-have — waveform IS voice detection from user perspective.
4. Audio quality gating system is premature — 5 lines of amplitude check suffices.

**Suggestions:**
- **Ship in 1-2 days:** AnalyserNode + canvas waveform + basic amplitude silent-recording check. That's it.
- Later: wavesurfer.js polish, VAD, auto-stop. Only if user feedback warrants.

**What looks good:**
- Deferring paid APIs is correct
- Using built-in browser APIs first is right instinct
- Library choices (wavesurfer.js, vad-web) are correct if needed
- Integration point is clean

---

### Financial Review

**Verdict:** ✅ Approved

**What looks good:**
- Zero incremental recurring cost is genuine and holds up under scrutiny
- Layer 3 gating pays for itself (even if savings are modest at current scale)
- Deferred options are correctly deferred at current scale
- 7-10 person-days is well-sized with clear stopping points

**Concerns:**
- Web Speech API dependency on Chrome creates hidden support burden cost — Firefox/Safari users generate tickets

**Suggestions:**
- Set concrete trigger thresholds for upgrading to paid services
- Track VAD rejection rates from day one
- When ready for paid STT, start with Gemini Live ($0.0015/min) before Deepgram ($0.0077/min) or Azure ($0.017/min)

---

### Compliance & Privacy Review

**Verdict:** ⚠️ Concerns

**Concerns:**
1. **Undisclosed audio to Google via Web Speech API** — voice = biometric data under GDPR Article 9. App programmatically invokes SpeechRecognition, making developer the controller.
2. **No privacy policy** — GDPR Article 13 requires data processing disclosure at collection point, regardless of accounts or server storage.
3. **No documented lawful basis** — browser mic permission ≠ GDPR-compliant consent.
4. **Dual Google pipelines with different governance** — Gemini API (your key, your DPA) vs Web Speech API (no DPA, no deletion capability).
5. **GDPR right to erasure partially unachievable** for audio sent to Google.
6. **No age verification / COPPA consideration** — language learning app could attract minors.

**Suggestions:**
1. Add consent banner before first mic use (accept/decline each data flow independently)
2. Create basic privacy policy page
3. Make Web Speech API opt-in with clear label: "Enable live transcription (sends audio to Google)"
4. Add data processing disclosure to onboarding flow
5. Consider whether transcription could come from Gemini response instead, eliminating second data pathway
6. Document processing activities internally

**What looks good:**
- VAD and waveform are fully client-side — privacy-positive
- No server-side user data storage
- No accounts or authentication reduces PII surface
- Audio not stored server-side (pass-through to Gemini)

---

### Board Synthesis: Addressed in Revised Recommendation

| Concern | Source | Resolution |
|---------|--------|------------|
| Live transcription harms accented speakers | UX, Devil's Advocate | **Dropped from recommendation** |
| Privacy: undisclosed audio to Google | Compliance, Devil's Advocate | **Dropped (no Web Speech API)** |
| Dual mic access conflicts | Architect, Developer | **Eliminated (no SpeechRecognition)** |
| Too many simultaneous signals | UX | **Reduced to waveform + single status line** |
| Over-scoped timeline | Hacker | **Reduced to 3-4 days** |
| No observability | DevOps | **Acknowledged: add client error reporter** |
| VAD cost savings argument is weak | Devil's Advocate | **Reframed: UX benefit is the real justification** |
| State complexity | Developer, Architect | **Addressed: useAudioPipeline hook pattern specified** |
| WASM loading strategy | Architect, DevOps | **Specified: lazy-load, public/models/, versioned filenames** |
| Volume warnings interrupt flow | UX | **Moved to pre-recording or passive-only during recording** |

---

## Sources

### Landscape & Comparison
- [AssemblyAI: Top APIs for Real-Time Speech Recognition (2026)](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [Deepgram: Best Speech-to-Text APIs (2026)](https://deepgram.com/learn/best-speech-to-text-apis-2026)
- [VoiceWriter: Best Speech Recognition API (2025)](https://voicewriter.io/blog/best-speech-recognition-api-2025)
- [VocaFuse: Best Speech-to-Text API Comparison (2025)](https://vocafuse.com/blog/best-speech-to-text-api-comparison-2025/)

### Pricing
- [Deepgram Pricing](https://deepgram.com/pricing)
- [AssemblyAI Pricing](https://www.assemblyai.com/pricing)
- [Azure Speech Pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)
- [Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Cloud STT Pricing](https://cloud.google.com/speech-to-text/pricing)
- [AWS Transcribe Pricing](https://aws.amazon.com/transcribe/pricing/)
- [Soniox Pricing](https://soniox.com/pricing)
- [Gladia Pricing](https://www.gladia.io/pricing)

### Technical Documentation
- [Azure Pronunciation Assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)
- [Azure Language Learning Tutorial](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-learning-with-pronunciation-assessment)
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api)
- [Deepgram Live Transcription in Browser](https://deepgram.com/learn/live-transcription-mic-browser)
- [Speechace API Docs](https://docs.speechace.com/)

### Libraries
- [wavesurfer.js](https://wavesurfer-js.org/)
- [@ricky0123/vad](https://github.com/ricky0123/vad)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Vosk Browser](https://www.npmjs.com/package/vosk-browser)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp)

### Competitor Research
- [ELSA Speak](https://elsaspeak.com/en/)
- [ELSA on EdTech Digest](https://www.edtechdigest.com/2024/10/31/elsa-speak/)
- [BoldVoice](https://www.boldvoice.com/)
- [BoldVoice raises $21M (Slator)](https://slator.com/boldvoice-raises-21m/)
- [Speechling](https://speechling.com/)
