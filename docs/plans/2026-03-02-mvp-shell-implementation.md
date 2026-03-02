# NativeSpeechAI MVP Shell — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a complete Next.js MVP shell with themeable design system, auth, marketing site, and all app pages with mock data.

**Architecture:** Next.js 15 App Router with route groups `(marketing)` and `(app)`. Themeable CSS custom properties driven by a TypeScript theme object. Auth.js v5 for authentication. All app pages use mock data from a single file.

**Tech Stack:** Next.js 15, TypeScript, CSS Modules, Auth.js v5 (next-auth@beta), pnpm, Inter font

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, etc. (via create-next-app)

**Step 1: Scaffold the project**

```bash
cd F:/work/my_web_work/native-speech
pnpm create next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --turbopack
```

Accept defaults. This creates the base Next.js project in the current directory.

**Step 2: Verify it runs**

```bash
pnpm dev
```

Open http://localhost:3000 — confirm default Next.js page loads.

**Step 3: Clean up generated files**

- Delete contents of `src/app/page.tsx` (replace with minimal placeholder)
- Delete contents of `src/app/globals.css` (we'll replace with our own)
- Delete `src/app/page.module.css`
- Keep `src/app/layout.tsx` (we'll modify it later)

Replace `src/app/page.tsx`:
```tsx
export default function Home() {
  return <div>NativeSpeechAI</div>;
}
```

**Step 4: Create directory structure**

```bash
mkdir -p src/components/ui
mkdir -p src/components/marketing
mkdir -p src/components/dashboard
mkdir -p src/components/practice
mkdir -p src/components/progress
mkdir -p src/lib
mkdir -p src/providers
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with TypeScript"
```

---

### Task 2: Theme System

**Files:**
- Create: `src/lib/theme.ts`
- Create: `src/providers/ThemeProvider.tsx`
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Create the theme type and default theme**

`src/lib/theme.ts`:
```ts
export interface Theme {
  name: string;
  colors: {
    primary: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    success: string;
    error: string;
    border: string;
  };
  gradients: {
    primary: string;
    accent: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  spacing: {
    unit: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  shadows: {
    subtle: string;
    medium: string;
    glow: string;
  };
}

export const resonantDark: Theme = {
  name: "Resonant Dark",
  colors: {
    primary: "#6366f1",
    primaryLight: "#818cf8",
    accent: "#f59e0b",
    accentLight: "#fbbf24",
    surface: "#0a0a12",
    surfaceAlt: "#12121e",
    text: "#e8e8f0",
    textMuted: "#6b6b80",
    success: "#10b981",
    error: "#ef4444",
    border: "#1e1e2e",
  },
  gradients: {
    primary: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    accent: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },
  spacing: {
    unit: "4px",
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
    xxl: "64px",
  },
  fonts: {
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  shadows: {
    subtle: "0 1px 3px rgba(0, 0, 0, 0.3)",
    medium: "0 4px 12px rgba(0, 0, 0, 0.4)",
    glow: "0 0 20px rgba(99, 102, 241, 0.15)",
  },
};
```

**Step 2: Create the ThemeProvider**

`src/providers/ThemeProvider.tsx`:
```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Theme, resonantDark } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: resonantDark,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${camelToKebab(key)}`, value);
  });

  // Gradients
  Object.entries(theme.gradients).forEach(([key, value]) => {
    root.style.setProperty(`--gradient-${key}`, value);
  });

  // Radii
  Object.entries(theme.radii).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--space-${key}`, value);
  });

  // Fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? resonantDark);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Step 3: Create globals.css**

`src/app/globals.css`:
```css
/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  color-scheme: dark;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-surface);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

input, select, textarea {
  font: inherit;
}

