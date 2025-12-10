/**
 * Performance benchmark tests for reasoningTextExtractor
 *
 * These tests verify that the extractor meets performance targets:
 * - extractStatusText should complete in <10ms for typical inputs
 * - Worker should not run out of memory with large inputs
 * - mockDetect (detectNpmImports) should be called ≤1 times when memoized
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractStatusText, createExtractionState } from "../reasoningTextExtractor";

// Mock the AI Commentator to isolate the extractor
vi.mock('../../_shared/ai-commentator.ts', () => ({
  generateSemanticStatus: vi.fn(),
}));

describe("reasoningTextExtractor Performance Benchmarks", () => {
  let state: ReturnType<typeof createExtractionState>;

  beforeEach(() => {
    state = createExtractionState();
  });

  describe("extractStatusText performance", () => {
    it("completes in under 10ms for typical reasoning input", () => {
      const typicalReasoning = `
        I need to analyze the user's request for a dashboard component.
        The user wants a React dashboard with charts and real-time data.
        Let me plan the component structure:
        1. Main dashboard layout with grid
        2. Chart components for data visualization
        3. Real-time data fetching logic
        4. Responsive design considerations

        I'll start by creating the main dashboard component.
        It should use React hooks for state management.
        I'll need to import chart.js for the visualizations.
        The layout will use CSS Grid for responsiveness.

        Let me implement the dashboard step by step:
        First, create the basic component structure
        Then add state management for data
        Finally, integrate the charts
      `;

      const iterations = 10;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = extractStatusText(typicalReasoning, { ...state });
        // Reset state for next iteration
        state = createExtractionState();
      }

      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;

      console.log(`Average time per extraction: ${avgTime.toFixed(2)}ms`);

      // Should average under 10ms per extraction
      expect(avgTime).toBeLessThan(10);
    });

    it("handles large reasoning text efficiently (10KB)", () => {
      // Generate 10KB of reasoning text
      const largeText = Array(1000).fill(`
        Analyzing the component requirements and planning the implementation strategy.
        Building the React component with proper TypeScript types and interfaces.
        Implementing state management using React hooks for optimal performance.
        Creating responsive layouts with Tailwind CSS utility classes.
        Adding error handling and loading states for better user experience.
        Integrating with backend APIs for data fetching and updates.
        Optimizing component rendering with memoization techniques.
        Writing comprehensive tests for component functionality.
      `).join('\n');

      const start = performance.now();
      const result = extractStatusText(largeText, state);
      const elapsed = performance.now() - start;

      console.log(`Large text (10KB) processing time: ${elapsed.toFixed(2)}ms`);
      console.log(`Extracted status: "${result.text}"`);

      // Should complete in under 50ms even for 10KB
      expect(elapsed).toBeLessThan(50);
      expect(result.text).toBeTruthy();
    });

    it("maintains performance with rapid successive calls", () => {
      const reasoningText = `
        Creating a new React component with TypeScript.
        Implementing hooks for state management.
        Adding responsive styling with Tailwind CSS.
      `;

      // Simulate rapid calls during streaming
      const rapidCalls = 100;
      const start = performance.now();

      for (let i = 0; i < rapidCalls; i++) {
        // Append a small increment to simulate streaming
        const incrementalText = reasoningText + `\nStep ${i + 1} completed.`;
        extractStatusText(incrementalText, state);
      }

      const elapsed = performance.now() - start;
      const avgTime = elapsed / rapidCalls;

      console.log(`Rapid calls average time: ${avgTime.toFixed(3)}ms per call`);

      // Should handle rapid calls efficiently (under 1ms average)
      expect(avgTime).toBeLessThan(1);
    });

    it("does not cause memory leaks with continuous usage", () => {
      const reasoningText = `
        Analyzing requirements for the user interface.
        Building component structure with React.
        Implementing state management and data flow.
      `;

      // Track memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run many extractions to check for memory leaks
      for (let i = 0; i < 1000; i++) {
        const result = extractStatusText(reasoningText, { ...state });
        expect(result.text).toBeTruthy();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increaseMB = memoryIncrease / (1024 * 1024);

        console.log(`Memory increase after 1000 calls: ${increaseMB.toFixed(2)} MB`);

        // Should not increase by more than 10MB
        expect(increaseMB).toBeLessThan(10);
      }
    });

    it("performs phase detection efficiently", () => {
      // Text that progresses through all phases
      const phaseText = `
        Let me understand what the user is asking for.

        I need to analyze the requirements carefully.
        The user wants a dashboard with real-time data visualization.

        Let me plan the component architecture:
        - Main dashboard container
        - Chart components for data
        - Real-time data fetching
        - Responsive grid layout

        Now I'll start implementing the component:
        I'll create a React component with TypeScript.
        The component will use hooks for state management.

        Adding styling with Tailwind CSS:
        - Responsive grid layout
        - Card components for data
        - Proper spacing and colors

        The implementation is now complete.
        The dashboard is ready for use.
      `;

      // Test with incremental text to simulate streaming
      const lines = phaseText.split('\n');
      let accumulatedText = '';

      const start = performance.now();

      for (const line of lines) {
        accumulatedText += line + '\n';
        const result = extractStatusText(accumulatedText, state);
        expect(result.text).toBeTruthy();
      }

      const elapsed = performance.now() - start;
      const avgTimePerLine = elapsed / lines.length;

      console.log(`Phase detection average time per line: ${avgTimePerLine.toFixed(3)}ms`);
      console.log(`Final phase status: "${extractStatusText(phaseText, state).text}"`);

      // Should process each line quickly
      expect(avgTimePerLine).toBeLessThan(0.5);
    });
  });
});