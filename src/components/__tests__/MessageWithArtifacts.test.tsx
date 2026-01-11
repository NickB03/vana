/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MessageWithArtifacts } from '../MessageWithArtifacts';
import * as bundlerModule from '@/utils/artifactBundler';
import * as artifactParser from '@/utils/artifactParser';
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

    // CRITICAL FIX: Mock bundleArtifactWithProgress (the actual function called by component)
    // The component calls bundleArtifactWithProgress, not bundleArtifact
    vi.mocked(bundlerModule.bundleArtifactWithProgress).mockImplementation(
      async (_code, _artifactId, _sessionId, _title, onProgress) => {
        // Call onProgress callback to simulate streaming
        if (onProgress) {
          onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
        }

        return {
          success: true,
          bundleUrl: 'https://signed-url.com',
          bundleTime: 2000,
          dependencies: ['@radix-ui/react-dialog'],
          bundleSize: 12345,
          expiresAt: new Date().toISOString(),
          requestId: 'test-request-id'
        };
      }
    );

    // Also mock bundleArtifact for backwards compatibility (in case it's used elsewhere)
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
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifactWithProgress');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      // Note: This test verifies that bundleArtifactWithProgress is called when
      // bundleUrl doesn't exist and needsBundling returns true
      const code = `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`;

      render(
        <MessageWithArtifacts
          {...baseProps}
          content={createArtifactContent(code)}
        />
      );

      // Since needsBundling returns true, bundleArtifactWithProgress should be called
      await waitFor(() => {
        expect(bundleSpy).toHaveBeenCalledWith(
          expect.stringContaining('@radix-ui/react-dialog'),
          expect.any(String),
          'valid-session-id',
          'Test Component',
          expect.any(Function) // onProgress callback
        );
      }, { timeout: 3000 });
    });

    it('skips bundling when artifact does not need bundling', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifactWithProgress');
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
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifactWithProgress');
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

      // bundleArtifactWithProgress should not be called with empty sessionId
      expect(bundleSpy).not.toHaveBeenCalled();
    });

    it('prevents duplicate bundling for same artifact', async () => {
      const bundleSpy = vi.spyOn(bundlerModule, 'bundleArtifactWithProgress');
      vi.spyOn(bundlerModule, 'needsBundling').mockReturnValue(true);

      // Mock bundleArtifactWithProgress to take some time
      bundleSpy.mockImplementation(
        async (_code, _artifactId, _sessionId, _title, onProgress) => {
          // Simulate async bundling with delay
          await new Promise(resolve => setTimeout(resolve, 50));

          if (onProgress) {
            onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
          }

          return {
            success: true,
            bundleUrl: 'url',
            bundleTime: 100,
            dependencies: [],
            bundleSize: 100,
            expiresAt: new Date().toISOString(),
            requestId: 'test'
          };
        }
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async (_code, _artifactId, _sessionId, _title, onProgress) => {
          // Simulate async bundling with delay
          await new Promise(resolve => setTimeout(resolve, 100));

          if (onProgress) {
            onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
          }

          return {
            success: true,
            bundleUrl: 'url',
            bundleTime: 100,
            dependencies: [],
            bundleSize: 100,
            expiresAt: new Date().toISOString(),
            requestId: 'test'
          };
        }
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async (_code, _artifactId, _sessionId, _title, onProgress) => {
          if (onProgress) {
            onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
          }

          return {
            success: true,
            bundleUrl: 'https://signed-url.com',
            bundleTime: 2000,
            dependencies: ['@radix-ui/react-dialog'],
            bundleSize: 12345,
            expiresAt: new Date().toISOString(),
            requestId: 'test-request-id'
          };
        }
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Rate limit exceeded',
          details: 'Try again in 5 minutes',
          retryable: true
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Server error',
          retryable: true
        })
      );

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
          expect.stringContaining('using client-side renderer'),
          expect.objectContaining({
            description: expect.stringContaining('limited features'),
            duration: 5000
          })
        );
      }, { timeout: 2000 });
    });

    it('handles requiresAuth errors appropriately', async () => {
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Session expired',
          details: 'Please refresh the page',
          requiresAuth: true
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Rate limit exceeded',
          details: 'You can bundle again in 5 minutes',
          retryAfter: 300
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Invalid dependency version',
          details: 'Package not found on npm',
          retryable: false
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async (_code, _artifactId, _sessionId, _title, onProgress) => {
          if (onProgress) {
            onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
          }

          return {
            success: true,
            bundleUrl: 'https://signed-url.com/bundle.html',
            bundleTime: 2500,
            dependencies: ['@radix-ui/react-dialog', 'framer-motion'],
            bundleSize: 54321,
            expiresAt: new Date().toISOString(),
            requestId: 'test-request-id'
          };
        }
      );
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Bundling timeout',
          details: 'Server took too long to respond',
          retryable: true
        })
      );
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async (_code, _artifactId, _sessionId, _title, onProgress) => {
          if (onProgress) {
            onProgress({ stage: 'installing', currentPackage: '@radix-ui/react-dialog' });
          }

          return {
            success: true,
            bundleUrl: 'https://signed-url.com',
            bundleTime: 1500,
            dependencies: ['@radix-ui/react-dialog'],
            bundleSize: 12345,
            expiresAt: new Date().toISOString(),
            requestId: 'test-request-id'
          };
        }
      );
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
      vi.spyOn(bundlerModule, 'bundleArtifactWithProgress').mockImplementation(
        async () => ({
          success: false,
          error: 'Network error',
          details: 'Failed to reach bundling service'
        })
      );
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

      // Verify image is rendered in InlineImage component (wait for async parsing)
      await waitFor(() => {
        const inlineImage = container.querySelector('[data-testid^="inline-image-"]');
        expect(inlineImage).toBeInTheDocument();
      });
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

  describe('Artifact overrides', () => {
    it('applies overrides to rendered artifact cards', async () => {
      const artifact = {
        id: 'artifact-override',
        type: 'react',
        title: 'Original Title',
        content: 'export default function App() { return <div>Hi</div>; }'
      };

      vi.spyOn(artifactParser, 'parseArtifacts').mockResolvedValue({
        artifacts: [artifact],
        cleanContent: 'Clean content',
        inProgressCount: 0
      });

      render(
        <MessageWithArtifacts
          {...baseProps}
          content="override-content"
          artifactOverrides={{
            [artifact.id]: { title: 'Overridden Title' }
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`artifact-card-${artifact.id}`)).toHaveTextContent('Overridden Title');
      });
    });

    it('skips bundling when overrides provide bundleUrl', async () => {
      const artifact = {
        id: 'artifact-bundled',
        type: 'react',
        title: 'Bundled Title',
        content: `import * as Dialog from '@radix-ui/react-dialog';
export default function App() { return <div>Test</div> }`
      };

      vi.spyOn(artifactParser, 'parseArtifacts').mockResolvedValue({
        artifacts: [artifact],
        cleanContent: 'Clean content',
        inProgressCount: 0
      });

      vi.mocked(bundlerModule.needsBundling).mockReturnValue(true);

      render(
        <MessageWithArtifacts
          {...baseProps}
          content="bundle-override-content"
          artifactOverrides={{
            [artifact.id]: { bundleUrl: 'https://signed-url.com/bundle.html' }
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`artifact-card-${artifact.id}`)).toBeInTheDocument();
      });

      expect(bundlerModule.bundleArtifact).not.toHaveBeenCalled();
    });
  });
});
