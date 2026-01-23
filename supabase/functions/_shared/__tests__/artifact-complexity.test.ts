/**
 * Tests for Artifact Complexity Analyzer
 *
 * Tests complexity detection logic for routing decisions.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeArtifactComplexity,
  isComplexArtifact,
  estimateGenerationTime,
  type ComplexityResult,
} from '../artifact-complexity.ts';

describe('analyzeArtifactComplexity', () => {
  describe('simple artifacts', () => {
    it('should classify simple HTML as not complex', () => {
      const result = analyzeArtifactComplexity('html', 'Create a simple webpage');

      expect(result.isComplex).toBe(false);
      expect(result.estimatedTokens).toBe(1500);
      expect(result.reason).toContain('simple artifact type');
    });

    it('should classify simple SVG as not complex', () => {
      const result = analyzeArtifactComplexity('svg', 'Draw a circle');

      expect(result.isComplex).toBe(false);
      expect(result.estimatedTokens).toBe(1500);
    });

    it('should classify markdown as not complex', () => {
      const result = analyzeArtifactComplexity('markdown', 'Write documentation');

      expect(result.isComplex).toBe(false);
      expect(result.estimatedTokens).toBe(1500);
    });

    it('should classify simple code as not complex', () => {
      const result = analyzeArtifactComplexity('code', 'Write a hello world function');

      expect(result.isComplex).toBe(false);
      expect(result.estimatedTokens).toBe(1500);
    });

    it('should classify mermaid diagrams as not complex', () => {
      const result = analyzeArtifactComplexity('mermaid', 'Create a flowchart');

      expect(result.isComplex).toBe(false);
      expect(result.estimatedTokens).toBe(1500);
    });

    it('should classify simple React without complex keywords as not complex', () => {
      const result = analyzeArtifactComplexity('react', 'Create a simple heading component');

      expect(result.isComplex).toBe(false);
      expect(result.reason).toContain('Simple react artifact');
    });
  });

  describe('complex React artifacts', () => {
    it('should classify React with "interactive" keyword as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create an interactive form component'
      );

      expect(result.isComplex).toBe(true);
      expect(result.estimatedTokens).toBe(4000);
      expect(result.reason).toContain('Complex react');
      expect(result.reason).toContain('interactive');
    });

    it('should classify React dashboard with charts as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create a dashboard with multiple charts and graphs'
      );

      expect(result.isComplex).toBe(true);
      expect(result.estimatedTokens).toBe(4000);
      expect(result.reason).toContain('dashboard');
    });

    it('should classify React with animation as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create an animated card with motion effects'
      );

      expect(result.isComplex).toBe(true);
      expect(result.factors.find(f => f.name === 'complex_keywords')?.matched).toBe(true);
    });

    it('should classify React with state management keywords as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create a component with useState and form handling'
      );

      expect(result.isComplex).toBe(true);
      expect(result.factors.find(f => f.name === 'complex_keywords')?.detail).toContain('useState');
    });

    it('should classify React game as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create a snake game with player controls and score tracking'
      );

      expect(result.isComplex).toBe(true);
      expect(result.reason).toContain('game');
    });

    it('should classify React with API/fetch as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create a component that fetches data from an API'
      );

      expect(result.isComplex).toBe(true);
    });

    it('should classify React with websocket/realtime as complex', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create a real-time chat component with websocket'
      );

      expect(result.isComplex).toBe(true);
    });
  });

  describe('long requirements', () => {
    it('should classify React with long requirements (>300 chars) as complex', () => {
      const longRequirements = `
        Create a comprehensive user profile component that displays
        user information including their avatar, name, email, and bio.
        The component should have a clean, modern design with proper
        spacing and typography. Include a way to display user stats
        like followers and following count. Make sure it handles
        loading states and error states gracefully with appropriate
        UI feedback. The component should be responsive and work
        well on mobile devices.
      `.trim();

      expect(longRequirements.length).toBeGreaterThan(300);

      const result = analyzeArtifactComplexity('react', longRequirements);

      expect(result.isComplex).toBe(true);
      expect(result.factors.find(f => f.name === 'long_requirements')?.matched).toBe(true);
      expect(result.reason).toContain('detailed requirements');
    });

    it('should not mark HTML as complex even with long requirements', () => {
      const longRequirements = 'a'.repeat(400);
      const result = analyzeArtifactComplexity('html', longRequirements);

      // HTML is not a complex type, so even long requirements don't make it complex
      expect(result.isComplex).toBe(false);
    });
  });

  describe('factors tracking', () => {
    it('should track all complexity factors', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create an interactive dashboard'
      );

      expect(result.factors).toHaveLength(3);
      expect(result.factors.map(f => f.name)).toContain('complex_type');
      expect(result.factors.map(f => f.name)).toContain('complex_keywords');
      expect(result.factors.map(f => f.name)).toContain('long_requirements');
    });

    it('should include details for matched factors', () => {
      const result = analyzeArtifactComplexity(
        'react',
        'Create an animated chart with framer motion'
      );

      const keywordFactor = result.factors.find(f => f.name === 'complex_keywords');
      expect(keywordFactor?.matched).toBe(true);
      expect(keywordFactor?.detail).toContain('animated');
      expect(keywordFactor?.detail).toContain('chart');
    });
  });

  describe('case insensitivity', () => {
    it('should detect keywords regardless of case', () => {
      const result1 = analyzeArtifactComplexity('react', 'Create an INTERACTIVE component');
      const result2 = analyzeArtifactComplexity('react', 'Create an Interactive component');
      const result3 = analyzeArtifactComplexity('react', 'Create an interactive component');

      expect(result1.isComplex).toBe(true);
      expect(result2.isComplex).toBe(true);
      expect(result3.isComplex).toBe(true);
    });
  });
});

describe('isComplexArtifact', () => {
  it('should return true for complex artifacts', () => {
    expect(isComplexArtifact('react', 'Create an interactive game')).toBe(true);
  });

  it('should return false for simple artifacts', () => {
    expect(isComplexArtifact('html', 'Create a simple page')).toBe(false);
    expect(isComplexArtifact('react', 'Create a simple heading')).toBe(false);
  });
});

describe('estimateGenerationTime', () => {
  it('should estimate higher time for complex artifacts', () => {
    const complexResult: ComplexityResult = {
      isComplex: true,
      reason: 'Complex artifact',
      estimatedTokens: 4000,
      factors: [],
    };

    const time = estimateGenerationTime(complexResult);
    expect(time).toBe(40000); // 4000 * 10ms
  });

  it('should estimate lower time for simple artifacts', () => {
    const simpleResult: ComplexityResult = {
      isComplex: false,
      reason: 'Simple artifact',
      estimatedTokens: 1500,
      factors: [],
    };

    const time = estimateGenerationTime(simpleResult);
    expect(time).toBe(15000); // 1500 * 10ms
  });
});
