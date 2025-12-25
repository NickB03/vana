/**
 * Model Configuration Stability Tests
 *
 * **Purpose:** Prevent accidental changes to production model names
 *
 * **How it works:**
 * 1. Maintains a "golden snapshot" of expected model names (model-config.snapshot.json)
 * 2. Tests fail if config.ts models don't match the snapshot
 * 3. Forces developers to explicitly update the snapshot when changing models
 *
 * **When tests fail:**
 * - If change was ACCIDENTAL: Revert your changes to config.ts
 * - If change was INTENTIONAL: Update model-config.snapshot.json to match
 *
 * @module model-config.test
 * @since 2025-11-15
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MODELS } from "../config.ts";

interface ModelSnapshot {
  description: string;
  version: string;
  models: Record<string, string>;
  instructions: {
    purpose: string;
    howToUpdate: string;
    testingStrategy: string;
  };
}

/**
 * Test: Model names match golden snapshot (prevents accidental changes)
 *
 * ⚠️ CRITICAL TEST - DO NOT SKIP
 *
 * This test ensures model names are not accidentally changed during development.
 * Changing model names can break production even if the new model exists.
 */
Deno.test("Model Config - Names match golden snapshot (regression prevention)", async () => {
  console.log("\n🔒 CRITICAL: Verifying model configuration stability...\n");

  // Load golden snapshot
  const snapshotPath = new URL("./model-config.snapshot.json", import.meta.url).pathname;
  const snapshotText = await Deno.readTextFile(snapshotPath);
  const snapshot: ModelSnapshot = JSON.parse(snapshotText);

  console.log(`📸 Loaded snapshot version: ${snapshot.version}`);
  console.log(`📋 Snapshot description: ${snapshot.description}\n`);

  // Compare each model
  let hasChanges = false;
  const differences: string[] = [];

  for (const [key, expectedValue] of Object.entries(snapshot.models)) {
    const actualValue = MODELS[key as keyof typeof MODELS];

    console.log(`   • ${key}:`);
    console.log(`     Expected: ${expectedValue}`);
    console.log(`     Actual:   ${actualValue || "(MISSING)"}`);

    if (!actualValue) {
      hasChanges = true;
      differences.push(`❌ ${key}: MISSING in config.ts (expected: ${expectedValue})`);
      console.log(`     ❌ MISSING\n`);
    } else if (actualValue !== expectedValue) {
      hasChanges = true;
      differences.push(
        `❌ ${key}: Changed from "${expectedValue}" to "${actualValue}"`
      );
      console.log(`     ❌ CHANGED\n`);
    } else {
      console.log(`     ✅ OK\n`);
    }
  }

  // Check for new models not in snapshot
  for (const key of Object.keys(MODELS)) {
    if (!(key in snapshot.models)) {
      hasChanges = true;
      differences.push(`⚠️  ${key}: NEW model "${MODELS[key as keyof typeof MODELS]}" not in snapshot`);
    }
  }

  if (hasChanges) {
    console.log("\n⚠️  MODEL CONFIGURATION HAS CHANGED!\n");
    console.log("Differences found:\n");
    differences.forEach((diff) => console.log(`   ${diff}`));
    console.log("\n" + "=".repeat(70));
    console.log("🔧 HOW TO FIX:");
    console.log("=".repeat(70));
    console.log("\n1️⃣  If this change was ACCIDENTAL:");
    console.log("   → Revert your changes to supabase/functions/_shared/config.ts");
    console.log("\n2️⃣  If this change was INTENTIONAL:");
    console.log("   → Update supabase/functions/_shared/__tests__/model-config.snapshot.json");
    console.log("   → Update the 'version' field to today's date");
    console.log("   → Update the 'models' object to match config.ts");
    console.log("   → Document the reason for the change in your commit message");
    console.log("\n" + "=".repeat(70) + "\n");

    throw new Error(
      `Model configuration does not match snapshot. ${differences.length} difference(s) found. See console output above for details.`
    );
  }

  console.log("✅ Model configuration matches snapshot - no accidental changes\n");
});

/**
 * Test: No hardcoded model names in critical files
 *
 * Ensures all model names go through MODELS config for centralized control
 */
