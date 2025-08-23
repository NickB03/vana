#!/usr/bin/env node

/**
 * Simple CodeRabbit Suggestion Apply Script
 * Directly applies CodeRabbit's code suggestions from PR comments
 * This is the reliable, straightforward approach for immediate fixes
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Extract code suggestions from CodeRabbit comments
 */
function extractCodeSuggestions(comment) {
  const suggestions = [];
  
  // Pattern 1: Suggestion blocks with file paths
  const suggestionPattern = /```suggestion:?([^\n]*)\n([\s\S]*?)```/g;
  let match;
  
  while ((match = suggestionPattern.exec(comment)) !== null) {
    const meta = match[1].trim();
    const code = match[2];
    
    // Try to extract file path from context
    const filePattern = /(?:File|file|In|in|At|at)?\s*[`"]?([\/\w-]+\.(py|ts|tsx|js|jsx))[`"]?:?\s*(?:line)?\s*(\d+)?/i;
    const fileMatch = comment.substring(Math.max(0, match.index - 200), match.index).match(filePattern);
    
    if (fileMatch) {
      suggestions.push({
        file: fileMatch[1],
        line: fileMatch[3] ? parseInt(fileMatch[3]) : null,
        code: code,
        meta: meta,
        confidence: 0.9
      });
    }
  }
  
  // Pattern 2: Direct code replacements
  const replacePattern = /Replace:?\s*```([^\n]*)\n([\s\S]*?)```\s*(?:with|With):?\s*```([^\n]*)\n([\s\S]*?)```/gi;
  
  while ((match = replacePattern.exec(comment)) !== null) {
    const oldCode = match[2];
    const newCode = match[4];
    
    // Find file context
    const filePattern = /(?:File|file|In|in|At|at)?\s*[`"]?([\/\w-]+\.(py|ts|tsx|js|jsx))[`"]?/i;
    const fileMatch = comment.substring(Math.max(0, match.index - 200), match.index).match(filePattern);
    
    if (fileMatch) {
      suggestions.push({
        file: fileMatch[1],
        oldCode: oldCode.trim(),
        newCode: newCode.trim(),
        confidence: 0.95
      });
    }
  }
  
  // Pattern 3: Inline suggestions
  const inlinePattern = /(?:File|file):\s*([\/\w-]+\.(py|ts|tsx|js|jsx))[\s\S]*?(?:Line|line)?\s*(\d+)?[\s\S]*?```([^\n]*)\n([\s\S]*?)```/gi;
  
  while ((match = inlinePattern.exec(comment)) !== null) {
    suggestions.push({
      file: match[1],
      line: match[3] ? parseInt(match[3]) : null,
      code: match[5],
      lang: match[4],
      confidence: 0.85
    });
  }
  
  return suggestions;
}

/**
 * Apply a suggestion to a file
 */
async function applySuggestion(suggestion) {
  try {
    const fileContent = await fs.readFile(suggestion.file, 'utf8');
    let newContent = fileContent;
    
    if (suggestion.oldCode && suggestion.newCode) {
      // Direct replacement
      if (fileContent.includes(suggestion.oldCode)) {
        newContent = fileContent.replace(suggestion.oldCode, suggestion.newCode);
        await fs.writeFile(suggestion.file, newContent);
        return {
          success: true,
          message: `Replaced code in ${suggestion.file}`
        };
      } else {
        return {
          success: false,
          message: `Could not find exact match in ${suggestion.file}`
        };
      }
    } else if (suggestion.line && suggestion.code) {
      // Line-based replacement
      const lines = fileContent.split('\n');
      
      if (suggestion.line <= lines.length) {
        // Replace the specific line or insert after it
        lines[suggestion.line - 1] = suggestion.code;
        newContent = lines.join('\n');
        await fs.writeFile(suggestion.file, newContent);
        return {
          success: true,
          message: `Updated line ${suggestion.line} in ${suggestion.file}`
        };
      } else {
        return {
          success: false,
          message: `Line ${suggestion.line} out of range in ${suggestion.file}`
        };
      }
    } else if (suggestion.code) {
      // Append suggestion as comment for manual review
      newContent = fileContent + `\n\n// CodeRabbit Suggestion (confidence: ${suggestion.confidence}):\n// ${suggestion.code}\n`;
      await fs.writeFile(suggestion.file, newContent);
      return {
        success: true,
        message: `Added suggestion as comment to ${suggestion.file}`
      };
    }
    
    return {
      success: false,
      message: `Could not determine how to apply suggestion to ${suggestion.file}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error applying to ${suggestion.file}: ${error.message}`
    };
  }
}

/**
 * Get CodeRabbit comments from a PR
 */
async function getCodeRabbitComments(owner, repo, prNumber) {
  try {
    // Get issue comments
    const { data: issueComments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });
    
    // Get review comments
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber
    });
    
    // Filter for CodeRabbit comments
    const coderabbitComments = [
      ...issueComments.filter(c => c.user.login === 'coderabbitai' || c.user.login === 'coderabbitai[bot]'),
      ...reviewComments.filter(c => c.user.login === 'coderabbitai' || c.user.login === 'coderabbitai[bot]')
    ];
    
    return coderabbitComments;
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  const owner = process.argv[2];
  const repo = process.argv[3];
  const prNumber = parseInt(process.argv[4]);
  
  if (!owner || !repo || !prNumber) {
    console.error('Usage: node coderabbit-simple-apply.js <owner> <repo> <pr-number>');
    console.error('Note: GITHUB_TOKEN environment variable must be set');
    process.exit(1);
  }
  
  console.log(`🐰 Fetching CodeRabbit suggestions from PR #${prNumber}...`);
  
  try {
    // Get CodeRabbit comments
    const comments = await getCodeRabbitComments(owner, repo, prNumber);
    console.log(`  Found ${comments.length} CodeRabbit comments`);
    
    // Extract all suggestions
    const allSuggestions = [];
    for (const comment of comments) {
      const suggestions = extractCodeSuggestions(comment.body);
      allSuggestions.push(...suggestions);
    }
    
    console.log(`  Extracted ${allSuggestions.length} code suggestions`);
    
    // Filter high-confidence suggestions
    const highConfidence = allSuggestions.filter(s => s.confidence >= 0.85);
    console.log(`  ${highConfidence.length} high-confidence suggestions (≥85%)`);
    
    if (highConfidence.length === 0) {
      console.log('  No high-confidence suggestions to apply');
      process.exit(0);
    }
    
    // Apply suggestions
    const results = {
      applied: [],
      failed: []
    };
    
    for (const suggestion of highConfidence) {
      console.log(`  Applying suggestion to ${suggestion.file}...`);
      const result = await applySuggestion(suggestion);
      
      if (result.success) {
        results.applied.push(result.message);
        console.log(`    ✅ ${result.message}`);
      } else {
        results.failed.push(result.message);
        console.log(`    ⚠️ ${result.message}`);
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`  ✅ Applied: ${results.applied.length}`);
    console.log(`  ⚠️ Failed: ${results.failed.length}`);
    
    // Commit if changes were made
    if (results.applied.length > 0) {
      console.log('\n📝 Creating commit...');
      
      try {
        await execAsync('git add -A');
        await execAsync(`git commit -m "🤖 Apply CodeRabbit suggestions from PR #${prNumber}

Applied ${results.applied.length} suggestions:
${results.applied.map(msg => `- ${msg}`).join('\n')}

Source: CodeRabbit review comments
Confidence threshold: 85%"`);
        
        console.log('✅ Commit created successfully');
        console.log('\n💡 Next steps:');
        console.log('  1. Review the changes: git diff HEAD~1');
        console.log('  2. Push to update PR: git push');
        console.log('  3. Request new review: @coderabbitai review');
      } catch (error) {
        console.log('ℹ️ Could not create commit:', error.message);
      }
    }
    
    process.exit(results.failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  extractCodeSuggestions,
  applySuggestion,
  getCodeRabbitComments
};