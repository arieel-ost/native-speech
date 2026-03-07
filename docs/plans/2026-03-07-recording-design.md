# Recording Feature — Design

## Goal

Add real audio recording to the drill session flow. Capture the user's pronunciation, send it to Gemini 3 Flash for open-ended analysis, and display the response. This is an exploratory prototype — we want to see what Gemini can tell us before designing a structured feedback system.

## Flow

1. User taps **Record** in `DrillSession` — browser captures audio via `MediaRecorder` API (webm/opus)
2. User taps **Stop** — recording ends
3. Audio playback appears so the user can listen back
4. Audio blob + drill context is POST'd to `/api/analyze`
5. API route sends audio + prompt text + target phonemes to Gemini 3 Flash
6. Raw Gemini response (markdown) is rendered in the feedback card

## Changes

### `DrillSession.tsx` (modify)

- Add `MediaRecorder` logic: request mic permission, start/stop recording
- On stop: create `Object URL` from blob, show `<audio>` player for playback
- Send audio blob + `{ prompt, targetPhonemes }` as `FormData` to `/api/analyze`
- Display loading state while waiting for Gemini
- Render Gemini's markdown response in the feedback card

### `/api/analyze/route.ts` (new)

- Accepts `POST` with `FormData` containing:
  - `audio` — webm/opus blob
  - `prompt` — the text the user was asked to read
  - `phonemes` — target phonemes (JSON string)
- Converts audio blob to base64
- Calls Gemini 3 Flash with audio + text context
- Returns Gemini's response as JSON `{ feedback: string }`

### Gemini prompt (exploratory)

```
You are a pronunciation coach. The user is practicing English pronunciation.

They were asked to read aloud: "{prompt}"
Target phonemes to evaluate: {phonemes}

Listen to their recording and provide detailed feedback on:
- Overall intelligibility
- Specific phoneme accuracy for the target sounds
- Any other pronunciation issues you notice
- Concrete tips for improvement

Be encouraging but honest.
```

This prompt is intentionally broad — we'll refine it based on what Gemini returns.

### `.env.local`

```
GEMINI_API_KEY=<already configured>
```

## Dependencies

- `@google/genai` — Google's official Gemini JS SDK

## Out of scope

- Structured scoring / data persistence
- Polished feedback UI (just render markdown for now)
- Error retry logic
- Audio format conversion (webm/opus is natively supported by Gemini)
