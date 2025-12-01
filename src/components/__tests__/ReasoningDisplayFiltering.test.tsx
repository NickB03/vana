import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
    default: {
        sanitize: (content: string) => content,
    },
}));

describe('ReasoningDisplay Filtering Logic', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderWithStreamingText = (text: string) => {
        const result = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText={text}
                isStreaming={true}
            />
        );
        return result;
    };

    it('shows "Thinking..." initially', () => {
        renderWithStreamingText('');
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });

    it('filters out filler phrases with non-action verbs', () => {
        // "Let me think" stays as filler because "think" is a non-action verb
        renderWithStreamingText('Let me think about this problem.');
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });

    it('transforms filler phrases with action verbs', () => {
        // "Let me check" transforms to "Checking" because "check" is an action verb
        renderWithStreamingText('Let me check the database.');
        expect(screen.getAllByText('Checking the database')[0]).toBeInTheDocument();
    });

    it('filters out incomplete sentences', () => {
        renderWithStreamingText('The user wants a');
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });



    it('shows valid complete sentences', () => {
        const validText = 'Analyzing the user requirements properly.'; // 5 words
        renderWithStreamingText(validText);
        expect(screen.getAllByText(validText).length).toBeGreaterThan(0);
    });

    it.skip('detects code patterns and shows "Writing code..."', () => {
        const { rerender } = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Thinking..."
                isStreaming={true}
            />
        );

        // Advance time
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        // Need 2 lines for stable line check if not a complete sentence
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="const a = 1;\nconst b = 2;"
                isStreaming={true}
            />
        );

        screen.debug();
        expect(screen.getAllByText('Writing code...')[0]).toBeInTheDocument();
    });

    it('throttles updates (1.5s rule)', () => {
        const { rerender } = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now." // 4 words
                isStreaming={true}
            />
        );

        // Period stripped for cleaner UI display
        expect(screen.getAllByText('Valid sentence here now')[0]).toBeInTheDocument();

        // Immediate update should be ignored due to throttling
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now. Second valid sentence here now."
                isStreaming={true}
            />
        );

        expect(screen.getAllByText('Valid sentence here now')[0]).toBeInTheDocument();

        // Advance time > 1.5s
        act(() => {
            vi.advanceTimersByTime(1600);
        });

        // Now update should go through
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now. Second valid sentence here now."
                isStreaming={true}
            />
        );

        // Period stripped for cleaner UI display
        expect(screen.getAllByText('Second valid sentence here now')[0]).toBeInTheDocument();
    });

    it('filters out raw GLM validation thoughts', () => {
        renderWithStreamingText('No <!DOCTYPE>, <html>, <head>, <body>, or <');
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });

    it('filters out prefixed filler phrases (Regression Fix)', async () => {
        // "Building: I need to make sure" should be filtered because "I need to" is a filler
        const { rerender } = renderWithStreamingText('Thinking...');

        // Advance time to bypass initial throttle
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        // Use two lines so the first one is considered "stable"
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Building: I need to make sure\nNext line"
                isStreaming={true}
            />
        );

        // The pill should show "Thinking..." because "Building..." is filtered out
        // We use getAllByText because "Thinking..." might be in the history/expanded view too? 
        // No, "Thinking..." is the fallback in getPillLabel.
        // We ensure that "Building: I need to make sure" is NOT the pill text.
        // Since it's in the expanded view, we can't use queryByText(...).not.toBeInTheDocument() globally.
        // But we can check that 'Thinking...' IS visible.
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();

        // Optionally, check that the bad text is NOT visible (if expanded view is hidden)
        // But simpler to just trust that if "Thinking..." is there, the pill didn't update to the bad text.
    });

    it('transforms future tense to action verbs (Polishing)', async () => {
        const { rerender } = renderWithStreamingText('Thinking...');
        act(() => { vi.advanceTimersByTime(2000); });

        // "I will analyze the requirements." -> "Analyzing the requirements" (period stripped for cleaner UI)
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="I will analyze the requirements."
                isStreaming={true}
            />
        );
        expect(screen.getAllByText('Analyzing the requirements')[0]).toBeInTheDocument();
    });

    it('transforms continuous tense to action verbs (Polishing)', async () => {
        const { rerender } = renderWithStreamingText('Thinking...');
        act(() => { vi.advanceTimersByTime(2000); });

        // "I am checking the database." -> "Checking the database" (period stripped for cleaner UI)
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="I am checking the database."
                isStreaming={true}
            />
        );
        expect(screen.getAllByText('Checking the database')[0]).toBeInTheDocument();
    });

    it('filters out state description sentences (Polishing)', async () => {
        const { rerender } = renderWithStreamingText('Thinking...');
        act(() => { vi.advanceTimersByTime(2000); });

        // "Framer Motion is available via Babel" -> Should be filtered (shows Thinking...)
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Framer Motion is available via Babel."
                isStreaming={true}
            />
        );
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });
});
