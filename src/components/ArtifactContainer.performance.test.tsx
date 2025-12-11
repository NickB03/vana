import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
  detectNpmImports: vi.fn(),
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
    type: 'react',
    title: 'Test React Component',
    content: 'function App() { return <div>Hello</div>; }',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    cleanup();
  });

  describe('detectNpmImports memoization', () => {
    it('should call detectNpmImports only once when artifact content remains the same', async () => {
      const { detectNpmImports } = await import('@/utils/npmDetection');
      const mockDetect = vi.mocked(detectNpmImports);
      mockDetect.mockReturnValue(false);

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Initial render
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // Rerender with same artifact prop (same reference)
      rerender(<ArtifactContainer artifact={mockArtifact} />);

      // Should not call detectNpmImports again due to memoization
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // Rerender again with same content
      rerender(<ArtifactContainer artifact={mockArtifact} />);

      // Still should only be called once
      expect(mockDetect).toHaveBeenCalledTimes(1);
    });

    it('should call detectNpmImports only once when content is identical but object reference changes', async () => {
      const { detectNpmImports } = await import('@/utils/npmDetection');
      const mockDetect = vi.mocked(detectNpmImports);
      mockDetect.mockReturnValue(false);

      // Create artifacts with same content but different object references
      const artifact1 = { ...mockArtifact, id: 'test-1' };
      const artifact2 = { ...mockArtifact, id: 'test-2' }; // Different id, same content
      const artifact3 = { ...mockArtifact, id: 'test-3' }; // Different id, same content

      const { rerender } = render(<ArtifactContainer artifact={artifact1} />);

      // Initial render
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // Rerender with different object but same content
      rerender(<ArtifactContainer artifact={artifact2} />);

      // Since useMemo depends on artifact.content, it should still memoize
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // Rerender again with different object but same content
      rerender(<ArtifactContainer artifact={artifact3} />);

      // Still should only be called once because content is the same
      expect(mockDetect).toHaveBeenCalledTimes(1);
    });

    it('should call detectNpmImports again when content actually changes', async () => {
      const { detectNpmImports } = await import('@/utils/npmDetection');
      const mockDetect = vi.mocked(detectNpmImports);
      mockDetect.mockReturnValue(false);

      const artifactWithImports = {
        ...mockArtifact,
        content: 'import React from "react"; import lodash from "lodash"; function App() { return <div>Hello</div>; }',
      };

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Initial render
      expect(mockDetect).toHaveBeenCalledTimes(1);
      expect(mockDetect).toHaveBeenCalledWith(mockArtifact.content);

      // Rerender with different content
      rerender(<ArtifactContainer artifact={artifactWithImports} />);

      // Should call detectNpmImports again because content changed
      expect(mockDetect).toHaveBeenCalledTimes(2);
      expect(mockDetect).toHaveBeenCalledWith(artifactWithImports.content);
    });
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

      // Memoization in useEffect with 300ms debounce might trigger again
      // but with rapid rerenders, it should be debounced
      // Let's wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));

      // After debounce, should not have called again
      expect(mockDetectLibs).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation memoization', () => {
    it('should debounce validation calls', async () => {
      const { validateArtifact } = await import('@/utils/artifactValidator');
      const mockValidate = vi.mocked(validateArtifact);
      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Initial render triggers validation
      expect(mockValidate).toHaveBeenCalledTimes(1);

      // Rapidly change content
      for (let i = 0; i < 5; i++) {
        rerender(<ArtifactContainer artifact={{
          ...mockArtifact,
          content: `function App() { return <div>${i}</div>; }`
        }} />);
      }

      // Should debounce and not validate for each change
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only validate once more after debouncing
      expect(mockValidate).toHaveBeenCalledTimes(2);
    });
  });
});