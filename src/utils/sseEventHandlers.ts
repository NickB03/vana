/**
 * SSE Event Handlers for Tool-Calling Chat Stream
 *
 * Extracted from useChatMessages.tsx for testability and reusability.
 * These functions handle artifact_complete and image_complete SSE events
 * from the tool-calling chat endpoint.
 *
 * Bug Fix (2025-12-20): Tool-calling chat emits artifact_complete and
 * image_complete events, but the chat stream parser was not handling them,
 * causing blank responses after artifact/image generation.
 */

/**
 * Maps artifact type to MIME type format expected by MessageWithArtifacts parser
 * @param artifactType - The type of artifact (e.g., 'react', 'code', 'html')
 * @returns MIME type string (e.g., 'application/vnd.ant.react')
 */
export function mapArtifactTypeToMime(artifactType: string): string {
  return artifactType === 'react'
    ? 'application/vnd.ant.react'
    : `application/vnd.ant.${artifactType}`;
}

/**
 * Escapes special characters in artifact title to prevent XML parsing issues
 * and XSS vulnerabilities
 * @param title - The artifact title (may be null/undefined)
 * @returns Escaped title string or default 'Generated Artifact'
 */
export function escapeArtifactTitle(title: string | null | undefined): string {
  return (title || 'Generated Artifact')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds artifact XML tags for MessageWithArtifacts parser
 * @param mimeType - The MIME type (e.g., 'application/vnd.ant.react')
 * @param safeTitle - The escaped title
 * @param artifactCode - The artifact code/content
 * @returns XML string for artifact
 */
export function buildArtifactXml(
  mimeType: string,
  safeTitle: string,
  artifactCode: string
): string {
  return `<artifact type="${mimeType}" title="${safeTitle}">\n${artifactCode}\n</artifact>`;
}

/**
 * Builds image artifact XML tags for MessageWithArtifacts parser
 * @param displayUrl - The image URL (storage URL or base64 data URL)
 * @returns XML string for image artifact
 */
export function buildImageArtifactXml(displayUrl: string): string {
  return `<artifact type="image" title="Generated Image">\n${displayUrl}\n</artifact>`;
}

/**
 * Result of processing an artifact or image complete event
 */
export interface EventProcessingResult {
  fullResponse: string;
  artifactDetected: boolean;
  artifactClosed: boolean;
  reasoningText?: string;
}

/**
 * Processes an artifact_complete SSE event from tool-calling chat
 * @param event - The parsed SSE event containing artifact data
 * @param existingResponse - Any existing response text to append after the artifact
 * @param existingReasoning - Any existing reasoning text
 * @returns Result with updated fullResponse and detection flags
 */
export function processArtifactCompleteEvent(
  event: {
    type: 'artifact_complete';
    artifactCode: string;
    artifactType: string;
    artifactTitle?: string;
    reasoning?: string;
  },
  existingResponse: string = '',
  existingReasoning: string = ''
): EventProcessingResult {
  if (!event.artifactCode) {
    return {
      fullResponse: existingResponse,
      artifactDetected: false,
      artifactClosed: false,
      reasoningText: existingReasoning
    };
  }

  const mimeType = mapArtifactTypeToMime(event.artifactType);
  const safeTitle = escapeArtifactTitle(event.artifactTitle);
  const artifactXml = buildArtifactXml(mimeType, safeTitle, event.artifactCode);

  // Prepend artifact to existing response (artifact comes before GLM's continuation text)
  const fullResponse = artifactXml + (existingResponse ? '\n\n' + existingResponse : '');

  // Use provided reasoning if no existing reasoning
  const reasoningText = existingReasoning || event.reasoning || '';

  return {
    fullResponse,
    artifactDetected: true,
    artifactClosed: true,
    reasoningText
  };
}

/**
 * Processes an image_complete SSE event from tool-calling chat
 * @param event - The parsed SSE event containing image data
 * @param existingResponse - Any existing response text to append after the image
 * @returns Result with updated fullResponse and detection flags
 */
export function processImageCompleteEvent(
  event: {
    type: 'image_complete';
    imageUrl?: string;
    imageData?: string;
    storageSucceeded?: boolean;
  },
  existingResponse: string = ''
): EventProcessingResult {
  // Use storage URL if available, otherwise fall back to base64 data
  const displayUrl = event.imageUrl || event.imageData;

  if (!displayUrl) {
    return {
      fullResponse: existingResponse,
      artifactDetected: false,
      artifactClosed: false
    };
  }

  const imageXml = buildImageArtifactXml(displayUrl);

  // Prepend image to existing response
  const fullResponse = imageXml + (existingResponse ? '\n\n' + existingResponse : '');

  return {
    fullResponse,
    artifactDetected: true,
    artifactClosed: true
  };
}
