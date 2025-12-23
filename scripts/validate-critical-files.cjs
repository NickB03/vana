#!/usr/bin/env node

/**
 * Validates critical files to prevent corruption during AI-assisted cleanups
 * This script checks that essential files contain valid content, not git errors or command output
 */

const fs = require('fs');
const path = require('path');

// Define critical files and their validation rules
const CRITICAL_FILES = {
  'index.html': {
    mustContain: ['<!doctype html>', '<html', '</html>'],
    mustNotContain: ['fatal:', 'error:', 'does not exist in', 'no such file'],
    minLength: 1000, // index.html should be at least 1KB
    description: 'Main HTML entry point'
  },
  'package.json': {
    mustContain: ['"name":', '"version":', '"scripts":'],
    mustNotContain: ['fatal:', 'error:'],
    minLength: 100,
    description: 'Package configuration'
  },
  'vite.config.ts': {
    mustContain: ['defineConfig', 'export default'],
    mustNotContain: ['fatal:', 'error:'],
    minLength: 200,
    description: 'Vite configuration'
  },
  'tsconfig.json': {
    mustContain: ['"compilerOptions":'],
    mustNotContain: ['fatal:', 'error:'],
    minLength: 50,
    description: 'TypeScript configuration'
  }
};

let hasErrors = false;

console.log('🔍 Validating critical files...\n');

for (const [filename, rules] of Object.entries(CRITICAL_FILES)) {
  const filePath = path.join(process.cwd(), filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CRITICAL: ${filename} does not exist!`);
    console.error(`   Description: ${rules.description}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check minimum length
  if (content.length < rules.minLength) {
    console.error(`❌ CRITICAL: ${filename} is too small (${content.length} bytes, expected >${rules.minLength})`);
    console.error(`   This usually means the file was corrupted or truncated`);
    hasErrors = true;
    continue;
  }

  // Check for required content
  const missingContent = rules.mustContain.filter(pattern => !content.includes(pattern));
  if (missingContent.length > 0) {
    console.error(`❌ CRITICAL: ${filename} is missing required content:`);
    console.error(`   Missing: ${missingContent.join(', ')}`);
    console.error(`   First 200 chars: ${content.substring(0, 200)}`);
    hasErrors = true;
    continue;
  }

  // Check for error patterns (git command output)
  const foundErrors = rules.mustNotContain.filter(pattern => content.toLowerCase().includes(pattern.toLowerCase()));
  if (foundErrors.length > 0) {
    console.error(`❌ CRITICAL: ${filename} contains error output:`);
    console.error(`   Found: ${foundErrors.join(', ')}`);
    console.error(`   This file may have been corrupted by a failed git command`);
    console.error(`   First 200 chars: ${content.substring(0, 200)}`);
    hasErrors = true;
    continue;
  }

  console.log(`✅ ${filename} - Valid (${rules.description})`);
}

if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED - Critical files are corrupted!');
  console.error('\n🔧 To fix:');
  console.error('   1. Restore from git: git checkout HEAD -- <filename>');
  console.error('   2. Or from previous commit: git show HEAD~1:<filename> > <filename>');
  console.error('   3. Then re-run this validation');
  process.exit(1);
} else {
  console.log('\n✅ All critical files validated successfully!');
  process.exit(0);
}
