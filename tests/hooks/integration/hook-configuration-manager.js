#!/usr/bin/env node

/**
 * Hook Configuration Manager
 * 
 * Manages persistent configuration for the hook system, including:
 * - Hook enable/disable states
 * - Custom hook parameters and thresholds
 * - Environment-specific configurations
 * - Dynamic configuration updates
 * - Configuration validation and rollback
 * - Configuration versioning and history
 */

const { MemoryPersistenceManager } = require('./memory-persistence-manager');

class HookConfigurationManager {
  constructor(memoryManager, options = {}) {
    this.memoryManager = memoryManager;
    this.options = {
      namespace: 'hook-configuration',
      configurationTTL: options.configurationTTL || 365 * 24 * 60 * 60 * 1000, // 1 year
      enableVersioning: options.enableVersioning !== false,
      enableValidation: options.enableValidation !== false,
      enableHotReload: options.enableHotReload !== false,
      maxVersionHistory: options.maxVersionHistory || 50,
      ...options
    };
    
    this.activeConfig = new Map(); // In-memory configuration cache
    this.configSchema = this.defineConfigurationSchema();
    this.configHistory = [];
    this.isInitialized = false;
    
    // Default configuration
    this.defaultConfig = this.getDefaultConfiguration();
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('⚙️  Initializing Hook Configuration Manager...');
    
    // Load existing configuration
    await this.loadConfiguration();
    
    // Validate configuration
    if (this.options.enableValidation) {
      await this.validateConfiguration();
    }
    
    // Set up hot reload if enabled
    if (this.options.enableHotReload) {
      this.setupHotReload();
    }
    
    // Store initialization marker
    await this.memoryManager.store('config:initialized', {
      timestamp: Date.now(),
      version: '1.0.0',
      features: ['versioning', 'validation', 'hot_reload'],
      configKeys: Array.from(this.activeConfig.keys())
    }, {
      namespace: this.options.namespace,
      tags: ['system', 'initialization'],
      ttl: this.options.configurationTTL
    });
    
    this.isInitialized = true;
    console.log('✅ Hook Configuration Manager ready');
  }

  // ============================================================================
  // CONFIGURATION SCHEMA
  // ============================================================================

