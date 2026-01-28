import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
 * UPDATED (2025-12-21): These tests reflect the new backend-driven status system.
 * Client-side phase detection has been removed in favor of semantic status messages
 * from the ReasoningProvider (GLM-4.5-Air).
 *
 * The component now:
 * 1. Displays "Thinking..." as the default when no backend status is available
 * 2. Displays the `reasoningStatus` prop directly when provided by the backend
 * 3. No longer performs client-side keyword/regex-based phase detection
 *
 * Status messages are now generated server-side using GLM-4.5-Air for semantic
 * summarization, providing more contextually appropriate and human-friendly messages.
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

    const renderStreaming = (text: string, reasoningStatus?: string) => {
        const { rerender, container } = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText={text}
                isStreaming={true}
                reasoningStatus={reasoningStatus}
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

    describe('Default Status Display (No Backend Status)', () => {
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

        it('displays "Thinking..." regardless of keywords when no backend status', () => {
            // Client-side phase detection has been removed
            // Component shows "Thinking..." until backend provides status
            const text = 'I understand the user wants to create a button component. Let me think about what they need and how to approach this request.';
            renderStreaming(text);
            expectThinking();
        });

        it('displays "Thinking..." for any text without backend status', () => {
            const text = 'I understand what the user needs. Now I will design the component structure and plan the architecture. The approach should include a main component with proper layout and state management.'.repeat(2);
            renderStreaming(text);
            expectThinking();
        });

        it('displays "Thinking..." for long text without backend status', () => {
            const text = 'I understand what the user is looking for. '.repeat(3);
            renderStreaming(text);
            expectThinking();
        });

        it('displays "Thinking..." for text with analyze keywords', () => {
            const text = 'I understand what the user is looking for and asking about. Let me analyze their request to determine the best approach here.';
            renderStreaming(text);
            expectThinking();
        });

        it('maintains stable output for very long text without crashing', () => {
            const longText = 'I understand and need to implement this solution with proper code. '.repeat(20);
            renderStreaming(longText);
            expect(document.body.textContent).toBeTruthy();
        });
    });

    describe('Backend-Driven Status Display', () => {
        it('displays backend status when provided', () => {
            renderStreaming('Some reasoning text...', 'Analyzing user requirements...');
            expectDisplayed('Analyzing user requirements...');
        });

        it('displays semantic status messages from backend', () => {
            renderStreaming('Building component...', 'Designing component architecture...');
            expectDisplayed('Designing component architecture...');
        });

        it('displays code-writing status from backend', () => {
            renderStreaming('const a = 1;\n', 'Writing React component code...');
            expectDisplayed('Writing React component code...');
        });

        it('displays finalizing status from backend', () => {
            renderStreaming('Final touches...', 'Adding final polish...');
            expectDisplayed('Adding final polish...');
        });
    });

    describe('Code Content Display (Without Phase Detection)', () => {
        it('displays "Thinking..." for code blocks without backend status', () => {
            renderStreaming('const a = 1;\n');
            expectThinking();
        });

        it('displays "Thinking..." for imports without backend status', () => {
            renderStreaming('import React from "react";\n');
            expectThinking();
        });

        it('displays "Thinking..." for JSON-like data without backend status', () => {
            renderStreaming('{ "key": "value" }\n');
            expectThinking();
        });

        it('displays "Thinking..." for single line code without backend status', () => {
            renderStreaming('const a = 1;');
            expectThinking();
        });
    });

    describe('Streaming Stability', () => {
        it('maintains stable display during streaming', () => {
            const { rerender } = renderStreaming('Initial thinking text here.');
            expectThinking();

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText="Initial thinking text here. More text added."
                    isStreaming={true}
                />
            );

            expectThinking();
        });

        it('updates when backend status changes', () => {
            const { rerender } = renderStreaming('Short.', 'Analyzing...');
            expectDisplayed('Analyzing...');

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText="Longer text with implementation details..."
                    isStreaming={true}
                    reasoningStatus="Building the solution..."
                />
            );

            expectDisplayed('Building the solution...');
        });
    });

    describe('Filtering Logic (Still Applied)', () => {
        it('filters numbered lists (shows default status)', () => {
            renderStreaming('1. This is a numbered list item that is long enough.');
            expectThinking();
        });

        it('filters short bullets (shows default status)', () => {
            renderStreaming('- This is a short bullet point.');
            expectThinking();
        });

        it('filters lines ending in colon (shows default status)', () => {
            renderStreaming('This is a header line that ends in a colon:');
            expectThinking();
        });

        it('filters negative instructions (shows default status)', () => {
            renderStreaming('Do not generate bad code in this response.');
            expectThinking();
        });

        it('filters "no" instructions (shows default status)', () => {
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
