# Chat System Prompt Optimization Plan

> **Goal:** Improve model performance (consistency, tool selection accuracy, instruction following) through targeted prompt optimizations.
>
> **Approach:** Incremental changes with testing gates after each issue to validate improvements before proceeding.

## Overview

| Phase | Issue | Expected Improvement | Risk |
|-------|-------|---------------------|------|
| 1 | Conflicting citation instructions | Consistent citation format | Low |
| 2 | Critical rules buried in middle | Better rule compliance | Low |
| 3 | Negative → positive instructions | More reliable behavior | Low |
| 4 | Mode hint ambiguity | Correct tool selection | Medium |
| 5 | Scattered sample data rule | Consistent sample data | Low |
| 6 | Tool description verbosity | Reliable tool calls | Medium |

---

## Phase 1: Consolidate Citation Instructions

### Problem
Two conflicting citation formats exist:
- `TOOL_CALLING_SECTION`: Use `[1], [2], [3]` markers
- Real-Time Web Search section: Use `[Source Name]` or `[URL]`

### Changes

**File:** `supabase/functions/_shared/system-prompt-inline.ts`

1. Update `TOOL_CALLING_SECTION` (lines 57-64) to be the single source of truth:

```typescript
`**CITATION FORMAT:**
When search results are provided, cite sources using numbered markers [1], [2], [3] matching the result order.
- ✅ "The price is $50 [1] and available in stores [2]"
- ❌ "According to TechCrunch..." (don't use source names inline)
- ❌ Listing sources at the end (UI displays badges automatically)

If results are insufficient, say so honestly rather than fabricating sources.`
```

2. Remove citation guidance from the "Real-Time Web Search" section (lines 85-88). Replace with:

```typescript
`2. **Integrate naturally** - Use search findings in your response, citing with [1], [2] markers`
```

### Testing Gate 1

**Test Type:** Manual + Automated

**Test Cases:**
```typescript
// test/prompt-optimization/citation-consistency.test.ts

const CITATION_TEST_CASES = [
  {
    name: "Single source citation",
    userMessage: "What's the current price of Bitcoin?",
    searchResults: [{ title: "CoinDesk", url: "...", content: "Bitcoin is $45,000" }],
    expectations: {
      shouldContain: ["[1]"],
      shouldNotContain: ["CoinDesk", "Sources:", "References:"],
    }
  },
  {
    name: "Multiple source citation",
    userMessage: "Latest AI news today",
    searchResults: [
      { title: "TechCrunch", content: "OpenAI released..." },
      { title: "Verge", content: "Google announced..." }
    ],
    expectations: {
      shouldContain: ["[1]", "[2]"],
      shouldNotContain: ["TechCrunch", "Verge", "Sources:"],
    }
  },
  {
    name: "No fabrication when results insufficient",
    userMessage: "What happened at the secret meeting yesterday?",
    searchResults: [],
    expectations: {
      shouldContain: ["limited information", "couldn't find", "no results"],
      shouldNotContain: ["[1]", "[2]", "According to"],
    }
  }
];
```

**Validation Method:**
1. Run 10 search-enabled chat requests
2. Parse responses for citation format
3. **Pass criteria:**
   - 100% use `[N]` format (no source names inline)
   - 0% list sources at end
   - 0% fabricated citations when no results

**Rollback Trigger:** If citation format consistency < 90%, revert changes.

---

## Phase 2: Reorder Instructions for Attention

### Problem
Critical constraints (no @/ imports, no localStorage, etc.) are buried in the middle of the prompt where LLM attention is lowest.

### Changes

**File:** `supabase/functions/_shared/system-prompt-inline.ts`

1. Add a condensed critical rules section near the TOP (after identity, before tool section):

```typescript
const CRITICAL_RULES_SUMMARY = `
# CRITICAL RULES (always enforced)
1. Artifacts: No @/ imports, no localStorage, React via global, Tailwind core classes only
2. Citations: Use [1], [2] format from search results, never fabricate
3. Tools: Use generate_artifact for creation, browser.search for current info
4. Style: No filler phrases ("Certainly!", "Of course!"), be direct
`;
```

2. Keep existing `CORE_RESTRICTIONS_REMINDER` at the bottom (recency effect).

3. Update template structure:
```typescript
const SYSTEM_PROMPT_TEMPLATE = `You are a helpful AI assistant...

${CRITICAL_RULES_SUMMARY}

${TOOL_CALLING_SECTION}

# Communication Style
...

# Artifact Guidelines (Reference)
... [existing detailed sections] ...

${CORE_RESTRICTIONS_REMINDER}

{{FULL_ARTIFACT_CONTEXT}}
`;
```

### Testing Gate 2

**Test Type:** A/B Comparison

**Methodology:**
1. Create two prompt variants:
   - Control: Current prompt (rules in middle)
   - Variant: Rules at top + bottom
2. Run 20 identical artifact requests through each
3. Evaluate rule compliance

**Test Cases:**
```typescript
const RULE_COMPLIANCE_TESTS = [
  {
    name: "No @/ imports",
    prompt: "Create a button component using shadcn styling",
    checkArtifact: (code) => !code.includes('@/components') && !code.includes('@/lib'),
  },
  {
    name: "No localStorage",
    prompt: "Create a todo app that saves items",
    checkArtifact: (code) => !code.includes('localStorage') && !code.includes('sessionStorage'),
  },
  {
    name: "React via global",
    prompt: "Create an interactive counter",
    checkArtifact: (code) => !code.includes("import React") && !code.includes("from 'react'"),
  },
  {
    name: "Tailwind core only",
    prompt: "Create a card with custom 237px width",
    checkArtifact: (code) => !code.includes('w-[') && !code.includes('h-['),
  }
];
```

**Pass Criteria:**
- Variant must show ≥10% improvement in rule compliance over control
- No regression in other metrics (tool selection, response quality)

**Metrics to Track:**
| Metric | Control Baseline | Variant Target |
|--------|-----------------|----------------|
| @/ import violations | Measure | -50% or better |
| localStorage usage | Measure | -50% or better |
| React import errors | Measure | -50% or better |

---

## Phase 3: Convert Negative to Positive Instructions

### Problem
Negative instructions ("Never...", "Don't...", "Avoid...") are followed less reliably than positive ones.

### Changes

**File:** `supabase/functions/_shared/system-prompt-inline.ts`

**Before → After transformations:**

| Location | Before | After |
|----------|--------|-------|
| Line 89 | "Never tell users you can't access current information" | "You have FULL web search via browser.search—use it for current events, prices, news" |
| Line 243 | "Do not put Mermaid code in code blocks" | "For Mermaid: place code directly in artifact tags (no code block wrapper)" |
| Line 277 | "Avoid localStorage/sessionStorage" | "Store state using React useState hooks" |
| Line 95 | "without unnecessary affirmations or filler phrases" | "Start responses with the requested content directly" |

**File:** `supabase/functions/_shared/artifact-rules/core-restrictions.ts`

Transform the restrictions format:

```typescript
// Before
`2. **NO BROWSER STORAGE** - localStorage/sessionStorage APIs not supported
   ❌ FORBIDDEN: localStorage.setItem('key', value)
   ✅ CORRECT: const [value, setValue] = useState(initialValue)`

// After
`2. **USE REACT STATE** - Store data in component state
   ✅ DO: const [value, setValue] = useState(initialValue)
   ✅ DO: const [items, setItems] = useState([])
   ⚠️ NOT AVAILABLE: localStorage, sessionStorage (sandbox limitation)`
```

### Testing Gate 3

**Test Type:** Behavioral Compliance Check

**Test Cases:**
```typescript
const POSITIVE_INSTRUCTION_TESTS = [
  {
    name: "Uses search instead of claiming inability",
    prompt: "What's the weather in NYC right now?",
    expectations: {
      shouldTriggerTool: "browser.search",
      shouldNotContain: [
        "I can't access",
        "I don't have access",
        "I'm not able to",
        "I cannot browse"
      ]
    }
  },
  {
    name: "Direct response without filler",
    prompt: "What is 2+2?",
    expectations: {
      responseStartsWith: ["4", "The answer", "2+2"],
      shouldNotStartWith: ["Certainly!", "Of course!", "Sure!", "Absolutely!", "Great question!"]
    }
  },
  {
    name: "Uses useState for persistence",
    prompt: "Create a notes app that remembers what I type",
    expectations: {
      artifactContains: ["useState"],
      artifactNotContains: ["localStorage", "sessionStorage"]
    }
  }
];
```

**Pass Criteria:**
- 0% responses claiming inability to search
- ≤5% responses starting with filler phrases
- 100% artifacts using useState for state (not storage APIs)

---

## Phase 4: Clarify Mode Hint Logic

### Problem
Mode hints ("artifact", "image", "auto") have vague conditions that may cause incorrect tool selection.

### Changes

**File:** `supabase/functions/chat/handlers/tool-calling-chat.ts`

Update `buildModeHintPrompt`:

```typescript
function buildModeHintPrompt(modeHint: ModeHint): string {
  switch (modeHint) {
    case 'artifact':
      return `
[MODE: artifact]
User expects visual/interactive output. Decision guide:
- "Create/Build/Make X" → use generate_artifact
- "Add/Change/Update the [existing thing]" → use generate_artifact
- "What is/How does X work?" → answer directly (no tool)
- "Show me the code for..." → use generate_artifact`;

    case 'image':
      return `
[MODE: image]
User expects generated imagery. Decision guide:
- "Draw/Create/Generate an image of X" → use generate_image
- "What does X look like?" → use generate_image
- "Describe X" → answer directly (no tool)
- "Edit/Modify the image to..." → use generate_image with mode=edit`;

    case 'auto':
    default:
      return `
[MODE: auto]
Select tool based on user intent:
- Creation requests (apps, components, diagrams) → generate_artifact
- Image/photo/illustration requests → generate_image
- Current events/prices/news questions → browser.search
- General knowledge/explanations → respond directly`;
  }
}
```

### Testing Gate 4

**Test Type:** Tool Selection Accuracy

**Test Cases:**
```typescript
const TOOL_SELECTION_TESTS = [
  // Artifact mode tests
  { mode: 'artifact', prompt: "Create a calculator", expectedTool: "generate_artifact" },
  { mode: 'artifact', prompt: "What is React?", expectedTool: null }, // Should NOT use tool
  { mode: 'artifact', prompt: "Add a reset button", expectedTool: "generate_artifact" },

  // Image mode tests
  { mode: 'image', prompt: "Draw a sunset", expectedTool: "generate_image" },
  { mode: 'image', prompt: "What colors are in a sunset?", expectedTool: null },

  // Auto mode tests
  { mode: 'auto', prompt: "Build me a todo app", expectedTool: "generate_artifact" },
  { mode: 'auto', prompt: "What's the weather?", expectedTool: "browser.search" },
  { mode: 'auto', prompt: "Explain recursion", expectedTool: null },
  { mode: 'auto', prompt: "Create a logo", expectedTool: "generate_image" },
];
```

**Pass Criteria:**
- Tool selection accuracy ≥95%
- No false positives (tool called when should respond directly) in question scenarios

**Metrics:**
| Scenario | Target Accuracy |
|----------|-----------------|
| Creation requests → correct tool | 98% |
| Questions → no tool | 95% |
| Current info → browser.search | 95% |

---

## Phase 5: Consolidate Sample Data Instruction

### Problem
"Always include sample data" appears 3+ times with varying emphasis, leading to inconsistent compliance.

### Changes

**File:** `supabase/functions/_shared/system-prompt-inline.ts`

1. Create ONE authoritative sample data rule in the critical rules section:

```typescript
const SAMPLE_DATA_RULE = `
# SAMPLE DATA (MANDATORY)
Every artifact MUST display realistic sample data on first render. Empty states are unacceptable.

Requirements:
- Lists/tables: 5-10 items with realistic names, prices, dates
- Forms: Pre-filled example values in inputs
- Dashboards: Mock data showing full UI capability
- Games: Ready-to-play initial state

Examples:
✅ "MacBook Pro M3 - $2,399" | "Sarah Johnson" | "Dec 15, 2024"
❌ "Item 1 - $100" | "User 1" | "Date"
`;
```

2. Remove duplicate mentions from:
   - "Building Artifacts from Suggestions" section (keep reference only)
   - Quality Standards bullet #10 (remove, covered above)

3. Add reference in other sections: `(See SAMPLE DATA rule above)`

### Testing Gate 5

**Test Type:** Artifact Content Analysis

**Test Cases:**
```typescript
const SAMPLE_DATA_TESTS = [
  {
    prompt: "Create a product catalog",
    checkArtifact: (code) => {
      const hasRealisticProducts = /\$\d{1,3}(,\d{3})*(\.\d{2})?/.test(code); // Price format
      const hasNoPlaceholders = !/Item \d|Product \d|Test \d/i.test(code);
      const hasMultipleItems = (code.match(/\{[^}]*name[^}]*\}/g) || []).length >= 5;
      return hasRealisticProducts && hasNoPlaceholders && hasMultipleItems;
    }
  },
  {
    prompt: "Create a user dashboard",
    checkArtifact: (code) => {
      const hasRealisticNames = /[A-Z][a-z]+ [A-Z][a-z]+/.test(code); // "John Smith" pattern
      const hasRealisticData = /\d{1,3}%|\$\d+|[A-Z][a-z]+ \d{1,2}/.test(code);
      return hasRealisticNames && hasRealisticData;
    }
  },
  {
    prompt: "Create a todo list app",
    checkArtifact: (code) => {
      const hasPrefilledTodos = /(useState\(\[)([^[\]]*\{[^}]*\}[^[\]]*){3,}(\]\))/.test(code);
      return hasPrefilledTodos;
    }
  }
];
```

**Pass Criteria:**
- 95% of list-based artifacts have ≥5 sample items
- 0% use placeholder patterns ("Item 1", "User 1", "Test data")
- 100% render with visible content (no empty states)

---

## Phase 6: Optimize Tool Descriptions

### Problem
Multi-line tool descriptions may cause GLM to truncate tool calls (per comment in glm-client.ts).

### Changes

**File:** `supabase/functions/_shared/tool-definitions.ts`

Flatten `generate_image` description:

```typescript
// Before (multi-line)
description: `Generate or edit images using AI. Supports two modes:
- GENERATE: Create new images from text descriptions
- EDIT: Modify existing images (remove objects, change colors, add elements, etc.)

For EDIT mode: Set mode="edit" and include baseImage with the URL of the image to modify.`

// After (single line, condensed)
description: `Generate images (mode=generate) or edit existing ones (mode=edit with baseImage URL). Supports 1:1, 16:9, 9:16 ratios.`
```

Also condense `generate_artifact`:

```typescript
// After
description: `Create interactive content: react (apps/components), html (static pages), svg (graphics), mermaid (diagrams), code (snippets), markdown (docs). Include sample data.`
```

### Testing Gate 6

**Test Type:** Tool Call Completion Rate

**Test Cases:**
```typescript
const TOOL_CALL_COMPLETION_TESTS = [
  { prompt: "Generate an image of a mountain sunset", expectedTool: "generate_image" },
  { prompt: "Edit the previous image to add birds", expectedTool: "generate_image", expectedMode: "edit" },
  { prompt: "Create a React dashboard", expectedTool: "generate_artifact" },
  { prompt: "Search for latest tech news", expectedTool: "browser.search" },
];
```

**Metrics to Track:**
| Metric | Before | Target |
|--------|--------|--------|
| Tool call parse success rate | Baseline | 100% |
| Truncated tool calls | Baseline | 0 |
| Tool call timeout rate | Baseline | <2% |

**Pass Criteria:**
- 100% of tool calls parse successfully (no truncation)
- No increase in tool call timeouts

---

## Execution Schedule

```
Week 1:
├── Day 1-2: Implement Phase 1 (Citations)
│   └── Testing Gate 1: Run 10 search queries, validate format
├── Day 3-4: Implement Phase 2 (Instruction Ordering)
│   └── Testing Gate 2: A/B test 20 artifacts, measure compliance
└── Day 5: Analyze results, document findings

Week 2:
├── Day 1-2: Implement Phase 3 (Positive Instructions)
│   └── Testing Gate 3: Behavioral compliance check
├── Day 3-4: Implement Phase 4 (Mode Hints)
│   └── Testing Gate 4: Tool selection accuracy test
└── Day 5: Integration testing of Phases 1-4

Week 3:
├── Day 1-2: Implement Phase 5 (Sample Data)
│   └── Testing Gate 5: Artifact content analysis
├── Day 3-4: Implement Phase 6 (Tool Descriptions)
│   └── Testing Gate 6: Tool call completion rate
└── Day 5: Full regression testing, production deployment
```

---

## Monitoring & Rollback

### Key Metrics Dashboard

Add these metrics to `ai_usage_logs` analysis:

```sql
-- Citation format compliance
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE response LIKE '%[1]%') as numbered_citations,
  COUNT(*) FILTER (WHERE response LIKE '%Sources:%') as listed_sources,
  COUNT(*) as total_search_responses
FROM ai_usage_logs
WHERE function_name = 'chat'
  AND response LIKE '%search%'
GROUP BY DATE(created_at);

-- Rule violation tracking
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE response LIKE '%@/components%') as import_violations,
  COUNT(*) FILTER (WHERE response LIKE '%localStorage%') as storage_violations,
  COUNT(*) FILTER (WHERE response LIKE '%Certainly!%' OR response LIKE '%Of course!%') as filler_violations
FROM ai_usage_logs
WHERE function_name = 'generate-artifact'
GROUP BY DATE(created_at);
```

### Rollback Procedure

If any phase causes regression:

1. **Immediate:** Revert the specific change via git
2. **Deploy:** `./scripts/deploy-simple.sh prod`
3. **Verify:** Run testing gate for that phase to confirm fix
4. **Analyze:** Document what went wrong before retrying

### Success Criteria (Overall)

| Metric | Baseline | Target | Measured By |
|--------|----------|--------|-------------|
| Citation consistency | TBD | 95%+ | Testing Gate 1 |
| Rule compliance | TBD | +20% | Testing Gate 2 |
| Filler phrase rate | TBD | <5% | Testing Gate 3 |
| Tool selection accuracy | TBD | 95%+ | Testing Gate 4 |
| Sample data inclusion | TBD | 95%+ | Testing Gate 5 |
| Tool call success rate | TBD | 100% | Testing Gate 6 |

---

## Appendix: Test Utilities

### Automated Test Runner

```typescript
// scripts/test-prompt-optimization.ts

import { createClient } from '@supabase/supabase-js';

interface TestCase {
  name: string;
  prompt: string;
  modeHint?: 'artifact' | 'image' | 'auto';
  expectations: {
    shouldContain?: string[];
    shouldNotContain?: string[];
    shouldTriggerTool?: string | null;
    artifactCheck?: (code: string) => boolean;
  };
}

async function runTestSuite(testCases: TestCase[], phase: string) {
  const results = {
    phase,
    total: testCases.length,
    passed: 0,
    failed: 0,
    failures: [] as string[],
  };

  for (const testCase of testCases) {
    const response = await callChatEndpoint(testCase.prompt, testCase.modeHint);
    const passed = validateResponse(response, testCase.expectations);

    if (passed) {
      results.passed++;
    } else {
      results.failed++;
      results.failures.push(testCase.name);
    }
  }

  console.log(`\n=== ${phase} Results ===`);
  console.log(`Passed: ${results.passed}/${results.total}`);
  if (results.failures.length > 0) {
    console.log(`Failed: ${results.failures.join(', ')}`);
  }

  return results;
}
```

### Response Validator

```typescript
function validateResponse(response: ChatResponse, expectations: TestCase['expectations']): boolean {
  const content = response.content || '';
  const toolCalled = response.toolCalls?.[0]?.name || null;

  // Check required content
  if (expectations.shouldContain) {
    for (const term of expectations.shouldContain) {
      if (!content.includes(term)) return false;
    }
  }

  // Check forbidden content
  if (expectations.shouldNotContain) {
    for (const term of expectations.shouldNotContain) {
      if (content.includes(term)) return false;
    }
  }

  // Check tool selection
  if ('shouldTriggerTool' in expectations) {
    if (toolCalled !== expectations.shouldTriggerTool) return false;
  }

  // Check artifact code
  if (expectations.artifactCheck && response.artifact) {
    if (!expectations.artifactCheck(response.artifact.code)) return false;
  }

  return true;
}
```
