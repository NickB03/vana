#!/usr/bin/env node

/**
 * Test script to verify system prompt inline loading
 *
 * This simulates what happens in the Edge Function to ensure
 * the prompt loads correctly and template substitution works.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simulate Deno.readTextFile by reading the inline TypeScript file
const promptFilePath = join(__dirname, '../supabase/functions/_shared/system-prompt-inline.ts');
const fileContent = readFileSync(promptFilePath, 'utf8');

// Extract the template constant
const templateMatch = fileContent.match(/export const SYSTEM_PROMPT_TEMPLATE = `([\s\S]+?)`;/);
if (!templateMatch) {
  console.error('❌ Failed to extract SYSTEM_PROMPT_TEMPLATE from file');
  process.exit(1);
}

const template = templateMatch[1];

// Test template substitution (same logic as in the function)
function getSystemInstruction(params = {}) {
  const {
    fullArtifactContext = '',
    currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } = params;

  return template
    .replace(/\{\{CURRENT_DATE\}\}/g, currentDate)
    .replace(/\{\{FULL_ARTIFACT_CONTEXT\}\}/g, fullArtifactContext);
}

// Run tests
console.log('🧪 Testing system prompt inline loading...\n');

// Test 1: Basic loading
try {
  const prompt1 = getSystemInstruction();
  console.log('✅ Test 1 PASSED: Basic prompt loading');
  console.log(`   Prompt length: ${prompt1.length} characters`);
} catch (error) {
  console.error('❌ Test 1 FAILED:', error.message);
  process.exit(1);
}

// Test 2: Date substitution
try {
  const prompt2 = getSystemInstruction();
  if (prompt2.includes('{{CURRENT_DATE}}')) {
    throw new Error('Date placeholder not replaced');
  }
  if (!prompt2.match(/The current date is \w+, \w+ \d+, \d{4}/)) {
    throw new Error('Date format incorrect');
  }
  console.log('✅ Test 2 PASSED: Date substitution works');
} catch (error) {
  console.error('❌ Test 2 FAILED:', error.message);
  process.exit(1);
}

// Test 3: Artifact context substitution
try {
  const testContext = 'TEST_CONTEXT_VALUE';
  const prompt3 = getSystemInstruction({ fullArtifactContext: testContext });
  if (prompt3.includes('{{FULL_ARTIFACT_CONTEXT}}')) {
    throw new Error('Artifact context placeholder not replaced');
  }
  if (!prompt3.includes(testContext)) {
    throw new Error('Artifact context not present in output');
  }
  console.log('✅ Test 3 PASSED: Artifact context substitution works');
} catch (error) {
  console.error('❌ Test 3 FAILED:', error.message);
  process.exit(1);
}

// Test 4: Key content verification
try {
  const prompt4 = getSystemInstruction();
  const requiredContent = [
    '🚨🚨🚨 CRITICAL RULE',
    'NEVER EVER import from @/components/ui/',
    'Radix UI primitives',
    'Artifact Creation',
    'CRITICAL Browser Storage Restriction',
    'Response Style'
  ];

  for (const content of requiredContent) {
    if (!prompt4.includes(content)) {
      throw new Error(`Missing required content: "${content}"`);
    }
  }
  console.log('✅ Test 4 PASSED: All required content sections present');
} catch (error) {
  console.error('❌ Test 4 FAILED:', error.message);
  process.exit(1);
}

// Test 5: No file path references
try {
  const prompt5 = getSystemInstruction();
  if (fileContent.includes('Deno.readTextFile') || fileContent.includes('new URL')) {
    throw new Error('getSystemInstruction function still uses file loading');
  }
  console.log('✅ Test 5 PASSED: No file loading dependencies');
} catch (error) {
  console.error('❌ Test 5 FAILED:', error.message);
  process.exit(1);
}

// Summary
console.log('\n✨ All tests passed! System prompt inline loading is working correctly.');
console.log('\n📊 Summary:');
console.log(`   - Prompt template size: ${template.length} characters`);
console.log(`   - Generated prompt size: ${getSystemInstruction().length} characters`);
console.log(`   - No external file dependencies`);
console.log(`   - Ready for deployment to Edge Functions`);
