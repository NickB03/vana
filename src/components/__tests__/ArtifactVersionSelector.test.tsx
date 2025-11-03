import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactVersionSelector } from "../ArtifactVersionSelector";
import { ArtifactVersion } from "@/hooks/useArtifactVersions";

// Mock the useArtifactVersions hook
vi.mock("@/hooks/useArtifactVersions", () => ({
  useArtifactVersions: vi.fn(),
  ArtifactVersion: {},
}));

// Mock date-fns to have predictable output
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "less than an hour ago";
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }),
}));

import { useArtifactVersions } from "@/hooks/useArtifactVersions";

const mockUseArtifactVersions = useArtifactVersions as ReturnType<typeof vi.fn>;

// Test data
const mockArtifactId = "test-artifact-123";

const mockVersions: ArtifactVersion[] = [
  {
    id: "v3-id",
    message_id: "msg-3",
    artifact_id: mockArtifactId,
    version_number: 3,
    artifact_type: "react",
    artifact_title: "Button Component v3",
    artifact_content: "function Button() { return <button>Click v3</button> }",
    artifact_language: "tsx",
    content_hash: "hash3",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "v2-id",
    message_id: "msg-2",
    artifact_id: mockArtifactId,
    version_number: 2,
    artifact_type: "react",
    artifact_title: "Button Component v2",
    artifact_content: "function Button() { return <button>Click v2</button> }",
    artifact_language: "tsx",
    content_hash: "hash2",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "v1-id",
    message_id: "msg-1",
    artifact_id: mockArtifactId,
    version_number: 1,
    artifact_type: "react",
    artifact_title: "Initial Version",
    artifact_content: "function Button() { return <button>Click v1</button> }",
    artifact_language: "tsx",
    content_hash: "hash1",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
];

describe("ArtifactVersionSelector", () => {
  const mockOnVersionSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it("should display loading state while fetching versions", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: [],
      isLoading: true,
      error: null,
      currentVersion: undefined,
      versionCount: 0,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    const { container } = render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("Loading versions...")).toBeInTheDocument();
    // Check for loading spinner with animate-spin class
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  // ============================================================================
  // ERROR STATE TESTS
  // ============================================================================

  it("should display error state when fetch fails", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: "Failed to fetch versions",
      currentVersion: undefined,
      versionCount: 0,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("Failed to load versions")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch versions")).toBeInTheDocument();
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  it("should display empty state when no versions exist", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: null,
      currentVersion: undefined,
      versionCount: 0,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("No versions available")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first version to see history here.")
    ).toBeInTheDocument();
  });

  // ============================================================================
  // VERSION LIST RENDERING TESTS
  // ============================================================================

  it("should render version list in reverse chronological order", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("3 versions")).toBeInTheDocument();

    // Check all versions are rendered
    expect(screen.getByText("Button Component v3")).toBeInTheDocument();
    expect(screen.getByText("Button Component v2")).toBeInTheDocument();
    expect(screen.getByText("Initial Version")).toBeInTheDocument();

    // Check version badges
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("should display correct singular/plural version count", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: [mockVersions[0]],
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 1,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("1 version")).toBeInTheDocument();
  });

  it("should display relative timestamps for each version", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(screen.getByText("1 day ago")).toBeInTheDocument();
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
  });

  it("should display artifact language when available", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    // All versions have tsx language
    const tsxElements = screen.getAllByText("tsx");
    expect(tsxElements).toHaveLength(3);
  });

  // ============================================================================
  // CURRENT VERSION HIGHLIGHTING TESTS
  // ============================================================================

  it("should highlight currently selected version", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        currentVersion={3}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    // Check icon is present for selected version
    const button = screen.getByRole("button", {
      name: /Select version 3: Button Component v3/i,
    });
    expect(button).toHaveAttribute("aria-current", "true");
  });

  it("should not highlight any version when currentVersion is undefined", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    // No buttons should have aria-current
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute("aria-current");
    });
  });

  // ============================================================================
  // VERSION SELECTION TESTS
  // ============================================================================

  it("should call onVersionSelect when clicking a version", async () => {
    const user = userEvent.setup();

    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        currentVersion={3}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    const v2Button = screen.getByRole("button", {
      name: /Select version 2: Button Component v2/i,
    });

    await user.click(v2Button);

    expect(mockOnVersionSelect).toHaveBeenCalledTimes(1);
    expect(mockOnVersionSelect).toHaveBeenCalledWith(mockVersions[1]);
  });

  it("should call onVersionSelect with correct version data", async () => {
    const user = userEvent.setup();

    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    const v1Button = screen.getByRole("button", {
      name: /Select version 1: Initial Version/i,
    });

    await user.click(v1Button);

    expect(mockOnVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "v1-id",
        version_number: 1,
        artifact_title: "Initial Version",
        artifact_type: "react",
      })
    );
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it("should have proper ARIA labels for version buttons", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        currentVersion={3}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /Select version 3: Button Component v3/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Select version 2: Button Component v2/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Select version 1: Initial Version/i,
      })
    ).toBeInTheDocument();
  });

  it("should support keyboard navigation", async () => {
    const user = userEvent.setup();

    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    const firstButton = screen.getByRole("button", {
      name: /Select version 3: Button Component v3/i,
    });

    // Tab to first button
    await user.tab();
    expect(firstButton).toHaveFocus();

    // Press Enter to select
    await user.keyboard("{Enter}");
    expect(mockOnVersionSelect).toHaveBeenCalledWith(mockVersions[0]);
  });

  it("should have semantic time elements with proper datetime attributes", () => {
    mockUseArtifactVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
      currentVersion: mockVersions[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    const timeElements = screen.getAllByText(/ago/);
    timeElements.forEach((element) => {
      expect(element.tagName).toBe("TIME");
      expect(element).toHaveAttribute("dateTime");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  it("should handle versions with missing artifact_language gracefully", () => {
    const versionsWithoutLanguage = mockVersions.map((v) => ({
      ...v,
      artifact_language: null,
    }));

    mockUseArtifactVersions.mockReturnValue({
      versions: versionsWithoutLanguage,
      isLoading: false,
      error: null,
      currentVersion: versionsWithoutLanguage[0],
      versionCount: 3,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    // Should not display language when it's null
    expect(screen.queryByText("tsx")).not.toBeInTheDocument();

    // But should still display titles
    expect(screen.getByText("Button Component v3")).toBeInTheDocument();
  });

  it("should handle very long version titles with truncation", () => {
    const longTitleVersion = {
      ...mockVersions[0],
      artifact_title:
        "This is a very long title that should be truncated to prevent layout issues",
    };

    mockUseArtifactVersions.mockReturnValue({
      versions: [longTitleVersion],
      isLoading: false,
      error: null,
      currentVersion: longTitleVersion,
      versionCount: 1,
      isCreating: false,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersionDiff: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });

    const { container } = render(
      <ArtifactVersionSelector
        artifactId={mockArtifactId}
        onVersionSelect={mockOnVersionSelect}
      />
    );

    // Check that truncate class is applied
    const titleElement = container.querySelector(".truncate");
    expect(titleElement).toBeInTheDocument();
  });
});
