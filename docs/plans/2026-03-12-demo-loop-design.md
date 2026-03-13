# Demo User Loop — Design

**Date:** 2026-03-12
**Status:** Approved

## Goal

Create a complete user loop without auth or backend persistence: onboarding assessment → dashboard with real scores → recommended drills → practice → measure phoneme improvement. All state lives in localStorage. API routes are rate-limited by fingerprint + IP.

## The Loop

```
Onboarding Assessment
    → Gemini analyzes accent, returns scores + problems + recommended drills
    → Save to localStorage as "learner profile"
    ↓
Dashboard (hub)
    → Shows: overall score, top problem phonemes with status, practice history
    → "Your sounds to work on" as the primary view
    ↓
Drill Grid
    → All drills visible, recommended ones badged + sorted to top
    → First recommended drill has clear "Start here" treatment
    ↓
Drill Session
    → Record → Gemini analyzes → feedback displayed
    → Save session result + per-phoneme scores to localStorage
    → On finish: back to dashboard with updated data
    ↓
Dashboard (updated)
    → Phoneme progress updated from new session data
    → "struggled → improving" transitions visible
    → Overall trend across sessions
    → Loop continues: next recommended drill highlighted
```

## localStorage Schema

```typescript
interface LearnerProfile {
  id: string                    // crypto.randomUUID(), also used as rate-limit fingerprint
  createdAt: string
  language: "english" | "german"
  assessment: {
    overallScore: number        // 1-10
    level: string
    accent: {
      detectedLanguage: string
      confidence: string
      telltalePatterns: string[]
    }
    topProblems: {
      sound: string
      severity: string
      description: string
      exampleWords: string[]
    }[]
    strengths: string[]
    recommendedDrills: string[] // ordered drill category IDs
    summary: string
  }
  sessions: SessionRecord[]     // append-only
}

interface SessionRecord {
  id: string
  timestamp: string
  drillCategoryId: string       // "th-sounds"
  drillItemId: string           // "th-1"
  overallScore: number          // from simple.score (1-10)
  phonemeScores: {
    phoneme: string             // "/θ/"
    rating: "good" | "acceptable" | "needs_work"
    word: string
  }[]
}
```

## Dashboard Data Flow

Dashboard reads `LearnerProfile` from localStorage and derives all views:

### Overall Score
- Initial: `assessment.overallScore` from onboarding
- Updated: running average of last N session scores (or weighted recent)

### Phoneme Progress ("Your sounds to work on")
- Source: `assessment.topProblems` identifies which phonemes to track
- Progress: aggregate `phonemeScores` across all `sessions` for each phoneme
- Display: `not started` → `struggled` → `improving` → `strong`
- Status derived from most recent ratings for that phoneme vs earliest ratings

### Recent Sessions
- Read `sessions` array, display most recent 5-10
- Show: date, drill category, score, duration (if tracked)

### Recommended Drills
- Source: `assessment.recommendedDrills` (ordered list)
- Cross-reference with `sessions` to show which have been practiced
- First un-practiced recommended drill = "Start here"

## Drill Grid Changes

- Read `recommendedDrills` from localStorage profile
- Badge recommended drills with "Recommended for you"
- Sort recommended drills to top of their language group
- First recommended drill gets distinct "Start here" visual treatment
- Drills without recommendations appear normally below

## DrillSession Changes

- After Gemini analysis completes, append a `SessionRecord` to `profile.sessions` in localStorage
- Extract `phonemeScores` from `feedback.detailed.phonemeAnalysis`
- Add "Back to Dashboard" button/link after viewing feedback
- Send fingerprint (`profile.id`) in `X-Learner-ID` header with API calls

## Rate Limiting

### Client Side
- Generate `crypto.randomUUID()` on first visit, store as `profile.id` in localStorage
- Send as `X-Learner-ID` header on every `/api/analyze` and `/api/assess` call
- Display remaining sessions from `X-RateLimit-Remaining` response header

### Server Side
- In-memory `Map<string, { count: number, resetAt: number }>` keyed by `fingerprint:IP`
- Cap: 30 API calls per identity per day
- Returns `429 Too Many Requests` when exceeded with `Retry-After` header
- In-memory map resets on Vercel cold starts — acceptable for validation phase
- Middleware applied to both `/api/analyze` and `/api/assess`

## Empty States

| State | Dashboard Shows |
|-------|----------------|
| No profile | "Take your accent assessment to get started" + CTA to `/onboarding` |
| Assessment done, no sessions | Phoneme problems from assessment with "Not practiced yet" status, recommended drills active |
| After sessions | Real scores, phoneme progress with trajectories, session history |

## What Changes

| Area | Change |
|------|--------|
| **New: `src/lib/learner-store.ts`** | localStorage read/write helpers for LearnerProfile |
| **New: `src/lib/rate-limit.ts`** | In-memory rate limiter for API routes |
| **Onboarding (AccentAssessment)** | After results, save profile to localStorage, navigate to `/dashboard` |
| **Dashboard page** | Replace mock data imports with localStorage reads |
| **ScoreOverview** | Accept real score from profile, compute from sessions |
| **WeakSpots** | Accept phoneme data derived from assessment + sessions |
| **RecentSessions** | Accept real session records from localStorage |
| **DrillGrid** | Read `recommendedDrills`, badge + sort, "Start here" on first |
| **DrillSession** | After analysis, append SessionRecord. Add "Back to Dashboard" |
| **API routes** | Add rate limiting middleware (fingerprint + IP) |
| **Mock data** | Dashboard stops importing mock user/session/progress data. Drill definitions (categories, prompts) remain — they're content, not user data |

## Out of Scope

- Server-side persistence (database, Redis, KV)
- User authentication
- Cross-device sync
- Analytics/telemetry on the demo loop
- Additional drill content
- Sharing/social features
