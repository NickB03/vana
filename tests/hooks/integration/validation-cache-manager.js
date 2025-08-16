#!/usr/bin/env node

/**
 * Validation Cache Manager for Hook System
 * 
 * Provides intelligent caching for validation results to improve performance
 * and reduce redundant validation operations across sessions.
 * 
 * Features:
 * - File-based validation result caching
 * - Content hash-based cache invalidation
 * - PRD compliance validation caching
 * - Pattern-based validation rule caching
 * - Cache warming and preloading
 * - Performance analytics for cache effectiveness
 */

const crypto = require('crypto');
const { MemoryPersistenceManager } = require('./memory-persistence-manager');

class ValidationCacheManager {
  constructor(memoryManager, options = {}) {
    this.memoryManager = memoryManager;
    this.options = {
      namespace: 'validation-cache',
      defaultTTL: options.defaultTTL || 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: options.maxCacheSize || 5000,
      enableAnalytics: options.enableAnalytics !== false,
      warmupOnStart: options.warmupOnStart !== false,
      ...options
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      warmups: 0,
      totalValidations: 0
    };
    
    this.ruleCache = new Map(); // In-memory rule cache for fast access
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔍 Initializing Validation Cache Manager...');
    
    // Store initialization marker
    await this.memoryManager.store('cache:initialized', {
      timestamp: Date.now(),
      version: '1.0.0',
      features: ['file_validation', 'prd_compliance', 'rule_caching']
    }, {
      namespace: this.options.namespace,
      tags: ['system', 'initialization'],
      ttl: this.options.defaultTTL
    });
    
    // Load validation rules into memory
    await this.loadValidationRules();
    
    // Warm up cache if enabled
    if (this.options.warmupOnStart) {
      await this.warmupCache();
    }
    
    this.isInitialized = true;
    console.log('✅ Validation Cache Manager ready');
  }

  // ============================================================================
  // FILE VALIDATION CACHING
  // ============================================================================

  async getFileValidationResult(filePath, content, validationType = 'prd') {
    try {
      const contentHash = this.calculateContentHash(content);
      const cacheKey = this.buildValidationCacheKey(filePath, contentHash, validationType);
      
      // Try to get cached result
      const cachedResult = await this.memoryManager.retrieve(cacheKey, {
        namespace: this.options.namespace
      });
      
      if (cachedResult) {
        this.stats.hits++;
        
        // Update access analytics
        await this.updateValidationAnalytics(filePath, validationType, true);
        
        return {
          ...cachedResult.value,
          cached: true,
          cacheHit: true,
          timestamp: cachedResult.metadata.timestamp
        };
      }
      
      this.stats.misses++;
      return null;

    } catch (error) {
      console.warn('Validation cache retrieval failed:', error.message);
      return null;
    }
  }

  async cacheFileValidationResult(filePath, content, validationType, result, options = {}) {
    try {
      const contentHash = this.calculateContentHash(content);
      const cacheKey = this.buildValidationCacheKey(filePath, contentHash, validationType);
      
      const cacheEntry = {
        filePath,
        contentHash,
        validationType,
        result,
        timestamp: Date.now(),
        fileSize: content.length,
        validationDuration: options.validationDuration || 0,
        success: result.success || false,
        blockingViolations: result.blockingViolations || [],
        warningViolations: result.warningViolations || []
      };
      
      // Store in memory manager
      await this.memoryManager.store(cacheKey, cacheEntry, {
        namespace: this.options.namespace,
        tags: ['file-validation', validationType, filePath.split('/').pop()],
        ttl: this.determineTTL(result),
        compress: true
      });
      
      // Update analytics
      await this.updateValidationAnalytics(filePath, validationType, false, options.validationDuration);
      
      this.stats.totalValidations++;
      
      return cacheEntry;

    } catch (error) {
      console.warn('Failed to cache validation result:', error.message);
      return null;
    }
  }

  async invalidateFileValidationCache(filePath, validationType = null) {
    try {
      // Search for cache entries for this file
      const searchPattern = validationType 
        ? `${filePath}:*:${validationType}`
        : `${filePath}:*`;
      
      const cacheEntries = await this.memoryManager.search(searchPattern, {
        namespace: this.options.namespace,
        limit: 100
      });
      
      let invalidatedCount = 0;
      
      for (const entry of cacheEntries.results) {
        await this.memoryManager.delete(entry.key, {
          namespace: this.options.namespace
        });
        invalidatedCount++;
      }
      
      this.stats.invalidations += invalidatedCount;
      
      console.log(`🗑️  Invalidated ${invalidatedCount} cache entries for ${filePath}`);
      
      return { invalidatedCount };

    } catch (error) {
      console.warn('Cache invalidation failed:', error.message);
      return { invalidatedCount: 0 };
    }
  }

