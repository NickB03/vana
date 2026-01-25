/**
 * Sandpack Dark Theme Configuration
 *
 * Maps the app's HSL color palette (from index.css) to Sandpack's theme format.
 * Used to ensure consistent dark theme styling in artifact previews.
 *
 * Reference: Sandpack theme docs - https://sandpack.codesandbox.io/docs/getting-started/themes
 */

import type { SandpackTheme } from '@codesandbox/sandpack-react';

/**
 * Converts HSL values to hex color string.
 * HSL values from our CSS variables are in "H S% L%" format.
 *
 * @example hslToHex(0, 0, 0) => "#000000"
 * @example hslToHex(0, 0, 95) => "#f2f2f2"
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Sandpack dark theme matching the app's monochrome premium dark palette.
 *
 * Color mappings from index.css dark theme:
 * - background: 0 0% 0%     → Pure black (#000000)
 * - foreground: 0 0% 95%    → Light gray text (#f2f2f2)
 * - card: 0 0% 13%          → Dark gray surfaces (#212121)
 * - muted: 0 0% 25%         → Muted backgrounds (#404040)
 * - muted-foreground: 0 0% 62% → Muted text (#9e9e9e)
 * - border: 0 0% 25%        → Border color (#404040)
 * - primary: 0 0% 65%       → Interactive elements (#a6a6a6)
 */
export const sandpackDarkTheme: SandpackTheme = {
  colors: {
    // Surface colors (backgrounds)
    surface1: hslToHex(0, 0, 0),    // Pure black - main background
    surface2: hslToHex(0, 0, 13),   // Card background - editor/preview
    surface3: hslToHex(0, 0, 25),   // Elevated surfaces - tabs, panels

    // Text colors
    base: hslToHex(0, 0, 95),       // Primary text - foreground
    disabled: hslToHex(0, 0, 45),   // Disabled text
    hover: hslToHex(0, 0, 100),     // Hover state text

    // Interactive elements
    clickable: hslToHex(0, 0, 65),  // Clickable text - primary
    accent: hslToHex(215, 88, 68),  // Accent color - accent-primary

    // Status colors
    error: hslToHex(0, 72, 51),     // Destructive
    errorSurface: hslToHex(0, 72, 15), // Error background
    warning: hslToHex(45, 80, 50),  // Warning yellow
    warningSurface: hslToHex(45, 80, 15), // Warning background
  },
  syntax: {
    // Syntax highlighting colors for code readability on dark background
    plain: hslToHex(0, 0, 95),      // Regular text
    comment: { color: hslToHex(0, 0, 50), fontStyle: 'italic' },
    keyword: hslToHex(280, 60, 70), // Purple - keywords (const, function, etc.)
    tag: hslToHex(195, 70, 65),     // Cyan - JSX tags
    punctuation: hslToHex(0, 0, 70), // Gray - brackets, semicolons
    definition: hslToHex(35, 75, 65), // Orange - function names
    property: hslToHex(195, 70, 65), // Cyan - properties
    static: hslToHex(35, 75, 65),   // Orange - static values
    string: hslToHex(120, 40, 60),  // Green - strings
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"Fira Code", "Fira Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    size: '14px',
    lineHeight: '1.5',
  },
};
