# Native Speech

A pronunciation training app for language learners (English, German, others). Users practice reading prompts aloud, record themselves, and get AI-powered feedback on their pronunciation — with a focus on specific phonemes that are typically challenging for non-native speakers.

## Why this exists

Most language apps test vocabulary and grammar. Pronunciation gets a "repeat after me" and a thumbs up. Native Speech takes a different approach: it uses Gemini's multimodal audio understanding to actually listen to what you said, transcribe it, compare it against the expected text, and give honest phoneme-level feedback.

Beyond individual phonemes, the app aims to detect the user's native-language accent patterns and provide targeted guidance to neutralise them — helping learners sound more natural rather than just "correct enough."

## Challenges

- **Audio analysis quality** — Gemini isn't used as a speech-to-text transcriber. We rely on its multimodal audio understanding to actually hear and analyse the sounds — comparing how phonemes were produced against how they should sound. This is exploratory; the quality of feedback varies and the prompt needs ongoing tuning. There's no dedicated pronunciation scoring API, so we're pushing a general-purpose multimodal model into a specialist role.
- **Browser audio capture** — MediaRecorder API produces webm/opus, which Gemini accepts natively. But codec support varies across browsers and there's no format conversion layer yet.
- **No real auth yet** — next-auth is wired up with a stub credentials provider (always returns a demo user). Real authentication is deferred.
- **Mock data** — drill content, scores, and progress are all mock. No database or persistence layer exists yet.

## Third-party dependencies

| Service / Library                   | What it does                                                                                                  | Required                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Google Gemini** (`@google/genai`) | Multimodal audio analysis — listens to recordings and evaluates pronunciation at the sound level (not just transcription). Currently using `gemini-2.5-flash`. | Yes — core feature. Needs `GEMINI_API_KEY` in `.env.local` |
| **NextAuth v5** (`next-auth@beta`)  | Authentication framework. Currently stubbed with a demo credentials provider.                                 | Yes — app shell requires it                                |
| **Vercel**                          | Target deployment platform. Not yet configured with env vars for the recording feature.                       | For production only                                        |

## Architecture overview

```
src/
  app/
    (marketing)/          # Landing page, pricing, about, sign-in/sign-up
    (app)/                # Authenticated app shell
      dashboard/          # Score overview, recent sessions, weak spots
      practice/           # Drill grid + drill session pages
        [drillId]/        # Individual drill with recording
      progress/           # Score trends, streaks, phoneme table
      settings/           # User settings
    api/
      auth/[...nextauth]/ # NextAuth route handler
      analyze/            # POST endpoint — receives audio, calls Gemini, returns feedback
    layout.tsx            # Root layout with theme + auth providers
  components/
    ui/                   # Button, Card, Input, Badge, ProgressRing
    marketing/            # Hero, Features, PricingPreview, Nav, Footer
    app/                  # Sidebar, Header (app shell chrome)
    dashboard/            # ScoreOverview, RecentSessions, WeakSpots
    practice/             # DrillGrid, DrillSession (recording + analysis)
    progress/             # ScoreTrend, StreakTracker, PhonemeTable
  providers/              # ThemeProvider, AuthProvider
  lib/
    mock-data.ts          # All drill content, scores, session data
    theme.ts              # Theme configuration
  auth.ts                 # NextAuth config (stub credentials provider)
```

**Request flow for recording:**

1. User clicks Record in `DrillSession` — browser captures audio via `MediaRecorder` (webm/opus)
2. User clicks Stop — audio blob is created, playback `<audio>` element appears
3. Component POSTs `FormData` (audio blob + prompt text + target phonemes) to `/api/analyze`
4. API route base64-encodes the audio, sends it to Gemini with a structured evaluation prompt
5. Gemini analyses the audio — hearing how sounds were produced, comparing against expected pronunciation, and evaluating accuracy
6. Raw feedback text is returned and displayed in the feedback card

## Tech stack

- **Next.js 16** with App Router and route groups
- **React 19** with React Compiler (`babel-plugin-react-compiler`)
- **TypeScript**
- **next-auth v5** (beta) for authentication
- **@google/genai** for Gemini API access
- **Bun** as package manager and runtime
- **CSS Modules** for component styling (no Tailwind, no CSS-in-JS)

## Getting started

```bash
bun install
cp .env.example .env.local  # add your GEMINI_API_KEY
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with any credentials (auth is stubbed).

## Documentation worth reading

| File                                                | What's in it                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md`                                         | Project conventions, stack details, recording feature status and next steps. **Start here if you're an AI agent.** |
| `docs/plans/2026-03-07-recording-design.md`         | Design doc for the audio recording + Gemini analysis feature                                                       |
| `docs/plans/2026-03-07-recording-implementation.md` | Step-by-step implementation plan for the recording feature                                                         |
| `docs/plans/2026-03-02-mvp-shell-design.md`         | Original design for the app shell (layouts, pages, components)                                                     |
| `docs/plans/2026-03-02-mvp-shell-implementation.md` | Implementation plan for the MVP shell                                                                              |
