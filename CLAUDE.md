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
- next-intl (i18n / translations)

## Internationalization (i18n)

**Locales:** `en` (default), `ru`, `es`, `de`

**How it works:**
- `next-intl` with App Router — all pages live under `src/app/[locale]/`
- Translation files: `messages/en.json`, `messages/ru.json`, `messages/es.json`, `messages/de.json`
- English is the default locale with "as-needed" prefix (no `/en/` in URLs)
- Middleware in `middleware.ts` detects browser language and redirects
- `src/i18n/routing.ts` — locale config
- `src/i18n/navigation.ts` — locale-aware `Link`, `useRouter`, `usePathname`
- `src/i18n/request.ts` — server-side message loading
- `global.d.ts` — TypeScript types derived from `en.json` for type-safe translation keys

**Developer workflow — EVERY new feature must include translations:**

1. **Add English keys first** to `messages/en.json` under the appropriate namespace
2. **Add translations** for `ru.json`, `es.json`, `de.json` with the same keys
3. **Use `useTranslations(namespace)`** in client components or `getTranslations(namespace)` in server components — never hardcode UI strings
4. **Use `Link` from `@/i18n/navigation`** instead of `next/link` for all internal links (so URLs are locale-aware)
5. **TypeScript will catch missing keys** — `en.json` is the source of truth for the `IntlMessages` type

**Quick reference:**
```tsx
// Client component
import { useTranslations } from "next-intl";
const t = useTranslations("myNamespace");
return <h1>{t("title")}</h1>;

// Server component
import { getTranslations } from "next-intl/server";
const t = await getTranslations("myNamespace");

// Links — always use locale-aware Link
import { Link } from "@/i18n/navigation";
<Link href="/dashboard">...</Link>
```

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
