/**
 * Accessibility Validator for Chat Button Components
 * 
 * Provides utilities and validation functions to ensure accessibility
 * improvements are properly implemented and follow WCAG guidelines.
 */

import { RenderResult } from '@testing-library/react';
import { axe, AxeResults } from 'jest-axe';

// ============================================================================
// Types
// ============================================================================

export interface AccessibilityValidationResult {
  component: string;
  passed: boolean;
  issues: AccessibilityIssue[];
  recommendations: string[];
  score: number; // 0-100
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  element?: string;
  severity: 'critical' | 'moderate' | 'minor';
}

export interface AriaLabelValidation {
  element: HTMLElement;
  hasAriaLabel: boolean;
  labelText: string | null;
  isDescriptive: boolean;
  followsConventions: boolean;
  recommendations: string[];
}

// ============================================================================
// WCAG Guidelines Constants
// ============================================================================

const WCAG_GUIDELINES = {
  MIN_ARIA_LABEL_LENGTH: 10,
  MAX_ARIA_LABEL_LENGTH: 150,
  FORBIDDEN_ARIA_PATTERNS: [
    /^(button|link|click|press)$/i,
    /^(here|this|that)$/i,
    /^(menu|dropdown|toggle)$/i,
  ],
  REQUIRED_PATTERNS: {
    buttons: /^(start|stop|toggle|open|close|save|cancel|submit|retry|dismiss|go to|switch to)/i,
    links: /^(go to|visit|navigate to|open)/i,
    menus: /^(open|show|toggle).*(menu|dropdown|options)/i,
  }
};

const COMPONENT_SPECIFIC_RULES = {
  'research-chat-interface': {
    requiredAriaLabels: [
      'Switch to chat mode',
      'Switch to research mode'
    ],
    buttonRoles: ['button'],
    keyboardNavigation: true,
  },
  'research-progress-panel': {
    requiredAriaLabels: [
      'Start research process',
      'Stop research process', 
      'Retry research process'
    ],
    buttonRoles: ['button'],
    progressIndicators: true,
  },
  'user-menu': {
    requiredAriaLabels: [
      'Open user menu',
      'Go to profile page',
      'Go to settings page',
      'Sign out of account'
    ],
    menuRoles: ['button', 'menuitem'],
    expandedStates: true,
  },
  'vana-sidebar': {
    requiredAriaLabels: [
      'Start new chat conversation',
      'Open settings'
    ],
    navigationRoles: ['link', 'button'],
    landmarkRoles: true,
  },
  'theme-toggle': {
    requiredAriaLabels: [
      'Toggle theme menu'
    ],
    dropdownRoles: ['button', 'menuitem'],
    screenReaderText: ['Toggle theme'],
  }
};

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validates aria-label on a single element
 */
export function validateAriaLabel(element: HTMLElement): AriaLabelValidation {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  
  const hasAriaLabel = Boolean(ariaLabel || ariaLabelledBy);
  const labelText = ariaLabel || null;
  
  const recommendations: string[] = [];
  
  // Check if aria-label exists
  if (!hasAriaLabel) {
    recommendations.push('Add aria-label attribute to improve accessibility');
  }
  
  // Validate label length
  let isDescriptive = true;
  if (labelText) {
    if (labelText.length < WCAG_GUIDELINES.MIN_ARIA_LABEL_LENGTH) {
      isDescriptive = false;
      recommendations.push(`Aria-label should be more descriptive (minimum ${WCAG_GUIDELINES.MIN_ARIA_LABEL_LENGTH} characters)`);
    }
    
    if (labelText.length > WCAG_GUIDELINES.MAX_ARIA_LABEL_LENGTH) {
      isDescriptive = false;
      recommendations.push(`Aria-label should be more concise (maximum ${WCAG_GUIDELINES.MAX_ARIA_LABEL_LENGTH} characters)`);
    }
  }
  
  // Check for forbidden patterns
  let followsConventions = true;
  if (labelText) {
    WCAG_GUIDELINES.FORBIDDEN_ARIA_PATTERNS.forEach(pattern => {
      if (pattern.test(labelText)) {
        followsConventions = false;
        recommendations.push(`Avoid generic terms like "${labelText}". Be more specific about the action.`);
      }
    });
    
    // Check for appropriate action words based on element type
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role') || tagName;
    
    if (role === 'button' && !WCAG_GUIDELINES.REQUIRED_PATTERNS.buttons.test(labelText)) {
      recommendations.push('Button labels should start with action verbs (start, stop, toggle, open, etc.)');
    }
    
    if ((tagName === 'a' || role === 'link') && !WCAG_GUIDELINES.REQUIRED_PATTERNS.links.test(labelText)) {
      recommendations.push('Link labels should indicate destination (go to, navigate to, etc.)');
    }
  }
  
  return {
    element,
    hasAriaLabel,
    labelText,
    isDescriptive,
    followsConventions,
    recommendations
  };
}

/**
 * Validates all interactive elements in a rendered component
 */
