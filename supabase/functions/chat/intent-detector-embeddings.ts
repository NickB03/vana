/**
 * Embedding-based Intent Detection using Supabase pgvector
 * Uses mixedbread-ai/mxbai-embed-large-v1 model (1024 dimensions)
 * Embeddings pre-computed locally via LM Studio
 * Runtime queries via qwen/qwen3-embedding-0.6b on OpenRouter (all environments)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { detectIntent as detectIntentRegex } from './intent-detector.ts';

export interface IntentResult {
  type: 'image' | 'svg' | 'react' | 'code' | 'markdown' | 'mermaid' | 'chat';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Important: mxbai-embed-large-v1 requires this prompt for query embeddings (NOT for documents)
const QUERY_PROMPT = "Represent this sentence for searching relevant passages: ";

// Configuration for runtime embedding generation via OpenRouter
const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";
const OPENROUTER_MODEL = "qwen/qwen3-embedding-0.6b"; // 1024 dimensions

/**
 * Generate embedding for user query using OpenRouter
 */
async function generateQueryEmbedding(prompt: string): Promise<number[]> {
  const queryText = QUERY_PROMPT + prompt;

  const openrouterKey = Deno.env.get('OPENROUTER_EMBEDDING_KEY');
  if (!openrouterKey) {
    console.warn('⚠️  OPENROUTER_EMBEDDING_KEY not set');
    throw new Error('OPENROUTER_EMBEDDING_KEY not set. Add it to Supabase secrets.');
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://example.com',
        'X-Title': 'Intent Detection'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL, // qwen/qwen3-embedding-0.6b - 1024 dimensions
        input: queryText,
        dimensions: 1024 // Explicitly request 1024 dimensions to match stored embeddings
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎯 Using OpenRouter for query embedding:', OPENROUTER_MODEL);
    return data.data[0].embedding;
  } catch (error) {
    console.error('OpenRouter embedding failed:', error);
    throw error;
  }
}

/**
 * Analyzes a user prompt using embedding similarity to determine intent
 */
export async function detectIntent(prompt: string): Promise<IntentResult> {
  const startTime = Date.now();
  try {
    // Step 1: Generate embedding for user's prompt
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateQueryEmbedding(prompt);
    } catch (error) {
      console.warn('⚠️  Embedding generation failed, falling back to regex:', error.message);
      return detectIntentRegex(prompt);
    }

    // Step 2: Search pgvector for most similar canonical example
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: matches, error } = await supabase.rpc('match_intent_examples', {
      query_embedding: queryEmbedding,
      match_count: 1,
      similarity_threshold: 0.5
    });

    if (error) {
      console.error('pgvector search error:', error);
      return fallbackToChat('Database search error');
    }

    if (!matches || matches.length === 0) {
      return {
        type: 'chat',
        confidence: 'low',
        reasoning: 'No similar examples found (similarity < 50%)'
      };
    }

    const bestMatch = matches[0];

    // Step 3: Determine confidence based on similarity score
    let confidence: 'high' | 'medium' | 'low';
    if (bestMatch.similarity >= 0.80) {
      confidence = 'high';
    } else if (bestMatch.similarity >= 0.70) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const result: IntentResult = {
      type: bestMatch.intent as IntentResult['type'],
      confidence,
      reasoning: `${(bestMatch.similarity * 100).toFixed(1)}% match: "${bestMatch.text}"`
    };

    // Observability logging
    const latencyMs = Date.now() - startTime;
    console.log('🎯 Intent Detection:', {
      intent: result.type,
      confidence: result.confidence,
      similarity: bestMatch.similarity.toFixed(3),
      matchedExample: bestMatch.text.substring(0, 50) + '...',
      userPrompt: prompt.substring(0, 50) + '...',
      latencyMs
    });

    return result;

  } catch (error) {
    console.error('Intent detection error:', error);
    return fallbackToChat(`Unexpected error: ${error.message}`);
  }
}

/**
 * Fallback to chat intent when errors occur
 */
function fallbackToChat(reason: string): IntentResult {
  return {
    type: 'chat',
    confidence: 'low',
    reasoning: `Fallback to chat: ${reason}`
  };
}

/**
 * Determines if a prompt should trigger image generation API
 */
export async function shouldGenerateImage(prompt: string): Promise<boolean> {
  const intent = await detectIntent(prompt);
  return intent.type === 'image' && intent.confidence !== 'low';
}

/**
 * Determines if a prompt should trigger artifact generation (non-image artifacts)
 * Returns false for chat and image intents (handled separately)
 */
export async function shouldGenerateArtifact(prompt: string): Promise<boolean> {
  const intent = await detectIntent(prompt);
  return intent.type !== 'chat' && intent.type !== 'image' && intent.confidence !== 'low';
}

/**
 * Gets the detected artifact type for delegation to generate-artifact function
 */
export async function getArtifactType(prompt: string): Promise<string | null> {
  const intent = await detectIntent(prompt);
  if (intent.type === 'chat' || intent.type === 'image') {
    return null;
  }
  return intent.type;
}

/**
 * Provides context to AI about artifact type selection
 */
export function getArtifactGuidance(artifactType: string): string {
  const guidance: Record<string, string> = {
    image: `
ARTIFACT TYPE GUIDANCE:
This request should use IMAGE GENERATION (gemini-2.5-flash-image-preview).
- Use for: Photo-realistic images, detailed artwork, complex scenes, logos, icons
- Type: <artifact type="image" title="...">
- Do NOT create SVG or React artifacts for this request`,

    svg: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for SVG vector graphics.
- Use for: Scalable vector logos, simple geometric designs
- Type: <artifact type="image/svg+xml" title="...">
- Keep it simple and scalable
- Use clean, minimal paths`,

    react: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for a React component.
- Use for: ALL web pages, sites, and interactive apps.
- Type: <artifact type="application/vnd.ant.react" title="...">
- Use shadcn/ui components where appropriate for a polished look.
- Implement full functionality with React hooks.`,

    code: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for a code artifact.
- Use for: Scripts, functions, algorithms
- Type: <artifact type="application/vnd.ant.code" language="..." title="...">
- Include language attribute
- Make it complete and runnable`,

    markdown: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for a markdown document.
- Use for: Documentation, articles, guides, reports
- Type: <artifact type="text/markdown" title="...">
- Use proper markdown formatting
- Make it well-structured and easy to read`,

    mermaid: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for a Mermaid diagram.
- Use for: Flowcharts, sequence diagrams, timelines
- Type: <artifact type="application/vnd.ant.mermaid" title="...">
- Use proper Mermaid syntax
- Keep it clear and readable`,

    chat: ''
  };

  return guidance[artifactType] || '';
}
