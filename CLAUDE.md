# Native Speech

## Package Manager

- **bun** — use `bun` for all installs, scripts, and dependency management
- Run scripts: `bun dev`, `bun build`, `bun start`
- Install deps: `bun add <pkg>`, `bun add -d <pkg>`
- Lockfile: `bun.lock` (never commit a pnpm or npm lockfile)

## Stack

- Next.js 16
- React 19
- TypeScript
- next-auth v5 (beta)
- @google/genai (Gemini SDK)

## Architecture

### Demo User Loop (branch: `feature/demo-loop`)

Full user loop without auth — all state in localStorage:

```
Onboarding → Dashboard → Recommended Drills → Practice → Measure Improvement → Repeat
```

**Key modules:**
- `src/lib/learner-store.ts` — localStorage CRUD for LearnerProfile, SessionRecord, phoneme progress derivation
- `src/lib/rate-limit.ts` — in-memory rate limiter (fingerprint + IP, 30 calls/day)
- `src/lib/speech-tracking.ts` — known-text transcript normalization and active-word matching
- `src/app/api/analyze/route.ts` — practice drill analysis (Gemini 2.5 Flash, structured JSON schema)
- `src/app/api/assess/route.ts` — onboarding accent assessment (Gemini 2.5 Flash)
- `src/hooks/useSpeechTracking.ts` — browser `SpeechRecognition` wrapper for neutral live word tracking
- `src/components/practice/WordHighlight.tsx` — prompt rendering for live tracking and post-analysis per-word scoring

**Data flow:**
- Onboarding saves `LearnerProfile` to localStorage (assessment scores, recommended drills, accent data)
- DrillSession appends `SessionRecord` after each Gemini analysis
- Dashboard derives all views from localStorage: score (weighted avg), phoneme progress, session history
- DrillGrid reads `recommendedDrills` to sort/badge drills

### API Routes

Both routes receive audio FormData, send to Gemini, return structured JSON:
- `/api/analyze` — practice feedback (simple + detailed + textMatch + wordScores views)
- `/api/assess` — onboarding learner profile (accent, problems, strengths, recommendations)
- Both rate-limited: `X-Learner-ID` header + IP, 30 calls/day, returns `X-RateLimit-Remaining`

### Environment

- `GEMINI_API_KEY` in `.env.local` (Google AI Studio key)
- Needs to be added to Vercel env vars before deploy

## Patterns & Gotchas

- **localStorage + SSR hydration:** Always defer localStorage reads to `useEffect` with `useState`. Direct reads in render cause hydration mismatches. See dashboard `page.tsx` and `DrillGrid.tsx` for pattern.
- **Client components:** Any component reading localStorage must be `"use client"`
- **Mock data:** `src/lib/mock-data.ts` contains drill content (categories, prompts, passages) — this is NOT mock user data, it's real content. Mock user/session data (`mockUser`, `mockRecentSessions`, etc.) should NOT be imported in production components.
- **Gemini models:** `/api/analyze` uses `gemini-3-flash-preview` (full schema, no thinking). `/api/analyze-phoneme` uses `gemini-3.1-flash-lite-preview` (light schema, thinking_budget=4096). `/api/assess` still uses `gemini-2.5-flash`. See `docs/research/2026-04-26-speed-vs-accuracy.md` for benchmark data.
- **Known-text word tracking:** Browser `SpeechRecognition` is best-effort only. It drives neutral prompt progress during recording, not pronunciation scoring.
- **Browser support:** Live word tracking depends on `SpeechRecognition` / `webkitSpeechRecognition`. If unsupported, recording and Gemini analysis still work.
- **Scope boundary:** Current word-highlighting feature is for known-text drills only. Free speech and Azure Pronunciation Assessment are deferred.
- **Debug logging:** `[Recording]` prefix console logs still present in DrillSession.tsx and API routes — remove before production deploy.

## IPA Articulation Diagrams

- Static images in `public/images/ipa-diagrams/` — vocal tract cross-sections for all English (and some German) phonemes
- `ArticulationDiagram.tsx` maps `PhonemeDrill.phoneme` → image filename via `PHONEME_TO_IMAGE`
- Full phoneme-to-file mapping reference: `public/images/ipa-diagrams/README.md`
- Consonants sharing the same place of articulation share a diagram (e.g., θ and ð both use `dental-th-dh.png`)
- To add a new phoneme drill's diagram: add an entry to `PHONEME_TO_IMAGE` in `ArticulationDiagram.tsx`

## i18n — Translation Workflow

- **Translations are always the LAST step** of any feature implementation
- Build features with hardcoded English or translation keys first
- Once working and reviewed, extract strings to `src/messages/` as the final task
- Always update ALL locale files (en, ru, es, fr) when adding keys
- Use AI-generated translations for non-English locales
- `en.json` is the source of truth — other locales mirror its key structure
- Use `next-intl` `useTranslations('Namespace')` hook — one namespace per component
- Use `Link`, `usePathname`, `useRouter` from `@/i18n/navigation` instead of `next/link` or `next/navigation`
- Locale switcher is in Nav (marketing) and Header (app)
- Never hardcode user-facing strings in components — always use translation keys
- Fallback: English in production, key name in development