export async function validateComponentAccessibility(
  renderResult: RenderResult,
  componentName: string
): Promise<AccessibilityValidationResult> {
  const { container } = renderResult;
  
  // Run axe accessibility audit
  const axeResults = await axe(container);
  
  // Find all interactive elements
  const interactiveElements = container.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="menuitem"]'
  );
  
  const issues: AccessibilityIssue[] = [];
  const recommendations: string[] = [];
  
  // Convert axe violations to our format
  axeResults.violations.forEach(violation => {
    violation.nodes.forEach(node => {
      issues.push({
        type: 'error',
        rule: violation.id,
        message: violation.description,
        element: node.target.join(', '),
        severity: violation.impact as 'critical' | 'moderate' | 'minor' || 'moderate'
      });
    });
  });
  
  // Validate aria-labels on interactive elements
  interactiveElements.forEach((element, index) => {
    const validation = validateAriaLabel(element as HTMLElement);
    
    if (!validation.hasAriaLabel) {
      issues.push({
        type: 'error',
        rule: 'aria-label-missing',
        message: `Interactive element missing aria-label: ${element.tagName}`,
        element: element.outerHTML.substring(0, 100) + '...',
        severity: 'critical'
      });
    }
    
    if (!validation.isDescriptive || !validation.followsConventions) {
      issues.push({
        type: 'warning',
        rule: 'aria-label-quality',
        message: `Aria-label needs improvement: "${validation.labelText}"`,
        element: element.outerHTML.substring(0, 100) + '...',
        severity: 'moderate'
      });
    }
    
    recommendations.push(...validation.recommendations);
  });
  
  // Component-specific validation
  if (COMPONENT_SPECIFIC_RULES[componentName as keyof typeof COMPONENT_SPECIFIC_RULES]) {
    const rules = COMPONENT_SPECIFIC_RULES[componentName as keyof typeof COMPONENT_SPECIFIC_RULES];
    
    // Check for required aria-labels
    rules.requiredAriaLabels.forEach(requiredLabel => {
      const found = Array.from(interactiveElements).some(el => 
        el.getAttribute('aria-label') === requiredLabel
      );
      
      if (!found) {
        issues.push({
          type: 'error',
          rule: 'required-aria-label',
          message: `Missing required aria-label: "${requiredLabel}"`,
          severity: 'critical'
        });
      }
    });
  }
  
  // Calculate score
  const totalTests = interactiveElements.length + axeResults.violations.length;
  const passedTests = totalTests - issues.filter(i => i.type === 'error').length;
  const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 100;
  
  return {
    component: componentName,
    passed: issues.filter(i => i.type === 'error').length === 0,
    issues,
    recommendations: Array.from(new Set(recommendations)), // Remove duplicates
    score
  };
}

/**
 * Validates keyboard navigation on a component
 */
export function validateKeyboardNavigation(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const focusableElements = container.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) {
    return issues;
  }
  
  // Check if elements are focusable
  focusableElements.forEach((element, index) => {
    const tabIndex = element.getAttribute('tabindex');
    
    if (tabIndex === '-1') {
      issues.push({
        type: 'warning',
        rule: 'keyboard-accessibility',
        message: 'Element not focusable via keyboard',
        element: element.tagName,
        severity: 'moderate'
      });
    }
  });
  
  return issues;
}

/**
 * Validates focus indicators
 */
export function validateFocusIndicators(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const focusableElements = container.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  // This is a simplified check - in a real implementation, you'd check computed styles
  focusableElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element as Element);
    const hasFocusStyles = computedStyle.outline !== 'none' || 
                          computedStyle.boxShadow !== 'none' ||
                          computedStyle.border !== 'none';
    
    if (!hasFocusStyles) {
      issues.push({
        type: 'warning',
        rule: 'focus-indicators',
        message: 'Element may lack visible focus indicators',
        element: element.tagName,
        severity: 'moderate'
      });
    }
  });
  
  return issues;
}

/**
 * Generates a comprehensive accessibility report
 */
export function generateAccessibilityReport(results: AccessibilityValidationResult[]): string {
  let report = `# Accessibility Validation Report\n\n`;
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  
  const totalComponents = results.length;
  const passedComponents = results.filter(r => r.passed).length;
  const overallScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / totalComponents
  );
  
  report += `## Summary\n`;
  report += `- **Components Tested**: ${totalComponents}\n`;
  report += `- **Components Passed**: ${passedComponents}\n`;
  report += `- **Overall Score**: ${overallScore}/100\n\n`;
  
  report += `## Component Results\n\n`;
  
  results.forEach(result => {
    report += `### ${result.component}\n`;
    report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Score**: ${result.score}/100\n`;
    
    if (result.issues.length > 0) {
      report += `- **Issues**: ${result.issues.length}\n\n`;
      
      result.issues.forEach(issue => {
        const emoji = issue.severity === 'critical' ? '🔴' : 
                     issue.severity === 'moderate' ? '🟡' : '🔵';
        report += `  ${emoji} **${issue.rule}**: ${issue.message}\n`;
        if (issue.element) {
          report += `     _Element_: ${issue.element}\n`;
        }
      });
    }
    
    if (result.recommendations.length > 0) {
      report += `\n**Recommendations**:\n`;
      result.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }
    
    report += `\n---\n\n`;
  });
  
  return report;
}

/**
 * Best practices checker
 */
export function checkBestPractices(element: HTMLElement): string[] {
  const recommendations: string[] = [];
  
  // Check for redundant role attributes
  const role = element.getAttribute('role');
  const tagName = element.tagName.toLowerCase();
  
  if (role === tagName) {
    recommendations.push(`Remove redundant role="${role}" from ${tagName} element`);
  }
  
  // Check for empty aria-labels
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel === '') {
    recommendations.push('Remove empty aria-label or provide descriptive text');
  }
  
  // Check for aria-labelledby without corresponding element
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const referencedElement = document.getElementById(ariaLabelledBy);
    if (!referencedElement) {
      recommendations.push(`aria-labelledby references non-existent element: ${ariaLabelledBy}`);
    }
  }
  
  return recommendations;
}

// ============================================================================
// Export utilities
// ============================================================================

export default {
  validateAriaLabel,
  validateComponentAccessibility,
  validateKeyboardNavigation,
  validateFocusIndicators,
  generateAccessibilityReport,
  checkBestPractices,
  WCAG_GUIDELINES,
  COMPONENT_SPECIFIC_RULES
};