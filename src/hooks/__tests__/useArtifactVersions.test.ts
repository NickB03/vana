/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useArtifactVersions, ArtifactVersion } from "../useArtifactVersions";
import { supabase } from "@/integrations/supabase/client";
import { ArtifactData } from "@/components/Artifact";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Test data
const mockArtifactId = "test-artifact-123";
const mockMessageId = "a1b2c3d4-e5f6-7890-abcd-1234567890ab"; // Valid UUID

const mockVersions: ArtifactVersion[] = [
  {
    id: "v1",
    message_id: mockMessageId,
    artifact_id: mockArtifactId,
    version_number: 3,
    artifact_type: "react",
    artifact_title: "Button Component v3",
    artifact_content: "function Button() { return <button>Click v3</button> }",
    artifact_language: "tsx",
    content_hash: "hash3",
    created_at: "2025-11-02T12:00:00Z",
  },
  {
    id: "v2",
    message_id: mockMessageId,
    artifact_id: mockArtifactId,
    version_number: 2,
    artifact_type: "react",
    artifact_title: "Button Component v2",
    artifact_content: "function Button() { return <button>Click v2</button> }",
    artifact_language: "tsx",
    content_hash: "hash2",
    created_at: "2025-11-02T11:00:00Z",
  },
  {
    id: "v3",
    message_id: mockMessageId,
    artifact_id: mockArtifactId,
    version_number: 1,
    artifact_type: "react",
    artifact_title: "Button Component v1",
    artifact_content: "function Button() { return <button>Click v1</button> }",
    artifact_language: "tsx",
    content_hash: "hash1",
    created_at: "2025-11-02T10:00:00Z",
  },
];

