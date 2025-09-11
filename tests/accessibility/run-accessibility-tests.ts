#!/usr/bin/env tsx
/**
 * Accessibility Test Runner
 * 
 * Runs comprehensive accessibility tests on all chat button components
 * and generates a detailed report of findings and recommendations.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import AccessibilityValidator, { 
  AccessibilityValidationResult,
  generateAccessibilityReport
} from './accessibility-validator';

const execAsync = promisify(exec);

// ============================================================================
// Configuration
// ============================================================================

const TEST_CONFIG = {
  outputDir: path.join(process.cwd(), 'tests', 'accessibility', 'reports'),
  testFile: path.join(process.cwd(), 'tests', 'accessibility', 'accessibility-chat-buttons.test.tsx'),
  components: [
    'research-chat-interface',
    'research-progress-panel', 
    'user-menu',
    'vana-sidebar',
    'theme-toggle'
  ]
};

// ============================================================================
// Test Runner Functions
// ============================================================================

/**
 * Ensures output directory exists
 */
function ensureOutputDirectory(): void {
  if (!fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
  }
}

/**
 * Runs Jest tests for accessibility
 */
async function runAccessibilityTests(): Promise<{ success: boolean; output: string }> {
  try {
    console.log('🧪 Running accessibility tests...');
    
    const { stdout, stderr } = await execAsync(
      `npx jest ${TEST_CONFIG.testFile} --verbose --json`,
      { 
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );
    
    return {
      success: true,
      output: stdout || stderr
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message
    };
  }
}

/**
 * Parses Jest JSON output to extract test results
 */
function parseJestResults(output: string): any {
  try {
    // Extract JSON from Jest output
    const lines = output.split('\n');
    const jsonLine = lines.find(line => line.trim().startsWith('{'));
    
    if (jsonLine) {
      return JSON.parse(jsonLine);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse Jest output:', error);
    return null;
  }
}

/**
 * Creates a manual accessibility validation for components
 */
async function performManualValidation(): Promise<AccessibilityValidationResult[]> {
  const results: AccessibilityValidationResult[] = [];
  
  console.log('🔍 Performing manual accessibility validation...');
  
  // Since we can't directly render components in Node.js, we'll analyze the source files
  for (const componentName of TEST_CONFIG.components) {
    try {
      const result = await validateComponentFromSource(componentName);
      results.push(result);
      console.log(`✅ Validated ${componentName}: Score ${result.score}/100`);
    } catch (error) {
      console.error(`❌ Failed to validate ${componentName}:`, error);
      
      results.push({
        component: componentName,
        passed: false,
        issues: [{
          type: 'error',
          rule: 'validation-error',
          message: `Failed to validate component: ${error}`,
          severity: 'critical'
        }],
        recommendations: ['Fix component validation errors'],
        score: 0
      });
    }
  }
  
  return results;
}

/**
 * Validates a component by analyzing its source code
 */
async function validateComponentFromSource(componentName: string): Promise<AccessibilityValidationResult> {
  // Map component names to file paths
  const componentPaths: Record<string, string> = {
    'research-chat-interface': 'frontend/components/research/research-chat-interface.tsx',
    'research-progress-panel': 'frontend/components/research/research-progress-panel.tsx',
    'user-menu': 'frontend/components/auth/user-menu.tsx',
    'vana-sidebar': 'frontend/components/vana-sidebar.tsx',
    'theme-toggle': 'frontend/components/theme-toggle.tsx'
  };
  
  const componentPath = path.join(process.cwd(), componentPaths[componentName]);
  
  if (!fs.existsSync(componentPath)) {
    throw new Error(`Component file not found: ${componentPath}`);
  }
  
  const sourceCode = fs.readFileSync(componentPath, 'utf-8');
  
  // Analyze source code for accessibility patterns
  const issues = analyzeSourceForAccessibility(sourceCode, componentName);
  const recommendations = generateRecommendations(sourceCode, componentName);
  
  // Calculate score based on findings
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));
  
  return {
    component: componentName,
    passed: errorCount === 0,
    issues,
    recommendations,
    score
  };
}

/**
 * Analyzes source code for accessibility issues
 */
