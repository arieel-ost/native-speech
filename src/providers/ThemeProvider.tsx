"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { type Theme, defaultTheme, themeMap } from "@/lib/theme";

const STORAGE_KEY = "nativespeech-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Color scheme (tells browser to style scrollbars, form controls, etc.)
  root.style.setProperty("color-scheme", theme.colorScheme);

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${camelToKebab(key)}`, value);
  });

  Object.entries(theme.gradients).forEach(([key, value]) => {
    root.style.setProperty(`--gradient-${key}`, value);
  });

  Object.entries(theme.radii).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--space-${key}`, value);
  });

  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Background layers
  Object.entries(theme.backgrounds).forEach(([key, value]) => {
    root.style.setProperty(`--bg-${camelToKebab(key)}`, value);
  });
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function loadSavedTheme(): Theme {
  if (typeof window === "undefined") return defaultTheme;
  try {
    const slug = localStorage.getItem(STORAGE_KEY);
    if (slug && themeMap[slug]) return themeMap[slug];
  } catch {
    // localStorage unavailable
  }
  return defaultTheme;
}

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? defaultTheme);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!initialTheme) {
      setThemeState(loadSavedTheme());
    }
  }, [initialTheme]);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t.slug);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
