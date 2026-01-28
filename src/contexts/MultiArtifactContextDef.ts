import { createContext } from "react";
import { ArtifactData } from "@/components/ArtifactContainer";

/**
 * State for a single artifact in the multi-artifact system
 */
export interface ArtifactState {
  /** The artifact data */
  artifact: ArtifactData;
  /** ID of the message that created this artifact */
  messageId?: string;
  /** Whether the artifact is minimized in the UI */
  isMinimized?: boolean;
  /** Position/order in the artifact list */
  position?: number;
  /** Timestamp when artifact was added (for LRU eviction) */
  addedAt: number;
}

/**
 * Context value providing multi-artifact management
 */
export interface MultiArtifactContextType {
  /** Map of artifact IDs to their state */
  artifacts: Map<string, ArtifactState>;
  /** ID of the currently active/focused artifact */
  activeArtifactId: string | null;
  /** Maximum number of concurrent artifacts allowed */
  maxArtifacts: number;
  /**
   * Add a new artifact to the collection
   * If max artifacts reached, removes the least recently used
   * @param artifact - The artifact to add
   * @param messageId - Optional ID of the message that created this artifact
   */
  addArtifact: (artifact: ArtifactData, messageId?: string) => void;
  /**
   * Remove an artifact from the collection
   * @param artifactId - ID of the artifact to remove
   */
  removeArtifact: (artifactId: string) => void;
  /**
   * Set the active/focused artifact
   * @param artifactId - ID of the artifact to make active
   */
  setActiveArtifact: (artifactId: string) => void;
  /**
   * Toggle minimize state of an artifact
   * @param artifactId - ID of the artifact to minimize/restore
   */
  minimizeArtifact: (artifactId: string) => void;
  /**
   * Clear all artifacts from the collection
   */
  clearAll: () => void;
  /**
   * Get artifact state by ID
   * @param artifactId - ID of the artifact to retrieve
   */
  getArtifact: (artifactId: string) => ArtifactState | undefined;
  /**
   * Check if an artifact exists in the collection
   * @param artifactId - ID of the artifact to check
   */
  hasArtifact: (artifactId: string) => boolean;
}

export const MultiArtifactContext = createContext<MultiArtifactContextType | undefined>(undefined);
