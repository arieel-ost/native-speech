# Demo User Loop — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the full demo user loop using localStorage: onboarding → dashboard → drills → improvement tracking. No auth, no backend persistence.

**Architecture:** A `learner-store.ts` module provides read/write access to a `LearnerProfile` in localStorage. Onboarding saves the profile, DrillSession appends session records, and all dashboard components read from the store instead of mock data. API routes get in-memory rate limiting keyed by fingerprint + IP.

**Tech Stack:** Next.js 16, React 19, TypeScript, localStorage, existing Gemini API routes

---

## Task 1: Create Learner Store (`src/lib/learner-store.ts`)

**Files:**
- Create: `src/lib/learner-store.ts`

**Step 1: Create the learner store module**

This is a client-side module. All functions read/write `localStorage` under the key `"native-speech-profile"`.

```typescript
// src/lib/learner-store.ts

const STORAGE_KEY = "native-speech-profile";

export interface PhonemeScore {
  phoneme: string;
  rating: "good" | "acceptable" | "needs_work";
  word: string;
}

export interface SessionRecord {
  id: string;
  timestamp: string;
  drillCategoryId: string;
  drillItemId: string;
  overallScore: number;
  phonemeScores: PhonemeScore[];
}

export interface AssessmentData {
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

export interface LearnerProfile {
  id: string;
  createdAt: string;
  language: "english" | "german";
  assessment: AssessmentData;
  sessions: SessionRecord[];
}

export function getProfile(): LearnerProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LearnerProfile;
  } catch {
    return null;
  }
}

export function getLearnerId(): string {
  const profile = getProfile();
  if (profile) return profile.id;
  // Return or create a fingerprint even before assessment
  const existing = typeof window !== "undefined"
    ? localStorage.getItem("native-speech-learner-id")
    : null;
  if (existing) return existing;
  const id = crypto.randomUUID();
  if (typeof window !== "undefined") {
    localStorage.setItem("native-speech-learner-id", id);
  }
  return id;
}

export function saveProfile(
  language: "english" | "german",
  assessment: AssessmentData,
): LearnerProfile {
  const id = getLearnerId();
  const profile: LearnerProfile = {
    id,
    createdAt: new Date().toISOString(),
    language,
    assessment,
    sessions: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function addSession(session: Omit<SessionRecord, "id" | "timestamp">): SessionRecord {
  const profile = getProfile();
  if (!profile) throw new Error("No learner profile found");
  const record: SessionRecord = {
    ...session,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  profile.sessions.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return record;
}

export function clearProfile(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("native-speech-learner-id");
  }
}

export type PhonemeStatus = "not_started" | "struggled" | "improving" | "strong";

export interface PhonemeProgress {
  phoneme: string;
  description: string;
  exampleWord: string;
  severity: string;
  status: PhonemeStatus;
  practiceCount: number;
  latestRating: "good" | "acceptable" | "needs_work" | null;
}

export function getPhonemeProgress(profile: LearnerProfile): PhonemeProgress[] {
  return profile.assessment.topProblems.map((problem) => {
    // Find all session scores for this phoneme
    const allScores = profile.sessions.flatMap((s) =>
      s.phonemeScores.filter((ps) => ps.phoneme === problem.sound)
    );

    const practiceCount = allScores.length;

    if (practiceCount === 0) {
      return {
        phoneme: problem.sound,
        description: problem.description,
        exampleWord: problem.exampleWord,
        severity: problem.severity,
        status: "not_started" as const,
        practiceCount: 0,
        latestRating: null,
      };
    }

    const latestRating = allScores[allScores.length - 1].rating;
    const goodCount = allScores.filter((s) => s.rating === "good").length;
    const goodRatio = goodCount / practiceCount;

    let status: PhonemeStatus;
    if (goodRatio >= 0.7) {
      status = "strong";
    } else if (goodRatio >= 0.4 || latestRating === "good") {
      status = "improving";
    } else {
      status = "struggled";
    }

    return {
      phoneme: problem.sound,
      description: problem.description,
      exampleWord: problem.exampleWord,
      severity: problem.severity,
      status,
      practiceCount,
      latestRating,
    };
  });
}

export function getCurrentScore(profile: LearnerProfile): number {
  if (profile.sessions.length === 0) return profile.assessment.overallScore;
  // Weighted: 30% assessment, 70% average of last 5 session scores
  const recentSessions = profile.sessions.slice(-5);
  const avgRecent =
    recentSessions.reduce((sum, s) => sum + s.overallScore, 0) / recentSessions.length;
  return Math.round(profile.assessment.overallScore * 0.3 + avgRecent * 0.7);
}
```

