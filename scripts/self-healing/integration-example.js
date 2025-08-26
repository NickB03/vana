#!/usr/bin/env node

/**
 * Self-Healing Integration Example
 * 
 * This example demonstrates how the error detection system integrates with
 * claude-flow for automated self-healing workflows.
 * 
 * @author Claude Code Agent
 * @version 1.0.0
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const {
  monitorCommand,
  storeErrorPattern,
  SEVERITY_LEVELS,
  ERROR_CATEGORIES,
  getErrorStats,
  getLearnedPatterns
} = require('./error-detector.js');

/**
 * Self-Healing Command Executor
 * 
 * Executes commands with automatic error detection and recovery attempts
 */
class SelfHealingExecutor {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.enableAutoFix = options.enableAutoFix !== false;
    this.verbose = options.verbose || false;
    this.sessionId = options.sessionId || `healing-${Date.now()}`;
    this.healingAttempts = new Map();
  }

  /**
   * Execute a command with self-healing capabilities
   * @param {string} command - Command to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result with healing info
   */
  async executeWithHealing(command, options = {}) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;
    const healingHistory = [];

    this.log(`🚀 Executing: ${command}`);

    // Coordination hook - pre-task
    await this.coordinationHook('pre-task', { command, sessionId: this.sessionId });

    while (attempt < this.maxRetries) {
      attempt++;
      this.log(`📝 Attempt ${attempt}/${this.maxRetries}`);

      try {
        const { stdout, stderr, exitCode } = await this.executeCommand(command);
        const output = stdout + stderr;

        // Monitor the command for errors
        const errorResult = await monitorCommand(command, output, exitCode || 0);
        
        if (!errorResult.hasError) {
          // Success!
          const duration = Date.now() - startTime;
          this.log(`✅ Command succeeded in ${duration}ms`);
          
          // Store successful recovery if we had previous attempts
          if (healingHistory.length > 0) {
            await this.storeSuccessfulRecovery(command, healingHistory, duration);
          }

          // Coordination hook - post-task success
          await this.coordinationHook('post-task', { 
            command, 
            success: true, 
            attempts: attempt,
            duration
          });

          return {
            success: true,
            output,
            attempts: attempt,
            duration,
            healingHistory
          };
        }

        // Error detected - attempt healing
        lastError = errorResult;
        this.log(`❌ Error detected: ${errorResult.severity} | Category: ${errorResult.category}`);
        
        if (errorResult.suggestions.length > 0) {
          this.log(`💡 Found ${errorResult.suggestions.length} healing suggestions`);
          
          const healingResult = await this.attemptHealing(errorResult, attempt);
          healingHistory.push(healingResult);
          
          if (healingResult.success) {
            this.log(`🔧 Healing successful with: ${healingResult.strategy}`);
            continue; // Retry the original command
          } else {
            this.log(`❌ Healing failed: ${healingResult.error}`);
          }
        } else {
          this.log(`🤷 No healing suggestions available`);
        }

        // Wait before retry
        if (attempt < this.maxRetries) {
          this.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
          await this.sleep(this.retryDelay);
        }

      } catch (execError) {
        this.log(`💥 Execution error: ${execError.message}`);
        lastError = { error: execError.message, category: ERROR_CATEGORIES.RUNTIME };
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    this.log(`💀 Command failed after ${attempt} attempts in ${duration}ms`);
    
    // Store failed recovery pattern
    if (lastError) {
      await storeErrorPattern(lastError, {
        attempts: healingHistory,
        success: false,
        totalDuration: duration
      });
    }

    // Coordination hook - post-task failure
    await this.coordinationHook('post-task', { 
      command, 
      success: false, 
      attempts: attempt,
      duration,
      lastError
    });

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      duration,
      healingHistory
    };
  }

  /**
   * Attempt to heal detected errors
   * @param {Object} errorResult - Error detection result
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Healing result
   */
  async attemptHealing(errorResult, attempt) {
    const healingStart = Date.now();
    
    // Filter to automated fixes for first attempts, all fixes for later attempts
    let availableFixes = errorResult.suggestions;
    if (attempt <= 2) {
      availableFixes = errorResult.suggestions.filter(s => s.automated);
    }
    
    if (availableFixes.length === 0) {
      return {
        success: false,
        error: 'No suitable healing strategies available',
        duration: Date.now() - healingStart
      };
    }

    // Try fixes in priority order
    availableFixes.sort((a, b) => a.priority - b.priority);
    
    for (const fix of availableFixes) {
      this.log(`🔧 Trying healing strategy: ${fix.command}`);
      
      try {
        const { stdout, stderr, exitCode } = await this.executeCommand(fix.command);
        const healingOutput = stdout + stderr;
        
        // Monitor the healing command
        const healingResult = await monitorCommand(fix.command, healingOutput, exitCode || 0);
        
        if (!healingResult.hasError) {
          const duration = Date.now() - healingStart;
          this.log(`✅ Healing strategy succeeded in ${duration}ms`);
          
          // Coordination hook - healing success
          await this.coordinationHook('healing-success', {
            strategy: fix.command,
            category: fix.category,
            duration
          });
          
          return {
            success: true,
            strategy: fix.command,
            category: fix.category,
            duration,
            output: healingOutput
          };
        } else {
          this.log(`❌ Healing strategy failed: ${fix.command}`);
        }
        
      } catch (healingError) {
        this.log(`💥 Healing strategy error: ${healingError.message}`);
      }
    }

    const duration = Date.now() - healingStart;
    return {
      success: false,
      error: 'All healing strategies failed',
      attempts: availableFixes.length,
      duration
    };
  }

  /**
   * Execute a command and return detailed results
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeCommand(command) {
    try {
      const result = await execAsync(command, { 
        timeout: 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: 0
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1
      };
    }
  }

  /**
   * Store successful recovery pattern for learning
   * @param {string} command - Original command
   * @param {Array} healingHistory - Healing attempts made
   * @param {number} duration - Total duration
   */
  async storeSuccessfulRecovery(command, healingHistory, duration) {
    const successfulHealing = healingHistory.find(h => h.success);
    if (successfulHealing) {
      const errorPattern = {
        command,
        category: successfulHealing.category,
        healingAttempts: healingHistory.length
      };
      
      const recovery = {
        strategy: successfulHealing.strategy,
        success: true,
        totalDuration: duration,
        healingDuration: successfulHealing.duration,
        attempts: healingHistory.length
      };
      
      await storeErrorPattern(errorPattern, recovery);
      this.log(`🧠 Stored successful recovery pattern: ${successfulHealing.strategy}`);
    }
  }

  /**
   * Execute coordination hooks for integration with claude-flow
   * @param {string} hookType - Type of hook (pre-task, post-task, etc.)
   * @param {Object} data - Hook data
   */
  async coordinationHook(hookType, data) {
    if (!this.enableCoordination) return;
    
    try {
      const hookData = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
      
      switch (hookType) {
        case 'pre-task':
          await execAsync(`npx claude-flow@alpha hooks pre-task --description "self-healing-${data.command.split(' ')[0]}"`);
          break;
          
        case 'post-task':
          await execAsync(`npx claude-flow@alpha hooks post-task --task-id "${this.sessionId}"`);
          break;
          
        case 'healing-success':
          await execAsync(`npx claude-flow@alpha hooks notify --message "Self-healing successful: ${data.strategy}"`);
          break;
      }
      
      // Store in memory
      await execAsync(`npx claude-flow@alpha memory store --key "self-healing/${hookType}/${this.sessionId}" --value '${hookData}' --namespace "healing"`);
      
    } catch (hookError) {
      this.log(`⚠️  Coordination hook failed: ${hookError.message}`);
    }
  }

  /**
   * Get healing statistics
   * @returns {Object} Healing statistics
   */
  getHealingStats() {
    const errorStats = getErrorStats();
    const patterns = getLearnedPatterns();
    
    return {
      errorStats,
      learnedPatterns: patterns.length,
      successfulRecoveries: patterns.reduce((sum, p) => sum + p.successfulRecoveries, 0),
      failedRecoveries: patterns.reduce((sum, p) => sum + p.failedRecoveries, 0),
      healingAttempts: this.healingAttempts.size
    };
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message if verbose mode is enabled
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose) {
      const timestamp = new Date().toISOString().substr(11, 8);
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

/**
 * Demo function showing self-healing in action
 */
async function demoSelfHealing() {
  console.log('🧪 Self-Healing Integration Demo\n');
  
  const healer = new SelfHealingExecutor({
    verbose: true,
    maxRetries: 3,
    enableAutoFix: true
  });

  // Demo scenarios
  const scenarios = [
    {
      name: 'Missing Dependency Recovery',
      command: 'node -e "require(\\"nonexistent-module\\")"',
      expected: 'Should detect missing module and suggest npm install'
    },
    {
      name: 'Successful Command',
      command: 'echo "Hello World"',
      expected: 'Should execute successfully without healing'
    },
    {
      name: 'File Permission Fix',
      command: 'ls /root/.ssh 2>/dev/null || echo "Permission denied simulation"',
      expected: 'Should detect permission issues'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n🎯 Scenario: ${scenario.name}`);
    console.log(`Expected: ${scenario.expected}`);
    console.log('─'.repeat(60));

    const result = await healer.executeWithHealing(scenario.command);
    
    console.log(`\nResult: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Attempts: ${result.attempts}`);
    console.log(`Duration: ${result.duration}ms`);
    
    if (result.healingHistory.length > 0) {
      console.log(`Healing attempts: ${result.healingHistory.length}`);
      result.healingHistory.forEach((healing, i) => {
        console.log(`  ${i + 1}. ${healing.success ? '✅' : '❌'} ${healing.strategy || healing.error}`);
      });
    }
  }

  // Show final statistics
  console.log('\n📊 Final Healing Statistics:');
  console.log('═'.repeat(60));
  const stats = healer.getHealingStats();
  console.log(JSON.stringify(stats, null, 2));
}

/**
 * Example integration with existing workflows
 */
async function integrationExample() {
  console.log('\n🔗 Integration Example with Existing Workflows\n');
  
  const healer = new SelfHealingExecutor({
    verbose: true,
    sessionId: 'build-pipeline-123'
  });

  // Simulate a typical build pipeline with potential issues
  const buildSteps = [
    'npm install',          // Might have network issues
    'npm run lint',         // Might have syntax errors
    'npm run test',         // Might have test failures
    'npm run build'         // Might have build errors
  ];

  console.log('🏗️  Simulating build pipeline with self-healing...');
  
  for (let i = 0; i < buildSteps.length; i++) {
    const step = buildSteps[i];
    console.log(`\n📝 Build Step ${i + 1}: ${step}`);
    
    const result = await healer.executeWithHealing(step);
    
    if (result.success) {
      console.log(`✅ Step completed successfully`);
    } else {
      console.log(`❌ Step failed after ${result.attempts} attempts`);
      console.log(`🚨 Breaking build pipeline due to unrecoverable error`);
      break;
    }
  }

  console.log('\n🎯 Build Pipeline Self-Healing Complete!');
}

// Run demos if executed directly
if (require.main === module) {
  const mode = process.argv[2] || 'demo';
  
  switch (mode) {
    case 'demo':
      demoSelfHealing()
        .catch(error => {
          console.error('Demo failed:', error);
          process.exit(1);
        });
      break;
      
    case 'integration':
      integrationExample()
        .catch(error => {
          console.error('Integration example failed:', error);
          process.exit(1);
        });
      break;
      
    case 'both':
      demoSelfHealing()
        .then(() => integrationExample())
        .catch(error => {
          console.error('Examples failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node integration-example.js [demo|integration|both]');
  }
}

module.exports = { SelfHealingExecutor, demoSelfHealing, integrationExample };