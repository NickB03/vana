#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Memory Persistence System
 * 
 * Tests all components of the integrated memory persistence system:
 * - Memory Persistence Manager
 * - Validation Cache Manager  
 * - Performance Metrics Manager
 * - Hook Configuration Manager
 * - File Backup Manager Integration
 * - Integrated Memory Coordinator
 * 
 * Includes unit tests, integration tests, and stress tests.
 */

const fs = require('fs').promises;
const path = require('path');

// Import all components
const { MemoryPersistenceManager } = require('./memory-persistence-manager');
const { ValidationCacheManager } = require('./validation-cache-manager');
const { PerformanceMetricsManager } = require('./performance-metrics-manager');
const { HookConfigurationManager } = require('./hook-configuration-manager');
const { FileBackupManager } = require('./file-backup-manager');
const { IntegratedMemoryCoordinator } = require('./integrated-memory-coordinator');

class MemoryPersistenceTestSuite {
  constructor(options = {}) {
    this.options = {
      tempDir: options.tempDir || '/tmp/memory-persistence-tests',
      logLevel: options.logLevel || 'info',
      enableStressTests: options.enableStressTests !== false,
      enableIntegrationTests: options.enableIntegrationTests !== false,
      cleanupAfterTests: options.cleanupAfterTests !== false,
      ...options
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    this.testData = {
      sampleFiles: [
        { path: '/test/component.tsx', content: 'import React from "react";\nexport default function Component() { return <div>Test</div>; }' },
        { path: '/test/hook.ts', content: 'import { useState } from "react";\nexport function useTest() { return useState("test"); }' },
        { path: '/test/utils.js', content: 'export function helper() { return "utility"; }' }
      ],
      sampleConfig: {
        'hooks.timeouts.post-edit': 3000,
        'validation.prdCompliance.strictMode': true,
        'memory.persistence.maxCacheSize': 2000
      },
      performanceMetrics: [
        { hookType: 'pre-task', executionTime: 300, success: true },
        { hookType: 'post-edit', executionTime: 150, success: true },
        { hookType: 'post-task', executionTime: 800, success: false, error: 'Test error' }
      ]
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Memory Persistence Test Suite');
    console.log('======================================================');
    console.log(`📁 Test directory: ${this.options.tempDir}`);
    console.log(`🔧 Options: ${JSON.stringify(this.options, null, 2)}\n`);
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run unit tests
      await this.runUnitTests();
      
      // Run integration tests
      if (this.options.enableIntegrationTests) {
        await this.runIntegrationTests();
      }
      
      // Run stress tests
      if (this.options.enableStressTests) {
        await this.runStressTests();
      }
      
      // Generate test report
      await this.generateTestReport();
      
      // Cleanup
      if (this.options.cleanupAfterTests) {
        await this.cleanupTestEnvironment();
      }
      
      // Display results
      this.displayTestResults();
      
      return this.testResults.failed === 0;

    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      this.testResults.errors.push(error.message);
      return false;
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Create test directories
    await fs.mkdir(this.options.tempDir, { recursive: true });
    await fs.mkdir(path.join(this.options.tempDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(this.options.tempDir, 'backups'), { recursive: true });
    await fs.mkdir(path.join(this.options.tempDir, 'test-files'), { recursive: true });
    
    // Create test files
    for (const file of this.testData.sampleFiles) {
      const fullPath = path.join(this.options.tempDir, 'test-files', file.path.replace(/^\//, ''));
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf8');
    }
    
    console.log('✅ Test environment ready');
  }

  // ============================================================================
  // UNIT TESTS
  // ============================================================================

  async runUnitTests() {
    console.log('\n📋 Running Unit Tests');
    console.log('====================');
    
    await this.testMemoryPersistenceManager();
    await this.testValidationCacheManager();
    await this.testPerformanceMetricsManager();
    await this.testHookConfigurationManager();
    await this.testFileBackupManager();
  }

  async testMemoryPersistenceManager() {
    console.log('\n1️⃣  Testing Memory Persistence Manager...');
    
    try {
      const manager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory'),
        logLevel: this.options.logLevel
      });
      
      await manager.initialize();
      
      // Test basic operations
      await this.assert(
        'Memory manager initializes',
        manager.isInitialized === true
      );
      
      // Test store/retrieve
      const storeResult = await manager.store('test:key', { data: 'test value' }, {
        namespace: 'test',
        tags: ['unit-test']
      });
      
      await this.assert(
        'Store operation succeeds',
        storeResult.success === true
      );
      
      const retrieveResult = await manager.retrieve('test:key', { namespace: 'test' });
      
      await this.assert(
        'Retrieve operation returns correct data',
        retrieveResult && retrieveResult.value.data === 'test value'
      );
      
      // Test search
      const searchResults = await manager.search('test:*', { namespace: 'test' });
      
      await this.assert(
        'Search finds stored entries',
        searchResults.results.length > 0
      );
      
      // Test delete
      const deleteResult = await manager.delete('test:key', { namespace: 'test' });
      
      await this.assert(
        'Delete operation succeeds',
        deleteResult.success === true
      );
      
      // Test TTL expiration simulation
      await manager.store('test:expire', { data: 'will expire' }, {
        namespace: 'test',
        ttl: 1 // 1ms TTL
      });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const expiredResult = await manager.retrieve('test:expire', { namespace: 'test' });
      
      await this.assert(
        'TTL expiration works',
        expiredResult === null
      );
      
      await manager.shutdown();
      
      console.log('✅ Memory Persistence Manager tests passed');

    } catch (error) {
      await this.recordTestFailure('Memory Persistence Manager', error);
    }
  }

  async testValidationCacheManager() {
    console.log('\n2️⃣  Testing Validation Cache Manager...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-validation'),
        logLevel: this.options.logLevel
      });
      
      await memoryManager.initialize();
      
      const cacheManager = new ValidationCacheManager(memoryManager, {
        warmupOnStart: false
      });
      
      await cacheManager.initialize();
      
      // Test validation result caching
      const testContent = 'import React from "react";';
      const validationResult = {
        success: true,
        blockingViolations: [],
        warningViolations: [],
        score: 0.95
      };
      
      const cacheResult = await cacheManager.cacheFileValidationResult(
        '/test/file.tsx',
        testContent,
        'prd',
        validationResult,
        { validationDuration: 100 }
      );
      
      await this.assert(
        'Validation result caching succeeds',
        cacheResult !== null
      );
      
      // Test cache retrieval
      const cachedResult = await cacheManager.getFileValidationResult(
        '/test/file.tsx',
        testContent,
        'prd'
      );
      
      await this.assert(
        'Cached validation result retrieval succeeds',
        cachedResult && cachedResult.cached === true && cachedResult.score === 0.95
      );
      
      // Test cache invalidation
      const invalidationResult = await cacheManager.invalidateFileValidationCache('/test/file.tsx');
      
      await this.assert(
        'Cache invalidation succeeds',
        invalidationResult.invalidatedCount > 0
      );
      
      // Test rule management
      const prdRules = cacheManager.getValidationRules('prd_compliance');
      
      await this.assert(
        'PRD validation rules loaded',
        prdRules && typeof prdRules === 'object'
      );
      
      const updateResult = await cacheManager.updateValidationRules('prd_compliance', {
        ...prdRules,
        testRule: 'test value'
      });
      
      await this.assert(
        'Validation rules update succeeds',
        updateResult === true
      );
      
      await cacheManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('✅ Validation Cache Manager tests passed');

    } catch (error) {
      await this.recordTestFailure('Validation Cache Manager', error);
    }
  }