img, svg {
  display: block;
  max-width: 100%;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

/* Focus visible */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Step 4: Wire up root layout**

Modify `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NativeSpeechAI — Your AI-Powered Accent Coach",
  description:
    "AI-powered pronunciation coaching that diagnoses why you mispronounce sounds and creates personalized drills to perfect your accent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 5: Verify dev server still works**

```bash
pnpm dev
```

Confirm page loads with dark background and light text.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add themeable design system with Resonant Dark theme"
```

---

### Task 3: UI Primitives

**Files:**
- Create: `src/components/ui/Button.tsx` + `src/components/ui/Button.module.css`
- Create: `src/components/ui/Card.tsx` + `src/components/ui/Card.module.css`
- Create: `src/components/ui/Input.tsx` + `src/components/ui/Input.module.css`
- Create: `src/components/ui/Badge.tsx` + `src/components/ui/Badge.module.css`
- Create: `src/components/ui/ProgressRing.tsx` + `src/components/ui/ProgressRing.module.css`
- Create: `src/components/ui/index.ts` (barrel export)

**Step 1: Button component**

`src/components/ui/Button.tsx`:
```tsx
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

`src/components/ui/Button.module.css`:
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background: var(--gradient-primary);
  color: #fff;
}
.primary:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: var(--shadow-glow);
}

.secondary {
  background: var(--color-surface-alt);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.ghost {
  background: transparent;
  color: var(--color-text-muted);
}
.ghost:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-surface-alt);
}

/* Sizes */
.sm { padding: var(--space-xs) var(--space-sm); font-size: 0.875rem; }
.md { padding: var(--space-sm) var(--space-md); font-size: 1rem; }
.lg { padding: var(--space-md) var(--space-lg); font-size: 1.125rem; }
```

**Step 2: Card component**

`src/components/ui/Card.tsx`:
```tsx
import styles from "./Card.module.css";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]} ${className ?? ""}`} {...props}>
      {children}
    </div>
  );
}
```

`src/components/ui/Card.module.css`:
```css
.card {
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.default {
  background: var(--color-surface-alt);
}

.outlined {
  background: transparent;
  border: 1px solid var(--color-border);
}

.elevated {
  background: var(--color-surface-alt);
  box-shadow: var(--shadow-medium);
}
```

**Step 3: Input component**

`src/components/ui/Input.tsx`:
```tsx
import styles from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className, ...props }: InputProps) {
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input id={id} className={`${styles.input} ${className ?? ""}`} {...props} />
    </div>
  );
}
```

`src/components/ui/Input.module.css`:
```css
.wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.input {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.input::placeholder {
  color: var(--color-text-muted);
}
```

**Step 4: Badge component**

`src/components/ui/Badge.tsx`:
```tsx
import styles from "./Badge.module.css";

interface BadgeProps {
  variant?: "default" | "success" | "error" | "accent";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
```

`src/components/ui/Badge.module.css`:
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.default {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}

.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
}

.error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
}

.accent {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-accent);
}
```

**Step 5: ProgressRing component**

`src/components/ui/ProgressRing.tsx`:
```tsx
import styles from "./ProgressRing.module.css";

interface ProgressRingProps {
  value: number;       // 0-100
  size?: number;       // px
  strokeWidth?: number;
  label?: string;
}

export function ProgressRing({ value, size = 120, strokeWidth = 8, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.progress}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </div>
  );
}
```

`src/components/ui/ProgressRing.module.css`:
```css
.wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.svg {
  transform: rotate(-90deg);
}

.progress {
  transition: stroke-dashoffset 0.6s ease;
}

.content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.value {
  font-size: 1.75rem;
  font-weight: 300;
  font-family: var(--font-display);
  color: var(--color-text);
}

.label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
```

**Step 6: Barrel export**

`src/components/ui/index.ts`:
```ts
export { Button } from "./Button";
export { Card } from "./Card";
export { Input } from "./Input";
export { Badge } from "./Badge";
export { ProgressRing } from "./ProgressRing";
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add UI primitives — Button, Card, Input, Badge, ProgressRing"
```

---

### Task 4: Mock Data

**Files:**
- Create: `src/lib/mock-data.ts`

**Step 1: Create comprehensive mock data**

`src/lib/mock-data.ts`:
```ts
export interface DrillCategory {
  id: string;
  name: string;
  description: string;
  phonemes: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  icon: string;
}

export interface DrillSession {
  id: string;
  categoryId: string;
  prompt: string;
  targetPhonemes: string[];
}

export interface PracticeSession {
  id: string;
  date: string;
  categoryName: string;
  score: number;
  duration: number; // minutes
}

export interface WeakSpot {
  phoneme: string;
  example: string;
  accuracy: number;
  trend: "improving" | "declining" | "stable";
}

export interface PhonemeProgress {
  phoneme: string;
  name: string;
  accuracy: number;
  practiceCount: number;
  trend: "improving" | "declining" | "stable";
}

export interface WeeklyScore {
  week: string;
  score: number;
}

export const mockUser = {
  name: "Alex Chen",
  email: "alex@example.com",
  image: null,
  nativeLanguage: "Mandarin Chinese",
  targetLanguage: "English",
  overallScore: 72,
  streak: 5,
  memberSince: "2026-01-15",
};

export const mockDrillCategories: DrillCategory[] = [
  {
    id: "th-sounds",
    name: "TH Sounds",
    description: "Master the voiced and voiceless TH sounds",
    phonemes: ["θ", "ð"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "θ",
  },
  {
    id: "vowel-pairs",
    name: "Vowel Pairs",
    description: "Distinguish between similar vowel sounds",
    phonemes: ["ɪ/iː", "ʊ/uː", "æ/ɛ"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    icon: "æ",
  },
  {
    id: "r-l-distinction",
    name: "R vs L",
    description: "Clear distinction between R and L sounds",
    phonemes: ["r", "l"],
    difficulty: "intermediate",
    estimatedMinutes: 12,
    icon: "R",
  },
  {
    id: "word-stress",
    name: "Word Stress",
    description: "Correct stress patterns in multi-syllable words",
    phonemes: ["ˈ", "ˌ"],
    difficulty: "advanced",
    estimatedMinutes: 15,
    icon: "ˈ",
  },
  {
    id: "intonation",
    name: "Intonation",
    description: "Rising and falling pitch patterns",
    phonemes: ["↗", "↘"],
    difficulty: "advanced",
    estimatedMinutes: 12,
    icon: "↗",
  },
  {
    id: "consonant-clusters",
    name: "Consonant Clusters",
    description: "Handle complex consonant combinations",
    phonemes: ["str", "spl", "nts"],
    difficulty: "intermediate",
    estimatedMinutes: 10,
    icon: "str",
  },
];

export const mockDrillSessions: Record<string, DrillSession[]> = {
  "th-sounds": [
    { id: "th-1", categoryId: "th-sounds", prompt: "The weather is rather nice today, though it might thunder this Thursday.", targetPhonemes: ["θ", "ð"] },
    { id: "th-2", categoryId: "th-sounds", prompt: "I think that these three things are worth thinking through.", targetPhonemes: ["θ", "ð"] },
    { id: "th-3", categoryId: "th-sounds", prompt: "They gathered together to breathe the northern air.", targetPhonemes: ["θ", "ð"] },
  ],
  "vowel-pairs": [
    { id: "vp-1", categoryId: "vowel-pairs", prompt: "Please sit in this seat and keep the ship in shape.", targetPhonemes: ["ɪ", "iː"] },
    { id: "vp-2", categoryId: "vowel-pairs", prompt: "Look at the moon through the full, cool pool of blue.", targetPhonemes: ["ʊ", "uː"] },
  ],
  "r-l-distinction": [
    { id: "rl-1", categoryId: "r-l-distinction", prompt: "The light rain was really lovely in the late afternoon.", targetPhonemes: ["r", "l"] },
    { id: "rl-2", categoryId: "r-l-distinction", prompt: "Read the long letter right before the rally.", targetPhonemes: ["r", "l"] },
  ],
};

export const mockRecentSessions: PracticeSession[] = [
  { id: "s1", date: "2026-03-01", categoryName: "TH Sounds", score: 78, duration: 12 },
  { id: "s2", date: "2026-02-28", categoryName: "Vowel Pairs", score: 65, duration: 8 },
  { id: "s3", date: "2026-02-27", categoryName: "R vs L", score: 71, duration: 10 },
  { id: "s4", date: "2026-02-25", categoryName: "Word Stress", score: 82, duration: 15 },
  { id: "s5", date: "2026-02-24", categoryName: "TH Sounds", score: 74, duration: 11 },
];

export const mockWeakSpots: WeakSpot[] = [
  { phoneme: "θ", example: "think → *sink", accuracy: 45, trend: "improving" },
  { phoneme: "æ", example: "cat → *ket", accuracy: 52, trend: "stable" },
  { phoneme: "r", example: "red → *led", accuracy: 58, trend: "improving" },
  { phoneme: "ɪ", example: "ship → *sheep", accuracy: 61, trend: "declining" },
];

export const mockPhonemeProgress: PhonemeProgress[] = [
  { phoneme: "θ", name: "voiceless TH", accuracy: 45, practiceCount: 24, trend: "improving" },
  { phoneme: "ð", name: "voiced TH", accuracy: 68, practiceCount: 24, trend: "stable" },
  { phoneme: "æ", name: "short A", accuracy: 52, practiceCount: 16, trend: "stable" },
  { phoneme: "r", name: "R sound", accuracy: 58, practiceCount: 20, trend: "improving" },
  { phoneme: "l", name: "L sound", accuracy: 75, practiceCount: 20, trend: "stable" },
  { phoneme: "ɪ", name: "short I", accuracy: 61, practiceCount: 12, trend: "declining" },
  { phoneme: "iː", name: "long E", accuracy: 80, practiceCount: 12, trend: "improving" },
  { phoneme: "ʊ", name: "short OO", accuracy: 70, practiceCount: 8, trend: "stable" },
];

export const mockWeeklyScores: WeeklyScore[] = [
  { week: "Jan 6", score: 55 },
  { week: "Jan 13", score: 58 },
  { week: "Jan 20", score: 56 },
  { week: "Jan 27", score: 61 },
  { week: "Feb 3", score: 60 },
  { week: "Feb 10", score: 64 },
  { week: "Feb 17", score: 67 },
  { week: "Feb 24", score: 70 },
  { week: "Mar 2", score: 72 },
];
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add comprehensive mock data for all MVP pages"
```

---

### Task 5: Auth Setup

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/providers/AuthProvider.tsx`
- Create: `.env.local`

**Step 1: Install Auth.js**

```bash
pnpm add next-auth@beta
```

**Step 2: Create auth config**

`src/auth.ts`:
```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // TODO: Replace with real user lookup
        if (credentials?.email === "demo@nativespeech.ai" && credentials?.password === "demo") {
          return {
            id: "1",
            name: "Demo User",
            email: "demo@nativespeech.ai",
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
});
```

**Step 3: Create route handler**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

**Step 4: Create AuthProvider**

`src/providers/AuthProvider.tsx`:
```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 5: Create .env.local**

`.env.local`:
```
AUTH_SECRET=generate-a-real-secret-here
AUTH_GOOGLE_ID=placeholder
AUTH_GOOGLE_SECRET=placeholder
```

Run `npx auth secret` to generate a real AUTH_SECRET.

**Step 6: Add .env.local to .gitignore**

Verify `.env.local` is already in `.gitignore` (create-next-app includes it by default).

**Step 7: Wire AuthProvider into root layout**

Update `src/app/layout.tsx` to wrap children with `AuthProvider` inside `ThemeProvider`:
```tsx
import { AuthProvider } from "@/providers/AuthProvider";
// ... existing imports ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js v5 with Google + credentials providers"
```

---

### Task 6: Marketing Layout & Nav

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/components/marketing/Nav.tsx` + `Nav.module.css`
- Create: `src/components/marketing/Footer.tsx` + `Footer.module.css`
- Move: `src/app/page.tsx` → `src/app/(marketing)/page.tsx`

**Step 1: Create marketing Nav**

`src/components/marketing/Nav.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./Nav.module.css";

export function Nav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>◉</span>
        <span className={styles.logoText}>NativeSpeech</span>
      </Link>
      <div className={styles.links}>
        <Link href="/#features" className={styles.link}>Features</Link>
        <Link href="/pricing" className={styles.link}>Pricing</Link>
        <Link href="/about" className={styles.link}>About</Link>
      </div>
      <div className={styles.actions}>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm">Get Started</Button>
        </Link>
      </div>
    </nav>
  );
}
```

`src/components/marketing/Nav.module.css`:
```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.logoMark {
  font-size: 1.5rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logoText {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.links {
  display: flex;
  gap: var(--space-lg);
}

.link {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.link:hover {
  color: var(--color-text);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

@media (max-width: 768px) {
  .links {
    display: none;
  }
}
```

**Step 2: Create marketing Footer**

`src/components/marketing/Footer.tsx`:
```tsx
import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>◉ NativeSpeech</span>
          <p className={styles.tagline}>Your AI-Powered Accent Coach</p>
        </div>
        <div className={styles.columns}>
          <div>
            <h4 className={styles.heading}>Product</h4>
            <Link href="/#features" className={styles.link}>Features</Link>
            <Link href="/pricing" className={styles.link}>Pricing</Link>
          </div>
          <div>
            <h4 className={styles.heading}>Company</h4>
            <Link href="/about" className={styles.link}>About</Link>
          </div>
          <div>
            <h4 className={styles.heading}>Legal</h4>
            <span className={styles.link}>Privacy</span>
            <span className={styles.link}>Terms</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 NativeSpeechAI. All rights reserved.</span>
      </div>
    </footer>
  );
}
```

`src/components/marketing/Footer.module.css`:
```css
.footer {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-xxl);
}

.inner {
  display: flex;
  justify-content: space-between;
  gap: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.brand {
  max-width: 240px;
}

.logo {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 1.125rem;
}

.tagline {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-top: var(--space-xs);
}

.columns {
  display: flex;
  gap: var(--space-xxl);
}

.heading {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
}

.link {
  display: block;
  color: var(--color-text);
  font-size: 0.875rem;
  padding: 2px 0;
  transition: color 0.2s ease;
}

.link:hover {
  color: var(--color-primary-light);
}

.bottom {
  border-top: 1px solid var(--color-border);
  padding: var(--space-md) var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .inner {
    flex-direction: column;
  }
  .columns {
    gap: var(--space-xl);
  }
}
```

**Step 3: Create marketing layout**

`src/app/(marketing)/layout.tsx`:
```tsx
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

**Step 4: Move landing page to marketing group**

Move `src/app/page.tsx` → `src/app/(marketing)/page.tsx` (keeping a minimal placeholder for now).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add marketing layout with Nav and Footer"
```

---

### Task 7: Landing Page

**Files:**
- Create: `src/components/marketing/Hero.tsx` + `Hero.module.css`
- Create: `src/components/marketing/Features.tsx` + `Features.module.css`
- Create: `src/components/marketing/PricingPreview.tsx` + `PricingPreview.module.css`
- Modify: `src/app/(marketing)/page.tsx`

**Step 1: Hero section**

`src/components/marketing/Hero.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          Your accent has a pattern.
          <br />
          <span className={styles.accent}>We decode it.</span>
        </h1>
        <p className={styles.subtitle}>
          AI-powered coaching that diagnoses exactly why you mispronounce sounds
          based on your native language — then builds personalized drills to fix them.
        </p>
        <div className={styles.actions}>
          <Link href="/sign-up">
            <Button size="lg">Start Free Assessment</Button>
          </Link>
          <Link href="/#features">
            <Button variant="secondary" size="lg">See How It Works</Button>
          </Link>
        </div>
      </div>
      <div className={styles.visual}>
        {/* Concentric circle visualization — Resonant Geometry motif */}
        <svg viewBox="0 0 400 400" className={styles.rings}>
          {[160, 130, 100, 70, 40].map((r, i) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1"
              opacity={0.15 + i * 0.1}
            />
          ))}
          <circle cx="200" cy="200" r="6" fill="var(--color-accent)" />
        </svg>
      </div>
    </section>
  );
}
```

`src/components/marketing/Hero.module.css`:
```css
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-xl);
  min-height: 70vh;
}

