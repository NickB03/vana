/**
 * Tests for Complexity Analyzer
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { analyzeComplexity, type ComplexityLevel } from "../complexity-analyzer.ts";

Deno.test("Complexity Analyzer - Simple queries", async (t) => {
  await t.step("detects greetings as simple", () => {
    const result = analyzeComplexity("Hello!");
    assertEquals(result.level, "simple");
    assertEquals(result.factors.hasCodeRequest, false);
    assertEquals(result.factors.needsReasoning, false);
  });

  await t.step("detects simple factual questions", () => {
    const result = analyzeComplexity("What is the capital of France?");
    assertEquals(result.level, "simple");
    assertEquals(result.factors.hasCodeRequest, false);
  });

  await t.step("detects yes/no questions as simple", () => {
    const result = analyzeComplexity("Is Python a programming language?");
    assertEquals(result.level, "simple");
  });

  await t.step("estimates low output tokens for simple queries", () => {
    const result = analyzeComplexity("Hi there");
    assertEquals(result.estimatedOutputTokens < 300, true);
  });
});

Deno.test("Complexity Analyzer - Code detection", async (t) => {
  await t.step("detects React component requests", () => {
    const result = analyzeComplexity("Create a React button component");
    assertEquals(result.factors.hasCodeRequest, true);
    assertEquals(result.level !== "simple", true);
  });

  await t.step("detects build app requests", () => {
    const result = analyzeComplexity("Build a todo app in JavaScript");
    assertEquals(result.factors.hasCodeRequest, true);
  });

  await t.step("detects debugging requests", () => {
    const result = analyzeComplexity("Fix this TypeScript error in my code");
    assertEquals(result.factors.hasCodeRequest, true);
  });

  await t.step("detects code blocks in query", () => {
    const result = analyzeComplexity("Here's my code:\n```python\nprint('hi')\n```\nWhat's wrong?");
    assertEquals(result.factors.hasCodeRequest, true);
  });

  await t.step("estimates high output tokens for code requests", () => {
    const result = analyzeComplexity("Write a function to sort an array");
    assertEquals(result.estimatedOutputTokens > 500, true);
  });
});

Deno.test("Complexity Analyzer - Reasoning detection", async (t) => {
  await t.step("detects explanation requests", () => {
    const result = analyzeComplexity("Explain how HTTP works");
    assertEquals(result.factors.needsReasoning, true);
  });

  await t.step("detects comparison requests", () => {
    const result = analyzeComplexity("Compare REST and GraphQL");
    assertEquals(result.factors.needsReasoning, true);
  });

  await t.step("detects step-by-step requests", () => {
    const result = analyzeComplexity("Walk me through how to deploy a Docker container");
    assertEquals(result.factors.needsReasoning, true);
  });

  await t.step("detects pros/cons questions", () => {
    const result = analyzeComplexity("What are the pros and cons of microservices?");
    assertEquals(result.factors.needsReasoning, true);
  });

  await t.step("increases output tokens for reasoning", () => {
    const withReasoning = analyzeComplexity("Explain quantum computing step by step");
    const withoutReasoning = analyzeComplexity("What is quantum computing?");
    assertEquals(withReasoning.estimatedOutputTokens > withoutReasoning.estimatedOutputTokens, true);
  });
});

Deno.test("Complexity Analyzer - Creative detection", async (t) => {
  await t.step("detects story writing requests", () => {
    const result = analyzeComplexity("Write a short story about a robot");
    assertEquals(result.factors.isCreative, true);
  });

  await t.step("detects brainstorming requests", () => {
    const result = analyzeComplexity("Brainstorm ideas for a startup");
    assertEquals(result.factors.isCreative, true);
  });

  await t.step("estimates high output for creative tasks", () => {
    const result = analyzeComplexity("Create a poem about technology");
    assertEquals(result.estimatedOutputTokens > 400, true);
  });
});

Deno.test("Complexity Analyzer - Domain-specific detection", async (t) => {
  await t.step("detects algorithm questions", () => {
    const result = analyzeComplexity("What's the time complexity of quicksort?");
    assertEquals(result.factors.domainSpecific, true);
  });

  await t.step("detects database questions", () => {
    const result = analyzeComplexity("How do I optimize this SQL query?");
    assertEquals(result.factors.domainSpecific, true);
  });

  await t.step("detects architecture questions", () => {
    const result = analyzeComplexity("Design a scalable microservices architecture");
    assertEquals(result.factors.domainSpecific, true);
  });

  await t.step("detects API design questions", () => {
    const result = analyzeComplexity("Should I use REST or GraphQL for my API?");
    assertEquals(result.factors.domainSpecific, true);
  });
});

Deno.test("Complexity Analyzer - Complexity levels", async (t) => {
  await t.step("assigns simple level (score 0-25)", () => {
    const result = analyzeComplexity("Thanks!");
    assertEquals(result.level, "simple");
    assertEquals(result.score <= 25, true);
  });

  await t.step("assigns moderate level (score 26-50)", () => {
    const result = analyzeComplexity("Can you explain what REST APIs are?");
    assertEquals(result.level, "moderate");
    assertEquals(result.score > 25 && result.score <= 50, true);
  });

  await t.step("assigns complex level (score 51-75)", () => {
    const result = analyzeComplexity("Explain the trade-offs between SQL and NoSQL databases for a high-traffic web app");
    assertEquals(result.level, "complex");
    assertEquals(result.score > 50 && result.score <= 75, true);
  });

  await t.step("assigns expert level (score 76-100)", () => {
    const result = analyzeComplexity("Build a React dashboard with real-time WebSocket updates and implement proper error handling");
    assertEquals(result.level, "expert");
    assertEquals(result.score > 75, true);
  });
});

Deno.test("Complexity Analyzer - Context awareness", async (t) => {
  await t.step("uses context to improve analysis", () => {
    const withoutContext = analyzeComplexity("Fix it");
    const withContext = analyzeComplexity("Fix it", [
      "I'm building a React app",
      "I'm getting a TypeScript error"
    ]);

    // With context, should detect code request
    assertEquals(withContext.factors.hasCodeRequest, true);
    assertEquals(withContext.score > withoutContext.score, true);
  });

  await t.step("handles missing context gracefully", () => {
    const result = analyzeComplexity("What is this?");
    assertExists(result);
    assertEquals(result.level, "simple");
  });
});

Deno.test("Complexity Analyzer - Token estimation", async (t) => {
  await t.step("estimates query length in tokens", () => {
    const shortQuery = analyzeComplexity("Hi");
    const longQuery = analyzeComplexity("This is a much longer query that should have significantly more tokens than the short one");

    assertEquals(shortQuery.factors.queryLength < 5, true);
    assertEquals(longQuery.factors.queryLength > 15, true);
  });

  await t.step("scales output tokens with input length", () => {
    const shortQuery = analyzeComplexity("What is HTTP?");
    const longQuery = analyzeComplexity(
      "Can you provide a comprehensive explanation of HTTP including its history, how it works, the request/response cycle, common headers, status codes, and best practices?"
    );

    assertEquals(longQuery.estimatedOutputTokens > shortQuery.estimatedOutputTokens, true);
  });
});

Deno.test("Complexity Analyzer - Edge cases", async (t) => {
  await t.step("handles empty string", () => {
    const result = analyzeComplexity("");
    assertExists(result);
    assertEquals(result.level, "simple");
    assertEquals(result.factors.queryLength, 0);
  });

  await t.step("handles very long queries", () => {
    const longQuery = "a ".repeat(1000); // 2000 characters
    const result = analyzeComplexity(longQuery);
    assertExists(result);
    assertEquals(result.factors.queryLength > 400, true);
  });

  await t.step("handles special characters", () => {
    const result = analyzeComplexity("What about émojis 🚀 and spëcial çharacters?");
    assertExists(result);
    assertEquals(result.level, "simple");
  });

  await t.step("handles code-like patterns that aren't code requests", () => {
    const result = analyzeComplexity("The function of mitochondria is energy production");
    // Should not detect as code request just because "function" appears
    assertEquals(result.factors.hasCodeRequest, false);
  });
});

Deno.test("Complexity Analyzer - Real-world examples", async (t) => {
  await t.step("Example: Simple greeting", () => {
    const result = analyzeComplexity("Hello, how are you?");
    assertEquals(result.level, "simple");
    assertEquals(result.score < 30, true);
  });

  await t.step("Example: Moderate explanation", () => {
    const result = analyzeComplexity("What is the difference between let and const in JavaScript?");
    assertEquals(result.level, "moderate");
    assertEquals(result.factors.domainSpecific, true);
  });

  await t.step("Example: Complex architecture question", () => {
    const result = analyzeComplexity(
      "How should I design a microservices architecture for an e-commerce platform with high availability requirements?"
    );
    assertEquals(result.level, "complex");
    assertEquals(result.factors.domainSpecific, true);
    assertEquals(result.factors.needsReasoning, true);
  });

  await t.step("Example: Expert code generation", () => {
    const result = analyzeComplexity(
      "Build a React component with TypeScript that implements a virtualized infinite scroll list with lazy loading and error handling"
    );
    assertEquals(result.level, "expert");
    assertEquals(result.factors.hasCodeRequest, true);
    assertEquals(result.score > 75, true);
  });

  await t.step("Example: Debugging task", () => {
    const result = analyzeComplexity(
      "My API is returning 500 errors. Here's the code: ```js\napp.get('/api/users', async (req, res) => { const data = await db.query('SELECT * FROM users'); res.json(data); })\n```"
    );
    assertEquals(result.factors.hasCodeRequest, true);
    assertEquals(result.level !== "simple", true);
  });
});
