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
};
