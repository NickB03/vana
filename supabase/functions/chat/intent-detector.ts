/**
 * Intent Detection for Artifact Type Routing
 * Analyzes user prompts to determine the most appropriate artifact type or action
 */

export interface IntentResult {
  type: 'image' | 'svg' | 'react' | 'code' | 'markdown' | 'mermaid' | 'chat';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}


interface Pattern {
  intent: IntentResult['type'];
  pattern: RegExp;
  score: number;
}

/**
 * Analyzes a user prompt to determine intent using a weighted scoring system.
 * This approach is more robust for ambiguous prompts and defaults to React for all web artifacts.
 */
export function detectIntent(prompt: string): IntentResult {
  const lowerPrompt = prompt.toLowerCase();

  // HIGH CONFIDENCE PATTERNS - These should trigger immediate routing (score >= 25)
  const HIGH_CONFIDENCE_PATTERNS: Pattern[] = [
    // Explicit creation verbs + artifact type
    { intent: 'react', pattern: /^(create|build|make|generate)\s+(a|an|me)?\s*(react|interactive|web)\s*(app|component|application|interface|dashboard)/i, score: 30 },
    { intent: 'mermaid', pattern: /^(draw|create|generate|make)\s+(a|an|me)?\s*(mermaid|flowchart|sequence|class|state)\s*(diagram|chart)/i, score: 30 },
    { intent: 'svg', pattern: /^(generate|create|make|draw)\s+(a|an|me)?\s*(svg|vector|icon|logo)/i, score: 30 },
    { intent: 'image', pattern: /^(generate|create|draw|paint|make)\s+(a|an|me)?\s*(image|picture|photo|artwork|illustration)\s+(of|showing|depicting)/i, score: 30 },
  ];

  // NEGATIVE PATTERNS - These should prevent false positives (checked FIRST)
  const NEGATIVE_PATTERNS: RegExp[] = [
    // Questions about concepts (not creation requests)
    /^(what|how|why|when|where|who)\s+/i,
    /^(explain|tell me about|describe|define)\s+/i,
    /^(can you|could you|would you)\s+(explain|tell|describe|help me understand)/i,
    // Clarification requests
    /\?$/,  // Ends with question mark
    /^(is it|are there|does it|do they)\s+/i,
  ];

  const patterns: Pattern[] = [
    // --- Specific, High-Value Intents (should win most of the time) ---
    { intent: 'mermaid', pattern: /\b(flowchart|flow chart|sequence diagram|class diagram|state diagram|gantt chart|er diagram|entity relationship diagram|decision tree)\b/i, score: 25 },
    { intent: 'svg', pattern: /\b(logo|icon|badge|emblem|vector|svg|scalable|wireframe)\b/i, score: 25 },
    { intent: 'image', pattern: /\b(image|photograph|photo|picture|realistic|photorealistic|movie poster|album cover|pixel art|wallpaper|scene|landscape|portrait)\b/i, score: 25 },
    { intent: 'code', pattern: /\b(function|script|algorithm|code|api|backend|server)\b.*\b(python|javascript|typescript|java|c\+\+|rust|go)\b/i, score: 20 },
    { intent: 'markdown', pattern: /\b(document|article|essay|report|guide|tutorial|documentation|readme|blog post)\b/i, score: 20 },

    // --- All Web Content is React ---
    // Indicators of Interactivity (high score for React)
    { intent: 'react', pattern: /\b(interactive|dynamic|stateful|real-time|live update)\b/i, score: 15 },
    { intent: 'react', pattern: /\b(app|application|dashboard|tool|calculator|tracker|game|quiz|form|wizard|admin panel)\b/i, score: 15 },
    { intent: 'react', pattern: /\b(component|widget|button|input|card|modal|slider|toggle|counter|timer)\b/i, score: 10 },
    { intent: 'react', pattern: /\b(login|authentication|user accounts|database|api integration)\b/i, score: 10 },

    // Indicators of Static Content (now also map to React)
    { intent: 'react', pattern: /\b(site|website|page|landing page|homepage|portfolio|resume|web page|single page|one page)\b/i, score: 10 },
    { intent: 'react', pattern: /\b(static|informational|marketing|brochure|simple)\s+(site|website|page)\b/i, score: 10 },


    // --- Visual but ambiguous terms ---
    { intent: 'image', pattern: /\b(illustration|artwork|graphic|design|banner|poster)\b/i, score: 7 },
    { intent: 'svg', pattern: /\b(illustration|artwork|graphic|design|banner|poster)\b.*\b(simple|minimalist|flat|geometric)\b/i, score: 15 }, // SVG wins if simplicity is mentioned
    { intent: 'mermaid', pattern: /\b(diagram|chart)\b/i, score: 7 }, // Could be mermaid, but also could be a static image or interactive react component
    { intent: 'react', pattern: /\b(chart|graph|visualization)\b.*\b(interactive|dynamic)\b/i, score: 15 }, // React wins if interactive
  ];

  // Check negative patterns FIRST - if match, return chat intent immediately
  for (const negPattern of NEGATIVE_PATTERNS) {
    if (negPattern.test(prompt)) {
      return {
        type: 'chat',
        confidence: 'high',
        reasoning: `Question/clarification pattern detected: ${negPattern.source}`,
      };
    }
  }

  const scores: Record<IntentResult['type'], number> = {
    image: 0,
    svg: 0,
    react: 0,
    code: 0,
    markdown: 0,
    mermaid: 0,
    chat: 0,
  };

  const reasoning: Partial<Record<IntentResult['type'], string[]>> = {};

  // Check high confidence patterns first
  for (const { intent, pattern, score } of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(lowerPrompt)) {
      scores[intent] += score;
      if (!reasoning[intent]) {
        reasoning[intent] = [];
      }
      reasoning[intent]?.push(`HIGH: '${pattern.source}' matched (+${score})`);
    }
  }

  // Then check regular patterns
  for (const { intent, pattern, score } of patterns) {
    if (pattern.test(lowerPrompt)) {
      scores[intent] += score;
      if (!reasoning[intent]) {
        reasoning[intent] = [];
      }
      reasoning[intent]?.push(`'${pattern.source}' matched (+${score})`);
    }
  }

  let topIntent: IntentResult['type'] = 'chat';
  let maxScore = 0;

  // Find the intent with the highest score
  for (const intent in scores) {
    const currentScore = scores[intent as IntentResult['type']];
    if (currentScore > maxScore) {
      maxScore = currentScore;
      topIntent = intent as IntentResult['type'];
    }
  }

  // Calibrated confidence thresholds:
  // High confidence (score >= 25): auto-route to artifact/image
  // Medium confidence (score 15-24): still route but log for analysis
  // Low confidence (score < 15): default to chat
  const MIN_CONFIDENCE_SCORE = 15;
  if (maxScore < MIN_CONFIDENCE_SCORE) {
    return {
      type: 'chat',
      confidence: 'high',
      reasoning: `No specific artifact creation intent detected (max score: ${maxScore})`,
    };
  }

  // Set confidence based on calibrated thresholds
  let confidence: 'high' | 'medium' | 'low';
  if (maxScore >= 25) {
    confidence = 'high';
  } else if (maxScore >= 15) {
    confidence = 'medium';
    console.log(`⚠️  Medium confidence detection (score: ${maxScore}) - routing anyway but logging for analysis`);
  } else {
    confidence = 'low';
  }

  const finalReasoning = `Detected '${topIntent}' with score ${maxScore} (confidence: ${confidence}). Reasons: [${(reasoning[topIntent] || []).join(', ')}]`;

  return {
    type: topIntent,
    confidence,
    reasoning: finalReasoning,
  };
}

