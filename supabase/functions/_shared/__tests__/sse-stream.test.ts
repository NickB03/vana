import { assertEquals, assertExists } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import {
  createBundleProgressStream,
  createStageProgress,
  STAGE_PROGRESS,
  STAGE_MESSAGES,
  type BundleStage,
} from "../sse-stream.ts";

describe("sse-stream", () => {
  describe("createStageProgress", () => {
    it("creates valid progress for all stages", () => {
      const stages: BundleStage[] = ["validate", "cache-check", "fetch", "bundle", "upload"];

      stages.forEach((stage) => {
        const progress = createStageProgress(stage);

        assertEquals(progress.stage, stage);
        assertEquals(progress.message, STAGE_MESSAGES[stage]);
        assertEquals(progress.progress, STAGE_PROGRESS[stage]);

        // Verify progress is in valid range
        assertEquals(progress.progress >= 0, true);
        assertEquals(progress.progress <= 100, true);
      });
    });

    it("uses custom message when provided", () => {
      const progress = createStageProgress("fetch", "Custom fetching message");

      assertEquals(progress.stage, "fetch");
      assertEquals(progress.message, "Custom fetching message");
      assertEquals(progress.progress, STAGE_PROGRESS.fetch);
    });

    it("validates progress is in range 0-100", () => {
      // All STAGE_PROGRESS values should be valid
      Object.entries(STAGE_PROGRESS).forEach(([stage, value]) => {
        assertEquals(value >= 0, true, `${stage} progress ${value} should be >= 0`);
        assertEquals(value <= 100, true, `${stage} progress ${value} should be <= 100`);
      });
    });

    it("validates message is non-empty", () => {
      // All STAGE_MESSAGES should be non-empty
      Object.entries(STAGE_MESSAGES).forEach(([stage, message]) => {
        assertEquals(message.trim().length > 0, true, `${stage} message should not be empty`);
      });
    });

    it("returns frozen object", () => {
      const progress = createStageProgress("bundle");
      assertEquals(Object.isFrozen(progress), true);
    });
  });

  describe("createBundleProgressStream", () => {
    it("creates stream with controller methods", () => {
      const { stream, sendProgress, sendComplete, sendError, close } = createBundleProgressStream();

      assertExists(stream);
      assertEquals(typeof sendProgress, "function");
      assertEquals(typeof sendComplete, "function");
      assertEquals(typeof sendError, "function");
      assertEquals(typeof close, "function");
    });

    it("sends progress events", async () => {
      const { stream, sendProgress, close } = createBundleProgressStream();
      const reader = stream.getReader();

      sendProgress(createStageProgress("validate"));
      close();

      const { value, done } = await reader.read();
      assertEquals(done, false);
      assertExists(value);

      const text = new TextDecoder().decode(value);
      assertEquals(text.includes("event: progress"), true);
      assertEquals(text.includes('"stage":"validate"'), true);
    });

    it("sends complete events and closes stream", async () => {
      const { stream, sendComplete } = createBundleProgressStream();
      const reader = stream.getReader();

      sendComplete({
        success: true,
        bundleUrl: "https://example.com/bundle.html",
        bundleSize: 1000,
        bundleTime: 100,
        dependencies: ["react"],
        expiresAt: "2025-01-01T00:00:00Z",
        requestId: "test-123",
      });

      const { value } = await reader.read();
      assertExists(value);

      const text = new TextDecoder().decode(value);
      assertEquals(text.includes("event: complete"), true);
      assertEquals(text.includes('"success":true'), true);
    });

    it("sends error events and closes stream", async () => {
      const { stream, sendError } = createBundleProgressStream();
      const reader = stream.getReader();

      sendError({
        success: false,
        error: "Test error",
        details: "Error details",
      });

      const { value } = await reader.read();
      assertExists(value);

      const text = new TextDecoder().decode(value);
      assertEquals(text.includes("event: error"), true);
      assertEquals(text.includes('"error":"Test error"'), true);
    });
  });

  describe("STAGE_PROGRESS constants", () => {
    it("all progress values are valid (0-100)", () => {
      Object.entries(STAGE_PROGRESS).forEach(([stage, progress]) => {
        assertEquals(
          Number.isFinite(progress),
          true,
          `${stage} progress must be finite`
        );
        assertEquals(
          progress >= 0 && progress <= 100,
          true,
          `${stage} progress ${progress} must be 0-100`
        );
      });
    });

    it("progress values increase monotonically", () => {
      const stages: BundleStage[] = ["validate", "cache-check", "fetch", "bundle", "upload"];
      const progressValues = stages.map((s) => STAGE_PROGRESS[s]);

      for (let i = 1; i < progressValues.length; i++) {
        assertEquals(
          progressValues[i] > progressValues[i - 1],
          true,
          `Stage ${stages[i]} (${progressValues[i]}) should be > ${stages[i-1]} (${progressValues[i-1]})`
        );
      }
    });
  });
});