  async testPerformanceMetricsManager() {
    console.log('\n3️⃣  Testing Performance Metrics Manager...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-perf'),
        logLevel: this.options.logLevel
      });
      
      await memoryManager.initialize();
      
      const metricsManager = new PerformanceMetricsManager(memoryManager, {
        enableRealTimeAlerts: false // Disable for testing
      });
      
      await metricsManager.initialize();
      
      // Test hook execution recording
      for (const metric of this.testData.performanceMetrics) {
        const result = await metricsManager.recordHookExecution(metric.hookType, metric);
        
        await this.assert(
          `Hook execution recording for ${metric.hookType}`,
          result !== null && result.hookType === metric.hookType
        );
      }
      
      // Test file operation recording
      const fileOpResult = await metricsManager.recordFileOperation('backup', '/test/file.js', {
        duration: 150,
        fileSize: 1024,
        success: true
      });
      
      await this.assert(
        'File operation recording succeeds',
        fileOpResult !== null && fileOpResult.operation === 'backup'
      );
      
      // Test memory snapshot
      const snapshotResult = await metricsManager.recordMemorySnapshot({ context: 'test' });
      
      await this.assert(
        'Memory snapshot recording succeeds',
        snapshotResult !== null && snapshotResult.timestamp > 0
      );
      
      // Test bottleneck detection
      const bottlenecks = await metricsManager.detectBottlenecks();
      
      await this.assert(
        'Bottleneck detection runs',
        Array.isArray(bottlenecks)
      );
      
      // Test performance trend analysis
      const trends = await metricsManager.analyzePerformanceTrends('post-edit', 1);
      
      await this.assert(
        'Performance trend analysis runs',
        trends && Array.isArray(trends.trends)
      );
      
      await metricsManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('✅ Performance Metrics Manager tests passed');

    } catch (error) {
      await this.recordTestFailure('Performance Metrics Manager', error);
    }
  }

  async testHookConfigurationManager() {
    console.log('\n4️⃣  Testing Hook Configuration Manager...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-config'),
        logLevel: this.options.logLevel
      });
      
      await memoryManager.initialize();
      
      const configManager = new HookConfigurationManager(memoryManager, {
        enableHotReload: false // Disable for testing
      });
      
      await configManager.initialize();
      
      // Test configuration retrieval
      const config = await configManager.getConfiguration();
      
      await this.assert(
        'Configuration retrieval succeeds',
        config && typeof config === 'object'
      );
      
      // Test configuration updates
      const updateResult = await configManager.updateConfiguration(
        this.testData.sampleConfig,
        'Test configuration update',
        'test-suite'
      );
      
      await this.assert(
        'Configuration update succeeds',
        updateResult.success === true
      );
      
      // Test specific configuration retrieval
      const timeoutConfig = await configManager.getConfiguration('hooks.timeouts.post-edit');
      
      await this.assert(
        'Specific configuration retrieval succeeds',
        timeoutConfig === this.testData.sampleConfig['hooks.timeouts.post-edit']
      );
      
      // Test configuration validation
      const validationResult = await configManager.validateConfiguration();
      
      await this.assert(
        'Configuration validation runs',
        validationResult && typeof validationResult.valid === 'boolean'
      );
      
      // Test configuration history
      const history = await configManager.getConfigurationHistory(5);
      
      await this.assert(
        'Configuration history retrieval succeeds',
        Array.isArray(history)
      );
      
      // Test configuration versioning
      const versions = await configManager.getConfigurationVersions();
      
      await this.assert(
        'Configuration versions retrieval succeeds',
        Array.isArray(versions)
      );
      
      await configManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('✅ Hook Configuration Manager tests passed');

    } catch (error) {
      await this.recordTestFailure('Hook Configuration Manager', error);
    }
  }

  async testFileBackupManager() {
    console.log('\n5️⃣  Testing File Backup Manager...');
    
    try {
      const backupManager = new FileBackupManager({
        backupDir: path.join(this.options.tempDir, 'backups'),
        logLevel: this.options.logLevel
      });
      
      await backupManager.initialize();
      
      // Create test file
      const testFile = path.join(this.options.tempDir, 'test-backup.js');
      const testContent = 'console.log("test backup");';
      await fs.writeFile(testFile, testContent, 'utf8');
      
      // Test backup creation
      const backupResult = await backupManager.createPreModificationBackup(testFile, {
        operation: 'test-backup',
        hookType: 'test'
      });
      
      await this.assert(
        'Backup creation succeeds',
        backupResult.created === true
      );
      
      // Test backup validation
      const validationResult = await backupManager.validatePostModificationBackup(
        testFile,
        backupResult.backupId
      );
      
      await this.assert(
        'Backup validation succeeds',
        validationResult.validated === true
      );
      
      // Test backup listing
      const backups = await backupManager.listBackupsForFile(testFile);
      
      await this.assert(
        'Backup listing succeeds',
        Array.isArray(backups) && backups.length > 0
      );
      
      // Test backup retrieval
      const retrievedBackup = await backupManager.retrieveBackup(backupResult.backupId);
      
      await this.assert(
        'Backup retrieval succeeds',
        retrievedBackup.retrieved === true && retrievedBackup.content === testContent
      );
      
      // Test backup integrity validation
      const integrityResult = await backupManager.validateBackupIntegrity(backupResult.backupId);
      
      await this.assert(
        'Backup integrity validation succeeds',
        integrityResult.valid === true
      );
      
      // Test file restore (dry run)
      const restoreResult = await backupManager.restoreFile(testFile, backupResult.backupId, {
        dryRun: true
      });
      
      await this.assert(
        'File restore (dry run) succeeds',
        restoreResult.success === true && restoreResult.dryRun === true
      );
      
      await backupManager.shutdown();
      
      console.log('✅ File Backup Manager tests passed');

    } catch (error) {
      await this.recordTestFailure('File Backup Manager', error);
    }
  }

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests');
    console.log('===========================');
    
    await this.testIntegratedMemoryCoordinator();
    await this.testCrossComponentIntegration();
    await this.testClaudeFlowIntegration();
  }

  async testIntegratedMemoryCoordinator() {
    console.log('\n6️⃣  Testing Integrated Memory Coordinator...');
    
    try {
      const coordinator = new IntegratedMemoryCoordinator({
        storageDir: path.join(this.options.tempDir, 'memory-integrated'),
        logLevel: this.options.logLevel,
        enablePerformanceMonitoring: true,
        enableFileBackupIntegration: true,
        coordinationInterval: 5000, // Longer interval for testing
        healthCheckInterval: 10000
      });
      
      const initResult = await coordinator.initialize();
      
      await this.assert(
        'Integrated coordinator initializes',
        initResult.success === true
      );
      
      // Test unified memory interface
      await coordinator.store('integration:test', { message: 'integration test' }, {
        namespace: 'integration',
        tags: ['test']
      });
      
      const retrieved = await coordinator.retrieve('integration:test', { namespace: 'integration' });
      
      await this.assert(
        'Unified memory interface works',
        retrieved && retrieved.value.message === 'integration test'
      );
      
      // Test validation cache integration
      const testContent = 'import React from "react";';
      
      await coordinator.cacheValidationResult('/integration/test.tsx', testContent, 'prd', {
        success: true,
        score: 0.9
      });
      
      const cachedValidation = await coordinator.getCachedValidationResult(
        '/integration/test.tsx',
        testContent,
        'prd'
      );
      
      await this.assert(
        'Validation cache integration works',
        cachedValidation && cachedValidation.cached === true
      );
      
      // Test performance metrics integration
      await coordinator.recordHookPerformance('post-edit', {
        executionTime: 200,
        success: true,
        filePath: '/integration/test.tsx'
      });
      
      const bottlenecks = await coordinator.detectPerformanceBottlenecks();
      
      await this.assert(
        'Performance metrics integration works',
        Array.isArray(bottlenecks)
      );
      
      // Test configuration integration
      const configUpdate = await coordinator.updateConfiguration({
        'hooks.timeouts.post-edit': 2500
      }, 'Integration test update', 'test-suite');
      
      await this.assert(
        'Configuration integration works',
        configUpdate.success === true
      );
      
      // Test comprehensive reporting
      const report = await coordinator.generateComprehensiveReport();
      
      await this.assert(
        'Comprehensive reporting works',
        report && report.coordinator && report.memory && report.validation
      );
      
      // Test system status
      const status = await coordinator.getSystemStatus();
      
      await this.assert(
        'System status reporting works',
        status && status.initialized === true
      );
      
      await coordinator.shutdown();
      
      console.log('✅ Integrated Memory Coordinator tests passed');

    } catch (error) {
      await this.recordTestFailure('Integrated Memory Coordinator', error);
    }
  }

  async testCrossComponentIntegration() {
    console.log('\n7️⃣  Testing Cross-Component Integration...');
    
    try {
      // Test coordination between validation cache and performance metrics
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-cross'),
        logLevel: this.options.logLevel
      });
      
      await memoryManager.initialize();
      
      const validationCache = new ValidationCacheManager(memoryManager);
      const performanceMetrics = new PerformanceMetricsManager(memoryManager);
      
      await validationCache.initialize();
      await performanceMetrics.initialize();
      
      // Cache validation result and record performance
      const testContent = 'export function test() { return true; }';
      const validationStart = Date.now();
      
      await validationCache.cacheFileValidationResult('/cross/test.js', testContent, 'prd', {
        success: true,
        blockingViolations: [],
        score: 0.88
      }, { validationDuration: 120 });
      
      await performanceMetrics.recordHookExecution('validation-cache', {
        executionTime: Date.now() - validationStart,
        success: true,
        filePath: '/cross/test.js',
        operationType: 'cache-validation'
      });
      
      // Verify both components have data
      const cachedResult = await validationCache.getFileValidationResult('/cross/test.js', testContent, 'prd');
      const recentMetrics = await performanceMetrics.getRecentMetrics('validation-cache', 10);
      
      await this.assert(
        'Cross-component data consistency',
        cachedResult && cachedResult.cached === true && recentMetrics.length > 0
      );
      
      await validationCache.shutdown();
      await performanceMetrics.shutdown();
      await memoryManager.shutdown();
      
      console.log('✅ Cross-Component Integration tests passed');

    } catch (error) {
      await this.recordTestFailure('Cross-Component Integration', error);
    }
  }

  async testClaudeFlowIntegration() {
    console.log('\n8️⃣  Testing Claude Flow Integration...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-claude-flow'),
        claudeFlowIntegration: true,
        enableSynchronization: true,
        logLevel: this.options.logLevel
      });
      
      await memoryManager.initialize();
      
      // Test Claude Flow integration marker
      const integrationMarker = await memoryManager.retrieve('system:claude_flow_integration', {
        namespace: 'system'
      });
      
      await this.assert(
        'Claude Flow integration marker exists',
        integrationMarker && integrationMarker.value.enabled === true
      );
      
      // Test sync state tracking
      const syncState = memoryManager.claudeFlowSyncState;
      
      await this.assert(
        'Claude Flow sync state initialized',
        syncState && typeof syncState === 'object'
      );
      
      // Test bridge status
      const bridgeStatus = await memoryManager.retrieve('bridge:status', {
        namespace: 'claude-flow-bridge'
      });
      
      await this.assert(
        'Claude Flow bridge status exists',
        bridgeStatus && bridgeStatus.value.status === 'active'
      );
      
      await memoryManager.shutdown();
      
      console.log('✅ Claude Flow Integration tests passed');

    } catch (error) {
      await this.recordTestFailure('Claude Flow Integration', error);
    }
  }

  // ============================================================================
  // STRESS TESTS
  // ============================================================================

  async runStressTests() {
    console.log('\n💪 Running Stress Tests');
    console.log('======================');
    
    await this.testHighVolumeOperations();
    await this.testConcurrentAccess();
    await this.testMemoryPressure();
  }

  async testHighVolumeOperations() {
    console.log('\n9️⃣  Testing High Volume Operations...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-stress'),
        logLevel: 'error' // Reduce logging for stress tests
      });
      
      await memoryManager.initialize();
      
      const startTime = Date.now();
      const operations = 1000;
      let successful = 0;
      
      // Perform high volume store operations
      for (let i = 0; i < operations; i++) {
        try {
          await memoryManager.store(`stress:key${i}`, {
            index: i,
            data: `stress test data ${i}`,
            timestamp: Date.now()
          }, {
            namespace: 'stress',
            tags: ['stress-test']
          });
          successful++;
        } catch (error) {
          // Continue with other operations
        }
      }
      
      const duration = Date.now() - startTime;
      const opsPerSecond = (successful / duration) * 1000;
      
      await this.assert(
        `High volume operations (${successful}/${operations} in ${duration}ms, ${opsPerSecond.toFixed(1)} ops/sec)`,
        successful > operations * 0.95 // At least 95% success rate
      );
      
      await memoryManager.shutdown();
      
      console.log('✅ High Volume Operations tests passed');

    } catch (error) {
      await this.recordTestFailure('High Volume Operations', error);
    }
  }

  async testConcurrentAccess() {
    console.log('\n🔟 Testing Concurrent Access...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-concurrent'),
        logLevel: 'error'
      });
      
      await memoryManager.initialize();
      
      // Run concurrent operations
      const concurrentOperations = [];
      const numConcurrent = 50;
      
      for (let i = 0; i < numConcurrent; i++) {
        concurrentOperations.push(
          this.runConcurrentOperationSet(memoryManager, i)
        );
      }
      
      const results = await Promise.allSettled(concurrentOperations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      await this.assert(
        `Concurrent access (${successful}/${numConcurrent} sets completed)`,
        successful > numConcurrent * 0.9 // At least 90% success rate
      );
      
      await memoryManager.shutdown();
      
      console.log('✅ Concurrent Access tests passed');

    } catch (error) {
      await this.recordTestFailure('Concurrent Access', error);
    }
  }

  async runConcurrentOperationSet(memoryManager, setId) {
    // Store data
    await memoryManager.store(`concurrent:set${setId}`, {
      setId,
      data: `concurrent test data ${setId}`
    }, {
      namespace: 'concurrent',
      tags: ['concurrent-test']
    });
    
    // Retrieve data
    const retrieved = await memoryManager.retrieve(`concurrent:set${setId}`, {
      namespace: 'concurrent'
    });
    
    if (!retrieved || retrieved.value.setId !== setId) {
      throw new Error(`Concurrent operation failed for set ${setId}`);
    }
    
    // Update data
    await memoryManager.store(`concurrent:set${setId}`, {
      setId,
      data: `updated concurrent test data ${setId}`,
      updated: true
    }, {
      namespace: 'concurrent',
      tags: ['concurrent-test', 'updated']
    });
    
    // Delete data
    await memoryManager.delete(`concurrent:set${setId}`, {
      namespace: 'concurrent'
    });
    
    return setId;
  }

  async testMemoryPressure() {
    console.log('\n1️⃣1️⃣  Testing Memory Pressure...');
    
    try {
      const memoryManager = new MemoryPersistenceManager({
        storageDir: path.join(this.options.tempDir, 'memory-pressure'),
        maxEntries: 100, // Low limit to trigger pressure
        logLevel: 'error'
      });
      
      await memoryManager.initialize();
      
      // Fill memory beyond capacity
      const largeData = 'x'.repeat(10000); // 10KB strings
      const operations = 200; // More than maxEntries
      
      for (let i = 0; i < operations; i++) {
        await memoryManager.store(`pressure:key${i}`, {
          index: i,
          largeData,
          timestamp: Date.now()
        }, {
          namespace: 'pressure',
          tags: ['pressure-test']
        });
      }
      
      // Check that memory manager handled pressure gracefully
      const stats = memoryManager.getStats();
      const finalEntries = stats.memory.entries;
      
      await this.assert(
        `Memory pressure handling (${finalEntries} entries after ${operations} operations)`,
        finalEntries <= memoryManager.options.maxEntries * 1.1 // Allow 10% overage
      );
      
      // Verify garbage collection occurred
      await this.assert(
        'Garbage collection occurred under pressure',
        stats.performance.evictions > 0
      );
      
      await memoryManager.shutdown();
      
      console.log('✅ Memory Pressure tests passed');

    } catch (error) {
      await this.recordTestFailure('Memory Pressure', error);
    }
  }

  // ============================================================================
  // TEST UTILITIES
  // ============================================================================

  async assert(testName, condition) {
    if (condition) {
      console.log(`  ✅ ${testName}`);
      this.testResults.passed++;
    } else {
      console.log(`  ❌ ${testName}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Assertion failed: ${testName}`);
    }
  }

  async recordTestFailure(testName, error) {
    console.log(`  ❌ ${testName} failed: ${error.message}`);
    this.testResults.failed++;
    this.testResults.errors.push(`${testName}: ${error.message}`);
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Memory Persistence System',
      results: this.testResults,
      summary: {
        total: this.testResults.passed + this.testResults.failed + this.testResults.skipped,
        successRate: this.testResults.passed / (this.testResults.passed + this.testResults.failed),
        duration: Date.now() - this.startTime
      },
      environment: {
        tempDir: this.options.tempDir,
        options: this.options
      }
    };
    
    const reportPath = path.join(this.options.tempDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Test report saved: ${reportPath}`);
  }

  displayTestResults() {
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`⏭️  Skipped: ${this.testResults.skipped}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Test Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Memory persistence system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors above.');
    }
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Remove test directory
      await fs.rm(this.options.tempDir, { recursive: true, force: true });
      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error.message);
    }
  }
}

// CLI usage
if (require.main === module) {
  async function runTests() {
    const testSuite = new MemoryPersistenceTestSuite({
      tempDir: '/tmp/memory-persistence-tests-' + Date.now(),
      logLevel: 'info',
      enableStressTests: true,
      enableIntegrationTests: true,
      cleanupAfterTests: true
    });
    
    testSuite.startTime = Date.now();
    
    const success = await testSuite.runAllTests();
    
    if (success) {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed.');
      process.exit(1);
    }
  }
  
  runTests().catch(error => {
    console.error('Test suite failed to run:', error);
    process.exit(1);
  });
}

module.exports = { MemoryPersistenceTestSuite };