.content {
  max-width: 560px;
}

.title {
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-weight: 200;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.accent {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin-top: var(--space-lg);
  font-size: 1.125rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  max-width: 480px;
}

.actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.visual {
  flex-shrink: 0;
}

.rings {
  width: 400px;
  height: 400px;
  animation: rotate 60s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 968px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding-top: var(--space-xl);
  }
  .title {
    font-size: 2.5rem;
  }
  .subtitle {
    margin-left: auto;
    margin-right: auto;
  }
  .actions {
    justify-content: center;
  }
  .rings {
    width: 280px;
    height: 280px;
  }
}
```

**Step 2: Features section**

`src/components/marketing/Features.tsx`:
```tsx
import { Card } from "@/components/ui";
import styles from "./Features.module.css";

const features = [
  {
    title: "L1-L2 Diagnosis",
    description: "We analyze why you mispronounce sounds based on your native language patterns — not just what you got wrong.",
    icon: "◎",
  },
  {
    title: "Personalized Drills",
    description: "Every exercise targets your specific weak spots with sentences designed to challenge exactly the sounds you struggle with.",
    icon: "◇",
  },
  {
    title: "Real Score Tracking",
    description: "Watch your pronunciation score improve over time with detailed per-phoneme analytics, not vague percentage grades.",
    icon: "◈",
  },
  {
    title: "Multi-Language",
    description: "Starting with English and German, expanding to cover the most demanded language pairs worldwide.",
    icon: "◉",
  },
];

