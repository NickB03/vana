# Status Ticker System - Flow Diagrams

**Visual representation of the robust status resolution system**

---

## Priority Chain Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Stream Starts (t=0s)                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Check P1: Semantic    │
                    │  (reasoningStatus)     │
                    └────────┬───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                ✓ Valid           ✗ Null/Generic
                    │                 │
                    │                 ▼
                    │    ┌────────────────────────┐
                    │    │  Check P2: Tool        │
                    │    │  (toolExecution)       │
                    │    └────────┬───────────────┘
                    │             │
                    │    ┌────────┴────────┐
                    │    │                 │
                    │ ✓ Active         ✗ Null
                    │    │                 │
                    │    │                 ▼
                    │    │    ┌────────────────────────┐
                    │    │    │  Check P3: Reasoning   │
                    │    │    │  (streamingText)       │
                    │    │    └────────┬───────────────┘
                    │    │             │
                    │    │    ┌────────┴────────┐
                    │    │    │                 │
                    │    │ ✓ Parsed        ✗ Empty
                    │    │    │                 │
                    │    │    │                 ▼
                    │    │    │    ┌────────────────────────┐
                    │    │    │    │  Check P4: Phase       │
                    │    │    │    │  (tokenCount, etc)     │
                    │    │    │    └────────┬───────────────┘
                    │    │    │             │
                    │    │    │             │
                    │    │    │    ┌────────┴────────┐
                    │    │    │    │                 │
                    │    │    │    │          elapsedSeconds >= 3?
                    │    │    │    │                 │
                    │    │    │    │         ┌───────┴───────┐
                    │    │    │    │         │               │
                    │    │    │    │       ✓ Yes          ✗ No
                    │    │    │    │         │               │
                    │    │    │    │         ▼               │
                    │    │    │    │  ┌───────────────┐      │
                    │    │    │    │  │ P5: Time      │      │
                    │    │    │    │  │ (fallback)    │      │
                    │    │    │    │  └───────┬───────┘      │
                    │    │    │    │          │              │
                    ▼    ▼    ▼    ▼          ▼              ▼
                ┌───────────────────────────────────────────────┐
                │         Return Status Message                 │
                │  {                                            │
                │    status: "...",                             │
                │    source: "semantic"|"tool"|"reasoning"|     │
                │            "phase"|"time",                    │
                │    isFallback: true|false                     │
                │  }                                            │
                └───────────────────────────────────────────────┘
```

---

## Time-Based Progression

```
Timeline: 0s ────────► 3s ────────► 10s ───────► 20s ───────► 30s ───────► 45s ───────► 60s

Status:   Phase-based  │  "Still working..."  │  "Building..."  │  "Crafting..."  │  "Taking longer..."  │  "Almost there..."
          │             │                      │                │                 │                      │
          ▼             ▼                      ▼                ▼                 ▼                      ▼

    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Analyzing │  │  Still   │  │Building  │  │Crafting  │  │ Taking   │  │  Almost  │  │  Still   │
    │request   │  │ working  │  │ detailed │  │ thorough │  │  longer  │  │  there   │  │processing│
    └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘

    P4: Phase     P5: Time      P5: Time      P5: Time      P5: Time       P5: Time       P5: Time
    isFallback:   isFallback:   isFallback:   isFallback:   isFallback:    isFallback:    isFallback:
    true          true          true          true          true           true           true

