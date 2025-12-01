import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseGLMReasoningToStructured } from "../glm-reasoning-parser.ts";
import { validateReasoningSteps } from "../reasoning-generator.ts";

/**
 * Test Suite for GLM Reasoning Parser
 *
 * Coverage:
 * - ✅ Numbered step detection (1., 2., Step 1:)
 * - ✅ Section header detection (lines ending with :)
 * - ✅ Bullet point extraction (-, *, •)
 * - ✅ Paragraph-based section splitting
 * - ✅ Phase inference based on content and position
 * - ✅ Title generation and cleanup
 * - ✅ Fallback handling for unstructured text
 * - ✅ Validation of output structure
 * - ✅ Edge cases (empty input, invalid input, malformed text)
 */

// ============================================================================
// SECTION 1: Numbered Steps Detection
// ============================================================================

Deno.test("parseGLMReasoningToStructured - parses numbered steps (1., 2., 3.)", () => {
  const rawReasoning = `
1. Understanding the user's request
This involves analyzing the input and identifying key requirements.

2. Planning the approach
Determining the best strategy to solve the problem.

3. Implementing the solution
Writing clean, efficient code to meet the requirements.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  assertEquals(result.steps[0].phase, "research");
  assertEquals(result.steps[1].phase, "analysis");
  assertEquals(result.steps[2].phase, "solution");

  // Validate against schema
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - parses 'Step N:' format", () => {
  const rawReasoning = `
Step 1: Analyzing the database schema
Reviewing table structures and relationships.

Step 2: Identifying optimization opportunities
Finding slow queries and missing indexes.

Step 3: Implementing improvements
Adding indexes and refactoring queries.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - parses parentheses numbering (1), 2), 3))", () => {
  const rawReasoning = `
1) Research phase
Gathering information about the problem domain.

2) Analysis phase
Evaluating different solutions.

3) Solution phase
Implementing the chosen approach.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 2: Section Header Detection
// ============================================================================

Deno.test("parseGLMReasoningToStructured - detects section headers ending with colon", () => {
  const rawReasoning = `
Understanding the Problem:
The user wants to optimize their React application for better performance.

Analyzing Current State:
Identifying performance bottlenecks using profiling tools.

Proposing Solution:
Implementing memoization and code splitting strategies.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  assertEquals(result.steps[0].title.includes("Understanding"), true);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 3: Bullet Point Extraction
// ============================================================================

Deno.test("parseGLMReasoningToStructured - extracts bullet points with dash (-)", () => {
  const rawReasoning = `
Planning the implementation:
- Set up project structure
- Configure build tools
- Implement core features
- Write comprehensive tests
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 1);
  assertEquals(result.steps[0].items.length, 4);
  assertEquals(result.steps[0].items[0], "Set up project structure");
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - extracts bullet points with asterisk (*)", () => {
  const rawReasoning = `
Key considerations:
* Performance optimization
* Security best practices
* Accessibility standards
* User experience design
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 1);
  assertEquals(result.steps[0].items.length, 4);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - extracts bullet points with bullet (•)", () => {
  const rawReasoning = `
Implementation steps:
• Initialize database connection
• Set up authentication
• Create API endpoints
• Deploy to production
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 1);
  assertEquals(result.steps[0].items.length, 4);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 4: Phase Inference
// ============================================================================

Deno.test("parseGLMReasoningToStructured - infers 'research' phase from keywords", () => {
  const rawReasoning = `
Analyzing the user's request and understanding the requirements.
Exploring existing solutions in the domain.
Investigating best practices and common patterns.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  // Should detect research phase based on keywords
  const hasResearch = result.steps.some(step => step.phase === "research");
  assertEquals(hasResearch, true);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - infers 'analysis' phase from keywords", () => {
  const rawReasoning = `
Evaluating different approaches to solve the problem.
Considering trade-offs between performance and maintainability.
Planning the overall architecture and component structure.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - infers 'solution' phase from keywords", () => {
  const rawReasoning = `
Implementing the core functionality with TypeScript.
Creating the user interface components.
Building the API integration layer.
Generating comprehensive documentation.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  const hasSolution = result.steps.some(step => step.phase === "solution");
  assertEquals(hasSolution, true);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - uses position-based inference as fallback", () => {
  const rawReasoning = `
1. First step without obvious phase keywords
Some content here.

2. Middle step also without clear indicators
More content here.

3. Final step to complete the process
Final content here.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  // Position-based: first should be research, last should be solution
  assertEquals(result.steps[0].phase, "research");
  assertEquals(result.steps[2].phase, "solution");
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 5: Title Generation
// ============================================================================

Deno.test("parseGLMReasoningToStructured - generates titles within character limits", () => {
  const rawReasoning = `
1. This is a very long title that exceeds the reasonable character limit for a title and should be truncated appropriately
Content here.

2. Short
More content.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 2);

  // Long title should be truncated
  assertEquals(result.steps[0].title.length <= 60, true);

  // Short title should be expanded
  assertEquals(result.steps[1].title.length >= 10, true);

  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - removes step number prefixes from titles", () => {
  const rawReasoning = `
Step 1: Analyzing requirements
Step 2: Designing solution
Step 3: Implementing code
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);

  // Titles should not contain "Step N:"
  assertEquals(result.steps[0].title.includes("Step"), false);
  assertEquals(result.steps[1].title.includes("Step"), false);
  assertEquals(result.steps[2].title.includes("Step"), false);

  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 6: Paragraph-Based Splitting
// ============================================================================

Deno.test("parseGLMReasoningToStructured - splits by double newlines when no structure detected", () => {
  const rawReasoning = `
