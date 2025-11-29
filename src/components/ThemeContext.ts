import { createContext } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = "default" | "ocean" | "sunset" | "forest" | "gemini" | "charcoal";

export type ThemeProviderState = {
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
