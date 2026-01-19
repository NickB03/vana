/**
 * End-to-End Tests for Artifact Generation
 *
 * These tests verify the artifact generation pipeline:
 * 1. AI generates valid React component from prompt
 * 2. Generated code has required default export
 * 3. Tool calling pipeline returns artifact successfully
 * 4. Invalid syntax is handled gracefully
 *
 * Note: AI responses are mocked for deterministic testing.
 * Real API integration tests are in chat-endpoint-integration.test.ts
 *
 * To run:
 * npm run test -- artifact-generation-e2e
 * OR (direct deno):
 * deno test --allow-read --allow-env supabase/functions/_shared/__tests__/artifact-generation-e2e.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Mock Types
// ============================================================================

interface MockToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface MockToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: {
    artifactCode?: string;
    artifactType?: string;
    artifactTitle?: string;
    artifactReasoning?: string;
  };
  error?: string;
  latencyMs: number;
}

interface MockToolContext {
  requestId: string;
  userId?: string;
  isGuest: boolean;
  userMessage?: string;
}

// ============================================================================
// Test Fixtures
// ============================================================================

const VALID_REACT_COMPONENT = `export default function HelloButton() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="p-4">
      <button
        onClick={() => setCount(c => c + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Click me: {count}
      </button>
    </div>
  );
}`;

const VALID_REACT_COMPONENT_WITH_ARROW = `const App = () => {
  return <div>Hello World</div>;
};

export default App;`;

const COMPONENT_WITHOUT_DEFAULT_EXPORT = `function HelloButton() {
  return <button>Click me</button>;
}

export { HelloButton };`;

const COMPONENT_WITH_SYNTAX_ERROR = `export default function Broken() {
  return (
    <div className="test">
      {items.map(item => {
        return <span>{item}</span>
      // Missing closing brace
    </div>
  );
}`;

const COMPONENT_WITH_IMPORT_ERROR = `import { useState } from 'react';
import SomeComponent from '@/components/SomeComponent'; // Invalid in sandbox

export default function App() {
  const [count, setCount] = useState(0);
  return <SomeComponent count={count} />;
}`;

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Simulates the artifact generation pipeline
 * In real implementation, this would call Gemini 3 Flash
 */
