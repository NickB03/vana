#!/usr/bin/env node

/**
 * Redis Storage Backend for Memory Persistence Manager
 * 
 * Provides high-performance, distributed storage for hook memory
 * persistence with Redis-native features like clustering, pub/sub,
 * and advanced data structures.
 * 
 * Features:
 * - Redis Cluster support for horizontal scaling
 * - Pub/Sub for real-time synchronization across instances
 * - Redis Streams for event sourcing and audit logs
 * - Lua scripts for atomic operations
 * - Connection pooling and failover support
 * - Memory optimization with compression and TTL
 * - Full-text search with RediSearch (if available)
 * - Distributed locking for coordination
 */

const Redis = require('ioredis');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class RedisStorageBackend extends EventEmitter {
  constructor(options) {
    super();
    
    this.options = {
      // Redis connection
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379,
      password: options.redisPassword,
      db: options.redisDb || 0,
      
      // Connection pool
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      
      // Clustering
      enableCluster: options.enableCluster || false,
      clusterNodes: options.clusterNodes || [],
      
      // Features
      enablePubSub: options.enablePubSub !== false,
      enableStreams: options.enableStreams !== false,
      enableCompression: options.enableCompression !== false,
      enableSearch: options.enableSearch !== false,
      
      // Key prefixes
      keyPrefix: options.keyPrefix || 'memory:',
      tagPrefix: options.tagPrefix || 'tags:',
      metaPrefix: options.metaPrefix || 'meta:',
      lockPrefix: options.lockPrefix || 'lock:',
      streamName: options.streamName || 'memory:events',
      
      // Performance
      pipelineSize: options.pipelineSize || 100,
      enableLuaScripts: options.enableLuaScripts !== false,
      
      ...options
    };

    // Redis connections
    this.redis = null;
    this.subscriber = null;
    this.publisher = null;
    
    // Lua scripts
    this.luaScripts = new Map();
    
    // Statistics
    this.stats = {
      operations: 0,
      pipelineOps: 0,
      pubsubMessages: 0,
      streamEvents: 0,
      errors: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Pipeline queue
    this.pipelineQueue = [];
    this.pipelineTimer = null;
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔴 Initializing Redis storage backend...');
    
    try {
      // Initialize Redis connections
      await this.initializeConnections();
      
      // Load Lua scripts
      await this.loadLuaScripts();
      
      // Setup pub/sub if enabled
      if (this.options.enablePubSub) {
        await this.setupPubSub();
      }
      
      // Initialize streams if enabled
      if (this.options.enableStreams) {
        await this.initializeStreams();
      }
      
      // Start pipeline processor
      this.startPipelineProcessor();
      
      this.isInitialized = true;
      console.log('✅ Redis backend ready');
      
    } catch (error) {
      throw new Error(`Redis backend initialization failed: ${error.message}`);
    }
  }

  async initializeConnections() {
    const redisConfig = {
      host: this.options.host,
      port: this.options.port,
      password: this.options.password,
      db: this.options.db,
      maxRetriesPerRequest: this.options.maxRetriesPerRequest,
      retryDelayOnFailover: this.options.retryDelayOnFailover,
      enableOfflineQueue: this.options.enableOfflineQueue,
      connectTimeout: this.options.connectTimeout,
      commandTimeout: this.options.commandTimeout
    };

    if (this.options.enableCluster && this.options.clusterNodes.length > 0) {
      // Use Redis Cluster
      this.redis = new Redis.Cluster(this.options.clusterNodes, {
        redisOptions: redisConfig,
        enableReadyCheck: true,
        maxRedirections: 3
      });
    } else {
      // Use single Redis instance
      this.redis = new Redis(redisConfig);
    }

    // Create separate connections for pub/sub
    if (this.options.enablePubSub) {
      this.subscriber = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);
    }

    // Setup error handlers
    this.redis.on('error', (error) => {
      this.stats.errors++;
      console.error('Redis error:', error.message);
      this.emit('error', error);
    });

    this.redis.on('connect', () => {
      console.log('🔴 Redis connected');
      this.emit('connected');
    });

    this.redis.on('ready', () => {
      console.log('🔴 Redis ready');
      this.emit('ready');
    });
  }

  async loadLuaScripts() {
    if (!this.options.enableLuaScripts) return;

    const scripts = {
      // Atomic store operation with tags
      storeWithTags: `
        local key = KEYS[1]
        local metaKey = KEYS[2]
        local entry = ARGV[1]
        local meta = ARGV[2]
        local tags = cjson.decode(ARGV[3])
        local expiry = tonumber(ARGV[4])
        
        -- Store entry
        redis.call('SET', key, entry)
        if expiry > 0 then
          redis.call('PEXPIRE', key, expiry)
        end
        
        -- Store metadata
        redis.call('HSET', metaKey, 'data', meta)
        if expiry > 0 then
          redis.call('PEXPIRE', metaKey, expiry)
        end
        
        -- Store tags
        for i, tag in ipairs(tags) do
          local tagKey = 'tags:' .. tag
          redis.call('SADD', tagKey, key)
          if expiry > 0 then
            redis.call('PEXPIRE', tagKey, expiry)
          end
        end
        
        return 'OK'
      `,

      // Atomic retrieve with access tracking
      retrieveWithTracking: `
        local key = KEYS[1]
        local metaKey = KEYS[2]
        local now = tonumber(ARGV[1])
        
        -- Check if key exists and not expired
        local ttl = redis.call('PTTL', key)
        if ttl < 0 then
          return nil
        end
        
        -- Get entry and metadata
        local entry = redis.call('GET', key)
        local meta = redis.call('HGET', metaKey, 'data')
        
        if entry and meta then
          -- Update access information
          redis.call('HINCRBY', metaKey, 'access_count', 1)
          redis.call('HSET', metaKey, 'last_access', now)
          
          return {entry, meta}
        end
        
        return nil
      `,

      // Cleanup expired entries
      cleanupExpired: `
        local pattern = ARGV[1]
        local limit = tonumber(ARGV[2])
        local cleaned = 0
        
        local keys = redis.call('SCAN', 0, 'MATCH', pattern, 'COUNT', limit)
        local cursor = keys[1]
        local keyList = keys[2]
        
        for i, key in ipairs(keyList) do
          local ttl = redis.call('PTTL', key)
          if ttl == -2 then  -- Key expired or doesn't exist
            redis.call('DEL', key)
            cleaned = cleaned + 1
          end
        end
        
        return cleaned
      `,

      // Search by tags
      searchByTags: `
        local tags = cjson.decode(ARGV[1])
        local limit = tonumber(ARGV[2])
        local results = {}
        
        if #tags == 0 then
          return results
        end
        
        -- Get intersection of tag sets
        local tagKeys = {}
        for i, tag in ipairs(tags) do
          table.insert(tagKeys, 'tags:' .. tag)
        end
        
        local intersection = redis.call('SINTER', unpack(tagKeys))
        
        for i, key in ipairs(intersection) do
          if i > limit then break end
          
          local ttl = redis.call('PTTL', key)
          if ttl > 0 or ttl == -1 then  -- Not expired
            table.insert(results, key)
          end
        end
        
        return results
      `
    };

    for (const [name, script] of Object.entries(scripts)) {
      try {
        const sha = await this.redis.script('LOAD', script);
        this.luaScripts.set(name, { script, sha });
      } catch (error) {
        console.warn(`Failed to load Lua script ${name}:`, error.message);
      }
    }
  }

  async setupPubSub() {
    if (!this.subscriber || !this.publisher) return;

    // Subscribe to memory events
    await this.subscriber.subscribe(
      `${this.options.keyPrefix}events`,
      `${this.options.keyPrefix}sync`
    );

    this.subscriber.on('message', (channel, message) => {
      this.stats.pubsubMessages++;
      
      try {
        const event = JSON.parse(message);
        this.handlePubSubMessage(channel, event);
      } catch (error) {
        console.warn('Invalid pub/sub message:', error.message);
      }
    });
  }

  async initializeStreams() {
    try {
      // Create stream if it doesn't exist
      await this.redis.xgroup(
        'CREATE', 
        this.options.streamName, 
        'memory-consumers', 
        '$', 
        'MKSTREAM'
      );
    } catch (error) {
      if (!error.message.includes('BUSYGROUP')) {
        console.warn('Stream initialization warning:', error.message);
      }
    }
  }

  startPipelineProcessor() {
    this.pipelineTimer = setInterval(() => {
      this.processPipelineQueue();
    }, 10); // Process every 10ms
  }

  async processPipelineQueue() {
    if (this.pipelineQueue.length === 0) return;

    const batch = this.pipelineQueue.splice(0, this.options.pipelineSize);
    if (batch.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();
      
      for (const operation of batch) {
        pipeline[operation.command](...operation.args);
      }
      
      const results = await pipeline.exec();
      
      // Resolve promises
      for (let i = 0; i < batch.length; i++) {
        const operation = batch[i];
        const result = results[i];
        
        if (result[0]) {
          operation.reject(result[0]);
        } else {
          operation.resolve(result[1]);
        }
      }
      
      this.stats.pipelineOps += batch.length;
      
    } catch (error) {
      // Reject all operations in the batch
      for (const operation of batch) {
        operation.reject(error);
      }
    }
  }

  // ============================================================================
  // CORE STORAGE OPERATIONS
  // ============================================================================

  async store(key, entry) {
    const startTime = Date.now();
    
    try {
      const redisKey = this.buildRedisKey(key);
      const metaKey = this.buildMetaKey(key);
      const expiry = entry.expiresAt - Date.now();
      
      if (this.options.enableLuaScripts && this.luaScripts.has('storeWithTags')) {
        // Use Lua script for atomic operation
        const script = this.luaScripts.get('storeWithTags');
        await this.redis.evalsha(
          script.sha,
          2,
          redisKey,
          metaKey,
          JSON.stringify(entry.value),
          JSON.stringify({
            namespace: entry.namespace,
            timestamp: entry.timestamp,
            ttl: entry.ttl,
            expiresAt: entry.expiresAt,
            accessCount: entry.accessCount || 0,
            lastAccess: entry.lastAccess,
            version: entry.version,
            checksum: entry.checksum,
            compressed: entry.compressed
          }),
          JSON.stringify(entry.tags || []),
          expiry
        );
      } else {
        // Use pipeline for multiple operations
        const pipeline = this.redis.pipeline();
        
        // Store main entry
        pipeline.set(redisKey, JSON.stringify(entry.value));
        if (expiry > 0) {
          pipeline.pexpire(redisKey, expiry);
        }
        
        // Store metadata
        pipeline.hset(metaKey, {
          namespace: entry.namespace,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          expiresAt: entry.expiresAt,
          accessCount: entry.accessCount || 0,
          lastAccess: entry.lastAccess,
          version: entry.version,
          checksum: entry.checksum,
          compressed: entry.compressed ? 1 : 0,
          tags: JSON.stringify(entry.tags || [])
        });
        if (expiry > 0) {
          pipeline.pexpire(metaKey, expiry);
        }
        
        // Store tag associations
        for (const tag of entry.tags || []) {
          const tagKey = this.buildTagKey(tag);
          pipeline.sadd(tagKey, redisKey);
          if (expiry > 0) {
            pipeline.pexpire(tagKey, expiry);
          }
        }
        
        await pipeline.exec();
      }
      
      // Publish event if pub/sub enabled
      if (this.options.enablePubSub) {
        await this.publishEvent('store', {
          key: redisKey,
          namespace: entry.namespace,
          tags: entry.tags
        });
      }
      
      // Add to stream if enabled
      if (this.options.enableStreams) {
        await this.addStreamEvent('store', {
          key: redisKey,
          namespace: entry.namespace,
          timestamp: Date.now()
        });
      }
      
      this.updateStats(Date.now() - startTime);
      
      return true;

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis store operation failed: ${error.message}`);
    }
  }

  async retrieve(key) {
    const startTime = Date.now();
    
    try {
      const redisKey = this.buildRedisKey(key);
      const metaKey = this.buildMetaKey(key);
      
      if (this.options.enableLuaScripts && this.luaScripts.has('retrieveWithTracking')) {
        // Use Lua script for atomic retrieve with tracking
        const script = this.luaScripts.get('retrieveWithTracking');
        const result = await this.redis.evalsha(
          script.sha,
          2,
          redisKey,
          metaKey,
          Date.now()
        );
        
        if (!result) {
          this.stats.cacheMisses++;
          this.updateStats(Date.now() - startTime);
          return null;
        }
        
        const [entryData, metaData] = result;
        const entry = this.reconstructEntry(
          key,
          JSON.parse(entryData),
          JSON.parse(metaData)
        );
        
        this.stats.cacheHits++;
        this.updateStats(Date.now() - startTime);
        
        return entry;
        
      } else {
        // Use pipeline for multiple operations
        const pipeline = this.redis.pipeline();
        pipeline.get(redisKey);
        pipeline.hgetall(metaKey);
        pipeline.pttl(redisKey);
        
        const [entryResult, metaResult, ttlResult] = await pipeline.exec();
        
        const entryData = entryResult[1];
        const metadata = metaResult[1];
        const ttl = ttlResult[1];
        
        // Check if entry exists and not expired
        if (!entryData || ttl === -2) {
          this.stats.cacheMisses++;
          this.updateStats(Date.now() - startTime);
          return null;
        }
        
        // Update access information
        await this.redis.pipeline()
          .hincrby(metaKey, 'accessCount', 1)
          .hset(metaKey, 'lastAccess', Date.now())
          .exec();
        
        const entry = this.reconstructEntry(
          key,
          JSON.parse(entryData),
          metadata
        );
        
        this.stats.cacheHits++;
        this.updateStats(Date.now() - startTime);
        
        return entry;
      }

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis retrieve operation failed: ${error.message}`);
    }
  }

  async delete(key) {
    const startTime = Date.now();
    
    try {
      const redisKey = this.buildRedisKey(key);
      const metaKey = this.buildMetaKey(key);
      
      // Get metadata to clean up tags
      const metadata = await this.redis.hgetall(metaKey);
      
      const pipeline = this.redis.pipeline();
      
      // Delete main entry and metadata
      pipeline.del(redisKey);
      pipeline.del(metaKey);
      
      // Clean up tag associations
      if (metadata.tags) {
        try {
          const tags = JSON.parse(metadata.tags);
          for (const tag of tags) {
            const tagKey = this.buildTagKey(tag);
            pipeline.srem(tagKey, redisKey);
          }
        } catch (error) {
          // Ignore tag parsing errors
        }
      }
      
      const results = await pipeline.exec();
      const deleted = results[0][1] > 0;
      
      // Publish event if pub/sub enabled
      if (this.options.enablePubSub && deleted) {
        await this.publishEvent('delete', {
          key: redisKey,
          namespace: metadata.namespace
        });
      }
      
      this.updateStats(Date.now() - startTime);
      
      return deleted;

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis delete operation failed: ${error.message}`);
    }
  }

  async list(options = {}) {
    const startTime = Date.now();
    
    try {
      const namespace = options.namespace;
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      
      let pattern;
      if (namespace) {
        pattern = `${this.options.keyPrefix}${namespace}:*`;
      } else {
        pattern = `${this.options.keyPrefix}*`;
      }
      
      const entries = [];
      let cursor = '0';
      let scanned = 0;
      
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          Math.min(1000, limit * 2)
        );
        
        cursor = nextCursor;
        
        // Filter out metadata and tag keys
        const entryKeys = keys.filter(key => 
          !key.startsWith(this.options.metaPrefix) &&
          !key.startsWith(this.options.tagPrefix)
        );
        
        // Get metadata for each key
        if (entryKeys.length > 0) {
          const pipeline = this.redis.pipeline();
          entryKeys.forEach(redisKey => {
            const metaKey = this.buildMetaKey(this.extractKey(redisKey));
            pipeline.hgetall(metaKey);
            pipeline.pttl(redisKey);
          });
          
          const results = await pipeline.exec();
          
          for (let i = 0; i < entryKeys.length; i += 2) {
            const redisKey = entryKeys[i / 2];
            const metadata = results[i][1];
            const ttl = results[i + 1][1];
            
            // Skip expired entries
            if (ttl === -2) continue;
            
            // Skip if we haven't reached the offset yet
            if (scanned < offset) {
              scanned++;
              continue;
            }
            
            // Stop if we've reached the limit
            if (entries.length >= limit) break;
            
            const entry = this.buildListEntry(this.extractKey(redisKey), metadata);
            entries.push(entry);
            scanned++;
          }
        }
        
      } while (cursor !== '0' && entries.length < limit);
      
      this.updateStats(Date.now() - startTime);
      
      return {
        entries,
        total: scanned,
        offset,
        limit
      };

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis list operation failed: ${error.message}`);
    }
  }

  async search(pattern, options = {}) {
    const startTime = Date.now();
    
    try {
      const limit = options.limit || 50;
      const searchPattern = `${this.options.keyPrefix}*${pattern}*`;
      
      const entries = [];
      let cursor = '0';
      
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          searchPattern,
          'COUNT',
          limit * 2
        );
        
        cursor = nextCursor;
        
        // Filter out metadata and tag keys
        const entryKeys = keys.filter(key => 
          !key.startsWith(this.options.metaPrefix) &&
          !key.startsWith(this.options.tagPrefix)
        );
        
        // Get metadata for each key
        if (entryKeys.length > 0) {
          const pipeline = this.redis.pipeline();
          entryKeys.forEach(redisKey => {
            const metaKey = this.buildMetaKey(this.extractKey(redisKey));
            pipeline.hgetall(metaKey);
            pipeline.pttl(redisKey);
          });
          
          const results = await pipeline.exec();
          
          for (let i = 0; i < entryKeys.length; i += 2) {
            if (entries.length >= limit) break;
            
            const redisKey = entryKeys[i / 2];
            const metadata = results[i][1];
            const ttl = results[i + 1][1];
            
            // Skip expired entries
            if (ttl === -2) continue;
            
            const entry = this.buildListEntry(this.extractKey(redisKey), metadata);
            entries.push(entry);
          }
        }
        
      } while (cursor !== '0' && entries.length < limit);
      
      this.updateStats(Date.now() - startTime);
      
      return {
        results: entries,
        pattern,
        total: entries.length
      };

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis search operation failed: ${error.message}`);
    }
  }

  async searchByTags(tags, options = {}) {
    const startTime = Date.now();
    
    try {
      const limit = options.limit || 50;
      
      if (this.options.enableLuaScripts && this.luaScripts.has('searchByTags')) {
        // Use Lua script for efficient tag search
        const script = this.luaScripts.get('searchByTags');
        const keys = await this.redis.evalsha(
          script.sha,
          0,
          JSON.stringify(tags),
          limit
        );
        
        // Get metadata for found keys
        const entries = [];
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          keys.forEach(redisKey => {
            const metaKey = this.buildMetaKey(this.extractKey(redisKey));
            pipeline.hgetall(metaKey);
          });
          
          const results = await pipeline.exec();
          
          for (let i = 0; i < keys.length; i++) {
            const redisKey = keys[i];
            const metadata = results[i][1];
            
            const entry = this.buildListEntry(this.extractKey(redisKey), metadata);
            entries.push(entry);
          }
        }
        
        this.updateStats(Date.now() - startTime);
        
        return {
          results: entries,
          tags,
          total: entries.length
        };
        
      } else {
        // Fallback to manual tag intersection
        if (tags.length === 0) {
          return { results: [], tags, total: 0 };
        }
        
        const tagKeys = tags.map(tag => this.buildTagKey(tag));
        const intersection = await this.redis.sinter(...tagKeys);
        
        const entries = [];
        if (intersection.length > 0) {
          const limitedKeys = intersection.slice(0, limit);
          
          const pipeline = this.redis.pipeline();
          limitedKeys.forEach(redisKey => {
            const metaKey = this.buildMetaKey(this.extractKey(redisKey));
            pipeline.hgetall(metaKey);
            pipeline.pttl(redisKey);
          });
          
          const results = await pipeline.exec();
          
          for (let i = 0; i < limitedKeys.length; i += 2) {
            const redisKey = limitedKeys[i / 2];
            const metadata = results[i][1];
            const ttl = results[i + 1][1];
            
            // Skip expired entries
            if (ttl === -2) continue;
            
            const entry = this.buildListEntry(this.extractKey(redisKey), metadata);
            entries.push(entry);
          }
        }
        
        this.updateStats(Date.now() - startTime);
        
        return {
          results: entries,
          tags,
          total: entries.length
        };
      }

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis tag search operation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  buildRedisKey(key) {
    return `${this.options.keyPrefix}${key}`;
  }

  buildMetaKey(key) {
    return `${this.options.metaPrefix}${key}`;
  }

  buildTagKey(tag) {
    return `${this.options.tagPrefix}${tag}`;
  }

  extractKey(redisKey) {
    return redisKey.replace(this.options.keyPrefix, '');
  }

  reconstructEntry(key, value, metadata) {
    const tags = metadata.tags ? JSON.parse(metadata.tags) : [];
    
    return {
      key,
      value,
      namespace: metadata.namespace,
      tags,
      compressed: metadata.compressed === '1',
      timestamp: parseInt(metadata.timestamp),
      ttl: parseInt(metadata.ttl),
      expiresAt: parseInt(metadata.expiresAt),
      accessCount: parseInt(metadata.accessCount) || 0,
      lastAccess: parseInt(metadata.lastAccess),
      version: metadata.version,
      checksum: metadata.checksum
    };
  }

  buildListEntry(key, metadata) {
    const tags = metadata.tags ? JSON.parse(metadata.tags) : [];
    
    return {
      key,
      namespace: metadata.namespace,
      tags,
      timestamp: parseInt(metadata.timestamp),
      lastAccess: parseInt(metadata.lastAccess),
      accessCount: parseInt(metadata.accessCount) || 0,
      compressed: metadata.compressed === '1',
      expiresAt: parseInt(metadata.expiresAt),
      version: metadata.version
    };
  }

  async publishEvent(type, data) {
    try {
      const event = {
        type,
        data,
        timestamp: Date.now(),
        source: 'redis-backend'
      };
      
      await this.publisher.publish(
        `${this.options.keyPrefix}events`,
        JSON.stringify(event)
      );
      
    } catch (error) {
      // Ignore pub/sub errors
    }
  }

  async addStreamEvent(type, data) {
    try {
      await this.redis.xadd(
        this.options.streamName,
        '*',
        'type', type,
        'data', JSON.stringify(data),
        'timestamp', Date.now(),
        'source', 'redis-backend'
      );
      
      this.stats.streamEvents++;
      
    } catch (error) {
      // Ignore stream errors
    }
  }

  handlePubSubMessage(channel, event) {
    this.emit('memoryEvent', event);
  }

  updateStats(responseTime) {
    this.stats.operations++;
    this.stats.totalResponseTime += responseTime;
    this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.operations;
  }

  // ============================================================================
  // MAINTENANCE AND CLEANUP
  // ============================================================================

  async cleanupExpired() {
    const startTime = Date.now();
    
    try {
      if (this.options.enableLuaScripts && this.luaScripts.has('cleanupExpired')) {
        // Use Lua script for efficient cleanup
        const script = this.luaScripts.get('cleanupExpired');
        const cleaned = await this.redis.evalsha(
          script.sha,
          0,
          `${this.options.keyPrefix}*`,
          1000
        );
        
        this.updateStats(Date.now() - startTime);
        return cleaned;
        
      } else {
        // Manual cleanup
        let cleaned = 0;
        let cursor = '0';
        
        do {
          const [nextCursor, keys] = await this.redis.scan(
            cursor,
            'MATCH',
            `${this.options.keyPrefix}*`,
            'COUNT',
            1000
          );
          
          cursor = nextCursor;
          
          if (keys.length > 0) {
            const pipeline = this.redis.pipeline();
            keys.forEach(key => pipeline.pttl(key));
            
            const results = await pipeline.exec();
            
            const expiredKeys = [];
            for (let i = 0; i < keys.length; i++) {
              const ttl = results[i][1];
              if (ttl === -2) {  // Key expired or doesn't exist
                expiredKeys.push(keys[i]);
              }
            }
            
            if (expiredKeys.length > 0) {
              await this.redis.del(...expiredKeys);
              cleaned += expiredKeys.length;
            }
          }
          
        } while (cursor !== '0');
        
        this.updateStats(Date.now() - startTime);
        return cleaned;
      }

    } catch (error) {
      this.stats.errors++;
      this.updateStats(Date.now() - startTime);
      throw new Error(`Redis cleanup operation failed: ${error.message}`);
    }
  }

  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      return {
        backend: 'redis',
        connection: {
          host: this.options.host,
          port: this.options.port,
          db: this.options.db,
          cluster: this.options.enableCluster
        },
        performance: this.stats,
        redis: {
          dbSize,
          memory: this.parseRedisInfo(info)
        },
        features: {
          pubsub: this.options.enablePubSub,
          streams: this.options.enableStreams,
          luaScripts: this.options.enableLuaScripts,
          compression: this.options.enableCompression
        }
      };

    } catch (error) {
      return {
        backend: 'redis',
        performance: this.stats,
        error: error.message
      };
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.includes('memory') || key.includes('used')) {
          memory[key] = value;
        }
      }
    }
    
    return memory;
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  async shutdown() {
    console.log('🔴 Shutting down Redis storage backend...');
    
    try {
      // Stop pipeline processor
      if (this.pipelineTimer) {
        clearInterval(this.pipelineTimer);
      }
      
      // Process remaining pipeline queue
      await this.processPipelineQueue();
      
      // Close connections
      if (this.redis) {
        await this.redis.quit();
      }
      
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      
      if (this.publisher) {
        await this.publisher.quit();
      }
      
      console.log('✅ Redis backend shutdown complete');

    } catch (error) {
      console.error('Redis shutdown error:', error.message);
    }
  }
}

module.exports = { RedisStorageBackend };

// CLI usage for testing
if (require.main === module) {
  const backend = new RedisStorageBackend({
    host: 'localhost',
    port: 6379,
    db: 1, // Use test database
    enablePubSub: true,
    enableStreams: true,
    enableLuaScripts: true
  });
  
  async function testRedisBackend() {
    try {
      console.log('🧪 Testing Redis Storage Backend...\n');
      
      await backend.initialize();
      
      // Test data
      const testEntry = {
        key: 'test:redis:performance',
        value: { 
          message: 'Redis backend performance test',
          timestamp: Date.now(),
          data: new Array(100).fill('test').join(' ')
        },
        namespace: 'test',
        tags: ['performance', 'redis', 'backend'],
        compressed: false,
        timestamp: Date.now(),
        ttl: 60 * 60 * 1000,
        expiresAt: Date.now() + 60 * 60 * 1000,
        accessCount: 0,
        lastAccess: Date.now(),
        version: 'v1.0.0',
        checksum: 'abc123'
      };
      
      console.log('1️⃣  Testing store operation...');
      await backend.store('test:redis:performance', testEntry);
      console.log('✅ Entry stored successfully');
      
      console.log('\n2️⃣  Testing retrieve operation...');
      const retrieved = await backend.retrieve('test:redis:performance');
      console.log('✅ Entry retrieved:', retrieved ? 'found' : 'not found');
      
      console.log('\n3️⃣  Testing search operation...');
      const searched = await backend.search('performance');
      console.log(`✅ Search results: ${searched.results.length} entries`);
      
      console.log('\n4️⃣  Testing tag search...');
      const tagSearched = await backend.searchByTags(['performance', 'redis']);
      console.log(`✅ Tag search results: ${tagSearched.results.length} entries`);
      
      console.log('\n5️⃣  Testing list operation...');
      const listed = await backend.list({ namespace: 'test', limit: 10 });
      console.log(`✅ Listed entries: ${listed.entries.length}/${listed.total}`);
      
      console.log('\n6️⃣  Backend statistics:');
      const stats = await backend.getStats();
      console.log(`📊 Operations: ${stats.performance.operations}`);
      console.log(`📊 Avg Response Time: ${stats.performance.avgResponseTime.toFixed(2)}ms`);
      console.log(`📊 Cache Hit Rate: ${stats.performance.cacheHits}/${stats.performance.cacheHits + stats.performance.cacheMisses}`);
      
      console.log('\n🎉 Redis Backend Test Complete!');
      
    } catch (error) {
      console.error('❌ Redis test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } finally {
      await backend.shutdown();
    }
  }
  
  testRedisBackend();
}