export function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>How It Works</h2>
        <p className={styles.subheading}>Expert-level accent coaching, available to everyone.</p>
        <div className={styles.grid}>
          {features.map((f) => (
            <Card key={f.title} variant="outlined">
              <div className={styles.feature}>
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
```

`src/components/marketing/Features.module.css`:
```css
.section {
  padding: var(--space-xxl) 0;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
}

.heading {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 200;
  text-align: center;
  letter-spacing: -0.02em;
}

.subheading {
  text-align: center;
  color: var(--color-text-muted);
  margin-top: var(--space-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-xl);
}

.feature {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.icon {
  font-size: 1.5rem;
  color: var(--color-primary-light);
}

.featureTitle {
  font-size: 1.125rem;
  font-weight: 500;
}

.featureDesc {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}
```

**Step 3: Pricing preview**

`src/components/marketing/PricingPreview.tsx`:
```tsx
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import styles from "./PricingPreview.module.css";

export function PricingPreview() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Simple Pricing</h2>
        <div className={styles.grid}>
          <Card variant="outlined">
            <div className={styles.plan}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.price}>$0</div>
              <ul className={styles.features}>
                <li>Basic accent assessment</li>
                <li>3 practice drills</li>
                <li>1 language</li>
              </ul>
              <Link href="/sign-up"><Button variant="secondary" size="md">Get Started</Button></Link>
            </div>
          </Card>
          <Card variant="elevated">
            <div className={styles.plan}>
              <h3 className={styles.planName}>Premium</h3>
              <div className={styles.price}>$14.99<span className={styles.period}>/mo</span></div>
              <ul className={styles.features}>
                <li>Full AI diagnosis</li>
                <li>Unlimited drills</li>
                <li>All languages</li>
                <li>Progress tracking</li>
              </ul>
              <Link href="/sign-up"><Button size="md">Start Free Trial</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
```

`src/components/marketing/PricingPreview.module.css`:
```css
.section {
  padding: var(--space-xxl) 0;
}

.inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
}

.heading {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 200;
  text-align: center;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-xl);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.plan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
}

.planName {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.price {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 200;
}

.period {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

**Step 4: Assemble the landing page**

`src/app/(marketing)/page.tsx`:
```tsx
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { PricingPreview } from "@/components/marketing/PricingPreview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <PricingPreview />
    </>
  );
}
```

**Step 5: Verify the landing page**

```bash
pnpm dev
```

Open http://localhost:3000 — confirm Hero, Features, and Pricing render with dark theme.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add landing page with Hero, Features, and Pricing sections"
```

---

### Task 8: Sign-In & Sign-Up Pages

**Files:**
- Create: `src/app/(marketing)/sign-in/page.tsx` + `page.module.css`
- Create: `src/app/(marketing)/sign-up/page.tsx` + `page.module.css`

**Step 1: Sign-In page**

`src/app/(marketing)/sign-in/page.tsx`:
```tsx
import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Welcome back</h1>
          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
              <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
              <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className={styles.submitBtn}>Sign In</Button>
          </form>
          <div className={styles.divider}><span>or</span></div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              Continue with Google
            </Button>
          </form>
          <p className={styles.footer}>
            Don&apos;t have an account? <Link href="/sign-up" className={styles.link}>Sign up</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

`src/app/(marketing)/sign-in/page.module.css`:
```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: var(--space-xl);
}

.form {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 300;
  text-align: center;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.submitBtn {
  width: 100%;
  margin-top: var(--space-sm);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.footer {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.link {
  color: var(--color-primary-light);
}
```

**Step 2: Sign-Up page**

`src/app/(marketing)/sign-up/page.tsx`:
```tsx
import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Start your journey</h1>
          <p className={styles.subtitle}>Free accent assessment — no credit card required.</p>
          <form
            action={async (formData) => {
              "use server";
              // TODO: Create user, then sign in
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
              <Input label="Name" name="name" type="text" placeholder="Your name" required />
              <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
              <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className={styles.submitBtn}>Create Account</Button>
          </form>
          <div className={styles.divider}><span>or</span></div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              Continue with Google
            </Button>
          </form>
          <p className={styles.footer}>
            Already have an account? <Link href="/sign-in" className={styles.link}>Sign in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

Reuse the same `page.module.css` pattern (copy from sign-in, add `.subtitle`):
```css
/* Same as sign-in plus: */
.subtitle {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add sign-in and sign-up pages with credentials + Google"
```

---

### Task 9: App Layout (Sidebar + Header + Auth Guard)

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app/Sidebar.tsx` + `Sidebar.module.css`
- Create: `src/components/app/Header.tsx` + `Header.module.css`
- Create: `src/app/(app)/layout.module.css`

**Step 1: Create components/app directory**

```bash
mkdir -p src/components/app
```

**Step 2: Sidebar component**

`src/components/app/Sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/practice", label: "Practice", icon: "◇" },
  { href: "/progress", label: "Progress", icon: "◈" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
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
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile bottom tab bar */}
      <nav className={styles.tabBar}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.tab} ${pathname.startsWith(item.href) ? styles.active : ""}`}
          >
            <span className={styles.tabIcon}>{item.icon}</span>
            <span className={styles.tabLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
```

`src/components/app/Sidebar.module.css`:
```css
.sidebar {
  width: 220px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-lg) var(--space-md);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
  padding: 0 var(--space-sm);
}

.logoMark {
  font-size: 1.25rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logoText {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 1rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.navItem {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.navItem:hover {
  color: var(--color-text);
  background: var(--color-surface-alt);
}

.navItem.active {
  color: var(--color-text);
  background: var(--color-surface-alt);
}

.navItem.active .icon {
  color: var(--color-primary-light);
}

.icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

/* Mobile tab bar */
.tabBar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--space-xs) 0;
  z-index: 100;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  padding: var(--space-xs);
  color: var(--color-text-muted);
  font-size: 0.625rem;
}

.tab.active {
  color: var(--color-primary-light);
}

.tabIcon {
  font-size: 1.25rem;
}

.tabLabel {
  font-size: 0.625rem;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .tabBar {
    display: flex;
  }
}
```

**Step 3: Header component**

`src/components/app/Header.tsx`:
```tsx
import { auth, signOut } from "@/auth";
import { Badge, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export async function Header() {
  const session = await auth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          Hi, {session?.user?.name ?? mockUser.name}
        </h2>
      </div>
      <div className={styles.right}>
        <Badge variant="accent">Score: {mockUser.overallScore}</Badge>
        <Badge variant="success">{mockUser.streak} day streak</Badge>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button variant="ghost" size="sm" type="submit">Sign Out</Button>
        </form>
      </div>
    </header>
  );
}
```

`src/components/app/Header.module.css`:
```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.greeting {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 300;
}

.right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

@media (max-width: 768px) {
  .header {
    padding: var(--space-sm) var(--space-md);
  }
  .greeting {
    font-size: 1rem;
  }
}
```

**Step 4: App layout with auth guard**

`src/app/(app)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/app/Sidebar";
import { Header } from "@/components/app/Header";
import styles from "./layout.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

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

`src/app/(app)/layout.module.css`:
```css
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: var(--space-lg);
}

@media (max-width: 768px) {
  .main {
    margin-left: 0;
    padding-bottom: 72px; /* space for tab bar */
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app layout with sidebar, header, and auth guard"
```

---

### Task 10: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx` + `page.module.css`
- Create: `src/components/dashboard/ScoreOverview.tsx` + `ScoreOverview.module.css`
- Create: `src/components/dashboard/RecentSessions.tsx` + `RecentSessions.module.css`
- Create: `src/components/dashboard/WeakSpots.tsx` + `WeakSpots.module.css`

**Step 1: ScoreOverview component**

`src/components/dashboard/ScoreOverview.tsx`:
```tsx
import { ProgressRing } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./ScoreOverview.module.css";

export function ScoreOverview() {
  return (
    <div className={styles.overview}>
      <ProgressRing value={mockUser.overallScore} size={160} label="overall" />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{mockUser.streak}</span>
          <span className={styles.statLabel}>Day Streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>24</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>6h</span>
          <span className={styles.statLabel}>Total Practice</span>
        </div>
      </div>
    </div>
  );
}
```

`src/components/dashboard/ScoreOverview.module.css`:
```css
.overview {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
}

.stats {
  display: flex;
  gap: var(--space-xl);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.statValue {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 300;
}

.statLabel {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
  .overview {
    flex-direction: column;
  }
}
```

**Step 2: RecentSessions component**

`src/components/dashboard/RecentSessions.tsx`:
```tsx
import { Card, Badge } from "@/components/ui";
import { mockRecentSessions } from "@/lib/mock-data";
import styles from "./RecentSessions.module.css";

export function RecentSessions() {
  return (
    <div>
      <h3 className={styles.heading}>Recent Sessions</h3>
      <div className={styles.list}>
        {mockRecentSessions.map((session) => (
          <Card key={session.id} variant="outlined">
            <div className={styles.session}>
              <div>
                <span className={styles.name}>{session.categoryName}</span>
                <span className={styles.date}>{session.date}</span>
              </div>
              <div className={styles.meta}>
                <Badge variant={session.score >= 70 ? "success" : "default"}>
                  {session.score}%
                </Badge>
                <span className={styles.duration}>{session.duration}min</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

`src/components/dashboard/RecentSessions.module.css`:
```css
.heading {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.session {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name {
  font-weight: 500;
  display: block;
}

.date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.duration {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
```

**Step 3: WeakSpots component**

`src/components/dashboard/WeakSpots.tsx`:
```tsx
import { Card, Badge } from "@/components/ui";
import { mockWeakSpots } from "@/lib/mock-data";
import styles from "./WeakSpots.module.css";

const trendLabels = { improving: "↑", declining: "↓", stable: "→" };
const trendVariants = { improving: "success", declining: "error", stable: "default" } as const;

export function WeakSpots() {
  return (
    <div>
      <h3 className={styles.heading}>Your Weak Spots</h3>
      <div className={styles.grid}>
        {mockWeakSpots.map((spot) => (
          <Card key={spot.phoneme} variant="outlined">
            <div className={styles.spot}>
              <span className={styles.phoneme}>{spot.phoneme}</span>
              <span className={styles.example}>{spot.example}</span>
              <div className={styles.meta}>
                <span className={styles.accuracy}>{spot.accuracy}%</span>
                <Badge variant={trendVariants[spot.trend]}>
                  {trendLabels[spot.trend]} {spot.trend}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

`src/components/dashboard/WeakSpots.module.css`:
```css
.heading {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-sm);
}

.spot {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.phoneme {
  font-family: var(--font-mono);
  font-size: 1.75rem;
  color: var(--color-primary-light);
}

.example {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.accuracy {
  font-weight: 600;
  font-size: 0.875rem;
}
```

**Step 4: Dashboard page**

`src/app/(app)/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <ScoreOverview />
      <Link href="/practice">
        <Button size="lg">Start Practice</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots />
        <RecentSessions />
      </div>
    </div>
  );
}
```

`src/app/(app)/dashboard/page.module.css`:
```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  max-width: 960px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard page with score ring, weak spots, recent sessions"
```

---

### Task 11: Practice Pages

**Files:**
- Create: `src/app/(app)/practice/page.tsx` + `page.module.css`
- Create: `src/app/(app)/practice/[drillId]/page.tsx` + `page.module.css`
- Create: `src/components/practice/DrillGrid.tsx` + `DrillGrid.module.css`
- Create: `src/components/practice/DrillSession.tsx` + `DrillSession.module.css`

**Step 1: DrillGrid component**

`src/components/practice/DrillGrid.tsx`:
```tsx
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { mockDrillCategories } from "@/lib/mock-data";
import styles from "./DrillGrid.module.css";

const difficultyVariants = { beginner: "success", intermediate: "accent", advanced: "error" } as const;

export function DrillGrid() {
  return (
    <div className={styles.grid}>
      {mockDrillCategories.map((drill) => (
        <Link key={drill.id} href={`/practice/${drill.id}`}>
          <Card variant="outlined" className={styles.card}>
            <div className={styles.drill}>
              <span className={styles.icon}>{drill.icon}</span>
              <h3 className={styles.name}>{drill.name}</h3>
              <p className={styles.desc}>{drill.description}</p>
              <div className={styles.meta}>
                <Badge variant={difficultyVariants[drill.difficulty]}>{drill.difficulty}</Badge>
                <span className={styles.time}>{drill.estimatedMinutes} min</span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

`src/components/practice/DrillGrid.module.css`:
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.card {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.drill {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.icon {
  font-size: 2rem;
  font-family: var(--font-mono);
  color: var(--color-primary-light);
}

.name {
  font-size: 1.125rem;
  font-weight: 500;
}

.desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
```

**Step 2: Practice index page**

`src/app/(app)/practice/page.tsx`:
```tsx
import { DrillGrid } from "@/components/practice/DrillGrid";
import styles from "./page.module.css";

export default function PracticePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Practice</h1>
      <p className={styles.subtitle}>Choose a drill to start practicing.</p>
      <DrillGrid />
    </div>
  );
}
```

`src/app/(app)/practice/page.module.css`:
```css
.page {
  max-width: 960px;
}

.title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 200;
}

.subtitle {
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
  margin-bottom: var(--space-xl);
}
```

**Step 3: Drill session page**

`src/components/practice/DrillSession.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { DrillSession as DrillSessionType } from "@/lib/mock-data";
import styles from "./DrillSession.module.css";

interface DrillSessionProps {
  drills: DrillSessionType[];
  categoryName: string;
}

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const drill = drills[currentIndex];

  if (!drill) return <p>No drills available for this category.</p>;

  return (
    <div className={styles.session}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <span className={styles.counter}>
          {currentIndex + 1} / {drills.length}
        </span>
      </div>

      <Card variant="elevated">
        <div className={styles.promptArea}>
          <p className={styles.instruction}>Read this aloud:</p>
          <p className={styles.prompt}>{drill.prompt}</p>
          <div className={styles.phonemes}>
            {drill.targetPhonemes.map((p) => (
              <span key={p} className={styles.phoneme}>{p}</span>
            ))}
          </div>
        </div>
      </Card>

      <button
        className={`${styles.recordBtn} ${isRecording ? styles.recording : ""}`}
        onClick={() => setIsRecording(!isRecording)}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <span className={styles.recordIcon}>{isRecording ? "■" : "●"}</span>
        <span>{isRecording ? "Stop" : "Record"}</span>
      </button>

      <Card variant="outlined">
        <div className={styles.feedback}>
          <p className={styles.feedbackText}>
            {isRecording
              ? "Listening..."
              : "Your pronunciation feedback will appear here after recording."}
          </p>
        </div>
      </Card>

      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.min(drills.length - 1, currentIndex + 1))}
          disabled={currentIndex === drills.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

`src/components/practice/DrillSession.module.css`:
```css
.session {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 200;
}

.counter {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.promptArea {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.instruction {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.prompt {
  font-size: 1.25rem;
  line-height: 1.7;
}

.phonemes {
  display: flex;
  gap: var(--space-sm);
}

.phoneme {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  padding: 2px var(--space-sm);
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--radius-sm);
  color: var(--color-primary-light);
}

.recordBtn {
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100px;
  height: 100px;
  justify-content: center;
}

.recordBtn:hover {
  border-color: var(--color-primary);
}

.recordBtn.recording {
  border-color: var(--color-error);
  animation: pulse 1.5s ease infinite;
}

.recordIcon {
  font-size: 1.5rem;
}

.recording .recordIcon {
  color: var(--color-error);
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
}

.feedback {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedbackText {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.nav {
  display: flex;
  justify-content: space-between;
}
```

**Step 4: Drill session page route**

`src/app/(app)/practice/[drillId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { mockDrillCategories, mockDrillSessions } from "@/lib/mock-data";
import { DrillSession } from "@/components/practice/DrillSession";

interface Props {
  params: Promise<{ drillId: string }>;
}

export default async function DrillPage({ params }: Props) {
  const { drillId } = await params;
  const category = mockDrillCategories.find((c) => c.id === drillId);
  const drills = mockDrillSessions[drillId];

  if (!category) notFound();

  return (
    <DrillSession
      drills={drills ?? []}
      categoryName={category.name}
    />
  );
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add practice page with drill grid and drill session UI"
```

---

### Task 12: Progress Page

**Files:**
- Create: `src/app/(app)/progress/page.tsx` + `page.module.css`
- Create: `src/components/progress/ScoreTrend.tsx` + `ScoreTrend.module.css`
- Create: `src/components/progress/PhonemeTable.tsx` + `PhonemeTable.module.css`
- Create: `src/components/progress/StreakTracker.tsx` + `StreakTracker.module.css`

**Step 1: ScoreTrend (SVG line chart)**

`src/components/progress/ScoreTrend.tsx`:
```tsx
import { mockWeeklyScores } from "@/lib/mock-data";
import styles from "./ScoreTrend.module.css";

export function ScoreTrend() {
  const scores = mockWeeklyScores;
  const maxScore = 100;
  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = scores.map((s, i) => ({
    x: padding + (i / (scores.length - 1)) * chartWidth,
    y: padding + chartHeight - (s.score / maxScore) * chartHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <h3 className={styles.heading}>Score Trend</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart}>
        {/* Grid lines */}
        {[25, 50, 75, 100].map((v) => {
          const y = padding + chartHeight - (v / maxScore) * chartHeight;
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--color-border)" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fill="var(--color-text-muted)" fontSize="10">{v}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke="url(#trendGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
        ))}
        {/* Week labels */}
        {scores.map((s, i) => (
          <text key={i} x={points[i].x} y={height - 8} textAnchor="middle" fill="var(--color-text-muted)" fontSize="9">
            {s.week}
          </text>
        ))}
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
```

`src/components/progress/ScoreTrend.module.css`:
```css
.heading {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart {
  width: 100%;
  max-width: 600px;
}
```

**Step 2: PhonemeTable**

`src/components/progress/PhonemeTable.tsx`:
```tsx
import { Badge } from "@/components/ui";
import { mockPhonemeProgress } from "@/lib/mock-data";
import styles from "./PhonemeTable.module.css";

const trendVariants = { improving: "success", declining: "error", stable: "default" } as const;
const trendLabels = { improving: "↑ Improving", declining: "↓ Declining", stable: "→ Stable" };

export function PhonemeTable() {
  return (
    <div>
      <h3 className={styles.heading}>Per-Phoneme Breakdown</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Phoneme</th>
            <th>Name</th>
            <th>Accuracy</th>
            <th>Practice</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {mockPhonemeProgress.map((p) => (
            <tr key={p.phoneme}>
              <td className={styles.phoneme}>{p.phoneme}</td>
              <td>{p.name}</td>
              <td>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${p.accuracy}%` }} />
                  <span className={styles.barLabel}>{p.accuracy}%</span>
                </div>
              </td>
              <td className={styles.count}>{p.practiceCount}x</td>
              <td><Badge variant={trendVariants[p.trend]}>{trendLabels[p.trend]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`src/components/progress/PhonemeTable.module.css`:
```css
.heading {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.table td {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.phoneme {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--color-primary-light);
}

.bar {
  position: relative;
  width: 100px;
  height: 6px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.barFill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
}

.barLabel {
  position: absolute;
  right: -36px;
  top: -5px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.count {
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}
```

**Step 3: StreakTracker**

`src/components/progress/StreakTracker.tsx`:
```tsx
import { Card } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./StreakTracker.module.css";

export function StreakTracker() {
  // Mock last 7 days (1 = practiced, 0 = missed)
  const days = [1, 1, 0, 1, 1, 1, 1];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card variant="outlined">
      <div className={styles.tracker}>
        <h3 className={styles.heading}>This Week</h3>
        <div className={styles.streakValue}>{mockUser.streak} day streak 🔥</div>
        <div className={styles.days}>
          {days.map((practiced, i) => (
            <div key={i} className={styles.day}>
              <div className={`${styles.dot} ${practiced ? styles.active : ""}`} />
              <span className={styles.label}>{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

`src/components/progress/StreakTracker.module.css`:
```css
.tracker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  align-items: center;
}

.heading {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.streakValue {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 300;
}

.days {
  display: flex;
  gap: var(--space-md);
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
}

.dot.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}
```

**Step 4: Progress page**

`src/app/(app)/progress/page.tsx`:
```tsx
import { ScoreTrend } from "@/components/progress/ScoreTrend";
import { PhonemeTable } from "@/components/progress/PhonemeTable";
import { StreakTracker } from "@/components/progress/StreakTracker";
import styles from "./page.module.css";

export default function ProgressPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Progress</h1>
      <StreakTracker />
      <ScoreTrend />
      <PhonemeTable />
    </div>
  );
}
```

`src/app/(app)/progress/page.module.css`:
```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  max-width: 960px;
}

.title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 200;
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add progress page with score trend, phoneme table, streak tracker"
```

---

### Task 13: Settings Page

**Files:**
- Create: `src/app/(app)/settings/page.tsx` + `page.module.css`

**Step 1: Settings page**

`src/app/(app)/settings/page.tsx`:
```tsx
import { Card, Input, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.fields}>
            <Input label="Name" defaultValue={mockUser.name} />
            <Input label="Email" type="email" defaultValue={mockUser.email} />
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Language Settings</h2>
          <div className={styles.fields}>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>Native Language</label>
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
              <label className={styles.label}>Target Language</label>
              <select className={styles.select} defaultValue={mockUser.targetLanguage}>
                <option>English</option>
                <option>German</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Subscription</h2>
          <p className={styles.planStatus}>Free Plan</p>
          <Button variant="primary">Upgrade to Premium</Button>
        </div>
      </Card>
    </div>
  );
}
```

`src/app/(app)/settings/page.module.css`:
```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 600px;
}

.title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 200;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.sectionTitle {
  font-size: 1rem;
  font-weight: 500;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.selectWrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.select {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font: inherit;
}

.select:focus {
  border-color: var(--color-primary);
  outline: none;
}

.planStatus {
  color: var(--color-text-muted);
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add settings page with profile, language, and subscription sections"
```

---

### Task 14: Pricing & About Pages

**Files:**
- Create: `src/app/(marketing)/pricing/page.tsx` + `page.module.css`
- Create: `src/app/(marketing)/about/page.tsx` + `page.module.css`

**Step 1: Pricing page**

`src/app/(marketing)/pricing/page.tsx`:
```tsx
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pricing</h1>
      <p className={styles.subtitle}>Start free. Upgrade when you need more.</p>
      <div className={styles.grid}>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Free</h2>
            <div className={styles.price}>$0</div>
            <ul className={styles.features}>
              <li>Basic accent assessment</li>
              <li>3 practice drills per day</li>
              <li>1 language pair</li>
              <li>Basic progress overview</li>
            </ul>
            <Link href="/sign-up"><Button variant="secondary">Get Started</Button></Link>
          </div>
        </Card>
        <Card variant="elevated">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Premium</h2>
            <div className={styles.price}>$14.99<span className={styles.period}>/mo</span></div>
            <ul className={styles.features}>
              <li>Full AI diagnosis with L1-L2 analysis</li>
              <li>Unlimited personalized drills</li>
              <li>All language pairs</li>
              <li>Detailed progress tracking</li>
              <li>Per-phoneme analytics</li>
              <li>Priority support</li>
            </ul>
            <Link href="/sign-up"><Button>Start Free Trial</Button></Link>
          </div>
        </Card>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>Enterprise</h2>
            <div className={styles.price}>Custom</div>
            <ul className={styles.features}>
              <li>Everything in Premium</li>
              <li>Team management dashboard</li>
              <li>Custom onboarding programs</li>
              <li>API access</li>
              <li>Dedicated account manager</li>
            </ul>
            <Button variant="secondary">Contact Sales</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

`src/app/(marketing)/pricing/page.module.css`:
```css
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-xl);
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 200;
}

.subtitle {
  color: var(--color-text-muted);
  margin-top: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  text-align: center;
}

.plan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.planName {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.price {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 200;
}

.period {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

**Step 2: About page**

`src/app/(marketing)/about/page.tsx`:
```tsx
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About NativeSpeechAI</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Problem</h2>
        <p className={styles.text}>
          Pronunciation coaching is limited to expensive 1-on-1 sessions or generic apps that miss
          phonetic nuances. Learners receive vague feedback that fails to diagnose accents, regional
          dialects, or unclear articulation.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Our Approach</h2>
        <p className={styles.text}>
          We built the first app that diagnoses why you mispronounce sounds based on your native
          language patterns. Not just what you got wrong — but why, and how to fix it with
          personalized drills that target your specific weak spots.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Founder</h2>
        <Card variant="outlined">
          <div className={styles.founder}>
            <h3 className={styles.founderName}>Arielle Ostankova</h3>
            <p className={styles.founderRole}>Founder & CEO</p>
            <p className={styles.text}>
              18 years of software engineering. M.Sc. Informatics. Bachelor in Acting with formal
              voice training. Multilingual native speaker who has lived the pronunciation challenge
              firsthand — from Crimea to Germany to building a career in English.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
```

`src/app/(marketing)/about/page.module.css`:
```css
.page {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-xl);
}

.title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 200;
  margin-bottom: var(--space-xl);
}

.section {
  margin-bottom: var(--space-xl);
}

.sectionTitle {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 300;
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text {
  color: var(--color-text-muted);
  line-height: 1.8;
}

.founder {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.founderName {
  font-size: 1.125rem;
  font-weight: 500;
}

.founderRole {
  font-size: 0.875rem;
  color: var(--color-primary-light);
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add pricing and about pages"
```

---

### Task 15: Final Verification & Cleanup

**Step 1: Run the dev server and verify all routes**

```bash
pnpm dev
```

Verify each route loads without errors:
- `/` — Landing page with hero, features, pricing
- `/pricing` — Full pricing page
- `/about` — About page
- `/sign-in` — Sign-in form
- `/sign-up` — Sign-up form
- `/dashboard` — (redirects to sign-in if not authed)
- `/practice` — Drill grid
- `/practice/th-sounds` — Drill session
- `/progress` — Score trend, phoneme table, streak
- `/settings` — Profile and language settings

**Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

**Step 3: Run build**

```bash
pnpm build
```

Fix any TypeScript or build errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and build errors"
```

---

## Summary

| Task | Description | Est. Files |
|------|-------------|-----------|
| 1 | Initialize Next.js project | scaffolded |
| 2 | Theme system (theme.ts, ThemeProvider, globals.css) | 4 |
| 3 | UI Primitives (Button, Card, Input, Badge, ProgressRing) | 11 |
| 4 | Mock data | 1 |
| 5 | Auth setup (Auth.js v5) | 4 |
| 6 | Marketing layout + Nav + Footer | 5 |
| 7 | Landing page (Hero, Features, PricingPreview) | 7 |
| 8 | Sign-in & Sign-up pages | 4 |
| 9 | App layout (Sidebar, Header, auth guard) | 6 |
| 10 | Dashboard page | 7 |
| 11 | Practice pages | 5 |
| 12 | Progress page | 7 |
| 13 | Settings page | 2 |
| 14 | Pricing & About pages | 4 |
| 15 | Final verification & cleanup | 0 |

**Total: ~67 files, 15 tasks, 15 commits**
