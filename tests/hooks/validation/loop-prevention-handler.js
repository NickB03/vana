#!/usr/bin/env node

/**
 * Loop Prevention Handler - Prevents agents from getting stuck in violation loops
 * 
 * This module provides:
 * 1. Clear violation explanations for agents
 * 2. Step-by-step resolution instructions
 * 3. Loop detection and prevention
 * 4. Alternative approaches when stuck
 */

class LoopPreventionHandler {
  constructor() {
    this.attemptHistory = new Map(); // Track repeated attempts
    this.maxAttempts = 3;
    this.cooldownPeriod = 60000; // 1 minute
  }

  generateAgentGuidance(validationResult, context = {}) {
    const filePath = context.filePath || validationResult.file_path;
    const attemptKey = `${filePath}:${JSON.stringify(validationResult.violations)}`;
    
    // Track attempts to prevent loops
    const attempts = this.trackAttempt(attemptKey);
    
    const guidance = {
      blockingReason: this.generateBlockingExplanation(validationResult),
      stepByStepInstructions: this.generateStepByStepFix(validationResult),
      alternativeApproaches: this.generateAlternatives(validationResult, attempts),
      loopPrevention: this.generateLoopPrevention(attempts),
      agentInstructions: this.generateAgentInstructions(validationResult, attempts),
      exitStrategies: this.generateExitStrategies(validationResult, attempts)
    };

    return guidance;
  }

  trackAttempt(attemptKey) {
    const now = Date.now();
    
    if (!this.attemptHistory.has(attemptKey)) {
      this.attemptHistory.set(attemptKey, []);
    }
    
    const attempts = this.attemptHistory.get(attemptKey);
    
    // Clean up old attempts (outside cooldown period)
    const validAttempts = attempts.filter(time => now - time < this.cooldownPeriod);
    
    // Add current attempt
    validAttempts.push(now);
    this.attemptHistory.set(attemptKey, validAttempts);
    
    return validAttempts.length;
  }

  generateBlockingExplanation(validationResult) {
    const violations = validationResult.violations || [];
    
    let explanation = "🚫 **OPERATION BLOCKED - READ CAREFULLY**\n\n";
    explanation += "**Why this operation was blocked:**\n";
    
    violations.forEach((violation, i) => {
      const category = this.categorizeViolation(violation);
      const reason = this.getViolationReason(category, violation);
      
      explanation += `${i + 1}. **${violation}**\n`;
      explanation += `   - Category: ${category}\n`;
      explanation += `   - Why blocked: ${reason}\n`;
      explanation += `   - Impact: ${this.getViolationImpact(category)}\n\n`;
    });

    explanation += `**Current compliance score: ${validationResult.compliance_score}/100**\n`;
    explanation += "**Required score for approval: 70+**\n\n";
    
    return explanation;
  }

  generateStepByStepFix(validationResult) {
    const violations = validationResult.violations || [];
    
    let instructions = "📋 **STEP-BY-STEP RESOLUTION INSTRUCTIONS**\n\n";
    instructions += "**Follow these steps in order - DO NOT SKIP STEPS:**\n\n";
    
    violations.forEach((violation, i) => {
      const category = this.categorizeViolation(violation);
      const steps = this.getFixSteps(category, violation);
      
      instructions += `**Step ${i + 1}: Fix ${violation}**\n`;
      steps.forEach((step, j) => {
        instructions += `   ${i + 1}.${j + 1} ${step}\n`;
      });
      instructions += "\n";
    });
    
    instructions += `**Step ${violations.length + 1}: Verify Fix**\n`;
    instructions += "   - Save the file\n";
    instructions += "   - The hook system will automatically re-validate\n";
    instructions += "   - If still blocked, check the new error message\n\n";
    
    return instructions;
  }

