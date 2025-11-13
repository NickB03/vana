/**
 * Shared Test Utilities
 *
 * Common mocks, fixtures, and helper functions for testing Edge Functions shared modules.
 *
 * @module test-utils
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

/**
 * Mock Supabase client for testing
 */
export interface MockSupabaseClient {
  rpc: (name: string, params?: any) => Promise<{ data: any; error: any }>;
}

/**
 * Create a mock Supabase client with configurable RPC responses
 */
export function createMockSupabaseClient(
  rpcMocks?: Record<string, { data?: any; error?: any }>
): MockSupabaseClient {
  return {
    rpc: async (name: string, params?: any) => {
      const mock = rpcMocks?.[name];
      if (mock) {
        return { data: mock.data ?? null, error: mock.error ?? null };
      }
      // Default: return success
      return { data: { allowed: true, remaining: 100, reset_at: new Date().toISOString() }, error: null };
    }
  } as MockSupabaseClient;
}

/**
 * Mock environment variables for testing
 */
export class MockEnvironment {
  private originalGet: typeof Deno.env.get;
  private mocks: Record<string, string>;

  constructor(mocks: Record<string, string> = {}) {
    this.originalGet = Deno.env.get;
    this.mocks = {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      ...mocks
    };
  }

  /**
   * Install the mock environment
   */
  install(): void {
    Deno.env.get = (key: string) => {
      return this.mocks[key];
    };
  }

  /**
   * Restore original environment
   */
  restore(): void {
    Deno.env.get = this.originalGet;
  }
}

/**
 * Create a mock HTTP Request object
 */
export function mockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  url?: string;
}): Request {
  const { method = "POST", headers = {}, body, url = "https://test.com" } = options;

  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * Create a mock Request with IP headers for rate limiting tests
 */
export function mockRequestWithIp(ip: string, additionalHeaders?: Record<string, string>): Request {
  return mockRequest({
    headers: {
      "x-forwarded-for": ip,
      ...additionalHeaders
    }
  });
}

/**
 * Extract JSON body from Response
 */
export async function getResponseBody(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Assert that a Response has expected status and body
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number,
  expectedBodyFields?: Record<string, any>
): Promise<void> {
  const actualStatus = response.status;
  if (actualStatus !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${actualStatus}`);
  }

  if (expectedBodyFields) {
    const body = await getResponseBody(response);
    for (const [key, value] of Object.entries(expectedBodyFields)) {
      if (body[key] !== value) {
        throw new Error(`Expected body.${key} to be ${value}, got ${body[key]}`);
      }
    }
  }
}

/**
 * Create a valid message for testing
 */
export function createValidMessage(overrides?: Partial<{
  role: "user" | "assistant" | "system";
  content: string;
}>): { role: "user" | "assistant" | "system"; content: string } {
  return {
    role: "user",
    content: "Test message content",
    ...overrides
  };
}

/**
 * Create a valid chat request for testing
 */
export function createValidChatRequest(overrides?: Partial<{
  messages: any[];
  sessionId: string;
  isGuest: boolean;
  currentArtifact: any;
}>): any {
  return {
    messages: [createValidMessage()],
    sessionId: "test-session-id",
    isGuest: false,
    ...overrides
  };
}

/**
 * Create a valid image request for testing
 */
export function createValidImageRequest(overrides?: Partial<{
  prompt: string;
  mode: "generate" | "edit";
  baseImage: string;
  sessionId: string;
}>): any {
  return {
    prompt: "A beautiful sunset",
    mode: "generate",
    sessionId: "test-session-id",
    ...overrides
  };
}

/**
 * Generate a string of specified length for testing length limits
 */
export function generateString(length: number, char = "a"): string {
  return char.repeat(length);
}

/**
 * Mock Date.now() for consistent timestamp testing
 */
export class MockDate {
  private originalNow: typeof Date.now;
  private fixedTimestamp: number;

  constructor(timestamp?: number) {
    this.originalNow = Date.now;
    this.fixedTimestamp = timestamp ?? 1700000000000; // Default: Nov 14, 2023
  }

  install(): void {
    Date.now = () => this.fixedTimestamp;
  }

  restore(): void {
    Date.now = this.originalNow;
  }

  advance(ms: number): void {
    this.fixedTimestamp += ms;
  }
}

/**
 * Helper to test that a function throws a specific error
 */
export function assertThrowsWithMessage(
  fn: () => void,
  expectedMessage: string | RegExp
): void {
  let thrown = false;
  let actualMessage = "";

  try {
    fn();
  } catch (error) {
    thrown = true;
    actualMessage = error instanceof Error ? error.message : String(error);
  }

  if (!thrown) {
    throw new Error(`Expected function to throw, but it didn't`);
  }

  if (typeof expectedMessage === "string") {
    if (!actualMessage.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}", got "${actualMessage}"`
      );
    }
  } else {
    if (!expectedMessage.test(actualMessage)) {
      throw new Error(
        `Expected error message to match ${expectedMessage}, got "${actualMessage}"`
      );
    }
  }
}

/**
 * Helper to test async functions that throw
 */
export async function assertAsyncThrowsWithMessage(
  fn: () => Promise<void>,
  expectedMessage: string | RegExp
): Promise<void> {
  let thrown = false;
  let actualMessage = "";

  try {
    await fn();
  } catch (error) {
    thrown = true;
    actualMessage = error instanceof Error ? error.message : String(error);
  }

  if (!thrown) {
    throw new Error(`Expected async function to throw, but it didn't`);
  }

  if (typeof expectedMessage === "string") {
    if (!actualMessage.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}", got "${actualMessage}"`
      );
    }
  } else {
    if (!expectedMessage.test(actualMessage)) {
      throw new Error(
        `Expected error message to match ${expectedMessage}, got "${actualMessage}"`
      );
    }
  }
}

/**
 * Sleep for specified milliseconds (useful for timing tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected value to be defined, got ${value}`);
  }
}

/**
 * Create a valid base64 data URL for image testing
 */
export function createValidDataUrl(type = "image/png"): string {
  // 1x1 transparent PNG in base64
  const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return `data:${type};base64,${base64Png}`;
}

/**
 * Verify that an object has all expected keys
 */
export function assertHasKeys(obj: any, expectedKeys: string[]): void {
  const actualKeys = Object.keys(obj);
  const missingKeys = expectedKeys.filter(key => !actualKeys.includes(key));

  if (missingKeys.length > 0) {
    throw new Error(`Object is missing keys: ${missingKeys.join(", ")}`);
  }
}

/**
 * Verify that a Response has expected headers
 */
export function assertHasHeaders(response: Response, expectedHeaders: Record<string, string>): void {
  for (const [key, expectedValue] of Object.entries(expectedHeaders)) {
    const actualValue = response.headers.get(key);
    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected header ${key} to be "${expectedValue}", got "${actualValue}"`
      );
    }
  }
}
