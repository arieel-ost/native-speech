# Multilanguage UI (i18n) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full i18n to Native Speech with `next-intl` supporting en/ru/es/fr, prefix-based routing, browser auto-detect, locale picker, and CI enforcement.

**Architecture:** All routes move under `src/app/[locale]/`. `next-intl` middleware (proxy.ts) handles locale detection and redirect. Translation JSON files in `src/messages/` namespaced by component. Gemini feedback localized via prompt-level instruction.

**Tech Stack:** next-intl, Next.js 16 App Router, TypeScript, bun

**Design doc:** `docs/plans/2026-03-12-i18n-design.md`

---

### Task 1: Install next-intl and configure Next.js

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Step 1: Install next-intl**

Run:
```bash
bun add next-intl
```
Expected: `next-intl` added to dependencies in `package.json`

**Step 2: Update next.config.ts to register next-intl plugin**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
```

**Step 3: Commit**

```bash
git add package.json bun.lock next.config.ts
git commit -m "feat(i18n): install next-intl and configure plugin"
```

---

### Task 2: Create i18n infrastructure files

**Files:**
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/navigation.ts`
- Create: `src/i18n/request.ts`
- Create: `src/proxy.ts`

**Step 1: Create `src/i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "es", "fr"],
  defaultLocale: "en",
});
```

**Step 2: Create `src/i18n/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

**Step 3: Create `src/i18n/request.ts`**

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Step 4: Create `src/proxy.ts`**

Next.js 16 uses `proxy.ts` instead of `middleware.ts` for the middleware entry point.

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
```

**Step 5: Commit**

```bash
git add src/i18n/ src/proxy.ts
git commit -m "feat(i18n): add routing, navigation, request config, and proxy"
```

---

### Task 3: Create English translation file (source of truth)

**Files:**
- Create: `src/messages/en.json`

**Step 1: Create `src/messages/en.json`**

Extract ALL hardcoded strings from every component. Namespace by component name.

