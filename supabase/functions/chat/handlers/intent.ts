/**
 * Intent Detection Handler
 * Determines what type of response to generate (chat, artifact, image, web search)
 */

import { shouldGenerateImage, shouldGenerateArtifact, getArtifactType } from "../intent-detector-embeddings.ts";
import { shouldPerformWebSearch } from "../intent-detector-embeddings.ts";
import { TAVILY_CONFIG } from "../../_shared/config.ts";

export interface IntentResult {
  type: 'chat' | 'artifact' | 'image' | 'web_search';
  artifactType?: string | null;
  shouldSearch: boolean;
  reasoning: string;
}

export interface IntentOptions {
  forceArtifactMode?: boolean;
  forceImageMode?: boolean;
  lastUserMessage: string;
}

/**
 * Analyzes user intent to determine routing decision
 * Priority: forceArtifactMode > forceImageMode > intent detection
 */
export async function detectUserIntent(options: IntentOptions): Promise<IntentResult> {
  const { forceArtifactMode, forceImageMode, lastUserMessage } = options;

  // Check for explicit user control FIRST (force modes bypass intent detection entirely)
  if (forceArtifactMode) {
    console.log('🎯 FORCE ARTIFACT MODE - skipping intent detection');
    const artifactType = await getArtifactType(lastUserMessage);
    return {
      type: 'artifact',
      artifactType,
      shouldSearch: false, // Artifacts don't need web search
      reasoning: 'User explicitly requested artifact mode'
    };
  }

  if (forceImageMode) {
    console.log('🎯 FORCE IMAGE MODE - skipping intent detection');
    return {
      type: 'image',
      shouldSearch: false, // Images don't need web search
      reasoning: 'User explicitly requested image mode'
    };
  }

  // TEMPORARILY DISABLED: Intent detection causing false positives
  // Only use explicit force modes for now
  const isImageRequest = false; // forceImageMode only
  const isArtifactRequest = false; // forceArtifactMode only

  // Determine if we should perform web search
  // Web search is skipped for artifact/image generation
  const shouldSearch = TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED ||
    shouldPerformWebSearch(lastUserMessage);

  // Default to regular chat
  return {
    type: 'chat',
    shouldSearch,
    reasoning: 'Regular chat interaction'
  };
}

/**
 * Helper function to extract meaningful title from image prompt
 */
export function extractImageTitle(prompt: string): string {
  // Remove "generate image of" type phrases
  const cleaned = prompt
    .replace(/^(generate|create|make|draw|design|show me|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)\s+(of\s+)?/i, '')
    .trim();

  // Capitalize first letter and limit length
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}