  generateAlternatives(validationResult, attemptCount) {
    let alternatives = "🔄 **ALTERNATIVE APPROACHES**\n\n";
    
    if (attemptCount >= 2) {
      alternatives += "⚠️ **MULTIPLE ATTEMPTS DETECTED - Consider these alternatives:**\n\n";
      
      alternatives += "**Option 1: Hook Control (Recommended)**\n";
      alternatives += "```bash\n";
      alternatives += "# Temporarily disable hooks for this work\n";
      alternatives += `/hook-disable "Working on ${validationResult.file_path}"\n`;
      alternatives += "# Make your changes\n";
      alternatives += "# Re-enable when done\n";
      alternatives += "/hook-enable\n";
      alternatives += "```\n\n";
      
      alternatives += "**Option 2: Switch to Experimental Mode**\n";
      alternatives += "```bash\n";
      alternatives += "node .claude_workspace/commands/hook-control.js mode experimental\n";
      alternatives += "# Only critical violations will be blocked\n";
      alternatives += "```\n\n";
      
      alternatives += "**Option 3: Create in Different Location**\n";
      alternatives += "- Create the file outside the src/ directory temporarily\n";
      alternatives += "- Fix violations in the temporary location\n";
      alternatives += "- Move to correct location when compliant\n\n";
    }
    
    return alternatives;
  }

  generateLoopPrevention(attemptCount) {
    let prevention = "🔄 **LOOP PREVENTION SYSTEM**\n\n";
    
    prevention += `**Current attempt: ${attemptCount}/${this.maxAttempts}**\n`;
    
    if (attemptCount >= this.maxAttempts) {
      prevention += "🛑 **MAXIMUM ATTEMPTS REACHED**\n\n";
      prevention += "**Automatic loop prevention activated:**\n";
      prevention += "- You've tried to fix this file multiple times\n";
      prevention += "- The same violations are recurring\n";
      prevention += "- This suggests a fundamental approach issue\n\n";
      
      prevention += "**Required Actions:**\n";
      prevention += "1. **STOP** attempting the same fix\n";
      prevention += "2. Use `/hook-disable \"loop prevention\"` to bypass\n";
      prevention += "3. Analyze the root cause\n";
      prevention += "4. Consider a completely different approach\n\n";
    } else {
      prevention += "**Next attempt guidance:**\n";
      prevention += `- You have ${this.maxAttempts - attemptCount} attempts remaining\n`;
      prevention += "- If the same violations occur again, consider alternatives\n";
      prevention += "- Each attempt must show different changes\n\n";
    }
    
    return prevention;
  }

  generateAgentInstructions(validationResult, attemptCount) {
    let instructions = "🤖 **SPECIFIC AGENT INSTRUCTIONS**\n\n";
    
    instructions += "**What you MUST do:**\n";
    instructions += "1. Read and understand each violation completely\n";
    instructions += "2. Follow the step-by-step instructions exactly\n";
    instructions += "3. Make only the specific changes required\n";
    instructions += "4. Do NOT attempt workarounds or alternative implementations\n";
    instructions += "5. Save the file after making changes\n\n";
    
    instructions += "**What you MUST NOT do:**\n";
    instructions += "1. Ignore the violations and try different approaches\n";
    instructions += "2. Make unrelated changes to the file\n";
    instructions += "3. Create new files instead of fixing this one\n";
    instructions += "4. Attempt to bypass the validation\n";
    instructions += "5. Give up without following the instructions\n\n";
    
    if (attemptCount >= 2) {
      instructions += "**⚠️ REPEATED ATTEMPT WARNING:**\n";
      instructions += "- This is attempt #" + attemptCount + "\n";
      instructions += "- The same violations keep occurring\n";
      instructions += "- You MUST try a different approach\n";
      instructions += "- Consider using hook bypass if legitimate work\n\n";
    }
    
    instructions += "**Success Criteria:**\n";
    instructions += "- All violations in the list above must be resolved\n";
    instructions += "- Compliance score must reach 70+\n";
    instructions += "- File must maintain its intended functionality\n";
    instructions += "- No new violations should be introduced\n\n";
    
    return instructions;
  }