```json
{
  "Metadata": {
    "title": "NativeSpeechAI — Your AI-Powered Accent Coach",
    "description": "AI-powered pronunciation coaching that diagnoses why you mispronounce sounds and creates personalized drills to perfect your accent."
  },
  "Nav": {
    "features": "Features",
    "pricing": "Pricing",
    "about": "About",
    "tryDemo": "Try Demo",
    "signIn": "Sign In",
    "getStarted": "Get Started",
    "toggleMenu": "Toggle menu"
  },
  "Hero": {
    "headline": "Your accent has a pattern.",
    "accent": "We decode it.",
    "subtitle": "AI-powered coaching that diagnoses exactly why you mispronounce sounds based on your native language — then builds personalized drills to fix them.",
    "cta": "Start Free Assessment",
    "howItWorks": "See How It Works",
    "demoLabel": "Try it now — no account needed",
    "freeAssessment": "Free Accent Assessment",
    "browseAll": "Browse all drills"
  },
  "Features": {
    "heading": "How It Works",
    "subheading": "Expert-level accent coaching, available to everyone.",
    "l1l2Title": "L1-L2 Diagnosis",
    "l1l2Desc": "We analyze why you mispronounce sounds based on your native language patterns — not just what you got wrong.",
    "drillsTitle": "Personalized Drills",
    "drillsDesc": "Every exercise targets your specific weak spots with sentences designed to challenge exactly the sounds you struggle with.",
    "trackingTitle": "Real Score Tracking",
    "trackingDesc": "Watch your pronunciation score improve over time with detailed per-phoneme analytics, not vague percentage grades.",
    "multiLangTitle": "Multi-Language",
    "multiLangDesc": "Starting with English and German, expanding to cover the most demanded language pairs worldwide."
  },
  "Footer": {
    "tagline": "Your AI-Powered Accent Coach",
    "product": "Product",
    "company": "Company",
    "legal": "Legal",
    "privacy": "Privacy",
    "terms": "Terms",
    "copyright": "© 2026 NativeSpeechAI. All rights reserved."
  },
  "PricingPreview": {
    "heading": "Simple pricing, powerful results",
    "subheading": "Start free. Upgrade when you're ready for advanced features."
  },
  "Pricing": {
    "title": "Pricing",
    "subtitle": "Start free. Upgrade when you need more.",
    "free": "Free",
    "freePrice": "$0",
    "freeFeature1": "Basic accent assessment",
    "freeFeature2": "3 practice drills per day",
    "freeFeature3": "1 language pair",
    "freeFeature4": "Basic progress overview",
    "freeBtn": "Get Started",
    "premium": "Premium",
    "premiumPrice": "$14.99",
    "premiumPeriod": "/mo",
    "premiumFeature1": "Full AI diagnosis with L1-L2 analysis",
    "premiumFeature2": "Unlimited personalized drills",
    "premiumFeature3": "All language pairs",
    "premiumFeature4": "Detailed progress tracking",
    "premiumFeature5": "Per-phoneme analytics",
    "premiumFeature6": "Priority support",
    "premiumBtn": "Start Free Trial",
    "enterprise": "Enterprise",
    "enterprisePrice": "Custom",
    "enterpriseFeature1": "Everything in Premium",
    "enterpriseFeature2": "Team management dashboard",
    "enterpriseFeature3": "Custom onboarding programs",
    "enterpriseFeature4": "API access",
    "enterpriseFeature5": "Dedicated account manager",
    "enterpriseBtn": "Contact Sales"
  },
  "About": {
    "title": "About NativeSpeechAI",
    "problemTitle": "The Problem",
    "problemText": "Pronunciation coaching is limited to expensive 1-on-1 sessions or generic apps that miss phonetic nuances. Learners receive vague feedback that fails to diagnose accents, regional dialects, or unclear articulation.",
    "approachTitle": "Our Approach",
    "approachText": "We built the first app that diagnoses why you mispronounce sounds based on your native language patterns. Not just what you got wrong — but why, and how to fix it with personalized drills that target your specific weak spots.",
    "founderTitle": "The Founder",
    "founderName": "Arielle Ostankova",
    "founderRole": "Founder & CEO",
    "founderBio": "18 years of software engineering. M.Sc. Informatics. Bachelor in Acting with formal voice training. Multilingual native speaker who has lived the pronunciation challenge firsthand — from Crimea to Germany to building a career in English."
  },
  "SignIn": {
    "title": "Welcome back",
    "email": "Email",
    "emailPlaceholder": "you@example.com",
    "password": "Password",
    "passwordPlaceholder": "••••••••",
    "submit": "Sign In",
    "or": "or",
    "google": "Continue with Google",
    "demo": "Continue as Demo User",
    "noAccount": "Don't have an account?",
    "signUpLink": "Sign up"
  },
  "SignUp": {
    "title": "Start your journey",
    "subtitle": "Free accent assessment — no credit card required.",
    "name": "Name",
    "namePlaceholder": "Your name",
    "email": "Email",
    "emailPlaceholder": "you@example.com",
    "password": "Password",
    "passwordPlaceholder": "••••••••",
    "submit": "Create Account",
    "or": "or",
    "google": "Continue with Google",
    "hasAccount": "Already have an account?",
    "signInLink": "Sign in"
  },
  "Sidebar": {
    "dashboard": "Dashboard",
    "practice": "Practice",
    "progress": "Progress",
    "settings": "Settings"
  },
  "Header": {
    "greeting": "Hi, {name}",
    "guest": "Guest",
    "score": "Score: {value}",
    "streak": "{count} day streak",
    "signOut": "Sign Out",
    "signIn": "Sign In"
  },
  "Dashboard": {
    "startPractice": "Start Practice"
  },
  "ScoreOverview": {
    "title": "Your Score",
    "outOf": "/ 100"
  },
  "RecentSessions": {
    "title": "Recent Sessions",
    "score": "Score: {value}",
    "duration": "{minutes} min"
  },
  "WeakSpots": {
    "title": "Weak Spots",
    "accuracy": "{value}% accuracy",
    "improving": "improving",
    "declining": "declining",
    "stable": "stable"
  },
  "Practice": {
    "title": "Practice",
    "subtitle": "Choose a drill to start practicing.",
    "noDrills": "No drills available for this category."
  },
  "DrillGrid": {
    "difficulty": "{level}",
    "minutes": "{count} min"
  },
  "DrillSession": {
    "readAloud": "Read this aloud:",
    "record": "Record",
    "stop": "Stop",
    "cancel": "Cancel",
    "retry": "Retry",
    "listening": "Listening...",
    "analyzing": "Analyzing your pronunciation...",
    "feedbackPlaceholder": "Your pronunciation feedback will appear here after recording.",
    "previous": "Previous",
    "next": "Next",
    "simple": "Simple",
    "advanced": "Advanced",
    "json": "JSON",
    "micDenied": "Microphone access denied. Please allow microphone access and try again.",
    "analysisFailed": "Analysis failed",
    "connectionError": "Failed to connect to analysis service: {message}"
  },
  "FeedbackDisplay": {
    "detectedAccent": "Detected accent",
    "confidence": "{level} confidence",
    "phonemeAnalysis": "Phoneme analysis",
    "word": "Word",
    "youProduced": "You produced",
    "expected": "Expected",
    "substitution": "Substitution",
    "rhythmIntonation": "Rhythm & intonation",
    "stress": "Stress",
    "practiceTips": "Practice tips",
    "practiceWith": "Practice with:",
    "textMatch": "Text match: {value}"
  },
  "Progress": {
    "title": "Progress"
  },
  "ScoreTrend": {
    "title": "Score Trend"
  },
  "PhonemeTable": {
    "title": "Phoneme Progress",
    "phoneme": "Phoneme",
    "name": "Name",
    "accuracy": "Accuracy",
    "practiced": "Practiced",
    "trend": "Trend",
    "times": "{count} times"
  },
  "StreakTracker": {
    "title": "Current Streak",
    "days": "{count} days"
  },
  "Settings": {
    "title": "Settings",
    "profile": "Profile",
    "name": "Name",
    "email": "Email",
    "languageSettings": "Language Settings",
    "nativeLanguage": "Native Language",
    "targetLanguage": "Target Language",
    "uiLanguage": "UI Language",
    "subscription": "Subscription",
    "freePlan": "Free Plan",
    "upgrade": "Upgrade to Premium"
  },
  "LocaleSwitcher": {
    "label": "Language",
    "en": "English",
    "ru": "Русский",
    "es": "Español",
    "fr": "Français"
  },
  "Drills": {
    "th-sounds": {
      "name": "TH Sounds",
      "description": "Master the voiced and voiceless TH sounds"
    },
    "vowel-pairs": {
      "name": "Vowel Pairs",
      "description": "Distinguish between similar vowel sounds"
    },
    "r-l-distinction": {
      "name": "R vs L",
      "description": "Clear distinction between R and L sounds"
    },
    "word-stress": {
      "name": "Word Stress",
      "description": "Correct stress patterns in multi-syllable words"
    },
    "intonation": {
      "name": "Intonation",
      "description": "Rising and falling pitch patterns"
    },
    "consonant-clusters": {
      "name": "Consonant Clusters",
      "description": "Handle complex consonant combinations"
    },
    "umlauts": {
      "name": "Umlaute",
      "description": "Master the ä, ö, and ü vowel sounds"
    },
    "ch-sounds": {
      "name": "CH-Laute",
      "description": "Distinguish the ich-Laut and ach-Laut"
    },
    "german-r": {
      "name": "German R",
      "description": "Practice the uvular R and vocalic R"
    },
    "long-short-vowels": {
      "name": "Vokallänge",
      "description": "Differentiate long and short German vowels"
    },
    "final-devoicing": {
      "name": "Auslautverhärtung",
      "description": "Practice word-final consonant devoicing"
    }
  },
  "Phonemes": {
    "voicelessTH": "voiceless TH",
    "voicedTH": "voiced TH",
    "shortA": "short A",
    "rSound": "R sound",
    "lSound": "L sound",
    "shortI": "short I",
    "longE": "long E",
    "shortOO": "short OO"
  }
}
```

