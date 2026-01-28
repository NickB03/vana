import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ArtifactContainer, ArtifactData } from './ArtifactContainer';
import '@testing-library/jest-dom';

// Mock all dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }),
  },
}));

vi.mock('./SandpackArtifactRenderer', () => ({
  SandpackArtifactRenderer: ({ onReady }: any) => {
    onReady?.();
    return <div data-testid="sandpack-renderer" />;
  },
}));

vi.mock('@/utils/artifactValidator', () => ({
  validateArtifact: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: [],
  }),
  categorizeError: vi.fn().mockReturnValue({
    category: 'runtime',
    suggestion: 'Check your code',
  }),
}));

vi.mock('@/utils/themeUtils', () => ({
  generateCompleteIframeStyles: vi.fn().mockReturnValue('<style></style>'),
}));

vi.mock('@/utils/libraryDetection', () => ({
  detectAndInjectLibraries: vi.fn().mockReturnValue(''),
}));

vi.mock('@/utils/npmDetection', () => ({
  detectNpmImports: vi.fn().mockReturnValue(false),
  extractNpmDependencies: vi.fn().mockReturnValue({}),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('ArtifactContainer Performance Tests', () => {
  const mockArtifact: ArtifactData = {
    id: 'test-1',
    type: 'code',
    title: 'Test Component',
    content: 'function App() { return "Hello"; }',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    cleanup();
  });

  describe('detectAndInjectLibraries memoization', () => {
    it('should memoize library detection for same content', async () => {
      const { detectAndInjectLibraries } = await import('@/utils/libraryDetection');
      const mockDetectLibs = vi.mocked(detectAndInjectLibraries);
      mockDetectLibs.mockReturnValue('<script src="test.js"></script>');

      const htmlArtifact: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<html><body><div>Test</div></body></html>',
      };

      const { rerender } = render(<ArtifactContainer artifact={htmlArtifact} />);

      // Should call once for initial render
      expect(mockDetectLibs).toHaveBeenCalledTimes(1);

      // Rerender with same content
      rerender(<ArtifactContainer artifact={htmlArtifact} />);

      // No additional call expected since dependency (artifact.content) didn't change
      await waitFor(() => {
        expect(mockDetectLibs).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('should call detectAndInjectLibraries again when content changes', async () => {
      const { detectAndInjectLibraries } = await import('@/utils/libraryDetection');
      const mockDetectLibs = vi.mocked(detectAndInjectLibraries);
      mockDetectLibs.mockReturnValue('<script src="test.js"></script>');

      const htmlArtifact1: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<html><body><div>Test</div></body></html>',
      };

      const htmlArtifact2: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<html><body><div>Changed</div></body></html>',
      };

      const { rerender } = render(<ArtifactContainer artifact={htmlArtifact1} />);
      expect(mockDetectLibs).toHaveBeenCalledTimes(1);

      // Rerender with different content
      rerender(<ArtifactContainer artifact={htmlArtifact2} />);

      // Should call again since content changed
      await waitFor(() => {
        expect(mockDetectLibs).toHaveBeenCalledTimes(2);
      }, { timeout: 500 });
    });
  });

  describe('validation debouncing', () => {
    it('should debounce validation calls when content changes rapidly', async () => {
      vi.useFakeTimers();

      const { validateArtifact } = await import('@/utils/artifactValidator');
      const mockValidate = vi.mocked(validateArtifact);
      mockValidate.mockClear();
      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Initial render triggers useEffect with setTimeout(300ms)
      vi.advanceTimersByTime(300);
      expect(mockValidate).toHaveBeenCalledTimes(1);

      // Rapidly change content multiple times
      // Each rerender cancels the previous setTimeout and schedules a new one
      for (let i = 0; i < 5; i++) {
        rerender(<ArtifactContainer artifact={{
          ...mockArtifact,
          content: `function App() { return <div>${i}</div>; }`
        }} />);
      }

      // After 5 rapid changes, the last timeout is still pending
      // Advance time to process it
      vi.advanceTimersByTime(300);

      // Initial call (1) + final content change after debounce (1) = 2 total
      // Previous timeouts were cancelled by cleanup when dependencies changed
      expect(mockValidate).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should not call validation again if content remains unchanged', async () => {
      vi.useFakeTimers();

      const { validateArtifact } = await import('@/utils/artifactValidator');
      const mockValidate = vi.mocked(validateArtifact);
      mockValidate.mockClear();
      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Initial render triggers useEffect with setTimeout(300ms)
      vi.advanceTimersByTime(300);
      expect(mockValidate).toHaveBeenCalledTimes(1);

      // Rerender with same artifact (same content and type - dependencies don't change)
      rerender(<ArtifactContainer artifact={mockArtifact} />);

      // Advance time to process any pending timeouts
      vi.advanceTimersByTime(300);

      // Should still only be called once since content didn't change
      // The useEffect dependency array [artifact.content, artifact.type] prevents re-running
      expect(mockValidate).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('library injection memoization', () => {
    it('should only call library detection for html, code, and react types', async () => {
      const { detectAndInjectLibraries } = await import('@/utils/libraryDetection');
      const mockDetectLibs = vi.mocked(detectAndInjectLibraries);
      mockDetectLibs.mockReturnValue('');

      const markdownArtifact: ArtifactData = {
        id: 'md-1',
        type: 'markdown',
        title: 'Markdown Test',
        content: '# Hello World',
      };

      render(<ArtifactContainer artifact={markdownArtifact} />);

      // Should not call detectAndInjectLibraries for markdown type
      expect(mockDetectLibs).not.toHaveBeenCalled();
    });

    it('should call library detection for html, code, and react artifacts', async () => {
      const { detectAndInjectLibraries } = await import('@/utils/libraryDetection');
      const mockDetectLibs = vi.mocked(detectAndInjectLibraries);
      mockDetectLibs.mockReturnValue('');

      const htmlArtifact: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<html><body>Test</body></html>',
      };

      render(<ArtifactContainer artifact={htmlArtifact} />);

      // Should call detectAndInjectLibraries for html type
      expect(mockDetectLibs).toHaveBeenCalled();
    });
  });
});