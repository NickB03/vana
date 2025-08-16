#!/usr/bin/env node

/**
 * Claude Code File Operation Hooks Integration
 * 
 * This module integrates hooks directly with Claude Code's file operations:
 * - Read operations: Pre-validation and access logging
 * - Write operations: PRD validation and blocking
 * - Edit operations: Real-time compliance checking
 * 
 * The integration happens at the tool level, intercepting Claude Code
 * file operations before they execute.
 */

const fs = require('fs').promises;
const path = require('path');
const { RealPRDValidator } = require('../validation/real-prd-validator');
const { RealErrorHandler } = require('../validation/real-error-handler');
const { execSync } = require('child_process');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class ClaudeCodeFileHooks {
  constructor(options = {}) {
    this.options = {
      enablePreReadHooks: options.enablePreReadHooks !== undefined ? options.enablePreReadHooks : true,
      enablePostWriteHooks: options.enablePostWriteHooks || true,
      enablePreEditHooks: options.enablePreEditHooks || true,
      enablePostEditHooks: options.enablePostEditHooks || true,
      enableBlocking: options.enableBlocking !== false,
      logLevel: options.logLevel || 'info',
      hookControlEnabled: true,
      ...options
    };

    this.prdValidator = new RealPRDValidator();
    this.errorHandler = new RealErrorHandler();
    this.hookHistory = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔗 Initializing Claude Code File Hooks Integration...');
    
    // Initialize PRD validator
    await this.prdValidator.initialize();
    
    // Check hook control status
    await this.checkHookControlStatus();
    
    this.isInitialized = true;
    console.log('✅ Claude Code File Hooks ready');
  }

  async checkHookControlStatus() {
    try {
      const controlPath = path.join(process.cwd(), '.claude_workspace/commands/hook-control.js');
      const { execAsync } = require('util').promisify(require('child_process').exec);
      
      const { stdout } = await execAsync(`node "${controlPath}" status`, { 
        timeout: 5000,
        cwd: process.cwd() 
      });
      
      const status = JSON.parse(stdout);
      this.hookControlEnabled = status.enabled;
      this.currentMode = status.mode;
      
      if (!this.hookControlEnabled) {
        console.log('⏭️  Hooks disabled by hook control - operations will not be blocked');
        this.options.enableBlocking = false;
      }
      
    } catch (error) {
      console.warn('⚠️  Could not check hook control status, assuming enabled');
      this.hookControlEnabled = true;
    }
  }

  // ============================================================================
  // READ OPERATION HOOKS
  // ============================================================================

  async executePreReadHook(filePath, options = {}) {
    if (!this.options.enablePreReadHooks || !this.hookControlEnabled) {
      return { allowed: true, reason: 'hooks disabled' };
    }

    const context = {
      operation: 'read',
      filePath,
      timestamp: new Date().toISOString(),
      options,
      hookType: 'pre-read'
    };

    try {
      // Execute real claude-flow pre-edit hook
      const command = `npx claude-flow hooks pre-edit --file "${filePath}" --operation "read"`;
      
      if (this.options.logLevel === 'debug') {
        console.log(`🔍 Pre-read hook: ${filePath}`);
      }

      const result = await this.executeClaudeFlowCommand(command, context);
      
      // Log read access for audit trail
      this.logFileAccess('read', filePath, context);
      
      return {
        allowed: true,
        result,
        context
      };

    } catch (error) {
      const handledError = await this.errorHandler.handleCommandExecutionError(
        'pre-read hook', error, context
      );

      if (this.options.logLevel !== 'silent') {
        console.warn(`⚠️  Pre-read hook warning for ${filePath}:`, error.message);
      }

      // Don't block read operations on hook failures
      return {
        allowed: true,
        error: handledError,
        context
      };
    }
  }

  // ============================================================================
  // WRITE OPERATION HOOKS  
  // ============================================================================

  async executePreWriteHook(filePath, content, options = {}) {
    if (!this.options.enableBlocking || !this.hookControlEnabled) {
      return { allowed: true, reason: 'hooks disabled' };
    }

    const context = {
      operation: 'write',
      filePath,
      content,
      contentLength: content?.length || 0,
      timestamp: new Date().toISOString(),
      options,
      hookType: 'pre-write'
    };

    try {
      // PRD validation before write
      const prdValidation = await this.prdValidator.validateFileOperation(
        'pre-write', 
        filePath, 
        content
      );

      // Handle validation result with comprehensive blocking guidance
      const blockingResult = await this.errorHandler.handleBlockingWithGuidance(
        prdValidation, 
        context
      );

      if (blockingResult.shouldBlock) {
        console.log(`🚫 WRITE OPERATION BLOCKED: ${filePath}`);
        console.log('📋 COMPREHENSIVE BLOCKING GUIDANCE:');
        console.log('=====================================');
        console.log(blockingResult.fullGuidanceMessage);
        console.log('=====================================');

        return {
          allowed: false,
          blocked: true,
          blockingError: blockingResult.error,
          agentGuidance: blockingResult.agentGuidance,
          fullGuidanceMessage: blockingResult.fullGuidanceMessage,
          context
        };
      }

      // Execute real claude-flow pre-edit hook
      const command = `npx claude-flow hooks pre-edit --file "${filePath}" --operation "write"`;
      const result = await this.executeClaudeFlowCommand(command, context);

      if (this.options.logLevel === 'debug') {
        console.log(`✅ Pre-write validation passed: ${filePath}`);
      }

      return {
        allowed: true,
        result,
        prdValidation,
        context
      };

    } catch (error) {
      const handledError = await this.errorHandler.handleCommandExecutionError(
        'pre-write hook', error, context
      );

      console.error(`❌ Pre-write hook failed for ${filePath}:`, error.message);

      // Block write on critical hook failures
      return {
        allowed: false,
        error: handledError,
        context
      };
    }
  }

  async executePostWriteHook(filePath, content, writeResult, options = {}) {
    if (!this.options.enablePostWriteHooks) {
      return { success: true, reason: 'post-write hooks disabled' };
    }

    const context = {
      operation: 'post-write',
      filePath,
      content,
      writeResult,
      timestamp: new Date().toISOString(),
      options,
      hookType: 'post-write'
    };

    try {
      // Execute real claude-flow post-edit hook
      const memoryKey = `swarm/${Date.now()}/${path.basename(filePath)}`;
      const command = `npx claude-flow hooks post-edit --file "${filePath}" --memory-key "${memoryKey}"`;
      
      const result = await this.executeClaudeFlowCommand(command, context);

      // Log successful write
      this.logFileAccess('write', filePath, context);

      if (this.options.logLevel === 'debug') {
        console.log(`📝 Post-write hook completed: ${filePath}`);
      }

      return {
        success: true,
        result,
        context
      };

    } catch (error) {
      const handledError = await this.errorHandler.handleCommandExecutionError(
        'post-write hook', error, context
      );

      if (this.options.logLevel !== 'silent') {
        console.warn(`⚠️  Post-write hook warning for ${filePath}:`, error.message);
      }

      return {
        success: false,
        error: handledError,
        context
      };
    }
  }

  // ============================================================================
  // EDIT OPERATION HOOKS
  // ============================================================================

  async executePreEditHook(filePath, oldString, newString, options = {}) {
    if (!this.options.enablePreEditHooks || !this.hookControlEnabled) {
      return { allowed: true, reason: 'hooks disabled' };
    }

    const context = {
      operation: 'edit',
      filePath,
      oldString,
      newString,
      changeSize: (newString?.length || 0) - (oldString?.length || 0),
      timestamp: new Date().toISOString(),
      options,
      hookType: 'pre-edit'
    };

    try {
      // Read current file content to simulate the edit result
      let currentContent = '';
      try {
        currentContent = await fs.readFile(filePath, 'utf8');
      } catch (readError) {
        // File might not exist yet, that's okay
      }

      // Simulate the edit result
      const editedContent = currentContent.replace(oldString, newString);

      // PRD validation before edit
      const prdValidation = await this.prdValidator.validateFileOperation(
        'pre-edit',
        filePath,
        editedContent
      );

      // Handle validation result with comprehensive blocking guidance
      const blockingResult = await this.errorHandler.handleBlockingWithGuidance(
        prdValidation,
        context
      );

      if (blockingResult.shouldBlock) {
        console.log(`🚫 EDIT OPERATION BLOCKED: ${filePath}`);
        console.log('📋 COMPREHENSIVE BLOCKING GUIDANCE:');
        console.log('=====================================');
        console.log(blockingResult.fullGuidanceMessage);
        console.log('=====================================');

        return {
          allowed: false,
          blocked: true,
          blockingError: blockingResult.error,
          agentGuidance: blockingResult.agentGuidance,
          fullGuidanceMessage: blockingResult.fullGuidanceMessage,
          context
        };
      }

      // Execute real claude-flow pre-edit hook
      const command = `npx claude-flow hooks pre-edit --file "${filePath}" --operation "edit"`;
      const result = await this.executeClaudeFlowCommand(command, context);

      if (this.options.logLevel === 'debug') {
        console.log(`✅ Pre-edit validation passed: ${filePath}`);
      }

      return {
        allowed: true,
        result,
        prdValidation,
        simulatedContent: editedContent,
        context
      };

    } catch (error) {
      const handledError = await this.errorHandler.handleCommandExecutionError(
        'pre-edit hook', error, context
      );

      console.error(`❌ Pre-edit hook failed for ${filePath}:`, error.message);

      // Block edit on critical hook failures
      return {
        allowed: false,
        error: handledError,
        context
      };
    }
  }

  async executePostEditHook(filePath, oldString, newString, editResult, options = {}) {
    if (!this.options.enablePostEditHooks) {
      return { success: true, reason: 'post-edit hooks disabled' };
    }

    const context = {
      operation: 'post-edit',
      filePath,
      oldString,
      newString,
      editResult,
      timestamp: new Date().toISOString(),
      options,
      hookType: 'post-edit'
    };

    try {
      // Execute real claude-flow post-edit hook
      const memoryKey = `swarm/${Date.now()}/edit/${path.basename(filePath)}`;
      const command = `npx claude-flow hooks post-edit --file "${filePath}" --memory-key "${memoryKey}"`;
      
      const result = await this.executeClaudeFlowCommand(command, context);

      // Log successful edit
      this.logFileAccess('edit', filePath, context);

      if (this.options.logLevel === 'debug') {
        console.log(`✏️  Post-edit hook completed: ${filePath}`);
      }

      return {
        success: true,
        result,
        context
      };

    } catch (error) {
      const handledError = await this.errorHandler.handleCommandExecutionError(
        'post-edit hook', error, context
      );

      if (this.options.logLevel !== 'silent') {
        console.warn(`⚠️  Post-edit hook warning for ${filePath}:`, error.message);
      }

      return {
        success: false,
        error: handledError,
        context
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async executeClaudeFlowCommand(command, context) {

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        cwd: process.cwd(),
        env: process.env
      });

      // Parse result
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        result = {
          success: true,
          output: stdout.trim(),
          command,
          timestamp: new Date().toISOString()
        };
      }

      result.executionTime = Date.now() - new Date(context.timestamp).getTime();
      result.command = command;
      result.realExecution = true;

      return result;

    } catch (error) {
      throw new Error(`Claude Flow command failed: ${error.message}`);
    }
  }

  logFileAccess(operation, filePath, context) {
    const logEntry = {
      timestamp: context.timestamp,
      operation,
      filePath,
      hookType: context.hookType,
      contentLength: context.content?.length || context.contentLength || 0,
      changeSize: context.changeSize || 0
    };

    // Store in hook history for analysis
    const key = `${operation}-${filePath}`;
    if (!this.hookHistory.has(key)) {
      this.hookHistory.set(key, []);
    }
    this.hookHistory.get(key).push(logEntry);

    // Keep only last 100 entries per file
    const entries = this.hookHistory.get(key);
    if (entries.length > 100) {
      entries.splice(0, entries.length - 100);
    }

    if (this.options.logLevel === 'debug') {
      console.log(`📊 File access logged: ${operation} ${filePath}`);
    }
  }

  // ============================================================================
  // INTEGRATION METHODS (For Claude Code Tool Integration)
  // ============================================================================

  /**
   * Wraps Claude Code's Read tool with hooks
   */
  async wrapReadOperation(originalReadFunction, filePath, options = {}) {
    await this.initialize();

    // Execute pre-read hook
    const preResult = await this.executePreReadHook(filePath, options);
    
    if (!preResult.allowed) {
      throw new Error(`Read operation blocked: ${preResult.reason || 'Unknown reason'}`);
    }

    // Execute original read
    const readResult = await originalReadFunction(filePath, options);

    // No post-read hook needed for read operations
    return readResult;
  }

  /**
   * Wraps Claude Code's Write tool with hooks
   */
  async wrapWriteOperation(originalWriteFunction, filePath, content, options = {}) {
    await this.initialize();

    // Execute pre-write hook (includes PRD validation)
    const preResult = await this.executePreWriteHook(filePath, content, options);
    
    if (!preResult.allowed) {
      const error = new Error('Write operation blocked by PRD validation');
      error.blocking = true;
      error.blockingError = preResult.blockingError;
      error.agentGuidance = preResult.agentGuidance;
      error.fullGuidanceMessage = preResult.fullGuidanceMessage;
      throw error;
    }

    // Execute original write
    const writeResult = await originalWriteFunction(filePath, content, options);

    // Execute post-write hook
    await this.executePostWriteHook(filePath, content, writeResult, options);

    return writeResult;
  }

  /**
   * Wraps Claude Code's Edit tool with hooks
   */
  async wrapEditOperation(originalEditFunction, filePath, oldString, newString, options = {}) {
    await this.initialize();

    // Execute pre-edit hook (includes PRD validation)
    const preResult = await this.executePreEditHook(filePath, oldString, newString, options);
    
    if (!preResult.allowed) {
      const error = new Error('Edit operation blocked by PRD validation');
      error.blocking = true;
      error.blockingError = preResult.blockingError;
      error.agentGuidance = preResult.agentGuidance;
      error.fullGuidanceMessage = preResult.fullGuidanceMessage;
      throw error;
    }

    // Execute original edit
    const editResult = await originalEditFunction(filePath, oldString, newString, options);

    // Execute post-edit hook
    await this.executePostEditHook(filePath, oldString, newString, editResult, options);

    return editResult;
  }

  // ============================================================================
  // STATUS AND MANAGEMENT
  // ============================================================================

  getHookStatus() {
    return {
      initialized: this.isInitialized,
      hookControlEnabled: this.hookControlEnabled,
      currentMode: this.currentMode,
      options: this.options,
      hookHistory: {
        totalOperations: Array.from(this.hookHistory.values()).reduce(
          (sum, entries) => sum + entries.length, 0
        ),
        uniqueFiles: this.hookHistory.size,
        recentOperations: this.getRecentOperations(10)
      }
    };
  }

  getRecentOperations(limit = 10) {
    const allOperations = [];
    
    for (const [key, entries] of this.hookHistory.entries()) {
      allOperations.push(...entries);
    }

    return allOperations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  clearHookHistory() {
    this.hookHistory.clear();
    console.log('🧹 Hook history cleared');
  }

  async refreshHookControlStatus() {
    await this.checkHookControlStatus();
    console.log(`🔄 Hook control status refreshed: ${this.hookControlEnabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = { ClaudeCodeFileHooks };

// CLI usage
if (require.main === module) {
  const hooks = new ClaudeCodeFileHooks({ logLevel: 'debug' });
  
  async function testIntegration() {
    console.log('🧪 Testing Claude Code File Hooks Integration');
    console.log('===========================================');
    
    try {
      await hooks.initialize();
      
      // Test read operation
      console.log('\n1️⃣  Testing Read Operation Hook...');
      const readResult = await hooks.executePreReadHook('/test/file.ts');
      console.log('✅ Read hook:', readResult.allowed ? 'allowed' : 'blocked');
      
      // Test write operation  
      console.log('\n2️⃣  Testing Write Operation Hook...');
      const testContent = 'import { Button } from "@/components/ui/button";\nexport default function Test() { return <Button>Test</Button>; }';
      const writeResult = await hooks.executePreWriteHook('/test/component.tsx', testContent);
      console.log('✅ Write hook:', writeResult.allowed ? 'allowed' : 'blocked');
      
      // Test edit operation
      console.log('\n3️⃣  Testing Edit Operation Hook...');
      const editResult = await hooks.executePreEditHook('/test/component.tsx', 'old code', 'new code');
      console.log('✅ Edit hook:', editResult.allowed ? 'allowed' : 'blocked');
      
      // Show status
      console.log('\n4️⃣  Hook Status:');
      const status = hooks.getHookStatus();
      console.log('📊 Status:', JSON.stringify(status, null, 2));
      
      console.log('\n🎉 Claude Code File Hooks Integration Test Complete!');
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      process.exit(1);
    }
  }
  
  testIntegration();
}