**Step 2: Commit**

```bash
git add src/messages/en.json
git commit -m "feat(i18n): create English translation file (source of truth)"
```

---

### Task 4: Generate ru/es/fr translation files

**Files:**
- Create: `src/messages/ru.json`
- Create: `src/messages/es.json`
- Create: `src/messages/fr.json`

**Step 1: Generate translations**

Use an LLM to translate `en.json` into Russian, Spanish, and French. The structure and keys must be identical — only values change.

Important translation notes:
- Keep `{variable}` placeholders exactly as-is (e.g., `{name}`, `{count}`, `{value}`)
- Keep brand name "NativeSpeechAI" and "NativeSpeech" untranslated
- Keep phoneme symbols (θ, ð, æ, etc.) and IPA untranslated
- Drill IDs in the `Drills` namespace keys stay as-is (they're keys, not display text)
- Translate drill names and descriptions appropriately
- For German-specific drill names like "Umlaute", "CH-Laute", "Vokallänge", "Auslautverhärtung" — keep the German names but translate the descriptions
- `LocaleSwitcher` values: always show language names in their native script regardless of locale

**Step 2: Verify all 4 files have identical key structure**

Run a quick diff of keys:
```bash
node -e "
const en = require('./src/messages/en.json');
const ru = require('./src/messages/ru.json');
const es = require('./src/messages/es.json');
const fr = require('./src/messages/fr.json');
const getKeys = (obj, prefix='') => Object.entries(obj).flatMap(([k,v]) => typeof v === 'object' && v !== null ? getKeys(v, prefix+k+'.') : [prefix+k]);
const enKeys = getKeys(en).sort().join('\n');
for (const [name, locale] of [['ru',ru],['es',es],['fr',fr]]) {
  const keys = getKeys(locale).sort().join('\n');
  if (keys !== enKeys) console.log(name + ' MISMATCH');
  else console.log(name + ' OK');
}
"
```
Expected: all three show "OK"

**Step 3: Commit**

```bash
git add src/messages/ru.json src/messages/es.json src/messages/fr.json
git commit -m "feat(i18n): add Russian, Spanish, and French translations"
```

---

### Task 5: Restructure routes under [locale] segment

This is the biggest structural change. Move all page/layout files from `src/app/(marketing)/` and `src/app/(app)/` under `src/app/[locale]/`.

**Files:**
- Modify: `src/app/layout.tsx` (strip to minimal shell)
- Create: `src/app/[locale]/layout.tsx` (new locale-aware layout)
- Move: `src/app/(marketing)/` → `src/app/[locale]/(marketing)/`
- Move: `src/app/(app)/` → `src/app/[locale]/(app)/`

**Step 1: Simplify root layout**

The root layout becomes a minimal shell. Locale-specific `<html lang>` moves to the `[locale]` layout.

`src/app/layout.tsx`:
```tsx
import type { Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

**Step 2: Create locale layout**

`src/app/[locale]/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <NextIntlClientProvider>
              {children}
            </NextIntlClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: Move route groups**

```bash
# Create the [locale] directory
mkdir -p "src/app/[locale]"

# Move route groups into [locale]
mv "src/app/(marketing)" "src/app/[locale]/(marketing)"
mv "src/app/(app)" "src/app/[locale]/(app)"
```

**Step 4: Verify the app builds**

```bash
bun build
```

Expected: Build succeeds. Pages now accessible at `/en/`, `/ru/`, etc. Root `/` should redirect to `/en/` (or browser-detected locale).

**Step 5: Commit**

```bash
git add src/app/
git commit -m "feat(i18n): restructure routes under [locale] segment"
```

---

### Task 6: Migrate marketing components (Nav, Hero, Footer, Features)

**Files:**
- Modify: `src/components/marketing/Nav.tsx`
- Modify: `src/components/marketing/Hero.tsx`
- Modify: `src/components/marketing/Footer.tsx`
- Modify: `src/components/marketing/Features.tsx`

**Step 1: Migrate Nav.tsx**

Key changes:
- Replace `import Link from "next/link"` with `import { Link } from "@/i18n/navigation"`
- Add `import { useTranslations } from "next-intl"`
- Replace all hardcoded strings with `t('key')` calls

```tsx
"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import styles from "./Nav.module.css";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("Nav");

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>◉</span>
        <span className={styles.logoText}>NativeSpeech</span>
      </Link>
      <div className={styles.links}>
        <Link href="/#features" className={styles.link}>{t("features")}</Link>
        <Link href="/pricing" className={styles.link}>{t("pricing")}</Link>
        <Link href="/about" className={styles.link}>{t("about")}</Link>
      </div>
      <div className={styles.actions}>
        <LocaleSwitcher />
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">{t("tryDemo")}</Button>
        </Link>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">{t("signIn")}</Button>
        </Link>
        <Link href="/sign-up" className={styles.ctaDesktop}>
          <Button variant="primary" size="sm">{t("getStarted")}</Button>
        </Link>
        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={t("toggleMenu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/#features" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("features")}</Link>
          <Link href="/pricing" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("pricing")}</Link>
          <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("about")}</Link>
          <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("tryDemo")}</Link>
          <Link href="/sign-up" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("getStarted")}</Link>
        </div>
      )}
    </nav>
  );
}
```

**Step 2: Migrate Hero.tsx**

Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"` and all hardcoded strings with `t()`.

```tsx
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {t("headline")}
          <br />
          <span className={styles.accent}>{t("accent")}</span>
        </h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.actions}>
          <Link href="/sign-up">
            <Button size="lg">{t("cta")}</Button>
          </Link>
          <Link href="/#features">
            <Button variant="secondary" size="lg">{t("howItWorks")}</Button>
          </Link>
        </div>
        <div className={styles.demoSection}>
          <span className={styles.demoLabel}>{t("demoLabel")}</span>
          <div className={styles.demoLinks}>
            <Link href="/onboarding" className={`${styles.demoLink} ${styles.assessmentLink}`}>
              <span className={styles.demoIcon}>&#x1F399;</span>
              {t("freeAssessment")}
            </Link>
            <Link href="/practice/th-sounds" className={styles.demoLink}>
              <span className={styles.demoIcon}>θ</span>
              TH Sounds
            </Link>
            <Link href="/practice/vowel-pairs" className={styles.demoLink}>
              <span className={styles.demoIcon}>æ</span>
              Vowel Pairs
            </Link>
            <Link href="/practice/umlauts" className={styles.demoLink}>
              <span className={styles.demoIcon}>ü</span>
              Umlaute
            </Link>
            <Link href="/practice/ch-sounds" className={styles.demoLink}>
              <span className={styles.demoIcon}>ch</span>
              CH-Laute
            </Link>
          </div>
          <Link href="/practice" className={styles.demoLink}>
            {t("browseAll")} &rarr;
          </Link>
        </div>
      </div>
      <div className={styles.visual}>
        <svg viewBox="0 0 400 400" className={styles.rings}>
          {[160, 130, 100, 70, 40].map((r, i) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity={0.15 + i * 0.1} />
          ))}
          <circle cx="200" cy="200" r="6" fill="var(--color-accent)" />
        </svg>
      </div>
    </section>
  );
}
```

Note: The drill names in demo links (TH Sounds, Vowel Pairs, etc.) are display names from mock data. These will be translated in Task 10 when mock data is migrated. For now, they can stay hardcoded — they're the same across demo links.

**Step 3: Migrate Footer.tsx**

Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"` and hardcoded strings with `t()`.

```tsx
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import styles from "./Footer.module.css";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>◉ NativeSpeech</span>
          <p className={styles.tagline}>{t("tagline")}</p>
        </div>
        <div className={styles.columns}>
          <div>
            <h4 className={styles.heading}>{t("product")}</h4>
            <Link href="/#features" className={styles.link}>{t("features")}</Link>
            <Link href="/pricing" className={styles.link}>{t("pricing")}</Link>
          </div>
          <div>
            <h4 className={styles.heading}>{t("company")}</h4>
            <Link href="/about" className={styles.link}>{t("about")}</Link>
          </div>
          <div>
            <h4 className={styles.heading}>{t("legal")}</h4>
            <span className={styles.link}>{t("privacy")}</span>
            <span className={styles.link}>{t("terms")}</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>{t("copyright")}</span>
      </div>
    </footer>
  );
}
```

Note: Footer uses `Nav` namespace keys for "Features", "Pricing", "About" link text. To keep it DRY, add these to `Footer` namespace too (they're short enough that duplication is cleaner than cross-namespace imports).

Add to `Footer` namespace in all JSON files:
```json
"features": "Features",
"pricing": "Pricing",
"about": "About"
```

**Step 4: Migrate Features.tsx**

Move feature data from inline array to translation keys:

```tsx
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import styles from "./Features.module.css";

const featureKeys = [
  { key: "l1l2", icon: "◎" },
  { key: "drills", icon: "◇" },
  { key: "tracking", icon: "◈" },
  { key: "multiLang", icon: "◉" },
] as const;

export function Features() {
  const t = useTranslations("Features");

  return (
    <section id="features" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{t("heading")}</h2>
        <p className={styles.subheading}>{t("subheading")}</p>
        <div className={styles.grid}>
          {featureKeys.map((f) => (
            <Card key={f.key} variant="outlined">
              <div className={styles.feature}>
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{t(`${f.key}Title`)}</h3>
                <p className={styles.featureDesc}>{t(`${f.key}Desc`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 5: Verify build**

```bash
bun build
```

**Step 6: Commit**

```bash
git add src/components/marketing/
git commit -m "feat(i18n): migrate marketing components to next-intl"
```

---

### Task 7: Create LocaleSwitcher component

**Files:**
- Create: `src/components/ui/LocaleSwitcher.tsx`
- Create: `src/components/ui/LocaleSwitcher.module.css`

**Step 1: Create LocaleSwitcher.tsx**

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./LocaleSwitcher.module.css";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LocaleSwitcher");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      className={styles.select}
      value={locale}
      onChange={handleChange}
      aria-label={t("label")}
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {t(loc)}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Create LocaleSwitcher.module.css**

```css
.select {
  appearance: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.25rem 1.5rem 0.25rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.4rem center;
}

.select:hover {
  border-color: var(--color-primary);
}

.select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Step 3: Export from ui index if one exists, or just import directly**

Check if `src/components/ui/index.ts` exists and add the export. If not, components import directly from the file path.

**Step 4: Commit**

```bash
git add src/components/ui/LocaleSwitcher.tsx src/components/ui/LocaleSwitcher.module.css
git commit -m "feat(i18n): add LocaleSwitcher component"
```

---

### Task 8: Migrate marketing pages (Home, Pricing, About, SignIn, SignUp)

**Files:**
- Modify: `src/app/[locale]/(marketing)/page.tsx`
- Modify: `src/app/[locale]/(marketing)/pricing/page.tsx`
- Modify: `src/app/[locale]/(marketing)/about/page.tsx`
- Modify: `src/app/[locale]/(marketing)/sign-in/page.tsx`
- Modify: `src/app/[locale]/(marketing)/sign-up/page.tsx`
- Modify: `src/app/[locale]/(marketing)/layout.tsx`

**Step 1: Update marketing layout — no changes needed**

The marketing layout just wraps `<Nav />`, `<main>`, `<Footer />`. These components now handle their own translations internally. No change required unless we need `setRequestLocale`.

If pages inside use server-side translations (like metadata), add `setRequestLocale` to the layout:

```tsx
import { setRequestLocale } from "next-intl/server";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

**Step 2: Home page — no text changes needed**

`src/app/[locale]/(marketing)/page.tsx` just renders `<Hero />`, `<Features />`, `<PricingPreview />`. These handle their own translations. No change needed.

**Step 3: Migrate Pricing page**

Replace all hardcoded strings with `useTranslations("Pricing")`. Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`.

**Step 4: Migrate About page**

Replace all hardcoded strings with `useTranslations("About")`.

**Step 5: Migrate Sign-In page**

Replace hardcoded form labels, button text, and links with `useTranslations("SignIn")`. Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`.

Note: `signIn()` from `@/auth` is a server action — this stays unchanged. Only the UI text is translated.

**Step 6: Migrate Sign-Up page**

Same pattern as Sign-In. Use `useTranslations("SignUp")`.

**Step 7: Verify build**

```bash
bun build
```

**Step 8: Commit**

```bash
git add "src/app/[locale]/(marketing)/"
git commit -m "feat(i18n): migrate marketing pages to next-intl"
```

---

### Task 9: Migrate app shell (Sidebar, Header) and app layout

**Files:**
- Modify: `src/app/[locale]/(app)/layout.tsx`
- Modify: `src/components/app/Sidebar.tsx`
- Modify: `src/components/app/Header.tsx`

**Step 1: Update app layout**

Add `setRequestLocale` and accept `params`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/app/Sidebar";
import { Header } from "@/components/app/Header";
import styles from "./layout.module.css";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
```

**Step 2: Migrate Sidebar.tsx**

Key changes:
- Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`
- Replace `import { usePathname } from "next/navigation"` → `import { usePathname } from "@/i18n/navigation"`
- Use `useTranslations("Sidebar")` for nav labels

```tsx
"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/dashboard" as const, key: "dashboard" as const, icon: "◉" },
  { href: "/practice" as const, key: "practice" as const, icon: "◇" },
  { href: "/progress" as const, key: "progress" as const, icon: "◈" },
  { href: "/settings" as const, key: "settings" as const, icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  return (
    <>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◉</span>
          <span className={styles.logoText}>NativeSpeech</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{t(item.key)}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <nav className={styles.tabBar}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.tab} ${pathname.startsWith(item.href) ? styles.active : ""}`}
          >
            <span className={styles.tabIcon}>{item.icon}</span>
            <span className={styles.tabLabel}>{t(item.key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
```

**Step 3: Migrate Header.tsx**

```tsx
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export function Header() {
  const { user, toggle } = useAuth();
  const t = useTranslations("Header");

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          {t("greeting", { name: user?.name ?? t("guest") })}
        </h2>
      </div>
      <div className={styles.right}>
        <LocaleSwitcher />
        <Badge variant="accent">{t("score", { value: mockUser.overallScore })}</Badge>
        <Badge variant="success">{t("streak", { count: mockUser.streak })}</Badge>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {user ? t("signOut") : t("signIn")}
        </Button>
      </div>
    </header>
  );
}
```

**Step 4: Verify build**

```bash
bun build
```

**Step 5: Commit**

```bash
git add "src/app/[locale]/(app)/layout.tsx" src/components/app/
git commit -m "feat(i18n): migrate app shell (sidebar, header) to next-intl"
```

---

### Task 10: Migrate app pages (Dashboard, Practice, Progress, Settings)

**Files:**
- Modify: `src/app/[locale]/(app)/dashboard/page.tsx`
- Modify: `src/app/[locale]/(app)/practice/page.tsx`
- Modify: `src/app/[locale]/(app)/practice/[drillId]/page.tsx`
- Modify: `src/app/[locale]/(app)/progress/page.tsx`
- Modify: `src/app/[locale]/(app)/settings/page.tsx`

**Step 1: Dashboard page**

Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`, add translations:

```tsx
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import styles from "./page.module.css";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <div className={styles.page}>
      <ScoreOverview />
      <Link href="/practice">
        <Button size="lg">{t("startPractice")}</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots />
        <RecentSessions />
      </div>
    </div>
  );
}
```

**Step 2: Practice page**

```tsx
import { useTranslations } from "next-intl";
import { DrillGrid } from "@/components/practice/DrillGrid";
import styles from "./page.module.css";

