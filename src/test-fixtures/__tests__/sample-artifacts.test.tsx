/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { SandpackArtifactRenderer } from '@/components/SandpackArtifactRenderer';
import { SAMPLE_ARTIFACTS, getSampleArtifact, getSampleArtifactsByComplexity } from '../sample-artifacts';

/**
 * Sample Artifact Rendering Tests
 *
 * Purpose: Validate that all sample artifacts render successfully
 * in SandpackArtifactRenderer without errors.
 *
 * Test Flow:
 * 1. Render artifact code in SandpackArtifactRenderer
 * 2. Wait for compilation (initialization timer)
 * 3. Assert no errors occurred
 *
 * Artifacts Tested:
 * - Simple Counter (basic React hooks)
 * - Todo List (state arrays)
 * - Analytics Dashboard (Recharts integration)
 * - Animated Card (Framer Motion)
 * - Icon Gallery (Lucide icons)
 * - Memory Game (complex state logic)
 */

// Mock the kibo-ui sandbox components
vi.mock('@/components/kibo-ui/sandbox', () => ({
  SandboxProvider: ({ children, files, customSetup }: any) => (
    <div data-testid="sandbox-provider" data-files={JSON.stringify(files)} data-setup={JSON.stringify(customSetup)}>
      {children}
    </div>
  ),
  SandboxLayout: ({ children }: any) => (
    <div data-testid="sandbox-layout">{children}</div>
  ),
  SandboxPreview: ({ showOpenInCodeSandbox, showRefreshButton, showNavigator }: any) => (
    <div
      data-testid="sandbox-preview"
      data-show-codesandbox={showOpenInCodeSandbox}
      data-show-refresh={showRefreshButton}
      data-show-navigator={showNavigator}
    >
      Preview Content
    </div>
  ),
  SandboxCodeEditor: ({ showTabs, showLineNumbers, showInlineErrors, wrapContent }: any) => (
    <div
      data-testid="sandbox-code-editor"
      data-show-tabs={showTabs}
      data-show-line-numbers={showLineNumbers}
      data-show-inline-errors={showInlineErrors}
      data-wrap-content={wrapContent}
    >
      Code Editor
    </div>
  ),
}));

// Mock the ArtifactSkeleton component
vi.mock('@/components/ui/artifact-skeleton', () => ({
  ArtifactSkeleton: ({ type, className }: any) => (
    <div data-testid="artifact-skeleton" data-type={type} className={className}>
      Loading...
    </div>
  ),
}));

// Mock the Alert components
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div data-testid="alert" data-variant={variant} className={className}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => (
    <div data-testid="alert-description">{children}</div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
}));

/**
 * Helper to advance fake timers and flush React updates
 */
