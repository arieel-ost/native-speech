# Design Board Review: Phoneme Practice Page UX

**Date:** 2026-03-19
**Page:** `/en/practice/phoneme/phoneme-th-voiceless`
**Status:** Review complete — pending implementation decisions

## Board Composition

| Role | Verdict | Focus |
|------|---------|-------|
| UX Design Thinker (Lead) | Concerns | Information architecture, user flow, cognitive load |
| Developer | Concerns | Buildability, effort estimates, implementation feasibility |
| Devil's Advocate | Concerns | Stress-testing assumptions, challenging the approach |
| Tech Architect | Concerns | Component boundaries, state management, patterns |
| Ops/DevOps | Concerns | Performance, audio processing, deployment |
| Accessibility | Concerns | WCAG compliance, screen readers, keyboard nav |
| Business & Product | Concerns | Problem-solution fit, retention, competitive positioning |

**Result:** Unanimous concerns across all 7 reviewers. No hard blockers, but several near-blocker severity P0s. Strong consensus on the top 3 issues.

---

## Blockers (Near-Blocker Severity)

### 1. Four equal action buttons with no guided flow

**Flagged by:** UX (P0), Devil's Advocate (P0), Business (P0)

All three reviewers independently identified this as the #1 problem. Four co-equal buttons (Listen / Record / Listen & Repeat / Shadow) force a decision at the exact moment the user should be acting. First-time ESL learners don't know what "Shadow" means. The page has abdicated its role as a teacher.

**Current state:** Four buttons with equal visual weight. "Listen & Repeat" is orange-filled (visually primary), but the logical first step is "Listen." No sequencing cues.

**Recommendation:** Default to a guided sequence:
1. **Listen** is the primary action on load (large, pulsing)
2. After listening, transition to **"Now try it"** with Record as primary
3. After recording, show feedback inline
4. Offer "Try again" or "Next"
5. Surface Listen & Repeat and Shadow as secondary/advanced options (dropdown or smaller buttons)

The default happy path should be: Listen → Record → See Feedback → Next. Power users access other modes, but the happy path requires zero decisions.

**Developer assessment:** Size S for a pulse hint on Listen (~20 lines). Size M for full guided flow with phase transitions.

### 2. Progress dots: no focus indicator, tiny touch target

**Flagged by:** Accessibility (P0) — WCAG 2.4.7, 2.5.8

Progress dots are 8x8px `<button>` elements with `border: none` and no `:focus-visible` style. Keyboard users can tab to them but can't see them. Touch target is far below the 24px minimum.

**Fix:** Add visible focus ring (`outline: 2px solid var(--color-primary); outline-offset: 2px`) and increase clickable area to 24x24px via padding. Low effort.

**File:** `PhonemeDrillSession.module.css` lines 220-243

### 3. Phase/countdown changes not announced to screen readers

**Flagged by:** Accessibility (P0) — WCAG 4.1.3

Recording states ("Listening...", "Recording...", "3, 2, 1") change dynamically but live in a plain `<div>` with no `aria-live` region. Screen reader users get zero feedback after pressing a button. The countdown is especially critical.

**Fix:** Add `aria-live="assertive"` and `role="status"` to the `.phase` div. One attribute addition.

**File:** `ShadowingPlayer.tsx` line 348

---

## Concerns

### UX & Learning Flow

#### 4. Spectrogram visible before recording creates anxiety

**Flagged by:** UX (P1), Devil's Advocate (P1), Business (P1)

The empty "YOU" spectrogram panel next to the reference frames practice as a test, not exploration. Spectrograms are meaningful to phoneticians, not ESL learners. The average learner cannot interpret a spectrogram comparison to correct their articulation.

**Recommendation:** Hide SpectrogramDiff until first recording completes. Consider making it permanently opt-in ("Show detailed comparison" toggle) and tracking usage to validate whether learners engage with it.

**Developer assessment:** Conditional render + `scrollIntoView` is ~15 lines (Size S). Accept layout shift — it draws attention to new content.

```jsx
{(userBuffer || userStream) && <SpectrogramDiff ... />}
```