export default function PracticePage() {
  const t = useTranslations("Practice");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>
      <DrillGrid />
    </div>
  );
}
```

**Step 3: Drill detail page**

The `[drillId]/page.tsx` passes `categoryName` to `DrillSession`. This name should come from translations now. Use `getTranslations` (server component):

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { mockDrillCategories, mockDrillSessions } from "@/lib/mock-data";
import { DrillSession } from "@/components/practice/DrillSession";

interface Props {
  params: Promise<{ drillId: string; locale: string }>;
}

export default async function DrillPage({ params }: Props) {
  const { drillId } = await params;
  const category = mockDrillCategories.find((c) => c.id === drillId);
  const drills = mockDrillSessions[drillId];

  if (!category) notFound();

  const t = await getTranslations("Drills");
  const categoryName = t(`${drillId}.name`);

  return (
    <DrillSession
      drills={drills ?? []}
      categoryName={categoryName}
    />
  );
}
```

**Step 4: Progress page**

```tsx
import { useTranslations } from "next-intl";
import { ScoreTrend } from "@/components/progress/ScoreTrend";
import { PhonemeTable } from "@/components/progress/PhonemeTable";
import { StreakTracker } from "@/components/progress/StreakTracker";
import styles from "./page.module.css";

export default function ProgressPage() {
  const t = useTranslations("Progress");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <StreakTracker />
      <ScoreTrend />
      <PhonemeTable />
    </div>
  );
}
```

