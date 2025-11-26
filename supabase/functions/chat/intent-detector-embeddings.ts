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
const OPENROUTER_MODEL = "qwen/qwen3-embedding-8b"; // 1024 dimensions (configurable 32-4096)

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
        model: OPENROUTER_MODEL, // qwen/qwen3-embedding-8b - 1024 dimensions (configurable 32-4096)
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
      similarity_threshold: 0.3 // Temporarily lowered from 0.5 to help with matching
    });

    if (error) {
      console.error('pgvector search error:', error);
      return fallbackToChat('Database search error');
    }

    if (!matches || matches.length === 0) {
      console.log('🔍 [detectIntent] No matches found (similarity < 30%), falling back to regex');
      return detectIntentRegex(prompt);
    }

    const bestMatch = matches[0];
    console.log('🔍 [detectIntent] Best match:', {
      intent: bestMatch.intent,
      similarity: bestMatch.similarity,
      text: bestMatch.text?.substring(0, 50)
    });

    // Step 3: Determine confidence based on similarity score
    // Optimized thresholds with clarification system:
    // High (≥60%) - Execute immediately
    // Medium (40-60%) - Ask for clarification
    // Low (<40%) - Default to chat
    let confidence: 'high' | 'medium' | 'low';
    if (bestMatch.similarity >= 0.60) {
      confidence = 'high';
    } else if (bestMatch.similarity >= 0.40) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const result: IntentResult = {
      type: bestMatch.intent as IntentResult['type'],
      confidence,
      reasoning: `${(bestMatch.similarity * 100).toFixed(1)}% match: "${bestMatch.text}"`
    };

    console.log('🔍 [detectIntent] Final result:', result);

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
 * Clarifying question templates for ambiguous intents
 */
const CLARIFICATION_TEMPLATES: Record<string, Record<string, string>> = {
  image: {
    mermaid: "Would you like me to generate a photorealistic image or create a Mermaid diagram?",
    svg: "Would you like me to generate an image or create an SVG vector graphic?",
    react: "Would you like me to generate an image or build an interactive web component?",
    code: "Would you like me to generate an image or write code?"
  },
  mermaid: {
    image: "Would you like me to create a Mermaid diagram or generate a photorealistic image?",
    react: "Would you like me to create a Mermaid diagram or build an interactive web component?",
    markdown: "Would you like me to create a Mermaid diagram or write documentation?"
  },
  react: {
    image: "Would you like me to build an interactive web component or generate an image?",
    mermaid: "Would you like me to build an interactive web component or create a Mermaid diagram?",
    code: "Would you like me to build a full web component or just write code snippets?",
    markdown: "Would you like me to build an interactive component or write documentation?"
  },
  code: {
    react: "Would you like me to write code snippets or build a full interactive component?",
    image: "Would you like me to write code or generate an image?",
    markdown: "Would you like me to write code or create documentation?"
  },
  svg: {
    image: "Would you like me to create an SVG vector graphic or generate a photorealistic image?",
    react: "Would you like me to create an SVG or build an interactive web component?"
  },
  markdown: {
    react: "Would you like me to write documentation or build an interactive component?",
    mermaid: "Would you like me to write documentation or create a Mermaid diagram?",
    code: "Would you like me to write documentation or just code snippets?"
  }
};

/**
 * Checks if the user's prompt needs intent clarification
 * Returns clarification question if medium confidence, null if high/low
 */
export async function needsClarification(prompt: string): Promise<string | null> {
  // Check for explicit intent keywords that override semantic similarity
  // This ensures phrases like "generate an image" work immediately without clarification
  const explicitPatterns = {
    image: [
      /\b(generate|create|make|draw|design|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)/i,
      /\bshow\s+me\s+(an?\s+)?(image|picture|photo)/i
    ],
    mermaid: [
      /\b(create|make|draw|generate)\s+(an?\s+)?(flowchart|sequence\s+diagram|mermaid\s+diagram|process\s+diagram|state\s+diagram)/i,
      /\bmermaid\s+(diagram|chart)/i
    ],
    react: [
      /\b(build|create|make)\s+(an?\s+)?(web\s+app|website|dashboard|component|interface)/i,
      /\breact\s+(app|component|page)/i
    ],
    code: [
      /\b(write|show|create|generate)\s+(me\s+)?(code|function|script|algorithm)/i,
      /\b(python|javascript|typescript|rust|go)\s+(code|function|script)/i
    ],
    svg: [
      /\b(create|make|generate)\s+(an?\s+)?(svg|vector\s+graphic|scalable\s+vector)/i,
      /\bsvg\s+(graphic|icon|logo)/i
    ]
  };

  // Check if prompt explicitly mentions any intent type
  for (const [intentType, patterns] of Object.entries(explicitPatterns)) {
    if (patterns.some(pattern => pattern.test(prompt))) {
      console.log(`🎯 Explicit ${intentType} keywords detected, no clarification needed`);
      return null;
    }
  }

  const intent = await detectIntent(prompt);

  // High confidence - execute immediately
  if (intent.confidence === 'high') {
    console.log('🎯 High confidence intent, no clarification needed:', intent.type);
    return null;
  }

  // Low confidence - default to chat, no clarification
  if (intent.confidence === 'low') {
    console.log('💬 Low confidence, defaulting to chat');
    return null;
  }

  // Medium confidence - need clarification
  console.log('❓ Medium confidence, requesting clarification:', intent);

  // Get top 2 most similar intents to offer choice
  // For now, we'll use the detected intent and a common alternative
  const primaryIntent = intent.type;
  const commonAlternatives: Record<string, string> = {
    'image': 'mermaid',
    'mermaid': 'image',
    'react': 'code',
    'code': 'react',
    'svg': 'image',
    'markdown': 'code'
  };

  const alternativeIntent = commonAlternatives[primaryIntent] || 'react';

  // Get clarification template
  const template = CLARIFICATION_TEMPLATES[primaryIntent]?.[alternativeIntent];

  if (template) {
    return template;
  }

  // Fallback generic clarification
  return `I'm not entirely sure what you want. Could you clarify if you want me to generate an ${primaryIntent}?`;
}