Deno.test("Model Config - No hardcoded model names in Edge Functions", async () => {
  console.log("\n🔍 Scanning for hardcoded model names...\n");

  const modelPatterns = [
    // Match OpenRouter model IDs: provider/model-name
    /['"](?:google|moonshotai|anthropic|openai)\/[a-z0-9\-.]+['"]/gi,
  ];

  const allowedFiles = new Set([
    "config.ts",
    "model-config.test.ts",
    "model-config.snapshot.json",
    "model-validation.test.ts",
  ]);

  const filesToScan = [
    "../reasoning-types.ts",
    "../openrouter-client.ts",
    "../../chat/index.ts",
    "../../generate-artifact/index.ts",
    "../../generate-artifact-fix/index.ts",
    "../../generate-title/index.ts",
    "../../summarize-conversation/index.ts",
  ];

  const violations: Array<{ file: string; line: number; match: string }> = [];

  for (const relPath of filesToScan) {
    const filePath = new URL(relPath, import.meta.url).pathname;
    const fileName = relPath.split("/").pop()!;

    try {
      const content = await Deno.readTextFile(filePath);

      for (const pattern of modelPatterns) {
        const matches = Array.from(content.matchAll(pattern));

        for (const match of matches) {
          // Get context around the match
          const startIdx = Math.max(0, match.index! - 100);
          const endIdx = Math.min(content.length, match.index! + 100);
          const context = content.slice(startIdx, endIdx);

          // Allow if it's importing or using MODELS from config
          if (
            context.includes("from '../_shared/config") ||
            context.includes("from \"../_shared/config") ||
            context.includes("MODELS.") ||
            context.includes("import { MODELS }")
          ) {
            continue;
          }

          // Allow if it's just a comment or documentation
          const lineStart = content.lastIndexOf("\n", match.index!) + 1;
          const lineEnd = content.indexOf("\n", match.index!);
          const line = content.slice(lineStart, lineEnd);
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
            continue;
          }

          const lineNumber = content.slice(0, match.index).split("\n").length;
          violations.push({
            file: fileName,
            line: lineNumber,
            match: match[0],
          });
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  if (violations.length > 0) {
    console.log("❌ Found hardcoded model names:\n");
    violations.forEach(({ file, line, match }) => {
      console.log(`   • ${file}:${line} → ${match}`);
    });
    console.log("\n💡 Solution: Import MODELS from '../_shared/config.ts' and use:");
    console.log("   • MODELS.GEMINI_FLASH");
    console.log("   • MODELS.GLM_4_6");
    console.log("   • MODELS.GEMINI_FLASH_IMAGE\n");

    throw new Error(`Found ${violations.length} hardcoded model name(s)`);
  }

  console.log("✅ No hardcoded model names - all using centralized config\n");
});

/**
 * Test: Snapshot file is valid JSON and well-formed
 */
Deno.test("Model Config - Snapshot file is valid and complete", async () => {
  console.log("\n🔍 Validating snapshot file structure...\n");

  const snapshotPath = new URL("./model-config.snapshot.json", import.meta.url).pathname;
  const snapshotText = await Deno.readTextFile(snapshotPath);
  const snapshot: ModelSnapshot = JSON.parse(snapshotText);

  // Validate required fields
  assertExists(snapshot.description, "Snapshot should have description");
  assertExists(snapshot.version, "Snapshot should have version");
  assertExists(snapshot.models, "Snapshot should have models");
  assertExists(snapshot.instructions, "Snapshot should have instructions");

  console.log(`   • Description: ✓`);
  console.log(`   • Version: ${snapshot.version} ✓`);
  console.log(`   • Models: ${Object.keys(snapshot.models).length} entries ✓`);
  console.log(`   • Instructions: ✓`);

  // Validate all models are non-empty strings
  for (const [key, value] of Object.entries(snapshot.models)) {
    assertEquals(
      typeof value,
      "string",
      `Model ${key} should be a string`
    );
    assertEquals(
      value.length > 0,
      true,
      `Model ${key} should not be empty`
    );
    assertEquals(
      value.includes("/"),
      true,
      `Model ${key} should be in format "provider/model-name"`
    );
  }

  console.log("\n✅ Snapshot file is valid and well-formed\n");
});

/**
 * Test: Config exports expected model keys
 */
Deno.test("Model Config - All required model keys exist", () => {
  console.log("\n🔍 Verifying required model keys...\n");

  const requiredKeys = ["GEMINI_FLASH", "GLM_4_6", "GEMINI_FLASH_IMAGE"];

  for (const key of requiredKeys) {
    const value = MODELS[key as keyof typeof MODELS];
    assertExists(value, `Required model key ${key} should exist`);
    console.log(`   • ${key}: ${value} ✓`);
  }

  console.log("\n✅ All required model keys present\n");
});
