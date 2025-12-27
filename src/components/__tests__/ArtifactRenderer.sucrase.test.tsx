import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ArtifactRenderer } from '../ArtifactRenderer';
import { ArtifactData } from '../ArtifactContainer';
import * as featureFlags from '@/lib/featureFlags';
import * as sucraseTranspiler from '@/utils/sucraseTranspiler';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/featureFlags', async () => {
  const actual = await vi.importActual('@/lib/featureFlags');
  return {
    ...actual,
    isFeatureEnabled: vi.fn(),
  };
});

vi.mock('@/utils/sucraseTranspiler', async () => {
  const actual = await vi.importActual('@/utils/sucraseTranspiler');
  return {
    ...actual,
    transpileCode: vi.fn(),
  };
});

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
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

describe('ArtifactRenderer - Sucrase Integration Tests', () => {
  const mockOnLoadingChange = vi.fn();
  const mockOnPreviewErrorChange = vi.fn();
  const mockOnErrorCategoryChange = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnFullScreen = vi.fn();
  const mockOnAIFix = vi.fn();
  const mockOnEditedContentChange = vi.fn();

  const baseArtifact: ArtifactData = {
    id: 'test-artifact',
    type: 'react',
    title: 'Test Component',
    content: 'export default function App() { return <div>Hello</div>; }',
  };

  const baseProps = {
    artifact: baseArtifact,
    isLoading: false,
    previewError: null,
    errorCategory: 'unknown' as const,
    validation: null,
    injectedCDNs: '',
    themeRefreshKey: 0,
    isEditingCode: false,
    editedContent: '',
    isFixingError: false,
    onEditedContentChange: mockOnEditedContentChange,
    onRefresh: mockOnRefresh,
    onFullScreen: mockOnFullScreen,
    onAIFix: mockOnAIFix,
    onLoadingChange: mockOnLoadingChange,
    onPreviewErrorChange: mockOnPreviewErrorChange,
    onErrorCategoryChange: mockOnErrorCategoryChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: feature flag enabled
    vi.mocked(featureFlags.isFeatureEnabled).mockImplementation((flag) => {
      if (flag === 'SUCRASE_TRANSPILER') return true;
      return false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================
  // SUCRASE TRANSPILATION PATH TESTS
  // ============================================

  describe('Sucrase Transpilation Enabled', () => {
    it('uses Sucrase when feature flag is enabled and transpilation succeeds', () => {
      // Mock successful transpilation
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = () => React.createElement("div", null, "Hello");',
        elapsed: 5.2,
      });

      const { container } = render(<ArtifactRenderer {...baseProps} />);

      // Verify transpileCode was called
      expect(sucraseTranspiler.transpileCode).toHaveBeenCalledWith(
        expect.stringContaining('function App()'),
        expect.objectContaining({ filename: expect.stringContaining('.tsx') })
      );

      // Verify Sentry breadcrumb logged success
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'artifact.transpile',
          message: 'Sucrase transpilation successful',
          level: 'info',
        })
      );

      // Verify iframe exists
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();

      // Verify iframe HTML does NOT contain Babel script tag (pre-transpiled)
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).not.toContain('@babel/standalone');
      expect(srcDoc).not.toContain('text/babel');

      // Verify iframe HTML contains pre-transpiled code
      expect(srcDoc).toContain('React.createElement');
    });

    it('falls back to Babel when Sucrase transpilation fails', () => {
      // Mock failed transpilation
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: false,
        error: 'Transpilation failed',
        details: 'Unexpected token',
      });

      const { container } = render(<ArtifactRenderer {...baseProps} />);

      // Verify transpileCode was called
      expect(sucraseTranspiler.transpileCode).toHaveBeenCalled();

      // Verify Sentry captureException was called (captures errors to dashboard)
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Sucrase transpilation failed'),
        }),
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'ArtifactRenderer',
            transpiler: 'sucrase',
            fallback: 'babel',
          }),
        })
      );

      // Verify iframe exists with Babel template
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();

      // Verify iframe HTML DOES contain Babel script tag
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).toContain('@babel/standalone');
      expect(srcDoc).toContain('text/babel');
    });

    it('generates correct Sucrase template with module script type', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = () => React.createElement("div", null, "Test");',
        elapsed: 3.1,
      });

      const { container } = render(<ArtifactRenderer {...baseProps} />);
      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      // Verify Sucrase template uses <script type="module">
      expect(srcDoc).toContain('type="module"');

      // Verify Babel is NOT loaded
      expect(srcDoc).not.toContain('babel.min.js');
    });
  });

  // ============================================
  // BABEL FALLBACK PATH TESTS
  // ============================================

  describe('Babel Fallback', () => {
    it('uses Babel when feature flag is disabled', () => {
      // Disable Sucrase feature flag
      vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);

      const { container } = render(<ArtifactRenderer {...baseProps} />);

      // Verify transpileCode was NOT called
      expect(sucraseTranspiler.transpileCode).not.toHaveBeenCalled();

      // Verify iframe uses Babel template
      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).toContain('@babel/standalone');
      expect(srcDoc).toContain('text/babel');
    });

    it('generates correct Babel template with text/babel script type', () => {
      vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);

      const { container } = render(<ArtifactRenderer {...baseProps} />);
      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      // Verify Babel template uses <script type="text/babel">
      expect(srcDoc).toContain('type="text/babel"');
      expect(srcDoc).toContain('data-type="module"');
      expect(srcDoc).toContain('data-presets="env,react,typescript"');

      // Verify Babel is loaded
      expect(srcDoc).toContain('babel.min.js');
    });
  });

  // ============================================
  // ARTIFACT TYPE RENDERING TESTS
  // ============================================

  describe('Artifact Types', () => {
    it('transpiles simple JSX component correctly', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = () => React.createElement("div", { className: "test" }, "Content");',
        elapsed: 4.0,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: 'const App = () => <div className="test">Content</div>;',
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).toHaveBeenCalled();

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).toContain('React.createElement');
      expect(srcDoc).toContain('className');
    });

    it('transpiles TypeScript component with types', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = (props) => React.createElement("div", null, props.name);',
        elapsed: 5.5,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: `
          interface Props { name: string; }
          const App = (props: Props) => <div>{props.name}</div>;
          export default App;
        `,
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).toHaveBeenCalled();

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      // TypeScript types should be stripped
      expect(srcDoc).not.toContain('interface Props');
      expect(srcDoc).not.toContain(': Props');

      // JSX transpiled
      expect(srcDoc).toContain('React.createElement');
    });

    it('transpiles component with React hooks', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: `
          const App = () => {
            const [count, setCount] = React.useState(0);
            React.useEffect(() => { console.log(count); }, [count]);
            return React.createElement("div", null, count);
          };
        `,
        elapsed: 6.2,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: `
          const App = () => {
            const [count, setCount] = useState(0);
            useEffect(() => { console.log(count); }, [count]);
            return <div>{count}</div>;
          };
        `,
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).toHaveBeenCalled();

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).toContain('React.createElement');
    });

    it('transpiles component with React fragments', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: `
          const App = () => React.createElement(React.Fragment, null,
            React.createElement("div", null, "First"),
            React.createElement("div", null, "Second")
          );
        `,
        elapsed: 4.8,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: `
          const App = () => (
            <>
              <div>First</div>
              <div>Second</div>
            </>
          );
        `,
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).toHaveBeenCalled();

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');
      expect(srcDoc).toContain('React.Fragment');
    });
  });

  // ============================================
  // COMPONENT NAME EXTRACTION TESTS
  // ============================================

  describe('Component Name Extraction', () => {
    it('extracts component name from export default function', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'function MyComponent() { return React.createElement("div", null); }',
        elapsed: 3.5,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: 'export default function MyComponent() { return <div />; }',
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      // Verify component name is used in rendering
      expect(srcDoc).toContain('MyComponent');
    });

    it('extracts component name from const declaration', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const CustomComponent = () => React.createElement("div", null);',
        elapsed: 3.2,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: 'const CustomComponent = () => <div />;',
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      expect(srcDoc).toContain('CustomComponent');
    });

    it('falls back to "App" when no component name found', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: '() => React.createElement("div", null);',
        elapsed: 2.8,
      });

      const artifact: ArtifactData = {
        ...baseArtifact,
        content: '() => <div />;',
      };

      const { container } = render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      const iframe = container.querySelector('iframe');
      const srcDoc = iframe?.getAttribute('srcdoc');

      // Should default to "App"
      expect(srcDoc).toContain('const Component = App');
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('logs transpilation time to Sentry on success', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = () => React.createElement("div", null);',
        elapsed: 7.3,
      });

      render(<ArtifactRenderer {...baseProps} />);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'artifact.transpile',
          message: 'Sucrase transpilation successful',
          data: expect.objectContaining({
            elapsed: 7.3,
          }),
        })
      );
    });

    it('logs error details to Sentry on transpilation failure', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: false,
        error: 'Syntax error',
        details: 'Unexpected token at line 5',
      });

      render(<ArtifactRenderer {...baseProps} />);

      // Verify Sentry captureException was called with error details
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Sucrase transpilation failed'),
        }),
        expect.objectContaining({
          extra: expect.objectContaining({
            error: 'Syntax error',
            details: 'Unexpected token at line 5',
          }),
        })
      );
    });

    it('gracefully handles transpilation errors without crashing', () => {
      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: false,
        error: 'Critical error',
        details: 'Unrecoverable syntax error',
      });

      expect(() => {
        render(<ArtifactRenderer {...baseProps} />);
      }).not.toThrow();

      // Should fall back to Babel
      const calls = vi.mocked(sucraseTranspiler.transpileCode).mock.calls;
      expect(calls.length).toBe(1);
    });
  });

  // ============================================
  // EXCEPTION HANDLING TESTS
  // ============================================

  describe('Exception Handling', () => {
    it('falls back to Babel when transpileCode throws exception', () => {
      const reactArtifact: ArtifactData = {
        ...baseArtifact,
        type: 'react',
        content: 'export default function App() { return <div>Hello</div>; }',
      };

      // Simulate Sucrase library failure (not a graceful error return)
      vi.mocked(sucraseTranspiler.transpileCode).mockImplementation(() => {
        throw new Error('Sucrase module failed to load');
      });

      // Should NOT crash - should fall back to Babel
      expect(() => {
        render(<ArtifactRenderer {...baseProps} artifact={reactArtifact} />);
      }).not.toThrow();

      // Verify Babel template is used (contains @babel/standalone)
      const iframe = screen.getByTitle(reactArtifact.title);
      const srcDoc = iframe.getAttribute('srcdoc');
      expect(srcDoc).toContain('@babel/standalone');
    });

    it('reports exception to Sentry when Sucrase throws', () => {
      const reactArtifact: ArtifactData = {
        ...baseArtifact,
        type: 'react',
        content: 'export default function App() { return <div>Hello</div>; }',
      };

      const sucraseError = new Error('Unexpected Sucrase crash');
      vi.mocked(sucraseTranspiler.transpileCode).mockImplementation(() => {
        throw sucraseError;
      });

      render(<ArtifactRenderer {...baseProps} artifact={reactArtifact} />);

      // Should capture the exception (not just log a breadcrumb)
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Sucrase'),
        }),
        expect.any(Object)
      );
    });

    it('shows error toast when Sucrase throws exception', () => {
      const reactArtifact: ArtifactData = {
        ...baseArtifact,
        type: 'react',
        content: 'export default function App() { return <div>Hello</div>; }',
      };

      vi.mocked(sucraseTranspiler.transpileCode).mockImplementation(() => {
        throw new Error('Sucrase library unavailable');
      });

      render(<ArtifactRenderer {...baseProps} artifact={reactArtifact} />);

      // User should see warning toast
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('compatibility mode'),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // NON-REACT ARTIFACT TESTS
  // ============================================

  describe('Non-React Artifacts', () => {
    it('does not transpile code artifacts', () => {
      const artifact: ArtifactData = {
        ...baseArtifact,
        type: 'code',
        content: '<div>HTML content</div>',
      };

      render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      // Transpiler should not be called for non-React artifacts
      expect(sucraseTranspiler.transpileCode).not.toHaveBeenCalled();
    });

    it('does not transpile HTML artifacts', () => {
      const artifact: ArtifactData = {
        ...baseArtifact,
        type: 'html',
        content: '<!DOCTYPE html><html><body>Test</body></html>',
      };

      render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).not.toHaveBeenCalled();
    });

    it('does not transpile markdown artifacts', () => {
      const artifact: ArtifactData = {
        ...baseArtifact,
        type: 'markdown',
        content: '# Markdown Title',
      };

      render(<ArtifactRenderer {...baseProps} artifact={artifact} />);

      expect(sucraseTranspiler.transpileCode).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // PERFORMANCE LOGGING TESTS
  // ============================================

  describe('Performance Logging', () => {
    it('logs transpilation performance to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(sucraseTranspiler.transpileCode).mockReturnValue({
        success: true,
        code: 'const App = () => React.createElement("div", null);',
        elapsed: 12.5,
      });

      render(<ArtifactRenderer {...baseProps} />);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ArtifactRenderer] Sucrase transpiled in 12.50ms')
      );

      consoleSpy.mockRestore();
    });
  });
});
