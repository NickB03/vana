import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { transformToGerund, stripTitlePrefix } from "../title-transformer.ts";

Deno.test("transformToGerund - pronoun + modal patterns", async (t) => {
    await t.step("transforms 'I will analyze' to 'Analyzing'", () => {
        assertEquals(transformToGerund("I will analyze the data"), "Analyzing the data");
    });

    await t.step("transforms 'We are checking' to 'Checking'", () => {
        assertEquals(transformToGerund("We are checking the schema"), "Checking the schema");
    });

    await t.step("transforms 'I am building' to 'Building'", () => {
        assertEquals(transformToGerund("I am building the component"), "Building the component");
    });

    await t.step("transforms 'I should create' to 'Creating'", () => {
        assertEquals(transformToGerund("I should create a new function"), "Creating a new function");
    });

    await t.step("transforms 'We need to optimize' to 'Optimizing'", () => {
        assertEquals(transformToGerund("We need to optimize performance"), "Optimizing performance");
    });

    await t.step("transforms 'I have to validate' to 'Validating'", () => {
        assertEquals(transformToGerund("I have to validate the input"), "Validating the input");
    });

    await t.step("handles unknown verbs with auto-generated -ing form", () => {
        const result = transformToGerund("I will customprocess the data");
        assertStringIncludes(result, "ing");
    });
});

Deno.test("transformToGerund - let me/let's patterns", async (t) => {
    await t.step("transforms 'Let me analyze' to 'Analyzing'", () => {
        assertEquals(transformToGerund("Let me analyze this carefully"), "Analyzing this carefully");
    });

    await t.step("transforms 'Let's check' to 'Checking'", () => {
        assertEquals(transformToGerund("Let's check the requirements"), "Checking the requirements");
    });
});

Deno.test("transformToGerund - imperative patterns", async (t) => {
    await t.step("transforms 'Analyze the schema' to 'Analyzing the schema'", () => {
        assertEquals(transformToGerund("Analyze the schema"), "Analyzing the schema");
    });

    await t.step("transforms 'Create a new component' to 'Creating a new component'", () => {
        assertEquals(transformToGerund("Create a new component"), "Creating a new component");
    });

    await t.step("transforms 'Review this code' to 'Reviewing this code'", () => {
        assertEquals(transformToGerund("Review this code"), "Reviewing this code");
    });

    await t.step("transforms 'Build the UI' to 'Building the UI'", () => {
        assertEquals(transformToGerund("Build the UI"), "Building the UI");
    });
});

Deno.test("transformToGerund - edge cases", async (t) => {
    await t.step("preserves already-gerund text", () => {
        assertEquals(transformToGerund("Analyzing the database"), "Analyzing the database");
    });

    await t.step("handles mixed case input", () => {
        assertEquals(transformToGerund("ANALYZE the data"), "ANALYZE the data");
    });

    await t.step("handles single word unchanged (no article pattern)", () => {
        assertEquals(transformToGerund("Analyze"), "Analyze");
    });

    await t.step("returns original text when no transformation is available", () => {
        // "Zlorping" is not in VERB_CONJUGATIONS, autoGerund should handle it if it matches pattern
        // But here we test a sentence that doesn't match any pattern
        assertEquals(transformToGerund("The data is complex"), "The data is complex");
    });

    await t.step("is idempotent - running twice produces same result", () => {
        const input = "I will analyze the schema";
        const first = transformToGerund(input);
        const second = transformToGerund(first);
        assertEquals(second, first); // "Analyzing the schema"
    });
});

Deno.test("transformToGerund - GLM-specific patterns", async (t) => {
    await t.step("handles GLM-specific phrasings", () => {
        assertEquals(transformToGerund("Let me craft the component"), "Crafting the component");
        assertEquals(transformToGerund("I shall devise a solution"), "Devising a solution");
        assertEquals(transformToGerund("We are constructing the API"), "Constructing the API");
    });
});

Deno.test("stripTitlePrefix", async (t) => {
    await t.step("strips label prefixes", () => {
        assertEquals(stripTitlePrefix("Building: the component"), "the component");
        assertEquals(stripTitlePrefix("Analysis: checking data"), "checking data");
    });

    await t.step("strips step prefixes", () => {
        assertEquals(stripTitlePrefix("Step 1: Analyze requirements"), "Analyze requirements");
        assertEquals(stripTitlePrefix("Step 2. Build component"), "Build component");
    });

    await t.step("strips phase prefixes", () => {
        assertEquals(stripTitlePrefix("Phase 1: Setup"), "Setup");
    });

    await t.step("strips section prefixes", () => {
        assertEquals(stripTitlePrefix("Section 1: Setup"), "Setup");
    });

    await t.step("strips numbered list prefixes", () => {
        assertEquals(stripTitlePrefix("1. First item"), "First item");
        assertEquals(stripTitlePrefix("2) Second item"), "Second item");
    });

    await t.step("preserves text without prefixes", () => {
        assertEquals(stripTitlePrefix("Analyzing the schema"), "Analyzing the schema");
    });
});

Deno.test("performance", async (t) => {
    await t.step("transforms 1000 titles in under 50ms", () => {
        const inputs = Array(1000).fill("I will analyze the database schema");
        const start = performance.now();
        inputs.forEach(input => transformToGerund(input));
        const elapsed = performance.now() - start;
        // 50ms is a generous upper bound, usually it's < 5ms
        assertEquals(elapsed < 50, true, `Expected < 50ms, got ${elapsed}ms`);
    });
});
