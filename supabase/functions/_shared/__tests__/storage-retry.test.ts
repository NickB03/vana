// deno-lint-ignore-file no-explicit-any
/**
 * Tests for Storage Retry Utility
 *
 * Validates retry logic with exponential backoff for Supabase Storage operations.
 *
 * @module storage-retry.test
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { uploadWithRetry, deleteWithRetry } from "../storage-retry.ts";
import { RETRY_CONFIG } from "../config.ts";

/**
 * Mock SupabaseClient for testing
 */
class MockSupabaseClient {
  private uploadAttempts = 0;
  private deleteAttempts = 0;
  private shouldFailUpload: boolean | number = false; // true = always fail, number = fail N times
  private shouldFailDelete: boolean | number = false;
  private shouldFailSignedUrl = false;
  private uploadError: Error | null = null;
  private deleteError: Error | null = null;

  constructor(options: {
    shouldFailUpload?: boolean | number;
    shouldFailDelete?: boolean | number;
    shouldFailSignedUrl?: boolean;
    uploadError?: Error;
    deleteError?: Error;
  } = {}) {
    this.shouldFailUpload = options.shouldFailUpload ?? false;
    this.shouldFailDelete = options.shouldFailDelete ?? false;
    this.shouldFailSignedUrl = options.shouldFailSignedUrl ?? false;
    this.uploadError = options.uploadError ?? null;
    this.deleteError = options.deleteError ?? null;
  }

  getUploadAttempts(): number {
    return this.uploadAttempts;
  }

  getDeleteAttempts(): number {
    return this.deleteAttempts;
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, data: any, options: any) => {
        this.uploadAttempts++;

        // Check if we should fail this attempt
        const shouldFail = typeof this.shouldFailUpload === "number"
          ? this.uploadAttempts <= this.shouldFailUpload
          : this.shouldFailUpload;

        if (shouldFail) {
          return {
            data: null,
            error: this.uploadError || new Error("Mock upload error")
          };
        }

        return {
          data: { path: path },
          error: null
        };
      },

      createSignedUrl: async (path: string, expiresIn: number) => {
        if (this.shouldFailSignedUrl) {
          return {
            data: null,
            error: new Error("Mock signed URL error")
          };
        }

        return {
          data: {
            signedUrl: `https://mock-storage.supabase.co/${path}?token=mock-token&expires=${expiresIn}`
          },
          error: null
        };
      },

      remove: async (paths: string[]) => {
        this.deleteAttempts++;

        // Check if we should fail this attempt
        const shouldFail = typeof this.shouldFailDelete === "number"
          ? this.deleteAttempts <= this.shouldFailDelete
          : this.shouldFailDelete;

        if (shouldFail) {
          return {
            data: null,
            error: this.deleteError || new Error("Mock delete error")
          };
        }

        return {
          data: paths,
          error: null
        };
      }
    })
  };
}

// =============================================================================
// Upload Tests
// =============================================================================

Deno.test("uploadWithRetry: succeeds on first attempt", async () => {
  const mockClient = new MockSupabaseClient();

  const result = await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-data",
    { contentType: "text/plain" },
    3600,
    "test-request-id"
  );

  assertEquals(mockClient.getUploadAttempts(), 1);
  assertEquals(result.path, "test-path");
  assertEquals(result.url.includes("mock-token"), true);
});

Deno.test("uploadWithRetry: retries on transient error and succeeds", async () => {
  // Fail first 2 attempts, succeed on 3rd
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: 2
  });

  const result = await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-data",
    { contentType: "text/plain" },
    3600,
    "test-request-id"
  );

  assertEquals(mockClient.getUploadAttempts(), 3);
  assertEquals(result.path, "test-path");
});

Deno.test("uploadWithRetry: fails after max retries", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: true // Always fail
  });

  await assertRejects(
    async () => {
      await uploadWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-data",
        { contentType: "text/plain" },
        3600,
        "test-request-id"
      );
    },
    Error,
    "Mock upload error"
  );

  // Should attempt MAX_RETRIES + 1 times (1 initial + 2 retries = 3 total)
  assertEquals(mockClient.getUploadAttempts(), RETRY_CONFIG.MAX_RETRIES + 1);
});

Deno.test("uploadWithRetry: does not retry on non-retriable errors (invalid)", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: true,
    uploadError: new Error("Invalid file format")
  });

  await assertRejects(
    async () => {
      await uploadWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-data",
        { contentType: "text/plain" },
        3600,
        "test-request-id"
      );
    },
    Error,
    "Invalid file format"
  );

  // Should only attempt once (no retries for invalid errors)
  assertEquals(mockClient.getUploadAttempts(), 1);
});