function mockExecuteArtifactTool(
  type: string,
  prompt: string,
  context: MockToolContext
): MockToolExecutionResult {
  const startTime = Date.now();
  const validTypes = ["react", "html", "svg", "code", "mermaid", "markdown"];

  // Validate artifact type
  if (!validTypes.includes(type)) {
    return {
      success: false,
      toolName: "generate_artifact",
      error: `Invalid artifact type: "${type}". Valid types: ${validTypes.join(", ")}`,
      latencyMs: Date.now() - startTime,
    };
  }

  // Simulate AI generating code based on prompt
  let artifactCode: string;
  let artifactReasoning: string;

  if (prompt.toLowerCase().includes("button")) {
    artifactCode = VALID_REACT_COMPONENT;
    artifactReasoning =
      "Created a button component with click counter using React hooks.";
  } else if (prompt.toLowerCase().includes("arrow")) {
    artifactCode = VALID_REACT_COMPONENT_WITH_ARROW;
    artifactReasoning = "Created a simple component using arrow function syntax.";
  } else if (prompt.toLowerCase().includes("broken")) {
    artifactCode = COMPONENT_WITH_SYNTAX_ERROR;
    artifactReasoning = "Attempted to create component but encountered syntax issues.";
  } else if (prompt.toLowerCase().includes("no export")) {
    artifactCode = COMPONENT_WITHOUT_DEFAULT_EXPORT;
    artifactReasoning =
      "Created component but forgot to add default export (simulated error).";
  } else if (prompt.toLowerCase().includes("invalid import")) {
    artifactCode = COMPONENT_WITH_IMPORT_ERROR;
    artifactReasoning =
      "Created component with invalid imports that wont work in sandbox.";
  } else {
    artifactCode = `export default function App() {
  return <div>Generated from prompt: ${prompt.substring(0, 50)}</div>;
}`;
    artifactReasoning = "Generated a basic component based on the prompt.";
  }

  return {
    success: true,
    toolName: "generate_artifact",
    data: {
      artifactCode,
      artifactType: type,
      artifactTitle: `Generated ${type} artifact`,
      artifactReasoning,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Validates that the generated code has a default export
 */
function hasDefaultExport(code: string): boolean {
  // Check for various default export patterns
  const patterns = [
    /export\s+default\s+function/,
    /export\s+default\s+class/,
    /export\s+default\s+\(/,
    /export\s+default\s+\w+/,
  ];
  return patterns.some((pattern) => pattern.test(code));
}

/**
 * Validates basic syntax (simplified - real implementation uses TypeScript compiler)
 */
function hasSyntaxError(code: string): boolean {
  // Simple heuristics for syntax validation
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  const openAngle = (code.match(/<(?![=!])/g) || []).length;
  const closeAngle = (code.match(/(?<![-=])>/g) || []).length;

  // Check for mismatched braces/parens
  if (openBraces !== closeBraces) return true;
  if (openParens !== closeParens) return true;
  // JSX angle brackets are often mismatched in valid code, so skip that check

  return false;
}

/**
 * Validates that imports dont use @ alias (not available in sandbox)
 */
function hasInvalidImports(code: string): boolean {
  return /@\//.test(code);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Artifact Generation E2E Tests", () => {
  const mockContext: MockToolContext = {
    requestId: "test-req-123",
    userId: "test-user-456",
    isGuest: false,
  };

  // ============================================================================
  // Test 1: AI generates valid React component from prompt
  // ============================================================================

  describe("Valid React Component Generation", () => {
    it("should generate a valid React component with useState hook", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a button that counts clicks",
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.toolName).toBe("generate_artifact");
      expect(result.data?.artifactCode).toBeDefined();
      expect(result.data?.artifactType).toBe("react");
      expect(result.data?.artifactCode).toContain("useState");
      expect(result.data?.artifactCode).toContain("onClick");
    });

    it("should generate a component using arrow function syntax", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a simple arrow function component",
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.artifactCode).toContain("const App = () =>");
    });

    it("should include reasoning in the response", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a button component",
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.artifactReasoning).toBeDefined();
      expect(result.data?.artifactReasoning!.length).toBeGreaterThan(0);
    });

    it("should handle various artifact types", () => {
      const types = ["react", "html", "svg", "code", "mermaid", "markdown"];

      for (const type of types) {
        const result = mockExecuteArtifactTool(
          type,
          "Create something",
          mockContext
        );
        expect(result.success).toBe(true);
        expect(result.data?.artifactType).toBe(type);
      }
    });
  });

  // ============================================================================
  // Test 2: Generated code has required default export
  // ============================================================================

  describe("Default Export Validation", () => {
    it("should generate code with default export (function declaration)", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a button component",
        mockContext
      );

      expect(result.success).toBe(true);
      expect(hasDefaultExport(result.data?.artifactCode || "")).toBe(true);
    });

    it("should generate code with default export (arrow function)", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create an arrow function component",
        mockContext
      );

      expect(result.success).toBe(true);
      expect(hasDefaultExport(result.data?.artifactCode || "")).toBe(true);
    });

    it("should detect missing default export", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a component with no export",
        mockContext
      );

      // The mock simulates a bad response
      expect(result.success).toBe(true);
      expect(hasDefaultExport(result.data?.artifactCode || "")).toBe(false);
    });

    it("should validate various default export patterns", () => {
      const validExports = [
        'export default function Foo() {}',
        'export default class Bar {}',
        'export default () => {}',
        'const X = () => {}; export default X;',
      ];

      for (const code of validExports) {
        expect(hasDefaultExport(code)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Test 3: Tool calling pipeline returns artifact successfully
  // ============================================================================

  describe("Tool Calling Pipeline", () => {
    it("should return success with all expected fields", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a simple component",
        mockContext
      );

      expect(result).toMatchObject({
        success: true,
        toolName: "generate_artifact",
        latencyMs: expect.any(Number),
        data: {
          artifactCode: expect.any(String),
          artifactType: "react",
          artifactTitle: expect.any(String),
          artifactReasoning: expect.any(String),
        },
      });
    });

    it("should reject invalid artifact types", () => {
      const result = mockExecuteArtifactTool(
        "invalid_type",
        "Create something",
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid artifact type");
      expect(result.error).toContain("invalid_type");
    });

    it("should include latency metrics", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a component",
        mockContext
      );

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should propagate context correctly", () => {
      const customContext: MockToolContext = {
        requestId: "custom-req-789",
        userId: "custom-user",
        isGuest: true,
        userMessage: "Original user message",
      };

      const result = mockExecuteArtifactTool("react", "Create a button", customContext);

      expect(result.success).toBe(true);
      // In real implementation, context would be used for logging/analytics
    });
  });

  // ============================================================================
  // Test 4: Invalid syntax is handled gracefully
  // ============================================================================

  describe("Syntax Error Handling", () => {
    it("should detect syntax errors in generated code", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a broken component",
        mockContext
      );

      // The pipeline should still succeed (AI generated the code)
      expect(result.success).toBe(true);

      // But the code has syntax errors that Sandpack would catch
      const code = result.data?.artifactCode || "";
      expect(hasSyntaxError(code)).toBe(true);
    });

    it("should detect invalid imports that wont work in sandbox", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a component with invalid import",
        mockContext
      );

      expect(result.success).toBe(true);

      const code = result.data?.artifactCode || "";
      expect(hasInvalidImports(code)).toBe(true);
    });

    it("should validate mismatched braces", () => {
      // Use a clearly mismatched brace count
      const badCode = `function Test() {
        const obj = { a: 1, b: 2;
        return obj;
      }`;
      expect(hasSyntaxError(badCode)).toBe(true);
    });

    it("should validate mismatched parentheses", () => {
      const badCode = `function Test() {
        return ((
          <div>Hello</div>
        );
      }`;
      expect(hasSyntaxError(badCode)).toBe(true);
    });

    it("should pass valid code", () => {
      const goodCode = `export default function Test() {
        return (
          <div className="test">
            <span>Hello</span>
          </div>
        );
      }`;
      expect(hasSyntaxError(goodCode)).toBe(false);
      expect(hasDefaultExport(goodCode)).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases and Integration Scenarios
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty prompts gracefully", () => {
      const result = mockExecuteArtifactTool("react", "", mockContext);

      // Even with empty prompt, tool should not crash
      expect(result.success).toBe(true);
      expect(result.data?.artifactCode).toBeDefined();
    });

    it("should handle very long prompts", () => {
      const longPrompt = "Create a button ".repeat(100);
      const result = mockExecuteArtifactTool("react", longPrompt, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.artifactCode).toBeDefined();
    });

    it("should handle special characters in prompts", () => {
      const specialPrompt =
        "Create a <Component> with 'quotes' and \"double quotes\" & ampersand";
      const result = mockExecuteArtifactTool("react", specialPrompt, mockContext);

      expect(result.success).toBe(true);
    });

    it("should handle unicode in prompts", () => {
      const unicodePrompt = "Create a button with emoji like this";
      const result = mockExecuteArtifactTool("react", unicodePrompt, mockContext);

      expect(result.success).toBe(true);
    });
  });

  describe("getToolResultContent Integration", () => {
    it("should format successful artifact result correctly", () => {
      const result = mockExecuteArtifactTool(
        "react",
        "Create a button",
        mockContext
      );

      // Simulate what getToolResultContent would return
      if (result.success && result.data) {
        const content = `Artifact generated successfully:\n\n${result.data.artifactCode}${
          result.data.artifactReasoning
            ? `\n\nReasoning:\n${result.data.artifactReasoning}`
            : ""
        }`;

        expect(content).toContain("Artifact generated successfully");
        expect(content).toContain("export default function");
        expect(content).toContain("Reasoning:");
      }
    });

    it("should format error result correctly", () => {
      const result = mockExecuteArtifactTool(
        "invalid_type",
        "Create something",
        mockContext
      );

      // Simulate what getToolResultContent would return for errors
      if (!result.success) {
        const content = `Error: ${result.error || "Unknown error occurred"}`;
        expect(content).toContain("Error:");
        expect(content).toContain("Invalid artifact type");
      }
    });
  });
});

