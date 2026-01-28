import { describe, expect, it } from "vitest";
import {
  createBundleProgress,
  BundleProgressSchema,
  BundleCompleteSchema,
  BundleErrorSchema,
  BundleStreamEventSchema,
} from "../bundleProgress";

describe("createBundleProgress", () => {
  describe("progress validation", () => {
    it("rejects negative progress", () => {
      expect(() => createBundleProgress("fetch", "Loading", -1)).toThrow(
        "Progress must be 0-100, got -1"
      );
    });

    it("rejects progress > 100", () => {
      expect(() => createBundleProgress("fetch", "Loading", 101)).toThrow(
        "Progress must be 0-100, got 101"
      );
    });

    it("rejects NaN progress", () => {
      expect(() => createBundleProgress("fetch", "Loading", NaN)).toThrow(
        "Progress must be 0-100, got NaN"
      );
    });

    it("rejects Infinity progress", () => {
      expect(() => createBundleProgress("fetch", "Loading", Infinity)).toThrow(
        "Progress must be 0-100"
      );
    });

    it("accepts 0 progress", () => {
      const result = createBundleProgress("fetch", "Starting", 0);
      expect(result.progress).toBe(0);
    });

    it("accepts 100 progress", () => {
      const result = createBundleProgress("upload", "Complete", 100);
      expect(result.progress).toBe(100);
    });

    it("accepts valid progress in range", () => {
      const result = createBundleProgress("bundle", "Processing", 50);
      expect(result.progress).toBe(50);
    });
  });

  describe("message validation", () => {
    it("rejects empty message", () => {
      expect(() => createBundleProgress("fetch", "", 50)).toThrow(
        "Progress message cannot be empty"
      );
    });

    it("rejects whitespace-only message", () => {
      expect(() => createBundleProgress("fetch", "   ", 50)).toThrow(
        "Progress message cannot be empty"
      );
    });

    it("accepts valid message", () => {
      const result = createBundleProgress("fetch", "Fetching packages", 40);
      expect(result.message).toBe("Fetching packages");
    });

    it("trims message but still validates", () => {
      const result = createBundleProgress("fetch", "  Valid message  ", 40);
      // Message should not be trimmed in output, just validated
      expect(result.message).toBe("  Valid message  ");
    });
  });

  describe("return value", () => {
    it("returns frozen object with correct properties", () => {
      const result = createBundleProgress("fetch", "Loading", 50);

      expect(result).toEqual({
        stage: "fetch",
        message: "Loading",
        progress: 50,
      });

      // Verify object is frozen
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("creates immutable object", () => {
      const result = createBundleProgress("bundle", "Processing", 75);

      // Frozen objects throw TypeError when attempting modification
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        result.progress = 99;
      }).toThrow(TypeError);

      // Value should remain unchanged
      expect(result.progress).toBe(75);
    });
  });

  describe("all stages", () => {
    it("accepts all valid bundle stages", () => {
      const stages: Array<Parameters<typeof createBundleProgress>[0]> = [
        "validate",
        "cache-check",
        "fetch",
        "bundle",
        "upload",
      ];

      stages.forEach((stage) => {
        expect(() => createBundleProgress(stage, "Test", 50)).not.toThrow();
      });
    });
  });
});