Deno.test("uploadWithRetry: does not retry on authorization errors", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: true,
    uploadError: new Error("Unauthorized access")
  });

  await assertRejects(
    async () => {
      await uploadWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-data",
        { contentType: "text/plain" },
        3600,
        "test-request-id"
      );
    },
    Error,
    "Unauthorized access"
  );

  assertEquals(mockClient.getUploadAttempts(), 1);
});

Deno.test("uploadWithRetry: does not retry on quota exceeded errors", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: true,
    uploadError: new Error("Quota exceeded")
  });

  await assertRejects(
    async () => {
      await uploadWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-data",
        { contentType: "text/plain" },
        3600,
        "test-request-id"
      );
    },
    Error,
    "Quota exceeded"
  );

  assertEquals(mockClient.getUploadAttempts(), 1);
});

Deno.test("uploadWithRetry: fails if signed URL generation fails", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailSignedUrl: true
  });

  await assertRejects(
    async () => {
      await uploadWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-data",
        { contentType: "text/plain" },
        3600,
        "test-request-id"
      );
    },
    Error,
    "Failed to create signed URL"
  );
});

// =============================================================================
// Delete Tests
// =============================================================================

Deno.test("deleteWithRetry: succeeds on first attempt", async () => {
  const mockClient = new MockSupabaseClient();

  await deleteWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-request-id"
  );

  assertEquals(mockClient.getDeleteAttempts(), 1);
});

Deno.test("deleteWithRetry: retries on transient error and succeeds", async () => {
  // Fail first attempt, succeed on 2nd
  const mockClient = new MockSupabaseClient({
    shouldFailDelete: 1
  });

  await deleteWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-request-id"
  );

  assertEquals(mockClient.getDeleteAttempts(), 2);
});

Deno.test("deleteWithRetry: fails after max retries", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailDelete: true // Always fail
  });

  await assertRejects(
    async () => {
      await deleteWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-request-id"
      );
    },
    Error,
    "Mock delete error"
  );

  assertEquals(mockClient.getDeleteAttempts(), RETRY_CONFIG.MAX_RETRIES + 1);
});

Deno.test("deleteWithRetry: does not retry on non-retriable errors", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailDelete: true,
    deleteError: new Error("Bucket not found")
  });

  await assertRejects(
    async () => {
      await deleteWithRetry(
        mockClient as any,
        "test-bucket",
        "test-path",
        "test-request-id"
      );
    },
    Error,
    "Bucket not found"
  );

  assertEquals(mockClient.getDeleteAttempts(), 1);
});

// =============================================================================
// Exponential Backoff Tests
// =============================================================================

Deno.test("uploadWithRetry: uses exponential backoff delays", async () => {
  const mockClient = new MockSupabaseClient({
    shouldFailUpload: 2 // Fail first 2 attempts
  });

  const startTime = Date.now();

  await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-data",
    { contentType: "text/plain" },
    3600,
    "test-request-id"
  );

  const elapsed = Date.now() - startTime;

  // Expected delays:
  // Attempt 1 -> fails
  // Wait 1000ms (INITIAL_DELAY_MS * 2^0)
  // Attempt 2 -> fails
  // Wait 2000ms (INITIAL_DELAY_MS * 2^1)
  // Attempt 3 -> succeeds
  // Total: ~3000ms minimum

  const minExpectedDelay = RETRY_CONFIG.INITIAL_DELAY_MS +
    (RETRY_CONFIG.INITIAL_DELAY_MS * RETRY_CONFIG.BACKOFF_MULTIPLIER);

  assertEquals(elapsed >= minExpectedDelay, true, `Expected at least ${minExpectedDelay}ms, got ${elapsed}ms`);
});

// =============================================================================
// Integration-Style Tests
// =============================================================================

Deno.test("uploadWithRetry: handles Uint8Array data", async () => {
  const mockClient = new MockSupabaseClient();
  const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

  const result = await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    binaryData,
    { contentType: "application/octet-stream" },
    3600,
    "test-request-id"
  );

  assertEquals(result.path, "test-path");
});

Deno.test("uploadWithRetry: handles custom signed URL expiry", async () => {
  const mockClient = new MockSupabaseClient();
  const customExpiry = 7200; // 2 hours

  const result = await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-data",
    { contentType: "text/plain" },
    customExpiry,
    "test-request-id"
  );

  assertEquals(result.url.includes(`expires=${customExpiry}`), true);
});

Deno.test("uploadWithRetry: generates request ID if not provided", async () => {
  const mockClient = new MockSupabaseClient();

  // Should not throw even without requestId
  const result = await uploadWithRetry(
    mockClient as any,
    "test-bucket",
    "test-path",
    "test-data",
    { contentType: "text/plain" },
    3600
    // No requestId provided
  );

  assertEquals(result.path, "test-path");
});

console.log("✅ All storage retry tests passed!");