const mockArtifact: ArtifactData = {
  id: mockArtifactId,
  type: "react",
  title: "Button Component",
  content: "function Button() { return <button>Click</button> }",
  language: "tsx",
};

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useArtifactVersions", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ============================================================================
  // QUERY TESTS
  // ============================================================================

  it("should fetch version history successfully", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.versions).toEqual(mockVersions);
    expect(result.current.currentVersion).toEqual(mockVersions[0]);
    expect(result.current.versionCount).toBe(3);
  });

  it("should return empty array when artifactId is undefined", () => {
    const { result } = renderHook(() => useArtifactVersions(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.versions).toEqual([]);
    expect(result.current.currentVersion).toBeUndefined();
    expect(result.current.versionCount).toBe(0);
  });

  it("should handle RLS policy violations gracefully", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: "PGRST301",
              message: "row-level security policy violation",
            },
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        "You don't have permission to view these versions"
      );
    });
  });

  it("should handle generic fetch errors", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Network error" },
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    // Wait for React Query to process error after retries
    // Generic errors retry up to 2 times, so need longer timeout
    await waitFor(
      () => {
        expect(result.current.error).toBe("Network error");
      },
      { timeout: 5000 }
    );
  });

  // ============================================================================
  // MUTATION TESTS
  // ============================================================================

  it("should create new version successfully", async () => {
    // Mock successful session
    (supabase.auth.getSession as any) = vi.fn().mockResolvedValue({
      data: { session: { access_token: "token123" } },
    });

    // Mock successful RPC call
    (supabase.rpc as any) = vi.fn().mockResolvedValue({
      data: mockVersions[0],
      error: null,
    });

    // Mock the query to return empty versions initially
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    // Wait for React Query to settle before calling mutation
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // Call createVersion
    await result.current.createVersion(mockArtifact, mockMessageId);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_artifact_version_atomic",
      expect.objectContaining({
        p_message_id: mockMessageId,
        p_artifact_id: mockArtifactId,
        p_artifact_type: "react",
        p_artifact_title: "Button Component",
        p_artifact_content: mockArtifact.content,
        p_artifact_language: "tsx",
      })
    );
  });

  it("should handle authentication errors", async () => {
    // Mock no session
    (supabase.auth.getSession as any) = vi.fn().mockResolvedValue({
      data: { session: null },
    });

    // Mock the query to return empty versions
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    // Wait for React Query to settle before testing mutation
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    await expect(
      result.current.createVersion(mockArtifact, mockMessageId)
    ).rejects.toThrow("Authentication required");
  });

  it("should handle RLS errors during version creation", async () => {
    (supabase.auth.getSession as any) = vi.fn().mockResolvedValue({
      data: { session: { access_token: "token123" } },
    });

    (supabase.rpc as any) = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST301",
        message: "row-level security violation",
      },
    });

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.createVersion(mockArtifact, mockMessageId)
    ).rejects.toThrow(
      "You don't have permission to create versions for this artifact"
    );
  });

  it("should handle foreign key constraint errors", async () => {
    (supabase.auth.getSession as any) = vi.fn().mockResolvedValue({
      data: { session: { access_token: "token123" } },
    });

    (supabase.rpc as any) = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "foreign key constraint violated",
      },
    });

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.createVersion(mockArtifact, mockMessageId)
    ).rejects.toThrow("Invalid message ID - message may have been deleted");
  });

  // ============================================================================
  // INPUT VALIDATION TESTS
  // ============================================================================

  it("should reject invalid artifact ID (missing)", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    const invalidArtifact = { ...mockArtifact, id: "" };

    await expect(
      result.current.createVersion(invalidArtifact, mockMessageId)
    ).rejects.toThrow("Invalid artifact: missing or empty artifact ID");
  });

  it("should reject invalid messageId (not a UUID)", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.createVersion(mockArtifact, "invalid-uuid")
    ).rejects.toThrow("Invalid messageId: must be a valid UUID");
  });

  it("should reject invalid artifact type (missing)", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    const invalidArtifact = { ...mockArtifact, type: "" as any };

    await expect(
      result.current.createVersion(invalidArtifact, mockMessageId)
    ).rejects.toThrow("Invalid artifact: missing or invalid type");
  });

  it("should reject invalid artifact title (empty)", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    const invalidArtifact = { ...mockArtifact, title: "" };

    await expect(
      result.current.createVersion(invalidArtifact, mockMessageId)
    ).rejects.toThrow("Invalid artifact: missing or empty title");
  });

  it("should reject invalid artifact content (empty)", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    const invalidArtifact = { ...mockArtifact, content: "" };

    await expect(
      result.current.createVersion(invalidArtifact, mockMessageId)
    ).rejects.toThrow("Invalid artifact: missing or empty content");
  });

  it("should reject content exceeding max size", async () => {
    const mockAuthGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (supabase.auth.getSession as any) = mockAuthGetSession;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    const tooLarge = "x".repeat(101 * 1024); // 101KB
    const invalidArtifact = { ...mockArtifact, content: tooLarge };

    await expect(
      result.current.createVersion(invalidArtifact, mockMessageId)
    ).rejects.toThrow("Artifact content too large");
  });

  // ============================================================================
  // HELPER FUNCTION TESTS
  // ============================================================================

  it("should revert to specific version", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    const reverted = result.current.revertToVersion(2);
    expect(reverted).toEqual(mockVersions[1]);
    expect(reverted?.version_number).toBe(2);
  });

  it("should return null when reverting to non-existent version", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    const reverted = result.current.revertToVersion(999);
    expect(reverted).toBeNull();
  });

  it("should get diff between versions", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    const diff = result.current.getVersionDiff(1, 3);
    expect(diff).toEqual({
      oldContent: mockVersions[2].artifact_content,
      newContent: mockVersions[0].artifact_content,
      oldTitle: mockVersions[2].artifact_title,
      newTitle: mockVersions[0].artifact_title,
      oldType: mockVersions[2].artifact_type,
      newType: mockVersions[0].artifact_type,
    });
  });

  it("should return null for invalid diff versions", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    const diff = result.current.getVersionDiff(1, 999);
    expect(diff).toBeNull();
  });

  it("should get version by number", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    const version = result.current.getVersion(2);
    expect(version).toEqual(mockVersions[1]);
  });

  it("should detect content changes with hash comparison", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockVersions,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.versions).toEqual(mockVersions);
    });

    // Different content should return true
    const changed = await result.current.hasContentChanged("new content");
    expect(changed).toBe(true);
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  it("should handle empty version history", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.versions).toEqual([]);
    expect(result.current.currentVersion).toBeUndefined();
    expect(result.current.versionCount).toBe(0);

    // hasContentChanged should return true for empty history
    const changed = await result.current.hasContentChanged("any content");
    expect(changed).toBe(true);
  });

  it("should not retry on RLS errors", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: "PGRST301",
              message: "permission denied",
            },
          }),
        }),
      }),
    });

    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useArtifactVersions(mockArtifactId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Should only call once (no retries for permission errors)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
