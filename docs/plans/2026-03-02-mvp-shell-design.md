# NativeSpeechAI — MVP Shell Design

## Stack

- Next.js (App Router) + TypeScript
- CSS Modules + CSS custom properties
- Auth.js (NextAuth) — Google + email/password
- pnpm

## Project Structure

```
src/
  app/
    (marketing)/            # Public routes
      page.tsx              # Landing page
      pricing/page.tsx
      about/page.tsx
      sign-in/page.tsx
      sign-up/page.tsx
      layout.tsx            # Nav + footer
    (app)/                  # Authenticated routes
      dashboard/page.tsx
      practice/page.tsx
      practice/[drillId]/page.tsx
      progress/page.tsx
      settings/page.tsx
      layout.tsx            # Sidebar + header + auth guard
    api/
      auth/[...nextauth]/route.ts
    layout.tsx              # Root layout, ThemeProvider
    globals.css
  components/
    ui/                     # Button, Card, Input, Badge, ProgressRing
    marketing/              # Hero, Features, Pricing, Footer, Nav
    dashboard/              # ScoreRing, WeakSpots, RecentSessions
    practice/               # DrillCard, DrillGrid, RecordButton, Prompt
    progress/               # ScoreTrend, PhonemeTable, StreakTracker
  lib/
    auth.ts                 # Auth.js config
    theme.ts                # Typed theme object
    mock-data.ts            # All mock data
  providers/
    ThemeProvider.tsx        # Converts theme → CSS vars on :root
    AuthProvider.tsx         # Auth.js SessionProvider wrapper
  styles/
    globals.css             # Reset + CSS custom properties
```

## Themeable Design System

Theme object in `theme.ts` → `ThemeProvider` sets CSS custom properties on `:root` → all CSS Modules consume `var(--*)`.

### Theme shape

- `colors`: primary, accent, surface, surfaceAlt, text, textMuted, success, error
- `gradients`: primary, accent
- `radii`: sm, md, lg, full
- `spacing`: base 4px scale
- `fonts`: display, body, mono
- `shadows`: subtle, medium

### Default theme: "Resonant Dark"

- Dark surface (acoustic space)
- Deep indigo primary (voice frequency)
- Warm amber accent (achievement)
- Cool white text (clinical precision)
- Thin display typography
- Generous negative space

Swap themes by changing the theme object — zero component changes needed.

## Layouts

### Marketing layout

- Top nav: logo, links (Features, Pricing, About), Sign In / Get Started
- Footer: links, legal
- Full-width, content-centered

### App layout

- Collapsible sidebar: Dashboard, Practice, Progress, Settings
- Top header: pronunciation score badge, user avatar menu
- Auth guard: redirect to sign-in if no session
- Mobile: sidebar → bottom tab bar

## Pages (all mock data)

### Dashboard

- ProgressRing showing pronunciation score
- Recent sessions list
- Weak spots cards (problem phonemes)
- "Start Practice" CTA

### Practice

- Drill category grid (cards with difficulty + time)
- Links to `/practice/[drillId]`

### Practice Session

- Prompt text
- Record button (visual only, no audio)
- Placeholder feedback area
- Next/Previous navigation

### Progress

- Score trend chart (lightweight SVG or chart lib)
- Per-phoneme breakdown table
- Streak tracker

### Settings

- Profile info
- Native language selector
- Target language selector
- Subscription status placeholder

## Auth

- Auth.js with Google + email/password
- `/sign-in` and `/sign-up` in marketing group
- Server-side: `auth()`
- Client-side: `useSession()`
