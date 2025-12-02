/**
 * Tests for Reasoning Text Extractor
 *
 * These tests verify that the extractor produces clean, semantic status updates
 * from raw LLM reasoning text. The goal is ticker-friendly output like
 * "Analyzing database schema" instead of verbose thinking text.
 *
 * @module reasoningTextExtractor.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  extractStatusText,
  createExtractionState,
  validateCandidate,
  transformToGerund,
  looksLikeCode,
  startsWithFiller,
  isNegativeInstruction,
  isStateSentence,
  looksLikeData,
  stripPrefix,
  truncate,
  getVerbConjugations,
  getFillerPhrases,
  DEFAULT_CONFIG,
  type ExtractionState,
  type ExtractionConfig,
} from "../reasoningTextExtractor";

// ============================================================================
// VERB CONJUGATION TESTS
// ============================================================================

describe("transformToGerund", () => {
  describe("pronoun + modal patterns", () => {
    it("transforms 'I will analyze' to 'Analyzing'", () => {
      expect(transformToGerund("I will analyze the data")).toBe(
        "Analyzing the data"
      );
    });

    it("transforms 'We are checking' to 'Checking'", () => {
      expect(transformToGerund("We are checking the schema")).toBe(
        "Checking the schema"
      );
    });

    it("transforms 'I am building' to 'Building'", () => {
      expect(transformToGerund("I am building the component")).toBe(
        "Building the component"
      );
    });

    it("transforms 'I should create' to 'Creating'", () => {
      expect(transformToGerund("I should create a new function")).toBe(
        "Creating a new function"
      );
    });

    it("transforms 'We need to optimize' to 'Optimizing'", () => {
      expect(transformToGerund("We need to optimize performance")).toBe(
        "Optimizing performance"
      );
    });

    it("transforms 'I have to validate' to 'Validating'", () => {
      expect(transformToGerund("I have to validate the input")).toBe(
        "Validating the input"
      );
    });

    it("handles unknown verbs with auto-generated -ing form", () => {
      // "customprocess" is not in our map
      const result = transformToGerund("I will customprocess the data");
      expect(result).toContain("ing");
    });
  });

  describe("let me/let's patterns", () => {
    it("transforms 'Let me analyze' to 'Analyzing'", () => {
      expect(transformToGerund("Let me analyze this carefully")).toBe(
        "Analyzing this carefully"
      );
    });

    it("transforms 'Let's check' to 'Checking'", () => {
      expect(transformToGerund("Let's check the requirements")).toBe(
        "Checking the requirements"
      );
    });
  });

  describe("imperative patterns", () => {
    it("transforms 'Analyze the schema' to 'Analyzing the schema'", () => {
      expect(transformToGerund("Analyze the schema")).toBe(
        "Analyzing the schema"
      );
    });

    it("transforms 'Create a new component' to 'Creating a new component'", () => {
      expect(transformToGerund("Create a new component")).toBe(
        "Creating a new component"
      );
    });

    it("transforms 'Review this code' to 'Reviewing this code'", () => {
      expect(transformToGerund("Review this code")).toBe("Reviewing this code");
    });

    it("transforms 'Build the UI' to 'Building the UI'", () => {
      expect(transformToGerund("Build the UI")).toBe("Building the UI");
    });
  });

  describe("edge cases", () => {
    it("preserves already-gerund text", () => {
      expect(transformToGerund("Analyzing the database")).toBe(
        "Analyzing the database"
      );
    });

    it("handles mixed case input", () => {
      expect(transformToGerund("ANALYZE the data")).toBe("ANALYZE the data");
    });

    it("handles single word unchanged (no article pattern)", () => {
      // Single word without article doesn't match transformation patterns
      expect(transformToGerund("Analyze")).toBe("Analyze");
    });
  });
});

// ============================================================================
// PATTERN DETECTION TESTS
// ============================================================================

describe("looksLikeCode", () => {
  it("detects JavaScript keywords", () => {
    expect(looksLikeCode("const foo = 123")).toBe(true);
    expect(looksLikeCode("function handleClick() {}")).toBe(true);
    expect(looksLikeCode("async function fetchData() {}")).toBe(true);
    expect(looksLikeCode("export default App")).toBe(true);
    expect(looksLikeCode("import React from 'react'")).toBe(true);
    expect(looksLikeCode("return <div>Hello</div>")).toBe(true);
  });

  it("detects brackets and braces", () => {
    expect(looksLikeCode("{ foo: bar }")).toBe(true);
    expect(looksLikeCode("[1, 2, 3]")).toBe(true);
    expect(looksLikeCode("<Component />")).toBe(true);
  });

  it("detects arrow functions", () => {
    expect(looksLikeCode("() => {}")).toBe(true);
    expect(looksLikeCode("const fn = () => result")).toBe(true);
  });

  it("detects JSX closing tags", () => {
    expect(looksLikeCode("</div>")).toBe(true);
    expect(looksLikeCode("</Button>")).toBe(true);
  });

  it("detects semicolons at end", () => {
    expect(looksLikeCode("console.log('hello');")).toBe(true);
  });

  it("detects method calls", () => {
    expect(looksLikeCode("array.map(x => x * 2)")).toBe(true);
    expect(looksLikeCode("document.getElementById('app')")).toBe(true);
  });

  it("does not flag normal sentences", () => {
    expect(looksLikeCode("Analyzing the database schema")).toBe(false);
    expect(looksLikeCode("Building a responsive component")).toBe(false);
    expect(looksLikeCode("Checking requirements carefully")).toBe(false);
  });
});

describe("startsWithFiller", () => {
  it("detects filler phrases", () => {
    expect(startsWithFiller("let me think about this")).toBe(true);
    expect(startsWithFiller("Let's analyze the code")).toBe(true);
    expect(startsWithFiller("I will create a component")).toBe(true);
    expect(startsWithFiller("I'll check the schema")).toBe(true);
    expect(startsWithFiller("I need to validate input")).toBe(true);
    expect(startsWithFiller("okay so let me see")).toBe(true);
    expect(startsWithFiller("So first we need to")).toBe(true);
    expect(startsWithFiller("basically we should")).toBe(true);
    expect(startsWithFiller("Actually, I think")).toBe(true);
  });

  it("does not flag action-oriented text", () => {
    expect(startsWithFiller("Analyzing the schema")).toBe(false);
    expect(startsWithFiller("Building the component")).toBe(false);
    expect(startsWithFiller("Creating a new function")).toBe(false);
  });
});

describe("isNegativeInstruction", () => {
  it("detects negative instructions", () => {
    expect(isNegativeInstruction("Do not use eval")).toBe(true);
    expect(isNegativeInstruction("Don't mutate state")).toBe(true);
    expect(isNegativeInstruction("Avoid using var")).toBe(true);
    expect(isNegativeInstruction("Never modify props")).toBe(true);
    expect(isNegativeInstruction("Must not include secrets")).toBe(true);
  });

  it("detects HTML structure", () => {
    expect(isNegativeInstruction("<!DOCTYPE html>")).toBe(true);
    expect(isNegativeInstruction("<html lang='en'>")).toBe(true);
    expect(isNegativeInstruction("<script src='app.js'>")).toBe(true);
  });

  it("does not flag positive instructions", () => {
    expect(isNegativeInstruction("Create a component")).toBe(false);
    expect(isNegativeInstruction("Use React hooks")).toBe(false);
  });
});

describe("isStateSentence", () => {
  it("detects state sentences", () => {
    expect(isStateSentence("The component is rendering")).toBe(true);
    expect(isStateSentence("There are three options")).toBe(true);
    expect(isStateSentence("It has a bug")).toBe(true);
    expect(isStateSentence("The data was loaded")).toBe(true);
  });

  it("allows sentences with action verbs", () => {
    expect(isStateSentence("It is analyzing the data")).toBe(false);
    expect(isStateSentence("The system is generating output")).toBe(false);
  });

  it("allows questions", () => {
    expect(isStateSentence("What is the issue?")).toBe(false);
  });

  it("does not flag action sentences", () => {
    expect(isStateSentence("Analyzing the schema")).toBe(false);
    expect(isStateSentence("Building the component")).toBe(false);
  });
});

describe("looksLikeData", () => {
  it("detects JSON patterns", () => {
    expect(looksLikeData('"key": "value"')).toBe(true);
    expect(looksLikeData("{ name: 'test' }")).toBe(true);
    expect(looksLikeData("[1, 2, 3]")).toBe(true);
  });

  it("detects trailing commas in structures", () => {
    expect(looksLikeData('"value",}')).toBe(true);
  });

  it("does not flag normal text", () => {
    expect(looksLikeData("Analyzing the database")).toBe(false);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("stripPrefix", () => {
  it("strips label prefixes", () => {
    expect(stripPrefix("Building: the component")).toBe("the component");
    expect(stripPrefix("Analysis: checking data")).toBe("checking data");
  });

  it("strips step prefixes", () => {
    expect(stripPrefix("Step 1: Analyze requirements")).toBe(
      "Analyze requirements"
    );
    expect(stripPrefix("Step 2. Build component")).toBe("Build component");
  });

  it("strips phase prefixes", () => {
    expect(stripPrefix("Phase 1: Setup")).toBe("Setup");
  });

  it("strips numbered list prefixes", () => {
    expect(stripPrefix("1. First item")).toBe("First item");
    expect(stripPrefix("2) Second item")).toBe("Second item");
  });

  it("preserves text without prefixes", () => {
    expect(stripPrefix("Analyzing the schema")).toBe("Analyzing the schema");
  });
});

describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("Short text", 20)).toBe("Short text");
  });

  it("truncates long text with ellipsis", () => {
    const long = "This is a very long piece of text that exceeds the limit";
    expect(truncate(long, 20)).toBe("This is a very lo...");
    expect(truncate(long, 20).length).toBe(20);
  });

  it("handles exact length", () => {
    expect(truncate("Exactly twenty chars", 20)).toBe("Exactly twenty chars");
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe("validateCandidate", () => {
  const config: ExtractionConfig = {
    minLength: 15,
    minWordCount: 3,
    throttleMs: 1500,
    maxLength: 70,
  };

  it("rejects text that is too short", () => {
    const result = validateCandidate("Hi", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("too_short");
  });

  it("rejects text with too few words", () => {
    // Text is long enough (>15 chars) but has only 2 words (minWordCount is 3)
    const result = validateCandidate("Analyzing thoroughly", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("too_few_words");
  });

  it("rejects text without capital letter", () => {
    const result = validateCandidate(
      "analyzing the database schema carefully",
      config
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_capital");
  });

  it("rejects code-like text", () => {
    // Contains method call pattern which triggers code detection
    const result = validateCandidate("Data loaded via array.map(x)", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("looks_like_code");
  });

  it("rejects filler phrases", () => {
    const result = validateCandidate(
      "Let me think about this problem",
      config
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("filler_phrase");
  });

  it("rejects negative instructions", () => {
    const result = validateCandidate(
      "Do not use eval in production",
      config
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("negative_instruction");
  });

  it("rejects state sentences", () => {
    const result = validateCandidate("The component is very complex", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("state_sentence");
  });

  it("rejects text ending with colon", () => {
    // Text doesn't start with filler, has valid length, but ends with colon
    const result = validateCandidate("Requirements for the component:", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("ends_with_colon");
  });

  it("rejects numbered list items", () => {
    const result = validateCandidate("1. First step of the process", config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("numbered_list");
  });

  it("rejects quoted text", () => {
    const result = validateCandidate('"Some quoted text here"', config);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("quoted");
  });

  it("accepts valid action-oriented text", () => {
    const result = validateCandidate(
      "Analyzing the database schema carefully",
      config
    );
    expect(result.valid).toBe(true);
    expect(result.cleaned).toBe("Analyzing the database schema carefully");
  });

  it("transforms and accepts imperative text", () => {
    const result = validateCandidate(
      "Create a new React component for the dashboard",
      config
    );
    expect(result.valid).toBe(true);
    expect(result.cleaned).toBe(
      "Creating a new React component for the dashboard"
    );
  });

  it("strips prefixes before validation", () => {
    // After stripping "Step 1:", text remains "Analyze the responsive layout"
    const result = validateCandidate(
      "Step 1: Analyze the responsive layout component",
      config
    );
    expect(result.valid).toBe(true);
    expect(result.cleaned).toContain("responsive layout");
  });

  it("truncates long valid text", () => {
    const longText =
      "Analyzing the extremely complex and intricate database schema that spans multiple tables and relationships in the system";
    const result = validateCandidate(longText, config);
    expect(result.valid).toBe(true);
    expect(result.cleaned.length).toBeLessThanOrEqual(70);
    expect(result.cleaned.endsWith("...")).toBe(true);
  });
});

// ============================================================================
// MAIN EXTRACTION TESTS
// ============================================================================

describe("extractStatusText", () => {
  let state: ExtractionState;

  beforeEach(() => {
    state = createExtractionState();
  });

  // NOTE: extractStatusText now uses PHASE-BASED detection instead of raw text extraction
  // This prevents the "flashing ticker" issue where rapidly changing text was confusing users.
  // Instead of extracting sentences from raw text, it detects thinking phases and shows
  // stable, semantic messages like "Thinking...", "Analyzing the request...", etc.

  describe("phase detection", () => {
    it("starts with 'Thinking...' phase", () => {
      const text = "Short text without keywords";
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Thinking...");
    });

    it("detects analyzing phase with 'understand' keyword", () => {
      const text = "I need to understand what the user is asking for here.";
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Analyzing the request...");
      expect(result.updated).toBe(true);
    });

    it("detects analyzing phase with 'request' keyword", () => {
      const text = "Looking at the user request to determine requirements.";
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Analyzing the request...");
      expect(result.updated).toBe(true);
    });

    it("detects planning phase when text is long enough and has keywords", () => {
      // Phase progression is forward-only, so we need to simulate:
      // 1. First call advances from 'starting' -> 'analyzing' (needs 50+ chars with keyword)
      // 2. Second call with longer text advances from 'analyzing' -> 'planning'
      const analyzingText = "I need to understand the user request and what they are looking for in this application."; // 50+ chars with keyword
      const result1 = extractStatusText(analyzingText, state);
      expect(result1.text).toBe("Analyzing the request...");

      // Now add planning keywords and enough length (>200 chars)
      const longText = `
        ${analyzingText}
        Now I should plan the approach for implementing this feature.
        I need to structure the component properly with good architecture.
        Let me design the component hierarchy and state management.
      `.repeat(2); // Make it long enough
      const result2 = extractStatusText(longText, result1.state);
      expect(result2.text).toBe("Planning the implementation...");
    });
  });

  describe("code detection", () => {
    it("returns 'Writing code...' for code content", () => {
      const text = `
        function handleClick() {
          setState(prev => prev + 1);
        }
      `;
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Writing code...");
      expect(result.updated).toBe(true);
    });

    it("detects JSX code", () => {
      const text = `
        <Button onClick={handleClick}>
          Click me
        </Button>
      `;
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Writing code...");
    });

    it("detects imports as code", () => {
      const text = "import React from 'react';";
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Writing code...");
    });
  });

  describe("phase progression", () => {
    it("phases progress forward only (never back)", () => {
      // Start at analyzing phase (needs 50+ chars with keyword)
      const text1 = "I need to understand the user request and what they are looking for in this feature.";
      const result1 = extractStatusText(text1, state);
      expect(result1.text).toBe("Analyzing the request...");

      // Even with short text, phase should not go back
      const text2 = "Short text.";
      const result2 = extractStatusText(text2, result1.state);
      expect(result2.text).toBe("Analyzing the request...");
    });
  });

  describe("throttling", () => {
    it("throttles updates when phase stays the same", () => {
      const config = { ...DEFAULT_CONFIG, throttleMs: 5000 };

      // First update triggers analyzing phase (needs 50+ chars with keyword)
      const result1 = extractStatusText(
        "I need to understand this request and determine what the user is looking for in this feature.",
        state,
        config
      );
      expect(result1.text).toBe("Analyzing the request...");
      expect(result1.updated).toBe(true);

      // Second update with same phase should be throttled
      const result2 = extractStatusText(
        "Still understanding the request here and analyzing what components are needed for the application.",
        result1.state,
        config
      );
      expect(result2.updated).toBe(false);
      expect(result2.text).toBe(result1.text);
    });

    it("allows updates when phase changes", () => {
      // Start with analyzing phase (needs 50+ chars with keyword)
      const result1 = extractStatusText(
        "I need to understand this request and determine what the user is looking for in this feature.",
        state
      );
      expect(result1.text).toBe("Analyzing the request...");

      // Long text with planning keywords should advance phase
      // Note: Must use result1.state to continue from 'analyzing' phase
      const longPlanningText = `
        Understanding the request now. Need to plan the approach carefully.
        The structure should be clean and maintainable for the project.
        Let me design the architecture properly with good patterns.
      `.repeat(3);
      const result2 = extractStatusText(longPlanningText, result1.state);
      expect(result2.text).toBe("Planning the implementation...");
      expect(result2.updated).toBe(true);
    });
  });

  describe("fallback behavior", () => {
    it("returns previous state when no valid text found", () => {
      state.lastText = "Previous valid text";
      state.lastUpdateTime = Date.now() - 100; // Recent update

      const text = "{ invalid: json }"; // Only invalid content
      const result = extractStatusText(text, state);
      expect(result.text).toBe("Previous valid text");
      expect(result.updated).toBe(false);
    });

    it("defaults to 'Thinking...' for empty initial state", () => {
      const result = extractStatusText("", state);
      expect(result.text).toBe("Thinking...");
    });
  });

  describe("real-world examples (phase-based)", () => {
    // NOTE: Phase-based ticker returns stable semantic messages instead of raw text
    // to prevent the "flashing" issue where rapidly changing text was confusing users

    it("handles typical GLM reasoning output with phase detection", () => {
      const text = `
        Okay, let me understand what the user is asking for.
        They want a dashboard component with charts.
        I should analyze the requirements first.
        Reviewing the existing component structure to understand patterns.
        Now I'll start building the chart component.
      `;
      const result = extractStatusText(text, state);
      // Phase-based: detects "understand" keyword -> 'analyzing' phase
      expect(result.text).toBe("Analyzing the request...");
      expect(result.updated).toBe(true);
    });

    it("handles mixed code and thinking - phase detection takes priority", () => {
      // Phase detection runs BEFORE code detection in the implementation
      // So when text has both phase keywords AND code, phase detection wins
      const text = `
        I need to understand the user requirements for this component they are building.
        Let me create a state hook for the counter functionality.
        const [count, setCount] = useState(0);
      `;
      const result = extractStatusText(text, state);
      // Phase detection finds "understand" keyword (>50 chars) -> analyzing phase
      // Code detection only runs AFTER phase detection returns false
      expect(result.text).toBe("Analyzing the request...");
    });

    it("handles longer text with phase progression", () => {
      // Phase progression is forward-only, so simulate progressive calls:
      // 1. First text triggers 'analyzing' (needs 50+ chars with keyword)
      const analyzingText = "Requirements analysis is complete. I understand the user needs and what they require for this project.";
      const result1 = extractStatusText(analyzingText, state);
      expect(result1.text).toBe("Analyzing the request...");

      // 2. Longer text with planning keywords advances to 'planning'
      const longText = `
        ${analyzingText}
        Looking at the request to determine what components are required.
        Now let me plan the approach for implementing this feature.
        I need to structure the component properly with good architecture.
        `.repeat(2); // Repeat to exceed minChars threshold
      const result2 = extractStatusText(longText, result1.state);
      expect(result2.text).toBe("Planning the implementation...");
    });
  });
});

// ============================================================================
// EXPORTS TESTS
// ============================================================================

describe("utility exports", () => {
  it("exports verb conjugations map", () => {
    const verbs = getVerbConjugations();
    expect(verbs.analyze).toBe("Analyzing");
    expect(verbs.build).toBe("Building");
    expect(verbs.create).toBe("Creating");
    expect(Object.keys(verbs).length).toBeGreaterThan(100);
  });

  it("exports filler phrases", () => {
    const phrases = getFillerPhrases();
    expect(phrases).toContain("let me");
    expect(phrases).toContain("let's");
    expect(phrases).toContain("i will");
    expect(phrases.length).toBeGreaterThan(30);
  });

  it("exports default config with expected values", () => {
    expect(DEFAULT_CONFIG.minLength).toBe(15);
    expect(DEFAULT_CONFIG.minWordCount).toBe(3); // "Verb Object Modifier" e.g. "Analyzing the schema"
    expect(DEFAULT_CONFIG.throttleMs).toBe(1500);
    expect(DEFAULT_CONFIG.maxLength).toBe(70);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("performance", () => {
  it("extracts status in under 1ms for typical input", () => {
    const state = createExtractionState();
    const text = `
      Analyzing the user requirements for the dashboard.
      Building the React component structure.
      Creating state management with hooks.
    `;

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      extractStatusText(text, state);
    }
    const elapsed = performance.now() - start;

    // Should complete 100 iterations in under 100ms (1ms each)
    expect(elapsed).toBeLessThan(100);
  });

  it("handles large input efficiently", () => {
    const state = createExtractionState();
    const text = "Analyzing the requirements. ".repeat(500);

    const start = performance.now();
    extractStatusText(text, state);
    const elapsed = performance.now() - start;

    // Should complete in under 10ms even with large input
    expect(elapsed).toBeLessThan(10);
  });
});
