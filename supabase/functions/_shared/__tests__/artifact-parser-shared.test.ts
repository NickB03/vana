/**
 * Tests for Shared Artifact Parser
 *
 * Validates XML parsing, attribute extraction, markdown fence stripping,
 * and edge case handling for artifact content.
 *
 * @module artifact-parser-shared.test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  parseArtifactXML,
  parseAllArtifactsXML,
  extractArtifactAttributes,
  hasArtifactTags,
  ARTIFACT_REGEX
} from "../artifact-parser-shared.ts";

// =============================================================================
// BASIC PARSING TESTS
// =============================================================================

Deno.test("parseArtifactXML - parses valid artifact with all attributes", () => {
  const content = `
    Some text before
    <artifact type="react" title="Counter Component" language="typescript">
      export default function App() { return <div>Hello</div>; }
    </artifact>
    Some text after
  `;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.type, "react");
  assertEquals(result.title, "Counter Component");
  assertEquals(result.language, "typescript");
  assertEquals(result.code.includes("export default function App()"), true);
});

Deno.test("parseArtifactXML - parses artifact with minimal attributes", () => {
  const content = `<artifact type="html" title="Page">
    <div>Hello World</div>
  </artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.type, "html");
  assertEquals(result.title, "Page");
  assertEquals(result.language, undefined);
  assertEquals(result.code.includes("<div>Hello World</div>"), true);
});

Deno.test("parseArtifactXML - uses defaults for missing attributes", () => {
  const content = `<artifact>
    Some code here
  </artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.type, "code"); // Default type
  assertEquals(result.title, "Untitled Artifact"); // Default title
  assertEquals(result.code, "Some code here");
});

Deno.test("parseArtifactXML - returns null for content without artifact tags", () => {
  const content = "This is just regular text without any artifact tags.";

  const result = parseArtifactXML(content);

  assertEquals(result, null);
});

Deno.test("parseArtifactXML - handles empty artifact content", () => {
  const content = `<artifact type="html" title="Empty"></artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code, "");
});

// =============================================================================
// MARKDOWN FENCE STRIPPING TESTS
// =============================================================================

Deno.test("parseArtifactXML - strips markdown code fences", () => {
  const content = `<artifact type="react" title="Component">
\`\`\`jsx
export default function App() {
  return <div>Hello</div>;
}
\`\`\`
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  // Should not contain markdown fences
  assertEquals(result.code.includes("```"), false);
  assertEquals(result.code.includes("export default function App()"), true);
});

Deno.test("parseArtifactXML - strips multiple markdown fence types", () => {
  const content = `<artifact type="code" title="Multi">
\`\`\`typescript
const a = 1;
\`\`\`
Some text
\`\`\`javascript
const b = 2;
\`\`\`
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code.includes("```"), false);
  assertEquals(result.code.includes("const a = 1"), true);
  assertEquals(result.code.includes("const b = 2"), true);
});

Deno.test("parseArtifactXML - handles content without fences", () => {
  const content = `<artifact type="react" title="Plain">
export default function App() {
  return <div>Hello</div>;
}
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code.includes("export default function App()"), true);
});

// =============================================================================
// ATTRIBUTE EXTRACTION TESTS
// =============================================================================

Deno.test("extractArtifactAttributes - extracts all attributes", () => {
  const attrs = extractArtifactAttributes(' type="react" title="My App" language="tsx"');

  assertEquals(attrs.type, "react");
  assertEquals(attrs.title, "My App");
  assertEquals(attrs.language, "tsx");
});

Deno.test("extractArtifactAttributes - handles attributes in any order", () => {
  const attrs = extractArtifactAttributes(' language="js" title="Test" type="code"');

  assertEquals(attrs.type, "code");
  assertEquals(attrs.title, "Test");
  assertEquals(attrs.language, "js");
});

Deno.test("extractArtifactAttributes - provides defaults for missing attributes", () => {
  const attrs = extractArtifactAttributes("");

  assertEquals(attrs.type, "code");
  assertEquals(attrs.title, "Untitled Artifact");
  assertEquals(attrs.language, undefined);
});

Deno.test("extractArtifactAttributes - handles partial attributes", () => {
  const attrs = extractArtifactAttributes(' type="svg"');

  assertEquals(attrs.type, "svg");
  assertEquals(attrs.title, "Untitled Artifact");
  assertEquals(attrs.language, undefined);
});

// =============================================================================
// MULTIPLE ARTIFACTS TESTS
// =============================================================================

Deno.test("parseAllArtifactsXML - parses multiple artifacts", () => {
  const content = `
    <artifact type="react" title="Component A">
      Code A
    </artifact>
    Some text between
    <artifact type="html" title="Template B">
      Code B
    </artifact>
    More text
    <artifact type="svg" title="Icon C">
      Code C
    </artifact>
  `;

  const results = parseAllArtifactsXML(content);

  assertEquals(results.length, 3);
  assertEquals(results[0].type, "react");
  assertEquals(results[0].title, "Component A");
  assertEquals(results[1].type, "html");
  assertEquals(results[1].title, "Template B");
  assertEquals(results[2].type, "svg");
  assertEquals(results[2].title, "Icon C");
});

Deno.test("parseAllArtifactsXML - returns empty array for no artifacts", () => {
  const content = "No artifacts here";

  const results = parseAllArtifactsXML(content);

  assertEquals(results.length, 0);
});

// =============================================================================
// HAS ARTIFACT TAGS TESTS
// =============================================================================

Deno.test("hasArtifactTags - returns true for content with artifact tags", () => {
  const content = `<artifact type="react" title="App">code</artifact>`;

  assertEquals(hasArtifactTags(content), true);
});

Deno.test("hasArtifactTags - returns false for content without artifact tags", () => {
  const content = "Just regular text";

  assertEquals(hasArtifactTags(content), false);
});

Deno.test("hasArtifactTags - returns false for unclosed artifact tag", () => {
  const content = `<artifact type="react">code without closing tag`;

  // The ARTIFACT_REGEX requires both opening and closing tags
  assertEquals(hasArtifactTags(content), false);
});

// =============================================================================
// EDGE CASES
// =============================================================================

Deno.test("parseArtifactXML - handles special characters in content", () => {
  const content = `<artifact type="code" title="Special">
const regex = /<div>/g;
const html = "<p>Hello & Goodbye</p>";
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code.includes("/<div>/g"), true);
  assertEquals(result.code.includes("&"), true);
});

Deno.test("parseArtifactXML - handles nested angle brackets", () => {
  const content = `<artifact type="react" title="JSX">
export default function App() {
  return <div><span>Nested</span></div>;
}
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code.includes("<div><span>Nested</span></div>"), true);
});

Deno.test("parseArtifactXML - handles multiline content", () => {
  const content = `<artifact type="react" title="Multiline">
import React from 'react';

export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.code.includes("useState"), true);
  assertEquals(result.code.includes("onClick"), true);
});

Deno.test("parseArtifactXML - handles quoted attribute values with spaces", () => {
  const content = `<artifact type="react" title="My Counter Component">code</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.title, "My Counter Component");
});

Deno.test("parseArtifactXML - only parses first artifact", () => {
  const content = `
    <artifact type="react" title="First">First code</artifact>
    <artifact type="html" title="Second">Second code</artifact>
  `;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.title, "First");
  assertEquals(result.code, "First code");
});

Deno.test("ARTIFACT_REGEX - resets lastIndex correctly", () => {
  // Test that the regex can be used multiple times
  const content1 = `<artifact type="react" title="One">Code 1</artifact>`;
  const content2 = `<artifact type="html" title="Two">Code 2</artifact>`;

  const result1 = parseArtifactXML(content1);
  const result2 = parseArtifactXML(content2);

  assertExists(result1);
  assertExists(result2);
  assertEquals(result1.title, "One");
  assertEquals(result2.title, "Two");
});

// =============================================================================
// MERMAID DIAGRAM TESTS
// =============================================================================

Deno.test("parseArtifactXML - handles mermaid diagrams", () => {
  const content = `<artifact type="mermaid" title="Flow Diagram">
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[End]
    B -->|No| D[Loop]
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.type, "mermaid");
  assertEquals(result.code.includes("graph TD"), true);
  assertEquals(result.code.includes("A[Start]"), true);
});

// =============================================================================
// SVG TESTS
// =============================================================================

Deno.test("parseArtifactXML - handles SVG content", () => {
  const content = `<artifact type="svg" title="Circle">
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>
</artifact>`;

  const result = parseArtifactXML(content);

  assertExists(result);
  assertEquals(result.type, "svg");
  assertEquals(result.code.includes("<svg"), true);
  assertEquals(result.code.includes("<circle"), true);
});