function analyzeSourceForAccessibility(sourceCode: string, componentName: string): any[] {
  const issues: any[] = [];
  
  // Check for aria-label patterns
  const ariaLabelMatches = sourceCode.match(/aria-label=["']([^"']+)["']/g) || [];
  const expectedLabels = AccessibilityValidator.COMPONENT_SPECIFIC_RULES[componentName as keyof typeof AccessibilityValidator.COMPONENT_SPECIFIC_RULES]?.requiredAriaLabels || [];
  
  // Check if expected aria-labels are present
  expectedLabels.forEach(expectedLabel => {
    const found = ariaLabelMatches.some(match => match.includes(expectedLabel));
    if (!found) {
      issues.push({
        type: 'error',
        rule: 'missing-aria-label',
        message: `Missing expected aria-label: "${expectedLabel}"`,
        severity: 'critical'
      });
    }
  });
  
  // Check for button elements without aria-labels
  const buttonMatches = sourceCode.match(/<button[^>]*>/g) || [];
  buttonMatches.forEach(buttonMatch => {
    if (!buttonMatch.includes('aria-label') && !buttonMatch.includes('aria-labelledby')) {
      issues.push({
        type: 'warning',
        rule: 'button-missing-label',
        message: 'Button element may be missing accessibility label',
        element: buttonMatch,
        severity: 'moderate'
      });
    }
  });
  
  // Check for generic aria-labels
  ariaLabelMatches.forEach(match => {
    const labelText = match.match(/aria-label=["']([^"']+)["']/)?.[1];
    if (labelText && AccessibilityValidator.WCAG_GUIDELINES.FORBIDDEN_ARIA_PATTERNS.some(pattern => pattern.test(labelText))) {
      issues.push({
        type: 'warning',
        rule: 'generic-aria-label',
        message: `Generic aria-label should be more descriptive: "${labelText}"`,
        severity: 'moderate'
      });
    }
  });
  
  // Check for keyboard event handlers
  const hasKeyboardHandlers = sourceCode.includes('onKeyDown') || 
                              sourceCode.includes('onKeyUp') || 
                              sourceCode.includes('onKeyPress');
  
  if (!hasKeyboardHandlers && (sourceCode.includes('onClick') || sourceCode.includes('onMouseDown'))) {
    issues.push({
      type: 'warning',
      rule: 'keyboard-accessibility',
      message: 'Interactive elements should support keyboard navigation',
      severity: 'moderate'
    });
  }
  
  return issues;
}

/**
 * Generates recommendations based on source code analysis
 */
function generateRecommendations(sourceCode: string, componentName: string): string[] {
  const recommendations: string[] = [];
  
  // Check for screen reader text
  if (!sourceCode.includes('sr-only') && !sourceCode.includes('screen-reader')) {
    recommendations.push('Consider adding screen reader only text for better context');
  }
  
  // Check for focus management
  if (sourceCode.includes('useState') && !sourceCode.includes('focus()')) {
    recommendations.push('Consider implementing focus management for dynamic content');
  }
  
  // Check for ARIA expanded states
  if (sourceCode.includes('dropdown') || sourceCode.includes('menu')) {
    if (!sourceCode.includes('aria-expanded')) {
      recommendations.push('Add aria-expanded attribute for dropdown/menu states');
    }
  }
  
  // Component-specific recommendations
  switch (componentName) {
    case 'research-chat-interface':
      if (!sourceCode.includes('role=')) {
        recommendations.push('Consider adding appropriate ARIA roles for better semantic structure');
      }
      break;
    
    case 'research-progress-panel':
      if (!sourceCode.includes('aria-live') && !sourceCode.includes('aria-atomic')) {
        recommendations.push('Consider adding live regions for progress updates');
      }
      break;
    
    case 'user-menu':
      if (!sourceCode.includes('aria-haspopup')) {
        recommendations.push('Add aria-haspopup attribute to menu trigger button');
      }
      break;
  }
  
  return recommendations;
}

/**
 * Generates HTML report
 */