Note: At ANY point, if P1/P2/P3 becomes available, it takes precedence immediately
```

---

## Phase Detection State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Stream Phase Detection                          │
└─────────────────────────────────────────────────────────────────────────┘

Input: { tokenCount, toolExecution, artifactDetected, artifactClosed }

                            ┌─────────────┐
                            │   Start     │
                            └──────┬──────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ toolExecution exists?    │
                    └──────┬───────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
               ✓ Yes             ✗ No
                  │                 │
                  ▼                 ▼
         ┌────────────────┐  ┌────────────────┐
         │ success === ?  │  │ tokenCount < 50│
         └────┬───────────┘  └────┬───────────┘
              │                   │
    ┌─────────┴─────────┐    ┌────┴────┐
    │                   │    │         │
  ✓ undefined       ✗ defined  ✓ Yes  ✗ No
    │                   │    │         │
    ▼                   ▼    ▼         ▼
┌─────────┐      ┌──────────┐  ┌──────────┐  ┌──────────────────────┐
│tool_exec│      │tool_comp │  │reasoning │  │tokenCount < 150 &&   │
│         │      │          │  │          │  │!artifactDetected?    │
└─────────┘      └──────────┘  └──────────┘  └──────┬───────────────┘
                                                     │
                                            ┌────────┴────────┐
                                            │                 │
                                         ✓ Yes             ✗ No
                                            │                 │
                                            ▼                 ▼
                                    ┌──────────┐  ┌───────────────────────┐
                                    │generating│  │artifactDetected &&    │
                                    │          │  │!artifactClosed?       │
                                    └──────────┘  └──────┬────────────────┘
                                                          │
                                                 ┌────────┴────────┐
                                                 │                 │
                                              ✓ Yes             ✗ No
                                                 │                 │
                                                 ▼                 ▼
                                         ┌──────────┐  ┌────────────────────┐
                                         │generating│  │artifactClosed ||   │
                                         │          │  │tokenCount > 500?   │
                                         └──────────┘  └──────┬─────────────┘
                                                               │
                                                      ┌────────┴────────┐
                                                      │                 │
                                                   ✓ Yes             ✗ No
                                                      │                 │
                                                      ▼                 ▼
                                              ┌──────────┐      ┌──────────┐
                                              │finalizing│      │generating│
                                              │          │      │          │
                                              └──────────┘      └──────────┘

Phase → Status Mapping:
┌──────────────┬───────────────────────────┐
│ Phase        │ Status Message            │
├──────────────┼───────────────────────────┤
│ reasoning    │ Analyzing your request... │
│ generating   │ Generating response...    │
│ finalizing   │ Finalizing response...    │
│ tool_exec    │ Executing tools...        │
│ tool_comp    │ Processing results...     │
└──────────────┴───────────────────────────┘
```

---

## Reasoning Text Parsing Flow

```
┌─────────────────────────────────────────────────────────────┐
│          Input: streamingReasoningText                      │
│          "**Analyzing the Question**\n\nThe user wants..."  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Text length >= 5?     │
              └────────┬───────────────┘
                       │
              ┌────────┴────────┐
              │                 │
           ✓ Yes             ✗ No → Return null
              │
              ▼
    ┌──────────────────────────────┐
    │ Strategy 1: Extract Header   │
    │ Match /\*\*([^*]+)\*\*/      │
    └────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
  ✓ Match          ✗ No match
    │                 │
    ▼                 ▼
┌─────────┐   ┌──────────────────────────────┐
│ Return  │   │ Strategy 2: Detect Keywords  │
│ header  │   │ Check for "search", "build"  │
│  text   │   │ "analyze", etc               │
└─────────┘   └────────┬─────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
           ✓ Found           ✗ Not found
              │                 │
              ▼                 ▼
          ┌─────────┐   ┌─────────────────────────┐
          │ Return  │   │ Strategy 3: First Sent  │
          │ keyword │   │ Extract up to 40 chars  │
          │  status │   │ from first line         │
          └─────────┘   └────────┬────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                     ✓ Valid           ✗ Too short
                        │                 │
                        ▼                 ▼
                    ┌─────────┐       ┌────────┐
                    │ Return  │       │ Return │
                    │sentence │       │  null  │
                    └─────────┘       └────────┘

Examples:
─────────────────────────────────────────────────────────────
Input: "**Analyzing the Question**"
Strategy 1 Match: "Analyzing the Question"
Output: "Analyzing the Question..."

Input: "I will search for relevant information"
Strategy 1 Fail → Strategy 2 Match: "search"
Output: "Searching for information..."

Input: "Planning the implementation. Then we will code it."
Strategy 1 Fail → Strategy 2 Fail → Strategy 3 Match
Output: "Planning the implementation..."

Input: "Hi"
Strategy 1 Fail → Strategy 2 Fail → Strategy 3 Fail (too short)
Output: null (fall through to P4)
```

---