Plus a `useEffect` with `spectrogramRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

#### 5. Feedback card below the fold, disconnected from action

**Flagged by:** UX (P1), Developer (P2)

User records → nothing visibly changes in viewport → must scroll to find feedback. Breaks the cause-and-effect loop. The action (pressing Record) happens mid-page, but the result appears below the fold.

**Recommendation:** Move feedback card directly below ShadowingPlayer, above spectrogram.

**Developer assessment:** JSX reorder, zero architectural impact. Move lines 308-346 (feedback Card) plus lines 301-306 (audioUrl playback) to directly after ShadowingPlayer. 15 minutes.

#### 6. Instruction box disconnected from action buttons

**Flagged by:** UX (P1)

"Place your tongue tip gently between your teeth..." is inside the step content card, above the ShadowingPlayer. By the time the user focuses on the Record button, the instruction may be out of view.

**Recommendation:** Either:
- Pin a condensed one-line tip near the action buttons ("Tongue between teeth, blow air softly")
- Add a "Show tip" toggle next to the Record button that reveals the full instruction inline

#### 7. 8-step progression risks retention fatigue

**Flagged by:** Devil's Advocate (P1), Business (P0)

8 steps per phoneme × multiple problem phonemes = dozens of practice units with no visible milestones. Users likely bail after step 3-4 when novelty wears off. The 30 calls/day rate limit makes this worse — a motivated user could burn their daily budget on a single phoneme.

**Recommendation:** Break into 2-3 milestone chunks with score payoff at each boundary:
- Steps 1-3: **"Learn the sound"** → culminates in a score
- Steps 4-6: **"Use it in words"** → score comparison to baseline
- Steps 7-8: **"Master it in speech"** → final assessment

Give visible reward at each milestone. Let users exit after milestone 1 and come back.

### Infrastructure

#### 8. In-memory rate limiter resets on cold start

**Flagged by:** Ops (P0)

Vercel serverless functions spin up/down constantly. The 30-call/day limit is stored in process memory, so it provides zero actual protection. A user can trivially exceed it by waiting for a cold start.

**Recommendation:** Move to Vercel KV or Upstash Redis. The `@upstash/ratelimit` package is purpose-built for this and integrates in ~15 minutes. Free tier covers this use case.

#### 9. Vercel serverless timeout risk

**Flagged by:** Ops (P0)

Audio upload + Gemini round-trip can exceed the 10-second default function timeout. Longer prompts produce larger audio blobs; add network latency and Gemini processing time, and timeouts become reliable failures.

**Fix:** Add `export const maxDuration = 60` to the API route file. One line.

**File:** `src/app/api/analyze-phoneme/route.ts`

#### 10. No observability on the Gemini API path

**Flagged by:** Ops (P1)

No structured logging, no latency tracking, no error categorization on `/api/analyze-phoneme`. When Gemini returns a 429, malformed response, or times out, there's no way to know frequency or impact.

**Recommendation:** Add structured logging: request duration, audio blob size, Gemini response status, rate-limit remaining. Consider Axiom's free-tier Vercel integration for searchable logs.

### Architecture

#### 11. AudioContext leak across components

**Flagged by:** Tech Architect (P2)

ShadowingPlayer, Spectrogram, and `useAudioBufferFromUrl` each create separate AudioContexts. Browsers limit concurrent contexts (6-8 on Chrome). Rapid re-recordings or step navigation can hit the limit, causing silent audio failures.

**Recommendation:** Create a shared singleton in `src/lib/audio-context.ts`:

```ts
let ctx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
```

#### 12. ShadowingPlayer conflates 3 responsibilities

**Flagged by:** Tech Architect (P1)

At 412 lines, it mixes: (1) MediaRecorder lifecycle, (2) reference audio playback + TTS fallback, (3) mode orchestration with countdown. Adding a 5th mode would require another 30-line callback plus more derived booleans.

**Recommendation:** Extract a `useMediaRecording({ echoCancellation, maxDuration })` hook returning `{ start, stop, isRecording }`. Removes ~80 lines and makes recording reusable for future features (free speech, assessment).

### Accessibility (Remaining Items)

| # | Issue | WCAG | Effort | File |
|---|-------|------|--------|------|
| 13 | Speed buttons lack `aria-pressed` | 4.1.2 | Low | ShadowingPlayer.tsx:398-407 |
| 14 | Canvas spectrograms: no `role="img"` or `aria-label` | 1.1.1 | Low | Spectrogram.tsx:217 |
| 15 | Breadcrumb `<nav>` needs `aria-label="Breadcrumb"` | 1.3.1 | Low | PhonemeDrillSession.tsx:221 |
| 16 | Feedback area needs `aria-live="polite"` | 4.1.3 | Low | PhonemeDrillSession.tsx:309 |
| 17 | Emoji button icons need `aria-hidden="true"` | 1.1.1 | Low | ShadowingPlayer.tsx:363-394 |
| 18 | Button active states rely on color alone | 1.4.1 | Medium | ShadowingPlayer.tsx |

### Additional Notes

#### Devil's Advocate: "Is the redesign solving the right problem?"

The brief assumes visual fragmentation is the core issue. But the problem might be cognitive overload (too many decisions), not visual disunity. A unified visual wrapper around the same complexity doesn't reduce decisions. Recommendation: run a 5-user unmoderated test before committing to a full redesign. Record where they hesitate, what they click first, whether they scroll, and where they abandon.

#### Devil's Advocate: "Single page pretending to be a wizard"

Steps 1-8 with progress dots and Previous/Next is wizard UX, but it lives on a scrolling page with all sections visible. This is the worst of both worlds: cognitive overhead of seeing everything (scroll page) plus the artificial constraint of linear progression (wizard). Recommendation: commit to wizard UX — each step gets a focused, single-screen view with no scrolling.

#### Business: "No success metrics defined"

The core product loop has no instrumentation. Before any UX redesign, add event tracking for: mode selected, step reached, session abandoned at step N, spectrogram expanded/collapsed, time per step. Even localStorage-based analytics would validate design decisions.

#### Business: "Empty states are abandonment risks"

"Record to see your spectrogram" is a developer placeholder, not a learning prompt. Every empty state should answer: "What should I do right now, and why will it help me?" Replace with: "Tap record and say the sound. We'll show you how your pronunciation compares to a native speaker."

#### Architect: BCP47_MAP duplicated

Both `PhonemeDrillSession.tsx` and `DrillSession.tsx` define the same `BCP47_MAP`. Move to `src/lib/locale-utils.ts`.

#### Architect: refProgress prop-drilling

`refProgress` is lifted from ShadowingPlayer via callback and passed down through SpectrogramDiff to Spectrogram (3 hops). Consider a shared `useRef` + subscription pattern where ShadowingPlayer writes and SpectrogramDiff reads on rAF — zero re-renders on the orchestrator.

---

## What's Working Well

All reviewers acknowledged these strengths:

- **Articulation diagrams are a genuine differentiator** — unique at consumer scale, correct phoneme-to-image mapping. No mainstream competitor has these. (UX, Devil's Advocate, Business, Accessibility)
- **Shadowing mode is a real competitive advantage** — no mainstream competitor offers real-time shadowing with AI feedback. This is the feature to build marketing around. (Business)
- **Component decomposition is clean** — flat orchestrator with well-typed props, good separation of concerns. Adding features means touching one file at a time. (Developer, Architect)
- **Web Worker for FFT offloading** — correct architectural choice that keeps the main thread responsive. (Architect, Ops)
- **Audio-first architecture** — building on Web Audio API and MediaRecorder rather than trying to assess pronunciation from text shows domain understanding. (Devil's Advocate, Ops)
- **Dark theme suits focused practice** — low-distraction UI appropriate for concentration. (UX)
- **Speed control is genuinely useful** — 0.6x and 0.8x help learners struggling with fast native speech. (UX)
- **Step progression model is pedagogically sound** — isolated → minimal pairs → words → sentences mirrors pronunciation teaching methodology. (UX, Devil's Advocate)
- **CSS Modules with custom properties** — scoped styles with theming via CSS variables. Straightforward to adjust. (Developer)
- **Auto-stop with duration alignment** — user recordings time-aligned with reference audio for spectrogram overlay. Subtle detail done right. (Developer, Architect)
- **Existing accessibility foundations** — progress dots have `aria-label`, SpectrogramDiff toggle uses `aria-pressed`, buttons have visible text labels, ArticulationDiagram has alt text. (Accessibility)

---

## Recommended Implementation Order

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| **1. Quick wins** | #2, #3, #9, #13-17 (a11y fixes + maxDuration) | 1-2 hours | High — WCAG compliance + production stability |
| **2. Core UX** | #1 (guided flow), #5 (feedback placement), #4 (hide spectrogram) | 1 day | High — transforms the learning experience |
| **3. Retention** | #7 (milestone chunks), #6 (instruction proximity) | 1-2 days | High — directly impacts session completion |
| **4. Infrastructure** | #8 (rate limiter), #10 (observability), #11 (AudioContext) | Half day | Medium — production readiness |
| **5. Architecture** | #12 (extract useMediaRecording hook) | Half day | Medium — maintainability for future modes |

---

## Open Questions for Decision

1. **Wizard vs. scroll page?** Devil's Advocate strongly recommends committing to wizard UX (one focused screen per step). This is the highest-effort change but potentially the highest-impact. Needs user testing data to validate.
2. **Spectrogram: hide vs. opt-in vs. always visible?** Three options on the table. Tracking usage after hiding would provide data.
3. **Should we instrument before redesigning?** Business recommends adding analytics first to validate which changes matter. Even localStorage-based event tracking.
4. **Milestone structure for 8 steps?** Business proposes 3-3-2 split. Needs pedagogical validation.
