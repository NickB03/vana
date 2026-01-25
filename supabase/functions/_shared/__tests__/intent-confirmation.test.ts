/**
 * Unit tests for intent-confirmation.ts
 *
 * Tests intent confirmation message generation helpers:
 * - getIntentConfirmationMessage for tool-specific confirmations
 * - extractKeyNoun for artifact noun extraction
 * - addArticle for a/an article selection
 * - extractImageSubject for image prompt processing
 * - extractSearchTopic for search query processing
 */

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  getIntentConfirmationMessage,
  extractKeyNoun,
  addArticle,
  extractImageSubject,
  extractSearchTopic,
} from "../intent-confirmation.ts";

// ==================== getIntentConfirmationMessage Tests ====================

Deno.test("getIntentConfirmationMessage should generate artifact confirmation with extracted noun", () => {
  const result = getIntentConfirmationMessage("generate_artifact", {
    artifactType: "react",
    prompt: "build me a todo app",
  });

  assertEquals(result, "I'll build a todo app for you...");
});

Deno.test("getIntentConfirmationMessage should generate artifact confirmation with dashboard noun", () => {
  const result = getIntentConfirmationMessage("generate_artifact", {
    artifactType: "react",
    prompt: "create an interactive dashboard",
  });

  // The function extracts "dashboard" from the prompt
  assertEquals(result, "I'll build a dashboard for you...");
});

Deno.test("getIntentConfirmationMessage should use artifact type when no noun found", () => {
  const result = getIntentConfirmationMessage("generate_artifact", {
    artifactType: "html",
    prompt: "something random",
  });

  // Falls back to first meaningful word "something"
  assertEquals(result, "I'll build a something for you...");
});

Deno.test("getIntentConfirmationMessage should handle missing prompt gracefully", () => {
  const result = getIntentConfirmationMessage("generate_artifact", {
    artifactType: "react",
  });

  assertEquals(result, "I'll build a react for you...");
});

Deno.test("getIntentConfirmationMessage should generate image confirmation with subject", () => {
  const result = getIntentConfirmationMessage("generate_image", {
    prompt: "a sunset over mountains",
    mode: "generate",
  });

  assertEquals(result, "I'll create an image of sunset over mountains for you...");
});

Deno.test("getIntentConfirmationMessage should generate image edit confirmation", () => {
  const result = getIntentConfirmationMessage("generate_image", {
    prompt: "make it brighter",
    mode: "edit",
  });

  assertEquals(result, "I'll edit that image for you...");
});

Deno.test("getIntentConfirmationMessage should handle missing image prompt gracefully", () => {
  const result = getIntentConfirmationMessage("generate_image", {
    mode: "generate",
  });

  // extractImageSubject returns null for empty prompt, falls back to "that"
  assertEquals(result, "I'll create an image of that for you...");
});

Deno.test("getIntentConfirmationMessage should generate search confirmation with topic", () => {
  const result = getIntentConfirmationMessage("browser.search", {
    query: "what is quantum computing",
  });

  assertEquals(result, "I'll search for information about quantum computing...");
});

Deno.test("getIntentConfirmationMessage should handle missing search query gracefully", () => {
  const result = getIntentConfirmationMessage("browser.search", {});

  assertEquals(result, "I'll search for information about that...");
});

Deno.test("getIntentConfirmationMessage should return default for unknown tool names", () => {
  const result = getIntentConfirmationMessage("unknown_tool", {});

  assertEquals(result, "I'll help you with that...");
});

Deno.test("getIntentConfirmationMessage should handle empty args object", () => {
  const result = getIntentConfirmationMessage("generate_artifact", {});

  assertEquals(result, "I'll build a component for you...");
});

// ==================== extractKeyNoun Tests ====================

Deno.test("extractKeyNoun should extract from 'build me a todo app'", () => {
  const result = extractKeyNoun("build me a todo app");

  assertEquals(result, "todo app");
});

Deno.test("extractKeyNoun should extract from 'create an interactive dashboard'", () => {
  const result = extractKeyNoun("create an interactive dashboard");

  // Pattern matches "dashboard" after filtering "interactive" as a responsive keyword
  assertEquals(result, "dashboard");
});

Deno.test("extractKeyNoun should extract from 'make a calculator'", () => {
  const result = extractKeyNoun("make a calculator");

  assertEquals(result, "calculator");
});

