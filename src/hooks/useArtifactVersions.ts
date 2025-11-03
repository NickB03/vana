import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArtifactData } from "@/components/Artifact";

// TypeScript interface matching database schema
export interface ArtifactVersion {
  id: string;
  message_id: string;
  artifact_id: string;
  version_number: number;
  artifact_type: string;
  artifact_title: string;
  artifact_content: string;
  artifact_language: string | null;
  content_hash: string;
  created_at: string;
}

// Input type for creating versions
interface CreateVersionInput {
  messageId: string;
  artifact: ArtifactData;
}

/**
 * Compute SHA-256 hash using Web Crypto API
 * No external dependencies required
 */
async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * React Query hook for artifact version control
 *
 * Features:
 * - Fetch version history with caching
 * - Create new versions with deduplication
 * - Revert to previous versions
 * - Get diff between versions
 * - Automatic cache invalidation
 * - RLS-aware error handling
 *
 * @param artifactId - Stable identifier for the artifact
 */
export function useArtifactVersions(artifactId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["artifact-versions", artifactId];

  // ============================================================================
  // QUERY: Fetch version history
  // ============================================================================
  const {
    data: versions = [],
    isLoading,
    error,
    refetch
  } = useQuery<ArtifactVersion[], Error>({
    queryKey,
    queryFn: async () => {
      if (!artifactId) return [];

      const { data, error } = await supabase
        .from("artifact_versions")
        .select("*")
        .eq("artifact_id", artifactId)
        .order("version_number", { ascending: false });

      if (error) {
        // Check for RLS policy violations
        if (error.code === "PGRST301" || error.message.includes("row-level security")) {
          throw new Error("You don't have permission to view these versions");
        }
        throw new Error(error.message || "Failed to fetch versions");
      }

      return data as ArtifactVersion[];
    },
    enabled: !!artifactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry RLS errors
      if (error.message.includes("permission")) return false;
      return failureCount < 2;
    },
  });

  // ============================================================================
  // MUTATION: Create new version
  // ============================================================================
  const createVersionMutation = useMutation({
    mutationFn: async ({ messageId, artifact }: CreateVersionInput) => {
      // Input validation - portfolio-level checks for common errors
      if (!artifact?.id || typeof artifact.id !== 'string' || artifact.id.trim() === '') {
        throw new Error("Invalid artifact: missing or empty artifact ID");
      }

      if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
        throw new Error("Invalid messageId: must be a non-empty string");
      }

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(messageId)) {
        throw new Error("Invalid messageId: must be a valid UUID");
      }

      if (!artifact.type || typeof artifact.type !== 'string') {
        throw new Error("Invalid artifact: missing or invalid type");
      }

      if (!artifact.title || typeof artifact.title !== 'string' || artifact.title.trim() === '') {
        throw new Error("Invalid artifact: missing or empty title");
      }

      if (!artifact.content || typeof artifact.content !== 'string' || artifact.content.trim() === '') {
        throw new Error("Invalid artifact: missing or empty content");
      }

      // Check content size (100KB limit)
      const MAX_CONTENT_SIZE = 100 * 1024;
      if (artifact.content.length > MAX_CONTENT_SIZE) {
        throw new Error(`Artifact content too large (${artifact.content.length} bytes, max ${MAX_CONTENT_SIZE})`);
      }

      // Validate session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      // Compute content hash for deduplication
      const contentHash = await computeSHA256(artifact.content);

      // Call atomic creation function (handles versioning & deduplication)
      const { data, error } = await supabase.rpc("create_artifact_version_atomic", {
        p_message_id: messageId,
        p_artifact_id: artifact.id,
        p_artifact_type: artifact.type,
        p_artifact_title: artifact.title,
        p_artifact_content: artifact.content,
        p_artifact_language: artifact.language || null,
        p_content_hash: contentHash,
      });

      if (error) {
        // Enhanced error handling for RLS
        if (error.code === "PGRST301" || error.message.includes("row-level security")) {
          throw new Error("You don't have permission to create versions for this artifact");
        }
        if (error.message.includes("foreign key")) {
          throw new Error("Invalid message ID - message may have been deleted");
        }
        throw new Error(error.message || "Failed to create version");
      }

      return data as ArtifactVersion;
    },
    onSuccess: (newVersion) => {
      // Invalidate and refetch version history
      queryClient.invalidateQueries({ queryKey });

      // Also invalidate the general versions list
      queryClient.invalidateQueries({ queryKey: ["artifact-versions"] });

      // Check if this is a duplicate (same hash as previous)
      const isDuplicate = versions.length > 0 &&
        versions[0].content_hash === newVersion.content_hash &&
        versions[0].id === newVersion.id;

      if (isDuplicate) {
        toast.info("No changes detected - using existing version");
      } else {
        toast.success(`Version ${newVersion.version_number} created`);
      }
    },
    onError: (error: Error) => {
      console.error("Version creation error:", error);
      toast.error(error.message || "Failed to create version");
    },
    retry: false, // Don't retry mutations
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Current (latest) version
  const currentVersion = versions.length > 0 ? versions[0] : undefined;

  // Total version count
  const versionCount = versions.length;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Revert artifact to a specific version
   * Returns the version data to be applied
   */
  const revertToVersion = (versionNumber: number): ArtifactVersion | null => {
    const targetVersion = versions.find(v => v.version_number === versionNumber);

    if (!targetVersion) {
      toast.error(`Version ${versionNumber} not found`);
      return null;
    }

    toast.success(`Reverted to version ${versionNumber}`);
    return targetVersion;
  };

  /**
   * Get diff between two versions
   * Returns content for comparison
   */
  const getVersionDiff = (fromVersion: number, toVersion: number) => {
    const from = versions.find(v => v.version_number === fromVersion);
    const to = versions.find(v => v.version_number === toVersion);

    if (!from || !to) {
      toast.error("One or both versions not found");
      return null;
    }

    return {
      oldContent: from.artifact_content,
      newContent: to.artifact_content,
      oldTitle: from.artifact_title,
      newTitle: to.artifact_title,
      oldType: from.artifact_type,
      newType: to.artifact_type,
    };
  };

  /**
   * Get version by number
   */
  const getVersion = (versionNumber: number): ArtifactVersion | undefined => {
    return versions.find(v => v.version_number === versionNumber);
  };

  /**
   * Check if content has changed since last version
   */
  const hasContentChanged = async (content: string): Promise<boolean> => {
    if (!currentVersion) return true;

    const newHash = await computeSHA256(content);
    return newHash !== currentVersion.content_hash;
  };

  // ============================================================================
  // RETURN API
  // ============================================================================
  return {
    // Data
    versions,
    currentVersion,
    versionCount,

    // Loading states
    isLoading,
    isCreating: createVersionMutation.isPending,
    error: error?.message || null,

    // Actions
    createVersion: async (artifact: ArtifactData, messageId: string) => {
      return createVersionMutation.mutateAsync({ messageId, artifact });
    },
    revertToVersion,
    getVersionDiff,
    getVersion,
    hasContentChanged,

    // Manual refetch
    refetch,
  };
}

/**
 * Hook variant for multiple artifacts (batch fetching)
 * Useful for displaying version counts in artifact lists
 */
export function useArtifactVersionCounts(artifactIds: string[]) {
  return useQuery({
    queryKey: ["artifact-version-counts", artifactIds],
    queryFn: async () => {
      if (artifactIds.length === 0) return {};

      const { data, error } = await supabase
        .from("artifact_versions")
        .select("artifact_id")
        .in("artifact_id", artifactIds);

      if (error) throw new Error(error.message);

      // Count versions per artifact
      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.artifact_id] = (counts[row.artifact_id] || 0) + 1;
      });

      return counts;
    },
    enabled: artifactIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
