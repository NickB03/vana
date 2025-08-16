#!/usr/bin/env node

/**
 * Claude Code File Hooks with Integrated Backup System
 * 
 * This module extends the existing ClaudeCodeFileHooks with seamless
 * file backup and restore capabilities. It provides automatic backup
 * creation before file modifications and validation after operations.
 * 
 * Features:
 * - Automatic pre-modification backups
 * - Post-operation backup validation
 * - Emergency restore functionality
 * - Performance-optimized integration
 * - Comprehensive error handling with backup fallbacks
 */

const { ClaudeCodeFileHooks } = require('./claude-code-file-hooks');
const { FileBackupManager } = require('./file-backup-manager');
const fs = require('fs').promises;
const path = require('path');

class ClaudeCodeFileHooksWithBackup extends ClaudeCodeFileHooks {
  constructor(options = {}) {
    super(options);
    
    this.backupOptions = {
      enableBackup: options.enableBackup !== false,
      enableEmergencyRestore: options.enableEmergencyRestore !== false,
      backupTimeout: options.backupTimeout || 5000, // 5 second timeout
      maxBackupRetries: options.maxBackupRetries || 2,
      backupOnlyOnValidation: options.backupOnlyOnValidation || false,
      ...options.backup
    };

    this.backupManager = new FileBackupManager({
      backupDir: path.join(process.cwd(), '.claude_workspace/backups'),
      enablePerformanceMode: true, // Optimize for hook integration
      logLevel: this.options.logLevel,
      ...this.backupOptions
    });

    this.currentBackups = new Map(); // Track current operation backups
    this.backupStats = {
      totalBackupsCreated: 0,
      totalRestoresPerformed: 0,
      averageBackupTime: 0,
      backupErrors: 0
    };
  }

  async initialize() {
    // Initialize parent hooks
    await super.initialize();
    
    // Initialize backup manager if backup is enabled
    if (this.backupOptions.enableBackup) {
      console.log('🗃️  Initializing backup integration...');
      await this.backupManager.initialize();
      console.log('✅ Backup system integrated with file hooks');
    } else {
      console.log('⏭️  File backup disabled in configuration');
    }
  }

  // ============================================================================
  // WRITE OPERATION HOOKS WITH BACKUP
  // ============================================================================

