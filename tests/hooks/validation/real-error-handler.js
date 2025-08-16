#!/usr/bin/env node

/**
 * Real Error Handler - Replaces Mock Error Scenarios
 * 
 * This module provides actual production-ready error handling that:
 * 1. Implements blocking enforcement based on violation severity
 * 2. Handles real command execution errors
 * 3. Provides proper error recovery mechanisms
 * 4. Manages hook failure scenarios with actionable responses
 * 5. Prevents agents from getting stuck in loops with clear guidance
 */

const { LoopPreventionHandler } = require('./loop-prevention-handler');

class RealErrorHandler {
  constructor() {
    this.errorLog = [];
    this.recoveryStrategies = new Map();
    this.blockingEnabled = true;
    this.loopPrevention = new LoopPreventionHandler();
    this.setupRecoveryStrategies();
  }

  setupRecoveryStrategies() {
    this.recoveryStrategies.set('forbidden_technology', {
      severity: 'critical',
      block: true,
      recovery: 'Replace with approved technology',
      autofix: false,
      bypassable: false
    });

    this.recoveryStrategies.set('security_violation', {
      severity: 'critical', 
      block: true,
      recovery: 'Remove security risk patterns',
      autofix: true,
      bypassable: false
    });

    this.recoveryStrategies.set('architecture_violation', {
      severity: 'blocking',
      block: true,
      recovery: 'Follow PRD architecture patterns',
      autofix: false,
      bypassable: true
    });

    this.recoveryStrategies.set('performance_issue', {
      severity: 'error',
      block: false,
      recovery: 'Optimize performance patterns',
      autofix: true,
      bypassable: true
    });

    this.recoveryStrategies.set('accessibility_missing', {
      severity: 'warning',
      block: false,
      recovery: 'Add accessibility attributes',
      autofix: true,
      bypassable: true
    });
  }

  async handleValidationResult(hookType, filePath, validationResult, context = {}) {
    const error = {
      timestamp: new Date().toISOString(),
      hookType,
      filePath,
      operation: context.operation || 'unknown',
      validationResult,
      blocked: false,
      recoveryActions: [],
      realErrorHandling: true
    };

    // If hooks are bypassed, don't block but log
    if (validationResult.bypassed) {
      error.bypassed = true;
      error.bypassReason = validationResult.bypassReason;
      this.errorLog.push(error);
      return { shouldBlock: false, error };
    }

    // Process violations based on enforcement configuration
    const enforcement = validationResult.enforcement || {};
    let shouldBlock = false;
    
    // Check for critical violations (always block if enabled)
    // Ensure violations array exists
    if (!validationResult.violations) {
      validationResult.violations = [];
    }
    
    if (validationResult.violations && validationResult.violations.length > 0) {
      for (const violation of validationResult.violations) {
        const violationType = this.categorizeViolation(violation);
        const strategy = this.recoveryStrategies.get(violationType);
        
        if (strategy) {
          error.recoveryActions.push({
            violation,
            type: violationType,
            severity: strategy.severity,
            recovery: strategy.recovery,
            autofix: strategy.autofix,
            bypassable: strategy.bypassable
          });

          // Determine if this violation should block
          if (strategy.block && this.shouldEnforceLevel(strategy.severity, enforcement)) {
            shouldBlock = true;
            error.blocked = true;
          }
        }
      }
    }

    // Handle blocking logic
    if (shouldBlock) {
      error.blockingReason = this.generateBlockingMessage(error.recoveryActions);
      error.suggestedActions = this.generateSuggestedActions(error.recoveryActions);
    }

    this.errorLog.push(error);
    return { shouldBlock, error };
  }

  categorizeViolation(violation) {
    if (violation.includes('Forbidden UI framework') || violation.includes('Firebase direct')) {
      return 'forbidden_technology';
    }
    if (violation.includes('Security risk') || violation.includes('dangerouslySetInnerHTML')) {
      return 'security_violation';
    }
    if (violation.includes('Canvas must work') || violation.includes('SSE endpoint')) {
      return 'architecture_violation';
    }
    if (violation.includes('performance') || violation.includes('Bundle size')) {
      return 'performance_issue';
    }
    if (violation.includes('data-testid') || violation.includes('aria-label')) {
      return 'accessibility_missing';
    }
    return 'unknown_violation';
  }

  shouldEnforceLevel(severity, enforcement) {
    switch (severity) {
      case 'critical':
        return enforcement.critical !== false;
      case 'blocking':
        return enforcement.blocking === true;
      case 'error':
        return enforcement.error === true;
      case 'warning':
        return enforcement.warning === true;
      default:
        return false;
    }
  }

