import { callGeminiFlash, extractTextFromGeminiFlash } from "./openrouter-client.ts";
import { MODELS } from "./config.ts";

/**
 * Summarize a chunk of reasoning into a short, active-voice status update.
 * Uses GLM-4.5-Air for fast, semantic summarization.
 *
 * @param reasoningChunk - The raw reasoning text to summarize
 * @param requestId - Request ID for logging
 * @returns The summarized status update (e.g., "Analyzing database schema")
 */
export async function summarizeReasoningChunk(
    reasoningChunk: string,
    requestId: string
): Promise<string | null> {
    if (!reasoningChunk || reasoningChunk.trim().length < 10) {
        return null;
    }

    try {
        const response = await callGeminiFlash(
            [
                {
                    role: "system",
                    content:
                        "You are a semantic summarizer for an AI reasoning stream. " +
                        "Your task is to read the provided thought process and extract a SINGLE, short, active-voice status update (max 3-5 words). " +
                        "Do NOT use 'I', 'we', or filler words. " +
                        "Examples: 'Analyzing database schema', 'Refactoring API endpoints', 'Validating user input'. " +
                        "If the text is just filler or unclear, return 'Thinking...'.",
                },
                {
                    role: "user",
                    content: reasoningChunk,
                },
            ],
            {
                model: MODELS.GLM_4_AIR,
                temperature: 0.3, // Low temperature for consistency
                max_tokens: 20, // Very short output
                requestId,
            }
        );

        if (!response.ok) {
            console.warn(`[${requestId}] Summarization failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const summary = extractTextFromGeminiFlash(data, requestId);

        // Clean up the summary
        let cleanSummary = summary.trim();
        if (cleanSummary.endsWith('.')) cleanSummary = cleanSummary.slice(0, -1);

        return cleanSummary;
    } catch (error) {
        console.error(`[${requestId}] Summarization error:`, error);
        return null;
    }
}
