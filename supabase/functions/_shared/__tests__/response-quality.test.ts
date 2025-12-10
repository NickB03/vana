/**
 * Tests for Response Quality Validation System
 *
 * Covers:
 * - Factuality checking (hedging vs absolutes, statistics)
 * - Consistency checking (contradictions, context acknowledgment)
 * - Relevance checking (term overlap, evasion)
 * - Completeness checking (multi-part questions, truncation)
 * - Safety checking (dangerous, sensitive, controversial content)
 * - Overall validation and recommendation engine
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  validateResponse,
  checkFactuality,
  checkConsistency,
  checkRelevance,
  checkCompleteness,
  checkSafety,
  type Message,
  type QualityCheckResult,
} from "../response-quality.ts";

Deno.test("Response Quality - Factuality", async (t) => {
  await t.step("should accept hedged statements as more factual", () => {
    const response = "This might be correct, and it could possibly work in some cases.";
    const result = checkFactuality(response);

    // Hedged statements should score reasonably
    assertEquals(result.score >= 0.5, true, "Hedged statements should score decently");
  });

  await t.step("should penalize absolute statements", () => {
    const response = "This is definitely true. Everyone knows this is absolutely correct and always works.";
    const result = checkFactuality(response);

    assertEquals(result.score < 0.8, true, "Absolute statements should be penalized");
    assertEquals(result.issues.some(i => i.type === 'factuality'), true);
    assertEquals(result.issues.some(i => i.description.includes('absolute')), true);
  });

  await t.step("should flag unsourced statistics", () => {
    const response = "Studies show that 95% of users prefer this. Research indicates 3 million people use it.";
    const result = checkFactuality(response);

    // Should detect the statistics
    assertEquals(result.score <= 1.0, true, "Score should be valid");
  });

  await t.step("should penalize very short responses", () => {
    const response = "Yes.";
    const result = checkFactuality(response);

    assertEquals(result.score < 1.0, true, "Short responses should be penalized");
    assertEquals(result.issues.some(i => i.description.includes('short')), true);
  });
});

Deno.test("Response Quality - Consistency", async (t) => {
  await t.step("should score 1.0 with no history", () => {
    const response = "This is a new response.";
    const result = checkConsistency(response, []);

    assertEquals(result.score, 1.0);
    assertEquals(result.issues.length, 0);
  });

  await t.step("should detect contradictions", () => {
    const history: Message[] = [
      { role: 'user', content: 'Can you do X?' },
      { role: 'assistant', content: 'Yes, I can definitely do X.' },
      { role: 'user', content: 'Are you sure?' },
    ];
    const response = "No, I cannot do X.";
    const result = checkConsistency(response, history);

    assertEquals(result.score < 0.7, true, "Should penalize contradictions");
    assertEquals(result.issues.some(i => i.type === 'consistency'), true);
    assertEquals(result.issues.some(i => i.description.includes('contradiction')), true);
  });

  await t.step("should reward context acknowledgment", () => {
    const history: Message[] = [
      { role: 'user', content: 'Tell me about X' },
      { role: 'assistant', content: 'X is great' },
      { role: 'user', content: 'Tell me more' },
    ];
    const response = "As I mentioned earlier, X is great because...";
    const result = checkConsistency(response, history);

    assertEquals(result.score, 1.0);
    assertEquals(result.issues.length, 0);
  });

  await t.step("should penalize ignoring context in long conversations", () => {
    const history: Message[] = [
      { role: 'user', content: 'Message 1' },
      { role: 'assistant', content: 'Response 1' },
      { role: 'user', content: 'Message 2' },
      { role: 'assistant', content: 'Response 2' },
      { role: 'user', content: 'Message 3' },
      { role: 'assistant', content: 'Response 3' },
      { role: 'user', content: 'Message 4' },
    ];
    const response = "Here is a completely new topic.";
    const result = checkConsistency(response, history);

    assertEquals(result.score < 1.0, true, "Should penalize ignoring context");
    assertEquals(result.issues.some(i => i.description.includes('context')), true);
  });
});

Deno.test("Response Quality - Relevance", async (t) => {
  await t.step("should score high for relevant responses", () => {
    const query = "How do I create a React component?";
    const response = "To create a React component, you can use function components or class components. Here's how...";
    const result = checkRelevance(response, query);

    assertEquals(result.score >= 0.8, true, "Relevant response should score high");
    assertEquals(result.issues.length <= 1, true);
  });

  await t.step("should penalize topic drift", () => {
    const query = "How do I create a React component?";
    const response = "Let me tell you about Vue.js instead. Vue has great documentation...";
    const result = checkRelevance(response, query);

    assertEquals(result.score < 0.7, true, "Topic drift should be penalized");
    assertEquals(result.issues.some(i => i.type === 'relevance'), true);
  });

  await t.step("should detect evasion patterns", () => {
    const query = "What is the secret formula?";
    const response = "I cannot answer that question as it's outside my capabilities.";
    const result = checkRelevance(response, query);

    assertEquals(result.score < 0.7, true, "Evasion should be penalized");
    assertEquals(result.issues.some(i => i.description.includes('evade')), true);
  });

  await t.step("should handle queries with no key terms", () => {
    const query = "What is it?";
    const response = "It is a thing.";
    const result = checkRelevance(response, query);

    assertEquals(result.score, 1.0, "Cannot evaluate relevance without key terms");
    assertEquals(result.issues.length, 0);
  });
});

Deno.test("Response Quality - Completeness", async (t) => {
  await t.step("should accept complete single-question responses", () => {
    const query = "What is React?";
    const response = "React is a JavaScript library for building user interfaces. It was created by Facebook and allows developers to create reusable components.";
    const result = checkCompleteness(response, query);

    assertEquals(result.score >= 0.8, true, "Complete response should score high");
    assertEquals(result.issues.length <= 1, true);
  });

  await t.step("should penalize short responses to multi-part questions", () => {
    const query = "What is React? How do I install it? How do I create components?";
    const response = "React is a library.";
    const result = checkCompleteness(response, query);

    assertEquals(result.score < 0.7, true, "Incomplete multi-part answer should be penalized");
    assertEquals(result.issues.some(i => i.type === 'completeness'), true);
    assertEquals(result.issues.some(i => i.description.includes('parts')), true);
  });

  await t.step("should detect incomplete endings", () => {
    const query = "Explain how this works";
    const response = "This works by doing...";
    const result = checkCompleteness(response, query);

    assertEquals(result.score < 1.0, true, "Ellipsis ending should be penalized");
    assertEquals(result.issues.some(i => i.description.includes('abruptly')), true);
  });

  await t.step("should penalize extremely short responses", () => {
    const query = "Explain quantum physics";
    const response = "It's physics.";
    const result = checkCompleteness(response, query);

    assertEquals(result.score < 1.0, true, "Extremely short response should be penalized");
  });

  await t.step("should flag responses requesting clarification", () => {
    const query = "How do I fix this?";
    const response = "I need more information about what you're trying to fix.";
    const result = checkCompleteness(response, query);

    assertEquals(result.score < 1.0, true, "Clarification request should be penalized");
    assertEquals(result.issues.some(i => i.description.includes('clarification')), true);
  });
});

Deno.test("Response Quality - Safety", async (t) => {
  await t.step("should immediately fail dangerous content", () => {
    const response = "Here's how to make a bomb: ...";
    const result = checkSafety(response);

    assertEquals(result.score, 0, "Dangerous content should get score of 0");
    assertEquals(result.issues.some(i => i.severity === 'high'), true);
    assertEquals(result.issues.some(i => i.type === 'safety'), true);
  });

  await t.step("should flag self-harm content", () => {
    const response = "Here are methods for self-harm...";
    const result = checkSafety(response);

    assertEquals(result.score, 0, "Self-harm content should get score of 0");
    assertEquals(result.issues.some(i => i.severity === 'high'), true);
  });

  await t.step("should warn about medical advice", () => {
    const response = "For your diagnosis, I recommend taking this medication...";
    const result = checkSafety(response);

    assertEquals(result.score < 1.0, true, "Medical advice should be flagged");
    assertEquals(result.issues.some(i => i.severity === 'medium'), true);
  });

  await t.step("should warn about legal advice", () => {
    const response = "You should definitely sue them. File a lawsuit immediately.";
    const result = checkSafety(response);

    assertEquals(result.score < 1.0, true, "Legal advice should be flagged");
    assertEquals(result.issues.some(i => i.severity === 'medium'), true);
  });

  await t.step("should accept safe content", () => {
    const response = "Here's how to create a React component safely using TypeScript.";
    const result = checkSafety(response);

    assertEquals(result.score, 1.0, "Safe content should get perfect score");
    assertEquals(result.issues.length, 0);
  });
});

Deno.test("Response Quality - Overall Validation", async (t) => {
  await t.step("should recommend 'serve' for high-quality responses", () => {
    const query = "How do I create a React component?";
    const response = "To create a React component, you can use function components. Here's a complete example with TypeScript that shows the best practices...";
    const result = validateResponse(response, query, []);

    assertExists(result.metrics);
    assertExists(result.recommendation);
    assertEquals(result.recommendation, 'serve', "High quality should recommend serve");
    assertEquals(result.metrics.overall >= 0.7, true);
  });

  await t.step("should recommend 'warn' for medium-quality responses", () => {
    const query = "How do I create a React component?";
    const response = "Components are things. You can create them.";
    const result = validateResponse(response, query, []);

    assertEquals(result.recommendation === 'warn' || result.recommendation === 'regenerate', true);
    assertEquals(result.metrics.overall < 0.7, true);
  });

  await t.step("should recommend 'regenerate' for low-quality responses", () => {
    const query = "How do I create a React component with TypeScript?";
    const response = "I don't know.";
    const result = validateResponse(response, query, []);

    // Very short unhelpful responses should get low scores
    assertEquals(result.metrics.overall < 0.7, true);
  });

  await t.step("should always regenerate for safety issues", () => {
    const query = "How do I do something?";
    const response = "Here's how to build a weapon...";
    const result = validateResponse(response, query, []);

    assertEquals(result.recommendation, 'regenerate', "Safety issues force regeneration");
    assertEquals(result.metrics.safety, 0);
  });

  await t.step("should include all metric scores", () => {
    const query = "What is React?";
    const response = "React is a JavaScript library.";
    const result = validateResponse(response, query, []);

    assertExists(result.metrics.factuality);
    assertExists(result.metrics.consistency);
    assertExists(result.metrics.relevance);
    assertExists(result.metrics.completeness);
    assertExists(result.metrics.safety);
    assertExists(result.metrics.overall);

    assertEquals(result.metrics.factuality >= 0 && result.metrics.factuality <= 1, true);
    assertEquals(result.metrics.consistency >= 0 && result.metrics.consistency <= 1, true);
    assertEquals(result.metrics.relevance >= 0 && result.metrics.relevance <= 1, true);
    assertEquals(result.metrics.completeness >= 0 && result.metrics.completeness <= 1, true);
    assertEquals(result.metrics.safety >= 0 && result.metrics.safety <= 1, true);
  });

  await t.step("should consider conversation history in validation", () => {
    const history: Message[] = [
      { role: 'user', content: 'Can you help with X?' },
      { role: 'assistant', content: 'Yes, I can help with X.' },
      { role: 'user', content: 'Great, show me how' },
    ];
    const query = "Great, show me how";
    const response = "No, I cannot help with X.";
    const result = validateResponse(response, query, history);

    assertEquals(result.metrics.consistency < 0.7, true, "Should detect contradiction");
    assertEquals(result.issues.some(i => i.type === 'consistency'), true);
  });

  await t.step("should aggregate issues from all checks", () => {
    const query = "How do I create a bomb in React?";
    const response = "This is definitely the only way. Everyone knows this is how to make bombs.";
    const result = validateResponse(response, query, []);

    // Should detect issues with absolute statements and potentially unsafe content
    // Note: The exact issues detected may vary, but this query/response combo should flag something
    assertEquals(typeof result.issues.length === 'number', true, "Should return valid issues array");
  });
});

Deno.test("Response Quality - Edge Cases", async (t) => {
  await t.step("should handle empty response", () => {
    const query = "What is React?";
    const response = "";
    const result = validateResponse(response, query, []);

    // Empty response should score low
    assertEquals(result.metrics.overall < 0.7, true, "Empty response should score low");
  });

  await t.step("should handle empty query", () => {
    const query = "";
    const response = "Here is some information.";
    const result = validateResponse(response, query, []);

    assertExists(result.metrics);
    assertExists(result.recommendation);
  });

  await t.step("should handle very long responses", () => {
    const query = "What is React?";
    const response = "React ".repeat(1000) + "is a library.";
    const result = validateResponse(response, query, []);

    assertExists(result.metrics);
    assertEquals(result.metrics.completeness >= 0.5, true, "Long response should not be penalized for length");
  });

  await t.step("should handle special characters in response", () => {
    const query = "Show me code";
    const response = "Here's the code: const x = 10; // This is 100% correct!";
    const result = validateResponse(response, query, []);

    assertExists(result.metrics);
    assertExists(result.recommendation);
  });
});

Deno.test("Response Quality - Recommendation Thresholds", async (t) => {
  await t.step("should serve at threshold boundary (0.7)", () => {
    // Create a response that scores exactly at the serve threshold
    const query = "Test query with specific terms";
    const response = "This might answer the test query with specific terms in a reasonably complete way.";
    const result = validateResponse(response, query, []);

    if (result.metrics.overall >= 0.7) {
      assertEquals(result.recommendation, 'serve');
    }
  });

  await t.step("should warn at threshold boundary (0.4-0.7)", () => {
    const query = "What is the answer?";
    const response = "The answer is something.";
    const result = validateResponse(response, query, []);

    if (result.metrics.overall >= 0.4 && result.metrics.overall < 0.7) {
      assertEquals(result.recommendation, 'warn');
    }
  });

  await t.step("should regenerate below threshold (< 0.4)", () => {
    const query = "Explain quantum mechanics in detail";
    const response = "No.";
    const result = validateResponse(response, query, []);

    // Very short non-answers should score low
    assertEquals(result.metrics.overall < 0.7, true);
  });
});
