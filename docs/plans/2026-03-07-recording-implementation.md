# Recording Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real audio recording to drill sessions, send to Gemini 3 Flash for pronunciation analysis, display feedback.

**Architecture:** Browser MediaRecorder captures webm/opus audio -> POST as FormData to Next.js API route -> API route converts to base64, sends to Gemini 3 Flash via @google/genai SDK -> returns markdown feedback to client.

**Tech Stack:** React 19, Next.js 16, MediaRecorder API, @google/genai SDK, Gemini 3 Flash

---

### Task 1: Install @google/genai SDK

**Step 1: Install the dependency**

Run: `bun add @google/genai`

**Step 2: Verify installation**

Run: `bun pm ls | grep genai`
Expected: `@google/genai` appears in output

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add @google/genai SDK"
```

---

### Task 2: Create the /api/analyze route

**Files:**
- Create: `src/app/api/analyze/route.ts`

**Step 1: Create the API route**

```typescript
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;
  const prompt = formData.get("prompt") as string;
  const phonemes = formData.get("phonemes") as string;

  if (!audioFile || !prompt) {
    return NextResponse.json(
      { error: "Missing audio or prompt" },
      { status: 400 }
    );
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Audio,
          mimeType: audioFile.type || "audio/webm",
        },
      },
      `You are a pronunciation coach. The user is practicing English pronunciation.

They were asked to read aloud: "${prompt}"
Target phonemes to evaluate: ${phonemes}

Listen to their recording and provide detailed feedback on:
- Overall intelligibility
- Specific phoneme accuracy for the target sounds
- Any other pronunciation issues you notice
- Concrete tips for improvement

Be encouraging but honest.`,
    ],
  });

  return NextResponse.json({ feedback: response.text });
}
```

**Step 2: Verify the server starts without errors**

Run: `bun dev`
Check: no compile errors in the terminal

**Step 3: Commit**

```bash
git add src/app/api/analyze/route.ts
git commit -m "feat: add /api/analyze route for Gemini pronunciation analysis"
```

---

### Task 3: Add recording + playback + analysis to DrillSession

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`
- Modify: `src/components/practice/DrillSession.module.css`

**Step 1: Rewrite DrillSession.tsx with recording logic**

Replace the full contents of `src/components/practice/DrillSession.tsx` with:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Card } from "@/components/ui";
import type { DrillSession as DrillSessionType } from "@/lib/mock-data";
import styles from "./DrillSession.module.css";

interface DrillSessionProps {
  drills: DrillSessionType[];
  categoryName: string;
}

type RecordingState = "idle" | "recording" | "processing" | "done";

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drill = drills[currentIndex];

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setFeedback(null);
      setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        await analyze(blob);
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const analyze = async (blob: Blob) => {
    if (!drill) return;
    setRecordingState("processing");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("prompt", drill.prompt);
      formData.append("phonemes", JSON.stringify(drill.targetPhonemes));

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setRecordingState("done");
        return;
      }

      setFeedback(data.feedback);
      setRecordingState("done");
    } catch {
      setError("Failed to connect to analysis service.");
      setRecordingState("done");
    }
  };

  const handleRecordClick = () => {
    if (recordingState === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleNav = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? Math.max(0, currentIndex - 1)
      : Math.min(drills.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    setRecordingState("idle");
    setAudioUrl(null);
    setFeedback(null);
    setError(null);
  };

  if (!drill) return <p>No drills available for this category.</p>;

  return (
    <div className={styles.session}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <span className={styles.counter}>
          {currentIndex + 1} / {drills.length}
        </span>
      </div>

      <Card variant="elevated">
        <div className={styles.promptArea}>
          <p className={styles.instruction}>Read this aloud:</p>
          <p className={styles.prompt}>{drill.prompt}</p>
          <div className={styles.phonemes}>
            {drill.targetPhonemes.map((p) => (
              <span key={p} className={styles.phoneme}>{p}</span>
            ))}
          </div>
        </div>
      </Card>

      <button
        className={`${styles.recordBtn} ${recordingState === "recording" ? styles.recording : ""}`}
        onClick={handleRecordClick}
        disabled={recordingState === "processing"}
        aria-label={recordingState === "recording" ? "Stop recording" : "Start recording"}
      >
        <span className={styles.recordIcon}>
          {recordingState === "recording" ? "\u25A0" : "\u25CF"}
        </span>
        <span>
          {recordingState === "recording"
            ? "Stop"
            : recordingState === "processing"
              ? "..."
              : "Record"}
        </span>
      </button>

      {audioUrl && (
        <audio controls src={audioUrl} className={styles.audioPlayer} />
      )}

      <Card variant="outlined">
        <div className={styles.feedback}>
          {error ? (
            <p className={styles.errorText}>{error}</p>
          ) : recordingState === "processing" ? (
            <p className={styles.feedbackText}>Analyzing your pronunciation...</p>
          ) : feedback ? (
            <div className={styles.feedbackContent}>{feedback}</div>
          ) : (
            <p className={styles.feedbackText}>
              {recordingState === "recording"
                ? "Listening..."
                : "Your pronunciation feedback will appear here after recording."}
            </p>
          )}
        </div>
      </Card>

      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={() => handleNav("prev")}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleNav("next")}
          disabled={currentIndex === drills.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Add CSS for audio player and error state**

Append to `src/components/practice/DrillSession.module.css`:

```css
.audioPlayer {
  width: 100%;
  border-radius: var(--radius-md);
}

.errorText {
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}

.feedbackContent {
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
```

**Step 3: Test manually**

Run: `bun dev`
1. Navigate to a drill (e.g. `/practice/th-sounds`)
2. Click Record -> speak -> click Stop
3. Verify: audio player appears, "Analyzing..." shows, then Gemini feedback renders
4. Verify: navigating to next drill resets state

**Step 4: Commit**

```bash
git add src/components/practice/DrillSession.tsx src/components/practice/DrillSession.module.css
git commit -m "feat: add audio recording, playback, and Gemini analysis to drill sessions"
```

---

### Task 4: Verify end-to-end and fix Gemini model name if needed

**Step 1: Run dev server and test full flow**

Run: `bun dev`

The Gemini model name `gemini-3-flash-preview` is based on current SDK docs. If it errors, check the error message — the model name may need to be adjusted to the latest available (e.g., `gemini-3-flash`). Update in `src/app/api/analyze/route.ts` accordingly.

**Step 2: Verify build succeeds**

Run: `bun build`
Expected: no type errors, successful build

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: adjust Gemini model name / build fixes"
```
