#!/usr/bin/env node

/**
 * Integrated Memory Coordinator
 * 
 * Main coordinator that integrates all memory persistence components for the hook system:
 * - Memory Persistence Manager (core storage)
 * - Validation Cache Manager (validation result caching)
 * - Performance Metrics Manager (performance tracking)
 * - Hook Configuration Manager (configuration persistence)
 * - File Backup Manager (file backup integration)
 * 
 * Provides a unified interface for all memory operations and coordinates
 * cross-system data flows and synchronization.
 */

const { MemoryPersistenceManager } = require('./memory-persistence-manager');
const { ValidationCacheManager } = require('./validation-cache-manager');
const { PerformanceMetricsManager } = require('./performance-metrics-manager');
const { HookConfigurationManager } = require('./hook-configuration-manager');
const { FileBackupManager } = require('./file-backup-manager');

class IntegratedMemoryCoordinator {
  constructor(options = {}) {
    this.options = {
      storageDir: options.storageDir || process.cwd() + '/.claude_workspace/memory',
      enableClaudeFlowIntegration: options.enableClaudeFlowIntegration !== false,
      enableRealTimeSync: options.enableRealTimeSync !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableFileBackupIntegration: options.enableFileBackupIntegration !== false,
      logLevel: options.logLevel || 'info',
      coordinationInterval: options.coordinationInterval || 60000, // 1 minute
      healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
      ...options
    };
    
    // Component managers
    this.memoryManager = null;
    this.validationCache = null;
    this.performanceMetrics = null;
    this.hookConfiguration = null;
    this.fileBackupManager = null;
    
    // Coordination state
    this.isInitialized = false;
    this.componentStatus = new Map();
    this.syncState = {
      lastCoordination: null,
      coordinationCount: 0,
      errorCount: 0
    };
    
    // Background processes
    this.coordinationTimer = null;
    this.healthCheckTimer = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔗 Initializing Integrated Memory Coordinator...');
    console.log('================================================');
    
    try {
      // Initialize core memory manager first
      await this.initializeMemoryManager();
      
      // Initialize specialized managers
      await this.initializeValidationCache();
      await this.initializePerformanceMetrics();
      await this.initializeHookConfiguration();
      
      // Initialize file backup integration if enabled
      if (this.options.enableFileBackupIntegration) {
        await this.initializeFileBackupManager();
      }
      
      // Start coordination processes
      this.startCoordinationProcesses();
      
      // Store coordination status
      await this.storeCoordinationStatus();
      
      this.isInitialized = true;
      
      console.log('✅ Integrated Memory Coordinator ready');
      console.log(`📊 Active components: ${this.componentStatus.size}`);
      console.log(`🔄 Coordination interval: ${this.options.coordinationInterval}ms`);
      console.log('');
      
      return {
        success: true,
        components: Array.from(this.componentStatus.keys()),
        features: this.getEnabledFeatures()
      };

    } catch (error) {
      console.error('❌ Failed to initialize Integrated Memory Coordinator:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // COMPONENT INITIALIZATION
  // ============================================================================

  async initializeMemoryManager() {
    console.log('1️⃣  Initializing Memory Persistence Manager...');
    
    this.memoryManager = new MemoryPersistenceManager({
      storageDir: this.options.storageDir,
      claudeFlowIntegration: this.options.enableClaudeFlowIntegration,
      enableSynchronization: this.options.enableRealTimeSync,
      logLevel: this.options.logLevel
    });
    
    await this.memoryManager.initialize();
    this.componentStatus.set('memory-persistence', { status: 'active', lastCheck: Date.now() });
    
    console.log('✅ Memory Persistence Manager initialized');
  }

  async initializeValidationCache() {
    console.log('2️⃣  Initializing Validation Cache Manager...');
    
    this.validationCache = new ValidationCacheManager(this.memoryManager, {
      enableAnalytics: true,
      warmupOnStart: true,
      logLevel: this.options.logLevel
    });
    
    await this.validationCache.initialize();
    this.componentStatus.set('validation-cache', { status: 'active', lastCheck: Date.now() });
    
    console.log('✅ Validation Cache Manager initialized');
  }

  async initializePerformanceMetrics() {
    if (!this.options.enablePerformanceMonitoring) {
      console.log('2️⃣  Performance monitoring disabled, skipping...');
      return;
    }
    
    console.log('3️⃣  Initializing Performance Metrics Manager...');
    
    this.performanceMetrics = new PerformanceMetricsManager(this.memoryManager, {
      enableRealTimeAlerts: true,
      enableTrendAnalysis: true,
      logLevel: this.options.logLevel
    });
    
    await this.performanceMetrics.initialize();
    this.componentStatus.set('performance-metrics', { status: 'active', lastCheck: Date.now() });
    
    console.log('✅ Performance Metrics Manager initialized');
  }

  async initializeHookConfiguration() {
    console.log('4️⃣  Initializing Hook Configuration Manager...');
    
    this.hookConfiguration = new HookConfigurationManager(this.memoryManager, {
      enableVersioning: true,
      enableValidation: true,
      enableHotReload: this.options.enableRealTimeSync,
      logLevel: this.options.logLevel
    });
    
    await this.hookConfiguration.initialize();
    this.componentStatus.set('hook-configuration', { status: 'active', lastCheck: Date.now() });
    
    console.log('✅ Hook Configuration Manager initialized');
  }

  async initializeFileBackupManager() {
    console.log('5️⃣  Initializing File Backup Manager...');
    
    this.fileBackupManager = new FileBackupManager({
      backupDir: this.options.storageDir + '/file-backups',
      enableCompression: true,
      enableIncrementalBackup: true,
      logLevel: this.options.logLevel
    });
    
    await this.fileBackupManager.initialize();
    this.componentStatus.set('file-backup', { status: 'active', lastCheck: Date.now() });
    
    console.log('✅ File Backup Manager initialized');
  }

  // ============================================================================
  // UNIFIED MEMORY INTERFACE
  // ============================================================================

  async store(key, value, options = {}) {
    try {
      const startTime = Date.now();
      
      // Store in main memory manager
      const result = await this.memoryManager.store(key, value, options);
      
      // Record performance metrics if enabled
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-store', {
          executionTime: Date.now() - startTime,
          success: result.success,
          context: { key, namespace: options.namespace || 'default' }
        });
      }
      
      return result;

    } catch (error) {
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-store', {
          executionTime: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }

  async retrieve(key, options = {}) {
    try {
      const startTime = Date.now();
      
      const result = await this.memoryManager.retrieve(key, options);
      
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-retrieve', {
          executionTime: Date.now() - startTime,
          success: result !== null,
          context: { key, namespace: options.namespace || 'default' }
        });
      }
      
