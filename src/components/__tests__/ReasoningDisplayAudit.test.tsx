import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
    default: {
        sanitize: (content: string) => content,
    },
}));

/**
 * ReasoningDisplay Audit Tests
 *
 * UPDATED: These tests reflect the phase-based ticker system implemented in
 * reasoningTextExtractor.ts. The component now shows stable, semantic messages
 * (e.g., "Thinking...", "Analyzing the request...", "Planning the implementation...")
 * instead of raw sentence extraction to prevent UI flickering.
 *
 * Phase progression:
 * 1. starting → "Thinking..." (initial state)
 * 2. analyzing → "Analyzing the request..." (50+ chars with analyze keywords)
 * 3. planning → "Planning the implementation..." (200+ chars with plan keywords)
 * 4. implementing → "Building the solution..." (400+ chars with implement keywords)
 * 5. styling → "Applying styling..." (600+ chars with style keywords)
 * 6. finalizing → "Finalizing the solution..." (800+ chars with final keywords)
 */
describe('ReasoningDisplay Audit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        cleanup();
        vi.useRealTimers();
    });

    const renderStreaming = (text: string) => {
        const { rerender, container } = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText={text}
                isStreaming={true}
            />
        );
        return { rerender, container };
    };

    const expectDisplayed = (text: string | RegExp) => {
        try {
            const element = screen.queryByText(text);
            expect(element).toBeInTheDocument();
        } catch (e) {
            console.log(`Expected "${text}" but found text content:`);
            console.log(document.body.textContent);
            const pill = document.querySelector('.line-clamp-1');
            if (pill) console.log('Pill content:', pill.textContent);
            throw e;
        }
    };

    const expectThinking = () => {
        expectDisplayed("Thinking...");
    };

    describe('Phase-Based Status Display', () => {
        it('displays "Thinking..." for initial short text', () => {
            renderStreaming('Short text here.');
            expectThinking();
        });

        it('displays "Thinking..." for empty string', () => {
            renderStreaming('');
            expectThinking();
        });

        it('displays "Thinking..." for whitespace only', () => {
            renderStreaming('   ');
            expectThinking();
        });

        it('displays "Analyzing the request..." when analyze keywords appear with sufficient text', () => {
            const text = 'I understand the user wants to create a button component. Let me think about what they need and how to approach this request.';
            renderStreaming(text);
            expectDisplayed('Analyzing the request...');
        });

        it('advances to analyzing phase first when both analyze and plan keywords present', () => {
            // Phase detection advances one phase at a time from starting
            // Even with planning keywords present, it first enters analyzing phase
            // because analyzing comes before planning in the phase order
            const text = 'I understand what the user needs. Now I will design the component structure and plan the architecture. The approach should include a main component with proper layout and state management.'.repeat(2);
            renderStreaming(text);
            // First matching phase from starting is analyzing (has "understand" keyword)
            expectDisplayed('Analyzing the request...');
        });

        it('shows first matching phase on initial render', () => {
            // Phase progression is sequential and happens one step at a time
            // On initial render with long text containing many keywords,
            // the extractor progresses from starting → first matching phase
            const text = 'I understand what the user is looking for. '.repeat(3);  // 129+ chars
            renderStreaming(text);

            // With 50+ chars and "understand" keyword, moves from starting → analyzing
            expectDisplayed('Analyzing the request...');
        });

        it('stays in analyzing phase when only analyze requirements met', () => {
            // Only analyzing phase requirements: 50+ chars with analyze keywords
            const text = 'I understand what the user is looking for and asking about. Let me analyze their request to determine the best approach here.';
            renderStreaming(text);
            expectDisplayed('Analyzing the request...');
        });

        it('maintains stable output for very long text without crashing', () => {
            // Very long text should not cause any errors
            const longText = 'I understand and need to implement this solution with proper code. '.repeat(20);
            renderStreaming(longText);
            // Should render something, not crash
            expect(document.body.textContent).toBeTruthy();
        });
    });

    describe('Code Detection', () => {
        it('detects code blocks and shows "Writing code..."', () => {
            renderStreaming('const a = 1;\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects imports', () => {
            renderStreaming('import React from "react";\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects JSON-like data', () => {
            renderStreaming('{ "key": "value" }\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects single line code without newline', () => {
            renderStreaming('const a = 1;');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });
    });

    describe('Throttling & Stability', () => {
        it('maintains stable phase display during streaming', () => {
            const { rerender } = renderStreaming('Initial thinking text here.');
            expectThinking();

            act(() => {
                vi.advanceTimersByTime(100);
            });

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText="Initial thinking text here. More text added."
                    isStreaming={true}
                />
            );

            // Should still show same phase due to throttling
            expectThinking();
        });

        it('progresses phases as text accumulates', () => {
            const { rerender } = renderStreaming('Short.');
            expectThinking();

            // Add enough text to trigger analyzing phase
            const analyzeText = 'I understand what the user is looking for and asking about. Let me analyze their request to determine the best approach.';

            act(() => {
                vi.advanceTimersByTime(2000);
            });

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText={analyzeText}
                    isStreaming={true}
                />
            );

            expectDisplayed('Analyzing the request...');
        });
    });

    describe('Filtering Logic (Still Applied)', () => {
        it('filters numbered lists (shows phase message instead)', () => {
            renderStreaming('1. This is a numbered list item that is long enough.');
            expectThinking();
        });

        it('filters short bullets (shows phase message instead)', () => {
            renderStreaming('- This is a short bullet point.');
            expectThinking();
        });

        it('filters lines ending in colon (shows phase message instead)', () => {
            renderStreaming('This is a header line that ends in a colon:');
            expectThinking();
        });

        it('filters negative instructions (shows phase message instead)', () => {
            renderStreaming('Do not generate bad code in this response.');
            expectThinking();
        });

        it('filters "no" instructions (shows phase message instead)', () => {
            renderStreaming('No markdown should be included in the output.');
            expectThinking();
        });
    });

    describe('Edge Cases', () => {
        it('handles special characters gracefully', () => {
            renderStreaming('Handling <special> & "characters" gracefully!');
            expectThinking();
        });

        it('handles multi-line text', () => {
            renderStreaming('Line 1.\nLine 2.\nLine 3.');
            expectThinking();
        });

        it('handles unicode characters', () => {
            renderStreaming('Testing with émojis 🚀 and ünïcödë characters.');
            expectThinking();
        });
    });
});
