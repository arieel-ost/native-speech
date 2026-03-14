# NativeSpeech — Architecture

> Living document describing the system as built. Updated: 2026-03-12.

## System Overview

NativeSpeech is an AI-powered pronunciation coach that uses Google Gemini to analyze spoken audio and provide phoneme-level feedback. It supports English and German learners.

```
Onboarding                Dashboard                Practice
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ 1. Choose    │      │ Current score    │      │ Read prompt aloud│
│    language   │──►  │ Weak spots       │──►  │ Record audio     │
│ 2. Record    │      │ Recent sessions  │      │ Get AI feedback  │
│    passage   │      │ Streak           │      │ Save session     │
│ 3. Get       │      └──────────────────┘      └────────┬─────────┘
│    assessment│                                         │
│ 4. View      │                                         │
│    results   │                                         ▼
└──────────────┘                              Score updates, phoneme
                                              progress recalculated
```

All user data lives in `localStorage`. There is no database, no user accounts (next-auth is in the stack but not wired to the core loop). The Gemini API is the only backend dependency.

---

## API Routes

### POST /api/analyze — Practice Feedback

**Source:** `src/app/api/analyze/route.ts`

#### Input

| Field | Source | Required | Description |
|-------|--------|----------|-------------|
| `audio` | FormData | Yes | Audio blob (webm) |
| `prompt` | FormData | Yes | The text the learner was asked to read |
| `phonemes` | FormData | No | JSON array of target phonemes |
| `locale` | FormData | No | UI locale (`en`, `ru`, `es`, `fr`); defaults to `en` |
| `X-Learner-ID` | Header | No | Fingerprint for rate limiting; defaults to `"anonymous"` |

#### Gemini Prompt Strategy

The prompt instructs Gemini as an "expert phonetician and accent coach" to:

1. Analyze the **sounds** (physical production), not just word accuracy
2. Compare against the expected text and target phonemes
3. Produce **two views** of the same analysis:
   - `detailed` — full technical phonetic analysis with IPA, accent detection, prosody, and exercises
   - `simple` — friendly plain-language summary with no technical terms
4. All text fields are generated in the user's UI language (via `locale`); IPA symbols stay as-is

Model: `gemini-2.5-flash`

#### Response Schema (`combinedSchema`)

```typescript
{
  simple: {
    score: number;              // 1-10
    summary: string;            // Plain-language paragraph
    strengths: string[];        // 1-3 items
    improvements: {
      issue: string;            // What sounded off
      tip: string;              // How to fix it
    }[];                        // 1-3 items
  };
  detailed: {
    accent: {
      detectedLanguage: string;
      confidence: "high" | "medium" | "low";
      telltalePatterns: string[];
    };
    phonemeAnalysis: {
      phoneme: string;          // IPA, e.g. "/θ/"
      word: string;             // Specific word evaluated
      rating: "good" | "acceptable" | "needs_work";
      produced: string;         // How speaker produced it
      expected: string;         // How native produces it
      substitution: string | null;
    }[];                        // One entry per phoneme-word pair
    prosody: {
      stressAccuracy: "natural" | "slightly_off" | "unnatural";
      rhythmNotes: string;
      intonationNotes: string;
    };
    overallScore: number;       // 1-10
    tips: {
      targetSound: string;
      exercise: string;
      practiceWord: string;
    }[];                        // 2-4 items, one per unique sound
  };
  textMatch: "yes" | "partial" | "no";
}
```

#### Rate Limiting