**Step 2: Commit**

```bash
git add src/lib/learner-store.ts
git commit -m "feat: add localStorage learner store with profile, sessions, and phoneme progress"
```

---

## Task 2: Create Rate Limiter (`src/lib/rate-limit.ts`)

**Files:**
- Create: `src/lib/rate-limit.ts`

**Step 1: Create the rate limiter**

```typescript
// src/lib/rate-limit.ts

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const DAILY_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
}

export function checkRateLimit(fingerprint: string, ip: string): RateLimitResult {
  const key = `${fingerprint}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + DAY_MS });
    return { allowed: true, remaining: DAILY_LIMIT - 1, retryAfterSeconds: null };
  }

  if (entry.count >= DAILY_LIMIT) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, remaining: DAILY_LIMIT - entry.count, retryAfterSeconds: null };
}
```

**Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add in-memory rate limiter keyed by fingerprint + IP"
```

---

## Task 3: Add Rate Limiting to API Routes

**Files:**
- Modify: `src/app/api/analyze/route.ts` (add rate limit check at top of POST)
- Modify: `src/app/api/assess/route.ts` (add rate limit check at top of POST)

**Step 1: Add rate limiting to `/api/analyze`**

At the top of the `POST` function in `src/app/api/analyze/route.ts`, after parsing formData, add:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";

// Inside POST, after the existing formData parsing:
const fingerprint = request.headers.get("x-learner-id") ?? "anonymous";
const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? request.headers.get("x-real-ip")
  ?? "unknown";

