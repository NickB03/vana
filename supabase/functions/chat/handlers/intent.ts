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

  // INTENT DETECTION DISABLED - Artifacts only via explicit user control
  // The embedding-based detection was too aggressive, routing informational queries
  // (like weather forecasts) to artifact generation at medium confidence.
  // Now artifacts are ONLY generated when user clicks the artifact button.
  //
  // To re-enable in future: uncomment the blocks below and tune thresholds
  // - Raise similarity_threshold from 0.3 to 0.5+ in intent-detector-embeddings.ts
  // - Only route on HIGH confidence (remove medium confidence routing)
  console.log('🔍 Intent detection DISABLED - artifacts require explicit user control');

  // Check for image generation request (still enabled - images are different UX)
  const isImageRequest = await shouldGenerateImage(lastUserMessage);
  if (isImageRequest) {
    console.log('🎯 INTENT: Image generation detected (high confidence)');
    return {
      type: 'image',
      shouldSearch: false, // Images don't need web search
      reasoning: 'High confidence image generation request detected'
    };
  }

  // DISABLED: Automatic artifact detection
  // const isArtifactRequest = await shouldGenerateArtifact(lastUserMessage);
  // if (isArtifactRequest) {
  //   const artifactType = await getArtifactType(lastUserMessage);
  //   console.log(`🎯 INTENT: Artifact generation detected (type: ${artifactType})`);
  //   return {
  //     type: 'artifact',
  //     artifactType,
  //     shouldSearch: false, // Artifacts don't need web search
  //     reasoning: `High confidence ${artifactType} artifact request detected`
  //   };
  // }

  // Determine if we should perform web search
  // Web search is skipped for artifact/image generation
  const shouldSearch = TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED ||
    shouldPerformWebSearch(lastUserMessage);

  // Warn if always-search mode is enabled (should be false in production)
  if (TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED) {
    console.warn('[Smart Search] TAVILY_ALWAYS_SEARCH is enabled - all queries will trigger search (bypassing intent detection)');
  }

  console.log('🎯 INTENT: Regular chat (no artifact/image intent detected)');
  // Default to regular chat
  return {
    type: 'chat',
    shouldSearch,
    reasoning: 'Regular chat interaction - no high confidence artifact/image intent detected'
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
