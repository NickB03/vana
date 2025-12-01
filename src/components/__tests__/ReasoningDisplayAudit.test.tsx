import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
    default: {
        sanitize: (content: string) => content,
    },
}));

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

    const getDisplayedText = () => {
        // The component renders text in a span or TextShimmer
        // We look for the text content of the pill
        const pill = screen.getByRole('button', { hidden: true }) || screen.getByRole('status', { hidden: true });
        // This might be tricky if role isn't perfect, let's try finding by class or structure if needed.
        // Actually, the text is inside a span or TextShimmer.
        // Let's just get all text in the container and filter.
        return screen.queryByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' &&
                element.className.includes('line-clamp-1');
        })?.textContent;
    };

    const expectDisplayed = (text: string | RegExp) => {
        try {
            // Use findByText to allow for async updates if any (though we use fake timers)
            // Actually queryByText is fine.
            const element = screen.queryByText(text);
            expect(element).toBeInTheDocument();
        } catch (e) {
            console.log(`Expected "${text}" but found text content:`);
            console.log(document.body.textContent);
            // Also try to find what IS displayed in the pill
            const pill = document.querySelector('.line-clamp-1');
            if (pill) console.log('Pill content:', pill.textContent);
            throw e;
        }
    };

    const expectThinking = () => {
        expectDisplayed("Thinking...");
    };

    describe('Sentence Parsing & Filtering', () => {
        it('displays a complete sentence', () => {
            // Must be > 15 chars, use action verb to pass validation, periods stripped
            renderStreaming('Analyzing the database structure properly.');
            expectDisplayed('Analyzing the database structure properly');
        });

        it('displays the last complete sentence', () => {
            // Periods stripped for cleaner UI, transforms "I will check" to "Checking"
            renderStreaming('First step. I will check the database connection properly.');
            expectDisplayed('Checking the database connection properly');
        });

        it('ignores partial sentences at the end', () => {
            // Periods stripped for cleaner UI
            renderStreaming('Reviewing the code structure in detail. Partial');
            expectDisplayed('Reviewing the code structure in detail');
        });

        it('cleans bullet points and transforms verb', () => {
            // Long enough (>40 chars after cleaning) and transforms "Check" to "Checking"
            renderStreaming('- Check this bullet point item thoroughly now.');
            expectDisplayed('Checking this bullet point item thoroughly now');
        });

        it('cleans asterisk bullets and transforms verb', () => {
            // Long enough (>40 chars after cleaning) and transforms "Analyze" to "Analyzing"
            renderStreaming('* Analyze this star point item properly now.');
            expectDisplayed('Analyzing this star point item properly now');
        });
    });

    describe('Filtering Logic (The "Pill" Logic)', () => {
        it('filters numbered lists', () => {
            renderStreaming('1. This is a numbered list item that is long enough.');
            expectThinking();
        });

        it('filters short bullets', () => {
            // Even if > 15 chars, if it matches "Short Bullet" logic?
            // Logic: isShortBullet = /^[-*•]\s/.test(lastSentence) && lastSentence.length < 40;
            renderStreaming('- This is a bullet that is longer than 15 but shorter than 40.');
            expectThinking();
        });

        it('filters lines ending in colon', () => {
            renderStreaming('This is a header line that ends in a colon:');
            expectThinking();
        });

        it('filters negative instructions', () => {
            renderStreaming('Do not generate bad code in this response.');
            expectThinking();
        });

        it('filters "no" instructions', () => {
            renderStreaming('No markdown should be included in the output.');
            expectThinking();
        });

        it('filters state sentences (is/are/has)', () => {
            renderStreaming('The code is valid and has no errors.');
            expectThinking();
        });

        it('allows state sentences if they have action verbs', () => {
            // Period stripped for cleaner UI
            renderStreaming('Checking if the code is valid and has no errors.');
            expectDisplayed('Checking if the code is valid and has no errors');
        });
    });

    describe('Action Verb Transformation', () => {
        it('transforms "I will analyze"', () => {
            // Period stripped for cleaner UI
            renderStreaming('I will analyze the request details now.');
            expectDisplayed('Analyzing the request details now');
        });

        it('transforms "I am checking"', () => {
            // Period stripped for cleaner UI
            renderStreaming('I am checking the database connection string.');
            expectDisplayed('Checking the database connection string');
        });

        it('transforms "We are designing"', () => {
            // Period stripped for cleaner UI
            renderStreaming('We are designing the user interface layout.');
            expectDisplayed('Designing the user interface layout');
        });

        it('transforms "Analyze ..."', () => {
            // Period stripped for cleaner UI
            renderStreaming('Analyze the input data for inconsistencies.');
            expectDisplayed('Analyzing the input data for inconsistencies');
        });
    });

    describe('Code Detection', () => {
        it('detects code blocks and shows "Writing code..." (Sentence Mode)', () => {
            renderStreaming('const a = 1;\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects imports (Line Mode)', () => {
            renderStreaming('import React from "react";\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects JSON-like data (Line Mode)', () => {
            // Use actual JSON structure with brackets to trigger code detection
            renderStreaming('{ "key": "value" }\n');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });

        it('detects single line code without newline (Bug Fix Verification)', () => {
            // This should now PASS with the fix
            renderStreaming('const a = 1;');
            act(() => { vi.advanceTimersByTime(2500); });
            expectDisplayed('Writing code...');
        });
    });

    describe('Standalone Verb Transformation', () => {
        it('transforms "Analyze ..."', () => {
            // Period stripped for cleaner UI
            renderStreaming('Analyze the input data.');
            expectDisplayed('Analyzing the input data');
        });

        it('transforms "Check ..."', () => {
            // Period stripped for cleaner UI
            renderStreaming('Check the validation logic.');
            expectDisplayed('Checking the validation logic');
        });

        it('transforms "Create ..."', () => {
            // Period stripped for cleaner UI
            renderStreaming('Create a new component.');
            expectDisplayed('Creating a new component');
        });
    });

    describe('Throttling & Stability', () => {
        it('throttles updates that happen too fast', () => {
            // Use action-oriented sentences that pass validation
            const { rerender } = renderStreaming('Analyzing the first database query.');
            expectDisplayed('Analyzing the first database query');

            act(() => {
                vi.advanceTimersByTime(100);
            });

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText="Analyzing the first database query. Reviewing the second component now."
                    isStreaming={true}
                />
            );

            // Should still show first update due to throttling
            expectDisplayed('Analyzing the first database query');

            act(() => {
                vi.advanceTimersByTime(1500);
            });

            rerender(
                <ReasoningDisplay
                    reasoning={null}
                    reasoningSteps={null}
                    streamingReasoningText="Analyzing the first database query. Reviewing the second component now."
                    isStreaming={true}
                />
            );
            expectDisplayed('Reviewing the second component now');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty string', () => {
            renderStreaming('');
            expectThinking();
        });

        it('handles whitespace only', () => {
            renderStreaming('   ');
            expectThinking();
        });

        it('handles very long sentences (truncation at 70 chars)', () => {
            // Use a proper sentence with multiple words so it passes validation
            const long = 'Analyzing the extremely complex and intricate database schema that spans multiple tables and relationships.';
            renderStreaming(long);
            // Period stripped, truncated to 70 chars with ellipsis
            expectDisplayed('Analyzing the extremely complex and intricate database schema that...');
        });
    });
});