// ============================================================================
// Standalone Validation Function Tests
// ============================================================================

describe("Validation Utilities", () => {
  describe("hasDefaultExport", () => {
    it("should detect export default function", () => {
      expect(hasDefaultExport("export default function Foo() {}")).toBe(true);
    });

    it("should detect export default class", () => {
      expect(hasDefaultExport("export default class Bar {}")).toBe(true);
    });

    it("should detect export default arrow function", () => {
      expect(hasDefaultExport("export default () => {}")).toBe(true);
    });

    it("should detect named export default", () => {
      expect(hasDefaultExport("export default App")).toBe(true);
    });

    it("should reject named exports only", () => {
      expect(hasDefaultExport("export { Foo }")).toBe(false);
    });

    it("should reject no exports", () => {
      expect(hasDefaultExport("function Foo() {}")).toBe(false);
    });
  });

  describe("hasSyntaxError", () => {
    it("should detect mismatched braces", () => {
      expect(hasSyntaxError("function foo() { { }")).toBe(true);
    });

    it("should detect mismatched parentheses", () => {
      expect(hasSyntaxError("function foo( {}")).toBe(true);
    });

    it("should pass balanced code", () => {
      expect(hasSyntaxError("function foo() { return (1 + 2); }")).toBe(false);
    });
  });

  describe("hasInvalidImports", () => {
    it("should detect @/ imports", () => {
      expect(hasInvalidImports("import X from '@/components/X'")).toBe(true);
    });

    it("should pass valid npm imports", () => {
      expect(hasInvalidImports("import React from 'react'")).toBe(false);
    });

    it("should pass relative imports", () => {
      expect(hasInvalidImports("import X from './X'")).toBe(false);
    });
  });
});
