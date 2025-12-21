Key findings from researching GLM 4.6:
GLM 4.6 actually has a cleaner streaming API than Claude for reasoning. Instead of tracking content block types, you simply check which delta field is populated:

delta.reasoning_content → thinking phase
delta.content → response phase
delta.tool_calls → tool invocations (with tool_stream=True)

The thinking mode is enabled by default in GLM 4.6 (unlike Claude where you must specify budget_tokens), so you just need thinking: { type: "enabled" } or "disabled" to toggle it.
What I've included:

Comprehensive guide covering the architecture, API differences from Claude, and implementation patterns
Supabase Edge Function (supabase-edge-function.ts) that:

Proxies GLM 4.6 streaming with thinking support
Transforms the raw stream into custom SSE events
Extracts status phrases for the "thinking ticker"
Handles tool streaming when enabled


React hook (useGLMChat-hook.ts) that:

Manages message history with thinking metadata
Tracks streaming state and duration
Handles abort/cancellation
Provides callbacks for thinking start/end events


ThinkingPanel component (ThinkingPanel-component.tsx) with:

Auto-expand on thinking start
Status ticker display
Duration tracking
Both vanilla CSS and Tailwind versions

The main architectural insight: GLM 4.6's streaming format is actually simpler to work with than Claude's because reasoning content and response content come as separate delta fields rather than requiring you to track content block indices.