  defineConfigurationSchema() {
    return {
      hooks: {
        type: 'object',
        properties: {
          enabled: {
            type: 'object',
            properties: {
              'pre-task': { type: 'boolean', default: true },
              'post-edit': { type: 'boolean', default: true },
              'post-task': { type: 'boolean', default: true },
              'session-end': { type: 'boolean', default: true }
            }
          },
          timeouts: {
            type: 'object',
            properties: {
              'pre-task': { type: 'number', min: 100, max: 30000, default: 5000 },
              'post-edit': { type: 'number', min: 50, max: 10000, default: 2000 },
              'post-task': { type: 'number', min: 100, max: 60000, default: 10000 },
              'session-end': { type: 'number', min: 500, max: 120000, default: 30000 }
            }
          },
          retryPolicy: {
            type: 'object',
            properties: {
              maxRetries: { type: 'number', min: 0, max: 5, default: 2 },
              retryDelay: { type: 'number', min: 100, max: 5000, default: 1000 },
              exponentialBackoff: { type: 'boolean', default: true }
            }
          }
        }
      },
      validation: {
        type: 'object',
        properties: {
          prdCompliance: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              strictMode: { type: 'boolean', default: false },
              blockingViolations: { type: 'array', default: ['forbidden_frameworks', 'security_issues'] },
              warningViolations: { type: 'array', default: ['naming_conventions', 'file_size'] }
            }
          },
          performance: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              maxExecutionTime: { type: 'number', min: 100, max: 30000, default: 5000 },
              maxMemoryUsage: { type: 'number', min: 1024, max: 1073741824, default: 104857600 }, // 100MB
              enableProfiling: { type: 'boolean', default: false }
            }
          }
        }
      },
      memory: {
        type: 'object',
        properties: {
          persistence: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              maxCacheSize: { type: 'number', min: 100, max: 10000, default: 1000 },
              defaultTTL: { type: 'number', min: 60000, max: 2592000000, default: 86400000 }, // 24 hours
              compressionEnabled: { type: 'boolean', default: true }
            }
          },
          synchronization: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              interval: { type: 'number', min: 5000, max: 300000, default: 30000 }, // 30 seconds
              conflictResolution: { 
                type: 'string', 
                enum: ['timestamp_wins', 'merge_objects', 'local_wins', 'remote_wins'],
                default: 'timestamp_wins' 
              }
            }
          }
        }
      },
      backup: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          compressionEnabled: { type: 'boolean', default: true },
          maxBackupsPerFile: { type: 'number', min: 1, max: 50, default: 10 },
          retentionDays: { type: 'number', min: 1, max: 365, default: 30 },
          minBackupInterval: { type: 'number', min: 100, max: 60000, default: 1000 }
        }
      },
      logging: {
        type: 'object',
        properties: {
          level: { 
            type: 'string', 
            enum: ['silent', 'error', 'warn', 'info', 'debug'],
            default: 'info' 
          },
          enableMetrics: { type: 'boolean', default: true },
          enableTracing: { type: 'boolean', default: false }
        }
      }
    };
  }

  getDefaultConfiguration() {
    return {
      hooks: {
        enabled: {
          'pre-task': true,
          'post-edit': true,
          'post-task': true,
          'session-end': true
        },
        timeouts: {
          'pre-task': 5000,
          'post-edit': 2000,
          'post-task': 10000,
          'session-end': 30000
        },
        retryPolicy: {
          maxRetries: 2,
          retryDelay: 1000,
          exponentialBackoff: true
        }
      },
      validation: {
        prdCompliance: {
          enabled: true,
          strictMode: false,
          blockingViolations: ['forbidden_frameworks', 'security_issues'],
          warningViolations: ['naming_conventions', 'file_size']
        },
        performance: {
          enabled: true,
          maxExecutionTime: 5000,
          maxMemoryUsage: 104857600, // 100MB
          enableProfiling: false
        }
      },
      memory: {
        persistence: {
          enabled: true,
          maxCacheSize: 1000,
          defaultTTL: 86400000, // 24 hours
          compressionEnabled: true
        },
        synchronization: {
          enabled: true,
          interval: 30000, // 30 seconds
          conflictResolution: 'timestamp_wins'
        }
      },
      backup: {
        enabled: true,
        compressionEnabled: true,
        maxBackupsPerFile: 10,
        retentionDays: 30,
        minBackupInterval: 1000
      },
      logging: {
        level: 'info',
        enableMetrics: true,
        enableTracing: false
      }
    };
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  async loadConfiguration() {
    try {
      // Load current configuration
      const storedConfig = await this.memoryManager.retrieve('config:current', {
        namespace: this.options.namespace
      });
      
      if (storedConfig) {
        this.activeConfig = new Map(Object.entries(storedConfig.value.config));
        console.log(`⚙️  Loaded configuration version ${storedConfig.value.version}`);
      } else {
        // Initialize with default configuration
        this.activeConfig = new Map(Object.entries(this.defaultConfig));
        await this.saveConfiguration('Initial configuration', 'system');
        console.log('⚙️  Initialized with default configuration');
      }
      
      // Load configuration history
      await this.loadConfigurationHistory();

    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error.message);
      this.activeConfig = new Map(Object.entries(this.defaultConfig));
    }
  }

  async saveConfiguration(changeDescription = 'Configuration update', author = 'system') {
    try {
      const configVersion = this.generateConfigVersion();
      const configData = {
        version: configVersion,
        timestamp: Date.now(),
        config: Object.fromEntries(this.activeConfig),
        changeDescription,
        author,
        checksum: this.calculateConfigChecksum(this.activeConfig)
      };
      
      // Save current configuration
      await this.memoryManager.store('config:current', configData, {
        namespace: this.options.namespace,
        tags: ['configuration', 'current'],
        ttl: this.options.configurationTTL
      });
      
      // Save to version history
      if (this.options.enableVersioning) {
        await this.saveConfigurationVersion(configData);
      }
      
      // Update history
      this.configHistory.unshift({
        version: configVersion,
        timestamp: Date.now(),
        changeDescription,
        author
      });
      
      // Limit history size
      if (this.configHistory.length > this.options.maxVersionHistory) {
        this.configHistory = this.configHistory.slice(0, this.options.maxVersionHistory);
      }
      
      console.log(`⚙️  Configuration saved: ${configVersion}`);
      
      return configVersion;

    } catch (error) {
      console.error('Failed to save configuration:', error.message);
      throw error;
    }
  }

  async getConfiguration(key = null) {
    if (key) {
      return this.getNestedValue(this.activeConfig, key);
    }
    return Object.fromEntries(this.activeConfig);
  }

  async updateConfiguration(updates, changeDescription = 'Configuration update', author = 'user') {
    try {
      // Validate updates
      if (this.options.enableValidation) {
        const validationResult = this.validateConfigurationUpdates(updates);
        if (!validationResult.valid) {
          throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
        }
      }
      
      // Apply updates
      const previousConfig = new Map(this.activeConfig);
      this.applyConfigurationUpdates(updates);
      
      // Save configuration
      const version = await this.saveConfiguration(changeDescription, author);
      
      // Notify about configuration change
      await this.notifyConfigurationChange(updates, version);
      
      return {
        success: true,
        version,
        changes: this.calculateConfigurationDiff(previousConfig, this.activeConfig)
      };

    } catch (error) {
      console.error('Failed to update configuration:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async rollbackConfiguration(targetVersion) {
    try {
      const versionData = await this.memoryManager.retrieve(`config:version:${targetVersion}`, {
        namespace: this.options.namespace
      });
      
      if (!versionData) {
        throw new Error(`Configuration version ${targetVersion} not found`);
      }
      
      const previousConfig = new Map(this.activeConfig);
      this.activeConfig = new Map(Object.entries(versionData.value.config));
      
      const rollbackVersion = await this.saveConfiguration(
        `Rollback to version ${targetVersion}`,
        'system'
      );
      
      const changes = this.calculateConfigurationDiff(previousConfig, this.activeConfig);
      
      console.log(`⚙️  Configuration rolled back to version ${targetVersion}`);
      
      return {
        success: true,
        version: rollbackVersion,
        rolledBackTo: targetVersion,
        changes
      };

    } catch (error) {
      console.error('Failed to rollback configuration:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // CONFIGURATION VALIDATION
  // ============================================================================

  async validateConfiguration() {
    try {
      const config = Object.fromEntries(this.activeConfig);
      const validationResult = this.validateConfigurationSchema(config, this.configSchema);
      
      if (!validationResult.valid) {
        console.warn('Configuration validation issues found:', validationResult.errors);
        
        // Attempt to fix common issues
        const fixedConfig = this.attemptConfigurationFix(config, validationResult.errors);
        if (fixedConfig) {
          this.activeConfig = new Map(Object.entries(fixedConfig));
          await this.saveConfiguration('Auto-fix validation issues', 'system');
          console.log('⚙️  Configuration issues auto-fixed');
        }
      } else {
        console.log('✅ Configuration validation passed');
      }
      
      return validationResult;

    } catch (error) {
      console.error('Configuration validation failed:', error.message);
      return { valid: false, errors: [error.message] };
    }
  }

  validateConfigurationSchema(config, schema, path = '') {
    const errors = [];
    
    for (const [key, schemaDefinition] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = config[key];
      
      if (schemaDefinition.type === 'object' && schemaDefinition.properties) {
        if (value && typeof value === 'object') {
          const nestedResult = this.validateConfigurationSchema(
            value,
            schemaDefinition.properties,
            currentPath
          );
          errors.push(...nestedResult.errors);
        } else if (schemaDefinition.required !== false) {
          errors.push(`Missing required object: ${currentPath}`);
        }
      } else {
        const fieldResult = this.validateConfigurationField(value, schemaDefinition, currentPath);
        errors.push(...fieldResult.errors);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  validateConfigurationField(value, schema, path) {
    const errors = [];
    
    // Check if required
    if (value === undefined || value === null) {
      if (schema.required !== false) {
        return { errors: [`Missing required field: ${path}`] };
      }
      return { errors: [] }; // Optional field, skip validation
    }
    
    // Type validation
    if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`${path} must be a number`);
    } else if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`${path} must be a string`);
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${path} must be a boolean`);
    } else if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push(`${path} must be an array`);
    }
    
    // Range validation for numbers
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`${path} must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`${path} must be at most ${schema.max}`);
      }
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
    }
    
    return { errors };
  }

  validateConfigurationUpdates(updates) {
    const errors = [];
    
    // Create a temporary merged configuration for validation
    const tempConfig = Object.fromEntries(this.activeConfig);
    this.applyUpdatesToObject(tempConfig, updates);
    
    const validationResult = this.validateConfigurationSchema(tempConfig, this.configSchema);
    
    return validationResult;
  }

  attemptConfigurationFix(config, errors) {
    const fixedConfig = JSON.parse(JSON.stringify(config));
    
    for (const error of errors) {
      // Try to fix common issues
      if (error.includes('Missing required object')) {
        const path = error.split(': ')[1];
        this.setNestedValue(fixedConfig, path, {});
      } else if (error.includes('must be a number')) {
        const path = error.split(' ')[0];
        const schemaDefault = this.getSchemaDefault(path);
        if (schemaDefault !== undefined) {
          this.setNestedValue(fixedConfig, path, schemaDefault);
        }
      }
    }
    
    return fixedConfig;
  }

  // ============================================================================
  // HOT RELOAD AND NOTIFICATIONS
  // ============================================================================

  setupHotReload() {
    // Set up periodic configuration checking
    this.hotReloadInterval = setInterval(async () => {
      await this.checkForConfigurationUpdates();
    }, 30000); // Check every 30 seconds
  }

  async checkForConfigurationUpdates() {
    try {
      const currentConfig = await this.memoryManager.retrieve('config:current', {
        namespace: this.options.namespace
      });
      
      if (currentConfig) {
        const storedChecksum = currentConfig.value.checksum;
        const currentChecksum = this.calculateConfigChecksum(this.activeConfig);
        
        if (storedChecksum !== currentChecksum) {
          // Configuration has been updated externally
          this.activeConfig = new Map(Object.entries(currentConfig.value.config));
          console.log('⚙️  Configuration hot-reloaded');
          
          await this.notifyConfigurationChange({}, currentConfig.value.version);
        }
      }

    } catch (error) {
      if (this.options.logLevel === 'debug') {
        console.log('Hot reload check failed:', error.message);
      }
    }
  }

  async notifyConfigurationChange(changes, version) {
    try {
      const notification = {
        type: 'configuration_change',
        version,
        timestamp: Date.now(),
        changes,
        affectedSystems: this.identifyAffectedSystems(changes)
      };
      
      await this.memoryManager.store(`notification:config:${Date.now()}`, notification, {
        namespace: this.options.namespace,
        tags: ['notification', 'configuration'],
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      console.log(`⚙️  Configuration change notification sent (${version})`);

    } catch (error) {
      console.warn('Failed to send configuration change notification:', error.message);
    }
  }

  identifyAffectedSystems(changes) {
    const affectedSystems = new Set();
    
    for (const changePath of Object.keys(changes)) {
      if (changePath.startsWith('hooks.')) {
        affectedSystems.add('hook_system');
      }
      if (changePath.startsWith('validation.')) {
        affectedSystems.add('validation_system');
      }
      if (changePath.startsWith('memory.')) {
        affectedSystems.add('memory_system');
      }
      if (changePath.startsWith('backup.')) {
        affectedSystems.add('backup_system');
      }
    }
    
    return Array.from(affectedSystems);
  }

  // ============================================================================
  // CONFIGURATION HISTORY AND VERSIONING
  // ============================================================================

  async saveConfigurationVersion(configData) {
    try {
      const versionKey = `config:version:${configData.version}`;
      await this.memoryManager.store(versionKey, configData, {
        namespace: this.options.namespace,
        tags: ['configuration', 'version', configData.version],
        ttl: this.options.configurationTTL
      });

    } catch (error) {
      console.warn('Failed to save configuration version:', error.message);
    }
  }

  async loadConfigurationHistory() {
    try {
      const historyData = await this.memoryManager.retrieve('config:history', {
        namespace: this.options.namespace
      });
      
      if (historyData) {
        this.configHistory = historyData.value.history || [];
      }

    } catch (error) {
      console.warn('Failed to load configuration history:', error.message);
      this.configHistory = [];
    }
  }

  async saveConfigurationHistory() {
    try {
      await this.memoryManager.store('config:history', {
        history: this.configHistory,
        lastUpdated: Date.now()
      }, {
        namespace: this.options.namespace,
        tags: ['configuration', 'history'],
        ttl: this.options.configurationTTL
      });

    } catch (error) {
      console.warn('Failed to save configuration history:', error.message);
    }
  }

  async getConfigurationHistory(limit = 20) {
    return this.configHistory.slice(0, limit);
  }

  async getConfigurationVersions() {
    try {
      const versionResults = await this.memoryManager.search('config:version:*', {
        namespace: this.options.namespace,
        limit: this.options.maxVersionHistory
      });
      
      const versions = [];
      for (const result of versionResults.results) {
        const versionData = await this.memoryManager.retrieve(result.key, {
          namespace: this.options.namespace
        });
        
        if (versionData) {
          versions.push({
            version: versionData.value.version,
            timestamp: versionData.value.timestamp,
            changeDescription: versionData.value.changeDescription,
            author: versionData.value.author
          });
        }
      }
      
      return versions.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.warn('Failed to get configuration versions:', error.message);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  generateConfigVersion() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`;
  }

  calculateConfigChecksum(config) {
    const crypto = require('crypto');
    const configString = JSON.stringify(Object.fromEntries(config), Object.keys(Object.fromEntries(config)).sort());
    return crypto.createHash('sha256').update(configString).digest('hex').substring(0, 16);
  }

  applyConfigurationUpdates(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.setNestedValue(this.activeConfig, key, value);
    }
  }

  applyUpdatesToObject(obj, updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.setNestedValueInObject(obj, key, value);
    }
  }

  getNestedValue(map, path) {
    const keys = path.split('.');
    let current = Object.fromEntries(map);
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  setNestedValue(map, path, value) {
    const config = Object.fromEntries(map);
    this.setNestedValueInObject(config, path, value);
    map.clear();
    for (const [k, v] of Object.entries(config)) {
      map.set(k, v);
    }
  }

  setNestedValueInObject(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  calculateConfigurationDiff(oldConfig, newConfig) {
    const diff = {};
    const oldObj = Object.fromEntries(oldConfig);
    const newObj = Object.fromEntries(newConfig);
    
    this.findDifferences(oldObj, newObj, '', diff);
    
    return diff;
  }

  findDifferences(oldObj, newObj, path, diff) {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = oldObj[key];
      const newValue = newObj[key];
      
      if (oldValue === undefined) {
        diff[currentPath] = { type: 'added', value: newValue };
      } else if (newValue === undefined) {
        diff[currentPath] = { type: 'removed', value: oldValue };
      } else if (typeof oldValue === 'object' && typeof newValue === 'object') {
        this.findDifferences(oldValue, newValue, currentPath, diff);
      } else if (oldValue !== newValue) {
        diff[currentPath] = { type: 'changed', oldValue, newValue };
      }
    }
  }

  getSchemaDefault(path) {
    const keys = path.split('.');
    let current = this.configSchema;
    
    for (const key of keys) {
      if (current && current[key]) {
        current = current[key];
      } else if (current && current.properties && current.properties[key]) {
        current = current.properties[key];
      } else {
        return undefined;
      }
    }
    
    return current.default;
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      configurationKeys: this.activeConfig.size,
      historyEntries: this.configHistory.length,
      versioning: this.options.enableVersioning,
      validation: this.options.enableValidation,
      hotReload: this.options.enableHotReload
    };
  }

  async generateConfigurationReport() {
    try {
      const config = Object.fromEntries(this.activeConfig);
      const versions = await this.getConfigurationVersions();
      const history = await this.getConfigurationHistory();
      
      return {
        generated: Date.now(),
        currentConfiguration: config,
        checksum: this.calculateConfigChecksum(this.activeConfig),
        statistics: this.getStats(),
        recentHistory: history.slice(0, 10),
        availableVersions: versions.slice(0, 10),
        validationStatus: await this.validateConfiguration()
      };

    } catch (error) {
      console.warn('Failed to generate configuration report:', error.message);
      return null;
    }
  }

  async shutdown() {
    console.log('⚙️  Shutting down Hook Configuration Manager...');
    
    // Stop hot reload monitoring
    if (this.hotReloadInterval) {
      clearInterval(this.hotReloadInterval);
    }
    
    // Save final configuration and history
    await this.saveConfiguration('Shutdown configuration save', 'system');
    await this.saveConfigurationHistory();
    
    console.log('✅ Hook Configuration Manager shutdown complete');
  }
}

module.exports = { HookConfigurationManager };

// CLI usage
if (require.main === module) {
  const { MemoryPersistenceManager } = require('./memory-persistence-manager');
  
  async function testHookConfiguration() {
    console.log('🧪 Testing Hook Configuration Manager');
    console.log('===================================');
    
    try {
      const memoryManager = new MemoryPersistenceManager({ logLevel: 'debug' });
      await memoryManager.initialize();
      
      const configManager = new HookConfigurationManager(memoryManager, { logLevel: 'debug' });
      await configManager.initialize();
      
      // Test configuration retrieval
      console.log('\n1️⃣  Testing configuration retrieval...');
      const currentConfig = await configManager.getConfiguration();
      console.log('✅ Configuration loaded:', Object.keys(currentConfig).length > 0);
      
      // Test configuration updates
      console.log('\n2️⃣  Testing configuration updates...');
      const updateResult = await configManager.updateConfiguration({
        'hooks.timeouts.post-edit': 3000,
        'validation.prdCompliance.strictMode': true
      }, 'Test configuration update', 'test-user');
      
      console.log('✅ Configuration updated:', updateResult.success);
      
      // Test configuration validation
      console.log('\n3️⃣  Testing configuration validation...');
      const validationResult = await configManager.validateConfiguration();
      console.log('✅ Validation result:', validationResult.valid);
      
      // Test configuration history
      console.log('\n4️⃣  Testing configuration history...');
      const history = await configManager.getConfigurationHistory(5);
      console.log(`✅ Configuration history: ${history.length} entries`);
      
      // Test configuration rollback
      if (history.length > 1) {
        console.log('\n5️⃣  Testing configuration rollback...');
        const rollbackResult = await configManager.rollbackConfiguration(history[1].version);
        console.log('✅ Rollback result:', rollbackResult.success);
      }
      
      // Show stats
      console.log('\n6️⃣  Configuration statistics:');
      const stats = configManager.getStats();
      console.log('📊 Stats:', JSON.stringify(stats, null, 2));
      
      await configManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('\n🎉 Hook Configuration Manager Test Complete!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testHookConfiguration();
}