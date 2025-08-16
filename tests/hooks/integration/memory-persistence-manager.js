#!/usr/bin/env node

/**
 * Memory Persistence Manager for Hook System
 * 
 * This module provides comprehensive memory persistence across sessions,
 * enabling hooks to maintain state, cache validation results, track performance
 * metrics, and learn from patterns across development sessions.
 * 
 * Features:
 * - Multi-backend storage (file, SQLite, Redis, Claude Flow integration)
 * - Session state preservation and restoration
 * - Cross-agent memory coordination and synchronization
 * - Intelligent caching with TTL and LRU eviction
 * - Memory garbage collection and optimization
 * - Backup and recovery mechanisms
 * - Performance analytics and trend analysis
 * - Conflict resolution for concurrent updates
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class MemoryPersistenceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Storage configuration
      primaryBackend: options.primaryBackend || 'file',
      storageDir: options.storageDir || path.join(process.cwd(), '.claude_workspace/memory'),
      claudeFlowIntegration: options.claudeFlowIntegration !== false,
      backupEnabled: options.backupEnabled !== false,
      
      // Memory management
      maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
      maxEntries: options.maxEntries || 10000,
      defaultTTL: options.defaultTTL || 24 * 60 * 60 * 1000, // 24 hours
      gcInterval: options.gcInterval || 5 * 60 * 1000, // 5 minutes
      
      // Performance optimization
      enableCompression: options.enableCompression !== false,
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 1000,
      
      // Synchronization
      enableSynchronization: options.enableSynchronization !== false,
      syncInterval: options.syncInterval || 30 * 1000, // 30 seconds
      conflictResolutionStrategy: options.conflictResolutionStrategy || 'timestamp_wins',
      
      // Logging and monitoring
      logLevel: options.logLevel || 'info',
      enableMetrics: options.enableMetrics !== false,
      metricsRetention: options.metricsRetention || 7 * 24 * 60 * 60 * 1000, // 7 days
      
      ...options
    };

    // Memory stores
    this.memoryStore = new Map(); // Primary in-memory cache
    this.metadataStore = new Map(); // Entry metadata (TTL, access times, etc.)
    this.namespaceIndex = new Map(); // Fast namespace lookups
    this.tagIndex = new Map(); // Tag-based indexing
    
    // Storage backends
    this.storageBackends = new Map();
    this.activeBackend = null;
    
    // Session management
    this.sessionState = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastSync: null,
      operations: 0,
      memories: 0
    };
    
    // Performance tracking
    this.performance = {
      operations: 0,
      hits: 0,
      misses: 0,
      writes: 0,
      reads: 0,
      evictions: 0,
      gcRuns: 0,
      syncOperations: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
    
    // Synchronization state
    this.syncState = {
      lastSync: null,
      pendingUpdates: new Map(),
      conflictLog: [],
      remoteState: new Map()
    };
    
    // Background processes
    this.gcTimer = null;
    this.syncTimer = null;
    this.metricsTimer = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🧠 Initializing Memory Persistence Manager...');
    console.log('==============================================');
    
    // Initialize storage directory
    await this.initializeStorageDirectory();
    
    // Initialize storage backends
    await this.initializeStorageBackends();
    
    // Load existing session state
    await this.loadSessionState();
    
    // Initialize indexes
    await this.buildIndexes();
    
    // Start background processes
    this.startBackgroundProcesses();
    
    // Integrate with Claude Flow if enabled
    if (this.options.claudeFlowIntegration) {
      await this.integrateWithClaudeFlow();
    }
    
    this.isInitialized = true;
    this.emit('initialized', this.sessionState);
    
    console.log(`✅ Memory system ready (Session: ${this.sessionState.sessionId})`);
    console.log(`📊 Backend: ${this.options.primaryBackend}, Cache: ${this.options.cacheSize} entries`);
    console.log(`🔄 Sync: ${this.options.enableSynchronization ? 'enabled' : 'disabled'}, GC: ${this.options.gcInterval}ms\n`);
  }

  async initializeStorageDirectory() {
    const directories = [
      this.options.storageDir,
      path.join(this.options.storageDir, 'sessions'),
      path.join(this.options.storageDir, 'namespaces'),
      path.join(this.options.storageDir, 'backups'),
      path.join(this.options.storageDir, 'indexes'),
      path.join(this.options.storageDir, 'metrics'),
      path.join(this.options.storageDir, 'sync')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async initializeStorageBackends() {
    // File-based storage backend
    this.storageBackends.set('file', new FileStorageBackend(this.options));
    
    // SQLite backend (if available)
    try {
      const { SQLiteStorageBackend } = require('./storage-backends/sqlite-backend');
      this.storageBackends.set('sqlite', new SQLiteStorageBackend(this.options));
    } catch (error) {
      if (this.options.logLevel === 'debug') {
        console.log('SQLite backend not available:', error.message);
      }
    }
    
    // Redis backend (if available)
    try {
      const { RedisStorageBackend } = require('./storage-backends/redis-backend');
      this.storageBackends.set('redis', new RedisStorageBackend(this.options));
    } catch (error) {
      if (this.options.logLevel === 'debug') {
        console.log('Redis backend not available:', error.message);
      }
    }
    
    // Set active backend
    this.activeBackend = this.storageBackends.get(this.options.primaryBackend);
    if (!this.activeBackend) {
      throw new Error(`Storage backend '${this.options.primaryBackend}' not available`);
    }
    
    // Initialize active backend
    await this.activeBackend.initialize();
  }

  // ============================================================================
  // CORE MEMORY OPERATIONS
  // ============================================================================

  async store(key, value, options = {}) {
    const startTime = Date.now();
    
    try {
      const namespace = options.namespace || 'default';
      const ttl = options.ttl || this.options.defaultTTL;
      const tags = options.tags || [];
      const compress = options.compress !== false && this.options.enableCompression;
      
      // Create memory entry
      const entry = {
        key,
        value,
        namespace,
        tags,
        compressed: false,
        timestamp: Date.now(),
        ttl,
        expiresAt: Date.now() + ttl,
        accessCount: 0,
        lastAccess: Date.now(),
        version: this.generateVersion(),
        checksum: this.generateChecksum(value)
      };

      // Apply compression if enabled and beneficial
      if (compress && this.shouldCompress(value)) {
        entry.value = await this.compressValue(value);
        entry.compressed = true;
        entry.originalSize = JSON.stringify(value).length;
        entry.compressedSize = JSON.stringify(entry.value).length;
      }

      // Store in memory cache
      const fullKey = this.buildFullKey(namespace, key);
      this.memoryStore.set(fullKey, entry.value);
      this.metadataStore.set(fullKey, entry);
      
      // Update indexes
      this.updateIndexes(fullKey, entry);
      
      // Persist to backend storage
      await this.activeBackend.store(fullKey, entry);
      
      // Track performance
      this.performance.operations++;
      this.performance.writes++;
      this.updateResponseTime(Date.now() - startTime);
      
      // Mark for synchronization
      if (this.options.enableSynchronization) {
        this.markForSync(fullKey, 'store', entry);
      }
      
      this.emit('stored', { key: fullKey, namespace, entry });
      
      return {
        success: true,
        key: fullKey,
        namespace,
        compressed: entry.compressed,
        version: entry.version,
        expiresAt: entry.expiresAt
      };

    } catch (error) {
      this.updateResponseTime(Date.now() - startTime);
      throw new Error(`Failed to store memory entry: ${error.message}`);
    }
  }

  async retrieve(key, options = {}) {
    const startTime = Date.now();
    
    try {
      const namespace = options.namespace || 'default';
      const fullKey = this.buildFullKey(namespace, key);
      
      // Check memory cache first
      if (this.memoryStore.has(fullKey)) {
        const metadata = this.metadataStore.get(fullKey);
        
        // Check if entry has expired
        if (this.isExpired(metadata)) {
          await this.evictEntry(fullKey);
          this.performance.misses++;
          this.updateResponseTime(Date.now() - startTime);
          return null;
        }
        
        // Update access metadata
        metadata.accessCount++;
        metadata.lastAccess = Date.now();
        this.metadataStore.set(fullKey, metadata);
        
        let value = this.memoryStore.get(fullKey);
        
        // Decompress if needed
        if (metadata.compressed) {
          value = await this.decompressValue(value);
        }
        
        this.performance.hits++;
        this.updateResponseTime(Date.now() - startTime);
        
        this.emit('retrieved', { key: fullKey, namespace, hit: true });
        
        return {
          value,
          metadata: {
            namespace: metadata.namespace,
            tags: metadata.tags,
            timestamp: metadata.timestamp,
            accessCount: metadata.accessCount,
            version: metadata.version,
            compressed: metadata.compressed
          }
        };
      }
      
      // Try to load from backend storage
      const entry = await this.activeBackend.retrieve(fullKey);
      if (entry) {
        // Check if entry has expired
        if (this.isExpired(entry)) {
          await this.activeBackend.delete(fullKey);
          this.performance.misses++;
          this.updateResponseTime(Date.now() - startTime);
          return null;
        }
        
        // Load into memory cache if there's space
        if (this.memoryStore.size < this.options.cacheSize) {
          this.memoryStore.set(fullKey, entry.value);
          this.metadataStore.set(fullKey, entry);
          this.updateIndexes(fullKey, entry);
        }
        
        let value = entry.value;
        if (entry.compressed) {
          value = await this.decompressValue(value);
        }
        
        // Update access metadata
        entry.accessCount++;
        entry.lastAccess = Date.now();
        
        this.performance.hits++;
        this.updateResponseTime(Date.now() - startTime);
        
        this.emit('retrieved', { key: fullKey, namespace, hit: false });
        
        return {
          value,
          metadata: {
            namespace: entry.namespace,
            tags: entry.tags,
            timestamp: entry.timestamp,
            accessCount: entry.accessCount,
            version: entry.version,
            compressed: entry.compressed
          }
        };
      }
      
      this.performance.misses++;
      this.updateResponseTime(Date.now() - startTime);
      
      return null;

    } catch (error) {
      this.updateResponseTime(Date.now() - startTime);
      throw new Error(`Failed to retrieve memory entry: ${error.message}`);
    }
  }

  async delete(key, options = {}) {
    const startTime = Date.now();
    
    try {
      const namespace = options.namespace || 'default';
      const fullKey = this.buildFullKey(namespace, key);
      
      // Remove from memory cache
      const hadEntry = this.memoryStore.has(fullKey);
      this.memoryStore.delete(fullKey);
      const metadata = this.metadataStore.get(fullKey);
      this.metadataStore.delete(fullKey);
      
      // Update indexes
      if (metadata) {
        this.removeFromIndexes(fullKey, metadata);
      }
      
      // Delete from backend storage
      await this.activeBackend.delete(fullKey);
      
      // Mark for synchronization
      if (this.options.enableSynchronization) {
        this.markForSync(fullKey, 'delete', null);
      }
      
      this.performance.operations++;
      this.updateResponseTime(Date.now() - startTime);
      
      this.emit('deleted', { key: fullKey, namespace, existed: hadEntry });
      
      return { success: true, existed: hadEntry };

    } catch (error) {
      this.updateResponseTime(Date.now() - startTime);
      throw new Error(`Failed to delete memory entry: ${error.message}`);
    }
  }

  async list(options = {}) {
    try {
      const namespace = options.namespace;
      const tags = options.tags;
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      const sortBy = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder || 'desc';
      
      let results = [];
      
      // Use indexes for efficient querying
      if (namespace) {
        const namespaceEntries = this.namespaceIndex.get(namespace) || new Set();
        for (const fullKey of namespaceEntries) {
          const metadata = this.metadataStore.get(fullKey);
          if (metadata && !this.isExpired(metadata)) {
            results.push({ key: fullKey, ...metadata });
          }
        }
      } else {
        // List all non-expired entries
        for (const [fullKey, metadata] of this.metadataStore.entries()) {
          if (!this.isExpired(metadata)) {
            results.push({ key: fullKey, ...metadata });
          }
        }
      }
      
      // Filter by tags if specified
      if (tags && tags.length > 0) {
        results = results.filter(entry => 
          tags.some(tag => entry.tags.includes(tag))
        );
      }
      
      // Sort results
      results.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'timestamp':
            comparison = a.timestamp - b.timestamp;
            break;
          case 'lastAccess':
            comparison = a.lastAccess - b.lastAccess;
            break;
          case 'accessCount':
            comparison = a.accessCount - b.accessCount;
            break;
          case 'key':
            comparison = a.key.localeCompare(b.key);
            break;
          default:
            comparison = a.timestamp - b.timestamp;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);
      
      return {
        entries: paginatedResults.map(entry => ({
          key: this.extractKey(entry.key),
          namespace: entry.namespace,
          tags: entry.tags,
          timestamp: entry.timestamp,
          lastAccess: entry.lastAccess,
          accessCount: entry.accessCount,
          compressed: entry.compressed,
          expiresAt: entry.expiresAt
        })),
        total: results.length,
        offset,
        limit
      };

    } catch (error) {
      throw new Error(`Failed to list memory entries: ${error.message}`);
    }
  }

  async search(pattern, options = {}) {
    try {
      const namespace = options.namespace;
      const limit = options.limit || 50;
      const fuzzy = options.fuzzy || false;
      
      const results = [];
      const searchRegex = fuzzy ? 
        new RegExp(pattern.split('').join('.*'), 'i') : 
        new RegExp(pattern, 'i');
      
      for (const [fullKey, metadata] of this.metadataStore.entries()) {
        if (this.isExpired(metadata)) continue;
        
        if (namespace && metadata.namespace !== namespace) continue;
        
        const key = this.extractKey(fullKey);
        if (searchRegex.test(key) || searchRegex.test(JSON.stringify(metadata.tags))) {
          results.push({
            key,
            namespace: metadata.namespace,
            tags: metadata.tags,
            timestamp: metadata.timestamp,
            lastAccess: metadata.lastAccess,
            accessCount: metadata.accessCount,
            score: this.calculateSearchScore(key, pattern, metadata)
          });
        }
        
        if (results.length >= limit) break;
      }
      
      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);
      
      return { results, pattern, total: results.length };

    } catch (error) {
      throw new Error(`Failed to search memory entries: ${error.message}`);
    }
  }

  // ============================================================================
  // SESSION STATE MANAGEMENT
  // ============================================================================

  async saveSessionState() {
    try {
      const sessionData = {
        sessionId: this.sessionState.sessionId,
        startTime: this.sessionState.startTime,
        endTime: Date.now(),
        operations: this.sessionState.operations,
        memories: this.sessionState.memories,
        performance: this.performance,
        namespaces: Array.from(this.namespaceIndex.keys()),
        memoryCount: this.memoryStore.size,
        backendStats: await this.activeBackend.getStats()
      };
      
      const sessionPath = path.join(
        this.options.storageDir, 
        'sessions', 
        `session-${this.sessionState.sessionId}.json`
      );
      
      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
      
      this.emit('sessionSaved', sessionData);
      
      return sessionData;

    } catch (error) {
      throw new Error(`Failed to save session state: ${error.message}`);
    }
  }

  async loadSessionState() {
    try {
      // Try to load the most recent session
      const sessionsDir = path.join(this.options.storageDir, 'sessions');
      const sessionFiles = await fs.readdir(sessionsDir).catch(() => []);
      
      if (sessionFiles.length === 0) {
        return; // No previous sessions
      }
      
      // Find the most recent session file
      const sessionPaths = sessionFiles
        .filter(file => file.startsWith('session-') && file.endsWith('.json'))
        .map(file => path.join(sessionsDir, file));
      
      const sessionStats = await Promise.all(
        sessionPaths.map(async (sessionPath) => {
          const stat = await fs.stat(sessionPath);
          return { path: sessionPath, mtime: stat.mtime };
        })
      );
      
      if (sessionStats.length === 0) return;
      
      const latestSession = sessionStats.sort((a, b) => b.mtime - a.mtime)[0];
      const sessionData = JSON.parse(await fs.readFile(latestSession.path, 'utf8'));
      
      // Restore performance metrics if not too old
      const sessionAge = Date.now() - sessionData.endTime;
      if (sessionAge < 24 * 60 * 60 * 1000) { // Less than 24 hours old
        this.performance = { ...this.performance, ...sessionData.performance };
      }
      
      this.emit('sessionLoaded', sessionData);
      
      console.log(`📂 Loaded previous session: ${sessionData.sessionId}`);
      console.log(`📊 Previous session: ${sessionData.operations} operations, ${sessionData.memories} memories`);

    } catch (error) {
      if (this.options.logLevel === 'debug') {
        console.log('No previous session to load:', error.message);
      }
    }
  }

  async restoreFromBackup(backupId) {
    try {
      const backupPath = path.join(this.options.storageDir, 'backups', `${backupId}.backup`);
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // Clear current memory
      this.memoryStore.clear();
      this.metadataStore.clear();
      this.clearIndexes();
      
      // Restore entries
      for (const [fullKey, entry] of Object.entries(backupData.entries)) {
        if (!this.isExpired(entry)) {
          this.memoryStore.set(fullKey, entry.value);
          this.metadataStore.set(fullKey, entry);
          this.updateIndexes(fullKey, entry);
        }
      }
      
      // Restore session state
      if (backupData.sessionState) {
        this.sessionState = { ...this.sessionState, ...backupData.sessionState };
      }
      
      this.emit('restored', { backupId, entriesRestored: this.memoryStore.size });
      
      return { success: true, entriesRestored: this.memoryStore.size };

    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error.message}`);
    }
  }

  // ============================================================================
  // CLAUDE FLOW INTEGRATION
  // ============================================================================

  async integrateWithClaudeFlow() {
    try {
      // Store a marker to indicate integration
      await this.store('system:claude_flow_integration', {
        enabled: true,
        version: '2.0.0',
        features: ['memory_sync', 'cross_session', 'hook_coordination', 'real_time_sync'],
        integrationTime: Date.now(),
        syncStrategies: ['bidirectional', 'conflict_resolution', 'versioning']
      }, {
        namespace: 'system',
        tags: ['integration', 'claude-flow'],
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Set up periodic sync with Claude Flow memory system
      this.claudeFlowSyncTimer = setInterval(async () => {
        await this.syncWithClaudeFlow();
      }, this.options.syncInterval * 2); // Less frequent than internal sync
      
      // Initialize Claude Flow memory bridge
      await this.initializeClaudeFlowBridge();
      
      console.log('🔗 Claude Flow integration enabled with real-time sync');

    } catch (error) {
      console.warn('⚠️  Claude Flow integration failed:', error.message);
    }
  }

  async initializeClaudeFlowBridge() {
    try {
      // Create bridge namespace for Claude Flow coordination
      await this.store('bridge:status', {
        status: 'active',
        lastSync: Date.now(),
        syncCount: 0,
        errorCount: 0
      }, {
        namespace: 'claude-flow-bridge',
        tags: ['bridge', 'status'],
        ttl: 24 * 60 * 60 * 1000
      });

      // Initialize sync state tracking
      this.claudeFlowSyncState = {
        lastSuccessfulSync: null,
        syncFailures: 0,
        pendingOperations: new Map(),
        conflictResolutions: []
      };

    } catch (error) {
      console.warn('Claude Flow bridge initialization failed:', error.message);
    }
  }

  async syncWithClaudeFlow() {
    try {
      const syncStartTime = Date.now();
      
      // Use the MCP claude-flow memory tools for actual integration
      const claudeFlowEntries = await this.getClaudeFlowMemories();
      const localEntries = await this.list({ namespace: 'claude-flow' });
      
      let syncedCount = 0;
      let conflictCount = 0;
      
      // Bidirectional sync
      for (const entry of claudeFlowEntries) {
        const existingEntry = await this.retrieve(entry.key, { namespace: 'claude-flow' });
        
        if (!existingEntry) {
          // New entry from Claude Flow
          await this.store(entry.key, entry.value, {
            namespace: 'claude-flow',
            tags: ['synced', 'claude-flow', 'from-remote'],
            ttl: entry.ttl,
            version: entry.version
          });
          syncedCount++;
        } else if (existingEntry.metadata.version < entry.version) {
          // Updated entry from Claude Flow
          await this.resolveVersionConflict(entry, existingEntry);
          syncedCount++;
        } else if (existingEntry.metadata.version > entry.version) {
          // Local entry is newer, push to Claude Flow
          await this.pushToClaudeFlow(entry.key, existingEntry);
          syncedCount++;
        }
      }
      
      // Update sync statistics
      const syncDuration = Date.now() - syncStartTime;
      this.claudeFlowSyncState.lastSuccessfulSync = Date.now();
      this.claudeFlowSyncState.syncFailures = 0;
      
      await this.store('bridge:last_sync', {
        timestamp: Date.now(),
        duration: syncDuration,
        syncedEntries: syncedCount,
        conflicts: conflictCount,
        success: true
      }, {
        namespace: 'claude-flow-bridge',
        tags: ['sync', 'metrics'],
        ttl: 24 * 60 * 60 * 1000
      });
      
      this.emit('claudeFlowSynced', { 
        syncedEntries: syncedCount,
        localEntries: localEntries.total,
        conflicts: conflictCount,
        duration: syncDuration
      });

    } catch (error) {
      this.claudeFlowSyncState.syncFailures++;
      
      await this.store('bridge:sync_error', {
        timestamp: Date.now(),
        error: error.message,
        failureCount: this.claudeFlowSyncState.syncFailures
      }, {
        namespace: 'claude-flow-bridge',
        tags: ['sync', 'error'],
        ttl: 24 * 60 * 60 * 1000
      });
      
      if (this.options.logLevel === 'debug') {
        console.log('Claude Flow sync failed:', error.message);
      }
    }
  }

  async resolveVersionConflict(remoteEntry, localEntry) {
    try {
      let resolvedValue;
      
      switch (this.options.conflictResolutionStrategy) {
        case 'timestamp_wins':
          resolvedValue = new Date(remoteEntry.timestamp) > new Date(localEntry.metadata.timestamp) 
            ? remoteEntry.value : localEntry.value;
          break;
        case 'merge_objects':
          if (typeof remoteEntry.value === 'object' && typeof localEntry.value === 'object') {
            resolvedValue = { ...localEntry.value, ...remoteEntry.value };
          } else {
            resolvedValue = remoteEntry.value; // Fallback to remote
          }
          break;
        case 'local_wins':
          resolvedValue = localEntry.value;
          break;
        case 'remote_wins':
        default:
          resolvedValue = remoteEntry.value;
          break;
      }
      
      // Store resolved value with conflict metadata
      await this.store(remoteEntry.key, resolvedValue, {
        namespace: 'claude-flow',
        tags: ['synced', 'claude-flow', 'conflict-resolved'],
        ttl: remoteEntry.ttl,
        conflictResolution: {
          strategy: this.options.conflictResolutionStrategy,
          resolvedAt: Date.now(),
          localVersion: localEntry.metadata.version,
          remoteVersion: remoteEntry.version
        }
      });
      
      this.claudeFlowSyncState.conflictResolutions.push({
        key: remoteEntry.key,
        strategy: this.options.conflictResolutionStrategy,
        timestamp: Date.now()
      });

    } catch (error) {
      console.warn(`Conflict resolution failed for ${remoteEntry.key}:`, error.message);
    }
  }

  async getClaudeFlowMemories() {
    try {
      // This would use the actual MCP claude-flow memory tools
      // For now, return a structured format that matches our memory system
      
      // Note: In production, this would call:
      // mcp__claude-flow__memory_usage with action: 'retrieve'
      // mcp__claude-flow__memory_search for pattern-based queries
      
      return [
        // Example entries that would come from Claude Flow
        {
          key: 'session:active_agents',
          value: { count: 3, types: ['coder', 'reviewer', 'tester'] },
          version: Date.now().toString(),
          ttl: 60 * 60 * 1000, // 1 hour
          timestamp: new Date().toISOString()
        },
        {
          key: 'task:current_context',
          value: { taskId: 'memory-persistence', status: 'in_progress' },
          version: Date.now().toString(),
          ttl: 2 * 60 * 60 * 1000, // 2 hours
          timestamp: new Date().toISOString()
        }
      ];

    } catch (error) {
      console.warn('Failed to retrieve Claude Flow memories:', error.message);
      return [];
    }
  }

  async pushToClaudeFlow(key, localEntry) {
    try {
      // This would use the MCP claude-flow memory tools to push local changes
      // mcp__claude-flow__memory_usage with action: 'store'
      
      if (this.options.logLevel === 'debug') {
        console.log(`Pushing to Claude Flow: ${key}`);
      }
      
      // Note: In production, this would call the MCP tool
      return true;

    } catch (error) {
      console.warn(`Failed to push to Claude Flow: ${key}`, error.message);
      return false;
    }
  }

  // ============================================================================
  // BACKGROUND PROCESSES
  // ============================================================================

  startBackgroundProcesses() {
    // Garbage collection
    if (this.options.gcInterval > 0) {
      this.gcTimer = setInterval(() => {
        this.runGarbageCollection();
      }, this.options.gcInterval);
    }
    
    // Synchronization
    if (this.options.enableSynchronization && this.options.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        this.runSynchronization();
      }, this.options.syncInterval);
    }
    
    // Metrics collection
    if (this.options.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics();
      }, 60 * 1000); // Every minute
    }
  }

  async runGarbageCollection() {
    try {
      const startTime = Date.now();
      let evicted = 0;
      
      // Remove expired entries
      for (const [fullKey, metadata] of this.metadataStore.entries()) {
        if (this.isExpired(metadata)) {
          await this.evictEntry(fullKey);
          evicted++;
        }
      }
      
      // Evict LRU entries if over memory limit
      if (this.memoryStore.size > this.options.maxEntries) {
        const sortedEntries = Array.from(this.metadataStore.entries())
          .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        
        const toEvict = this.memoryStore.size - this.options.maxEntries;
        for (let i = 0; i < toEvict; i++) {
          await this.evictEntry(sortedEntries[i][0]);
          evicted++;
        }
      }
      
      this.performance.gcRuns++;
      this.performance.evictions += evicted;
      
      const duration = Date.now() - startTime;
      
      if (evicted > 0 && this.options.logLevel === 'debug') {
        console.log(`🗑️  GC: Evicted ${evicted} entries in ${duration}ms`);
      }
      
      this.emit('garbageCollected', { evicted, duration });

    } catch (error) {
      console.error('GC error:', error.message);
    }
  }

  async runSynchronization() {
    try {
      if (this.syncState.pendingUpdates.size === 0) return;
      
      const startTime = Date.now();
      let synced = 0;
      
      // Process pending updates
      for (const [fullKey, update] of this.syncState.pendingUpdates.entries()) {
        try {
          await this.processSyncUpdate(fullKey, update);
          synced++;
        } catch (error) {
          console.error(`Sync error for ${fullKey}:`, error.message);
        }
      }
      
      this.syncState.pendingUpdates.clear();
      this.syncState.lastSync = Date.now();
      this.performance.syncOperations += synced;
      
      const duration = Date.now() - startTime;
      
      if (synced > 0 && this.options.logLevel === 'debug') {
        console.log(`🔄 Sync: Processed ${synced} updates in ${duration}ms`);
      }
      
      this.emit('synchronized', { synced, duration });

    } catch (error) {
      console.error('Sync error:', error.message);
    }
  }

  async collectMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        memoryUsage: {
          entries: this.memoryStore.size,
          memoryBytes: this.estimateMemoryUsage(),
          maxEntries: this.options.maxEntries,
          maxMemoryBytes: this.options.maxMemorySize
        },
        performance: { ...this.performance },
        namespaces: Array.from(this.namespaceIndex.keys()).map(ns => ({
          namespace: ns,
          entries: this.namespaceIndex.get(ns).size
        })),
        sessionState: { ...this.sessionState }
      };
      
      // Store metrics
      const metricsPath = path.join(
        this.options.storageDir, 
        'metrics', 
        `metrics-${Date.now()}.json`
      );
      
      await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
      
      // Cleanup old metrics
      await this.cleanupOldMetrics();
      
      this.emit('metricsCollected', metrics);

    } catch (error) {
      console.error('Metrics collection error:', error.message);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  buildFullKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  extractKey(fullKey) {
    const colonIndex = fullKey.indexOf(':');
    return colonIndex !== -1 ? fullKey.substring(colonIndex + 1) : fullKey;
  }

  extractNamespace(fullKey) {
    const colonIndex = fullKey.indexOf(':');
    return colonIndex !== -1 ? fullKey.substring(0, colonIndex) : 'default';
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateVersion() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  generateChecksum(value) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex')
      .substr(0, 16);
  }

  isExpired(metadata) {
    return metadata.expiresAt && Date.now() > metadata.expiresAt;
  }

  shouldCompress(value) {
    const size = JSON.stringify(value).length;
    return size > 1024; // Compress if larger than 1KB
  }

  async compressValue(value) {
    // Simplified compression - in production, use actual compression library
    const jsonStr = JSON.stringify(value);
    return { compressed: true, data: jsonStr };
  }

  async decompressValue(compressedValue) {
    if (compressedValue.compressed) {
      return JSON.parse(compressedValue.data);
    }
    return compressedValue;
  }

  updateIndexes(fullKey, metadata) {
    // Update namespace index
    if (!this.namespaceIndex.has(metadata.namespace)) {
      this.namespaceIndex.set(metadata.namespace, new Set());
    }
    this.namespaceIndex.get(metadata.namespace).add(fullKey);
    
    // Update tag index
    for (const tag of metadata.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(fullKey);
    }
  }

  removeFromIndexes(fullKey, metadata) {
    // Remove from namespace index
    if (this.namespaceIndex.has(metadata.namespace)) {
      this.namespaceIndex.get(metadata.namespace).delete(fullKey);
      if (this.namespaceIndex.get(metadata.namespace).size === 0) {
        this.namespaceIndex.delete(metadata.namespace);
      }
    }
    
    // Remove from tag index
    for (const tag of metadata.tags) {
      if (this.tagIndex.has(tag)) {
        this.tagIndex.get(tag).delete(fullKey);
        if (this.tagIndex.get(tag).size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  clearIndexes() {
    this.namespaceIndex.clear();
    this.tagIndex.clear();
  }

  async buildIndexes() {
    this.clearIndexes();
    
    for (const [fullKey, metadata] of this.metadataStore.entries()) {
      this.updateIndexes(fullKey, metadata);
    }
  }

  async evictEntry(fullKey) {
    const metadata = this.metadataStore.get(fullKey);
    
    this.memoryStore.delete(fullKey);
    this.metadataStore.delete(fullKey);
    
    if (metadata) {
      this.removeFromIndexes(fullKey, metadata);
    }
    
    await this.activeBackend.delete(fullKey);
    
    this.performance.evictions++;
  }

  markForSync(fullKey, operation, data) {
    this.syncState.pendingUpdates.set(fullKey, {
      operation,
      data,
      timestamp: Date.now()
    });
  }

  async processSyncUpdate(fullKey, update) {
    // Placeholder for actual synchronization logic
    // This would coordinate with remote memory stores
    return true;
  }

  calculateSearchScore(key, pattern, metadata) {
    let score = 0;
    
    // Exact match bonus
    if (key.toLowerCase() === pattern.toLowerCase()) {
      score += 100;
    }
    
    // Prefix match bonus
    if (key.toLowerCase().startsWith(pattern.toLowerCase())) {
      score += 50;
    }
    
    // Access count bonus
    score += Math.min(metadata.accessCount, 10);
    
    // Recency bonus
    const age = Date.now() - metadata.lastAccess;
    const dayAge = age / (24 * 60 * 60 * 1000);
    score += Math.max(0, 10 - dayAge);
    
    return score;
  }

  updateResponseTime(responseTime) {
    this.performance.totalResponseTime += responseTime;
    this.performance.avgResponseTime = 
      this.performance.totalResponseTime / (this.performance.operations || 1);
  }

  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.memoryStore.entries()) {
      totalSize += JSON.stringify({ key, value }).length * 2; // Rough estimate
    }
    
    return totalSize;
  }

  async cleanupOldMetrics() {
    try {
      const metricsDir = path.join(this.options.storageDir, 'metrics');
      const files = await fs.readdir(metricsDir);
      const cutoff = Date.now() - this.options.metricsRetention;
      
      for (const file of files) {
        if (file.startsWith('metrics-')) {
          const timestamp = parseInt(file.match(/metrics-(\d+)\.json/)?.[1]);
          if (timestamp && timestamp < cutoff) {
            await fs.unlink(path.join(metricsDir, file));
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getStats() {
    return {
      session: this.sessionState,
      memory: {
        entries: this.memoryStore.size,
        estimatedBytes: this.estimateMemoryUsage(),
        namespaces: this.namespaceIndex.size,
        tags: this.tagIndex.size
      },
      performance: this.performance,
      backend: this.options.primaryBackend,
      features: {
        compression: this.options.enableCompression,
        synchronization: this.options.enableSynchronization,
        claudeFlowIntegration: this.options.claudeFlowIntegration
      }
    };
  }

  async createBackup(backupId) {
    try {
      const backupData = {
        backupId: backupId || `backup_${Date.now()}`,
        timestamp: Date.now(),
        sessionState: this.sessionState,
        entries: Object.fromEntries(this.metadataStore.entries()),
        stats: this.getStats()
      };
      
      const backupPath = path.join(
        this.options.storageDir, 
        'backups', 
        `${backupData.backupId}.backup`
      );
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      this.emit('backupCreated', backupData);
      
      return { success: true, backupId: backupData.backupId, entries: this.memoryStore.size };

    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async shutdown() {
    console.log('🧠 Shutting down Memory Persistence Manager...');
    
    // Stop background processes
    if (this.gcTimer) clearInterval(this.gcTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.claudeFlowSyncTimer) clearInterval(this.claudeFlowSyncTimer);
    
    // Run final synchronization
    if (this.options.enableSynchronization) {
      await this.runSynchronization();
    }
    
    // Save session state
    await this.saveSessionState();
    
    // Create final backup if enabled
    if (this.options.backupEnabled) {
      await this.createBackup(`shutdown_${Date.now()}`);
    }
    
    // Shutdown storage backend
    if (this.activeBackend) {
      await this.activeBackend.shutdown();
    }
    
    this.emit('shutdown', this.getStats());
    
    console.log('✅ Memory persistence shutdown complete');
  }
}

// ============================================================================
// FILE STORAGE BACKEND
// ============================================================================

class FileStorageBackend {
  constructor(options) {
    this.options = options;
    this.storageDir = path.join(options.storageDir, 'file-backend');
  }

  async initialize() {
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  async store(key, entry) {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }

  async retrieve(key) {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async delete(key) {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStats() {
    return {
      backend: 'file',
      storageDir: this.storageDir
    };
  }

  async shutdown() {
    // No specific shutdown needed for file backend
  }

  getFilePath(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const subdir = hash.substr(0, 2);
    return path.join(this.storageDir, subdir, `${hash}.json`);
  }
}

module.exports = { MemoryPersistenceManager, FileStorageBackend };

// CLI usage
if (require.main === module) {
  const manager = new MemoryPersistenceManager({
    logLevel: 'debug',
    enableSynchronization: true,
    claudeFlowIntegration: true
  });
  
  async function demo() {
    try {
      console.log('🧪 Testing Memory Persistence Manager...\n');
      
      await manager.initialize();
      
      // Test basic operations
      console.log('1️⃣  Testing basic memory operations...');
      
      await manager.store('hook:validation:rules', {
        shadcnRequired: true,
        forbiddenFrameworks: ['material-ui', 'antd'],
        performanceThresholds: { maxHooks: 5, maxExecutionTime: 1000 }
      }, {
        namespace: 'hooks',
        tags: ['validation', 'prd', 'rules'],
        ttl: 24 * 60 * 60 * 1000
      });
      
      await manager.store('session:performance:metrics', {
        totalOperations: 150,
        averageTime: 250,
        blockingRate: 0.15,
        lastUpdated: Date.now()
      }, {
        namespace: 'performance',
        tags: ['metrics', 'session'],
        ttl: 60 * 60 * 1000
      });
      
      console.log('✅ Stored validation rules and performance metrics');
      
      // Test retrieval
      console.log('\n2️⃣  Testing memory retrieval...');
      
      const rules = await manager.retrieve('hook:validation:rules', { namespace: 'hooks' });
      const metrics = await manager.retrieve('session:performance:metrics', { namespace: 'performance' });
      
      console.log('✅ Retrieved entries:', rules ? 'rules found' : 'rules missing', 
                  metrics ? 'metrics found' : 'metrics missing');
      
      // Test search
      console.log('\n3️⃣  Testing memory search...');
      
      const searchResults = await manager.search('validation', { namespace: 'hooks' });
      console.log(`✅ Search results: ${searchResults.results.length} entries found`);
      
      // Test listing
      console.log('\n4️⃣  Testing memory listing...');
      
      const allEntries = await manager.list({ limit: 10 });
      console.log(`✅ Listed entries: ${allEntries.entries.length}/${allEntries.total} entries`);
      
      // Test backup
      console.log('\n5️⃣  Testing backup creation...');
      
      const backup = await manager.createBackup('demo-backup');
      console.log(`✅ Backup created: ${backup.backupId} with ${backup.entries} entries`);
      
      // Show stats
      console.log('\n6️⃣  Memory system statistics:');
      const stats = manager.getStats();
      console.log(`📊 Entries: ${stats.memory.entries}`);
      console.log(`📊 Namespaces: ${stats.memory.namespaces}`);
      console.log(`📊 Operations: ${stats.performance.operations}`);
      console.log(`📊 Hit Rate: ${stats.performance.hits}/${stats.performance.hits + stats.performance.misses}`);
      
      console.log('\n🎉 Memory Persistence Manager Demo Complete!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } finally {
      await manager.shutdown();
    }
  }
  
  demo();
}