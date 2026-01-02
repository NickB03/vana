import { useEffect, useState } from "react";
import { ThemeProviderContext, ThemeMode, ColorTheme } from "@/components/ThemeContext";

type ThemeProviderProps = {
  children: React.ReactNode;
};

const ENFORCED_THEME_MODE: ThemeMode = "dark";
const ENFORCED_COLOR_THEME: ColorTheme = "default";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(ENFORCED_THEME_MODE);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(ENFORCED_COLOR_THEME);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove(
      "light", "dark",
      "ocean", "ocean-light",
      "sunset", "sunset-light",
      "forest", "forest-light",
      "gemini", "gemini-light",
      "charcoal", "charcoal-light"
    );

    root.classList.add(ENFORCED_THEME_MODE);
  }, []);

  const setThemeMode = (_mode: ThemeMode) => {
    setThemeModeState(ENFORCED_THEME_MODE);
  };

  const setColorTheme = (_color: ColorTheme) => {
    setColorThemeState(ENFORCED_COLOR_THEME);
  };

  // Legacy setTheme for backwards compatibility
  const setTheme = (_theme: string) => {
    setThemeModeState(ENFORCED_THEME_MODE);
    setColorThemeState(ENFORCED_COLOR_THEME);
  };

  const value = {
    theme: ENFORCED_THEME_MODE, // For backwards compatibility
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