**Step 5: Settings page**

Add locale switcher and translate all labels. Replace `import Link from "next/link"` if used.

```tsx
import { useTranslations } from "next-intl";
import { Card, Input, Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { mockUser } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function SettingsPage() {
  const t = useTranslations("Settings");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("profile")}</h2>
          <div className={styles.fields}>
            <Input label={t("name")} defaultValue={mockUser.name} />
            <Input label={t("email")} type="email" defaultValue={mockUser.email} />
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("languageSettings")}</h2>
          <div className={styles.fields}>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("nativeLanguage")}</label>
              <select className={styles.select} defaultValue={mockUser.nativeLanguage}>
                <option>Mandarin Chinese</option>
                <option>Spanish</option>
                <option>Arabic</option>
                <option>Russian</option>
                <option>German</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Portuguese</option>
                <option>French</option>
                <option>Hindi</option>
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("targetLanguage")}</label>
              <select className={styles.select} defaultValue={mockUser.targetLanguage}>
                <option>English</option>
                <option>German</option>
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("uiLanguage")}</label>
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("subscription")}</h2>
          <p className={styles.planStatus}>{t("freePlan")}</p>
          <Button variant="primary">{t("upgrade")}</Button>
        </div>
      </Card>
    </div>
  );
}
```

**Step 6: Verify build**

