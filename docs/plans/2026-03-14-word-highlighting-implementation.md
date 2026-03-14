# Word-Level Pronunciation Highlighting — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add word-by-word visual feedback: neutral tracking during speech, color-coded pronunciation quality after.

**Architecture:** Three incremental steps. Step 0 extends the Gemini prompt (no worktree). Steps 1-2 each get their own worktree for isolated experimentation. A shared `WordHighlight` component renders colored words from a common interface regardless of data source.

**Tech Stack:** Next.js 16, React 19, TypeScript, Gemini 2.5 Flash, Web Speech API, Azure Speech SDK (Step 2)

---

## Step 0: Extend Gemini Prompt for Word-Level Scores

> Do this on `master` — it's a small additive change to the existing schema.

### Task 0.1: Add `wordScores` to Gemini Response Schema

**Files:**
- Modify: `src/app/api/analyze/route.ts:16-171` (schema definition)

**Step 1: Add wordScores to the combinedSchema**

After `textMatch` (line 165-168), add a new top-level property `wordScores` to the schema object's `properties`:

```typescript
wordScores: {
  type: Type.ARRAY,
  description:
    "Per-word pronunciation assessment. One entry for EVERY word in the prompt, in order. Score each word based on how clearly and correctly the speaker pronounced it.",
  items: {
    type: Type.OBJECT,
    properties: {
      word: {
        type: Type.STRING,
        description: "The exact word from the prompt",
      },
      index: {
        type: Type.NUMBER,
        description: "Zero-based position of this word in the prompt",
      },
      score: {
        type: Type.NUMBER,
        description:
          "Pronunciation quality score from 1 (unintelligible) to 10 (native-like)",
      },
      rating: {
        type: Type.STRING,
        description:
          "Quality category: good (score 7-10), acceptable (score 4-6), or needs_work (score 1-3)",
      },
      issue: {
        type: Type.STRING,
        nullable: true,
        description:
          "Brief description of what was wrong, if anything (e.g., 'th pronounced as d'). Null if good.",
      },
    },
    required: ["word", "index", "score", "rating"],
  },
},
```

Update the `required` array (line 170) to include `"wordScores"`:

```typescript
required: ["simple", "detailed", "textMatch", "wordScores"],
```

**Step 2: Update the Gemini prompt text**

In the `combinedPrompt` string (line 218-231), add a third view instruction after view 2:

```
3. "wordScores" — For EVERY word in the prompt text, in reading order, assign a pronunciation quality score (1-10) and rate it as good/acceptable/needs_work. If a word had issues, briefly note what was wrong. Include ALL words, even small ones like "the", "is", "a".
```

**Step 3: Verify build compiles**

Run: `bun run build`
Expected: No TypeScript errors. The schema is additive so existing response parsing is unaffected.

**Step 4: Commit**

```bash
git add src/app/api/analyze/route.ts
git commit -m "feat(api): add per-word pronunciation scores to Gemini response schema"
```

---

### Task 0.2: Update Mock Data to Include wordScores

**Files:**
- Modify: `src/components/practice/DrillSession.tsx:61-88` (mock feedback)

**Step 1: Add wordScores to the mock response**

In the mock `setFeedback` call (line 61-88), add a `wordScores` field to the object. Use the first drill's prompt "The weather is rather nice today, though it might thunder this Thursday." to generate mock scores:

```typescript
wordScores: [
  { word: "The", index: 0, score: 8, rating: "good", issue: null },
  { word: "weather", index: 1, score: 6, rating: "acceptable", issue: "w slightly soft" },
  { word: "is", index: 2, score: 9, rating: "good", issue: null },
  { word: "rather", index: 3, score: 5, rating: "acceptable", issue: "r slightly rolled" },
  { word: "nice", index: 4, score: 9, rating: "good", issue: null },
  { word: "today,", index: 5, score: 8, rating: "good", issue: null },
  { word: "though", index: 6, score: 3, rating: "needs_work", issue: "th pronounced as d" },
  { word: "it", index: 7, score: 9, rating: "good", issue: null },
  { word: "might", index: 8, score: 8, rating: "good", issue: null },
  { word: "thunder", index: 9, score: 4, rating: "acceptable", issue: "th slightly off" },
  { word: "this", index: 10, score: 3, rating: "needs_work", issue: "th pronounced as z" },
  { word: "Thursday.", index: 11, score: 4, rating: "acceptable", issue: "th needs work" },
],
```

