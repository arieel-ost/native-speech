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
