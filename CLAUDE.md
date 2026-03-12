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

## Recording Feature (branch: `recording`)

**Status:** MVP working — audio capture, playback, and Gemini analysis all functional.

**What's done:**
- `src/app/api/analyze/route.ts` — API route that receives audio FormData, sends to Gemini, returns feedback
- `src/components/practice/DrillSession.tsx` — MediaRecorder capture, `<audio>` playback, fetch to `/api/analyze`, display response
- Gemini prompt forces transcription first, compares against expected text, then evaluates pronunciation
- Debug logging in browser console (`[Recording]` prefix) and server terminal

**What's next:**
- Test with correct pronunciation to see quality of phoneme-level feedback
- Experiment with Gemini prompt variations (see design doc)
- Try `gemini-3-flash-preview` again when available (currently 503, using `gemini-2.5-flash`)
- Remove debug logging before merge
- Design structured feedback UI based on what Gemini returns

**Key files:**
- Design: `docs/plans/2026-03-07-recording-design.md`
- Implementation plan: `docs/plans/2026-03-07-recording-implementation.md`

**Environment:**
- `GEMINI_API_KEY` in `.env.local` (AI Studio key)
- Needs to be added to Vercel env vars before deploy

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
