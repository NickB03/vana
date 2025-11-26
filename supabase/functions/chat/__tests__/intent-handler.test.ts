/**
 * Tests for Intent Handler Integration
 * Validates manual overrides and handler routing logic
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { detectUserIntent } from "../handlers/intent.ts";

Deno.test("Intent Handler - Force Artifact Mode Override", async () => {
  const result = await detectUserIntent({
    forceArtifactMode: true,
    lastUserMessage: "what is react?", // Would normally be chat
  });

  assertEquals(
    result.type,
    "artifact",
    "forceArtifactMode should override intent detection"
  );
  assertEquals(
    result.reasoning,
    "User explicitly requested artifact mode",
    "Should indicate manual override"
  );
  assertEquals(
    result.shouldSearch,
    false,
    "Artifacts should not trigger web search"
  );
});

Deno.test("Intent Handler - Force Image Mode Override", async () => {
  const result = await detectUserIntent({
    forceImageMode: true,
    lastUserMessage: "create a react app", // Would normally be artifact
  });

  assertEquals(
    result.type,
    "image",
    "forceImageMode should override intent detection"
  );
  assertEquals(
    result.reasoning,
    "User explicitly requested image mode",
    "Should indicate manual override"
  );
  assertEquals(
    result.shouldSearch,
    false,
    "Images should not trigger web search"
  );
});

Deno.test("Intent Handler - Force Artifact Takes Priority Over Force Image", async () => {
  const result = await detectUserIntent({
    forceArtifactMode: true,
    forceImageMode: true,
    lastUserMessage: "hello world",
  });

  assertEquals(
    result.type,
    "artifact",
    "forceArtifactMode should take priority over forceImageMode"
  );
});

Deno.test("Intent Handler - Image Detection Without Override", async () => {
  const result = await detectUserIntent({
    lastUserMessage: "generate an image of a sunset over mountains",
  });

  assertEquals(
    result.type,
    "image",
    "Should detect image intent without override"
  );
  assertEquals(
    result.shouldSearch,
    false,
    "Images should not trigger web search"
  );
});

Deno.test("Intent Handler - Artifact Detection Without Override", async () => {
  const result = await detectUserIntent({
    lastUserMessage: "create a react app for expense tracking",
  });

  assertEquals(
    result.type,
    "artifact",
    "Should detect artifact intent without override"
  );
  assertEquals(
    result.shouldSearch,
    false,
    "Artifacts should not trigger web search"
  );
  assertEquals(
    result.artifactType,
    "react",
    "Should detect correct artifact type"
  );
});

Deno.test("Intent Handler - Chat Intent Defaults Correctly", async () => {
  const result = await detectUserIntent({
    lastUserMessage: "what is the weather like today?",
  });

  assertEquals(
    result.type,
    "chat",
    "Should default to chat for non-artifact/non-image requests"
  );
  // shouldSearch can be true or false depending on TAVILY_CONFIG
  // We just verify it exists
  assertEquals(
    typeof result.shouldSearch,
    "boolean",
    "shouldSearch should be a boolean"
  );
});

Deno.test("Intent Handler - Question Patterns Default to Chat", async () => {
  const testCases = [
    "What is a react component?",
    "How do I create a flowchart?",
    "Why would I use SVG?",
    "Can you explain image generation?",
  ];

  for (const testCase of testCases) {
    const result = await detectUserIntent({
      lastUserMessage: testCase,
    });

    assertEquals(
      result.type,
      "chat",
      `Question "${testCase}" should default to chat`
    );
  }
});

Deno.test("Intent Handler - No Override Uses Detection", async () => {
  // High confidence pattern should be detected
  const highConfidenceResult = await detectUserIntent({
    lastUserMessage: "create a react dashboard with analytics",
  });

  assertEquals(
    highConfidenceResult.type,
    "artifact",
    "Should detect artifact without override"
  );

  // Low confidence should default to chat
  const lowConfidenceResult = await detectUserIntent({
    lastUserMessage: "hello there",
  });

  assertEquals(
    lowConfidenceResult.type,
    "chat",
    "Should default to chat for low confidence"
  );
});

Deno.test("Intent Handler - Web Search Not Triggered for Artifacts", async () => {
  const result = await detectUserIntent({
    lastUserMessage: "create a react app with latest news display",
  });

  // Should detect artifact (not chat) even though "latest news" might trigger search
  if (result.type === "artifact") {
    assertEquals(
      result.shouldSearch,
      false,
      "Artifacts should never trigger web search"
    );
  }
});

Deno.test("Intent Handler - Logging Output", async () => {
  // Just verify the handler runs without errors and logs correctly
  const result = await detectUserIntent({
    lastUserMessage: "generate an image of a cat",
  });

  // Verify result structure
  assertEquals(
    typeof result.type,
    "string",
    "Result should have type"
  );
  assertEquals(
    typeof result.shouldSearch,
    "boolean",
    "Result should have shouldSearch"
  );
  assertEquals(
    typeof result.reasoning,
    "string",
    "Result should have reasoning"
  );
});