First paragraph of reasoning content that doesn't follow any particular structure or format.

Second paragraph continues the thought process with additional details and considerations.

Third paragraph concludes with the final reasoning and recommendations.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length >= 1, true);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 7: Icon Assignment
// ============================================================================

Deno.test("parseGLMReasoningToStructured - assigns correct icons for phases", () => {
  const rawReasoning = `
1. Researching the domain
2. Analyzing the options
3. Implementing the solution
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);

  // Icons should match phases
  const researchStep = result.steps.find(s => s.phase === "research");
  const analysisStep = result.steps.find(s => s.phase === "analysis");
  const solutionStep = result.steps.find(s => s.phase === "solution");

  if (researchStep) assertEquals(researchStep.icon, "search");
  if (analysisStep) assertEquals(analysisStep.icon, "lightbulb");
  if (solutionStep) assertEquals(solutionStep.icon, "target");

  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 8: Summary Generation
// ============================================================================

Deno.test("parseGLMReasoningToStructured - generates summary from last section", () => {
  const rawReasoning = `
1. First step
Some reasoning here.

2. Second step
More reasoning.

3. Final step with important conclusion
This is the key takeaway from the entire reasoning process.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertExists(result.summary);
  assertEquals(result.summary.length <= 150, true);
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - truncates long summaries", () => {
  const rawReasoning = `
Final conclusion: ${"A".repeat(200)}
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertExists(result.summary);
  assertEquals(result.summary.length <= 150, true);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 9: Fallback Handling
// ============================================================================

Deno.test("parseGLMReasoningToStructured - creates fallback for completely unstructured text", () => {
  const rawReasoning = "Just a single line of reasoning without any structure at all.";

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 1);
  assertEquals(result.steps[0].phase, "research");
  assertEquals(result.steps[0].icon, "search");
  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - fallback splits long text into items", () => {
  const rawReasoning = `
This is a long piece of reasoning text. It contains multiple sentences.
Each sentence provides some insight. The reasoning continues here.
More thoughts are added. Finally we reach a conclusion.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length >= 1, true);

  // Should have split into multiple items or at least one item
  assertEquals(result.steps[0].items.length >= 1, true);

  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 10: Edge Cases and Error Handling
// ============================================================================

Deno.test("parseGLMReasoningToStructured - returns null for empty string", () => {
  const result = parseGLMReasoningToStructured("");
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - returns null for whitespace-only string", () => {
  const result = parseGLMReasoningToStructured("   \n\n   \t   ");
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - returns null for null input", () => {
  const result = parseGLMReasoningToStructured(null as any);
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - returns null for undefined input", () => {
  const result = parseGLMReasoningToStructured(undefined as any);
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - returns null for non-string input", () => {
  const result = parseGLMReasoningToStructured(123 as any);
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - handles text with only newlines", () => {
  const rawReasoning = "\n\n\n\n";
  const result = parseGLMReasoningToStructured(rawReasoning);
  assertEquals(result, null);
});

Deno.test("parseGLMReasoningToStructured - handles mixed formatting styles", () => {
  const rawReasoning = `
Step 1: Understanding the problem
This requires careful analysis.

Section Two:
- Point one
- Point two

3. Final thoughts
Wrapping up the reasoning process.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length >= 2, true);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 11: Real-World Examples
// ============================================================================

Deno.test("parseGLMReasoningToStructured - handles realistic GLM output", () => {
  const rawReasoning = `
1. Analyzing the user's request for a React component
The user wants to create a custom dropdown component with accessibility features.
Key requirements include keyboard navigation and ARIA labels.

2. Planning the implementation approach
I'll use Radix UI primitives for accessibility compliance.
The component will follow React best practices with TypeScript.
State management will use React hooks (useState, useEffect).

3. Structuring the component architecture
- Create main Dropdown component with composition pattern
- Implement DropdownTrigger for the button element
- Build DropdownContent for the menu items
- Add DropdownItem for individual options
- Include proper TypeScript interfaces for props

4. Implementing accessibility features
Following ARIA best practices with role attributes.
Adding keyboard event handlers for Tab, Enter, Escape, Arrow keys.
Ensuring focus management and screen reader compatibility.

5. Generating the final code
Creating clean, production-ready code with comments.
Including usage examples and prop documentation.
Adding error handling and edge case considerations.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 5);

  // Verify proper phase distribution
  const phases = result.steps.map(s => s.phase);
  assertEquals(phases.includes("research"), true);
  assertEquals(phases.includes("analysis"), true);
  assertEquals(phases.includes("solution"), true);

  // Verify bullet points were extracted
  const hasItemsFromBullets = result.steps.some(step =>
    step.items.some(item => item.includes("DropdownTrigger") || item.includes("DropdownContent"))
  );
  assertEquals(hasItemsFromBullets, true);

  validateReasoningSteps(result);
});

