import { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type ColorTheme = "default" | "ocean" | "sunset" | "forest" | "gemini" | "charcoal";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultThemeMode?: ThemeMode;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: string; // For backwards compatibility
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  setTheme: (theme: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (color: ColorTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  themeMode: "system",
  colorTheme: "default",
  setTheme: () => null,
  setThemeMode: () => null,
  setColorTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Safe localStorage getter that handles Safari private mode and quota errors
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Safari private mode, localStorage disabled, or quota exceeded
    return null;
  }
}

/**
 * Safe localStorage setter that handles Safari private mode and quota errors
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari private mode, localStorage disabled, or quota exceeded
    console.warn(`Failed to save ${key} to localStorage`);
  }
}

export function ThemeProvider({
  children,
  defaultThemeMode = "system",
  defaultColorTheme = "default",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => (safeGetItem(`${storageKey}-mode`) as ThemeMode) || defaultThemeMode
  );
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    () => (safeGetItem(`${storageKey}-color`) as ColorTheme) || defaultColorTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove(
      "light", "dark",
      "ocean", "ocean-light",
      "sunset", "sunset-light",
      "forest", "forest-light",
      "gemini", "gemini-light",
      "charcoal", "charcoal-light"
    );

    // Determine the actual mode to apply
    let actualMode: "light" | "dark" = "dark";
    if (themeMode === "system") {
      actualMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      actualMode = themeMode;
    }

    // Apply the color theme with mode suffix
    if (colorTheme === "default") {
      root.classList.add(actualMode);
    } else {
      const themeClass = actualMode === "light" ? `${colorTheme}-light` : colorTheme;
      root.classList.add(themeClass);
    }
  }, [themeMode, colorTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    safeSetItem(`${storageKey}-mode`, mode);
    setThemeModeState(mode);
  };

  const setColorTheme = (color: ColorTheme) => {
    safeSetItem(`${storageKey}-color`, color);
    setColorThemeState(color);
  };

  // Legacy setTheme for backwards compatibility
  const setTheme = (theme: string) => {
    if (theme === "light" || theme === "dark" || theme === "system") {
      setThemeMode(theme as ThemeMode);
    } else {
      setColorTheme(theme as ColorTheme);
    }
  };

  const value = {
    theme: themeMode, // For backwards compatibility
    themeMode,
    colorTheme,
    setTheme,
    setThemeMode,
    setColorTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