**Step 2: Commit**

```bash
git add src/components/practice/DrillSession.tsx
git commit -m "feat(mock): add word-level scores to mock analysis response"
```

---

### Task 0.3: Create WordHighlight Component

**Files:**
- Create: `src/components/practice/WordHighlight.tsx`
- Create: `src/components/practice/WordHighlight.module.css`

**Step 1: Define the shared types and component**

Create `src/components/practice/WordHighlight.tsx`:

```typescript
"use client";

import styles from "./WordHighlight.module.css";

export interface WordScore {
  word: string;
  index: number;
  score: number;
  rating: "good" | "acceptable" | "needs_work";
  issue?: string | null;
}

export interface WordHighlightProps {
  /** The original prompt text */
  prompt: string;
  /** Per-word scores from Gemini (post-recording) */
  wordScores?: WordScore[];
  /** Index of the word currently being spoken (real-time tracking) */
  activeWordIndex?: number;
  /** Whether the user is currently recording */
  isRecording?: boolean;
}

export function WordHighlight({
  prompt,
  wordScores,
  activeWordIndex,
  isRecording,
}: WordHighlightProps) {
  const words = prompt.split(/\s+/);

  return (
    <div className={styles.container}>
      {words.map((word, i) => {
        const score = wordScores?.find((ws) => ws.index === i);
        const isActive = isRecording && activeWordIndex === i;
        const isPast = isRecording && activeWordIndex !== undefined && i < activeWordIndex;

        let className = styles.word;
        if (isActive) {
          className += ` ${styles.active}`;
        } else if (score) {
          className += ` ${styles[score.rating]}`;
        } else if (isPast) {
          className += ` ${styles.spoken}`;
        }

        return (
          <span
            key={i}
            className={className}
            title={score?.issue ?? undefined}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
```

**Step 2: Create the CSS module**

Create `src/components/practice/WordHighlight.module.css`:

```css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  font-size: 1.25rem;
  line-height: 1.7;
  padding: var(--space-md) 0;
}

.word {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  cursor: default;
}

/* Real-time: currently being spoken */
.active {
  background: rgba(99, 102, 241, 0.25);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  animation: pulse-word 1s ease infinite;
}

/* Real-time: already spoken (neutral) */
.spoken {
  color: var(--color-text);
  opacity: 0.7;
}

/* Post-recording: good pronunciation */
.good {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(34, 197, 94);
}

/* Post-recording: acceptable pronunciation */
.acceptable {
  background: rgba(234, 179, 8, 0.15);
  color: rgb(234, 179, 8);
}

/* Post-recording: needs work */
.needs_work {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(239, 68, 68);
}

@keyframes pulse-word {
  0%, 100% { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15); }
}

/* Hover tooltip for issues */
.word[title]:hover {
  outline: 1px solid var(--color-border);
}
```

**Step 3: Verify build**

Run: `bun run build`
Expected: Compiles clean.

**Step 4: Commit**

```bash
git add src/components/practice/WordHighlight.tsx src/components/practice/WordHighlight.module.css
git commit -m "feat: add WordHighlight component for color-coded word display"
```

---

### Task 0.4: Integrate WordHighlight into DrillSession

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`

**Step 1: Import WordHighlight**

Add import at top of file (after line 11):

```typescript
import { WordHighlight } from "./WordHighlight";
import type { WordScore } from "./WordHighlight";
```

**Step 2: Replace the static prompt text with WordHighlight**

In the JSX, replace the prompt area (lines 248-258). Change the static `<p className={styles.prompt}>{drill.prompt}</p>` to use WordHighlight:

```tsx
<Card variant="elevated">
  <div className={styles.promptArea}>
    <p className={styles.instruction}>{t("readAloud")}</p>
    <WordHighlight
      prompt={drill.prompt}
      wordScores={feedback?.wordScores as WordScore[] | undefined}
      isRecording={recordingState === "recording"}
    />
    <div className={styles.phonemes}>
      {drill.targetPhonemes.map((p) => (
        <span key={p} className={styles.phoneme}>{p}</span>
      ))}
    </div>
  </div>