  generateBlockingMessage(recoveryActions) {
    const criticalActions = recoveryActions.filter(a => a.severity === 'critical');
    const blockingActions = recoveryActions.filter(a => a.severity === 'blocking');
    
    let message = '🚫 OPERATION BLOCKED\n\n';
    
    if (criticalActions.length > 0) {
      message += '❌ CRITICAL VIOLATIONS (cannot bypass):\n';
      criticalActions.forEach(action => {
        message += `   • ${action.violation}\n`;
        message += `   • Fix: ${action.recovery}\n\n`;
      });
    }
    
    if (blockingActions.length > 0) {
      message += '🛑 BLOCKING VIOLATIONS (bypassable with reason):\n';
      blockingActions.forEach(action => {
        message += `   • ${action.violation}\n`;
        message += `   • Fix: ${action.recovery}\n\n`;
      });
    }
    
    return message.trim();
  }

  generateSuggestedActions(recoveryActions) {
    const actions = [];
    
    // Immediate fixes
    const autofixable = recoveryActions.filter(a => a.autofix);
    if (autofixable.length > 0) {
      actions.push({
        type: 'autofix',
        description: 'Apply automatic fixes',
        command: 'npx claude-flow hooks autofix --file ' + this.currentFile,
        priority: 'immediate'
      });
    }
    
    // Manual fixes
    const manualFixes = recoveryActions.filter(a => !a.autofix);
    manualFixes.forEach(action => {
      actions.push({
        type: 'manual',
        description: action.recovery,
        violation: action.violation,
        priority: action.severity === 'critical' ? 'immediate' : 'high'
      });
    });
    
    // Bypass options
    const bypassable = recoveryActions.filter(a => a.bypassable);
    if (bypassable.length > 0) {
      actions.push({
        type: 'bypass',
        description: 'Temporarily bypass with reason',
        command: 'node .claude_workspace/commands/hook-control.js bypass 30 "emergency fix"',
        priority: 'low'
      });
    }
    
    return actions;
  }

  async handleCommandExecutionError(command, error, context = {}) {
    const handledError = {
      timestamp: new Date().toISOString(),
      type: 'command_execution_error',
      command,
      error: error.message,
      stderr: error.stderr,
      stdout: error.stdout,
      exitCode: error.code,
      context,
      recovery: null,
      realErrorHandling: true
    };

    // Categorize command errors
    if (error.code === 'ENOENT') {
      handledError.category = 'command_not_found';
      handledError.recovery = {
        description: 'Claude Flow command not available',
        actions: [
          'Install claude-flow: npm install -g @ruvnet/claude-flow',
          'Verify installation: npx claude-flow --version',
          'Check PATH configuration'
        ]
      };
    } else if (error.code === 'ETIMEDOUT') {
      handledError.category = 'timeout';
      handledError.recovery = {
        description: 'Command execution timeout',
        actions: [
          'Check system resources',
          'Increase timeout value',
          'Retry operation'
        ]
      };
    } else if (error.stderr && error.stderr.includes('permission')) {
      handledError.category = 'permission_denied';
      handledError.recovery = {
        description: 'Permission denied',
        actions: [
          'Check file permissions',
          'Run with appropriate user permissions',
          'Verify hook configuration'
        ]
      };
    } else {
      handledError.category = 'unknown_error';
      handledError.recovery = {
        description: 'Unknown command error',
        actions: [
          'Check command syntax',
          'Verify system dependencies',
          'Review error logs',
          'Contact support if persistent'
        ]
      };
    }

    this.errorLog.push(handledError);
    return handledError;
  }

