#!/usr/bin/env node
/**
 * Synchronizes AGENTS.md from CLAUDE.md
 *
 * This script:
 * 1. Strips <!-- CLAUDE-ONLY-START --> ... <!-- CLAUDE-ONLY-END --> sections
 * 2. Replaces Claude-specific terminology with agent-neutral language
 * 3. Updates the header to indicate auto-generation
 *
 * Usage:
 *   npm run sync:agents           # Generate AGENTS.md
 *   npm run sync:agents:validate  # Check if in sync (for CI/pre-commit)
 *
 * Markers in CLAUDE.md:
 *   <!-- CLAUDE-ONLY-START -->
 *   Content only for Claude Code (hooks, commands, etc.)
 *   <!-- CLAUDE-ONLY-END -->
 */

const fs = require('fs');
const path = require('path');

// Get the project root relative to this script's location
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const CLAUDE_MD = path.join(PROJECT_ROOT, 'CLAUDE.md');
const AGENTS_MD = path.join(PROJECT_ROOT, 'AGENTS.md');

// Pattern to strip Claude-only sections (including the markers and content)
const CLAUDE_ONLY_PATTERN = /<!-- CLAUDE-ONLY-START -->[\s\S]*?<!-- CLAUDE-ONLY-END -->\n?/g;

// Text replacements (Claude-specific -> Agent-neutral)
const REPLACEMENTS = [
  // Header changes
  [/<!-- CLAUDE\.md \| Last updated: (\d{4}-\d{2}-\d{2}) -->/g,
   '<!-- AGENTS.md | Auto-generated from CLAUDE.md | Last synced: $1 -->'],
  [/^# CLAUDE\.md$/m, '# Repository Guidelines for AI Coding Assistants'],

  // Terminology neutralization
  [/This file provides essential guidance to Claude Code\./g,
   'This file provides essential guidance for AI coding assistants (Gemini, Cline, Codex, Cursor, etc.).'],
  [/Claude Code/g, 'AI coding assistants'],

  // Remove hook-related parentheticals (but keep the rest of the content)
  [/\s*\(\[?hook-enforced\]?[^)]*\)/gi, ''],
  [/\s*\(hook blocks\)/gi, ''],

  // Clean up any double spaces left by removals
  [/  +/g, ' '],
];

/**
 * Generate AGENTS.md content from CLAUDE.md
 */
function generateContent() {
  if (!fs.existsSync(CLAUDE_MD)) {
    console.error('❌ CLAUDE.md not found');
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(CLAUDE_MD, 'utf8');
  } catch (err) {
    console.error(`❌ Failed to read CLAUDE.md: ${err.message}`);
    process.exit(1);
  }

  // Strip Claude-only sections
  const strippedCount = (content.match(CLAUDE_ONLY_PATTERN) || []).length;
  content = content.replace(CLAUDE_ONLY_PATTERN, '');

  // Apply text replacements
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }

  // Add auto-generation notice after the title
  content = content.replace(
    /^(# Repository Guidelines for AI Coding Assistants)\n/m,
    '$1\n\n> ⚠️ **Auto-generated from CLAUDE.md** — Do not edit directly. Run `npm run sync:agents` after editing CLAUDE.md.\n'
  );

  // Clean up any leftover empty table rows from stripped content
  content = content.replace(/\n\| *\| *\| *\|\n/g, '\n');

  // Clean up multiple consecutive blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  return { content, strippedCount };
}

/**
 * Write AGENTS.md
 */
function syncAgentsMd() {
  const { content, strippedCount } = generateContent();

  try {
    fs.writeFileSync(AGENTS_MD, content, 'utf8');
  } catch (err) {
    console.error(`❌ Failed to write AGENTS.md: ${err.message}`);
    process.exit(1);
  }

  const lines = content.split('\n').length;
  console.log(`✅ AGENTS.md synchronized from CLAUDE.md`);
  console.log(`   📊 ${lines} lines generated`);
  console.log(`   🔒 ${strippedCount} Claude-only section(s) excluded`);
}

/**
 * Validate that AGENTS.md is in sync with CLAUDE.md
 */
function validateSync() {
  const { content: expected } = generateContent();

  if (!fs.existsSync(AGENTS_MD)) {
    console.error('❌ AGENTS.md does not exist');
    console.error('   Run: npm run sync:agents');
    process.exit(1);
  }

  let actual;
  try {
    actual = fs.readFileSync(AGENTS_MD, 'utf8');
  } catch (err) {
    console.error(`❌ Failed to read AGENTS.md: ${err.message}`);
    process.exit(1);
  }

  if (expected !== actual) {
    console.error('❌ AGENTS.md is out of sync with CLAUDE.md');
    console.error('   Run: npm run sync:agents');
    console.error('   Then: git add AGENTS.md');
    process.exit(1);
  }

  console.log('✅ AGENTS.md is in sync with CLAUDE.md');
}

/**
 * Show diff between current and expected AGENTS.md
 */
function showDiff() {
  const { content: expected } = generateContent();

  if (!fs.existsSync(AGENTS_MD)) {
    console.log('AGENTS.md does not exist. Expected content:');
    console.log(expected);
    return;
  }

  let actual;
  try {
    actual = fs.readFileSync(AGENTS_MD, 'utf8');
  } catch (err) {
    console.error(`❌ Failed to read AGENTS.md: ${err.message}`);
    return;
  }

  if (expected === actual) {
    console.log('No differences found.');
    return;
  }

  // Simple line-by-line diff
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');

  console.log('Differences found:\n');

  const maxLines = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < maxLines; i++) {
    const exp = expectedLines[i] || '';
    const act = actualLines[i] || '';
    if (exp !== act) {
      console.log(`Line ${i + 1}:`);
      console.log(`  - ${act.substring(0, 80)}${act.length > 80 ? '...' : ''}`);
      console.log(`  + ${exp.substring(0, 80)}${exp.length > 80 ? '...' : ''}`);
    }
  }
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--validate') || args.includes('-v')) {
  validateSync();
} else if (args.includes('--diff') || args.includes('-d')) {
  showDiff();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
sync-agents-md.cjs - Synchronize AGENTS.md from CLAUDE.md

Usage:
  node scripts/sync-agents-md.cjs           Generate AGENTS.md
  node scripts/sync-agents-md.cjs --validate  Check if in sync (exit 1 if not)
  node scripts/sync-agents-md.cjs --diff      Show differences
  node scripts/sync-agents-md.cjs --help      Show this help

Markers in CLAUDE.md:
  <!-- CLAUDE-ONLY-START -->
  Content only for Claude Code (hooks, commands, etc.)
  <!-- CLAUDE-ONLY-END -->

These sections will be stripped when generating AGENTS.md.
`);
} else {
  syncAgentsMd();
}