</Card>
```

**Step 3: Update CombinedFeedback type**

Update the `CombinedFeedback` interface (lines 24-28) to include wordScores:

```typescript
interface CombinedFeedback {
  simple: Record<string, unknown>;
  detailed: Record<string, unknown>;
  textMatch: string;
  wordScores?: WordScore[];
}
```

**Step 4: Verify build and test visually**

Run: `bun dev`

Navigate to a drill. Click record, then stop. The mock data should show the prompt text with green/yellow/red word highlighting after "analysis." Hover over colored words to see issue tooltips.

**Step 5: Commit**

```bash
git add src/components/practice/DrillSession.tsx
git commit -m "feat: integrate WordHighlight into drill session prompt display"
```

---

## Step 1: Web Speech API Real-Time Tracking (Worktree)

> Create worktree: `git worktree add .worktrees/transcribe-webspeech -b research/transcribe-webspeech`
> Run: `cd .worktrees/transcribe-webspeech && bun install`

### Task 1.1: Create useSpeechTracking Hook

**Files:**
- Create: `src/hooks/useSpeechTracking.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechTrackingOptions {
  /** The known reference text (drill prompt) */
  referenceText: string;
  /** Whether tracking is active */
  enabled: boolean;
  /** Language for recognition (BCP-47, e.g., "en-US") */
  lang?: string;
}

interface UseSpeechTrackingResult {
  /** Index of the word currently being spoken */
  activeWordIndex: number | undefined;
  /** Whether SpeechRecognition is supported */
  isSupported: boolean;
  /** Raw interim transcript (for debugging) */
  interimTranscript: string;
}

export function useSpeechTracking({
  referenceText,
  enabled,
  lang = "en-US",
}: UseSpeechTrackingOptions): UseSpeechTrackingResult {
  const [activeWordIndex, setActiveWordIndex] = useState<number | undefined>(undefined);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const referenceWords = useRef<string[]>([]);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Normalize a word for matching: lowercase, strip punctuation
  const normalize = useCallback((w: string) => {
    return w.toLowerCase().replace(/[^a-z'äöüéèêëàâîïôùûç]/gi, "");
  }, []);

  // Find how many reference words have been spoken by matching
  // the transcript words against the reference in order
  const matchWords = useCallback(
    (transcript: string) => {
      const spokenWords = transcript.split(/\s+/).filter(Boolean).map(normalize);
      const refWords = referenceWords.current;
      let refIdx = 0;

      for (const spoken of spokenWords) {
        if (refIdx >= refWords.length) break;
        if (spoken === normalize(refWords[refIdx])) {
          refIdx++;
        }
      }

      return refIdx > 0 ? refIdx - 1 : undefined;
    },
    [normalize],
  );

  useEffect(() => {
    referenceWords.current = referenceText.split(/\s+/).filter(Boolean);
  }, [referenceText]);

  useEffect(() => {
    if (!enabled || !isSupported) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (!enabled) {
        setActiveWordIndex(undefined);
        setInterimTranscript("");
      }
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + " ";
      }
      fullTranscript = fullTranscript.trim();
      setInterimTranscript(fullTranscript);

      const matchedIndex = matchWords(fullTranscript);
      if (matchedIndex !== undefined) {
        setActiveWordIndex(matchedIndex);
      }
    };

    recognition.onerror = (event) => {
      console.log("[SpeechTracking] Error:", event.error);
      // "no-speech" and "aborted" are not real errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("[SpeechTracking] Fatal error:", event.error);
      }
    };

    recognition.onend = () => {
      // Restart if still enabled (Chrome stops after silence)
      if (enabled && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // Already started or page navigated
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Already started
    }

    return () => {
      recognitionRef.current = null;
      try {
        recognition.abort();
      } catch {
        // Already stopped
      }
    };
  }, [enabled, isSupported, lang, matchWords]);

  return { activeWordIndex, isSupported, interimTranscript };
}
```

**Step 2: Add SpeechRecognition type declarations**

Create `src/types/speech-recognition.d.ts`:

```typescript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
```

**Step 3: Verify build**

Run: `bun run build`
Expected: Compiles clean.

**Step 4: Commit**

```bash
git add src/hooks/useSpeechTracking.ts src/types/speech-recognition.d.ts
git commit -m "feat: add useSpeechTracking hook for real-time word position tracking"
```

---

### Task 1.2: Wire useSpeechTracking into DrillSession

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`

