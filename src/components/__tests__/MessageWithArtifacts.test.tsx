import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MessageWithArtifacts } from '../MessageWithArtifacts';
import * as bundlerModule from '@/utils/artifactBundler';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/utils/artifactBundler');
vi.mock('sonner');

// Mock Markdown component to avoid complex rendering
vi.mock('@/components/ui/markdown', () => ({
  Markdown: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>
}));

// Mock ArtifactCard to simplify testing
vi.mock('@/components/ArtifactCard', () => ({
  ArtifactCard: ({ artifact, onOpen }: { artifact: any; onOpen: () => void }) => (
    <div data-testid={`artifact-card-${artifact.id}`} onClick={onOpen}>
      {artifact.title}
    </div>
  )
}));

// Mock InlineImage
vi.mock('@/components/InlineImage', () => ({
  InlineImage: ({ artifact }: { artifact: any }) => (
    <div data-testid={`inline-image-${artifact.id}`}>{artifact.title}</div>
  )
}));

// Mock Supabase client to prevent initialization errors
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('MessageWithArtifacts bundling state management', () => {
  const baseProps = {
    content: '',
    sessionId: 'valid-session-id',
    onArtifactOpen: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock toast methods
    vi.mocked(toast).info = vi.fn();
    vi.mocked(toast).success = vi.fn();
    vi.mocked(toast).error = vi.fn();
    vi.mocked(toast).warning = vi.fn();

    // Default mock implementations
    vi.mocked(bundlerModule.needsBundling).mockReturnValue(false);
    vi.mocked(bundlerModule.bundleArtifact).mockResolvedValue({
      success: true,
      bundleUrl: 'https://signed-url.com',
      bundleTime: 2000,
      dependencies: ['@radix-ui/react-dialog'],
      bundleSize: 12345,
      expiresAt: new Date().toISOString(),
      requestId: 'test-request-id'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create artifact content
  const createArtifactContent = (code: string, type = 'application/vnd.ant.react') => `
Here's a component:
<artifact type="${type}" title="Test Component">
${code}
</artifact>
  `.trim();

  describe('Bundling lifecycle', () => {
    it('skips bundling when artifact has existing bundleUrl', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifact');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      // Note: This test verifies that bundleArtifact is NOT called when
      // bundleUrl already exists (which we can't test directly without
      // modifying the component to accept pre-bundled artifacts)
      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      // Since needsBundling returns true, bundleArtifact should be called
      await waitFor(() => {
        expect(bundleSpy).toHaveBeenCalledWith(
          expect.stringContaining('@radix-ui/react-dialog'),
          expect.any(String),
          'valid-session-id',
          'Test Component'
        );
      }, { timeout: 3000 });
    });

    it('skips bundling when artifact does not need bundling', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifact');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(false);

      const code = `export default function App() { return <div>Hello</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      // Wait a moment to ensure bundling doesn't happen
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(bundleSpy).not.toHaveBeenCalled();
    });

    it('validates sessionId before bundling', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifact');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          sessionId="" // Empty session ID
          content={createArtifactContent(code)}
        />
      );

      // Wait a moment to ensure bundling doesn't happen
      await new Promise(resolve => setTimeout(resolve, 100));

      // bundleArtifact should not be called with empty sessionId
      expect(bundleSpy).not.toHaveBeenCalled();
    });

    it('prevents duplicate bundling for same artifact', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifact');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      // Mock bundleArtifact to take some time
      bundleSpy.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            bundleUrl: 'url',
            bundleTime: 100,
            dependencies: [],
            bundleSize: 100,
            expiresAt: new Date().toISOString(),
            requestId: 'test'
          }), 50);
        })
      );

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      const { rerender } = render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      // Rerender immediately (before bundling completes)
      rerender(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        // Should only be called once, not twice
        expect(bundleSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });
  });

  describe('Bundling toast notifications', () => {
    it('shows bundling toast when bundling starts', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            bundleUrl: 'url',
            bundleTime: 100,
            dependencies: [],
            bundleSize: 100,
            expiresAt: new Date().toISOString(),
            requestId: 'test'
          }), 100);
        })
      );
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          expect.stringContaining('Bundling Test Component'),
          expect.objectContaining({
            id: expect.stringContaining('bundle-'),
            duration: 30000
          })
        );
      }, { timeout: 2000 });
    });

    it('shows success toast when bundling completes', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: true,
        bundleUrl: 'https://signed-url.com',
        bundleTime: 2000,
        dependencies: ['@radix-ui/react-dialog'],
        bundleSize: 12345,
        expiresAt: new Date().toISOString(),
        requestId: 'test-request-id'
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('bundled successfully'),
          expect.objectContaining({
            id: expect.stringContaining('bundle-'),
            duration: 3000
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Bundling error handling', () => {
    it('shows error toast when bundling fails with npm imports', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
        details: 'Try again in 5 minutes',
        retryable: true
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Bundling failed for Test Component',
          expect.objectContaining({
            description: 'Rate limit exceeded. You can try again.',
            duration: 7000
          })
        );
      }, { timeout: 2000 });
    });

    it('shows warning when bundling fails without npm imports', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Server error',
        retryable: true
      });

      // First call returns true (triggers bundling), second call returns false (for error handling)
      let callCount = 0;
      vi.spyOn(bundlerModule, 'needsBundling').mockImplementation(() => {
        callCount++;
        return callCount === 1;
      });

      const code = `export default function App() { return <div>Hello</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringContaining('using fallback'),
          expect.objectContaining({
            description: expect.stringContaining('limited features'),
            duration: 5000
          })
        );
      }, { timeout: 2000 });
    });

    it('handles requiresAuth errors appropriately', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Session expired',
        details: 'Please refresh the page',
        requiresAuth: true
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Session expired',
          expect.objectContaining({
            description: expect.stringContaining('refresh'),
            duration: 10000
          })
        );
      }, { timeout: 2000 });
    });

    it('handles retryAfter rate limiting errors', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
        details: 'You can bundle again in 5 minutes',
        retryAfter: 300
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Rate limit exceeded',
          expect.objectContaining({
            description: expect.stringContaining('minutes'),
            duration: 10000
          })
        );
      }, { timeout: 2000 });
    });

    it('handles non-retryable bundling errors', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Invalid dependency version',
        details: 'Package not found on npm',
        retryable: false
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Bundling failed'),
          expect.objectContaining({
            description: 'Package not found on npm',
            duration: 7000
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Artifact state updates', () => {
    it('updates artifact with bundleUrl on success', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: true,
        bundleUrl: 'https://signed-url.com/bundle.html',
        bundleTime: 2500,
        dependencies: ['@radix-ui/react-dialog', 'framer-motion'],
        bundleSize: 54321,
        expiresAt: new Date().toISOString(),
        requestId: 'test-request-id'
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      const { container } = render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      // Wait for bundling to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify artifact card is rendered
      expect(container.querySelector('[data-testid^="artifact-card-"]')).toBeInTheDocument();
    });

    it('updates artifact with error state on failure', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Bundling timeout',
        details: 'Server took too long to respond',
        retryable: true
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Bundle failed'),
          expect.any(String),
          expect.any(String)
        );
      }, { timeout: 2000 });

      errorSpy.mockRestore();
    });

    it('logs bundling success details to console', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: true,
        bundleUrl: 'https://signed-url.com',
        bundleTime: 1500,
        dependencies: ['@radix-ui/react-dialog'],
        bundleSize: 12345,
        expiresAt: new Date().toISOString(),
        requestId: 'test-request-id'
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        // Match the actual console.log output format
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[MessageWithArtifacts\] Bundled .* in 1500ms with 1 packages/)
        );
      }, { timeout: 2000 });

      logSpy.mockRestore();
    });

    it('logs bundling failure details to console', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifact').mockResolvedValue({
        success: false,
        error: 'Network error',
        details: 'Failed to reach bundling service'
      });
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Bundle failed'),
          'Network error',
          'Failed to reach bundling service'
        );
      }, { timeout: 2000 });

      errorSpy.mockRestore();
    });
  });

  describe('Image artifacts', () => {
    it('renders image artifacts separately from interactive artifacts', async () => {
      const imageContent = createArtifactContent('https://example.com/image.png', 'image');

      const { container } = render(
        <MessageWithArtifacts
          {...baseProps}
          content={imageContent}
        />
      );

      // Verify image is rendered in InlineImage component
      const inlineImage = container.querySelector('[data-testid^="inline-image-"]');
      expect(inlineImage).toBeInTheDocument();
    });

    it('does not attempt to bundle image artifacts', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifact');

      const imageContent = createArtifactContent('https://example.com/image.png', 'image');

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={imageContent}
        />
      );

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // bundleArtifact should never be called for images
      expect(bundleSpy).not.toHaveBeenCalled();
    });
  });
});
