# Bug Fix Plan: Reported Issues (2025-12-19)

This document outlines the approved plan to address critical stability issues and technical debt identified in the project analysis report.

## 1. Fix Stream Timeout (High Priority)

**Problem:**
The `ReasoningProvider` (which sends "Thinking..." updates) is currently initialized *after* the primary `callGLM` request. If the GLM model takes a long time to start generating tokens (e.g., due to queuing > 2 minutes), the connection remains silent. Browsers and proxies often time out these silent connections (default 120s), causing the request to fail even if the model eventually responds.

**Solution:**
Start the `ReasoningProvider` sidecar *before* initiating the main model request. This ensures that:
-   Heartbeat/status events are emitted immediately (e.g., "Connecting to model...").
-   The HTTP connection is kept alive during the queuing phase.

**Implementation Details:**
-   **File:** `supabase/functions/generate-artifact/index.ts`
-   **Changes:**
    -   Move `createReasoningProvider` instantiation to before `callGLM`.
    -   Call `await reasoningProvider.start()` immediately.
    -   Update the error handling block to ensure `reasoningProvider.destroy()` is called if `callGLM` throws.

## 2. Fix UI Race Condition (High Priority)

**Problem:**
There is a race condition in `useChatMessages.tsx` where `setIsLoading(false)` is called almost immediately after `saveMessage`. If the optimistic update or Supabase real-time subscription lags, the UI may render a "blank" state (loading spinner gone, but new message not yet in the list) for a fraction of a second.

**Solution:**
Harden the completion flow to ensure the message is safely processed before clearing the loading state.

**Implementation Details:**
-   **File:** `src/hooks/useChatMessages.tsx`
-   **Changes:**
    -   In the `artifact_complete` SSE handler:
        -   Add a check to verify `finalArtifactData.artifactCode` is present and valid.
    -   In the `saveMessage` flow or `onDone` callback:
        -   Ensure `flushSync` (if used) correctly wraps state updates.
        -   Consider adding a micro-delay or verification step if "blank screen" persistence is observed (though `await saveMessage` *should* be sufficient if it awaits the DB insert).
        -   *Note: Codex analysis suggests this might be fixed, but we will add defensive checks to be sure.*

## 3. Code Cleanup (Maintainability)

**Problem:**
The codebase contains deprecated files and imports that confuse the development path (e.g., `reasoning-generator.ts` is still imported but GLM thinking mode is now used).

**Solution:**
Remove dead code to improve maintainability and strictly enforce the new "GLM Thinking" architecture.

**Implementation Details:**
-   **File:** `supabase/functions/chat/index.ts`
-   **Changes:**
    -   Remove imports of `reasoning-generator.ts` and `reasoning-summarizer.ts`.
    -   Remove any unused variables related to fallback reasoning generation.
    -   Remove excessive `console.log` noise from the touched files to improve log observability.

## 4. Verification Steps

After applying the fixes, run the following verifications:

1.  **Automated Tests:** `npm run test` (Backend & Frontend).
2.  **Manual Stream Test:**
    -   Trigger a complex artifact generation.
    -   Verify that "Thinking..." appears *instantly* (within 1s), even if the model takes time to produce the first token.
3.  **Manual UI Test:**
    -   Watch the chat end-of-stream transition.
    -   Verify there is no visual "flicker" or "blank gap" between the streaming view and the final saved message view.