**Step 1: Import and use the hook**

Add import after existing imports:

```typescript
import { useSpeechTracking } from "@/hooks/useSpeechTracking";
```

Inside the `DrillSession` component, after the existing state declarations (around line 43), add:

```typescript
const { activeWordIndex, isSupported: speechSupported, interimTranscript } = useSpeechTracking({
  referenceText: drill?.prompt ?? "",
  enabled: recordingState === "recording",
  lang: locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "fr-FR",
});
```

**Step 2: Pass activeWordIndex to WordHighlight**

Update the `<WordHighlight>` JSX to include the tracking props:

```tsx
<WordHighlight
  prompt={drill.prompt}
  wordScores={feedback?.wordScores as WordScore[] | undefined}
  activeWordIndex={activeWordIndex}
  isRecording={recordingState === "recording"}
/>
```

**Step 3: Add a debug line for interim transcript (temporary)**

Below the WordHighlight component, add:

```tsx
{speechSupported && recordingState === "recording" && interimTranscript && (
  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
    Heard: {interimTranscript}
  </p>
)}
```

**Step 4: Test**

Run: `bun dev`

Open in Chrome. Navigate to a drill. Click record and read the prompt aloud. You should see:
- Words highlight with a blue pulse as you speak them
- The "Heard:" debug line shows what the browser is transcribing
- After stopping, the mock word scores appear as green/yellow/red colors

**Step 5: Commit**

```bash
git add src/components/practice/DrillSession.tsx
git commit -m "feat: wire real-time word tracking into drill session via Web Speech API"
```

---

### Task 1.3: Add Transition Animation (Live → Scored)

**Files:**
- Modify: `src/components/practice/WordHighlight.tsx`
- Modify: `src/components/practice/WordHighlight.module.css`

**Step 1: Add staggered reveal animation**

Update WordHighlight component to animate scores appearing. When `wordScores` first arrives (transition from recording to scored), stagger each word's color reveal:

In `WordHighlight.tsx`, add state for reveal animation:

```typescript
import { useState, useEffect } from "react";

// Inside the component, before the return:
const [revealedCount, setRevealedCount] = useState<number>(0);
const isRevealing = wordScores && wordScores.length > 0 && revealedCount < words.length;

useEffect(() => {
  if (!wordScores || wordScores.length === 0) {
    setRevealedCount(0);
    return;
  }
  // Stagger reveal: one word every 80ms
  if (revealedCount < words.length) {
    const timer = setTimeout(() => setRevealedCount((c) => c + 1), 80);
    return () => clearTimeout(timer);
  }
}, [wordScores, revealedCount, words.length]);
```

Update the className logic to only apply score colors for revealed words:

```typescript
if (isActive) {
  className += ` ${styles.active}`;
} else if (score && i < revealedCount) {
  className += ` ${styles[score.rating]} ${styles.revealed}`;
} else if (isPast) {
  className += ` ${styles.spoken}`;
}
```

**Step 2: Add reveal CSS**

In `WordHighlight.module.css`, add:

```css
.revealed {
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0.3; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

**Step 3: Test visually**

Run: `bun dev`

Record and stop. Words should animate in one-by-one with their colors, creating a satisfying reveal.

**Step 4: Commit**

```bash
git add src/components/practice/WordHighlight.tsx src/components/practice/WordHighlight.module.css
git commit -m "feat: add staggered color reveal animation for word scores"
```

---

## Step 2: Azure Pronunciation Assessment (Worktree)

> Create worktree: `git worktree add .worktrees/transcribe-azure -b research/transcribe-azure`
> Run: `cd .worktrees/transcribe-azure && bun install`
> Run: `bun add microsoft-cognitiveservices-speech-sdk`

### Task 2.1: Create Azure Token Endpoint

**Files:**
- Create: `src/app/api/speech-token/route.ts`

**Step 1: Write the token exchange route**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    return NextResponse.json(
      { error: "Azure Speech not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": speechKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to get speech token" },
        { status: res.status },
      );
    }

    const token = await res.text();
    return NextResponse.json({ token, region: speechRegion });
  } catch (error) {
    console.error("[SpeechToken] Error:", error);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 },
    );
  }
}
```