function generateHTMLReport(results: AccessibilityValidationResult[]): string {
  const timestamp = new Date().toISOString();
  const overallScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length
  );
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .score {
      font-size: 3em;
      font-weight: bold;
      color: ${overallScore >= 90 ? '#22c55e' : overallScore >= 70 ? '#f59e0b' : '#ef4444'};
    }
    .component-card {
      margin: 20px 0;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
    }
    .component-header {
      padding: 15px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .component-title {
      font-size: 1.2em;
      font-weight: 600;
      margin: 0;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .passed { background: #dcfce7; color: #166534; }
    .failed { background: #fee2e2; color: #991b1b; }
    .component-content {
      padding: 20px;
    }
    .issues-list {
      margin: 15px 0;
    }
    .issue {
      margin: 10px 0;
      padding: 10px;
      border-radius: 4px;
      border-left: 4px solid;
    }
    .issue.error { background: #fef2f2; border-left-color: #ef4444; }
    .issue.warning { background: #fffbeb; border-left-color: #f59e0b; }
    .issue.info { background: #eff6ff; border-left-color: #3b82f6; }
    .recommendations {
      margin-top: 20px;
      padding: 15px;
      background: #f0f9ff;
      border-radius: 4px;
    }
    .timestamp {
      text-align: center;
      color: #6b7280;
      font-size: 0.9em;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Accessibility Test Report</h1>
      <div class="score">${overallScore}/100</div>
      <p>Overall accessibility score across all components</p>
    </div>

    ${results.map(result => `
      <div class="component-card">
        <div class="component-header">
          <h2 class="component-title">${result.component}</h2>
          <span class="status-badge ${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✅ PASSED' : '❌ FAILED'} (${result.score}/100)
          </span>
        </div>
        <div class="component-content">
          ${result.issues.length > 0 ? `
            <h3>Issues Found (${result.issues.length})</h3>
            <div class="issues-list">
              ${result.issues.map(issue => `
                <div class="issue ${issue.type}">
                  <strong>${issue.rule}</strong>: ${issue.message}
                  ${issue.element ? `<br><small>Element: <code>${issue.element}</code></small>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p>✅ No accessibility issues found!</p>'}
          
          ${result.recommendations.length > 0 ? `
            <div class="recommendations">
              <h3>Recommendations</h3>
              <ul>
                ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')}

    <div class="timestamp">
      Report generated on ${new Date(timestamp).toLocaleString()}
    </div>
  </div>
</body>
</html>`;
  
  return html;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Accessibility Test Runner\n');
  
  // Ensure output directory exists
  ensureOutputDirectory();
  
  try {
    // Run Jest tests
    const testResults = await runAccessibilityTests();
    
    if (testResults.success) {
      console.log('✅ Jest tests completed successfully\n');
    } else {
      console.log('⚠️  Jest tests had issues, proceeding with manual validation\n');
    }
    
    // Perform manual validation
    const validationResults = await performManualValidation();
    
    // Generate reports
    console.log('\n📄 Generating reports...');
    
    // Markdown report
    const markdownReport = generateAccessibilityReport(validationResults);
    const markdownPath = path.join(TEST_CONFIG.outputDir, `accessibility-report-${Date.now()}.md`);
    fs.writeFileSync(markdownPath, markdownReport);
    console.log(`📝 Markdown report saved: ${markdownPath}`);
    
    // HTML report
    const htmlReport = generateHTMLReport(validationResults);
    const htmlPath = path.join(TEST_CONFIG.outputDir, `accessibility-report-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`🌐 HTML report saved: ${htmlPath}`);
    
    // JSON report for CI/CD
    const jsonReport = {
      timestamp: new Date().toISOString(),
      overallScore: Math.round(
        validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length
      ),
      results: validationResults,
      testOutput: testResults.output
    };
    const jsonPath = path.join(TEST_CONFIG.outputDir, `accessibility-report-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📊 JSON report saved: ${jsonPath}`);
    
    // Summary
    const passedComponents = validationResults.filter(r => r.passed).length;
    const overallScore = jsonReport.overallScore;
    
    console.log('\n📊 Summary:');
    console.log(`Components tested: ${validationResults.length}`);
    console.log(`Components passed: ${passedComponents}`);
    console.log(`Overall score: ${overallScore}/100`);
    
    if (overallScore >= 90) {
      console.log('🎉 Excellent accessibility score!');
    } else if (overallScore >= 70) {
      console.log('⚠️  Good accessibility score, but room for improvement');
    } else {
      console.log('❌ Accessibility needs significant improvement');
    }
    
    // Exit with appropriate code
    process.exit(overallScore >= 70 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runAccessibilityTests };