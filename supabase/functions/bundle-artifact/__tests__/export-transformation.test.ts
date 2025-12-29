/**
 * Test suite for export transformation in bundle-artifact
 *
 * Tests the normalizeDefaultExportToApp() function which replaces
 * the previous fragile regex chain.
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { normalizeDefaultExportToApp } from "../index.ts";

// =============================================================================
// PATTERN 1: Named function export already called App
// =============================================================================
Deno.test("export transform - export default function App()", () => {
  const input = `export default function App() { return <div/> }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("function App()"), true);
});

// =============================================================================
// PATTERN 2: Named function with different name
// =============================================================================
Deno.test("export transform - export default function Calculator()", () => {
  const input = `export default function Calculator() { return <div/> }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  // Should rename to App
  assertEquals(result.includes("function App()"), true);
});

// =============================================================================
// PATTERN 3: Anonymous function
// =============================================================================
Deno.test("export transform - export default function()", () => {
  const input = `export default function() { return <div/> }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("function App()"), true);
});

// =============================================================================
// PATTERN 4: Separate declaration and export (THE BUG)
// =============================================================================
Deno.test("export transform - function App() with separate export", () => {
  const input = `function App() { return <div/> }
export default App;`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("function App()"), true);
  // CRITICAL: Must NOT create "const App = App"
  assertEquals(result.includes("const App = App"), false);
});

// =============================================================================
// PATTERN 5: Const with separate export
// =============================================================================
Deno.test("export transform - const with separate export", () => {
  const input = `const Calculator = () => <div/>;
export default Calculator;`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("const Calculator"), true);
  // Should add App alias
  assertEquals(result.includes("const App = Calculator") || result.includes("App"), true);
});

// =============================================================================
// PATTERN 6: Named export as default
// =============================================================================
Deno.test("export transform - export { X as default }", () => {
  const input = `function Calculator() { return <div/> }
export { Calculator as default };`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export { Calculator as default }"), false);
  assertEquals(result.includes("function Calculator"), true);
});

// =============================================================================
// PATTERN 7: Arrow function export
// =============================================================================
Deno.test("export transform - export default arrow function", () => {
  const input = `export default () => <div>Hello</div>`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("const App = () =>"), true);
});

// =============================================================================
// PATTERN 8: HOC wrapped component
// =============================================================================
Deno.test("export transform - export default memo(App)", () => {
  const input = `function App() { return <div/> }
export default memo(App);`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  // When component is already named App, just remove the export line
  // (avoids invalid duplicate declaration: const App = memo(App))
  assertEquals(result.match(/\bApp\b/g)?.length || 0, 1); // Just function App
});

// Additional HOC test: wrapping a different component name
Deno.test("export transform - export default memo(Calculator)", () => {
  const input = `function Calculator() { return <div/> }
export default memo(Calculator);`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  // Should create App alias for the wrapped component
  assertEquals(result.includes("const App = memo(Calculator)"), true);
});

// =============================================================================
// PATTERN 9: Anonymous class
// =============================================================================
Deno.test("export transform - export default class extends Component", () => {
  const input = `export default class extends React.Component { render() { return <div/> } }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("const App = class"), true);
});

// =============================================================================
// EDGE CASE: Existing App declaration + different export
// =============================================================================
Deno.test("export transform - avoids duplicate App declaration", () => {
  const input = `const App = useState(0);
export default Calculator;`;
  const result = normalizeDefaultExportToApp(input);

  // Should NOT create another App declaration
  const appMatches = result.match(/const App\s*=/g) || [];
  assertEquals(appMatches.length, 1);
});

// =============================================================================
// EDGE CASE: Preserves non-default exports
// =============================================================================
Deno.test("export transform - preserves named exports", () => {
  const input = `export const utils = { foo: 1 };
export default function App() { return <div/> }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export const utils"), true);
  assertEquals(result.includes("export default"), false);
});

// =============================================================================
// EDGE CASE: Multiline export
// =============================================================================
Deno.test("export transform - handles multiline exports", () => {
  const input = `export default function App() {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
}`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("export default"), false);
  assertEquals(result.includes("function App()"), true);
  assertEquals(result.includes("<h1>Hello</h1>"), true);
});

// =============================================================================
// EDGE CASE: Export with comment
// =============================================================================
Deno.test("export transform - preserves comments", () => {
  const input = `// Main component
export default function App() { return <div/> }`;
  const result = normalizeDefaultExportToApp(input);

  assertEquals(result.includes("// Main component"), true);
});
