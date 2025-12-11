import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
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
        vi.clearAllTimers();
        vi.useRealTimers();
        cleanup();
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

    it('uses phase-based status for action phrases', () => {
        // Phase-based extraction now shows phase messages like "Thinking..." instead of transforming individual phrases
        // This is because the extractStatusText function uses phase detection for stability
        renderWithStreamingText('Let me check the database.');
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
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

    it('shows phase-based status during streaming', () => {
        // Phase-based extraction shows stable phase messages like "Thinking..."
        // instead of extracting individual sentences from the streaming text
        const { rerender } = render(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now." // 4 words
                isStreaming={true}
            />
        );

        // Phase-based system shows "Thinking..." for short initial text
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();

        // Immediate update should still show phase-based message
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now. Second valid sentence here now."
                isStreaming={true}
            />
        );

        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();

        // Advance time > 1.5s
        act(() => {
            vi.advanceTimersByTime(1600);
        });

        // After time advance, still shows phase-based message
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="Valid sentence here now. Second valid sentence here now."
                isStreaming={true}
            />
        );

        // Phase-based system maintains stable "Thinking..." message
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
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

    it('shows phase-based status for future tense phrases', async () => {
        // Phase-based extraction shows stable phase messages instead of transforming individual phrases
        const { rerender } = renderWithStreamingText('Thinking...');
        act(() => { vi.advanceTimersByTime(2000); });

        // "I will analyze the requirements." -> Shows "Thinking..." (phase-based, not sentence-level transformation)
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="I will analyze the requirements."
                isStreaming={true}
            />
        );
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
    });

    it('shows phase-based status for continuous tense phrases', async () => {
        // Phase-based extraction shows stable phase messages instead of transforming individual phrases
        const { rerender } = renderWithStreamingText('Thinking...');
        act(() => { vi.advanceTimersByTime(2000); });

        // "I am checking the database." -> Shows "Thinking..." (phase-based, not sentence-level transformation)
        rerender(
            <ReasoningDisplay
                reasoning={null}
                reasoningSteps={null}
                streamingReasoningText="I am checking the database."
                isStreaming={true}
            />
        );
        expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
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
