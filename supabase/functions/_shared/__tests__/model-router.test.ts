/**
 * Tests for Model Router
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  selectModel,
  estimateCost,
  getCostSavings,
  isValidModel,
} from "../model-router.ts";
import { MODELS } from "../config.ts";
import { analyzeComplexity } from "../complexity-analyzer.ts";

Deno.test("Model Router - Cost estimation", async (t) => {
  await t.step("calculates cost for Gemini Flash", () => {
    const cost = estimateCost(100, 500, MODELS.GEMINI_FLASH);
    // (100 * 0.075 + 500 * 0.30) / 1M = 0.0001575
    assertEquals(Math.abs(cost - 0.0001575) < 0.0000001, true);
  });

  await t.step("calculates cost for GLM-4.6", () => {
    const cost = estimateCost(100, 500, MODELS.GLM_4_6);
    // (100 * 0.15 + 500 * 0.60) / 1M = 0.000315
    assertEquals(Math.abs(cost - 0.000315) < 0.0000001, true);
  });

  await t.step("GLM-4.6 is more expensive than Gemini Flash", () => {
    const glmCost = estimateCost(1000, 2000, MODELS.GLM_4_6);
    const geminiCost = estimateCost(1000, 2000, MODELS.GEMINI_FLASH);
    assertEquals(glmCost > geminiCost, true);
  });

  await t.step("handles unknown model gracefully", () => {
    const cost = estimateCost(100, 500, "unknown-model");
    assertExists(cost);
    assertEquals(cost > 0, true);
  });

  await t.step("scales with token count", () => {
    const smallCost = estimateCost(100, 200, MODELS.GEMINI_FLASH);
    const largeCost = estimateCost(1000, 2000, MODELS.GEMINI_FLASH);
    assertEquals(largeCost > smallCost * 5, true); // Roughly 10x tokens = 10x cost
  });
});

Deno.test("Model Router - Chat routing", async (t) => {
  await t.step("routes simple chat to Gemini Flash", () => {
    const complexity = analyzeComplexity("Hello!");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    assertExists(selection.reason);
    assertEquals(selection.estimatedCost > 0, true);
  });

  await t.step("routes moderate chat to Gemini Flash", () => {
    const complexity = analyzeComplexity("Explain how React hooks work");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    assertEquals(selection.reason.toLowerCase().includes("moderate"), true);
  });

  await t.step("routes complex chat to Gemini Flash", () => {
    const complexity = analyzeComplexity(
      "Explain the differences between microservices and monolithic architectures with pros and cons"
    );
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    assertEquals(selection.reason.includes("complex") || selection.reason.includes("Complex"), true);
  });

  await t.step("routes expert chat to Gemini Flash", () => {
    const complexity = analyzeComplexity(
      "Analyze the trade-offs between event-driven architecture and request-response patterns in distributed systems"
    );
    // Even expert-level should use Gemini Flash for chat (cost optimization)
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
  });
});

Deno.test("Model Router - Artifact routing", async (t) => {
  await t.step("always routes artifacts to GLM-4.6", () => {
    const simpleComplexity = analyzeComplexity("Build a button");
    const selection = selectModel(simpleComplexity, "artifact");

    assertEquals(selection.model, MODELS.GLM_4_6);
    assertEquals(selection.reason.includes("reasoning"), true);
  });

  await t.step("provides fallback for artifacts", () => {
    const complexity = analyzeComplexity("Create a React component");
    const selection = selectModel(complexity, "artifact");

    assertEquals(selection.fallback, MODELS.GEMINI_FLASH);
  });

  await t.step("estimates higher cost for artifacts", () => {
    const chatComplexity = analyzeComplexity("Tell me about React");
    const artifactComplexity = analyzeComplexity("Build a React app");

    const chatSelection = selectModel(chatComplexity, "chat");
    const artifactSelection = selectModel(artifactComplexity, "artifact");

    // Artifact should be more expensive (GLM-4.6 vs Gemini Flash)
    assertEquals(artifactSelection.estimatedCost > chatSelection.estimatedCost, true);
  });
});

Deno.test("Model Router - Image routing", async (t) => {
  await t.step("always routes images to Gemini Flash Image", () => {
    const complexity = analyzeComplexity("Generate an image");
    const selection = selectModel(complexity, "image");

    assertEquals(selection.model, MODELS.GEMINI_FLASH_IMAGE);
    assertEquals(selection.reason.includes("image"), true);
  });

  await t.step("uses specialized model regardless of complexity", () => {
    const simpleComplexity = analyzeComplexity("Simple image");
    const complexComplexity = analyzeComplexity("Complex detailed photorealistic image");

    const simpleSelection = selectModel(simpleComplexity, "image");
    const complexSelection = selectModel(complexComplexity, "image");

    assertEquals(simpleSelection.model, MODELS.GEMINI_FLASH_IMAGE);
    assertEquals(complexSelection.model, MODELS.GEMINI_FLASH_IMAGE);
  });
});

Deno.test("Model Router - Cost savings", async (t) => {
  await t.step("calculates savings when using Gemini Flash", () => {
    const savings = getCostSavings(MODELS.GEMINI_FLASH, 1000, 2000);

    assertEquals(savings.saved > 0, true);
    assertEquals(savings.percentSaved > 0, true);
    assertEquals(savings.percentSaved < 100, true);
  });

  await t.step("no savings when using GLM-4.6", () => {
    const savings = getCostSavings(MODELS.GLM_4_6, 1000, 2000);

    assertEquals(savings.saved, 0);
    assertEquals(savings.percentSaved, 0);
  });

  await t.step("savings increase with token count", () => {
    const smallSavings = getCostSavings(MODELS.GEMINI_FLASH, 100, 200);
    const largeSavings = getCostSavings(MODELS.GEMINI_FLASH, 1000, 2000);

    assertEquals(largeSavings.saved > smallSavings.saved, true);
  });

  await t.step("percentage savings remain consistent", () => {
    const smallSavings = getCostSavings(MODELS.GEMINI_FLASH, 100, 200);
    const largeSavings = getCostSavings(MODELS.GEMINI_FLASH, 1000, 2000);

    // Percentage should be approximately the same regardless of scale
    assertEquals(Math.abs(smallSavings.percentSaved - largeSavings.percentSaved) < 1, true);
  });
});

Deno.test("Model Router - Model validation", async (t) => {
  await t.step("validates Gemini Flash", () => {
    assertEquals(isValidModel(MODELS.GEMINI_FLASH), true);
  });

  await t.step("validates Kimi K2", () => {
    assertEquals(isValidModel(MODELS.KIMI_K2), true);
  });

  await t.step("validates Gemini Flash Image", () => {
    assertEquals(isValidModel(MODELS.GEMINI_FLASH_IMAGE), true);
  });

  await t.step("rejects invalid model", () => {
    assertEquals(isValidModel("gpt-4"), false);
  });

  await t.step("rejects empty string", () => {
    assertEquals(isValidModel(""), false);
  });
});

Deno.test("Model Router - Integration scenarios", async (t) => {
  await t.step("Scenario: Simple chat question", () => {
    const complexity = analyzeComplexity("What is TypeScript?");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    assertEquals(complexity.level, "simple");
    // Very cheap for simple queries
    assertEquals(selection.estimatedCost < 0.0001, true);
  });

  await t.step("Scenario: Code explanation request", () => {
    const complexity = analyzeComplexity("Explain how async/await works in JavaScript");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    // More tokens needed for explanation
    assertEquals(selection.estimatedCost > 0.00005, true);
  });

  await t.step("Scenario: Build React component", () => {
    const complexity = analyzeComplexity("Build a React todo list component with TypeScript");
    const selection = selectModel(complexity, "artifact");

    assertEquals(selection.model, MODELS.GLM_4_6);
    assertEquals(complexity.factors.hasCodeRequest, true);
    // Higher cost for artifact generation
    assertEquals(selection.estimatedCost > 0.0002, true);
  });

  await t.step("Scenario: Complex architecture discussion", () => {
    const complexity = analyzeComplexity(
      "How should I architect a scalable real-time chat application with WebSockets and microservices?"
    );
    const selection = selectModel(complexity, "chat");

    // Even complex discussions use Gemini Flash for cost optimization
    assertEquals(selection.model, MODELS.GEMINI_FLASH);
    assertEquals(complexity.level, "complex");
  });

  await t.step("Scenario: Image generation", () => {
    const complexity = analyzeComplexity("Generate a sunset landscape");
    const selection = selectModel(complexity, "image");

    assertEquals(selection.model, MODELS.GEMINI_FLASH_IMAGE);
    assertExists(selection.estimatedCost);
  });

  await t.step("Scenario: Debugging with context", () => {
    const complexity = analyzeComplexity(
      "Fix this bug",
      ["I have a React component", "Getting undefined error"]
    );
    const selection = selectModel(complexity, "chat");

    // Context should help detect code-related query
    assertEquals(complexity.factors.hasCodeRequest, true);
    // But still chat, so uses Gemini Flash
    assertEquals(selection.model, MODELS.GEMINI_FLASH);
  });
});

Deno.test("Model Router - Cost optimization verification", async (t) => {
  await t.step("Gemini Flash is 50% cheaper for input", () => {
    const geminiCost = estimateCost(1_000_000, 0, MODELS.GEMINI_FLASH);
    const glmCost = estimateCost(1_000_000, 0, MODELS.GLM_4_6);

    assertEquals(geminiCost, 0.075); // $0.075 per 1M tokens
    assertEquals(glmCost, 0.15);    // $0.15 per 1M tokens
    assertEquals(glmCost, geminiCost * 2);
  });

  await t.step("Gemini Flash is 50% cheaper for output", () => {
    const geminiCost = estimateCost(0, 1_000_000, MODELS.GEMINI_FLASH);
    const glmCost = estimateCost(0, 1_000_000, MODELS.GLM_4_6);

    assertEquals(geminiCost, 0.30); // $0.30 per 1M tokens
    assertEquals(glmCost, 0.60);   // $0.60 per 1M tokens
    assertEquals(glmCost, geminiCost * 2);
  });

  await t.step("Using Gemini Flash saves 50% on typical chat", () => {
    const savings = getCostSavings(MODELS.GEMINI_FLASH, 100, 500);

    // Should save exactly 50% since pricing is 2x
    assertEquals(Math.abs(savings.percentSaved - 50) < 0.1, true);
  });
});

Deno.test("Model Router - Selection reasoning", async (t) => {
  await t.step("provides clear reason for simple queries", () => {
    const complexity = analyzeComplexity("Hi");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.reason.length > 20, true);
    assertEquals(selection.reason.includes("simple") || selection.reason.includes("Simple"), true);
  });

  await t.step("includes complexity score in reason", () => {
    const complexity = analyzeComplexity("Explain machine learning");
    const selection = selectModel(complexity, "chat");

    assertEquals(selection.reason.includes("score"), true);
  });

  await t.step("explains artifact model choice", () => {
    const complexity = analyzeComplexity("Build an app");
    const selection = selectModel(complexity, "artifact");

    assertEquals(selection.reason.includes("reasoning"), true);
  });

  await t.step("explains image model choice", () => {
    const complexity = analyzeComplexity("Generate image");
    const selection = selectModel(complexity, "image");

    assertEquals(selection.reason.includes("specialized") || selection.reason.includes("image"), true);
  });
});
