/**
 * Intent Detection for Artifact Type Routing
 * Analyzes user prompts to determine the most appropriate artifact type or action
 */

export interface IntentResult {
  type: 'image' | 'svg' | 'html' | 'react' | 'code' | 'markdown' | 'mermaid' | 'chat';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Analyzes a user prompt to determine intent
 */
export function detectIntent(prompt: string): IntentResult {
  const lowerPrompt = prompt.toLowerCase();

  // IMAGE GENERATION (photo-realistic, raster images)
  // High confidence patterns for image generation
  const imageHighConfidence = [
    /\b(photograph|photo|picture|realistic|photorealistic)\b/i,
    /\b(generate|create|make|show me)\s+(a|an)?\s*(photo|picture|image)\b/i, // Removed requirement for " of"
    /\b(generate|create)\s+(an?\s+)?image\b/i, // "generate image" or "create an image"
    /\b(movie poster|album cover|book cover|magazine cover)\b/i,
    /\b(portrait|landscape photo|headshot|profile picture)\b/i,
    /\b(wallpaper|background|backdrop|scene)\b.*\b(realistic|detailed|photographic)\b/i,
    /\b(pixel art|8-bit|16-bit|retro pixel|pixelated)\b/i, // Pixel art is image generation
  ];

  // Medium confidence - could be image or SVG
  const imageMediumConfidence = [
    /\b(poster|banner|thumbnail|cover)\b/i,
    /\b(illustration|artwork|graphic)\b.*\b(detailed|complex|realistic)\b/i,
  ];

  for (const pattern of imageHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'image',
        confidence: 'high',
        reasoning: 'Request explicitly asks for photo-realistic or raster image content'
      };
    }
  }

  // SVG (vector graphics, logos, icons, simple illustrations)
  const svgHighConfidence = [
    /\b(logo|icon|badge|emblem|symbol)\b/i,
    /\b(vector|svg|scalable)\b/i,
    /\b(simple|minimalist|flat|geometric)\s+(design|illustration|graphic)\b/i,
    /\b(line art|outline|wireframe)\b/i,
    /\b(infographic|diagram|chart)\b.*\b(simple|basic)\b/i,
  ];

  const svgKeywords = ['logo', 'icon', 'svg', 'vector', 'simple', 'flat design', 'geometric'];
  const svgKeywordCount = svgKeywords.filter(kw => lowerPrompt.includes(kw)).length;

  for (const pattern of svgHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'svg',
        confidence: 'high',
        reasoning: 'Request explicitly asks for vector graphics or simple illustrations'
      };
    }
  }

  if (svgKeywordCount >= 2) {
    return {
      type: 'svg',
      confidence: 'medium',
      reasoning: 'Multiple SVG-related keywords detected'
    };
  }

  // HTML (static web pages, landing pages, marketing sites)
  const htmlHighConfidence = [
    /\b(landing page|website|web page|homepage|marketing page)\b/i,
    /\b(html\s+page|static\s+site|portfolio\s+site)\b/i,
    /\b(single.page|one.page)\s+(website|site)\b/i,
  ];

  for (const pattern of htmlHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'html',
        confidence: 'high',
        reasoning: 'Request explicitly asks for a static web page or landing page'
      };
    }
  }

  // REACT (interactive web apps, dashboards, tools)
  const reactHighConfidence = [
    /\b(dashboard|app|application|tool|calculator|tracker)\b/i,
    /\b(interactive|dynamic|stateful)\b.*\b(component|app|interface)\b/i,
    /\b(todo|task|note|budget|expense|habit|fitness|workout)\s+(app|tracker|manager)\b/i,
    /\b(game|quiz|survey|form|wizard)\b/i,
    /\b(chart|graph|visualization)\b.*\b(interactive|dynamic)\b/i,
    // Simple component requests (added 2025-11-12)
    /\b(create|make|build)\s+(a|an)?\s*(react|component)\b/i,  // "create a React button"
    /\b(button|input|form|card|modal|dropdown|slider|toggle|switch)\b.*\b(react|component|interactive)\b/i,
    /\b(counter|timer|clock)\b/i,  // Simple interactive elements
  ];

  const reactKeywords = ['app', 'dashboard', 'tracker', 'calculator', 'game', 'interactive', 'tool'];
  const reactKeywordCount = reactKeywords.filter(kw => lowerPrompt.includes(kw)).length;

  for (const pattern of reactHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'react',
        confidence: 'high',
        reasoning: 'Request asks for interactive application or stateful component'
      };
    }
  }

  if (reactKeywordCount >= 2) {
    return {
      type: 'react',
      confidence: 'medium',
      reasoning: 'Multiple React-appropriate keywords detected'
    };
  }

  // MERMAID (diagrams, flowcharts)
  const mermaidHighConfidence = [
    /\b(flowchart|flow chart|flow diagram)\b/i,
    /\b(sequence diagram|class diagram|state diagram|er diagram|entity.relationship)\b/i,
    /\b(gantt chart|timeline|roadmap)\b/i,
    /\b(process flow|workflow|decision tree)\b/i,
    /\b(mermaid|diagram)\b/i,
  ];

  for (const pattern of mermaidHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'mermaid',
        confidence: 'high',
        reasoning: 'Request asks for diagram or chart type supported by Mermaid'
      };
    }
  }

  // CODE (scripts, algorithms, code snippets)
  const codeHighConfidence = [
    /\b(function|script|algorithm|code)\b.*\b(python|javascript|typescript|java|c\+\+|rust|go)\b/i,
    /\b(write|create|implement)\s+(a|an)?\s*(function|class|method|script)\b/i,
    /\b(api|backend|server|database)\s+(code|script|implementation)\b/i,
  ];

  for (const pattern of codeHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'code',
        confidence: 'high',
        reasoning: 'Request asks for code snippet or script in specific language'
      };
    }
  }

  // MARKDOWN (documents, articles, content)
  const markdownHighConfidence = [
    /\b(document|article|essay|report|guide|tutorial|documentation)\b/i,
    /\b(readme|changelog|proposal|specification)\b/i,
    /\b(blog post|content|text|writing)\b/i,
  ];

  for (const pattern of markdownHighConfidence) {
    if (pattern.test(prompt)) {
      return {
        type: 'markdown',
        confidence: 'high',
        reasoning: 'Request asks for text-heavy document or written content'
      };
    }
  }

  // Medium confidence fallback for image vs SVG
  for (const pattern of imageMediumConfidence) {
    if (pattern.test(prompt)) {
      // Check for SVG indicators
      if (/\b(simple|minimalist|flat|vector|logo|icon)\b/i.test(prompt)) {
        return {
          type: 'svg',
          confidence: 'medium',
          reasoning: 'Poster/banner request with simple/vector indicators suggests SVG'
        };
      }
      return {
        type: 'image',
        confidence: 'medium',
        reasoning: 'Poster/banner request without vector indicators suggests image generation'
      };
    }
  }

  // Default to chat if no specific artifact intent detected
  return {
    type: 'chat',
    confidence: 'high',
    reasoning: 'No specific artifact creation intent detected - regular conversation'
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
This request should use IMAGE GENERATION (google/gemini-2.5-flash-image-preview).
- Use for: Photo-realistic images, detailed artwork, complex scenes
- Type: <artifact type="image" title="...">
- Do NOT create SVG or HTML artifacts for this request`,

    svg: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for SVG vector graphics.
- Use for: Logos, icons, simple illustrations, geometric designs
- Type: <artifact type="image/svg+xml" title="...">
- Keep it simple and scalable
- Use clean, minimal paths`,

    html: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for an HTML artifact.
- Use for: Static web pages, landing pages, marketing sites
- Type: <artifact type="text/html" title="...">
- Include all HTML, CSS, and JavaScript in one file
- Make it responsive and visually engaging`,

    react: `
ARTIFACT TYPE GUIDANCE:
This request is best suited for a React component.
- Use for: Interactive apps, dashboards, tools with state management
- Type: <artifact type="application/vnd.ant.react" title="...">
- Use shadcn/ui components where appropriate
- Implement full functionality with React hooks`,

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