## Integration Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    useChatMessages Hook                         │
│  (Stream event processing)                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌──────────────────────┐
│ reasoning_status  │              │ tool_call_start      │
│ event             │              │ event                │
└────────┬──────────┘              └──────────┬───────────┘
         │                                    │
         │ Update lastReasoningStatus         │ Update currentToolExecution
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  updateProgress()                           │
│  Returns StreamProgress {                                   │
│    reasoningStatus: lastReasoningStatus,                    │
│    toolExecution: currentToolExecution,                     │
│    streamingReasoningText: reasoningText,                   │
│    tokenCount: tokenCount,                                  │
│    artifactDetected: artifactDetected,                      │
│    artifactClosed: artifactClosed,                          │
│    ...                                                      │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ onDelta('', progress)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    ChatInterface                            │
│  setStreamProgress(progress)                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Pass via displayMessages
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    ChatMessage                              │
│  <ReasoningDisplay                                          │
│    reasoningStatus={streamProgress?.reasoningStatus}        │
│    toolExecution={streamProgress?.toolExecution}            │
│    streamingReasoningText={streamProgress?.streaming...}    │
│    tokenCount={streamProgress?.tokenCount}                  │
│    artifactDetected={streamProgress?.artifactDetected}      │
│    artifactClosed={streamProgress?.artifactClosed}          │
│    isStreaming={isStreaming}                                │
│  />                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ReasoningDisplay Component                 │
│                                                             │
│  const elapsedSeconds = parseElapsedTime(elapsedTime)      │
│                                                             │
│  const statusData = useStreamingStatus({                   │
│    reasoningStatus,                                         │
│    toolExecution,                                           │
│    streamingReasoningText,                                  │
│    tokenCount,                                              │
│    artifactDetected,                                        │
│    artifactClosed,                                          │
│    elapsedSeconds,                                          │
│    isStreaming,                                             │
│  })                                                         │
│                                                             │
│  return <div>{statusData.status}</div>                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Render
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      User sees:                             │
│  ┌─────────────────────────────────────┐                   │
│  │ 🔄 Analyzing your request...    2s  │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  Status changes every 1-5 seconds based on:                │
│  • LLM reasoning output (P1)                               │
│  • Tool execution state (P2)                               │
│  • Parsed reasoning text (P3)                              │
│  • Token-based phase (P4)                                  │
│  • Time-based progression (P5)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Real-World Example: Web Search Request

```
User Input: "Find the latest AI news from this week"

Timeline:
───────────────────────────────────────────────────────────────────►

0.0s  │ Stream starts
      │ tokenCount: 0, no tool yet, no reasoning yet
      │ → useStreamingStatus returns P4 (phase): "Analyzing your request..."
      └─► User sees: "🔄 Analyzing your request...    0s"

0.5s  │ Tool call detected: browser.search
      │ toolExecution: { toolName: "browser.search", success: undefined }
      │ → useStreamingStatus returns P2 (tool): "Searching the web..."
      └─► User sees: "🔍 Searching the web...    0s"

1.2s  │ Still searching...
      │ → Status unchanged (P2 still active)
      └─► User sees: "🔍 Searching the web...    1s"

2.8s  │ Tool completes successfully
      │ toolExecution: { toolName: "browser.search", success: true, sourceCount: 8 }
      │ → useStreamingStatus returns P2 (tool): "Found 8 sources"
      └─► User sees: "✓ Found 8 sources    2s"

3.5s  │ Reasoning status arrives from backend
      │ reasoningStatus: "Analyzing search results"
      │ → useStreamingStatus returns P1 (semantic): "Analyzing search results"
      └─► User sees: "🧠 Analyzing search results    3s"

5.0s  │ tokenCount: 120, still generating
      │ reasoningStatus: "Synthesizing information from sources"
      │ → useStreamingStatus returns P1 (semantic): "Synthesizing information from sources"
      └─► User sees: "🧠 Synthesizing information from sources    5s"

8.0s  │ tokenCount: 450, approaching completion
      │ reasoningStatus: null (reasoning complete)
      │ → useStreamingStatus returns P4 (phase): "Finalizing response..."
      └─► User sees: "⏳ Finalizing response...    8s"

9.5s  │ Stream completes
      │ isStreaming: false
      │ → Status pill collapses to "Thought process    9s"
      └─► User sees: "💭 Thought process ⌄    🕐 9s"

Summary:
────────────────────────────────────────────────────────────────
Status changed 6 times in 9.5 seconds
Never showed static "Thinking..." for more than 3 seconds
Used all priority levels: P4 → P2 → P2 → P1 → P1 → P4
User always knew what was happening
```

---

## Failure Mode: All Priorities Unavailable

```
Scenario: Slow LLM with no reasoning, no tools, sparse streaming

Timeline:
───────────────────────────────────────────────────────────────────►

0.0s  │ Stream starts
      │ reasoningStatus: null
      │ toolExecution: null
      │ streamingReasoningText: null
      │ tokenCount: 0
      │ → P1, P2, P3 unavailable → P4 (phase): "Analyzing your request..."
      └─► User sees: "🔄 Analyzing your request...    0s"

1.0s  │ Still waiting...
      │ → P4 still active
      └─► User sees: "🔄 Analyzing your request...    1s"

2.0s  │ Still waiting...
      │ → P4 still active
      └─► User sees: "🔄 Analyzing your request...    2s"

3.0s  │ THRESHOLD CROSSED: elapsedSeconds >= 3
      │ → P5 (time) activates: "Still working on your request..."
      └─► User sees: "⏳ Still working on your request...    3s"

5.0s  │ Still waiting...
      │ → P5 active
      └─► User sees: "⏳ Still working on your request...    5s"

10.0s │ THRESHOLD CROSSED: elapsedSeconds >= 10
      │ → P5 (time) updates: "Building a detailed response..."
      └─► User sees: "⏳ Building a detailed response...    10s"

15.0s │ Still waiting...
      │ → P5 active
      └─► User sees: "⏳ Building a detailed response...    15s"

20.0s │ THRESHOLD CROSSED: elapsedSeconds >= 20
      │ → P5 (time) updates: "Crafting a thorough answer..."
      └─► User sees: "⏳ Crafting a thorough answer...    20s"

25.0s │ First token arrives!
      │ tokenCount: 1
      │ → P4 (phase) active again: "Analyzing your request..."
      │    BUT elapsedSeconds = 25 → P5 overrides
      │ → P5 (time) still active: "Crafting a thorough answer..."
      └─► User sees: "⏳ Crafting a thorough answer...    25s"

30.0s │ THRESHOLD CROSSED: elapsedSeconds >= 30
      │ tokenCount: 50
      │ → P5 (time) updates: "This is taking longer than usual..."
      └─► User sees: "⚠️ This is taking longer than usual...    30s"

35.0s │ More tokens arriving
      │ tokenCount: 200
      │ → P4 would say "Generating response..."
      │    BUT elapsedSeconds = 35 → P5 overrides
      │ → P5 (time) still active: "This is taking longer than usual..."
      └─► User sees: "⚠️ This is taking longer than usual...    35s"

40.0s │ Stream completes
      │ isStreaming: false
      │ → Status pill collapses to "Thought process    40s"
      └─► User sees: "💭 Thought process ⌄    🕐 40s"

Summary:
────────────────────────────────────────────────────────────────
WORST CASE: No high-priority status sources available
Status changed 5 times in 40 seconds (every 3-10 seconds)
Never showed static text for more than 3 seconds
Time-based progression provided reassurance
User knew system was working, not frozen
```

---

## Decision Tree (Quick Reference)

```
Is reasoningStatus meaningful?
├─ YES → Return P1: reasoningStatus
└─ NO
   └─ Is toolExecution active?
      ├─ YES → Return P2: getToolExecutionStatus(toolExecution)
      └─ NO
         └─ Can parse streamingReasoningText?
            ├─ YES → Return P3: parseReasoningTextForStatus(text)
            └─ NO
               └─ Determine phase from tokenCount
                  └─ Is elapsedSeconds >= 3?
                     ├─ YES → Return P5: getTimeBasedStatus(elapsedSeconds)
                     └─ NO → Return P4: getPhaseStatus(phase)
```

---

## Key Takeaways

1. **5-Level Guarantee**: Every stream has at least P4 (phase) status, enhanced by P5 (time) after 3 seconds

2. **Dynamic Prioritization**: Higher-priority sources override lower ones immediately when available

3. **No Static Fallback**: "Thinking..." only appears if reasoningStatus explicitly sends it (and P1 skips it)

4. **Progressive Enhancement**: Status messages become more specific as better data arrives

5. **Time-Based Safety Net**: After 3 seconds, time-based progression ensures visual feedback

6. **User Reassurance**: Status changes every 3-10 seconds minimum during long operations

---

**End of Flow Diagrams**