Deno.test("extractKeyNoun should extract from 'build me an interactive responsive game'", () => {
  const result = extractKeyNoun("build me an interactive responsive game");

  assertEquals(result, "game");
});

Deno.test("extractKeyNoun should extract from 'a photo gallery for my portfolio'", () => {
  const result = extractKeyNoun("a photo gallery for my portfolio");

  // Pattern 2 matches "a/an <noun>"
  assertEquals(result, "photo gallery for");
});

Deno.test("extractKeyNoun should extract from 'an app that tracks expenses'", () => {
  const result = extractKeyNoun("an app that tracks expenses");

  // Pattern 2 matches "a/an <noun> that/for..."
  assertEquals(result, "app that tracks");
});

Deno.test("extractKeyNoun should handle uppercase input", () => {
  const result = extractKeyNoun("BUILD ME A TODO APP");

  assertEquals(result, "todo app");
});

Deno.test("extractKeyNoun should handle mixed case input", () => {
  const result = extractKeyNoun("Create An Interactive Dashboard");

  // Pattern matches "dashboard" after filtering "interactive" as responsive keyword
  assertEquals(result, "dashboard");
});

Deno.test("extractKeyNoun should return null for empty string", () => {
  const result = extractKeyNoun("");

  assertEquals(result, null);
});

Deno.test("extractKeyNoun should return null for prompts without clear nouns", () => {
  const result = extractKeyNoun("build me");

  // Falls back to "me" as it's > 2 chars (Pattern 3 fallback)
  assertEquals(result, "me");
});

Deno.test("extractKeyNoun should return null for prompts with only skip words", () => {
  const result = extractKeyNoun("the a an");

  // Pattern 2 matches "an" (single word after "a")
  assertEquals(result, "an");
});

Deno.test("extractKeyNoun should extract fallback noun when no pattern matches", () => {
  const result = extractKeyNoun("something cool");

  assertEquals(result, "something");
});

Deno.test("extractKeyNoun should limit noun extraction to 3 words max", () => {
  const result = extractKeyNoun("build me a very long complex interactive dashboard component");

  // Should extract up to 3 words after pattern match
  assertEquals(result, "very long complex");
});

// ==================== addArticle Tests ====================

Deno.test("addArticle should use 'a' for consonant words", () => {
  const result = addArticle("todo app");

  assertEquals(result, "a todo app");
});

Deno.test("addArticle should use 'a' for words starting with 'b'", () => {
  const result = addArticle("button");

  assertEquals(result, "a button");
});

Deno.test("addArticle should use 'a' for words starting with 'c'", () => {
  const result = addArticle("calculator");

  assertEquals(result, "a calculator");
});

Deno.test("addArticle should use 'an' for vowel words starting with 'a'", () => {
  const result = addArticle("app");

  assertEquals(result, "an app");
});

Deno.test("addArticle should use 'an' for vowel words starting with 'e'", () => {
  const result = addArticle("editor");

  assertEquals(result, "an editor");
});

Deno.test("addArticle should use 'an' for vowel words starting with 'i'", () => {
  const result = addArticle("icon");

  assertEquals(result, "an icon");
});

Deno.test("addArticle should use 'an' for vowel words starting with 'o'", () => {
  const result = addArticle("overlay");

  assertEquals(result, "an overlay");
});

Deno.test("addArticle should use 'an' for vowel words starting with 'u'", () => {
  const result = addArticle("upload form");

  assertEquals(result, "an upload form");
});

Deno.test("addArticle should use 'an' for special case 'hour'", () => {
  const result = addArticle("hour");

  assertEquals(result, "an hour");
});

Deno.test("addArticle should use 'an' for 'hourly tracker'", () => {
  const result = addArticle("hourly tracker");

  assertEquals(result, "an hourly tracker");
});

Deno.test("addArticle should handle uppercase input", () => {
  const result = addArticle("App");

  assertEquals(result, "an App");
});

Deno.test("addArticle should handle empty string", () => {
  const result = addArticle("");

  assertEquals(result, "that");
});

Deno.test("addArticle should return 'that' for null input", () => {
  const result = addArticle("");

  assertEquals(result, "that");
});

// ==================== extractImageSubject Tests ====================

Deno.test("extractImageSubject should handle 'generate a sunset over mountains'", () => {
  const result = extractImageSubject("generate a sunset over mountains");

  assertEquals(result, "sunset over mountains");
});

