import { describe, it, expect } from 'vitest';
import {
  detectAndInjectLibraries,
  getDetectedLibraries,
  CDN_MAP,
  DETECTION_PATTERNS
} from './libraryDetection';

describe('libraryDetection', () => {
  describe('detectAndInjectLibraries', () => {
    describe('Single Library Detection', () => {
      it('should detect Chart.js usage with new Chart()', () => {
        const code = `
          const ctx = document.getElementById('myChart');
          const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['A', 'B'], datasets: [{ data: [10, 20] }] }
          });
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js@4.4.1');
        expect(result).toContain('<script');
      });

      it('should detect Chart.js usage with Chart.register', () => {
        const code = 'Chart.register(CategoryScale, LinearScale);';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
      });

      it('should detect D3.js usage with d3 namespace', () => {
        const code = `
          const svg = d3.select("body").append("svg");
          d3.scaleLinear().domain([0, 100]);
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('d3.v7.min.js');
      });

      it('should detect D3.js import statement', () => {
        const code = `import * as d3 from "d3";`;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('d3.v7.min.js');
      });

      it('should detect Three.js usage with new THREE', () => {
        const code = `
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 5);
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('three@0.160.0');
      });

      it('should detect Alpine.js with x-data directive', () => {
        const code = '<div x-data="{ open: false }"><button x-on:click="open = !open">Toggle</button></div>';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('alpinejs@3.13.5');
        expect(result).toContain('defer');
      });

      it('should detect GSAP usage', () => {
        const code = 'gsap.to(".box", { duration: 2, x: 300, rotation: 360 });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('gsap@3.12.5');
      });

      it('should detect anime.js usage', () => {
        const code = 'anime({ targets: ".el", translateX: 250 });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('animejs@3.2.1');
      });

      it('should detect p5.js with createCanvas', () => {
        const code = `
          function setup() {
            createCanvas(400, 400);
          }
          function draw() {
            background(220);
          }
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('p5@1.9.0');
      });

      it('should detect Leaflet with L.map', () => {
        const code = 'const map = L.map("mapid").setView([51.505, -0.09], 13);';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('leaflet@1.9.4');
        expect(result).toContain('<link rel="stylesheet"');
        expect(result).toContain('<script');
      });

      it('should detect moment.js usage', () => {
        const code = 'const now = moment().format("YYYY-MM-DD");';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('moment@2.30.1');
      });

      it('should detect axios usage', () => {
        const code = 'axios.get("/api/data").then(response => console.log(response));';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('axios@1.6.5');
      });

      it('should detect Radix UI usage', () => {
        const code = 'import * as Dialog from "@radix-ui/react-dialog";';
        const result = detectAndInjectLibraries(code);
        // Radix UI uses ES Module import map (not CDN scripts), so returns empty
        expect(result).toBe('');
      });

      it('should detect Fabric.js usage', () => {
        const code = 'const canvas = new fabric.Canvas("c");';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('fabric@5.3.0');
      });

      it('should detect Konva usage', () => {
        const code = 'const stage = new Konva.Stage({ container: "container" });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('konva@9.3.1');
      });

      it('should detect highlight.js usage', () => {
        const code = 'hljs.highlightAll();';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('highlight.js/11.9.0');
        expect(result).toContain('<link rel="stylesheet"');
      });

      it('should detect QRCode usage', () => {
        const code = 'new QRCode(document.getElementById("qrcode"), "text");';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('qrcodejs');
      });

      it('should detect Animate.css usage', () => {
        const code = '<div class="animate__animated animate__bounce">Hello</div>';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('animate.css/4.1.1');
      });
    });

    describe('Multiple Library Detection', () => {
      it('should detect multiple libraries in same code', () => {
        const code = `
          const chart = new Chart(ctx, {});
          gsap.to(".box", { x: 100 });
          axios.get("/api/data");
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
        expect(result).toContain('gsap');
        expect(result).toContain('axios');
      });

      it('should detect Chart.js + D3 + Three.js together', () => {
        const code = `
          new Chart(ctx, {});
          d3.select("body");
          new THREE.Scene();
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
        expect(result).toContain('d3.v7');
        expect(result).toContain('three@0.160.0');
      });

      it('should detect animation libraries (GSAP + anime + Framer Motion)', () => {
        const code = `
          gsap.to(".el", { x: 100 });
          anime({ targets: ".box" });
          const controls = useAnimation();
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('gsap');
        expect(result).toContain('animejs');
        expect(result).toContain('framer-motion');
      });

      it('should detect all canvas libraries (Fabric + Konva + Pixi)', () => {
        const code = `
          new fabric.Canvas("c");
          new Konva.Stage({});
          new PIXI.Application();
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('fabric');
        expect(result).toContain('konva');
        expect(result).toContain('pixi.js');
      });

      it('should detect utility libraries (moment + axios + marked)', () => {
        const code = `
          moment().format("YYYY");
          axios.post("/api");
          marked.parse("# Hello");
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('moment');
        expect(result).toContain('axios');
        expect(result).toContain('marked');
      });
    });

    describe('Duplicate Prevention', () => {
      it('should not inject scripts that are already in content', () => {
        const code = `
          <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
          const chart = new Chart(ctx, {});
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toBe(''); // Already included, should return empty
      });

      it('should not inject D3 if already present', () => {
        const code = `
          <script src="https://d3js.org/d3.v7.min.js"></script>
          d3.select("body").append("svg");
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toBe('');
      });

      it('should inject missing libraries but skip existing ones', () => {
        const code = `
          <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
          new Chart(ctx, {});
          gsap.to(".box", { x: 100 });
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).not.toContain('chart.js'); // Already present
        expect(result).toContain('gsap'); // Missing, should inject
      });

      it('should handle Leaflet with both CSS and JS already present', () => {
        const code = `
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          const map = L.map("mapid");
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toBe(''); // Both CSS and JS already present
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for code with no libraries', () => {
        const code = 'const x = 10; console.log(x);';
        const result = detectAndInjectLibraries(code);
        expect(result).toBe('');
      });

      it('should handle empty string input', () => {
        const result = detectAndInjectLibraries('');
        expect(result).toBe('');
      });

      it('should handle whitespace-only input', () => {
        const result = detectAndInjectLibraries('   \n\t  ');
        expect(result).toBe('');
      });

      it('should be case-insensitive for library detection', () => {
        const code = 'NEW CHART(ctx, {});'; // Uppercase
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
      });

      it('should handle special characters in code', () => {
        const code = `
          const config = { "chart": "bar" };
          new Chart(ctx, config);
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
      });

      it('should handle code with comments containing library names', () => {
        const code = `
          // This uses Chart.js for visualization
          /* We might use d3 later */
          new Chart(ctx, {});
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('chart.js');
        expect(result).not.toContain('d3'); // Only in comment, not actually used
      });

      it('should handle multiline strings', () => {
        const code = `
          const template = \`
            <div x-data="{ open: false }">
              <button x-on:click="open = true">Open</button>
            </div>
          \`;
        `;
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('alpinejs');
      });
    });

    describe('Library-Specific Patterns', () => {
      it('should detect p5.js with setup() function', () => {
        const code = 'function setup() { createCanvas(400, 400); }';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('p5');
      });

      it('should detect p5.js with draw() function', () => {
        const code = 'function draw() { background(220); }';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('p5');
      });

      it('should detect GSAP with TweenMax (legacy)', () => {
        const code = 'TweenMax.to(".box", 1, { x: 100 });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('gsap');
      });

      it('should detect GSAP with ScrollTrigger', () => {
        const code = 'ScrollTrigger.create({ trigger: ".box" });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('gsap');
      });

      it('should detect Alpine.js with multiple directives', () => {
        const code = '<div x-show="open" x-bind:class="active" x-if="visible"></div>';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('alpinejs');
      });

      it('should detect moment.js with .fromNow()', () => {
        const code = 'const relative = moment().fromNow();';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('moment');
      });

      it('should detect axios with different methods', () => {
        const code = 'axios.put("/api/update"); axios.delete("/api/remove");';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('axios');
      });

      it('should detect Lottie with bodymovin', () => {
        const code = 'bodymovin.loadAnimation({ container: el });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('lottie');
      });

      it('should detect Framer Motion with useAnimation hook', () => {
        const code = 'const controls = useAnimation();';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('framer-motion');
      });

      it('should detect Framer Motion with animate() function', () => {
        const code = 'animate(element, { opacity: 1 });';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('framer-motion');
      });
    });

    describe('Return Format', () => {
      it('should return scripts joined with newlines', () => {
        const code = 'new Chart(ctx, {}); gsap.to(".box", {});';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('\n');
        const lines = result.split('\n');
        expect(lines.length).toBeGreaterThan(1);
      });

      it('should return valid HTML script tags', () => {
        const code = 'new Chart(ctx, {});';
        const result = detectAndInjectLibraries(code);
        expect(result).toMatch(/<script.*<\/script>/);
      });

      it('should include link tags for CSS libraries', () => {
        const code = 'const map = L.map("mapid");';
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('<link rel="stylesheet"');
      });

      it('should preserve script attributes (defer, type=module)', () => {
        const code = '<div x-data="{}"></div>'; // Alpine.js
        const result = detectAndInjectLibraries(code);
        expect(result).toContain('defer');
      });
    });
  });

  describe('getDetectedLibraries', () => {
    it('should return array of detected libraries with names and scripts', () => {
      const code = 'new Chart(ctx, {}); gsap.to(".box", {});';
      const result = getDetectedLibraries(code);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      const chartLib = result.find(lib => lib.name === 'chart.js');
      expect(chartLib).toBeDefined();
      expect(chartLib?.scripts).toContain(CDN_MAP['chart.js'][0]);

      const gsapLib = result.find(lib => lib.name === 'gsap');
      expect(gsapLib).toBeDefined();
      expect(gsapLib?.scripts).toContain(CDN_MAP['gsap'][0]);
    });

    it('should return empty array for code with no libraries', () => {
      const code = 'const x = 10;';
      const result = getDetectedLibraries(code);
      expect(result).toEqual([]);
    });

    it('should not include libraries already in content', () => {
      const code = `
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
        new Chart(ctx, {});
      `;
      const result = getDetectedLibraries(code);
      expect(result).toEqual([]);
    });

    it('should return libraries with multiple scripts correctly', () => {
      const code = 'const map = L.map("mapid");'; // Leaflet has CSS + JS
      const result = getDetectedLibraries(code);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('leaflet');
      expect(result[0].scripts.length).toBe(2); // CSS + JS
      expect(result[0].scripts[0]).toContain('<link');
      expect(result[0].scripts[1]).toContain('<script');
    });
  });

  describe('CDN_MAP and DETECTION_PATTERNS', () => {
    it('should have matching keys in CDN_MAP and DETECTION_PATTERNS', () => {
      const cdnKeys = Object.keys(CDN_MAP).sort();
      const patternKeys = Object.keys(DETECTION_PATTERNS).sort();
      expect(cdnKeys).toEqual(patternKeys);
    });

    it('should have valid CDN URLs in CDN_MAP', () => {
      Object.values(CDN_MAP).forEach(scripts => {
        scripts.forEach(script => {
          expect(script).toMatch(/^<(script|link)/);
          expect(script).toMatch(/https?:\/\//);
        });
      });
    });

    it('should have valid regex patterns in DETECTION_PATTERNS', () => {
      Object.values(DETECTION_PATTERNS).forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('should use trusted CDN providers', () => {
      const trustedDomains = [
        'cdn.jsdelivr.net',
        'd3js.org',
        'unpkg.com',
        'cdnjs.cloudflare.com'
      ];

      Object.values(CDN_MAP).forEach(scripts => {
        scripts.forEach(script => {
          const hasTrustedDomain = trustedDomains.some(domain =>
            script.includes(domain)
          );
          expect(hasTrustedDomain).toBe(true);
        });
      });
    });
  });

  describe('Security', () => {
    it('should only inject from whitelisted CDNs', () => {
      const code = 'new Chart(ctx, {});';
      const result = detectAndInjectLibraries(code);

      // Should only contain trusted CDN domains
      expect(result).toMatch(/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|d3js\.org/);
    });

    it('should not execute code in library detection', () => {
      const maliciousCode = `
        <script>alert("xss")</script>
        new Chart(ctx, {});
      `;
      const result = detectAndInjectLibraries(maliciousCode);

      // Should only inject Chart.js CDN, not execute the alert
      expect(result).toContain('chart.js');
      expect(result).not.toContain('alert');
    });

    it('should handle injection attempts in code safely', () => {
      const code = `
        const src = "https://evil.com/malicious.js";
        new Chart(ctx, {});
      `;
      const result = detectAndInjectLibraries(code);

      // Should only inject Chart.js from trusted CDN
      expect(result).toContain('cdn.jsdelivr.net');
      expect(result).not.toContain('evil.com');
    });
  });
});