**Step 2: Add env vars to `.env.local`**

```
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

**Step 3: Commit**

```bash
git add src/app/api/speech-token/route.ts
git commit -m "feat(api): add Azure Speech token exchange endpoint"
```

---

### Task 2.2: Create useAzurePronunciation Hook

**Files:**
- Create: `src/hooks/useAzurePronunciation.ts`

**Step 1: Write the hook**

This is the core integration. The hook manages the Azure Speech SDK lifecycle, runs pronunciation assessment against reference text, and emits real-time word-level scores.

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import type { WordScore } from "@/components/practice/WordHighlight";

interface AzurePronunciationOptions {
  referenceText: string;
  lang?: string;
}

interface AzureWordResult {
  word: string;
  accuracyScore: number;
  errorType: string;
}

interface AzurePronunciationResult {
  wordScores: WordScore[];
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronunciationScore: number;
}

interface UseAzurePronunciationResult {
  /** Start recording + assessment */
  start: () => Promise<void>;
  /** Stop recording */
  stop: () => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Real-time word scores as they arrive */
  wordScores: WordScore[];
  /** Final comprehensive result */
  result: AzurePronunciationResult | null;
  /** Error message */
  error: string | null;
  /** Active word index during recognition */
  activeWordIndex: number | undefined;
}

export function useAzurePronunciation({
  referenceText,
  lang = "en-US",
}: AzurePronunciationOptions): UseAzurePronunciationResult {
  const [isRecording, setIsRecording] = useState(false);
  const [wordScores, setWordScores] = useState<WordScore[]>([]);
  const [result, setResult] = useState<AzurePronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | undefined>(undefined);
  const recognizerRef = useRef<unknown>(null);

  const start = useCallback(async () => {
    setError(null);
    setWordScores([]);
    setResult(null);
    setActiveWordIndex(undefined);

    try {
      // 1. Get token from our API
      const tokenRes = await fetch("/api/speech-token");
      const { token, region } = await tokenRes.json();
      if (!token) throw new Error("No speech token received");

      // 2. Dynamic import to avoid SSR issues (SDK is browser-only)
      const sdk = await import("microsoft-cognitiveservices-speech-sdk");

      // 3. Configure speech
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = lang;

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      // 4. Configure pronunciation assessment
      const pronConfig = new sdk.PronunciationAssessmentConfig(
        referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true, // enable miscue
      );
      pronConfig.enableProsodyAssessment = true;

      // 5. Create recognizer
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      pronConfig.applyTo(recognizer);
      recognizerRef.current = recognizer;

      // 6. Handle recognized events (final results per phrase)
      recognizer.recognized = (_s: unknown, e: { result: { text: string; properties?: { getProperty?: (key: string) => string } } }) => {
        if (e.result.text) {
          try {
            const pronResult = sdk.PronunciationAssessmentResult.fromResult(e.result);
            const detailResult = pronResult.detailResult;

            if (detailResult?.Words) {
              const referenceWords = referenceText.split(/\s+/);
              const scores: WordScore[] = detailResult.Words.map(
                (w: AzureWordResult, i: number) => {
                  const accuracy = w.accuracyScore;
                  const rating: WordScore["rating"] =
                    accuracy >= 70 ? "good" : accuracy >= 40 ? "acceptable" : "needs_work";

                  return {
                    word: referenceWords[i] ?? w.word,
                    index: i,
                    score: Math.round(accuracy / 10),
                    rating,
                    issue: w.errorType !== "None" ? w.errorType.toLowerCase() : null,
                  };
                },
              );

              setWordScores(scores);
              setActiveWordIndex(scores.length - 1);

              setResult({
                wordScores: scores,
                accuracyScore: pronResult.accuracyScore,
                fluencyScore: pronResult.fluencyScore,
                completenessScore: pronResult.completenessScore,
                pronunciationScore: pronResult.pronunciationScore,
              });
            }
          } catch (err) {
            console.error("[AzurePron] Parse error:", err);
          }
        }
      };

      // 7. Handle recognizing events (interim — for tracking active word)
      recognizer.recognizing = (_s: unknown, e: { result: { text: string } }) => {
        if (e.result.text) {
          const wordCount = e.result.text.split(/\s+/).filter(Boolean).length;
          setActiveWordIndex(wordCount > 0 ? wordCount - 1 : undefined);
        }
      };

      // 8. Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => setIsRecording(true),
        (err: Error) => {
          setError(`Recognition start failed: ${err}`);
          setIsRecording(false);
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsRecording(false);
    }
  }, [referenceText, lang]);

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current as {
      stopContinuousRecognitionAsync?: (cb: () => void) => void;
      close?: () => void;
    } | null;
    if (recognizer?.stopContinuousRecognitionAsync) {
      recognizer.stopContinuousRecognitionAsync(() => {
        setIsRecording(false);
        recognizer.close?.();
        recognizerRef.current = null;
      });
    }
  }, []);

  return { start, stop, isRecording, wordScores, result, error, activeWordIndex };
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Compiles (SDK imported dynamically so no SSR issues).

**Step 3: Commit**

```bash
git add src/hooks/useAzurePronunciation.ts
git commit -m "feat: add useAzurePronunciation hook with real-time word scoring"
```

---

### Task 2.3: Wire Azure Hook into DrillSession

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`