/**
 * Determines if a prompt should trigger image generation API
 */
export function shouldGenerateImage(prompt: string): boolean {
  const intent = detectIntent(prompt);
  return intent.type === 'image' && intent.confidence !== 'low';
}

/**
 * Determines if a prompt should trigger artifact generation (non-image artifacts)
 * Returns false for chat and image intents (handled separately)
 */
export function shouldGenerateArtifact(prompt: string): boolean {
  const intent = detectIntent(prompt);
  // Generate artifact for all non-chat, non-image types with medium+ confidence
  return intent.type !== 'chat' && intent.type !== 'image' && intent.confidence !== 'low';
}

/**
 * Gets the detected artifact type for delegation to generate-artifact function
 */
export function getArtifactType(prompt: string): string | null {
  const intent = detectIntent(prompt);
  if (intent.type === 'chat' || intent.type === 'image') {
    return null;
  }
  return intent.type;
}

/**
 * Provides context to AI about artifact type selection
 */
export function getArtifactGuidance(prompt: string): string {
  const intent = detectIntent(prompt);

  const guidance: Record<IntentResult['type'], string> = {
    image: `
ARTIFACT TYPE GUIDANCE:
This request should use IMAGE GENERATION (Gemini Flash Image model).
- Use for: Photo-realistic images, detailed artwork, complex scenes
- Type: <artifact type="image" title="...">
- Do NOT create SVG or React artifacts for this request`,

    svg: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for SVG vector graphics.
- Use for: Logos, icons, simple illustrations, geometric designs
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

  return guidance[intent.type];
}
