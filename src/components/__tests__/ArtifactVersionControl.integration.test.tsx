/**
 * Integration Tests for Artifact Version Control System
 *
 * This test suite validates the complete version control workflow including:
 * - Version history display
 * - Version navigation with prev/next buttons
 * - Version comparison and diff viewer
 * - Library auto-loading for approved CDNs
 * - Internal import validation errors
 * - Version creation flow from edit mode
 *
 * @testing-library/react is used for component rendering and interaction
 * @testing-library/user-event is used for realistic user interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Artifact, ArtifactData } from '../Artifact';
import { ArtifactVersionSelector } from '../ArtifactVersionSelector';
import { ArtifactDiffViewer } from '../ArtifactDiffViewer';
import * as useArtifactVersionsModule from '@/hooks/useArtifactVersions';
import type { ArtifactVersion } from '@/hooks/useArtifactVersions';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: vi.fn()
  }
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' })
  }
}));

// Helper to create a QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

// Helper to wrap component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

// Mock version data
const createMockVersion = (versionNumber: number): ArtifactVersion => ({
  id: `version-${versionNumber}`,
  message_id: 'msg-123',
  artifact_id: 'artifact-123',
  version_number: versionNumber,
  artifact_type: 'react',
  artifact_title: `Version ${versionNumber} Title`,
  artifact_content: `const App = () => <div>Version ${versionNumber}</div>;`,
  artifact_language: 'javascript',
  content_hash: `hash-${versionNumber}`,
  created_at: new Date(Date.now() - versionNumber * 3600000).toISOString()
});

describe('ArtifactVersionControl Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('1. Version History Display', () => {
    it('should display History button when versions exist', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Hello</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Verify History button appears with version count
      const historyButton = screen.getByTitle(/Version history \(3\)/i);
      expect(historyButton).toBeInTheDocument();
    });

    it('should open Sheet with version list when History button clicked', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Hello</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Click History button
      const historyButton = screen.getByTitle(/Version history/i);
      await user.click(historyButton);

      // Verify Sheet opens with version list
      await waitFor(() => {
        expect(screen.getByText('Version History')).toBeInTheDocument();
      });
    });

    it('should display versions in newest-first order', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          onVersionSelect={vi.fn()}
        />
      );

      // Verify versions appear in correct order
      const versionBadges = screen.getAllByText(/v\d+/);
      expect(versionBadges[0]).toHaveTextContent('v3');
      expect(versionBadges[1]).toHaveTextContent('v2');
      expect(versionBadges[2]).toHaveTextContent('v1');
    });

    it('should highlight current version', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          currentVersion={2}
          onVersionSelect={vi.fn()}
        />
      );

      // Find version 2 button and verify it's marked as current
      const version2Button = screen.getByLabelText(/Select version 2/i);
      expect(version2Button).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('2. Version Navigation with Prev/Next', () => {
    it('should show navigation controls when versions exist', () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Hello</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Verify navigation buttons exist
      expect(screen.getByTitle(/Previous version/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Next version/i)).toBeInTheDocument();
      expect(screen.getByText(/v\w+ of 3/)).toBeInTheDocument();
    });

    it('should navigate to previous (older) version when clicking previous button', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      const mockUseVersions = vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions');
      mockUseVersions.mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Latest</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Click previous button (should go from latest to version 3)
      const prevButton = screen.getByTitle(/Previous version/i);
      await user.click(prevButton);

      // Verify version counter updates
      await waitFor(() => {
        expect(screen.getByText(/v3 of 3/)).toBeInTheDocument();
      });
    });

    it('should navigate to next (newer) version when clicking next button', async () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Latest</div>;'
      };

      const { rerender } = renderWithProviders(<Artifact artifact={artifact} />);

      // Navigate to version 2 first
      const prevButton = screen.getByTitle(/Previous version/i);
      await user.click(prevButton);

      // Now click next to go back to version 3
      const nextButton = screen.getByTitle(/Next version/i);
      await user.click(nextButton);

      // Verify we went to newer version
      await waitFor(() => {
        expect(screen.queryByText(/v2 of 3/)).not.toBeInTheDocument();
      });
    });

    it('should disable previous button at oldest version', async () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Hello</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Navigate to version 2 (first in array)
      const prevButton = screen.getByTitle(/Previous version/i);
      await user.click(prevButton);

      // Navigate to version 1 (oldest)
      await user.click(prevButton);

      // At oldest version (version 1), previous button should be disabled
      await waitFor(() => {
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button at latest version', () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Test Artifact',
        content: 'const App = () => <div>Latest</div>;'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // At latest version, next button should be disabled
      const nextButton = screen.getByTitle(/Next version/i);
      expect(nextButton).toBeDisabled();
    });
  });

  describe('3. Version Comparison', () => {
    it('should open diff viewer when compare button clicked', async () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];
      const mockGetVersionDiff = vi.fn().mockReturnValue({
        oldContent: 'const App = () => <div>Version 1</div>;',
        newContent: 'const App = () => <div>Version 2</div>;',
        oldTitle: 'Version 1 Title',
        newTitle: 'Version 2 Title',
        oldType: 'react',
        newType: 'react'
      });

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: mockGetVersionDiff,
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const onCompareMock = vi.fn();

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          currentVersion={2}
          onVersionSelect={vi.fn()}
          onCompare={onCompareMock}
        />
      );

      // Find compare button for version 1
      const compareButtons = screen.getAllByTitle(/Compare with current version/i);
      await user.click(compareButtons[1]); // Click version 1's compare button

      // Verify onCompare was called with correct version
      expect(onCompareMock).toHaveBeenCalledWith(mockVersions[1]);
    });

    it('should display correct versions being compared in diff viewer', () => {
      const mockVersions = [createMockVersion(3), createMockVersion(2), createMockVersion(1)];
      const mockGetVersionDiff = vi.fn().mockReturnValue({
        oldContent: 'const App = () => <div>Version 1</div>;',
        newContent: 'const App = () => <div>Version 3</div>;',
        oldTitle: 'Version 1 Title',
        newTitle: 'Version 3 Title',
        oldType: 'react',
        newType: 'react'
      });

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 3,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: mockGetVersionDiff,
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactDiffViewer
          artifactId="artifact-123"
          fromVersion={1}
          toVersion={3}
          onClose={vi.fn()}
        />
      );

      // Verify version badge shows correct comparison
      expect(screen.getByText(/v1 → v3/i)).toBeInTheDocument();
      expect(screen.getByText('Version Diff')).toBeInTheDocument();
    });

    it('should close diff viewer when close button clicked', async () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];
      const mockGetVersionDiff = vi.fn().mockReturnValue({
        oldContent: 'const App = () => <div>Version 1</div>;',
        newContent: 'const App = () => <div>Version 2</div>;',
        oldTitle: 'Version 1 Title',
        newTitle: 'Version 2 Title',
        oldType: 'react',
        newType: 'react'
      });

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: mockGetVersionDiff,
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const onCloseMock = vi.fn();

      renderWithProviders(
        <ArtifactDiffViewer
          artifactId="artifact-123"
          fromVersion={1}
          toVersion={2}
          onClose={onCloseMock}
        />
      );

      // Click close button - be more specific to avoid multiple button match
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const diffViewerCloseButton = closeButtons.find(btn =>
        btn.closest('[role="dialog"]')
      );

      if (diffViewerCloseButton) {
        await user.click(diffViewerCloseButton);
      }

      // Verify onClose was called
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('4. Library Auto-Loading', () => {
    it('should auto-inject Chart.js CDN without approval popup', async () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'html',
        title: 'Chart Demo',
        content: `
          <canvas id="myChart"></canvas>
          <script>
            new Chart(document.getElementById('myChart'), {
              type: 'bar',
              data: { labels: ['A'], datasets: [{ data: [1] }] }
            });
          </script>
        `
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Wait for library detection
      await waitFor(() => {
        // Verify no approval dialog appears (Chart.js is auto-approved)
        expect(screen.queryByText(/approve library/i)).not.toBeInTheDocument();
      });

      // Verify iframe receives the content (Chart.js auto-injected)
      const iframe = screen.getByTitle('Chart Demo');
      expect(iframe).toBeInTheDocument();
    });

    it('should auto-inject D3.js CDN without approval popup', async () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'html',
        title: 'D3 Visualization',
        content: `
          <div id="chart"></div>
          <script>
            d3.select('#chart').append('svg').attr('width', 100).attr('height', 100);
          </script>
        `
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Wait for library detection
      await waitFor(() => {
        // Verify no approval dialog appears (D3 is auto-approved)
        expect(screen.queryByText(/approve library/i)).not.toBeInTheDocument();
      });

      // Verify iframe exists
      const iframe = screen.getByTitle('D3 Visualization');
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('5. Internal Import Error', () => {
    it('should detect internal component imports', async () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Invalid Component',
        content: `import { Button } from "@/components/ui/button";
const App = () => <Button>Click</Button>;`
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // The internal import detection happens during library checking
      // Wait a bit for the artifact to process the content
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the artifact is rendered (even with error)
      const iframe = screen.getByTitle('Invalid Component');
      expect(iframe).toBeInTheDocument();
    });

    it('should not show approval popup for internal imports', async () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'react',
        title: 'Invalid Component',
        content: `
          import { Card } from "@/components/ui/card";
          const App = () => <Card>Content</Card>;
        `
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Wait a bit to ensure no popup appears
      await waitFor(() => {
        expect(screen.queryByText(/approve/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('6. Version Creation Flow', () => {
    it('should create version when saving edited content', async () => {
      const mockCreateVersion = vi.fn().mockResolvedValue(createMockVersion(2));

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [createMockVersion(1)],
        currentVersion: createMockVersion(1),
        versionCount: 1,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: mockCreateVersion,
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'code',
        title: 'Test Code',
        content: 'console.log("original");',
        language: 'javascript'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Switch to Edit tab
      const editTab = screen.getByRole('tab', { name: /edit/i });
      await user.click(editTab);

      // Find textarea and modify content
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'console.log("modified");');

      // Click Save Changes button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify createVersion was called
      await waitFor(() => {
        expect(mockCreateVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'artifact-123',
            content: 'console.log("modified");'
          }),
          'msg-123'
        );
      });
    });

    it('should show success toast when version created', async () => {
      const { toast } = await import('sonner');
      const mockCreateVersion = vi.fn().mockResolvedValue(createMockVersion(2));

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [createMockVersion(1)],
        currentVersion: createMockVersion(1),
        versionCount: 1,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: mockCreateVersion,
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'markdown',
        title: 'Test Doc',
        content: '# Original'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Switch to Edit tab
      const editTab = screen.getByRole('tab', { name: /edit/i });
      await user.click(editTab);

      // Modify content
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '# Modified');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify success toast was called
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('version saved')
        );
      });
    });

    it('should not create version if content unchanged', async () => {
      const mockCreateVersion = vi.fn();

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [createMockVersion(1)],
        currentVersion: createMockVersion(1),
        versionCount: 1,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: mockCreateVersion,
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      const artifact: ArtifactData = {
        id: 'artifact-123',
        type: 'code',
        title: 'Test Code',
        content: 'console.log("test");',
        language: 'javascript'
      };

      renderWithProviders(<Artifact artifact={artifact} />);

      // Switch to Edit tab
      const editTab = screen.getByRole('tab', { name: /edit/i });
      await user.click(editTab);

      // Click Save without modifying content
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify createVersion was NOT called
      expect(mockCreateVersion).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on version selector buttons', () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          currentVersion={2}
          onVersionSelect={vi.fn()}
        />
      );

      // Verify ARIA labels
      expect(screen.getByLabelText(/Select version 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select version 1/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation in version list', async () => {
      const mockVersions = [createMockVersion(2), createMockVersion(1)];
      const onVersionSelect = vi.fn();

      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: mockVersions,
        currentVersion: mockVersions[0],
        versionCount: 2,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          onVersionSelect={onVersionSelect}
        />
      );

      // Tab to first version button and press Enter
      const version2Button = screen.getByLabelText(/Select version 2/i);
      version2Button.focus();
      await user.keyboard('{Enter}');

      // Verify version selection
      expect(onVersionSelect).toHaveBeenCalledWith(mockVersions[0]);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when versions fail to load', () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: 'Failed to fetch versions',
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          onVersionSelect={vi.fn()}
        />
      );

      // Verify error message appears
      expect(screen.getByText(/Failed to load versions/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch versions/i)).toBeInTheDocument();
    });

    it('should show loading state while fetching versions', () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: true,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          onVersionSelect={vi.fn()}
        />
      );

      // Verify loading state
      expect(screen.getByText(/Loading versions.../i)).toBeInTheDocument();
    });

    it('should show empty state when no versions exist', () => {
      vi.spyOn(useArtifactVersionsModule, 'useArtifactVersions').mockReturnValue({
        versions: [],
        currentVersion: undefined,
        versionCount: 0,
        isLoading: false,
        isCreating: false,
        error: null,
        createVersion: vi.fn(),
        revertToVersion: vi.fn(),
        getVersionDiff: vi.fn(),
        getVersion: vi.fn(),
        hasContentChanged: vi.fn(),
        refetch: vi.fn()
      });

      renderWithProviders(
        <ArtifactVersionSelector
          artifactId="artifact-123"
          onVersionSelect={vi.fn()}
        />
      );

      // Verify empty state
      expect(screen.getByText(/No versions available/i)).toBeInTheDocument();
    });
  });
});