**Step 1: Add feature toggle and integrate**

Add a toggle to switch between "Web Speech + Gemini" and "Azure" modes. This lets you compare them side by side in the same UI.

At the top of DrillSession component, add:

```typescript
const [useAzure, setUseAzure] = useState(false);
```

Import and use the Azure hook:

```typescript
import { useAzurePronunciation } from "@/hooks/useAzurePronunciation";

// Inside component:
const azure = useAzurePronunciation({
  referenceText: drill?.prompt ?? "",
  lang: locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "fr-FR",
});
```

When `useAzure` is true, the start/stop recording functions should also start/stop the Azure recognizer. The WordHighlight should use Azure's wordScores and activeWordIndex when in Azure mode.

**Step 2: Add mode toggle to UI**

Add a small toggle above the record button:

```tsx
<label style={{ fontSize: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-text-muted)' }}>
  <input type="checkbox" checked={useAzure} onChange={(e) => setUseAzure(e.target.checked)} />
  Azure Pronunciation Assessment
</label>
```

**Step 3: Update WordHighlight props based on mode**

```tsx
<WordHighlight
  prompt={drill.prompt}
  wordScores={useAzure ? azure.wordScores : (feedback?.wordScores as WordScore[] | undefined)}
  activeWordIndex={useAzure ? azure.activeWordIndex : activeWordIndex}
  isRecording={recordingState === "recording"}
/>
```

**Step 4: Test**

1. Without Azure: same as before (Web Speech tracking + mock Gemini scores)
2. With Azure toggle on: Azure SDK streams pronunciation scores in real-time, colors appear during speech

**Step 5: Commit**

```bash
git add src/components/practice/DrillSession.tsx
git commit -m "feat: integrate Azure pronunciation assessment with mode toggle"
```

---

### Task 2.4: Evaluate and Document Findings

**Files:**
- Create: `docs/plans/2026-03-14-word-highlighting-evaluation.md`

**Step 1: Test both approaches with 5+ recordings**

For each approach (Web Speech + Gemini vs Azure), record yourself reading 5 different drill prompts. Document:

| Metric | Web Speech + Gemini | Azure |
|--------|-------------------|-------|
| Latency (word highlight) | ? ms | ? ms |
| Word alignment accuracy | ?/12 words | ?/12 words |
| Scoring usefulness | 1-5 | 1-5 |
| Bundle size impact | +0 KB | +? KB |
| Browser support | Chrome/Edge | Chrome/Edge/Firefox/Safari |

**Step 2: Write findings and recommendation**

**Step 3: Commit**

```bash
git add docs/plans/2026-03-14-word-highlighting-evaluation.md
git commit -m "docs: word highlighting evaluation results"
```