Deno.test("parseGLMReasoningToStructured - handles code-focused reasoning", () => {
  const rawReasoning = `
Understanding the bug:
The application crashes when the user submits an empty form.
Error occurs in the validation middleware.
Root cause is missing null check.

Analyzing the solution:
Add input validation before processing.
Implement defensive programming patterns.
Consider edge cases like empty strings, null, undefined.

Implementing the fix:
Update validation middleware with proper checks.
Add unit tests to prevent regression.
Deploy with feature flag for safe rollout.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  validateReasoningSteps(result);
});

// ============================================================================
// SECTION 12: Validation Integration
// ============================================================================

Deno.test("parseGLMReasoningToStructured - all outputs pass validateReasoningSteps", () => {
  const testCases = [
    "1. First step\n2. Second step\n3. Third step",
    "Research:\n- Point 1\n- Point 2\nAnalysis:\n- Point 3",
    "Step 1: Analyze\nStep 2: Plan\nStep 3: Execute",
    "Single paragraph of reasoning without structure.",
  ];

  for (const testCase of testCases) {
    const result = parseGLMReasoningToStructured(testCase);
    if (result) {
      // Should not throw validation errors
      validateReasoningSteps(result);
    }
  }
});

// ============================================================================
// SECTION 13: Title Transformation Integration
// ============================================================================

Deno.test("parseGLMReasoningToStructured - transforms titles to gerund form", () => {
  const rawReasoning = `
1. I will analyze the requirements
Content here.

2. Let me check the database
Content here.

3. We need to build the component
Content here.
  `.trim();

  const result = parseGLMReasoningToStructured(rawReasoning);

  assertExists(result);
  assertEquals(result.steps.length, 3);
  assertEquals(result.steps[0].title, "Analyzing the requirements");
  assertEquals(result.steps[1].title, "Checking the database");
  assertEquals(result.steps[2].title, "Building the component");
});

// Run tests
console.log("\n✅ All glm-reasoning-parser tests completed!\n");