```bash
bun build
```

**Step 7: Commit**

```bash
git add "src/app/[locale]/(app)/"
git commit -m "feat(i18n): migrate app pages to next-intl"
```

---

### Task 11: Migrate practice components (DrillSession, FeedbackDisplay, DrillGrid)

**Files:**
- Modify: `src/components/practice/DrillSession.tsx`
- Modify: `src/components/practice/FeedbackDisplay.tsx`
- Modify: `src/components/practice/SimplifiedFeedbackDisplay.tsx`
- Modify: `src/components/practice/DrillGrid.tsx`

**Step 1: Migrate DrillSession.tsx**

Add `import { useTranslations } from "next-intl"` and replace all hardcoded strings. Key replacements:

- `"Read this aloud:"` → `t("readAloud")`
- `"Record"` / `"Stop"` / `"Cancel"` / `"Retry"` → `t("record")` / `t("stop")` / `t("cancel")` / `t("retry")`
- `"Listening..."` → `t("listening")`
- `"Analyzing your pronunciation..."` → `t("analyzing")`
- `"Your pronunciation feedback will appear here..."` → `t("feedbackPlaceholder")`
- `"Simple"` / `"Advanced"` / `"JSON"` → `t("simple")` / `t("advanced")` / `t("json")`
- Error messages → `t("micDenied")`, `t("connectionError", { message })`, etc.
- `"Previous"` / `"Next"` → `t("previous")` / `t("next")`
- `"No drills available for this category."` → `t("noDrills")` (from Practice namespace)

