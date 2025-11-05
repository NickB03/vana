/**
 * Library Detection and CDN Injection Utility
 *
 * This module handles automatic detection of library usage in artifact code
 * and provides the appropriate CDN script tags for injection.
 */

export interface LibraryCDN {
  name: string;
  scripts: string[];
}

/**
 * Map of library names to their CDN script/link tags
 */
export const CDN_MAP: Record<string, string[]> = {
  // Data Visualization
  'chart.js': ['<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>'],
  'd3': ['<script src="https://d3js.org/d3.v7.min.js"></script>'],

  // 3D Graphics
  'three.js': ['<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>'],

  // Reactive Frameworks
  'alpine': ['<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js"></script>'],

  // Animation Libraries
  'gsap': ['<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>'],
  'anime': ['<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>'],
  'framer-motion': ['<script src="https://cdn.jsdelivr.net/npm/framer-motion@11.0.3/dist/framer-motion.js"></script>'],

  // Creative Coding
  'p5': ['<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>'],
  'particles': ['<script src="https://cdn.jsdelivr.net/npm/tsparticles@3.0.3/tsparticles.bundle.min.js"></script>'],
  'lottie': ['<script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js"></script>'],

  // Maps
  'leaflet': [
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
  ],

  // Canvas Libraries
  'fabric.js': ['<script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js"></script>'],
  'konva': ['<script src="https://cdn.jsdelivr.net/npm/konva@9.3.1/konva.min.js"></script>'],
  'pixi.js': ['<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.3.3/dist/pixi.min.js"></script>'],

  // UI Utilities
  'sortable': ['<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>'],

  // Utility Libraries
  'moment': ['<script src="https://cdn.jsdelivr.net/npm/moment@2.30.1/moment.min.js"></script>'],
  'axios': ['<script src="https://cdn.jsdelivr.net/npm/axios@1.6.5/dist/axios.min.js"></script>'],
  'marked': ['<script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>'],
  'qrcode': ['<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>'],

  // Syntax Highlighting
  'highlight.js': [
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css" />',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>'
  ],

  // Icon Libraries
  'feather': ['<script src="https://cdn.jsdelivr.net/npm/feather-icons@4.29.1/dist/feather.min.js"></script>'],
  'heroicons': ['<script src="https://cdn.jsdelivr.net/npm/heroicons@2.0.18/24/outline/index.js" type="module"></script>'],
  'phosphor': ['<script src="https://unpkg.com/@phosphor-icons/web@2.0.3"></script>'],

  // UI Component Libraries (Headless)
  'radix-ui': [
    '<script src="https://cdn.jsdelivr.net/npm/@radix-ui/react-dialog@1.0.5/dist/index.umd.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/@radix-ui/react-dropdown-menu@2.0.6/dist/index.umd.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/@radix-ui/react-popover@1.0.7/dist/index.umd.js"></script>'
  ],

  // Form Libraries
  'formkit': ['<script src="https://cdn.jsdelivr.net/npm/@formkit/auto-animate@0.8.1/index.mjs" type="module"></script>'],

  // Utility CSS
  'animate.css': ['<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />'],
};

/**
 * Regex patterns to detect library usage in code
 */
export const DETECTION_PATTERNS: Record<string, RegExp> = {
  // Data Visualization
  'chart.js': /new Chart\(|Chart\.register/i,
  'd3': /d3\.|from ['"]d3['"]/i,

  // 3D Graphics
  'three.js': /new THREE\.|from ['"]three['"]/i,

  // Reactive Frameworks
  'alpine': /x-data|x-bind|x-on|x-show|x-if/i,

  // Animation Libraries
  'gsap': /gsap\.|TweenMax|TimelineMax|ScrollTrigger/i,
  'anime': /anime\(\{|anime\.timeline/i,
  'framer-motion': /motion\.|useAnimation|animate\(/i,

  // Creative Coding
  'p5': /createCanvas|draw\(\)|setup\(\)/i,
  'particles': /particlesJS|tsParticles/i,
  'lottie': /lottie\.|bodymovin/i,

  // Maps
  'leaflet': /L\.map\(|L\.marker\(/i,

  // Canvas Libraries
  'fabric.js': /new fabric\.|fabric\.Canvas/i,
  'konva': /new Konva\.|Konva\.Stage/i,
  'pixi.js': /PIXI\.|new PIXI/i,

  // UI Utilities
  'sortable': /new Sortable\(/i,

  // Utility Libraries
  'moment': /moment\(|\.format\(|\.fromNow\(/i,
  'axios': /axios\.|axios\.get|axios\.post/i,
  'marked': /marked\(|marked\.parse/i,
  'qrcode': /new QRCode\(/i,

  // Syntax Highlighting
  'highlight.js': /hljs\.|highlight\.js/i,

  // Icon Libraries
  'feather': /feather\.|feather\.replace/i,
  'heroicons': /heroicons|from ['"]@heroicons/i,
  'phosphor': /ph-|phosphor/i,

  // UI Component Libraries
  'radix-ui': /@radix-ui|RadixUI|Radix\./i,

  // Form Libraries
  'formkit': /autoAnimate|formkit/i,

  // Utility CSS
  'animate.css': /animate__animated|class="animate-/i,
};

/**
 * Detects libraries used in the provided content and returns CDN scripts to inject
 *
 * @param content - The HTML/JavaScript content to analyze
 * @returns A string containing all required CDN script/link tags, newline-separated
 *
 * @example
 * ```typescript
 * const code = `
 *   const chart = new Chart(ctx, { ... });
 *   gsap.to('.element', { x: 100 });
 * `;
 * const cdns = detectAndInjectLibraries(code);
 * // Returns: "<script src="...chart.js"></script>\n<script src="...gsap.js"></script>"
 * ```
 */
export function detectAndInjectLibraries(content: string): string {
  const cdnScripts: string[] = [];

  for (const [lib, pattern] of Object.entries(DETECTION_PATTERNS)) {
    if (pattern.test(content)) {
      const scripts = CDN_MAP[lib];
      const alreadyIncluded = scripts.some(script => content.includes(script));
      if (!alreadyIncluded) {
        cdnScripts.push(...scripts);
      }
    }
  }

  return cdnScripts.join('\n');
}

/**
 * Gets detected libraries with their names and scripts
 * Useful for displaying what libraries will be injected
 *
 * @param content - The HTML/JavaScript content to analyze
 * @returns Array of detected libraries with their names and CDN scripts
 */
export function getDetectedLibraries(content: string): LibraryCDN[] {
  const detected: LibraryCDN[] = [];

  for (const [lib, pattern] of Object.entries(DETECTION_PATTERNS)) {
    if (pattern.test(content)) {
      const scripts = CDN_MAP[lib];
      const alreadyIncluded = scripts.some(script => content.includes(script));
      if (!alreadyIncluded) {
        detected.push({ name: lib, scripts });
      }
    }
  }

  return detected;
}