const rateLimit = checkRateLimit(fingerprint, ip);
if (!rateLimit.allowed) {
  return NextResponse.json(
    { error: "Daily limit reached. Try again tomorrow." },
    {
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
// Add remaining header to the successful response too (at the end):
// return NextResponse.json({ feedback: analysis }, {
//   headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) },
// });
```

Add the same rate limit import and check block to the top of `POST` in `src/app/api/assess/route.ts`, using the same pattern.

Also update both routes' success responses to include the `X-RateLimit-Remaining` header.

**Step 2: Verify the app still builds**

Run: `bun run build`
Expected: Build succeeds with no type errors.

**Step 3: Commit**

```bash
git add src/app/api/analyze/route.ts src/app/api/assess/route.ts
git commit -m "feat: add rate limiting to analyze and assess API routes"
```

---

## Task 4: Wire Onboarding to Learner Store

**Files:**
- Modify: `src/components/onboarding/AccentAssessment.tsx`

**Step 1: Save profile after assessment and navigate to dashboard**

In `AccentAssessment.tsx`:

1. Add import at top:
```typescript
import { saveProfile, getLearnerId } from "@/lib/learner-store";
```

2. In `submitRecording`, after `setAssessment(data.assessment as Assessment)`, add:
```typescript
saveProfile(language!, data.assessment);
```

3. Add `X-Learner-ID` header to the fetch call. Change:
```typescript
const res = await fetch("/api/assess", {
  method: "POST",
  body: formData,
});
```
to:
```typescript
const res = await fetch("/api/assess", {
  method: "POST",
  body: formData,
  headers: { "X-Learner-ID": getLearnerId() },
});
```

4. Change the "Start Practicing" button's `onClick` from `router.push("/practice")` to `router.push("/dashboard")`:
```typescript
<Button onClick={() => router.push("/dashboard")}>
  {t("startPracticing")}
</Button>
```

**Step 2: Verify manually**

Run: `bun dev`
- Go to `/onboarding`, complete the flow
- After results, click "Start Practicing" — should go to `/dashboard`
- Open browser devtools → Application → Local Storage → check `native-speech-profile` key exists with assessment data

**Step 3: Commit**

```bash
git add src/components/onboarding/AccentAssessment.tsx
git commit -m "feat: save assessment to localStorage and navigate to dashboard after onboarding"
```

---

## Task 5: Make Dashboard Read from Learner Store

**Files:**
- Modify: `src/app/[locale]/(app)/dashboard/page.tsx` — convert to client component, add empty state
- Modify: `src/components/dashboard/ScoreOverview.tsx` — accept props instead of mock data
- Modify: `src/components/dashboard/WeakSpots.tsx` — accept props, show phoneme progress
- Modify: `src/components/dashboard/RecentSessions.tsx` — accept props instead of mock data

### Step 1: Update `ScoreOverview` to accept props

Replace the mock data import with props:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { ProgressRing } from "@/components/ui";
import styles from "./ScoreOverview.module.css";

interface ScoreOverviewProps {
  score: number;
  sessionCount: number;
  streak: number;
}

export function ScoreOverview({ score, sessionCount, streak }: ScoreOverviewProps) {
  const t = useTranslations("ScoreOverview");

  return (
    <div className={styles.overview}>
      <ProgressRing value={score} size={160} label="overall" />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>{t("dayStreak")}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statLabel}>{t("sessions")}</span>
        </div>
      </div>
    </div>
  );
}
```

Note: Remove the hardcoded "6h" / "Total Practice" stat — we don't track duration. Two stats (streak + sessions) is cleaner.

### Step 2: Update `WeakSpots` to accept phoneme progress props

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import type { PhonemeProgress } from "@/lib/learner-store";
import styles from "./WeakSpots.module.css";

const statusVariants = {
  not_started: "default",
  struggled: "error",
  improving: "accent",
  strong: "success",
} as const;

interface WeakSpotsProps {
  phonemes: PhonemeProgress[];
}

export function WeakSpots({ phonemes }: WeakSpotsProps) {
  const t = useTranslations("WeakSpots");

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <div className={styles.grid}>
        {phonemes.map((p) => (
          <Card key={p.phoneme} variant="outlined">
            <div className={styles.spot}>
              <span className={styles.phoneme}>{p.phoneme}</span>
              <span className={styles.example}>{p.exampleWord}</span>
              <div className={styles.meta}>
                <Badge variant={statusVariants[p.status]}>
                  {t(p.status)}
                </Badge>
                {p.practiceCount > 0 && (
                  <span className={styles.accuracy}>
                    {t("practiced", { count: p.practiceCount })}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Update `RecentSessions` to accept props

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import type { SessionRecord } from "@/lib/learner-store";
import { mockDrillCategories } from "@/lib/mock-data";
import styles from "./RecentSessions.module.css";

interface RecentSessionsProps {
  sessions: SessionRecord[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const t = useTranslations("RecentSessions");

  // Show most recent first, limit to 10
  const recent = [...sessions].reverse().slice(0, 10);

  if (recent.length === 0) {
    return (
      <div>
        <h3 className={styles.heading}>{t("title")}</h3>
        <Card variant="outlined">
          <p className={styles.empty}>{t("noSessions")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <div className={styles.list}>
        {recent.map((session) => {
          const category = mockDrillCategories.find((c) => c.id === session.drillCategoryId);
          const date = new Date(session.timestamp).toLocaleDateString();
          return (
            <Card key={session.id} variant="outlined">
              <div className={styles.session}>
                <div>
                  <span className={styles.name}>{category?.name ?? session.drillCategoryId}</span>
                  <span className={styles.date}>{date}</span>
                </div>
                <Badge variant={session.overallScore >= 7 ? "success" : "default"}>
                  {session.overallScore}/10
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 4: Rewrite dashboard page with localStorage and empty states

```typescript
// src/app/[locale]/(app)/dashboard/page.tsx
"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import { getProfile, getPhonemeProgress, getCurrentScore } from "@/lib/learner-store";
import styles from "./page.module.css";

function calculateStreak(sessions: { timestamp: string }[]): number {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(
    sessions.map((s) => new Date(s.timestamp).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toDateString()) {
      streak++;
    } else if (i === 0) {
      // Allow streak to start from yesterday
      expected.setDate(expected.getDate() - 1);
      if (dates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const profile = getProfile();

  // Empty state: no profile yet
  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>{t("noProfileTitle")}</h2>
          <p>{t("noProfileDescription")}</p>
          <Link href="/onboarding">
            <Button size="lg">{t("takeAssessment")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const score = getCurrentScore(profile);
  const phonemes = getPhonemeProgress(profile);
  const streak = calculateStreak(profile.sessions);

  return (
    <div className={styles.page}>
      <ScoreOverview
        score={score}
        sessionCount={profile.sessions.length}
        streak={streak}
      />
      <Link href="/practice">
        <Button size="lg">{t("startPractice")}</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots phonemes={phonemes} />
        <RecentSessions sessions={profile.sessions} />
      </div>
    </div>
  );
}
```

### Step 5: Add new i18n keys

Add these keys to all four locale files (`src/messages/en.json`, `ru.json`, `es.json`, `fr.json`):

In `"Dashboard"`:
```json
"noProfileTitle": "Welcome to NativeSpeech",
"noProfileDescription": "Take a quick accent assessment to get personalized practice recommendations.",
"takeAssessment": "Take Your Assessment"
```

In `"WeakSpots"`:
```json
"not_started": "not started",
"struggled": "struggling",
"improving": "improving",
"strong": "strong",
"practiced": "{count}x practiced"
```

In `"RecentSessions"`:
```json
"noSessions": "Complete a practice drill to see your history here."
```

Translate these for ru, es, fr locales.

### Step 6: Verify manually

Run: `bun dev`
1. Clear localStorage, go to `/dashboard` — should see empty state with "Take Your Assessment" CTA
2. Complete onboarding — should arrive at dashboard with real score + phoneme problems + empty session list
3. Check that phoneme statuses all say "not started"

### Step 7: Commit

```bash
git add src/app/[locale]/(app)/dashboard/page.tsx src/components/dashboard/ScoreOverview.tsx src/components/dashboard/WeakSpots.tsx src/components/dashboard/RecentSessions.tsx src/messages/
git commit -m "feat: wire dashboard to localStorage profile with empty states and real data"
```

---

## Task 6: Add Drill Recommendations to DrillGrid

**Files:**
- Modify: `src/components/practice/DrillGrid.tsx`
- Modify: `src/components/practice/DrillGrid.module.css` (add recommended/start-here styles)

### Step 1: Update DrillGrid to read recommendations and sort/badge

```typescript
// src/components/practice/DrillGrid.tsx
"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import { mockDrillCategories, type Language } from "@/lib/mock-data";
import { getProfile } from "@/lib/learner-store";
import styles from "./DrillGrid.module.css";

const difficultyVariants = { beginner: "success", intermediate: "accent", advanced: "error" } as const;

export function DrillGrid() {
  const t = useTranslations("DrillGrid");
  const tDrills = useTranslations("Drills");
  const profile = getProfile();
  const recommended = profile?.assessment.recommendedDrills ?? [];
  const targetLanguage = profile?.language;

  // Filter to target language if profile exists, otherwise show all
  const drills = targetLanguage
    ? mockDrillCategories.filter((d) => d.language === targetLanguage)
    : mockDrillCategories;

  const languages = [...new Set(drills.map((d) => d.language))] as Language[];

  // Find first unpracticed recommended drill for "Start here" badge
  const practicedCategories = new Set(profile?.sessions.map((s) => s.drillCategoryId) ?? []);
  const startHereDrill = recommended.find((id) => !practicedCategories.has(id));

  return (
    <div className={styles.sections}>
      {languages.map((lang) => {
        const langDrills = drills.filter((d) => d.language === lang);
        // Sort: recommended first (in recommendation order), then the rest
        const sorted = [...langDrills].sort((a, b) => {
          const aIdx = recommended.indexOf(a.id);
          const bIdx = recommended.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });

        return (
          <section key={lang} className={styles.section}>
            <h2 className={styles.langHeading}>{t(lang)}</h2>
            <div className={styles.grid}>
              {sorted.map((drill) => {
                const isRecommended = recommended.includes(drill.id);
                const isStartHere = drill.id === startHereDrill;
                return (
                  <Link key={drill.id} href={`/practice/${drill.id}`}>
                    <Card
                      variant="outlined"
                      className={`${styles.card} ${isStartHere ? styles.startHere : isRecommended ? styles.recommended : ""}`}
                    >
                      <div className={styles.drill}>
                        {isStartHere && (
                          <Badge variant="accent">{t("startHere")}</Badge>
                        )}
                        {isRecommended && !isStartHere && (
                          <Badge variant="default">{t("recommended")}</Badge>
                        )}
                        <span className={styles.icon}>{drill.icon}</span>
                        <h3 className={styles.name}>{tDrills(`${drill.id}.name`)}</h3>
                        <p className={styles.desc}>{tDrills(`${drill.id}.description`)}</p>
                        <div className={styles.meta}>
                          <Badge variant={difficultyVariants[drill.difficulty]}>{drill.difficulty}</Badge>
                          <span className={styles.time}>{t("min", { count: drill.estimatedMinutes })}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

### Step 2: Add CSS for recommended/startHere states

Add to `DrillGrid.module.css`:

```css
.recommended {
  border-color: var(--color-primary);
  border-width: 2px;
}

.startHere {
  border-color: var(--color-accent);
  border-width: 2px;
  box-shadow: 0 0 12px rgba(var(--color-accent-rgb, 245, 158, 11), 0.2);
}
```

### Step 3: Add i18n keys

In `"DrillGrid"` namespace in all four locale files:

```json
"startHere": "Start here",
"recommended": "Recommended"
```

Translate for ru, es, fr.

### Step 4: Verify

1. With a profile in localStorage (from onboarding), go to `/practice`
2. Recommended drills should appear first with badges
3. First unpracticed recommended drill should have "Start here" badge
4. Without a profile (clear localStorage), all drills show without badges

### Step 5: Commit

```bash
git add src/components/practice/DrillGrid.tsx src/components/practice/DrillGrid.module.css src/messages/
git commit -m "feat: sort and badge recommended drills in DrillGrid from learner profile"
```

---

## Task 7: Save Session Results in DrillSession

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`

### Step 1: Save session after analysis and add dashboard link

In `DrillSession.tsx`:

1. Add imports:
```typescript
import { Link } from "@/i18n/navigation";
import { addSession, getProfile, getLearnerId } from "@/lib/learner-store";
```

2. In the `analyze` function, after `setFeedback(data.feedback as CombinedFeedback)`, add session saving:
```typescript
// Save session to localStorage
try {
  const profile = getProfile();
  if (profile) {
    const detailed = data.feedback.detailed as {
      phonemeAnalysis?: { phoneme: string; rating: string; word: string }[];
      overallScore?: number;
    };
    addSession({
      drillCategoryId: drill.categoryId,
      drillItemId: drill.id,
      overallScore: (data.feedback.simple as { score?: number })?.score ?? detailed?.overallScore ?? 5,
      phonemeScores: (detailed?.phonemeAnalysis ?? []).map((pa) => ({
        phoneme: pa.phoneme,
        rating: pa.rating as "good" | "acceptable" | "needs_work",
        word: pa.word,
      })),
    });
  }
} catch (err) {
  console.error("[Recording] Failed to save session:", err);
}
```

3. Add `X-Learner-ID` header to the analyze fetch call:
```typescript
const res = await fetch("/api/analyze", {
  method: "POST",
  body: formData,
  signal: controller.signal,
  headers: { "X-Learner-ID": getLearnerId() },
});
```

4. After the nav buttons (prev/next), add a "Back to Dashboard" link:
```typescript
<Link href="/dashboard" className={styles.backLink}>
  {t("backToDashboard")}
</Link>
```

### Step 2: Add i18n key

In `"DrillSession"` namespace in all four locale files:

```json
"backToDashboard": "Back to Dashboard"
```

### Step 3: Add CSS for backLink

Add to `DrillSession.module.css`:

```css
.backLink {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: var(--space-2);
}

.backLink:hover {
  color: var(--text-primary);
}
```

### Step 4: Verify the full loop

Run: `bun dev`
1. Complete onboarding → lands on dashboard
2. Go to practice → see recommended drills with badges
3. Do a drill → complete recording + analysis
4. Click "Back to Dashboard"
5. Dashboard should now show 1 session in Recent Sessions
6. Phoneme progress should update from "not started" to "struggled" or "improving"
7. Score should reflect the new session

### Step 5: Commit

```bash
git add src/components/practice/DrillSession.tsx src/components/practice/DrillSession.module.css src/messages/
git commit -m "feat: save drill session results to localStorage and add dashboard link"
```

---

## Task 8: Send Learner ID Header from Onboarding Assess Call

**Files:**
- Verify: `src/components/onboarding/AccentAssessment.tsx` (already done in Task 4)

This was handled in Task 4. Verify the `X-Learner-ID` header is being sent on the `/api/assess` fetch call. If not, add it.

---

## Task 9: Build Verification and Cleanup

**Files:**
- Modify: `src/lib/mock-data.ts` (keep drill content, ensure mock user data exports are still available for any other consumers)

### Step 1: Full build check

Run: `bun run build`
Expected: Clean build, no type errors, no unused import warnings.

### Step 2: Check for remaining mock data imports in dashboard

Run: `grep -r "mockUser\|mockWeakSpots\|mockRecentSessions\|mockPhonemeProgress\|mockWeeklyScores" src/components/dashboard/ src/app/*/\(app\)/dashboard/`

Expected: No results — dashboard components should no longer import mock user/session data.

### Step 3: Manual end-to-end test

1. Clear localStorage
2. Go to `/dashboard` → see empty state → click "Take Your Assessment"
3. Complete onboarding → arrive at dashboard with real assessment data
4. Go to `/practice` → see recommended drills sorted to top with badges
5. Complete a drill → see feedback → click "Back to Dashboard"
6. Dashboard shows updated score, phoneme progress, and session history
7. Refresh the page → data persists (localStorage)
8. Complete 2-3 more drills → check phoneme progress transitions
9. Check rate limit: `X-RateLimit-Remaining` header in devtools Network tab

### Step 4: Final commit if any cleanup was needed

```bash
git add -A
git commit -m "chore: demo loop build verification and cleanup"
```

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/lib/learner-store.ts` | **Create** — localStorage CRUD + phoneme progress derivation |
| `src/lib/rate-limit.ts` | **Create** — in-memory rate limiter |
| `src/app/api/analyze/route.ts` | **Modify** — add rate limiting |
| `src/app/api/assess/route.ts` | **Modify** — add rate limiting |
| `src/components/onboarding/AccentAssessment.tsx` | **Modify** — save profile, send fingerprint, navigate to dashboard |
| `src/app/[locale]/(app)/dashboard/page.tsx` | **Modify** — client component, read localStorage, empty states |
| `src/components/dashboard/ScoreOverview.tsx` | **Modify** — props instead of mock data |
| `src/components/dashboard/WeakSpots.tsx` | **Modify** — props with phoneme progress |
| `src/components/dashboard/RecentSessions.tsx` | **Modify** — props with real session records |
| `src/components/practice/DrillGrid.tsx` | **Modify** — sort/badge recommended drills |
| `src/components/practice/DrillGrid.module.css` | **Modify** — recommended/startHere styles |
| `src/components/practice/DrillSession.tsx` | **Modify** — save session, send fingerprint, dashboard link |
| `src/components/practice/DrillSession.module.css` | **Modify** — backLink style |
| `src/messages/*.json` (x4) | **Modify** — new i18n keys for empty states, phoneme statuses, badges |