describe("BundleProgressSchema", () => {
  describe("valid progress events", () => {
    it("validates valid progress with all fields", () => {
      const valid = {
        stage: "fetch" as const,
        message: "Loading packages",
        progress: 50,
      };

      const result = BundleProgressSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it("validates all valid stages", () => {
      const stages = ["validate", "cache-check", "fetch", "bundle", "upload"] as const;

      stages.forEach((stage) => {
        const valid = { stage, message: "Test", progress: 50 };
        const result = BundleProgressSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it("validates progress at boundaries (0 and 100)", () => {
      const zero = { stage: "validate" as const, message: "Starting", progress: 0 };
      const hundred = { stage: "upload" as const, message: "Complete", progress: 100 };

      expect(BundleProgressSchema.safeParse(zero).success).toBe(true);
      expect(BundleProgressSchema.safeParse(hundred).success).toBe(true);
    });
  });

  describe("invalid progress events", () => {
    it("rejects invalid stage", () => {
      const invalid = {
        stage: "invalid-stage",
        message: "Test",
        progress: 50,
      };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain("stage");
      }
    });

    it("rejects empty message", () => {
      const invalid = {
        stage: "fetch" as const,
        message: "",
        progress: 50,
      };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("message");
      }
    });

    it("rejects progress < 0", () => {
      const invalid = {
        stage: "fetch" as const,
        message: "Test",
        progress: -1,
      };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects progress > 100", () => {
      const invalid = {
        stage: "fetch" as const,
        message: "Test",
        progress: 101,
      };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer progress", () => {
      const invalid = {
        stage: "fetch" as const,
        message: "Test",
        progress: 50.5,
      };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const invalid = { stage: "fetch" as const };

      const result = BundleProgressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe("BundleCompleteSchema", () => {
  describe("valid complete events", () => {
    it("validates valid complete event with all required fields", () => {
      const valid = {
        success: true as const,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: ["react", "lodash"],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it("validates with optional cacheHit field", () => {
      const valid = {
        success: true as const,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: ["react"],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
        cacheHit: true,
      };

      const result = BundleCompleteSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid complete events", () => {
    it("rejects invalid URL", () => {
      const invalid = {
        success: true as const,
        bundleUrl: "not-a-url",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: ["react"],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects negative bundleSize", () => {
      const invalid = {
        success: true as const,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: -1,
        bundleTime: 500,
        dependencies: ["react"],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects empty dependencies array", () => {
      const invalid = {
        success: true as const,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: [],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid datetime format", () => {
      const invalid = {
        success: true as const,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: ["react"],
        expiresAt: "not-a-datetime",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects success: false (should use BundleError)", () => {
      const invalid = {
        success: false,
        bundleUrl: "https://example.com/bundle.js",
        bundleSize: 1024,
        bundleTime: 500,
        dependencies: ["react"],
        expiresAt: "2025-01-11T12:00:00Z",
        requestId: "req-123",
      };

      const result = BundleCompleteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe("BundleErrorSchema", () => {
  describe("valid error events", () => {
    it("validates valid error with required fields only", () => {
      const valid = {
        success: false as const,
        error: "Bundle failed",
      };

      const result = BundleErrorSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it("validates with optional details and requestId", () => {
      const valid = {
        success: false as const,
        error: "Bundle failed",
        details: "Network timeout",
        requestId: "req-456",
      };

      const result = BundleErrorSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid error events", () => {
    it("rejects empty error message", () => {
      const invalid = {
        success: false as const,
        error: "",
      };

      const result = BundleErrorSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects success: true (should use BundleComplete)", () => {
      const invalid = {
        success: true,
        error: "This doesn't make sense",
      };

      const result = BundleErrorSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects missing error field", () => {
      const invalid = {
        success: false as const,
      };

      const result = BundleErrorSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe("BundleStreamEventSchema", () => {
  describe("valid stream events", () => {
    it("validates progress event", () => {
      const valid = {
        type: "progress" as const,
        data: {
          stage: "fetch" as const,
          message: "Loading",
          progress: 50,
        },
      };

      const result = BundleStreamEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates complete event", () => {
      const valid = {
        type: "complete" as const,
        data: {
          success: true as const,
          bundleUrl: "https://example.com/bundle.js",
          bundleSize: 1024,
          bundleTime: 500,
          dependencies: ["react"],
          expiresAt: "2025-01-11T12:00:00Z",
          requestId: "req-123",
        },
      };

      const result = BundleStreamEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates error event", () => {
      const valid = {
        type: "error" as const,
        data: {
          success: false as const,
          error: "Failed",
        },
      };

      const result = BundleStreamEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid stream events", () => {
    it("rejects type mismatch (progress type with complete data)", () => {
      const invalid = {
        type: "progress" as const,
        data: {
          success: true as const,
          bundleUrl: "https://example.com/bundle.js",
          bundleSize: 1024,
          bundleTime: 500,
          dependencies: ["react"],
          expiresAt: "2025-01-11T12:00:00Z",
          requestId: "req-123",
        },
      };

      const result = BundleStreamEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects unknown event type", () => {
      const invalid = {
        type: "unknown" as const,
        data: { stage: "fetch" as const, message: "Test", progress: 50 },
      };

      const result = BundleStreamEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects missing type field", () => {
      const invalid = {
        data: { stage: "fetch" as const, message: "Test", progress: 50 },
      };

      const result = BundleStreamEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