  generateExitStrategies(validationResult, attemptCount) {
    let strategies = "🚪 **EXIT STRATEGIES (When Stuck)**\n\n";
    
    strategies += "**If you cannot resolve the violations:**\n\n";
    
    strategies += "**Strategy 1: Bypass for Valid Reasons**\n";
    strategies += "```bash\n";
    strategies += "/hook-disable \"Cannot resolve PRD conflicts with current requirements\"\n";
    strategies += "# Explain the conflict in your response\n";
    strategies += "# Make necessary changes\n";
    strategies += "/hook-enable  # When done\n";
    strategies += "```\n\n";
    
    strategies += "**Strategy 2: Request Clarification**\n";
    strategies += "- Explain the specific violation you cannot resolve\n";
    strategies += "- Ask the user for guidance on the conflict\n";
    strategies += "- Provide the exact error message and file content\n";
    strategies += "- Wait for user input before proceeding\n\n";
    
    strategies += "**Strategy 3: Implement Minimal Compliant Version**\n";
    strategies += "- Create a basic version that meets PRD requirements\n";
    strategies += "- Note what functionality had to be simplified\n";
    strategies += "- Ask user if they want to proceed with limitations\n\n";
    
    if (attemptCount >= this.maxAttempts) {
      strategies += "**🚨 EMERGENCY EXIT (Auto-activated)**\n";
      strategies += "Maximum attempts reached. You MUST:\n";
      strategies += "1. Use `/hook-disable \"loop prevention - need user guidance\"`\n";
      strategies += "2. Explain the situation to the user\n";
      strategies += "3. Ask for specific guidance on how to proceed\n";
      strategies += "4. Do NOT attempt more fixes without user input\n\n";
    }
    
    return strategies;
  }

  categorizeViolation(violation) {
    if (violation.includes('Forbidden UI framework')) return 'forbidden_technology';
    if (violation.includes('Security risk')) return 'security_violation';
    if (violation.includes('performance')) return 'performance_issue';
    if (violation.includes('data-testid')) return 'accessibility_missing';
    return 'unknown_violation';
  }

  getViolationReason(category, violation) {
    const reasons = {
      'forbidden_technology': 'PRD requires only shadcn/ui components for consistency and maintainability',
      'security_violation': 'Creates XSS vulnerabilities that can compromise user security',
      'performance_issue': 'Exceeds performance budgets defined in PRD requirements',
      'accessibility_missing': 'WCAG 2.1 AA compliance required for all interactive elements',
      'unknown_violation': 'Violates project requirements defined in PRD'
    };
    
    return reasons[category] || reasons['unknown_violation'];
  }

  getViolationImpact(category) {
    const impacts = {
      'forbidden_technology': 'Breaks component library consistency, creates maintenance debt',
      'security_violation': 'Potential data breach, XSS attacks, security audit failures',
      'performance_issue': 'Poor user experience, failed performance budgets, SEO impact',
      'accessibility_missing': 'Legal compliance issues, poor user experience for disabled users',
      'unknown_violation': 'Breaks project standards and requirements'
    };
    
    return impacts[category] || impacts['unknown_violation'];
  }

  getFixSteps(category, violation) {
    const steps = {
      'forbidden_technology': [
        'Remove the forbidden import line',
        'Add the correct shadcn/ui import: import { Button } from "@/components/ui/button"',
        'Replace the component usage with the shadcn/ui equivalent',
        'Update any props to match shadcn/ui API',
        'Test that functionality still works'
      ],
      'security_violation': [
        'Remove the dangerous pattern (dangerouslySetInnerHTML, eval, etc.)',
        'If HTML is needed: Install DOMPurify: npm install isomorphic-dompurify',
        'Import DOMPurify: import DOMPurify from "isomorphic-dompurify"',
        'Sanitize content: DOMPurify.sanitize(htmlContent)',
        'Use sanitized content safely'
      ],
      'performance_issue': [
        'Identify the performance bottleneck',
        'Reduce the number of useState/useEffect hooks',
        'Consider using useReducer for complex state',
        'Implement memoization if needed',
        'Break large components into smaller ones'
      ],
      'accessibility_missing': [
        'Add data-testid attribute to interactive elements',
        'Add aria-label for buttons without text',
        'Ensure proper semantic HTML structure',
        'Test keyboard navigation',
        'Verify color contrast ratios'
      ]
    };
    
    return steps[category] || ['Analyze the violation', 'Research the correct approach', 'Implement the fix', 'Test the result'];
  }

  clearHistory() {
    this.attemptHistory.clear();
  }
}

module.exports = { LoopPreventionHandler };