import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { TOUR_STEP_IDS } from '../tour';
import { TooltipProvider } from '../ui/tooltip';

/**
 * Tour Target IDs Tests
 *
 * These tests verify that the tour target ID constants are correctly defined
 * and that simple components properly receive their IDs.
 *
 * Note: Complex component integration tests (ChatLayout, full Home) are better
 * tested via Chrome DevTools MCP in Phase 4 QA, as they have many dependencies.
 */

// ============================================================================
// Mocks for dependencies
// ============================================================================

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock IntersectionObserver
beforeEach(() => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
});

// ============================================================================
// TOUR_STEP_IDS Constants Tests
// ============================================================================

describe('TOUR_STEP_IDS Constants', () => {
  it('should export CHAT_INPUT with correct value', () => {
    expect(TOUR_STEP_IDS.CHAT_INPUT).toBe('tour-chat-input');
  });

  it('should export IMAGE_MODE with correct value', () => {
    expect(TOUR_STEP_IDS.IMAGE_MODE).toBe('tour-image-mode');
  });

  it('should export ARTIFACT_MODE with correct value', () => {
    expect(TOUR_STEP_IDS.ARTIFACT_MODE).toBe('tour-artifact-mode');
  });

  it('should export SUGGESTIONS with correct value', () => {
    expect(TOUR_STEP_IDS.SUGGESTIONS).toBe('tour-suggestions');
  });

  it('should export SIDEBAR with correct value', () => {
    expect(TOUR_STEP_IDS.SIDEBAR).toBe('tour-sidebar');
  });

  it('should have exactly 5 tour step IDs', () => {
    const ids = Object.keys(TOUR_STEP_IDS);
    expect(ids).toHaveLength(5);
  });

  it('should have unique values for all IDs', () => {
    const values = Object.values(TOUR_STEP_IDS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

// ============================================================================
// ID Naming Convention Tests
// ============================================================================

describe('Tour ID Naming Convention', () => {
  it('should use consistent "tour-" prefix for all IDs', () => {
    Object.values(TOUR_STEP_IDS).forEach(id => {
      expect(id).toMatch(/^tour-/);
    });
  });

  it('should use kebab-case for all IDs', () => {
    Object.values(TOUR_STEP_IDS).forEach(id => {
      // kebab-case: lowercase letters and hyphens only
      expect(id).toMatch(/^[a-z-]+$/);
    });
  });

  it('should have descriptive names matching their purpose', () => {
    // Verify the semantic meaning of each ID
    expect(TOUR_STEP_IDS.CHAT_INPUT).toContain('chat');
    expect(TOUR_STEP_IDS.IMAGE_MODE).toContain('image');
    expect(TOUR_STEP_IDS.ARTIFACT_MODE).toContain('artifact');
    expect(TOUR_STEP_IDS.SUGGESTIONS).toContain('suggestions');
    expect(TOUR_STEP_IDS.SIDEBAR).toContain('sidebar');
  });
});

// ============================================================================
// ChatSidebar Tour ID Tests
// ============================================================================

describe('ChatSidebar Tour ID', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should have tour-sidebar ID on the Sidebar component', async () => {
    const { ChatSidebar } = await import('../ChatSidebar');
    const { SidebarProvider } = await import('../ui/sidebar');

    render(
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <ChatSidebar
            sessions={[]}
            currentSessionId={undefined}
            onSessionSelect={vi.fn()}
            onNewChat={vi.fn()}
            onDeleteSession={vi.fn()}
            isLoading={false}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    const sidebarElement = document.getElementById(TOUR_STEP_IDS.SIDEBAR);
    expect(sidebarElement).toBeInTheDocument();
    expect(sidebarElement).toHaveAttribute('id', 'tour-sidebar');
  });
});

// ============================================================================
// PromptInputControls Tour ID Tests
// ============================================================================

describe('PromptInputControls Tour IDs', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should have tour-image-mode ID on the image mode button', async () => {
    const { PromptInputControls } = await import('../prompt-kit/prompt-input-controls');

    render(
      <TooltipProvider>
        <PromptInputControls
          isLoading={false}
          imageMode={false}
          onImageModeChange={vi.fn()}
          artifactMode={false}
          onArtifactModeChange={vi.fn()}
          sendIcon="send"
          onSubmit={vi.fn()}
        />
      </TooltipProvider>
    );

    const imageModeElement = document.getElementById(TOUR_STEP_IDS.IMAGE_MODE);
    expect(imageModeElement).toBeInTheDocument();
    expect(imageModeElement).toHaveAttribute('id', 'tour-image-mode');
  });

  it('should have tour-artifact-mode ID on the artifact mode button', async () => {
    const { PromptInputControls } = await import('../prompt-kit/prompt-input-controls');

    render(
      <TooltipProvider>
        <PromptInputControls
          isLoading={false}
          imageMode={false}
          onImageModeChange={vi.fn()}
          artifactMode={false}
          onArtifactModeChange={vi.fn()}
          sendIcon="send"
          onSubmit={vi.fn()}
        />
      </TooltipProvider>
    );

    const artifactModeElement = document.getElementById(TOUR_STEP_IDS.ARTIFACT_MODE);
    expect(artifactModeElement).toBeInTheDocument();
    expect(artifactModeElement).toHaveAttribute('id', 'tour-artifact-mode');
  });
});

// ============================================================================
// ID Availability Contract Tests
// ============================================================================

describe('Tour ID Availability Contract', () => {
  it('should export all required IDs from tour module', async () => {
    const tourModule = await import('../tour');

    expect(tourModule.TOUR_STEP_IDS).toBeDefined();
    expect(tourModule.TOUR_STEP_IDS.CHAT_INPUT).toBeDefined();
    expect(tourModule.TOUR_STEP_IDS.IMAGE_MODE).toBeDefined();
    expect(tourModule.TOUR_STEP_IDS.ARTIFACT_MODE).toBeDefined();
    expect(tourModule.TOUR_STEP_IDS.SUGGESTIONS).toBeDefined();
    expect(tourModule.TOUR_STEP_IDS.SIDEBAR).toBeDefined();
  });

  it('should have stable ID values (regression test)', () => {
    // These values should not change as they're used in localStorage keys
    expect(TOUR_STEP_IDS.CHAT_INPUT).toBe('tour-chat-input');
    expect(TOUR_STEP_IDS.IMAGE_MODE).toBe('tour-image-mode');
    expect(TOUR_STEP_IDS.ARTIFACT_MODE).toBe('tour-artifact-mode');
    expect(TOUR_STEP_IDS.SUGGESTIONS).toBe('tour-suggestions');
    expect(TOUR_STEP_IDS.SIDEBAR).toBe('tour-sidebar');
  });
});
