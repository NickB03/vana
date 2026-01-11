import { assertEquals, assert, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Input Validation Tests for bundle-artifact Edge Function
 *
 * Tests security and validation of inputs including:
 * - Path traversal attempts
 * - Invalid package names
 * - Malformed version strings
 * - Invalid UUID formats
 *
 * Requires: `supabase start` to run the local edge function
 */

const FUNCTION_URL = "http://localhost:54321/functions/v1/bundle-artifact";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY not set. Run `supabase start` first.");
}

Deno.test("bundle-artifact rejects invalid sessionId format (path traversal)", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: "../../../etc/passwd", // Path traversal attempt
      artifactId: crypto.randomUUID(),
      code: "export default () => <div>Test</div>",
      dependencies: {},
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(
    data.error.includes("Invalid sessionId") ||
    data.error.includes("sessionId") ||
    data.error.includes("UUID"),
    `Expected sessionId validation error, got: ${data.error}`
  );
});

Deno.test("bundle-artifact rejects invalid artifactId format", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: "not-a-uuid",
      code: "export default () => <div>Test</div>",
      dependencies: {},
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(data.error.includes("Invalid artifactId") || data.error.includes("artifactId"));
});

Deno.test("bundle-artifact rejects invalid package names (path traversal)", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: crypto.randomUUID(),
      code: "export default () => <div>Test</div>",
      dependencies: {
        "../malicious": "1.0.0" // Path traversal in package name
      },
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(
    data.error.includes("Invalid package name") ||
    data.error.includes("package") ||
    data.error.includes("invalid characters"),
    `Expected package name validation error, got: ${data.error}`
  );
});

Deno.test("bundle-artifact rejects package names with special characters", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: crypto.randomUUID(),
      code: "export default () => <div>Test</div>",
      dependencies: {
        "package$with!special": "1.0.0" // Special characters not allowed
      },
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(
    data.error.includes("Invalid package name") ||
    data.error.includes("invalid characters"),
    `Expected package name validation error, got: ${data.error}`
  );
});

Deno.test("bundle-artifact rejects malformed semver with path characters", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: crypto.randomUUID(),
      code: "export default () => <div>Test</div>",
      dependencies: {
        "react": "1.0.0/../../../etc/passwd" // Path traversal in version
      },
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(
    data.error.includes("Invalid") &&
    (data.error.includes("version") || data.error.includes("path")),
    `Expected version validation error, got: ${data.error}`
  );
});

Deno.test("bundle-artifact accepts valid scoped package names", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: crypto.randomUUID(),
      code: "export default () => <div>Test</div>",
      dependencies: {
        "@radix-ui/react-dialog": "1.0.5",
        "@types/react": "18.3.1"
      },
      bundleReact: true
    })
  });

  // Should succeed or fail for a different reason (not validation)
  if (response.status === 400) {
    const data = await response.json();
    assert(
      !data.error.includes("Invalid package name"),
      "Should accept valid scoped package names"
    );
  }
});

Deno.test("bundle-artifact accepts valid semver ranges", async () => {
  const validVersions = [
    "1.0.0",
    "^1.0.0",
    "~1.2.3",
    ">=1.0.0 <2.0.0",
    "1.x",
    "latest"
  ];

  for (const version of validVersions) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        artifactId: crypto.randomUUID(),
        code: "export default () => <div>Test</div>",
        dependencies: {
          "react": version
        },
        bundleReact: true
      })
    });

    // Should succeed or fail for a different reason (not validation)
    if (response.status === 400) {
      const data = await response.json();
      assert(
        !data.error.includes("Invalid version"),
        `Should accept valid semver: ${version}`
      );
    }
  }
});

Deno.test("bundle-artifact rejects code exceeding size limit", async () => {
  // Test with code larger than 500KB
  const largeCode = "x".repeat(600 * 1024);

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      sessionId: crypto.randomUUID(),
      artifactId: crypto.randomUUID(),
      code: largeCode,
      dependencies: {},
      bundleReact: true
    })
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assert(data.error.includes("exceeds maximum") || data.error.includes("too large"));
});

Deno.test("bundle-artifact rejects missing required fields", async () => {
  const testCases = [
    { missing: "sessionId", body: { artifactId: crypto.randomUUID(), code: "test", dependencies: {} } },
    { missing: "artifactId", body: { sessionId: crypto.randomUUID(), code: "test", dependencies: {} } },
    { missing: "code", body: { sessionId: crypto.randomUUID(), artifactId: crypto.randomUUID(), dependencies: {} } },
    { missing: "dependencies", body: { sessionId: crypto.randomUUID(), artifactId: crypto.randomUUID(), code: "test" } }
  ];

  for (const testCase of testCases) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(testCase.body)
    });

    assertEquals(response.status, 400, `Should reject missing ${testCase.missing}`);
    const data = await response.json();
    assert(data.error, `Should have error for missing ${testCase.missing}`);
  }
});

Deno.test("bundle-artifact rejects non-object dependencies", async () => {
  const invalidDeps = [
    "string",
    123,
    ["array"],
    null,
    true
  ];

  for (const deps of invalidDeps) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        artifactId: crypto.randomUUID(),
        code: "export default () => <div>Test</div>",
        dependencies: deps,
        bundleReact: true
      })
    });

    assertEquals(response.status, 400, `Should reject dependencies type: ${typeof deps}`);
    const data = await response.json();
    assert(data.error.includes("dependencies") || data.error.includes("Invalid"));
  }
});
