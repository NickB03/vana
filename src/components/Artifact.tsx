/**
 * @deprecated This file is maintained for backward compatibility only.
 * Use ArtifactContainer directly for new code.
 *
 * The canonical implementation is in ArtifactContainer.tsx which uses
 * ai-elements UI primitives for consistent styling and behavior.
 *
 * This re-export ensures existing imports continue to work while
 * centralizing maintenance to a single implementation.
 */

// Re-export ArtifactContainer as the canonical implementation
export { ArtifactContainer as Artifact } from './ArtifactContainer';

// Re-export all types for backward compatibility
export type { ArtifactData, ArtifactType } from './ArtifactContainer';