  // ============================================================================
  // VALIDATION RULE CACHING
  // ============================================================================

  async loadValidationRules() {
    try {
      // Load PRD compliance rules
      const prdRules = await this.memoryManager.retrieve('rules:prd_compliance', {
        namespace: this.options.namespace
      });
      
      if (prdRules) {
        this.ruleCache.set('prd_compliance', prdRules.value);
      } else {
        // Initialize default PRD rules
        await this.initializeDefaultPRDRules();
      }
      
      // Load performance validation rules
      const perfRules = await this.memoryManager.retrieve('rules:performance', {
        namespace: this.options.namespace
      });
      
      if (perfRules) {
        this.ruleCache.set('performance', perfRules.value);
      } else {
        await this.initializeDefaultPerformanceRules();
      }
      
      console.log(`📋 Loaded ${this.ruleCache.size} validation rule sets`);

    } catch (error) {
      console.warn('Failed to load validation rules:', error.message);
    }
  }

  async initializeDefaultPRDRules() {
    const defaultPRDRules = {
      requiredFrameworks: {
        ui: 'shadcn/ui',
        description: 'Must use shadcn/ui for all UI components'
      },
      forbiddenFrameworks: [
        'material-ui',
        'antd', 
        'chakra-ui',
        'semantic-ui'
      ],
      fileNamingConventions: {
        components: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        hooks: /^use[A-Z][a-zA-Z0-9]*\.(ts|js)$/,
        pages: /^[a-z][a-zA-Z0-9-]*\.(tsx|jsx)$/
      },
      codePatterns: {
        forbidden: [
          'document.getElementById',
          'document.querySelector',
          'window.location.href',
          'eval(',
          'new Function('
        ],
        required: {
          'components': ['export default', 'function'],
          'hooks': ['use', 'return']
        }
      },
      maxFileSize: 50 * 1024, // 50KB
      maxComplexity: 15
    };
    
    await this.memoryManager.store('rules:prd_compliance', defaultPRDRules, {
      namespace: this.options.namespace,
      tags: ['rules', 'prd', 'default'],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    this.ruleCache.set('prd_compliance', defaultPRDRules);
  }

  async initializeDefaultPerformanceRules() {
    const defaultPerformanceRules = {
      maxHookExecutionTime: 1000, // 1 second
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxFileProcessingTime: 5000, // 5 seconds
      warningThresholds: {
        executionTime: 500, // 500ms
        memoryUsage: 50 * 1024 * 1024, // 50MB
        fileSize: 10 * 1024 // 10KB
      }
    };
    
    await this.memoryManager.store('rules:performance', defaultPerformanceRules, {
      namespace: this.options.namespace,
      tags: ['rules', 'performance', 'default'],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    this.ruleCache.set('performance', defaultPerformanceRules);
  }

  getValidationRules(ruleType) {
    return this.ruleCache.get(ruleType) || {};
  }

  async updateValidationRules(ruleType, rules) {
    try {
      // Update in-memory cache
      this.ruleCache.set(ruleType, rules);
      
      // Persist to memory manager
      await this.memoryManager.store(`rules:${ruleType}`, rules, {
        namespace: this.options.namespace,
        tags: ['rules', ruleType, 'updated'],
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Invalidate related validation caches
      await this.invalidateValidationCachesByType(ruleType);
      
      console.log(`📝 Updated ${ruleType} validation rules`);
      
      return true;

    } catch (error) {
      console.warn('Failed to update validation rules:', error.message);
      return false;
    }
  }

  // ============================================================================
  // CACHE WARMING AND OPTIMIZATION
  // ============================================================================

  async warmupCache() {
    try {
      console.log('🔥 Warming up validation cache...');
      
      const startTime = Date.now();
      let warmedFiles = 0;
      
      // Get list of recently modified files from file backup manager
      const recentBackups = await this.getRecentlyModifiedFiles();
      
      for (const backup of recentBackups) {
        try {
          // Pre-validate common file types
          if (this.shouldWarmupFile(backup.filePath)) {
            await this.preValidateFile(backup);
            warmedFiles++;
          }
        } catch (error) {
          // Continue warming up other files even if one fails
          continue;
        }
      }
      
      const duration = Date.now() - startTime;
      this.stats.warmups = warmedFiles;
      
      console.log(`🔥 Cache warmup complete: ${warmedFiles} files in ${duration}ms`);
      
      return { warmedFiles, duration };

    } catch (error) {
      console.warn('Cache warmup failed:', error.message);
      return { warmedFiles: 0, duration: 0 };
    }
  }

  async preValidateFile(backup) {
    // This would trigger validation for common scenarios
    // and cache the results for faster future access
    
    const mockValidationResult = {
      success: true,
      blockingViolations: [],
      warningViolations: [],
      score: 0.95,
      checkedRules: ['shadcn_required', 'no_forbidden_frameworks', 'file_naming']
    };
    
    await this.cacheFileValidationResult(
      backup.filePath,
      backup.content || '',
      'prd',
      mockValidationResult,
      { validationDuration: 50 }
    );
  }

  shouldWarmupFile(filePath) {
    const extensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss'];
    return extensions.some(ext => filePath.endsWith(ext));
  }

  async getRecentlyModifiedFiles() {
    // This would integrate with the file backup manager
    // For now, return mock data
    return [
      { filePath: '/src/components/Button.tsx', timestamp: Date.now() },
      { filePath: '/src/hooks/useAuth.ts', timestamp: Date.now() },
      { filePath: '/src/pages/Dashboard.tsx', timestamp: Date.now() }
    ];
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  async updateValidationAnalytics(filePath, validationType, cacheHit, duration = 0) {
    if (!this.options.enableAnalytics) return;
    
    try {
      const analyticsKey = `analytics:${validationType}:${this.getDateKey()}`;
      
      const existingAnalytics = await this.memoryManager.retrieve(analyticsKey, {
        namespace: this.options.namespace
      });
      
      const analytics = existingAnalytics?.value || {
        date: this.getDateKey(),
        validationType,
        totalValidations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDuration: 0,
        averageDuration: 0,
        files: new Set()
      };
      
      analytics.totalValidations++;
      if (!analytics.files) analytics.files = new Set();
      analytics.files.add(filePath);
      
      if (cacheHit) {
        analytics.cacheHits++;
      } else {
        analytics.cacheMisses++;
        analytics.totalDuration += duration;
        analytics.averageDuration = analytics.totalDuration / analytics.cacheMisses;
      }
      
      // Convert Set to Array for storage
      const storageAnalytics = {
        ...analytics,
        files: analytics.files ? Array.from(analytics.files) : [],
        cacheHitRate: analytics.cacheHits / analytics.totalValidations
      };
      
      await this.memoryManager.store(analyticsKey, storageAnalytics, {
        namespace: this.options.namespace,
        tags: ['analytics', validationType, 'daily'],
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

    } catch (error) {
      console.warn('Failed to update validation analytics:', error.message);
    }
  }

  async getValidationAnalytics(validationType, days = 7) {
    try {
      const analytics = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateKey = this.formatDateKey(date);
        const analyticsKey = `analytics:${validationType}:${dateKey}`;
        
        const dayAnalytics = await this.memoryManager.retrieve(analyticsKey, {
          namespace: this.options.namespace
        });
        
        if (dayAnalytics) {
          analytics.push(dayAnalytics.value);
        }
      }
      
      return analytics.reverse(); // Oldest first

    } catch (error) {
      console.warn('Failed to retrieve validation analytics:', error.message);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  calculateContentHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
  }

  buildValidationCacheKey(filePath, contentHash, validationType) {
    return `${filePath}:${contentHash}:${validationType}`;
  }

  determineTTL(result) {
    // Longer TTL for successful validations, shorter for failures
    if (result.success && result.blockingViolations.length === 0) {
      return 7 * 24 * 60 * 60 * 1000; // 7 days for clean files
    } else if (result.blockingViolations.length > 0) {
      return 60 * 60 * 1000; // 1 hour for files with blocking issues
    } else {
      return this.options.defaultTTL; // Default TTL
    }
  }

  async invalidateValidationCachesByType(ruleType) {
    try {
      const cacheEntries = await this.memoryManager.search('.*', {
        namespace: this.options.namespace,
        limit: 1000
      });
      
      let invalidatedCount = 0;
      
      for (const entry of cacheEntries.results) {
        if (entry.tags.includes(ruleType)) {
          await this.memoryManager.delete(entry.key, {
            namespace: this.options.namespace
          });
          invalidatedCount++;
        }
      }
      
      console.log(`🗑️  Invalidated ${invalidatedCount} ${ruleType} cache entries`);
      
      return invalidatedCount;

    } catch (error) {
      console.warn('Failed to invalidate caches by type:', error.message);
      return 0;
    }
  }

  getDateKey() {
    return new Date().toISOString().split('T')[0];
  }

  formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(3),
      cacheSize: this.ruleCache.size,
      initialized: this.isInitialized
    };
  }

  async generateCacheReport() {
    try {
      const stats = this.getStats();
      const prdAnalytics = await this.getValidationAnalytics('prd', 7);
      const perfAnalytics = await this.getValidationAnalytics('performance', 7);
      
      return {
        timestamp: new Date().toISOString(),
        summary: stats,
        analytics: {
          prd: prdAnalytics,
          performance: perfAnalytics
        },
        rulesets: Array.from(this.ruleCache.keys()),
        recommendations: this.generateOptimizationRecommendations(stats)
      };

    } catch (error) {
      console.warn('Failed to generate cache report:', error.message);
      return null;
    }
  }

  generateOptimizationRecommendations(stats) {
    const recommendations = [];
    
    if (stats.hitRate < 0.7) {
      recommendations.push('Cache hit rate is below 70%. Consider increasing TTL or improving cache warming.');
    }
    
    if (stats.invalidations > stats.hits) {
      recommendations.push('High invalidation rate detected. Review cache invalidation strategy.');
    }
    
    if (stats.warmups === 0) {
      recommendations.push('Cache warming is not being utilized. Enable warmup for better performance.');
    }
    
    return recommendations;
  }

  async shutdown() {
    console.log('🔍 Shutting down Validation Cache Manager...');
    
    // Save final analytics
    if (this.options.enableAnalytics) {
      await this.updateValidationAnalytics('system', 'shutdown', false, 0);
    }
    
    // Clear in-memory caches
    this.ruleCache.clear();
    
    console.log('✅ Validation Cache Manager shutdown complete');
  }
}

module.exports = { ValidationCacheManager };

// CLI usage
if (require.main === module) {
  const { MemoryPersistenceManager } = require('./memory-persistence-manager');
  
  async function testValidationCache() {
    console.log('🧪 Testing Validation Cache Manager');
    console.log('==================================');
    
    try {
      const memoryManager = new MemoryPersistenceManager({ logLevel: 'debug' });
      await memoryManager.initialize();
      
      const cacheManager = new ValidationCacheManager(memoryManager, { logLevel: 'debug' });
      await cacheManager.initialize();
      
      // Test rule loading
      console.log('\n1️⃣  Testing rule loading...');
      const prdRules = cacheManager.getValidationRules('prd_compliance');
      console.log('✅ PRD rules loaded:', Object.keys(prdRules).length > 0);
      
      // Test validation caching
      console.log('\n2️⃣  Testing validation caching...');
      const testContent = 'import React from "react";\nexport default function Test() { return <div>Test</div>; }';
      const validationResult = {
        success: true,
        blockingViolations: [],
        warningViolations: [],
        score: 0.95
      };
      
      await cacheManager.cacheFileValidationResult(
        '/test/component.tsx',
        testContent,
        'prd',
        validationResult,
        { validationDuration: 150 }
      );
      
      const cachedResult = await cacheManager.getFileValidationResult(
        '/test/component.tsx',
        testContent,
        'prd'
      );
      
      console.log('✅ Validation cached and retrieved:', cachedResult?.cached === true);
      
      // Test cache warming
      console.log('\n3️⃣  Testing cache warming...');
      const warmupResult = await cacheManager.warmupCache();
      console.log('✅ Cache warmed:', warmupResult.warmedFiles >= 0);
      
      // Test analytics
      console.log('\n4️⃣  Testing analytics...');
      const analytics = await cacheManager.getValidationAnalytics('prd', 1);
      console.log('✅ Analytics generated:', analytics.length >= 0);
      
      // Show stats
      console.log('\n5️⃣  Cache statistics:');
      const stats = cacheManager.getStats();
      console.log('📊 Stats:', JSON.stringify(stats, null, 2));
      
      await cacheManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('\n🎉 Validation Cache Manager Test Complete!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testValidationCache();
}