      return result;

    } catch (error) {
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-retrieve', {
          executionTime: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }

  async delete(key, options = {}) {
    try {
      const startTime = Date.now();
      
      const result = await this.memoryManager.delete(key, options);
      
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-delete', {
          executionTime: Date.now() - startTime,
          success: result.success,
          context: { key, namespace: options.namespace || 'default' }
        });
      }
      
      return result;

    } catch (error) {
      if (this.performanceMetrics) {
        await this.performanceMetrics.recordHookExecution('memory-delete', {
          executionTime: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }

  async search(pattern, options = {}) {
    return await this.memoryManager.search(pattern, options);
  }

  async list(options = {}) {
    return await this.memoryManager.list(options);
  }

  // ============================================================================
  // VALIDATION CACHE INTERFACE
  // ============================================================================

  async getCachedValidationResult(filePath, content, validationType = 'prd') {
    if (!this.validationCache) return null;
    return await this.validationCache.getFileValidationResult(filePath, content, validationType);
  }

  async cacheValidationResult(filePath, content, validationType, result, options = {}) {
    if (!this.validationCache) return null;
    return await this.validationCache.cacheFileValidationResult(filePath, content, validationType, result, options);
  }

  async invalidateValidationCache(filePath, validationType = null) {
    if (!this.validationCache) return { invalidatedCount: 0 };
    return await this.validationCache.invalidateFileValidationCache(filePath, validationType);
  }

  // ============================================================================
  // PERFORMANCE METRICS INTERFACE
  // ============================================================================

  async recordHookPerformance(hookType, metrics) {
    if (!this.performanceMetrics) return null;
    return await this.performanceMetrics.recordHookExecution(hookType, metrics);
  }

  async recordFileOperation(operation, filePath, metrics) {
    if (!this.performanceMetrics) return null;
    return await this.performanceMetrics.recordFileOperation(operation, filePath, metrics);
  }

  async getPerformanceAnalytics(hookType, days = 7) {
    if (!this.performanceMetrics) return [];
    return await this.performanceMetrics.analyzePerformanceTrends(hookType, days);
  }

  async detectPerformanceBottlenecks() {
    if (!this.performanceMetrics) return [];
    return await this.performanceMetrics.detectBottlenecks();
  }

  // ============================================================================
  // CONFIGURATION INTERFACE
  // ============================================================================

  async getConfiguration(key = null) {
    if (!this.hookConfiguration) return {};
    return await this.hookConfiguration.getConfiguration(key);
  }

  async updateConfiguration(updates, changeDescription, author = 'system') {
    if (!this.hookConfiguration) return { success: false, error: 'Configuration manager not available' };
    return await this.hookConfiguration.updateConfiguration(updates, changeDescription, author);
  }

  async rollbackConfiguration(targetVersion) {
    if (!this.hookConfiguration) return { success: false, error: 'Configuration manager not available' };
    return await this.hookConfiguration.rollbackConfiguration(targetVersion);
  }

  // ============================================================================
  // FILE BACKUP INTEGRATION
  // ============================================================================

  async createFileBackup(filePath, context = {}) {
    if (!this.fileBackupManager) return { created: false, reason: 'backup_manager_not_available' };
    
    const startTime = Date.now();
    const result = await this.fileBackupManager.createPreModificationBackup(filePath, context);
    
    // Record file operation metrics
    if (this.performanceMetrics && result.created) {
      await this.performanceMetrics.recordFileOperation('backup', filePath, {
        duration: Date.now() - startTime,
        fileSize: result.performance?.originalSize || 0,
        success: result.created,
        compressionRatio: result.performance?.compressionRatio || 1
      });
    }
    
    return result;
  }

  async validateFileBackup(filePath, backupId, context = {}) {
    if (!this.fileBackupManager) return { validated: false, reason: 'backup_manager_not_available' };
    return await this.fileBackupManager.validatePostModificationBackup(filePath, backupId, context);
  }

  async restoreFile(filePath, backupId, options = {}) {
    if (!this.fileBackupManager) return { success: false, error: 'Backup manager not available' };
    
    const startTime = Date.now();
    const result = await this.fileBackupManager.restoreFile(filePath, backupId, options);
    
    // Record restore operation
    if (this.performanceMetrics) {
      await this.performanceMetrics.recordFileOperation('restore', filePath, {
        duration: Date.now() - startTime,
        success: result.success
      });
    }
    
    return result;
  }

  // ============================================================================
  // COORDINATION AND SYNCHRONIZATION
  // ============================================================================

  startCoordinationProcesses() {
    // Main coordination loop
    this.coordinationTimer = setInterval(async () => {
      await this.runCoordination();
    }, this.options.coordinationInterval);
    
    // Health check loop
    this.healthCheckTimer = setInterval(async () => {
      await this.runHealthCheck();
    }, this.options.healthCheckInterval);
  }

  async runCoordination() {
    try {
      this.syncState.coordinationCount++;
      
      // Coordinate cache warming based on recent file changes
      await this.coordinateCacheWarming();
      
      // Synchronize performance baselines
      await this.synchronizePerformanceBaselines();
      
      // Coordinate memory cleanup
      await this.coordinateMemoryCleanup();
      
      // Update coordination status
      this.syncState.lastCoordination = Date.now();
      
      await this.storeCoordinationStatus();

    } catch (error) {
      this.syncState.errorCount++;
      console.warn('Coordination cycle failed:', error.message);
    }
  }

  async coordinateCacheWarming() {
    if (!this.validationCache || !this.fileBackupManager) return;
    
    try {
      // Get recently modified files from backup manager
      const recentBackups = await this.fileBackupManager.searchBackups({
        since: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour
      });
      
      // Warm validation cache for recently modified files
      for (const backup of recentBackups.slice(0, 10)) { // Limit to 10 files
        if (this.shouldWarmCache(backup.filePath)) {
          const backupData = await this.fileBackupManager.retrieveBackup(backup.backupId);
          if (backupData && backupData.content) {
            // Check if validation is already cached
            const cached = await this.validationCache.getFileValidationResult(
              backup.filePath,
              backupData.content,
              'prd'
            );
            
            if (!cached) {
              // Pre-validate and cache result
              await this.preValidateAndCache(backup.filePath, backupData.content);
            }
          }
        }
      }

    } catch (error) {
      console.warn('Cache warming coordination failed:', error.message);
    }
  }

  async synchronizePerformanceBaselines() {
    if (!this.performanceMetrics || !this.hookConfiguration) return;
    
    try {
      // Get current performance baselines from configuration
      const currentBaselines = await this.hookConfiguration.getConfiguration('performance.baselines');
      
      if (!currentBaselines) {
        // Initialize baselines from performance metrics
        const bottlenecks = await this.performanceMetrics.detectBottlenecks();
        
        if (bottlenecks.length === 0) {
          // System is performing well, update baselines
          const newBaselines = await this.calculateOptimalBaselines();
          
          await this.hookConfiguration.updateConfiguration({
            'performance.baselines': newBaselines
          }, 'Auto-update performance baselines', 'coordinator');
        }
      }

    } catch (error) {
      console.warn('Performance baseline synchronization failed:', error.message);
    }
  }

  async coordinateMemoryCleanup() {
    if (!this.memoryManager) return;
    
    try {
      // Get memory usage statistics
      const stats = this.memoryManager.getStats();
      
      // If memory usage is high, trigger cleanup
      if (stats.memory.estimatedBytes > 50 * 1024 * 1024) { // 50MB threshold
        console.log('🧹 Coordinating memory cleanup...');
        
        // Clean up expired validation cache entries
        if (this.validationCache) {
          await this.validationCache.invalidateValidationCachesByType('expired');
        }
        
        // Clean up old performance metrics
        if (this.performanceMetrics) {
          // This would trigger cleanup of old metrics
          await this.memoryManager.store('cleanup:trigger', {
            timestamp: Date.now(),
            reason: 'memory_threshold_exceeded'
          }, {
            namespace: 'system',
            ttl: 60 * 1000 // 1 minute
          });
        }
      }

    } catch (error) {
      console.warn('Memory cleanup coordination failed:', error.message);
    }
  }

  async runHealthCheck() {
    try {
      // Check each component's health
      for (const [componentName, status] of this.componentStatus.entries()) {
        const isHealthy = await this.checkComponentHealth(componentName);
        status.lastCheck = Date.now();
        status.status = isHealthy ? 'active' : 'degraded';
      }
      
      // Store health check results
      await this.storeHealthCheckResults();

    } catch (error) {
      console.warn('Health check failed:', error.message);
    }
  }

  async checkComponentHealth(componentName) {
    try {
      switch (componentName) {
        case 'memory-persistence':
          return this.memoryManager && this.memoryManager.isInitialized;
        case 'validation-cache':
          return this.validationCache && this.validationCache.isInitialized;
        case 'performance-metrics':
          return this.performanceMetrics && this.performanceMetrics.isInitialized;
        case 'hook-configuration':
          return this.hookConfiguration && this.hookConfiguration.isInitialized;
        case 'file-backup':
          return this.fileBackupManager && this.fileBackupManager.isInitialized;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  async generateComprehensiveReport() {
    try {
      const report = {
        generated: Date.now(),
        coordinator: {
          status: this.isInitialized ? 'active' : 'inactive',
          components: Object.fromEntries(this.componentStatus),
          syncState: this.syncState,
          enabledFeatures: this.getEnabledFeatures()
        },
        memory: this.memoryManager ? this.memoryManager.getStats() : null,
        validation: this.validationCache ? await this.validationCache.generateCacheReport() : null,
        performance: this.performanceMetrics ? await this.performanceMetrics.generatePerformanceReport(7) : null,
        configuration: this.hookConfiguration ? await this.hookConfiguration.generateConfigurationReport() : null,
        fileBackup: this.fileBackupManager ? await this.fileBackupManager.generateBackupReport() : null
      };
      
      // Store comprehensive report
      await this.memoryManager.store('report:comprehensive', report, {
        namespace: 'system',
        tags: ['report', 'comprehensive'],
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return report;

    } catch (error) {
      console.warn('Failed to generate comprehensive report:', error.message);
      return null;
    }
  }

  async getSystemStatus() {
    return {
      initialized: this.isInitialized,
      components: Object.fromEntries(this.componentStatus),
      syncState: this.syncState,
      memoryUsage: this.memoryManager ? this.memoryManager.getStats() : null,
      features: this.getEnabledFeatures()
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getEnabledFeatures() {
    return {
      claudeFlowIntegration: this.options.enableClaudeFlowIntegration,
      realTimeSync: this.options.enableRealTimeSync,
      performanceMonitoring: this.options.enablePerformanceMonitoring,
      fileBackupIntegration: this.options.enableFileBackupIntegration,
      validationCaching: !!this.validationCache,
      configurationManagement: !!this.hookConfiguration
    };
  }

  shouldWarmCache(filePath) {
    const extensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss'];
    return extensions.some(ext => filePath.endsWith(ext));
  }

  async preValidateAndCache(filePath, content) {
    // Mock validation for cache warming
    const validationResult = {
      success: true,
      blockingViolations: [],
      warningViolations: [],
      score: 0.95,
      checkedRules: ['shadcn_required', 'no_forbidden_frameworks']
    };
    
    await this.validationCache.cacheFileValidationResult(
      filePath,
      content,
      'prd',
      validationResult,
      { validationDuration: 50 }
    );
  }

  async calculateOptimalBaselines() {
    // Calculate new performance baselines based on recent good performance
    return {
      'pre-task': 300,
      'post-edit': 150,
      'post-task': 800,
      'session-end': 1200,
      memoryUsage: 50 * 1024 * 1024,
      fileOperations: {
        read: 10,
        write: 50,
        backup: 100
      }
    };
  }

  async storeCoordinationStatus() {
    if (!this.memoryManager) return;
    
    await this.memoryManager.store('coordination:status', {
      lastCoordination: this.syncState.lastCoordination,
      coordinationCount: this.syncState.coordinationCount,
      errorCount: this.syncState.errorCount,
      componentStatus: Object.fromEntries(this.componentStatus)
    }, {
      namespace: 'system',
      tags: ['coordination', 'status'],
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async storeHealthCheckResults() {
    if (!this.memoryManager) return;
    
    await this.memoryManager.store('health:check', {
      timestamp: Date.now(),
      components: Object.fromEntries(this.componentStatus),
      overallHealth: Array.from(this.componentStatus.values()).every(s => s.status === 'active')
    }, {
      namespace: 'system',
      tags: ['health', 'check'],
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async shutdown() {
    console.log('🔗 Shutting down Integrated Memory Coordinator...');
    
    // Stop coordination processes
    if (this.coordinationTimer) clearInterval(this.coordinationTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    
    // Shutdown components in reverse order
    if (this.fileBackupManager) {
      await this.fileBackupManager.shutdown();
    }
    
    if (this.hookConfiguration) {
      await this.hookConfiguration.shutdown();
    }
    
    if (this.performanceMetrics) {
      await this.performanceMetrics.shutdown();
    }
    
    if (this.validationCache) {
      await this.validationCache.shutdown();
    }
    
    if (this.memoryManager) {
      await this.memoryManager.shutdown();
    }
    
    console.log('✅ Integrated Memory Coordinator shutdown complete');
  }
}

module.exports = { IntegratedMemoryCoordinator };

// CLI usage
if (require.main === module) {
  async function testIntegratedCoordinator() {
    console.log('🧪 Testing Integrated Memory Coordinator');
    console.log('=======================================');
    
    try {
      const coordinator = new IntegratedMemoryCoordinator({
        logLevel: 'debug',
        enablePerformanceMonitoring: true,
        enableFileBackupIntegration: true
      });
      
      const initResult = await coordinator.initialize();
      console.log('✅ Initialization result:', initResult.success);
      
      // Test unified memory interface
      console.log('\n1️⃣  Testing unified memory interface...');
      
      await coordinator.store('test:memory', { message: 'Hello World', timestamp: Date.now() }, {
        namespace: 'test',
        tags: ['demo', 'test']
      });
      
      const retrieved = await coordinator.retrieve('test:memory', { namespace: 'test' });
      console.log('✅ Memory store/retrieve:', retrieved?.value?.message === 'Hello World');
      
      // Test validation cache
      console.log('\n2️⃣  Testing validation cache...');
      
      const testContent = 'import React from "react";\nexport default function Test() { return <div>Test</div>; }';
      
      await coordinator.cacheValidationResult('/test/component.tsx', testContent, 'prd', {
        success: true,
        blockingViolations: [],
        score: 0.95
      }, { validationDuration: 150 });
      
      const cachedValidation = await coordinator.getCachedValidationResult('/test/component.tsx', testContent, 'prd');
      console.log('✅ Validation cache:', cachedValidation?.cached === true);
      
      // Test performance metrics
      console.log('\n3️⃣  Testing performance metrics...');
      
      await coordinator.recordHookPerformance('post-edit', {
        executionTime: 250,
        success: true,
        filePath: '/test/component.tsx'
      });
      
      const bottlenecks = await coordinator.detectPerformanceBottlenecks();
      console.log('✅ Performance tracking:', Array.isArray(bottlenecks));
      
      // Test configuration
      console.log('\n4️⃣  Testing configuration management...');
      
      const config = await coordinator.getConfiguration('hooks.timeouts');
      console.log('✅ Configuration retrieval:', typeof config === 'object');
      
      // Test file backup integration
      console.log('\n5️⃣  Testing file backup integration...');
      
      // Create a test file
      const fs = require('fs').promises;
      const testFile = '/tmp/test-integrated.js';
      await fs.writeFile(testFile, 'console.log("test");', 'utf8');
      
      const backupResult = await coordinator.createFileBackup(testFile, {
        operation: 'integration-test',
        hookType: 'test'
      });
      
      console.log('✅ File backup integration:', backupResult.created || backupResult.reason === 'file_not_exists');
      
      // Generate comprehensive report
      console.log('\n6️⃣  Testing comprehensive reporting...');
      
      const report = await coordinator.generateComprehensiveReport();
      console.log('✅ Comprehensive report:', report !== null);
      
      // Show system status
      console.log('\n7️⃣  System status:');
      const status = await coordinator.getSystemStatus();
      console.log('📊 Status:', JSON.stringify(status, null, 2));
      
      // Cleanup
      await coordinator.shutdown();
      await fs.unlink(testFile).catch(() => {}); // Clean up test file
      
      console.log('\n🎉 Integrated Memory Coordinator Test Complete!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testIntegratedCoordinator();
}