  async createBlockingError(validationResult, context = {}) {
    // Create an actual Error object that can be thrown to block operations
    const blockingActions = [];
    const criticalViolations = [];
    
    // Ensure violations array exists
    if (!validationResult.violations) {
      validationResult.violations = [];
    }
    
    if (validationResult.violations && validationResult.violations.length > 0) {
      validationResult.violations.forEach(violation => {
        const type = this.categorizeViolation(violation);
        const strategy = this.recoveryStrategies.get(type);
        
        if (strategy && strategy.block) {
          if (strategy.severity === 'critical') {
            criticalViolations.push(violation);
          }
          blockingActions.push({
            violation,
            recovery: strategy.recovery,
            autofix: strategy.autofix
          });
        }
      });
    }

    if (blockingActions.length === 0) {
      return null; // No blocking required
    }

    // Generate comprehensive agent guidance to prevent loops
    const agentGuidance = this.loopPrevention.generateAgentGuidance(validationResult, context);

    // Create blocking error with loop prevention
    const error = new Error('PRD_VIOLATION_BLOCKING');
    error.name = 'PRDViolationError';
    error.blocking = true;
    error.critical = criticalViolations.length > 0;
    error.violations = blockingActions;
    error.file_path = validationResult.file_path;
    error.compliance_score = validationResult.compliance_score;
    
    // Add comprehensive agent guidance
    error.agentGuidance = agentGuidance;
    error.blockingMessage = agentGuidance.blockingReason;
    error.stepByStepInstructions = agentGuidance.stepByStepInstructions;
    error.alternativeApproaches = agentGuidance.alternativeApproaches;
    error.loopPrevention = agentGuidance.loopPrevention;
    error.agentInstructions = agentGuidance.agentInstructions;
    error.exitStrategies = agentGuidance.exitStrategies;
    
    // Add recovery information (legacy compatibility)
    error.recovery = {
      autofixAvailable: blockingActions.some(a => a.autofix),
      manualFixesRequired: blockingActions.filter(a => !a.autofix),
      bypassAvailable: !error.critical,
      suggestedActions: this.generateSuggestedActions(blockingActions)
    };

    return error;
  }

  getErrorSummary() {
    const summary = {
      totalErrors: this.errorLog.length,
      criticalBlocks: 0,
      blockingViolations: 0,
      commandErrors: 0,
      bypassedOperations: 0,
      recentErrors: []
    };

    // Analyze error log
    this.errorLog.forEach(error => {
      if (error.bypassed) {
        summary.bypassedOperations++;
      } else if (error.blocked) {
        const hasCritical = error.recoveryActions?.some(a => a.severity === 'critical');
        if (hasCritical) {
          summary.criticalBlocks++;
        } else {
          summary.blockingViolations++;
        }
      } else if (error.type === 'command_execution_error') {
        summary.commandErrors++;
      }
    });

    // Get recent errors (last 10)
    summary.recentErrors = this.errorLog
      .slice(-10)
      .map(error => ({
        timestamp: error.timestamp,
        type: error.type || 'validation_error',
        file: error.filePath,
        blocked: error.blocked || false,
        bypassed: error.bypassed || false
      }));

    return summary;
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  setBlockingEnabled(enabled) {
    this.blockingEnabled = enabled;
  }

  // New method to handle blocking with full agent guidance
  async handleBlockingWithGuidance(validationResult, context = {}) {
    const blockingError = await this.createBlockingError(validationResult, context);
    
    if (!blockingError) {
      return { shouldBlock: false, message: 'No violations detected' };
    }

    // Create comprehensive blocking message with all guidance
    let fullMessage = blockingError.blockingMessage + '\n\n';
    fullMessage += blockingError.stepByStepInstructions + '\n\n';
    fullMessage += blockingError.alternativeApproaches + '\n\n';
    fullMessage += blockingError.loopPrevention + '\n\n';
    fullMessage += blockingError.agentInstructions + '\n\n';
    fullMessage += blockingError.exitStrategies;

    return {
      shouldBlock: true,
      error: blockingError,
      fullGuidanceMessage: fullMessage,
      agentGuidance: blockingError.agentGuidance
    };
  }

  // Clear loop prevention history when hooks are reset
  clearLoopHistory() {
    this.loopPrevention.clearHistory();
  }
}

module.exports = { RealErrorHandler };

// CLI usage
if (require.main === module) {
  const handler = new RealErrorHandler();
  
  async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'status';
    
    try {
      if (command === 'summary') {
        const summary = handler.getErrorSummary();
        console.log('📊 Error Handling Summary');
        console.log('========================');
        console.log(`Total Errors: ${summary.totalErrors}`);
        console.log(`Critical Blocks: ${summary.criticalBlocks}`);
        console.log(`Blocking Violations: ${summary.blockingViolations}`);
        console.log(`Command Errors: ${summary.commandErrors}`);
        console.log(`Bypassed Operations: ${summary.bypassedOperations}`);
        
        if (summary.recentErrors.length > 0) {
          console.log('\n🕒 Recent Errors:');
          summary.recentErrors.forEach(error => {
            const status = error.blocked ? '🚫' : error.bypassed ? '⏭️' : '📝';
            console.log(`   ${status} ${error.timestamp.split('T')[1].split('.')[0]} - ${error.file} (${error.type})`);
          });
        }
      } else {
        console.log('Usage: node real-error-handler.js <summary>');
      }
    } catch (error) {
      console.error('❌ Error handler error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}