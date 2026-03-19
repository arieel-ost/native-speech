export interface Theme {
  name: string;
  slug: string;
  description: string;
  colorScheme: "dark" | "light";
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
    /** recording-active indicator */
    recording: string;
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
  /** Background layers applied to html & body */
  backgrounds: {
    html: string;
    body: string;
    selection: string;
    scrollbarTrack: string;
    scrollbarThumb: string;
  };
}

// ---------------------------------------------------------------------------
// Theme 1 — Clinical Focus
// Cool, precise, DAW-inspired dark theme. Electric cyan on blue-gray slate.
// Typography: Inter (geometric, highly legible at small sizes, excellent IPA
// glyph coverage via extended Latin subset) + JetBrains Mono for spectrograms.
// ---------------------------------------------------------------------------
export const clinicalFocus: Theme = {
  name: "Clinical Focus",
  slug: "clinical-focus",
  description: "Cool & precise — professional speech-lab aesthetic",
  colorScheme: "dark",
  colors: {
    primary: "#56b8e6",
    primaryLight: "#8fd4f5",
    accent: "#a78bfa",
    accentLight: "#c4b5fd",
    surface: "#0e1117",
    surfaceAlt: "#161b22",
    text: "#e6edf3",
    textMuted: "#8b949e",
    success: "#3fb950",
    error: "#f85149",
    border: "rgba(230, 237, 243, 0.10)",
    recording: "#f85149",
  },
  gradients: {
    primary: "linear-gradient(135deg, #8fd4f5 0%, #56b8e6 42%, #2d8cbf 100%)",
    accent: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)",
  },
  radii: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },
  spacing: {
    unit: "4px",
    xs: "6px",
    sm: "10px",
    md: "16px",
    lg: "24px",
    xl: "40px",
    xxl: "72px",
  },
  fonts: {
    display: "var(--font-ibm-plex-sans), system-ui, sans-serif",
    body: "var(--font-ibm-plex-sans), system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  shadows: {
    subtle: "0 12px 32px rgba(0, 0, 0, 0.30)",
    medium: "0 24px 64px rgba(0, 0, 0, 0.40)",
    glow: "0 0 0 1px rgba(86, 184, 230, 0.20), 0 16px 40px rgba(86, 184, 230, 0.12)",
  },
  backgrounds: {
    html: `
      radial-gradient(circle at 30% 0%, rgba(86, 184, 230, 0.08), transparent 40%),
      radial-gradient(circle at 80% 10%, rgba(167, 139, 250, 0.06), transparent 30%),
      linear-gradient(180deg, #12161e 0%, #0e1117 28%, #0e1117 100%)
    `,
    body: `
      radial-gradient(circle at 25% 0%, rgba(86, 184, 230, 0.05), transparent 28%),
      radial-gradient(circle at 78% 12%, rgba(167, 139, 250, 0.04), transparent 22%),
      linear-gradient(180deg, rgba(22, 27, 34, 0.9), rgba(14, 17, 23, 0.98))
    `,
    selection: "rgba(86, 184, 230, 0.28)",
    scrollbarTrack: "rgba(0, 0, 0, 0.20)",
    scrollbarThumb: "rgba(230, 237, 243, 0.14)",
  },
};

