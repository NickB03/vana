import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as themeUtils from '../themeUtils';

describe('themeUtils', () => {
  const originalGetComputedStyle = global.getComputedStyle;

  const mockThemeValues = (values: Record<string, string>) => {
    global.getComputedStyle = vi.fn(() => ({
      getPropertyValue: (prop: string) => values[prop] ?? '',
    })) as unknown as typeof getComputedStyle;
  };

  afterEach(() => {
    global.getComputedStyle = originalGetComputedStyle;
    vi.restoreAllMocks();
  });

  describe('extractThemeVariables', () => {
    it('returns only defined CSS variables', () => {
      mockThemeValues({
        '--background': '0 0% 100%',
        '--primary': '',
        '--radius': '8px',
      });

      const vars = themeUtils.extractThemeVariables();

      expect(vars).toMatchObject({
        '--background': '0 0% 100%',
        '--radius': '8px',
      });
      expect(vars).not.toHaveProperty('--primary'); // empty value filtered out
    });
  });

  describe('generateThemeCSS', () => {
    it('renders CSS declarations for extracted variables', () => {
      mockThemeValues({
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
      });

      const css = themeUtils.generateThemeCSS();

      expect(css).toContain(':root');
      expect(css).toContain('--background: 0 0% 0%;');
      expect(css).toContain('--foreground: 0 0% 100%;');
    });
  });

  describe('generateCompleteIframeStyles', () => {
    it('wraps theme and base styles in a <style> block', () => {
      const output = themeUtils.generateCompleteIframeStyles();

      expect(output.startsWith('<style>')).toBe(true);
      expect(output).toContain(':root');
      expect(output).toContain('body {');
      expect(output.trim().endsWith('</style>')).toBe(true);
    });
  });
});
