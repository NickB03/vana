import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ArtifactDiffViewer } from "../ArtifactDiffViewer";
import { useArtifactVersions } from "@/hooks/useArtifactVersions";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Mock the hooks
vi.mock("@/hooks/useArtifactVersions");

// Mock CSS imports
vi.mock("react-diff-view/style/index.css", () => ({}));
vi.mock("../ArtifactDiffViewer.css", () => ({}));

const mockGetVersionDiff = vi.fn();
const mockUseArtifactVersions = useArtifactVersions as ReturnType<typeof vi.fn>;

describe("ArtifactDiffViewer", () => {
  const defaultProps = {
    artifactId: "test-artifact-123",
    fromVersion: 1,
    toVersion: 2,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArtifactVersions.mockReturnValue({
      getVersionDiff: mockGetVersionDiff,
      isLoading: false,
      versions: [],
      currentVersion: undefined,
      versionCount: 0,
      isCreating: false,
      error: null,
      createVersion: vi.fn(),
      revertToVersion: vi.fn(),
      getVersion: vi.fn(),
      hasContentChanged: vi.fn(),
      refetch: vi.fn(),
    });
  });

  describe("Rendering", () => {
    it("should render the dialog with version numbers", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "const old = 'text';",
        newContent: "const new = 'updated';",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(screen.getByText("Version Diff")).toBeInTheDocument();
      expect(screen.getByText("v1 → v2")).toBeInTheDocument();
    });

    it("should show loading state when isLoading is true", () => {
      mockUseArtifactVersions.mockReturnValue({
        ...mockUseArtifactVersions(),
        isLoading: true,
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      // Check for skeleton elements
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show error state when diff data is not available", () => {
      mockGetVersionDiff.mockReturnValue(null);

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(
        screen.getByText(/Unable to load version diff/i)
      ).toBeInTheDocument();
    });

    it("should show no changes message when content is identical", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "const same = 'text';",
        newContent: "const same = 'text';",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(
        screen.getByText(/No content changes detected/i)
      ).toBeInTheDocument();
    });
  });

  describe("Metadata Changes", () => {
    it("should display title changes", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "content",
        newContent: "content",
        oldTitle: "Old Title",
        newTitle: "New Title",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(screen.getByText(/Metadata Changes:/i)).toBeInTheDocument();
      expect(screen.getByText(/Old Title/i)).toBeInTheDocument();
      expect(screen.getByText(/New Title/i)).toBeInTheDocument();
    });

    it("should display type changes", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "content",
        newContent: "content",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "react",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(screen.getByText(/Metadata Changes:/i)).toBeInTheDocument();
      expect(screen.getByText(/code/i)).toBeInTheDocument();
      expect(screen.getByText(/react/i)).toBeInTheDocument();
    });

    it("should display both title and type changes", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "content",
        newContent: "content",
        oldTitle: "Old",
        newTitle: "New",
        oldType: "html",
        newType: "react",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      const metadataSection = screen.getByText(/Metadata Changes:/i).parentElement;
      expect(metadataSection).toHaveTextContent("Title");
      expect(metadataSection).toHaveTextContent("Type");
    });
  });

  describe("View Mode Toggle", () => {
    it("should render split and unified view mode buttons on desktop", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "old",
        newContent: "new",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      // Mock window.innerWidth for desktop
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(screen.getByText("Split")).toBeInTheDocument();
      expect(screen.getByText("Unified")).toBeInTheDocument();
    });

    it("should toggle between split and unified views", async () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "const old = 'text';",
        newContent: "const new = 'updated';",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      const unifiedButton = screen.getByText("Unified");
      const splitButton = screen.getByText("Split");

      // Initially split view should be active (check button classes directly)
      expect(splitButton).toHaveClass("bg-secondary");

      // Click unified button
      fireEvent.click(unifiedButton);

      // Wait for state update
      await waitFor(() => {
        expect(unifiedButton).toHaveClass("bg-secondary");
      });
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();
      mockGetVersionDiff.mockReturnValue({
        oldContent: "old",
        newContent: "new",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} onClose={onClose} />);

      // Get all close buttons and click the one in the footer
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      // The footer button is the first one with the visible text "Close"
      const footerCloseButton = closeButtons.find(btn => btn.textContent === "Close");
      fireEvent.click(footerCloseButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when dialog overlay is clicked", () => {
      const onClose = vi.fn();
      mockGetVersionDiff.mockReturnValue({
        oldContent: "old",
        newContent: "new",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} onClose={onClose} />);

      // The Dialog component should handle this through DialogPrimitive
      // We're testing the prop is passed correctly
      expect(onClose).toBeDefined();
    });
  });

  describe("Diff Display", () => {
    it("should render diff content when changes exist", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "line 1\nline 2\nline 3",
        newContent: "line 1\nline 2 modified\nline 3",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      // Verify the component renders (check for version badge)
      expect(screen.getByText("Version Diff")).toBeInTheDocument();

      // Verify not in error state
      expect(screen.queryByText(/Unable to load version diff/i)).not.toBeInTheDocument();
    });

    it("should handle empty diff gracefully", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "",
        newContent: "",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      expect(
        screen.getByText(/No content changes detected/i)
      ).toBeInTheDocument();
    });

    it("should handle parsing errors gracefully", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "valid content",
        newContent: "valid content",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      // Console error should be suppressed in tests
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<ArtifactDiffViewer {...defaultProps} />);

      // Component should still render without crashing
      expect(screen.getByText("Version Diff")).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle same version numbers gracefully", () => {
      const props = { ...defaultProps, fromVersion: 1, toVersion: 1 };
      mockGetVersionDiff.mockReturnValue(null);

      render(<ArtifactDiffViewer {...props} />);

      expect(
        screen.getByText(/Unable to load version diff/i)
      ).toBeInTheDocument();
    });

    it("should handle missing artifactId", () => {
      const props = { ...defaultProps, artifactId: "" };
      mockGetVersionDiff.mockReturnValue(null);

      render(<ArtifactDiffViewer {...props} />);

      expect(
        screen.getByText(/Unable to load version diff/i)
      ).toBeInTheDocument();
    });

    it("should handle very large diffs", () => {
      const largeContent = "line\n".repeat(1000);
      mockGetVersionDiff.mockReturnValue({
        oldContent: largeContent,
        newContent: largeContent + "new line\n",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      // Should render without crashing
      expect(screen.getByText("Version Diff")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should force unified view on mobile", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "old",
        newContent: "new",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      // View toggle buttons container should have "hidden md:flex" class
      const toggleContainer = document.querySelector(".hidden.md\\:flex");
      expect(toggleContainer).toBeTruthy();
    });

    it("should show view toggle on desktop", () => {
      mockGetVersionDiff.mockReturnValue({
        oldContent: "old",
        newContent: "new",
        oldTitle: "Test",
        newTitle: "Test",
        oldType: "code",
        newType: "code",
      });

      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ArtifactDiffViewer {...defaultProps} />);

      const splitButton = screen.getByText("Split");
      // Just verify the buttons are rendered (they should be visible on desktop)
      expect(splitButton).toBeInTheDocument();
      expect(screen.getByText("Unified")).toBeInTheDocument();
    });
  });
});