/**
 * Determines if a prompt should trigger image generation API
 * Only executes with HIGH confidence (score >= 25)
 */
export async function shouldGenerateImage(prompt: string): Promise<boolean> {
  try {
    console.log('🔍 [shouldGenerateImage] Analyzing prompt:', prompt.substring(0, 100));
    const intent = await detectIntent(prompt);
    console.log('🔍 [shouldGenerateImage] Intent result:', {
      type: intent.type,
      confidence: intent.confidence,
      reasoning: intent.reasoning
    });

    // Execute image generation with HIGH or MEDIUM confidence
    // High confidence (score >= 25): auto-route
    // Medium confidence (score 15-24): still route but log for analysis
    const isHighOrMedium = intent.confidence === 'high' || intent.confidence === 'medium';
    const result = intent.type === 'image' && isHighOrMedium;

    if (result && intent.confidence === 'medium') {
      console.log(`⚠️  MEDIUM confidence image detection - routing anyway but logging for analysis`);
    }

    console.log(`🔍 [shouldGenerateImage] Final decision: ${result} (type=${intent.type}, confidence=${intent.confidence})`);
    return result;
  } catch (error) {
    console.error('❌ [shouldGenerateImage] Error detecting intent:', error);
    // Fallback to false on error (don't generate image)
    return false;
  }
}

/**
 * Determines if a prompt should trigger artifact generation (non-image artifacts)
 * Only executes with HIGH confidence (score >= 25)
 * Medium confidence (15-24) still routes but logs for analysis
 */
export async function shouldGenerateArtifact(prompt: string): Promise<boolean> {
  try {
    console.log('🔍 [shouldGenerateArtifact] Analyzing prompt:', prompt.substring(0, 100));
    const intent = await detectIntent(prompt);
    console.log('🔍 [shouldGenerateArtifact] Intent result:', {
      type: intent.type,
      confidence: intent.confidence,
      reasoning: intent.reasoning
    });

    // Execute artifact generation with HIGH or MEDIUM confidence
    // High confidence (score >= 25): auto-route
    // Medium confidence (score 15-24): still route but log for analysis
    const isHighOrMedium = intent.confidence === 'high' || intent.confidence === 'medium';
    const result = intent.type !== 'chat' && intent.type !== 'image' && isHighOrMedium;

    if (result && intent.confidence === 'medium') {
      console.log(`⚠️  MEDIUM confidence artifact detection (${intent.type}) - routing anyway but logging for analysis`);
    }

    console.log(`🔍 [shouldGenerateArtifact] Final decision: ${result} (type=${intent.type}, confidence=${intent.confidence})`);
    return result;
  } catch (error) {
    console.error('❌ [shouldGenerateArtifact] Error detecting intent:', error);
    // Fallback to false on error (don't generate artifact)
    return false;
  }
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

/**
 * Determines if a prompt should trigger web search via Tavily
 * Detects queries requesting current information, recent events, or real-time data
 *
 * @param prompt - User's message text
 * @returns true if web search should be performed
 *
 * @example
 * shouldPerformWebSearch("what is the latest news about AI?") // true
 * shouldPerformWebSearch("explain how React works") // false
 */
export function shouldPerformWebSearch(prompt: string): boolean {
  const normalizedPrompt = prompt.toLowerCase().trim();

  // Explicit search keywords (high confidence triggers)
  const searchKeywords = [
    /\b(search|find|look up|lookup)\s+(for|about|information)\b/,
    /\bgoogle\s+(for|about)\b/,
    /\bweb\s+search\b/,
    /\b(can you|could you|please)\s+(search|find|look up)\b/,
    /\bsearch\s+(the\s+)?(web|internet)\b/
  ];

  // Temporal indicators (asking for current/recent information)
  const temporalKeywords = [
    /\b(latest|recent|current|newest|today|yesterday|this week|this month|2025|2024|2026)\b/,
    /\b(now|right now|at the moment|currently)\b/,
    /\b(what'?s (new|happening)|breaking news)\b/,
    /\bup to date\b/,
    /\breal[ -]?time\b/
  ];

  // Information request patterns
  const informationPatterns = [
    /\b(what|who|when|where)\s+(is|are|was|were)\b.*\b(now|today|currently|latest)\b/,
    /\b(tell me|show me|get me)\s+(about|the)?\s*(latest|recent|current|new)\b/,
    /\bhow\s+much\s+(is|are|does|do)\b.*\b(now|today|currently)\b/,
    /\bprice\s+of\b/,
    /\bstock\s+(price|market)\b/,
    /\bweather\s+(in|for|at)\b/,
    /\bnews\s+(about|on|regarding)\b/,
    /\b(top|trending)\s+(news|stories|headlines)\b/
  ];

  // Check for search keywords
  if (searchKeywords.some(pattern => pattern.test(normalizedPrompt))) {
    console.log('🔍 [shouldPerformWebSearch] Explicit search keyword detected');
    return true;
  }

  // Check for temporal + information patterns
  const hasTemporalIndicator = temporalKeywords.some(pattern => pattern.test(normalizedPrompt));
  const hasInformationPattern = informationPatterns.some(pattern => pattern.test(normalizedPrompt));

  if (hasTemporalIndicator || hasInformationPattern) {
    console.log('🔍 [shouldPerformWebSearch] Temporal/information pattern detected');
    return true;
  }

  // No search indicators found
  return false;
}