  async executePreWriteHook(filePath, content, options = {}) {
    let backupId = null;
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
      // Create backup before validation (if enabled)
      if (this.backupOptions.enableBackup) {
        const backupResult = await this.createBackupWithTimeout(filePath, context);
        if (backupResult && backupResult.created) {
          backupId = backupResult.backupId;
          context.backupId = backupId;
          this.currentBackups.set(filePath, backupId);
          
          if (this.options.logLevel === 'debug') {
            console.log(`💾 Pre-write backup created: ${backupId}`);
          }
        }
      }

      // Execute parent pre-write hook (includes PRD validation)
      const hookResult = await super.executePreWriteHook(filePath, content, options);
      
      // If validation failed and we have emergency restore enabled
      if (!hookResult.allowed && hookResult.blocked && this.backupOptions.enableEmergencyRestore) {
        console.log('🚨 Write operation blocked - backup available for emergency restore');
        hookResult.emergencyRestoreAvailable = !!backupId;
        hookResult.backupId = backupId;
      }

      return {
        ...hookResult,
        backupCreated: !!backupId,
        backupId,
        context
      };

    } catch (error) {
      // If backup creation failed, log but don't block the operation
      if (backupId) {
        console.warn(`⚠️  Backup creation failed for ${filePath}, continuing without backup:`, error.message);
        this.backupStats.backupErrors++;
      }

      // Re-throw the original error
      throw error;
    }
  }

  async executePostWriteHook(filePath, content, writeResult, options = {}) {
    const backupId = this.currentBackups.get(filePath);
    
    try {
      // Execute parent post-write hook
      const hookResult = await super.executePostWriteHook(filePath, content, writeResult, options);
      
      // Validate backup if one was created
      if (backupId && this.backupOptions.enableBackup) {
        const validationResult = await this.backupManager.validatePostModificationBackup(
          filePath, 
          backupId, 
          { 
            writeResult, 
            success: writeResult?.success || true,
            postWriteContext: hookResult 
          }
        );
        
        if (this.options.logLevel === 'debug') {
          console.log(`✅ Post-write backup validated: ${backupId} (${validationResult.validated})`);
        }
        
        hookResult.backupValidated = validationResult.validated;
        hookResult.backupId = backupId;
      }

      // Clean up current backup tracking
      this.currentBackups.delete(filePath);

      return hookResult;

    } catch (error) {
      // Clean up on error
      this.currentBackups.delete(filePath);
      throw error;
    }
  }

  // ============================================================================
  // EDIT OPERATION HOOKS WITH BACKUP
  // ============================================================================

  async executePreEditHook(filePath, oldString, newString, options = {}) {
    let backupId = null;
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
      // Create backup before validation (if enabled)
      if (this.backupOptions.enableBackup) {
        const backupResult = await this.createBackupWithTimeout(filePath, context);
        if (backupResult && backupResult.created) {
          backupId = backupResult.backupId;
          context.backupId = backupId;
          this.currentBackups.set(filePath, backupId);
          
          if (this.options.logLevel === 'debug') {
            console.log(`💾 Pre-edit backup created: ${backupId}`);
          }
        }
      }

      // Execute parent pre-edit hook (includes PRD validation)
      const hookResult = await super.executePreEditHook(filePath, oldString, newString, options);
      
      // If validation failed and we have emergency restore enabled
      if (!hookResult.allowed && hookResult.blocked && this.backupOptions.enableEmergencyRestore) {
        console.log('🚨 Edit operation blocked - backup available for emergency restore');
        hookResult.emergencyRestoreAvailable = !!backupId;
        hookResult.backupId = backupId;
      }

      return {
        ...hookResult,
        backupCreated: !!backupId,
        backupId,
        context
      };

    } catch (error) {
      // If backup creation failed, log but don't block the operation
      if (backupId) {
        console.warn(`⚠️  Backup creation failed for ${filePath}, continuing without backup:`, error.message);
        this.backupStats.backupErrors++;
      }

      // Re-throw the original error
      throw error;
    }
  }

  async executePostEditHook(filePath, oldString, newString, editResult, options = {}) {
    const backupId = this.currentBackups.get(filePath);
    
    try {
      // Execute parent post-edit hook
      const hookResult = await super.executePostEditHook(filePath, oldString, newString, editResult, options);
      
      // Validate backup if one was created
      if (backupId && this.backupOptions.enableBackup) {
        const validationResult = await this.backupManager.validatePostModificationBackup(
          filePath, 
          backupId, 
          { 
            editResult, 
            success: editResult?.success || true,
            oldString,
            newString,
            postEditContext: hookResult 
          }
        );
        
        if (this.options.logLevel === 'debug') {
          console.log(`✅ Post-edit backup validated: ${backupId} (${validationResult.validated})`);
        }
        
        hookResult.backupValidated = validationResult.validated;
        hookResult.backupId = backupId;
      }

      // Clean up current backup tracking
      this.currentBackups.delete(filePath);

      return hookResult;

    } catch (error) {
      // Clean up on error
      this.currentBackups.delete(filePath);
      throw error;
    }
  }

  // ============================================================================
  // BACKUP UTILITY METHODS
  // ============================================================================

  async createBackupWithTimeout(filePath, context) {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      
      // Set timeout for backup operation
      const timeoutId = setTimeout(() => {
        console.warn(`⚠️  Backup timeout for ${filePath} (${this.backupOptions.backupTimeout}ms)`);
        this.backupStats.backupErrors++;
        resolve({ created: false, reason: 'timeout' });
      }, this.backupOptions.backupTimeout);

      try {
        // Attempt backup creation with retries
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.backupOptions.maxBackupRetries; attempt++) {
          try {
            const backupResult = await this.backupManager.createPreModificationBackup(filePath, context);
            
            clearTimeout(timeoutId);
            
            // Update stats
            const duration = Date.now() - startTime;
            this.updateBackupStats(duration, true);
            
            resolve(backupResult);
            return;
            
          } catch (error) {
            lastError = error;
            
            if (attempt < this.backupOptions.maxBackupRetries) {
              console.warn(`⚠️  Backup attempt ${attempt} failed for ${filePath}, retrying...`);
              await this.sleep(100 * attempt); // Progressive delay
            }
          }
        }

        // All attempts failed
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        this.updateBackupStats(duration, false);
        
        console.warn(`❌ All backup attempts failed for ${filePath}:`, lastError?.message);
        resolve({ created: false, error: lastError?.message, attempts: this.backupOptions.maxBackupRetries });

      } catch (error) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        this.updateBackupStats(duration, false);
        resolve({ created: false, error: error.message });
      }
    });
  }

  // ============================================================================
  // EMERGENCY RESTORE FUNCTIONALITY
  // ============================================================================

  async performEmergencyRestore(filePath, backupId = null, options = {}) {
    try {
      console.log(`🚨 Performing emergency restore for ${filePath}...`);
      
      // If no backup ID provided, find the most recent backup
      if (!backupId) {
        const recentBackups = await this.backupManager.listBackupsForFile(filePath, { limit: 1 });
        if (recentBackups.length === 0) {
          throw new Error(`No backups available for ${filePath}`);
        }
        backupId = recentBackups[0].backupId;
      }

      // Perform the restore
      const restoreResult = await this.backupManager.restoreFile(filePath, backupId, {
        createBackupBeforeRestore: true,
        ...options
      });

      this.backupStats.totalRestoresPerformed++;
      
      console.log(`✅ Emergency restore completed: ${filePath} restored from backup ${backupId}`);
      
      return {
        success: true,
        filePath,
        backupId,
        restoreResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Emergency restore failed for ${filePath}:`, error.message);
      throw new Error(`Emergency restore failed: ${error.message}`);
    }
  }

  async listAvailableBackups(filePath, options = {}) {
    try {
      return await this.backupManager.listBackupsForFile(filePath, options);
    } catch (error) {
      console.warn(`⚠️  Failed to list backups for ${filePath}:`, error.message);
      return [];
    }
  }

  async restoreToVersion(filePath, versionNumber, options = {}) {
    try {
      const restoreResult = await this.backupManager.restoreFileToVersion(
        filePath, 
        versionNumber, 
        options
      );

      this.backupStats.totalRestoresPerformed++;
      
      console.log(`🔄 File restored to version ${versionNumber}: ${filePath}`);
      
      return restoreResult;

    } catch (error) {
      console.error(`❌ Version restore failed for ${filePath}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // WRAPPER METHODS WITH BACKUP INTEGRATION
  // ============================================================================

  async wrapWriteOperation(originalWriteFunction, filePath, content, options = {}) {
    // Check if emergency restore mode is requested
    if (options.emergencyRestore && options.backupId) {
      console.log('🚨 Emergency restore mode requested');
      return await this.performEmergencyRestore(filePath, options.backupId, options);
    }

    // Standard write operation with backup integration
    return await super.wrapWriteOperation(originalWriteFunction, filePath, content, options);
  }

  async wrapEditOperation(originalEditFunction, filePath, oldString, newString, options = {}) {
    // Check if emergency restore mode is requested  
    if (options.emergencyRestore && options.backupId) {
      console.log('🚨 Emergency restore mode requested');
      return await this.performEmergencyRestore(filePath, options.backupId, options);
    }

    // Standard edit operation with backup integration
    return await super.wrapEditOperation(originalEditFunction, filePath, oldString, newString, options);
  }

  // ============================================================================
  // BACKUP-SPECIFIC API METHODS
  // ============================================================================

  async createManualBackup(filePath, reason = 'manual') {
    try {
      const context = {
        operation: 'manual-backup',
        hookType: 'manual',
        reason,
        timestamp: new Date().toISOString()
      };

      const backupResult = await this.backupManager.createPreModificationBackup(filePath, context);
      
      if (backupResult.created) {
        console.log(`💾 Manual backup created: ${filePath} → ${backupResult.backupId}`);
      }
      
      return backupResult;

    } catch (error) {
      console.error(`❌ Manual backup failed for ${filePath}:`, error.message);
      throw error;
    }
  }

  async validateAllBackups() {
    return await this.backupManager.validateAllBackups();
  }

  async cleanupOldBackups() {
    return await this.backupManager.cleanupOldBackups();
  }

  async searchBackups(query) {
    return await this.backupManager.searchBackups(query);
  }

  // ============================================================================
  // STATUS AND MANAGEMENT
  // ============================================================================

  getHookStatus() {
    const parentStatus = super.getHookStatus();
    const backupStats = this.backupManager ? this.backupManager.getBackupStats() : null;
    
    return {
      ...parentStatus,
      backupIntegration: {
        enabled: this.backupOptions.enableBackup,
        emergencyRestoreEnabled: this.backupOptions.enableEmergencyRestore,
        currentBackupOperations: this.currentBackups.size,
        statistics: {
          ...this.backupStats,
          backupManager: backupStats
        },
        configuration: this.backupOptions
      }
    };
  }

  async generateBackupReport() {
    if (!this.backupManager) {
      return { error: 'Backup system not initialized' };
    }

    const backupReport = await this.backupManager.generateBackupReport();
    const hookStatus = this.getHookStatus();
    
    return {
      generated: new Date().toISOString(),
      hookIntegration: {
        enabled: this.backupOptions.enableBackup,
        operationsWithBackup: this.backupStats.totalBackupsCreated,
        emergencyRestores: this.backupStats.totalRestoresPerformed,
        backupErrors: this.backupStats.backupErrors,
        averageBackupTime: `${this.backupStats.averageBackupTime.toFixed(0)}ms`
      },
      backupSystem: backupReport,
      recommendations: this.generateBackupRecommendations(hookStatus, backupReport)
    };
  }

  generateBackupRecommendations(hookStatus, backupReport) {
    const recommendations = [];
    
    // Check backup error rate
    const errorRate = this.backupStats.backupErrors / Math.max(1, this.backupStats.totalBackupsCreated);
    if (errorRate > 0.1) { // >10% error rate
      recommendations.push({
        type: 'error_rate',
        severity: 'warning',
        message: `High backup error rate (${(errorRate * 100).toFixed(1)}%). Consider checking disk space and permissions.`
      });
    }

    // Check backup timing
    if (this.backupStats.averageBackupTime > 2000) { // >2 seconds
      recommendations.push({
        type: 'performance',
        severity: 'info',
        message: `Backup operations are taking longer than expected (avg: ${this.backupStats.averageBackupTime.toFixed(0)}ms). Consider enabling performance mode.`
      });
    }

    // Check if any backups failed validation
    if (backupReport.validation && backupReport.validation.invalid > 0) {
      recommendations.push({
        type: 'integrity',
        severity: 'warning',
        message: `${backupReport.validation.invalid} backups failed integrity check. Consider running cleanup and re-creating failed backups.`
      });
    }

    // Check storage usage
    if (backupReport.statistics && backupReport.statistics.totalBackups > 1000) {
      recommendations.push({
        type: 'storage',
        severity: 'info',
        message: `Large number of backups (${backupReport.statistics.totalBackups}). Consider adjusting retention policies.`
      });
    }

    return recommendations;
  }

  updateBackupStats(duration, success) {
    if (success) {
      this.backupStats.totalBackupsCreated++;
      this.backupStats.averageBackupTime = (
        (this.backupStats.averageBackupTime * (this.backupStats.totalBackupsCreated - 1) + duration) 
        / this.backupStats.totalBackupsCreated
      );
    } else {
      this.backupStats.backupErrors++;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('🔌 Shutting down hooks with backup integration...');
    
    // Clean up any pending backup operations
    this.currentBackups.clear();
    
    // Shutdown backup manager
    if (this.backupManager && this.backupOptions.enableBackup) {
      await this.backupManager.shutdown();
    }
    
    // Shutdown parent hooks
    await super.shutdown();
    
    console.log('✅ Hooks with backup integration shutdown complete');
  }
}

module.exports = { ClaudeCodeFileHooksWithBackup };

// CLI usage
if (require.main === module) {
  const hooks = new ClaudeCodeFileHooksWithBackup({ 
    logLevel: 'debug',
    enableBackup: true,
    enableEmergencyRestore: true
  });
  
  async function testIntegration() {
    console.log('🧪 Testing Claude Code File Hooks with Backup Integration');
    console.log('========================================================');
    
    try {
      await hooks.initialize();
      
      // Test write operation with backup
      console.log('\n1️⃣  Testing Write Operation with Backup...');
      const testContent = 'import { Button } from "@/components/ui/button";\nexport default function Test() { return <Button>Test</Button>; }';
      const writeResult = await hooks.executePreWriteHook('/tmp/test-with-backup.tsx', testContent);
      console.log('✅ Write hook result:', writeResult.allowed ? 'allowed' : 'blocked');
      console.log('💾 Backup created:', writeResult.backupCreated);
      
      if (writeResult.allowed) {
        const postWriteResult = await hooks.executePostWriteHook(
          '/tmp/test-with-backup.tsx', 
          testContent, 
          { success: true }
        );
        console.log('✅ Post-write validation:', postWriteResult.success);
        console.log('💾 Backup validated:', postWriteResult.backupValidated);
      }
      
      // Test backup listing
      console.log('\n2️⃣  Testing Backup Listing...');
      const backups = await hooks.listAvailableBackups('/tmp/test-with-backup.tsx');
      console.log(`📋 Found ${backups.length} backups for test file`);
      
      // Test manual backup
      console.log('\n3️⃣  Testing Manual Backup...');
      const manualBackup = await hooks.createManualBackup('/tmp/test-with-backup.tsx', 'test-run');
      console.log('✅ Manual backup:', manualBackup.created ? 'created' : 'failed');
      
      // Test backup validation
      console.log('\n4️⃣  Testing Backup Validation...');
      const validation = await hooks.validateAllBackups();
      console.log(`🔍 Validation results: ${validation.valid}/${validation.total} valid`);
      
      // Generate backup report
      console.log('\n5️⃣  Generating Backup Report...');
      const report = await hooks.generateBackupReport();
      console.log('📊 Backup Report Generated');
      console.log('🔧 Recommendations:', report.recommendations.length);
      
      // Show status
      console.log('\n6️⃣  Integration Status:');
      const status = hooks.getHookStatus();
      console.log('📊 Status:', JSON.stringify(status.backupIntegration, null, 2));
      
      // Clean up
      await hooks.shutdown();
      
      console.log('\n🎉 Backup Integration Test Complete!');
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testIntegration();
}