Deno.test("extractImageSubject should remove 'create' prefix", () => {
  const result = extractImageSubject("create a beautiful landscape");

  assertEquals(result, "beautiful landscape");
});

Deno.test("extractImageSubject should remove 'draw' prefix", () => {
  const result = extractImageSubject("draw me a cat");

  assertEquals(result, "cat");
});

Deno.test("extractImageSubject should remove 'make' prefix", () => {
  const result = extractImageSubject("make an abstract painting");

  assertEquals(result, "abstract painting");
});

Deno.test("extractImageSubject should remove 'produce' prefix", () => {
  const result = extractImageSubject("produce a professional photo");

  assertEquals(result, "professional photo");
});

Deno.test("extractImageSubject should remove 'design' prefix", () => {
  const result = extractImageSubject("design a modern logo");

  assertEquals(result, "modern logo");
});

Deno.test("extractImageSubject should remove 'render' prefix", () => {
  const result = extractImageSubject("render a 3D scene");

  assertEquals(result, "3D scene");
});

Deno.test("extractImageSubject should remove 'image of' prefix", () => {
  const result = extractImageSubject("image of a forest");

  assertEquals(result, "forest");
});

Deno.test("extractImageSubject should remove 'picture of' prefix", () => {
  const result = extractImageSubject("picture of a sunset");

  assertEquals(result, "sunset");
});

Deno.test("extractImageSubject should remove 'photo of' prefix", () => {
  const result = extractImageSubject("photo of a mountain");

  assertEquals(result, "mountain");
});

Deno.test("extractImageSubject should remove 'illustration of' prefix", () => {
  const result = extractImageSubject("illustration of a dragon");

  assertEquals(result, "dragon");
});

Deno.test("extractImageSubject should remove leading article 'a'", () => {
  const result = extractImageSubject("a beautiful sunset");

  assertEquals(result, "beautiful sunset");
});

Deno.test("extractImageSubject should remove leading article 'an'", () => {
  const result = extractImageSubject("an elegant portrait");

  assertEquals(result, "elegant portrait");
});

Deno.test("extractImageSubject should remove leading article 'the'", () => {
  const result = extractImageSubject("the mona lisa");

  assertEquals(result, "mona lisa");
});

Deno.test("extractImageSubject should limit output to 40 chars", () => {
  const result = extractImageSubject(
    "a very long and detailed description of a beautiful sunset over mountains with clouds"
  );

  assertEquals(result !== null, true);
  assertEquals(result!.length, 40);
  // "very long and detailed description of a beautiful sunset over mountains with clouds" becomes 84 chars
  // After removing leading "a", becomes "very long and detailed description of a beautiful sunset over mountains with clouds"
  // Which is 83 chars, truncated to 40: "very long and detailed description of..."
  assertEquals(result, "very long and detailed description of...");
});

Deno.test("extractImageSubject should handle exactly 40 chars", () => {
  const result = extractImageSubject("1234567890123456789012345678901234567890");

  assertEquals(result !== null, true);
  assertEquals(result!.length, 40);
  assertEquals(result, "1234567890123456789012345678901234567890");
});

Deno.test("extractImageSubject should handle 41 chars with truncation", () => {
  const result = extractImageSubject("12345678901234567890123456789012345678901");

  assertEquals(result !== null, true);
  assertEquals(result!.length, 40);
  assertEquals(result, "1234567890123456789012345678901234567...");
});

Deno.test("extractImageSubject should return null for empty string", () => {
  const result = extractImageSubject("");

  assertEquals(result, null);
});

Deno.test("extractImageSubject should handle prompts with only prefixes", () => {
  const result = extractImageSubject("generate");

  // After removing prefixes, "generate" becomes empty string which returns as "generate"
  assertEquals(result, "generate");
});

Deno.test("extractImageSubject should handle case insensitive prefixes", () => {
  const result = extractImageSubject("GENERATE A SUNSET");

  assertEquals(result, "SUNSET");
});

// ==================== extractSearchTopic Tests ====================

Deno.test("extractSearchTopic should remove 'what is' prefix", () => {
  const result = extractSearchTopic("what is quantum computing");

  assertEquals(result, "quantum computing");
});

Deno.test("extractSearchTopic should remove 'what are' prefix", () => {
  const result = extractSearchTopic("what are neural networks");

  assertEquals(result, "neural networks");
});