async function advanceTimersAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('Sample Artifact Fixtures', () => {
  describe('Fixture Helpers', () => {
    it('exports all 6 sample artifacts', () => {
      expect(SAMPLE_ARTIFACTS).toHaveLength(6);
    });

    it('getSampleArtifact returns correct artifact by ID', () => {
      const counter = getSampleArtifact('counter');
      expect(counter).toBeDefined();
      expect(counter?.name).toBe('Simple Counter');
    });

    it('getSampleArtifact returns undefined for invalid ID', () => {
      const invalid = getSampleArtifact('invalid-id');
      expect(invalid).toBeUndefined();
    });

    it('getSampleArtifactsByComplexity filters correctly', () => {
      const basic = getSampleArtifactsByComplexity('basic');
      const medium = getSampleArtifactsByComplexity('medium');
      const advanced = getSampleArtifactsByComplexity('advanced');

      expect(basic).toHaveLength(3);
      expect(medium).toHaveLength(2);
      expect(advanced).toHaveLength(1);
    });

    it('all artifacts have required fields', () => {
      for (const artifact of SAMPLE_ARTIFACTS) {
        expect(artifact.id).toBeDefined();
        expect(artifact.name).toBeDefined();
        expect(artifact.complexity).toBeDefined();
        expect(artifact.description).toBeDefined();
        expect(artifact.code).toBeDefined();
        expect(artifact.code.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Sample Artifact Rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Simple Counter (basic)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'counter')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('extracts correct dependencies', async () => {
      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
        />
      );

      await advanceTimersAndFlush(1000);

      const provider = screen.getByTestId('sandbox-provider');
      const setup = JSON.parse(provider.getAttribute('data-setup') || '{}');

      expect(setup.dependencies.react).toBe('18.3.0');
      expect(setup.dependencies['react-dom']).toBe('18.3.0');
    });
  });

  describe('Todo List (basic)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'todo')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('contains state array operations', () => {
      expect(artifact.code).toContain('useState([])');
      expect(artifact.code).toContain('setTodos');
    });
  });

  describe('Analytics Dashboard (medium)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'dashboard')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('extracts recharts dependency', async () => {
      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
        />
      );

      await advanceTimersAndFlush(1000);

      const provider = screen.getByTestId('sandbox-provider');
      const setup = JSON.parse(provider.getAttribute('data-setup') || '{}');

      expect(setup.dependencies.recharts).toBeDefined();
    });

    it('contains Recharts components', () => {
      expect(artifact.code).toContain('LineChart');
      expect(artifact.code).toContain('BarChart');
      expect(artifact.code).toContain('ResponsiveContainer');
    });
  });

  describe('Animated Card (medium)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'animated-card')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('extracts framer-motion dependency', async () => {
      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
        />
      );

      await advanceTimersAndFlush(1000);

      const provider = screen.getByTestId('sandbox-provider');
      const setup = JSON.parse(provider.getAttribute('data-setup') || '{}');

      expect(setup.dependencies['framer-motion']).toBeDefined();
    });

    it('contains Framer Motion components', () => {
      expect(artifact.code).toContain('motion');
      expect(artifact.code).toContain('AnimatePresence');
      expect(artifact.code).toContain('whileHover');
    });
  });

  describe('Icon Gallery (basic)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'icons')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('extracts lucide-react dependency', async () => {
      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
        />
      );

      await advanceTimersAndFlush(1000);

      const provider = screen.getByTestId('sandbox-provider');
      const setup = JSON.parse(provider.getAttribute('data-setup') || '{}');

      expect(setup.dependencies['lucide-react']).toBeDefined();
    });

    it('contains Lucide icon imports', () => {
      expect(artifact.code).toContain('Heart');
      expect(artifact.code).toContain('Star');
      expect(artifact.code).toContain('lucide-react');
    });
  });

  describe('Memory Game (advanced)', () => {
    const artifact = SAMPLE_ARTIFACTS.find(a => a.id === 'game')!;

    it('renders without errors', async () => {
      const onError = vi.fn();

      render(
        <SandpackArtifactRenderer
          code={artifact.code}
          title={artifact.name}
          onError={onError}
        />
      );

      await advanceTimersAndFlush(1000);

      expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
    });

    it('contains complex state logic', () => {
      expect(artifact.code).toContain('useEffect');
      expect(artifact.code).toContain('useState');
      expect(artifact.code).toContain('shuffle');
    });

    it('has game mechanics', () => {
      expect(artifact.code).toContain('flipped');
      expect(artifact.code).toContain('matched');
      expect(artifact.code).toContain('moves');
      expect(artifact.code).toContain('won');
    });
  });

  describe('All Artifacts Render Test', () => {
    it.each(SAMPLE_ARTIFACTS.map(a => [a.id, a.name, a]))(
      '%s (%s) renders successfully',
      async (id, name, artifact) => {
        const onError = vi.fn();

        render(
          <SandpackArtifactRenderer
            code={artifact.code}
            title={artifact.name}
            onError={onError}
          />
        );

        await advanceTimersAndFlush(1000);

        expect(screen.getByTestId('sandbox-provider')).toBeInTheDocument();
        expect(onError).not.toHaveBeenCalled();

        cleanup();
      }
    );
  });
});
