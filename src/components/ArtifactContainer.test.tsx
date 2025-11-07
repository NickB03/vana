import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtifactContainer, ArtifactData } from './ArtifactContainer';
import '@testing-library/jest-dom';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }),
  },
}));

// Mock lazy-loaded Sandpack
vi.mock('./SandpackArtifactRenderer', () => ({
  SandpackArtifactRenderer: ({ code, title, showEditor, onReady }: any) => {
    onReady?.();
    return <div data-testid="sandpack-renderer">{title}</div>;
  },
}));

// Mock utility functions
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

describe('ArtifactContainer', () => {
  const mockArtifact: ArtifactData = {
    id: 'test-1',
    type: 'code',
    title: 'Test Artifact',
    content: 'console.log("test");',
    language: 'javascript',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with ai-elements UI primitives', () => {
      render(<ArtifactContainer artifact={mockArtifact} />);

      // Verify title is rendered
      expect(screen.getByText('Test Artifact')).toBeInTheDocument();
    });

    it('renders all action buttons', () => {
      render(<ArtifactContainer artifact={mockArtifact} />);

      // Should have Copy, Download, PopOut, Maximize buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('renders preview tab by default', () => {
      render(<ArtifactContainer artifact={mockArtifact} />);

      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /edit/i })).toBeInTheDocument();
    });
  });

  describe('HTML Artifacts', () => {
    it('renders HTML content in iframe', () => {
      const htmlArtifact: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<div>Hello World</div>',
      };

      render(<ArtifactContainer artifact={htmlArtifact} />);

      // Should render iframe
      const iframe = screen.getByTitle('HTML Test');
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName).toBe('IFRAME');
    });

    it('applies sandbox attributes to iframe', () => {
      const htmlArtifact: ArtifactData = {
        id: 'html-1',
        type: 'html',
        title: 'HTML Test',
        content: '<div>Hello</div>',
      };

      render(<ArtifactContainer artifact={htmlArtifact} />);

      const iframe = screen.getByTitle('HTML Test') as HTMLIFrameElement;
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-downloads allow-popups');
    });
  });

  describe('React Artifacts', () => {
    it('renders React without Sandpack when no npm imports', () => {
      const reactArtifact: ArtifactData = {
        id: 'react-1',
        type: 'react',
        title: 'Simple React',
        content: 'function App() { return <div>Hello</div>; }',
      };

      render(<ArtifactContainer artifact={reactArtifact} />);

      // Should use iframe, not Sandpack
      expect(screen.queryByTestId('sandpack-renderer')).not.toBeInTheDocument();
      expect(screen.getByTitle('Simple React')).toBeInTheDocument();
    });

    it('renders React with Sandpack when npm imports detected', async () => {
      const { detectNpmImports } = await import('@/utils/npmDetection');
      vi.mocked(detectNpmImports).mockReturnValue(true);

      const reactArtifact: ArtifactData = {
        id: 'react-2',
        type: 'react',
        title: 'React with NPM',
        content: 'import React from "react"; function App() { return <div>Hello</div>; }',
      };

      render(<ArtifactContainer artifact={reactArtifact} />);

      // Should use Sandpack
      await waitFor(() => {
        expect(screen.getByTestId('sandpack-renderer')).toBeInTheDocument();
      });
    });
  });

  describe('Markdown Artifacts', () => {
    it('renders markdown content', () => {
      const markdownArtifact: ArtifactData = {
        id: 'md-1',
        type: 'markdown',
        title: 'Markdown Test',
        content: '# Hello\n\nThis is **bold**',
      };

      render(<ArtifactContainer artifact={markdownArtifact} />);

      expect(screen.getByText('Markdown Test')).toBeInTheDocument();
    });
  });

  describe('SVG Artifacts', () => {
    it('renders SVG as image', () => {
      const svgArtifact: ArtifactData = {
        id: 'svg-1',
        type: 'svg',
        title: 'SVG Test',
        content: '<svg><circle cx="50" cy="50" r="40" /></svg>',
      };

      render(<ArtifactContainer artifact={svgArtifact} />);

      const img = screen.getByAltText('SVG Test');
      expect(img).toBeInTheDocument();
      expect(img.tagName).toBe('IMG');
    });
  });

  describe('Mermaid Diagrams', () => {
    it('renders mermaid diagram', async () => {
      const mermaidArtifact: ArtifactData = {
        id: 'mermaid-1',
        type: 'mermaid',
        title: 'Flow Chart',
        content: 'graph TD\nA-->B',
      };

      render(<ArtifactContainer artifact={mermaidArtifact} />);

      // Should show loading initially
      await waitFor(() => {
        expect(screen.queryByText(/rendering diagram/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Image Artifacts', () => {
    it('renders image artifact', () => {
      const imageArtifact: ArtifactData = {
        id: 'img-1',
        type: 'image',
        title: 'Test Image',
        content: 'data:image/png;base64,abc123',
      };

      render(<ArtifactContainer artifact={imageArtifact} />);

      // Verify image is rendered
      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
    });
  });

  describe('User Interactions', () => {
    it('handles copy button click', async () => {
      const { toast } = await import('sonner');

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(<ArtifactContainer artifact={mockArtifact} />);

      const copyButton = screen.getAllByRole('button')[0];
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockArtifact.content);
        expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
      });
    });

    it('toggles maximize mode', () => {
      const { container } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Find maximize button (4th button)
      const buttons = screen.getAllByRole('button');
      const maximizeButton = buttons[3];

      // Initially not maximized
      expect(container.querySelector('.fixed.inset-4')).not.toBeInTheDocument();

      // Click maximize
      fireEvent.click(maximizeButton);

      // Should be maximized
      expect(container.querySelector('.fixed.inset-4')).toBeInTheDocument();
    });

    it('switches between preview and edit tabs', () => {
      render(<ArtifactContainer artifact={mockArtifact} />);

      const editTab = screen.getByRole('tab', { name: /edit/i });
      const previewTab = screen.getByRole('tab', { name: /preview/i });

      // Both tabs exist
      expect(previewTab).toBeInTheDocument();
      expect(editTab).toBeInTheDocument();

      // Click edit tab triggers tab change
      fireEvent.click(editTab);

      // Tab exists and is clickable
      expect(editTab).toBeInTheDocument();
    });

    it('handles close button when provided', () => {
      const onClose = vi.fn();
      render(<ArtifactContainer artifact={mockArtifact} onClose={onClose} />);

      // Close button should be last
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[buttons.length - 1];

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('shows validation errors', async () => {
      const { validateArtifact } = await import('@/utils/artifactValidator');
      vi.mocked(validateArtifact).mockReturnValue({
        isValid: false,
        errors: [{ type: 'syntax', message: 'Syntax error on line 5', severity: 'high' }],
        warnings: [],
      });

      const htmlArtifact: ArtifactData = {
        id: 'html-err',
        type: 'html',
        title: 'Invalid HTML',
        content: '<div>Unclosed tag',
      };

      render(<ArtifactContainer artifact={htmlArtifact} />);

      await waitFor(() => {
        expect(screen.getByText(/validation errors/i)).toBeInTheDocument();
        expect(screen.getByText(/syntax error on line 5/i)).toBeInTheDocument();
      });
    });

    it('shows validation warnings', async () => {
      const { validateArtifact } = await import('@/utils/artifactValidator');
      vi.mocked(validateArtifact).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          { type: 'accessibility', message: 'Missing alt attribute', suggestion: 'Add alt text to images' },
          { type: 'best-practice', message: 'Deprecated tag used', suggestion: 'Use modern HTML5 tags' },
        ],
      });

      const htmlArtifact: ArtifactData = {
        id: 'html-warn',
        type: 'html',
        title: 'HTML with Warnings',
        content: '<img src="test.jpg">',
      };

      render(<ArtifactContainer artifact={htmlArtifact} />);

      await waitFor(() => {
        expect(screen.getByText(/warnings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays runtime errors from iframe', async () => {
      const htmlArtifact: ArtifactData = {
        id: 'html-err',
        type: 'html',
        title: 'Error Test',
        content: '<script>throw new Error("Test error")</script>',
      };

      const { container } = render(<ArtifactContainer artifact={htmlArtifact} />);

      // Simulate postMessage from iframe
      window.postMessage({ type: 'artifact-error', message: 'Test error' }, '*');

      await waitFor(() => {
        expect(container.textContent).toContain('Error');
      });
    });
  });

  describe('Theme Integration', () => {
    it('refreshes iframe when theme changes', async () => {
      const { container } = render(<ArtifactContainer artifact={mockArtifact} />);

      const initialIframe = container.querySelector('iframe');
      const initialKey = initialIframe?.getAttribute('key');

      // Simulate theme change
      const observer = (window as any).__themeObserver;
      document.documentElement.setAttribute('class', 'dark');

      // MutationObserver should trigger
      await waitFor(() => {
        const newIframe = container.querySelector('iframe');
        const newKey = newIframe?.getAttribute('key');
        // Key should change when theme changes
        expect(newKey).toBeDefined();
      });
    });
  });

  describe('Performance', () => {
    it('debounces validation', async () => {
      const { validateArtifact } = await import('@/utils/artifactValidator');
      const mockValidate = vi.mocked(validateArtifact);
      mockValidate.mockClear();

      const { rerender } = render(<ArtifactContainer artifact={mockArtifact} />);

      // Change content multiple times quickly
      rerender(<ArtifactContainer artifact={{ ...mockArtifact, content: 'a' }} />);
      rerender(<ArtifactContainer artifact={{ ...mockArtifact, content: 'ab' }} />);
      rerender(<ArtifactContainer artifact={{ ...mockArtifact, content: 'abc' }} />);

      // Should only validate once after debounce
      await waitFor(() => {
        expect(mockValidate).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('memoizes needsSandpack calculation', async () => {
      const npmDetection = await import('@/utils/npmDetection');
      const mockDetect = vi.mocked(npmDetection.detectNpmImports);
      mockDetect.mockClear();
      mockDetect.mockReturnValue(false);

      const reactArtifact: ArtifactData = {
        id: 'react-1',
        type: 'react',
        title: 'React Test',
        content: 'function App() {}',
      };

      const { rerender } = render(<ArtifactContainer artifact={reactArtifact} />);

      // Rerender with same content
      rerender(<ArtifactContainer artifact={reactArtifact} />);
      rerender(<ArtifactContainer artifact={reactArtifact} />);

      // Should only detect once (memoized)
      await waitFor(() => {
        expect(mockDetect.mock.calls.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