// ---------------------------------------------------------------------------
// Theme 2 — Warm Studio  (refined version of the original "Resonant Dark")
// Amber/terracotta warmth with teal accents on a deep brown-black canvas.
// Typography: IBM Plex Serif for headings (warm authority), IBM Plex Sans for
// body (crisp legibility). Both have full IPA/Latin Extended coverage +
// Cyrillic for Russian-speaking learners.
// ---------------------------------------------------------------------------
export const warmStudio: Theme = {
  name: "Warm Studio",
  slug: "warm-studio",
  description: "Warm & encouraging — cozy recording-studio feel",
  colorScheme: "dark",
  colors: {
    primary: "#d57a45",
    primaryLight: "#efb07f",
    accent: "#78b8ae",
    accentLight: "#b5e2db",
    surface: "#0f0c0a",
    surfaceAlt: "#181310",
    text: "#f6efe7",
    textMuted: "#ae9e8f",
    success: "#5fbf93",
    error: "#f07867",
    border: "rgba(246, 239, 231, 0.12)",
    recording: "#f07867",
  },
  gradients: {
    primary: "linear-gradient(135deg, #f0b07d 0%, #d57a45 42%, #9d4f2b 100%)",
    accent: "linear-gradient(135deg, #b5e2db 0%, #78b8ae 100%)",
  },
  radii: {
    sm: "8px",
    md: "14px",
    lg: "24px",
    xl: "32px",
    full: "9999px",
  },
  spacing: {
    unit: "4px",
    xs: "6px",
    sm: "10px",
    md: "16px",
    lg: "24px",
    xl: "40px",
    xxl: "72px",
  },
  fonts: {
    display: "var(--font-ibm-plex-serif), serif",
    body: "var(--font-ibm-plex-sans), sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  shadows: {
    subtle: "0 16px 40px rgba(0, 0, 0, 0.22)",
    medium: "0 28px 80px rgba(0, 0, 0, 0.32)",
    glow: "0 0 0 1px rgba(240, 176, 125, 0.18), 0 18px 45px rgba(213, 122, 69, 0.18)",
  },
  backgrounds: {
    html: `
      radial-gradient(circle at top, rgba(213, 122, 69, 0.18), transparent 32%),
      radial-gradient(circle at 85% 12%, rgba(120, 184, 174, 0.16), transparent 24%),
      linear-gradient(180deg, #16110d 0%, #0f0c0a 24%, #0f0c0a 100%)
    `,
    body: `
      radial-gradient(circle at 20% 0%, rgba(240, 176, 125, 0.1), transparent 22%),
      radial-gradient(circle at 82% 14%, rgba(120, 184, 174, 0.12), transparent 18%),
      linear-gradient(180deg, rgba(27, 20, 16, 0.92), rgba(15, 12, 10, 0.98))
    `,
    selection: "rgba(240, 176, 125, 0.28)",
    scrollbarTrack: "rgba(0, 0, 0, 0.16)",
    scrollbarThumb: "rgba(246, 239, 231, 0.18)",
  },
};

// ---------------------------------------------------------------------------
// Theme 3 — Daylight Clarity
// Light theme with warm off-white backgrounds, ink-dark text, and muted
// indigo primary. Maximizes IPA legibility on bright backgrounds. Feels like
// a well-designed language-learning workbook.
// Typography: Same IBM Plex stack — high x-height and open counters ensure
// IPA symbols remain perfectly legible on light backgrounds.
// ---------------------------------------------------------------------------
export const daylightClarity: Theme = {
  name: "Daylight Clarity",
  slug: "daylight-clarity",
  description: "Clean & airy — maximizes readability in daylight",
  colorScheme: "light",
  colors: {
    primary: "#4f46e5",
    primaryLight: "#818cf8",
    accent: "#0d9488",
    accentLight: "#5eead4",
    surface: "#ffffff",
    surfaceAlt: "#f5f3ef",
    text: "#1c1917",
    textMuted: "#78716c",
    success: "#16a34a",
    error: "#dc2626",
    border: "rgba(28, 25, 23, 0.10)",
    recording: "#dc2626",
  },
  gradients: {
    primary: "linear-gradient(135deg, #818cf8 0%, #4f46e5 42%, #3730a3 100%)",
    accent: "linear-gradient(135deg, #5eead4 0%, #0d9488 100%)",
  },
  radii: {
    sm: "8px",
    md: "12px",
    lg: "20px",
    xl: "28px",
    full: "9999px",
  },
  spacing: {
    unit: "4px",
    xs: "6px",
    sm: "10px",
    md: "16px",
    lg: "24px",
    xl: "40px",
    xxl: "72px",
  },
  fonts: {
    display: "var(--font-ibm-plex-serif), serif",
    body: "var(--font-ibm-plex-sans), sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  shadows: {
    subtle: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    medium: "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
    glow: "0 0 0 1px rgba(79, 70, 229, 0.12), 0 4px 16px rgba(79, 70, 229, 0.10)",
  },
  backgrounds: {
    html: `
      radial-gradient(circle at 30% 0%, rgba(79, 70, 229, 0.04), transparent 40%),
      radial-gradient(circle at 80% 8%, rgba(13, 148, 136, 0.03), transparent 30%),
      linear-gradient(180deg, #faf9f7 0%, #f5f3ef 100%)
    `,
    body: `
      radial-gradient(circle at 25% 0%, rgba(79, 70, 229, 0.02), transparent 30%),
      radial-gradient(circle at 80% 12%, rgba(13, 148, 136, 0.02), transparent 24%),
      linear-gradient(180deg, #faf9f7, #f5f3ef)
    `,
    selection: "rgba(79, 70, 229, 0.18)",
    scrollbarTrack: "rgba(0, 0, 0, 0.04)",
    scrollbarThumb: "rgba(28, 25, 23, 0.18)",
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const themes = [clinicalFocus, warmStudio, daylightClarity] as const;

export const themeMap: Record<string, Theme> = Object.fromEntries(
  themes.map((t) => [t.slug, t]),
);

/** Default theme */
export const defaultTheme = warmStudio;

/** Backwards-compatible alias */
export const resonantDark = warmStudio;