**Step 2: Migrate FeedbackDisplay.tsx**

Add `useTranslations("FeedbackDisplay")` and replace all section labels:

- `"Detected accent"` → `t("detectedAccent")`
- `"confidence"` → `t("confidence", { level: data.accent.confidence })`
- `"Phoneme analysis"` → `t("phonemeAnalysis")`
- `"Word"` → `t("word")`
- `"You produced"` → `t("youProduced")`
- `"Expected"` → `t("expected")`
- `"Substitution"` → `t("substitution")`
- `"Rhythm & intonation"` → `t("rhythmIntonation")`
- `"Stress"` → `t("stress")`
- `"Practice tips"` → `t("practiceTips")`
- `"Practice with:"` → `t("practiceWith")`
- `"Text match:"` → `t("textMatch", { value: data.textMatch })`

**Step 3: Migrate DrillGrid.tsx**

Replace drill category names with translated names from `Drills` namespace. Replace `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`.

**Step 4: Verify build**

```bash
bun build
```

**Step 5: Commit**

```bash
git add src/components/practice/
git commit -m "feat(i18n): migrate practice components to next-intl"
```

---

### Task 12: Migrate dashboard and progress components

**Files:**
- Modify: `src/components/dashboard/ScoreOverview.tsx`
- Modify: `src/components/dashboard/RecentSessions.tsx`
- Modify: `src/components/dashboard/WeakSpots.tsx`
- Modify: `src/components/progress/ScoreTrend.tsx`
- Modify: `src/components/progress/PhonemeTable.tsx`
- Modify: `src/components/progress/StreakTracker.tsx`

**Step 1: Migrate each component**

Same pattern for all — add `useTranslations('ComponentName')` and replace hardcoded strings. Use the namespace keys defined in `en.json`.

Key components:
- **ScoreOverview**: title, "/ 100"
- **RecentSessions**: title, score/duration labels
- **WeakSpots**: title, accuracy label, trend labels (improving/declining/stable)
- **ScoreTrend**: title
- **PhonemeTable**: title, column headers (Phoneme, Name, Accuracy, Practiced, Trend), "times" label
- **StreakTracker**: title, days label

**Step 2: Verify build**

```bash
bun build
```

**Step 3: Commit**

```bash
git add src/components/dashboard/ src/components/progress/
git commit -m "feat(i18n): migrate dashboard and progress components to next-intl"
```

---

### Task 13: Migrate onboarding (AccentAssessment)

**Files:**
- Modify: `src/components/onboarding/AccentAssessment.tsx`
- Modify: `src/app/[locale]/(marketing)/onboarding/page.tsx` (if it has text)

**Step 1: Read AccentAssessment.tsx and identify all hardcoded strings**

**Step 2: Add appropriate namespace to en.json and other locale files**

**Step 3: Replace hardcoded strings with `useTranslations("AccentAssessment")`**

**Step 4: Verify build**

```bash
bun build
```

**Step 5: Commit**

```bash
git add src/components/onboarding/ "src/app/[locale]/(marketing)/onboarding/"
git commit -m "feat(i18n): migrate onboarding component to next-intl"
```

---

### Task 14: Localize Gemini AI feedback

**Files:**
- Modify: `src/app/api/analyze/route.ts`

**Step 1: Accept locale in the analyze API**

Add a `locale` field to the FormData the API receives. Map locale codes to full language names.

Add to `route.ts`:
```ts
const localeToLanguage: Record<string, string> = {
  en: "English",
  ru: "Russian",
  es: "Spanish",
  fr: "French",
};
```

In the POST handler, read locale:
```ts
const locale = (formData.get("locale") as string) ?? "en";
const language = localeToLanguage[locale] ?? "English";
```

**Step 2: Append language instruction to Gemini prompt**

Add to the end of `combinedPrompt`:
```
\n\nIMPORTANT: Respond entirely in ${language}. All text fields in your response — summaries, tips, descriptions, pattern names, exercise instructions — must be written in ${language}. Keep IPA symbols and phoneme notation as-is.
```

**Step 3: Send locale from DrillSession.tsx**

In `DrillSession.tsx`, import `useLocale` from `next-intl` and append it to the FormData:

```ts
import { useLocale } from "next-intl";

// Inside the component:
const locale = useLocale();

// In the analyze function, add to formData:
formData.append("locale", locale);
```

**Step 4: Verify by testing with a non-English locale**

Run the app in Russian locale, record audio, check that Gemini feedback comes back in Russian.

**Step 5: Commit**

```bash
git add src/app/api/analyze/route.ts src/components/practice/DrillSession.tsx
git commit -m "feat(i18n): localize Gemini AI feedback to user's language"
```

---

### Task 15: Replace all remaining `next/link` and `next/navigation` imports

**Files:**
- Any file still importing from `next/link` or using `usePathname` from `next/navigation`

**Step 1: Search for remaining imports**

```bash
grep -rn "from \"next/link\"" src/
grep -rn "from \"next/navigation\"" src/ | grep -v "notFound"
```

Any results need to be updated to use `@/i18n/navigation` equivalents.

**Step 2: Replace each one**

