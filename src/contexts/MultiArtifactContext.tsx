import { useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { MultiArtifactContext, ArtifactState, MultiArtifactContextType } from "@/contexts/MultiArtifactContextDef";
import { ArtifactData } from "@/components/ArtifactContainer";

// Re-export types for backward compatibility
export type { ArtifactState, MultiArtifactContextType };
export { MultiArtifactContext } from "@/contexts/MultiArtifactContextDef";

const STORAGE_KEY = "multi-artifact-state";
const MAX_ARTIFACTS = 5;

interface MultiArtifactProviderProps {
  children: ReactNode;
}

/**
 * Provider for managing multiple artifacts simultaneously
 *
 * Features:
 * - Supports up to 5 concurrent artifacts
 * - LRU eviction when limit reached
 * - sessionStorage persistence
 * - Automatic restoration on page refresh
 * - Duplicate detection
 */
export function MultiArtifactProvider({ children }: MultiArtifactProviderProps) {
  const [artifacts, setArtifacts] = useState<Map<string, ArtifactState>>(new Map());
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restoredMap = new Map<string, ArtifactState>(
          Object.entries(parsed.artifacts).map(([id, state]) => [id, state as ArtifactState])
        );
        setArtifacts(restoredMap);
        setActiveArtifactId(parsed.activeArtifactId);
      }
    } catch (error) {
      console.error("Failed to restore multi-artifact state:", error);
      // Clear corrupted state
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist state to sessionStorage on changes
  useEffect(() => {
    try {
      const state = {
        artifacts: Object.fromEntries(artifacts),
        activeArtifactId
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to persist multi-artifact state:", error);
    }
  }, [artifacts, activeArtifactId]);

  /**
   * Add artifact with duplicate detection and LRU eviction
   */
  const addArtifact = useCallback((artifact: ArtifactData, messageId?: string) => {
    setArtifacts(prev => {
      // Check for duplicate
      if (prev.has(artifact.id)) {
        console.log(`Artifact ${artifact.id} already exists, updating timestamp`);
        const existing = prev.get(artifact.id)!;
        const updated = new Map(prev);
        updated.set(artifact.id, {
          ...existing,
          artifact,
          messageId: messageId || existing.messageId,
          addedAt: Date.now() // Update timestamp for LRU
        });
        return updated;
      }

      const newMap = new Map(prev);

      // LRU eviction if at max capacity
      if (newMap.size >= MAX_ARTIFACTS) {
        // Find least recently used (oldest addedAt)
        let oldestId: string | null = null;
        let oldestTime = Infinity;

        newMap.forEach((state, id) => {
          if (state.addedAt < oldestTime) {
            oldestTime = state.addedAt;
            oldestId = id;
          }
        });

        if (oldestId) {
          console.log(`Max artifacts reached, evicting ${oldestId}`);
          newMap.delete(oldestId);

          // Update active artifact if we evicted it
          if (activeArtifactId === oldestId) {
            const remaining = Array.from(newMap.keys());
            setActiveArtifactId(remaining.length > 0 ? remaining[0] : null);
          }
        }
      }

      // Add new artifact
      newMap.set(artifact.id, {
        artifact,
        messageId,
        isMinimized: false,
        position: newMap.size,
        addedAt: Date.now()
      });

      // Set as active if no active artifact
      if (!activeArtifactId || !newMap.has(activeArtifactId)) {
        setActiveArtifactId(artifact.id);
      }

      return newMap;
    });
  }, [activeArtifactId]);

  /**
   * Remove artifact and update active if needed
   */
  const removeArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev => {
      if (!prev.has(artifactId)) {
        console.warn(`Artifact ${artifactId} not found`);
        return prev;
      }

      const newMap = new Map(prev);
      newMap.delete(artifactId);

      // Update active artifact if we removed it
      if (activeArtifactId === artifactId) {
        const remaining = Array.from(newMap.keys());
        setActiveArtifactId(remaining.length > 0 ? remaining[0] : null);
      }

      // Re-index positions
      let position = 0;
      newMap.forEach((state, id) => {
        newMap.set(id, { ...state, position: position++ });
      });

      return newMap;
    });
  }, [activeArtifactId]);

  /**
   * Set active artifact with validation
   */
  const handleSetActiveArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev => {
      if (!prev.has(artifactId)) {
        console.warn(`Cannot set active artifact: ${artifactId} not found`);
        return prev;
      }
      setActiveArtifactId(artifactId);
      return prev;
    });
  }, []);

  /**
   * Toggle minimize state
   */
  const minimizeArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev => {
      const state = prev.get(artifactId);
      if (!state) {
        console.warn(`Artifact ${artifactId} not found`);
        return prev;
      }

      const newMap = new Map(prev);
      newMap.set(artifactId, {
        ...state,
        isMinimized: !state.isMinimized
      });
      return newMap;
    });
  }, []);

  /**
   * Clear all artifacts
   */
  const clearAll = useCallback(() => {
    setArtifacts(new Map());
    setActiveArtifactId(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Get artifact by ID
   */
  const getArtifact = useCallback((artifactId: string) => {
    return artifacts.get(artifactId);
  }, [artifacts]);

  /**
   * Check if artifact exists
   */
  const hasArtifact = useCallback((artifactId: string) => {
    return artifacts.has(artifactId);
  }, [artifacts]);

  const value: MultiArtifactContextType = {
    artifacts,
    activeArtifactId,
    maxArtifacts: MAX_ARTIFACTS,
    addArtifact,
    removeArtifact,
    setActiveArtifact: handleSetActiveArtifact,
    minimizeArtifact,
    clearAll,
    getArtifact,
    hasArtifact
  };

  return (
    <MultiArtifactContext.Provider value={value}>
      {children}
    </MultiArtifactContext.Provider>
  );
}