Applied before the Gemini call. See [Rate Limiting](#rate-limiting) section.

---

### POST /api/assess — Onboarding Assessment

**Source:** `src/app/api/assess/route.ts`

#### Input

| Field | Source | Required | Description |
|-------|--------|----------|-------------|
| `audio` | FormData | Yes | Audio blob (webm) |
| `language` | FormData | Yes | `"english"` or `"german"` |
| `passage` | FormData | Yes | The diagnostic passage text |
| `locale` | FormData | No | UI locale; defaults to `en` |
| `X-Learner-ID` | Header | No | Fingerprint for rate limiting |

#### Gemini Prompt Strategy

The prompt instructs Gemini to "build a learner profile" (not drill-by-drill feedback):

1. **Accent origin** — identify native language from pronunciation patterns
2. **Top 3-5 problems** — ranked by impact on comprehensibility
3. **Strengths** — 2-3 things the speaker does well (for motivation)
4. **Level** — beginner / intermediate / advanced
5. **Drill recommendations** — ordered list from available category IDs
6. **Summary** — warm, encouraging 2-3 sentence overview

All text generated in the user's UI language.

#### Drill ID Sets by Language

| Language | Available drill IDs |
|----------|-------------------|
| English | `th-sounds`, `vowel-pairs`, `r-l-distinction`, `word-stress`, `intonation`, `consonant-clusters` |
| German | `umlauts`, `ch-sounds`, `uvular-r`, `consonant-clusters`, `word-stress`, `intonation` |

#### Response Schema (`assessmentSchema`)

```typescript
{
  accent: {
    detectedLanguage: string;
    confidence: "high" | "medium" | "low";
    telltalePatterns: string[];
  };
  overallScore: number;           // 1-10
  level: "beginner" | "intermediate" | "advanced";
  topProblems: {
    sound: string;                // IPA
    description: string;          // Plain-language
    severity: "high" | "medium" | "low";
    exampleWord: string;
  }[];                            // 3-5 items
  strengths: string[];            // 2-3 items
  recommendedDrills: string[];    // Ordered drill category IDs
  summary: string;                // 2-3 sentences
}
```

---

## Client State — localStorage

**Source:** `src/lib/learner-store.ts`

### Storage Keys

| Key | Contents |
|-----|----------|
| `native-speech-profile` | Full `LearnerProfile` JSON |
| `native-speech-learner-id` | UUID string (pre-profile fingerprint) |

### LearnerProfile Schema

```typescript
interface LearnerProfile {
  id: string;                         // UUID
  createdAt: string;                  // ISO 8601
  language: "english" | "german";
  assessment: AssessmentData;
  sessions: SessionRecord[];
}

interface AssessmentData {
  overallScore: number;
  level: string;
  accent: {
    detectedLanguage: string;
    confidence: string;
    telltalePatterns: string[];
  };
  topProblems: {
    sound: string;
    severity: string;
    description: string;
    exampleWord: string;
  }[];
  strengths: string[];
  recommendedDrills: string[];
  summary: string;
}

interface SessionRecord {
  id: string;
  timestamp: string;                  // ISO 8601
  drillCategoryId: string;
  drillItemId: string;
  overallScore: number;               // 1-10
  phonemeScores: PhonemeScore[];
}

interface PhonemeScore {
  phoneme: string;
  rating: "good" | "acceptable" | "needs_work";
  word: string;
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `getProfile()` | Read `LearnerProfile` from localStorage. Returns `null` during SSR or if absent. |
| `getLearnerId()` | Returns the profile ID if it exists, otherwise creates/returns a standalone UUID in `native-speech-learner-id`. Used as rate-limit fingerprint. |
| `saveProfile(language, assessment)` | Creates a new `LearnerProfile` with empty sessions array and persists it. Called after onboarding assessment. |
| `addSession(session)` | Appends a `SessionRecord` (auto-generates `id` and `timestamp`) to the profile. Returns `null` if no profile exists. |
| `clearProfile()` | Removes both localStorage keys. |
| `getPhonemeProgress(profile)` | Derives per-phoneme progress from assessment problems + session history. See below. |
| `getCurrentScore(profile)` | Weighted score calculation. See below. |

### Phoneme Progress Calculation

`getPhonemeProgress` iterates over `assessment.topProblems` and for each problem sound, collects all matching `phonemeScores` across all sessions:

| Condition | Status |
|-----------|--------|
| No practice sessions contain this phoneme | `not_started` |
| ≥70% of ratings are `"good"` | `strong` |
| >50% of ratings are `"needs_work"` | `struggled` |
| Everything else | `improving` |

Returns `PhonemeProgress[]` with `phoneme`, `description`, `exampleWord`, `severity`, `status`, `practiceCount`, and `latestRating`.

### Current Score Formula

```
If no sessions:  score = assessment.overallScore
Otherwise:       score = round(assessment.overallScore * 0.3 + avg(last 5 sessions) * 0.7)
```

The 30/70 weighting means practice performance quickly dominates the displayed score.

### Hydration Pattern

All components that read localStorage use a `useEffect` + `useState` pattern:

```typescript
const [profile, setProfile] = useState<LearnerProfile | null>(null);
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setProfile(getProfile());
  setMounted(true);
}, []);

