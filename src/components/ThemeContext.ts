import { createContext } from "react";

export type ThemeMode = "light" | "dark";
export type ColorTheme = "default";

export type ThemeProviderState = {
  theme: string; // For backwards compatibility
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  setTheme: (theme: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (color: ColorTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  themeMode: "dark",
  colorTheme: "default",
  setTheme: () => null,
  setThemeMode: () => null,
  setColorTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);