- `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`
- `import { usePathname } from "next/navigation"` → `import { usePathname } from "@/i18n/navigation"`
- `import { useRouter } from "next/navigation"` → `import { useRouter } from "@/i18n/navigation"`

Exception: `notFound` stays as `import { notFound } from "next/navigation"` — it's not locale-related.

**Step 3: Verify build**

```bash
bun build
```

**Step 4: Commit**

```bash
git add src/
git commit -m "refactor(i18n): replace all next/link imports with locale-aware navigation"
```

---

### Task 16: Update CLAUDE.md with i18n workflow rules

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add i18n section to CLAUDE.md**

Append after the existing content:

```markdown
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
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add i18n workflow rules to CLAUDE.md"
```

---

### Task 17: Create GitHub Action for i18n key sync check

**Files:**
- Create: `scripts/check-i18n-keys.js`
- Create: `.github/workflows/i18n-check.yml`

**Step 1: Create the key-checking script**

`scripts/check-i18n-keys.js`:
```js
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "src", "messages");
const sourceFile = "en.json";
const localeFiles = ["ru.json", "es.json", "fr.json"];

function getKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? getKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const source = JSON.parse(
  fs.readFileSync(path.join(messagesDir, sourceFile), "utf-8")
);
const sourceKeys = new Set(getKeys(source));

let hasErrors = false;
let hasWarnings = false;

for (const file of localeFiles) {
  const filePath = path.join(messagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: ${file} does not exist`);
    hasErrors = true;
    continue;
  }

  const locale = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const localeKeys = new Set(getKeys(locale));

  const missing = [...sourceKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !sourceKeys.has(k));

  if (missing.length > 0) {
    console.error(`ERROR: ${file} is missing ${missing.length} keys:`);
    missing.forEach((k) => console.error(`  - ${k}`));
    hasErrors = true;
  }

  if (extra.length > 0) {
    console.warn(`WARNING: ${file} has ${extra.length} extra keys:`);
    extra.forEach((k) => console.warn(`  + ${k}`));
    hasWarnings = true;
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`OK: ${file} — all keys match`);
  }
}

if (hasErrors) {
  process.exit(1);
} else if (hasWarnings) {
  console.log("\nPassed with warnings.");
  process.exit(0);
} else {
  console.log("\nAll locale files are in sync.");
  process.exit(0);
}
```

**Step 2: Create GitHub Action workflow**

`.github/workflows/i18n-check.yml`:
```yaml
name: i18n Key Sync Check

on:
  pull_request:
    branches: [master]
    paths:
      - "src/messages/**"

jobs:
  check-i18n-keys:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check i18n key sync
        run: node scripts/check-i18n-keys.js
```

**Step 3: Test the script locally**

```bash
node scripts/check-i18n-keys.js
```

Expected: "All locale files are in sync." (or lists any mismatches to fix)

**Step 4: Commit**

```bash
git add scripts/check-i18n-keys.js .github/workflows/i18n-check.yml
git commit -m "ci: add GitHub Action to check i18n key sync across locale files"
```

---

### Task 18: Verify everything works end-to-end

**Step 1: Run the dev server**

```bash
bun dev
```

**Step 2: Test locale detection**

- Open `http://localhost:3000` in a browser
- Verify it redirects to `/en/` (or browser-detected locale)
- Check that the URL has the locale prefix

**Step 3: Test locale switching**

- Use the locale switcher dropdown
- Verify URL changes (e.g., `/en/dashboard` → `/ru/dashboard`)
- Verify all visible text changes to the selected language
- Verify navigation links work correctly with locale prefix

**Step 4: Test each page**

Navigate through all pages and verify no hardcoded English remains when viewing in Russian/Spanish/French:
- `/` (home)
- `/pricing`
- `/about`
- `/sign-in`, `/sign-up`
- `/dashboard`
- `/practice`
- `/practice/th-sounds` (drill session)
- `/progress`
- `/settings`

**Step 5: Test Gemini feedback localization**

- Switch to Russian locale
- Navigate to a drill, record audio
- Verify Gemini response comes back in Russian

**Step 6: Run production build**

```bash
bun build
```

Expected: Build succeeds with no errors.

**Step 7: Run i18n key check**

```bash
node scripts/check-i18n-keys.js
```

Expected: All locale files in sync.

**Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "fix(i18n): final adjustments from end-to-end testing"
```

---

## Task Dependency Graph

```
Task 1 (install next-intl)
  └→ Task 2 (i18n infrastructure)
      └→ Task 3 (en.json)
          └→ Task 4 (ru/es/fr.json)
          └→ Task 5 (restructure routes) ← BIGGEST CHANGE
              ├→ Task 6 (marketing components)
              │   └→ Task 7 (LocaleSwitcher)
              │       └→ Task 8 (marketing pages)
              ├→ Task 9 (app shell)
              │   └→ Task 10 (app pages)
              │       └→ Task 11 (practice components)
              │       └→ Task 12 (dashboard/progress components)
              │       └→ Task 13 (onboarding)
              └→ Task 14 (Gemini localization)
              └→ Task 15 (remaining imports cleanup)
      └→ Task 16 (CLAUDE.md rules) — independent
      └→ Task 17 (GitHub Action) — independent after Task 4
  └→ Task 18 (E2E verification) — after all above
```

Tasks 16 and 17 can be done in parallel with Tasks 6-15.
