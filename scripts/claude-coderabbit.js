#!/usr/bin/env node
/**
 * Claude Code helper function for triggering CodeRabbit CLI
 * Usage in Claude Code: node scripts/claude-coderabbit.js [mode]
 */

const { spawn } = require('child_process');
const path = require('path');

// Available modes
const MODES = {
  interactive: 'Interactive Review (full UI)',
  plain: 'Plain Text Review (non-interactive)',
  prompt: 'Prompt Only (show AI prompts)',
  uncommitted: 'Uncommitted Changes Only',
  committed: 'Committed Changes Only',
  config: 'Custom Config (uses CLAUDE.md)'
};

function showHelp() {
  console.log('🐰 CodeRabbit CLI Helper for Claude Code\n');
  console.log('Available modes:');
  Object.entries(MODES).forEach(([mode, description]) => {
    console.log(`  ${mode.padEnd(12)} - ${description}`);
  });
  console.log('\nUsage: node scripts/claude-coderabbit.js [mode]');
  console.log('Example: node scripts/claude-coderabbit.js plain\n');
}

function runCodeRabbit(mode = 'plain') {
  // Validate mode
  if (!MODES[mode]) {
    console.error(`❌ Error: Unknown mode '${mode}'\n`);
    showHelp();
    process.exit(1);
  }

  console.log(`🐰 Launching CodeRabbit: ${MODES[mode]}`);
  console.log(`📂 Working directory: ${process.cwd()}\n`);

  // Run the shell script
  const scriptPath = path.join(__dirname, 'coderabbit-helper.sh');
  const child = spawn('bash', [scriptPath, mode], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ CodeRabbit analysis complete!');
    } else {
      console.log(`\n❌ CodeRabbit exited with code ${code}`);
    }
  });

  child.on('error', (error) => {
    console.error(`❌ Failed to start CodeRabbit: ${error.message}`);
    console.log('\n💡 Fallback: Please run CodeRabbit manually in your terminal:');
    console.log(`   coderabbit${mode === 'plain' ? ' --plain' : ''}`);
  });
}

// Main execution
const mode = process.argv[2];

if (mode === '--help' || mode === '-h') {
  showHelp();
} else {
  runCodeRabbit(mode);
}