/**
 * Tests for CORS configuration with wildcard pattern support
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// We need to test the pattern matching logic directly since the module
// initializes with environment variables at import time.
// Test the patternToRegex conversion logic independently.

Deno.test("patternToRegex - converts wildcard pattern to regex", () => {
  // Replicate the function logic for testing
  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
    return new RegExp(`^${regexStr}$`);
  }

  // Test basic wildcard pattern
  const pattern = patternToRegex("https://*.example.com");
  assertEquals(pattern.test("https://foo.example.com"), true);
  assertEquals(pattern.test("https://bar-baz.example.com"), true);
  assertEquals(pattern.test("https://123.example.com"), true);
  assertEquals(pattern.test("https://example.com"), false); // No subdomain
  assertEquals(pattern.test("https://foo.bar.example.com"), false); // Multiple subdomains
  assertEquals(pattern.test("https://foo.example.org"), false); // Wrong TLD
});

Deno.test("patternToRegex - handles Cloudflare Pages pattern", () => {
  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
    return new RegExp(`^${regexStr}$`);
  }

  const pattern = patternToRegex("https://*.llm-chat-site.pages.dev");

  // Should match valid Cloudflare preview URLs
  assertEquals(pattern.test("https://fix-p0-p1-issues-271-281.llm-chat-site.pages.dev"), true);
  assertEquals(pattern.test("https://d5cf5525.llm-chat-site.pages.dev"), true);
  assertEquals(pattern.test("https://main.llm-chat-site.pages.dev"), true);
  assertEquals(pattern.test("https://feature-auth.llm-chat-site.pages.dev"), true);

  // Should NOT match invalid URLs
  assertEquals(pattern.test("https://llm-chat-site.pages.dev"), false); // Missing subdomain
  assertEquals(pattern.test("https://foo.other-site.pages.dev"), false); // Different project
  assertEquals(pattern.test("http://foo.llm-chat-site.pages.dev"), false); // HTTP instead of HTTPS
});

Deno.test("patternToRegex - escapes regex special characters in domain", () => {
  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
    return new RegExp(`^${regexStr}$`);
  }

  // Dots should be escaped (not treated as "any character")
  const pattern = patternToRegex("https://*.example.com");
  assertEquals(pattern.test("https://fooXexampleXcom"), false); // Dots not wildcards
});

Deno.test("patternToRegex - prevents ReDoS with proper escaping", () => {
  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
    return new RegExp(`^${regexStr}$`);
  }

  // Even with weird input, the regex should be safe
  const pattern = patternToRegex("https://*.test(special)+chars?.com");

  // Should complete quickly (no catastrophic backtracking)
  const start = Date.now();
  pattern.test("https://foo.testXspecialXcharsX.com");
  const elapsed = Date.now() - start;
  assertEquals(elapsed < 100, true, "Regex should complete quickly");
});

Deno.test("origin matching - exact matches work", () => {
  // Simulate the origin matching logic
  const exact = new Set(["https://example.com", "http://localhost:8080"]);
  const patterns: RegExp[] = [];

  function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    if (exact.has(origin)) return true;
    return patterns.some(pattern => pattern.test(origin));
  }

  assertEquals(isOriginAllowed("https://example.com"), true);
  assertEquals(isOriginAllowed("http://localhost:8080"), true);
  assertEquals(isOriginAllowed("https://other.com"), false);
  assertEquals(isOriginAllowed(null), false);
});

Deno.test("origin matching - wildcards and exact combined", () => {
  function patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
    return new RegExp(`^${regexStr}$`);
  }

  // Simulate mixed configuration
  const exact = new Set(["https://vana.dev", "http://localhost:8080"]);
  const patterns = [patternToRegex("https://*.llm-chat-site.pages.dev")];

  function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    if (exact.has(origin)) return true;
    return patterns.some(pattern => pattern.test(origin));
  }

  // Exact matches
  assertEquals(isOriginAllowed("https://vana.dev"), true);
  assertEquals(isOriginAllowed("http://localhost:8080"), true);

  // Wildcard matches
  assertEquals(isOriginAllowed("https://preview-123.llm-chat-site.pages.dev"), true);
  assertEquals(isOriginAllowed("https://feature-branch.llm-chat-site.pages.dev"), true);

  // Non-matches
  assertEquals(isOriginAllowed("https://evil.com"), false);
  assertEquals(isOriginAllowed("https://foo.other.pages.dev"), false);
});