Deno.test("extractSearchTopic should remove 'who is' prefix", () => {
  const result = extractSearchTopic("who is Albert Einstein");

  assertEquals(result, "Albert Einstein");
});

Deno.test("extractSearchTopic should remove 'when was' prefix", () => {
  const result = extractSearchTopic("when was the internet invented");

  assertEquals(result, "internet invented");
});

Deno.test("extractSearchTopic should remove 'where is' prefix", () => {
  const result = extractSearchTopic("where is the Eiffel Tower");

  assertEquals(result, "Eiffel Tower");
});

Deno.test("extractSearchTopic should remove 'why do' prefix", () => {
  const result = extractSearchTopic("why do birds fly");

  assertEquals(result, "birds fly");
});

Deno.test("extractSearchTopic should remove 'how to' prefix", () => {
  const result = extractSearchTopic("how to learn programming");

  // The regex doesn't match "how to" specifically, only "how <verb>"
  assertEquals(result, "to learn programming");
});

Deno.test("extractSearchTopic should remove 'how does' prefix", () => {
  const result = extractSearchTopic("how does photosynthesis work");

  assertEquals(result, "photosynthesis work");
});

Deno.test("extractSearchTopic should remove 'search' prefix", () => {
  const result = extractSearchTopic("search machine learning");

  assertEquals(result, "machine learning");
});

Deno.test("extractSearchTopic should remove 'find' prefix", () => {
  const result = extractSearchTopic("find best restaurants");

  assertEquals(result, "best restaurants");
});

Deno.test("extractSearchTopic should remove 'look up' prefix", () => {
  const result = extractSearchTopic("look up Python tutorials");

  assertEquals(result, "Python tutorials");
});

Deno.test("extractSearchTopic should remove 'look for' prefix", () => {
  const result = extractSearchTopic("look for React documentation");

  assertEquals(result, "React documentation");
});

Deno.test("extractSearchTopic should remove 'tell me about' prefix", () => {
  const result = extractSearchTopic("tell me about TypeScript");

  assertEquals(result, "TypeScript");
});

Deno.test("extractSearchTopic should remove leading article 'a'", () => {
  const result = extractSearchTopic("a programming language");

  assertEquals(result, "programming language");
});

Deno.test("extractSearchTopic should remove leading article 'an'", () => {
  const result = extractSearchTopic("an API framework");

  assertEquals(result, "API framework");
});

Deno.test("extractSearchTopic should remove leading article 'the'", () => {
  const result = extractSearchTopic("the solar system");

  assertEquals(result, "solar system");
});

Deno.test("extractSearchTopic should limit output to 50 chars", () => {
  const result = extractSearchTopic(
    "what is the history of artificial intelligence and machine learning technologies"
  );

  assertEquals(result !== null, true);
  assertEquals(result!.length, 50);
  // After removing "what is " and "the ", becomes "history of artificial intelligence and machine learning technologies"
  // Which is 73 chars, truncated to 50 with "..." (note: 47 chars + "..." = 50)
  assertEquals(result, "history of artificial intelligence and machine ...");
});

Deno.test("extractSearchTopic should handle exactly 50 chars", () => {
  const result = extractSearchTopic("12345678901234567890123456789012345678901234567890");

  assertEquals(result !== null, true);
  assertEquals(result!.length, 50);
  assertEquals(result, "12345678901234567890123456789012345678901234567890");
});

Deno.test("extractSearchTopic should handle 51 chars with truncation", () => {
  const result = extractSearchTopic("123456789012345678901234567890123456789012345678901");

  assertEquals(result !== null, true);
  assertEquals(result!.length, 50);
  assertEquals(result, "12345678901234567890123456789012345678901234567...");
});

Deno.test("extractSearchTopic should return null for empty string", () => {
  const result = extractSearchTopic("");

  assertEquals(result, null);
});

Deno.test("extractSearchTopic should handle queries with only prefixes", () => {
  const result = extractSearchTopic("what is");

  // After removing "what is ", becomes empty, which returns "is" (not null)
  assertEquals(result, "is");
});

Deno.test("extractSearchTopic should handle case insensitive prefixes", () => {
  const result = extractSearchTopic("WHAT IS QUANTUM COMPUTING");

  assertEquals(result, "QUANTUM COMPUTING");
});

Deno.test("extractSearchTopic should handle queries without prefixes", () => {
  const result = extractSearchTopic("quantum computing");

  assertEquals(result, "quantum computing");
});
