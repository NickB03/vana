import { useContext } from "react";
import { MultiArtifactContext } from "@/contexts/MultiArtifactContext";

/**
 * Hook to access multi-artifact context
 * @throws Error if used outside of MultiArtifactProvider
 */
export function useMultiArtifact() {
  const context = useContext(MultiArtifactContext);
  if (context === undefined) {
    throw new Error("useMultiArtifact must be used within a MultiArtifactProvider");
  }
  return context;
}