if (!mounted) return null;
```

This prevents SSR/hydration mismatches since localStorage is unavailable on the server. The `getProfile()` and `getLearnerId()` functions also guard with an `isSSR()` check that returns `null` / `""` when `window` is undefined.

---

## Rate Limiting

**Source:** `src/lib/rate-limit.ts`

### Mechanism

- **Key:** `${fingerprint}:${ip}` — fingerprint comes from `X-Learner-ID` header (the learner UUID), IP from `X-Forwarded-For` or `X-Real-IP`
- **Limit:** 30 calls per 24-hour window
- **Store:** In-memory `Map<string, { count: number; resetAt: number }>`
- **Reset:** TTL-based — each key's window starts on first use and expires after 24 hours

### Request/Response Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `X-Learner-ID` | Request | Client-sent fingerprint (learner UUID) |
| `X-RateLimit-Remaining` | Response | Remaining calls in window |
| `Retry-After` | Response (429 only) | Seconds until window resets |

### Limitations

- In-memory store resets on every serverless cold start or deploy
- No persistent backing store — effectively a soft limit
- Anonymous users share the `"anonymous"` fingerprint (partitioned by IP)

---

## Onboarding Flow

**Source:** `src/components/onboarding/AccentAssessment.tsx`

### Steps

| Step | State | What Happens |
|------|-------|-------------|
| `language` | Initial | User chooses English or German. Two language cards shown. |
| `record` | After language selection | Diagnostic passage displayed. User records via MediaRecorder API. Can playback via `AudioPlayer`, re-record, or submit. |
| `analyzing` | After submit | Spinner shown. Audio sent as FormData to `POST /api/assess` with language, passage text, locale, and learner ID header. |
| `results` | After API response | Score circle, accent detection badge, level badge, summary, strengths list, top problems with severity badges, and telltale accent patterns. Two CTAs: "Start Practicing" (→ dashboard) or "Retake Assessment". |

### Diagnostic Passages

Each passage is designed to cover the key pronunciation challenges of its language:

**English passage** covers: θ/ð, r/l, consonant clusters (str, npl, sp), word-final stops, vowel contrasts, stress patterns, declarative + list + question intonation.

**German passage** covers: Umlauts (ü, ö, ä), ch sounds (ç/x), uvular R, consonant clusters (schw, kr, ntsch), word-final devoicing, long/short vowels, stress, declarative + reported speech + polite question intonation.

### Data Flow

On successful assessment: `saveProfile(language, assessment)` creates the `LearnerProfile` in localStorage with the Gemini response data and an empty sessions array. The user is then routed to `/dashboard`.

---

## Practice Flow

### DrillGrid — Drill Selection

**Source:** `src/components/practice/DrillGrid.tsx`

Reads `LearnerProfile` from localStorage via `useEffect`. Filters `mockDrillCategories` to the user's target language (or shows all if no profile). Sorts drills:

1. **Recommended drills first**, in the order returned by the assessment's `recommendedDrills` array
2. Non-recommended drills after

Badges:
- **"Start here"** — first recommended drill the user hasn't practiced yet
- **"Recommended"** — other recommended drills
- Difficulty badges: `beginner` (success), `intermediate` (accent), `advanced` (error)

Links to `/practice/[categoryId]`.

### DrillSession — Practice Loop

**Source:** `src/components/practice/DrillSession.tsx`

Props: `drills: DrillSession[]`, `categoryName: string`

#### Recording States

| State | UI | Action |
|-------|-----|--------|
| `idle` | Red circle button | Click → start recording |
| `recording` | Red square (stop) button, pulsing | Click → stop recording, auto-submit |
| `processing` | Cancel (✕) button | Audio sent to `/api/analyze`; click → abort fetch |
| `done` | Retry (↻) button | Feedback displayed; click → re-record |

#### Analysis Flow

1. Start recording → `MediaRecorder` captures audio and `useSpeechTracking()` optionally starts browser `SpeechRecognition` for known-text drills
2. During recording, `WordHighlight` receives `activeWordIndex` and renders a neutral current-word highlight plus subdued styling for already-spoken words
3. Stop recording → `onstop` fires → blob created → `analyze(blob)` called automatically
4. FormData sent to `POST /api/analyze` with: `audio`, `prompt`, `phonemes` (JSON), `locale`, and `X-Learner-ID` header
5. On success, feedback stored as `CombinedFeedback` (`simple` + `detailed` + `textMatch` + `wordScores`)
6. Session saved to localStorage via `addSession()` — extracts `overallScore` from `simple.score` (fallback to `detailed.overallScore` or 5), and maps `detailed.phonemeAnalysis` to `PhonemeScore[]`

#### Known-Text Word Highlighting

- `src/hooks/useSpeechTracking.ts` wraps browser `SpeechRecognition` and exposes `activeWordIndex`, `interimTranscript`, and `isSupported`
- `src/lib/speech-tracking.ts` normalizes transcript/reference words, tolerates bounded STT drift, and never regresses progress within one recording session
- `src/components/practice/WordHighlight.tsx` has two UI phases:
  - During recording: neutral active-word highlight only
  - After Gemini analysis: staggered per-word reveal using `wordScores` with `good`, `acceptable`, and `needs_work` states
- Tooltip content comes from `wordScores[i].issue` and is available on hover and keyboard focus
- If browser speech recognition is unsupported, recording and Gemini analysis still work; only live word tracking is absent

#### Three Feedback Display Modes

| Mode | Component | Content |
|------|-----------|---------|
| `simplified` | `SimplifiedFeedbackDisplay` | `simple` object + `textMatch` |
| `advanced` | `FeedbackDisplay` | `detailed` object + `textMatch` |
| `json` | `JsonFeedbackDisplay` | Raw JSON tree |

Default mode is `simplified`. User toggles between modes via buttons.

#### Navigation

Previous/Next buttons navigate between drills in the category. Navigation resets all recording state. Back link returns to dashboard.

---

## Dashboard

**Source:** `src/app/[locale]/(app)/dashboard/page.tsx`

### Data Derivation

All dashboard data is derived from `LearnerProfile` in localStorage:

| Data | Source |
|------|--------|
| Current score | `getCurrentScore(profile)` — weighted formula |
| Phoneme progress | `getPhonemeProgress(profile)` — status per assessment problem |
| Session count | `profile.sessions.length` |
| Streak | `calculateStreak(profile.sessions)` — local function |

### Empty States

| Condition | Displayed |
|-----------|-----------|
| No profile in localStorage | "Take your assessment" CTA linking to `/onboarding` |
| Profile exists, no sessions | Score from assessment, empty session list, all phonemes show `not_started` |
| Profile with sessions | Full dashboard with score, streak, weak spots, recent sessions |

### Streak Calculation

The `calculateStreak` function:

1. Extracts unique date strings from session timestamps
2. Sorts them newest-first
3. Counts consecutive days backward from today
4. Allows the streak to start from yesterday (grace period of 1 day)

### Dashboard Components

#### ScoreOverview

**Props:** `score: number`, `sessionCount: number`, `streak: number`

Displays a `ProgressRing` (score out of 10) plus two stat cards: day streak and total sessions.

#### WeakSpots

**Props:** `phonemes: PhonemeProgress[]`

Grid of cards, one per phoneme from the assessment's `topProblems`. Each shows the phoneme symbol, example word, status badge (`not_started` / `struggled` / `improving` / `strong`), and practice count.

#### RecentSessions

**Props:** `sessions: SessionRecord[]`

Shows last 10 sessions in reverse chronological order. Each row displays the drill category name (looked up from `mockDrillCategories`), date, and score badge (green if ≥ 7).

---

## Internationalization (i18n)

**Source:** `src/i18n/routing.ts`, `src/messages/`

### Configuration

- **Library:** `next-intl`
- **Locales:** `en`, `ru`, `es`, `fr`
- **Default locale:** `en`
- **Routing:** `[locale]` segment in URL path (`/en/dashboard`, `/ru/practice`, etc.)
- **Navigation:** Custom `Link`, `usePathname`, `useRouter` from `@/i18n/navigation` (not from `next/link`)

### Translation Namespaces

| Namespace | Scope |
|-----------|-------|
| `Metadata` | Page titles, meta descriptions |
| `Nav` | Marketing navigation bar |
| `Hero`, `Features`, `Footer`, `PricingPreview`, `Pricing`, `About` | Marketing pages |
| `SignIn`, `SignUp` | Auth pages |
| `Sidebar`, `Header` | App shell |
| `Dashboard`, `ScoreOverview`, `RecentSessions`, `WeakSpots` | Dashboard |
| `Practice`, `DrillGrid`, `DrillSession` | Practice flow |
| `FeedbackDisplay`, `SimplifiedFeedback` | Feedback components |
| `Progress`, `ScoreTrend`, `PhonemeTable`, `StreakTracker` | Progress views |
| `Settings` | Settings page |
| `LocaleSwitcher` | Locale selector |
| `AccentAssessment` | Onboarding flow |
| `Drills` | Drill names and descriptions (keyed by drill ID) |
| `Phonemes`, `Difficulty` | Shared phoneme/difficulty labels |

### Gemini Localization

Both API routes accept a `locale` FormData field and map it to a language name (`en` → `English`, `ru` → `Russian`, etc.). The Gemini prompt includes:

> "IMPORTANT: Respond entirely in ${language}. All text fields in your response — summaries, tips, descriptions, pattern names — must be written in ${language}. Keep IPA symbols and phoneme notation as-is."

This means API responses are already in the user's language — no client-side translation of Gemini output is needed.

### CI

A GitHub Action (`.github/workflows/`) checks i18n key sync across locale files, ensuring all four locale JSONs have the same key structure.

---

## Drill Content

**Source:** `src/lib/mock-data.ts`

Despite the filename, this contains **real application content** — drill definitions, practice sentences, and diagnostic passages. The "mock" prefix refers to legacy placeholder user data (e.g., `mockUser`, `mockRecentSessions`) that is no longer used by the live app.

### English Drill Categories (6)

| ID | Name | Phonemes | Difficulty | Drills |
|----|------|----------|------------|--------|
| `th-sounds` | TH Sounds | θ, ð | intermediate | 3 |
| `vowel-pairs` | Vowel Pairs | ɪ/iː, ʊ/uː, æ/ɛ | beginner | 2 |
| `r-l-distinction` | R vs L | r, l | intermediate | 2 |
| `word-stress` | Word Stress | ˈ, ˌ | advanced | — |
| `intonation` | Intonation | ↗, ↘ | advanced | — |
| `consonant-clusters` | Consonant Clusters | str, spl, nts | intermediate | — |

### German Drill Categories (5)

| ID | Name | Phonemes | Difficulty | Drills |
|----|------|----------|------------|--------|
| `umlauts` | Umlaute | ɛː, øː, yː | beginner | 3 |
| `ch-sounds` | CH-Laute | ç, x | intermediate | 3 |
| `german-r` | German R | ʁ, ɐ | intermediate | 2 |
| `long-short-vowels` | Vokallänge | aː/a, oː/ɔ, eː/ɛ | beginner | 3 |
| `final-devoicing` | Auslautverhärtung | b→p, d→t, g→k | advanced | 2 |

**Note:** `word-stress`, `intonation`, and `consonant-clusters` have category definitions but no drill sentences in `mockDrillSessions` yet. The assess API still recommends them; the practice page would show "no drills" for these categories.

### Drill Sentence Structure

Each drill sentence (`DrillSession`) has:
- `id` — unique identifier (e.g., `"th-1"`)
- `categoryId` — references the category
- `prompt` — the sentence to read aloud
- `targetPhonemes` — array of IPA symbols Gemini should focus on
