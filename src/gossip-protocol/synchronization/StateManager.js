/**
 * State Manager
 * Manages distributed state synchronization with vector clocks and conflict resolution
 */

import { EventEmitter } from 'events';

export class StateManager extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      maxStateEntries: config.maxStateEntries || 10000,
      stateCleanupInterval: config.stateCleanupInterval || 300000, // 5 minutes
      conflictResolutionStrategy: config.conflictResolutionStrategy || 'last-writer-wins',
      enableVersioning: config.enableVersioning || true,
      ...config
    };
    
    this.state = new Map();
    this.vectorClock = new Map();
    this.stateHistory = new Map();
    this.peerStates = new Map();
    this.isRunning = false;
    
    // Performance metrics
    this.metrics = {
      stateUpdates: 0,
      conflictsResolved: 0,
      stateSize: 0,
      vectorClockUpdates: 0,
      historyEntries: 0
    };
    
    // Initialize our vector clock
    this.vectorClock.set(this.nodeId, 0);
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldState();
    }, this.config.stateCleanupInterval);
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.emit('stopped');
  }
  
  // Vector Clock Management
  incrementVectorClock() {
    const currentValue = this.vectorClock.get(this.nodeId) || 0;
    this.vectorClock.set(this.nodeId, currentValue + 1);
    this.metrics.vectorClockUpdates++;
  }
  
  updateVectorClock(peerVectorClock) {
    for (const [nodeId, timestamp] of Object.entries(peerVectorClock || {})) {
      const currentTimestamp = this.vectorClock.get(nodeId) || 0;
      this.vectorClock.set(nodeId, Math.max(currentTimestamp, timestamp));
    }
    
    // Increment our own timestamp
    this.incrementVectorClock();
  }
  
  getVectorClock() {
    return Object.fromEntries(this.vectorClock);
  }
  
  // State Management
  async setState(key, value, metadata = {}) {
    this.incrementVectorClock();
    
    const stateEntry = {
      key,
      value,
      nodeId: this.nodeId,
      vectorClock: this.getVectorClock(),
      timestamp: Date.now(),
      version: this.getNextVersion(key),
      metadata
    };
    
    // Check for conflicts with existing state
    const existingEntry = this.state.get(key);
    if (existingEntry) {
      const conflict = await this.detectConflict(existingEntry, stateEntry);
      if (conflict) {
        const resolution = await this.resolveConflict(conflict);
        stateEntry.value = resolution.value;
        stateEntry.conflictResolved = true;
        stateEntry.resolutionStrategy = resolution.strategy;
        this.metrics.conflictsResolved++;
      }
    }
    
    // Store current state
    this.state.set(key, stateEntry);
    this.metrics.stateUpdates++;
    
    // Maintain history if versioning is enabled
    if (this.config.enableVersioning) {
      this.addToHistory(key, stateEntry);
    }
    
    this.emit('stateUpdated', key, stateEntry);
    return stateEntry;
  }
  
  getState(key) {
    return this.state.get(key);
  }
  
  getAllState() {
    return Object.fromEntries(this.state);
  }
  
  deleteState(key) {
    const deleted = this.state.delete(key);
    if (deleted) {
      this.incrementVectorClock();
      this.emit('stateDeleted', key);
    }
    return deleted;
  }
  
  getNextVersion(key) {
    const existing = this.state.get(key);
    return existing ? (existing.version || 0) + 1 : 1;
  }
  
  // History Management
  addToHistory(key, stateEntry) {
    if (!this.stateHistory.has(key)) {
      this.stateHistory.set(key, []);
    }
    
    const history = this.stateHistory.get(key);
    history.push({
      ...stateEntry,
      historicalTimestamp: Date.now()
    });
    
    // Limit history size
    if (history.length > 100) {
      history.shift(); // Remove oldest entry
    }
    
    this.metrics.historyEntries++;
  }
  
  getStateHistory(key) {
    return this.stateHistory.get(key) || [];
  }
  
  // Conflict Detection and Resolution
  async detectConflict(existingEntry, newEntry) {
    // Check for vector clock causality
    const existingClock = existingEntry.vectorClock || {};
    const newClock = newEntry.vectorClock || {};
    
    const existingHappensFirst = this.happensBefore(existingClock, newClock);
    const newHappensFirst = this.happensBefore(newClock, existingClock);
    
    if (existingHappensFirst && !newHappensFirst) {
      return null; // New entry is causally after - no conflict
    } else if (newHappensFirst && !existingHappensFirst) {
      return null; // Existing entry is causally after - no conflict
    } else {
      // Concurrent updates - conflict detected
      return {
        type: 'concurrent',
        existing: existingEntry,
        new: newEntry,
        key: existingEntry.key
      };
    }
  }
  
  happensBefore(clockA, clockB) {
    let hasSmaller = false;
    
    // Check all nodes in clockB
    for (const nodeId in clockB) {
      const timestampA = clockA[nodeId] || 0;
      const timestampB = clockB[nodeId] || 0;
      
      if (timestampA > timestampB) {
        return false; // clockA is not before clockB
      } else if (timestampA < timestampB) {
        hasSmaller = true;
      }
    }
    
    // Check all nodes in clockA that might not be in clockB
    for (const nodeId in clockA) {
      if (!(nodeId in clockB) && clockA[nodeId] > 0) {
        return false; // clockA has events not in clockB
      }
    }
    
    return hasSmaller;
  }
  
  async resolveConflict(conflict) {
    switch (this.config.conflictResolutionStrategy) {
      case 'last-writer-wins':
        return this.resolveByTimestamp(conflict);
      case 'highest-version':
        return this.resolveByVersion(conflict);
      case 'node-priority':
        return this.resolveByNodePriority(conflict);
      case 'merge':
        return this.resolveByMerging(conflict);
      default:
        return this.resolveByTimestamp(conflict);
    }
  }
  
  resolveByTimestamp(conflict) {
    const existingTime = conflict.existing.timestamp || 0;
    const newTime = conflict.new.timestamp || 0;
    
    if (newTime > existingTime) {
      return { value: conflict.new.value, strategy: 'last-writer-wins-new' };
    } else if (existingTime > newTime) {
      return { value: conflict.existing.value, strategy: 'last-writer-wins-existing' };
    } else {
      // Same timestamp - use node ID for deterministic resolution
      return conflict.new.nodeId > conflict.existing.nodeId
        ? { value: conflict.new.value, strategy: 'timestamp-tie-node-id' }
        : { value: conflict.existing.value, strategy: 'timestamp-tie-node-id' };
    }
  }
  
  resolveByVersion(conflict) {
    const existingVersion = conflict.existing.version || 0;
    const newVersion = conflict.new.version || 0;
    
    return newVersion > existingVersion
      ? { value: conflict.new.value, strategy: 'highest-version-new' }
      : { value: conflict.existing.value, strategy: 'highest-version-existing' };
  }
  
  resolveByNodePriority(conflict) {
    // Simple priority based on node ID lexicographic order
    return conflict.new.nodeId > conflict.existing.nodeId
      ? { value: conflict.new.value, strategy: 'node-priority-new' }
      : { value: conflict.existing.value, strategy: 'node-priority-existing' };
  }
  
  resolveByMerging(conflict) {
    try {
      const merged = this.mergeValues(conflict.existing.value, conflict.new.value);
      return { value: merged, strategy: 'merged' };
    } catch (error) {
      // Fall back to timestamp resolution if merge fails
      console.warn('Merge failed, falling back to timestamp resolution:', error);
      return this.resolveByTimestamp(conflict);
    }
  }
  
  mergeValues(existingValue, newValue) {
    // Simple merge strategy - can be customized per application
    if (typeof existingValue === 'object' && typeof newValue === 'object') {
      if (Array.isArray(existingValue) && Array.isArray(newValue)) {
        // Merge arrays by combining unique elements
        return [...new Set([...existingValue, ...newValue])];
      } else {
        // Merge objects
        return {
          ...existingValue,
          ...newValue,
          _merged: true,
          _mergeTimestamp: Date.now()
        };
      }
    } else {
      // For primitive values, prefer the new value
      return newValue;
    }
  }
  
  // Message Processing
  async applyMessage(message) {
    try {
      // Update our vector clock with the message's clock
      this.updateVectorClock(message.vectorClock);
      
      // Process the message content
      switch (message.type) {
        case 'state_update':
          await this.handleStateUpdate(message);
          break;
        case 'state_delete':
          await this.handleStateDelete(message);
          break;
        case 'bulk_update':
          await this.handleBulkUpdate(message);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
      
    } catch (error) {
      console.error('Error applying message:', error);
      this.emit('messageError', error, message);
    }
  }
  
  async handleStateUpdate(message) {
    const { key, value, metadata } = message.payload;
    await this.setState(key, value, {
      ...metadata,
      receivedFrom: message.senderId,
      receivedAt: Date.now()
    });
  }
  
  async handleStateDelete(message) {
    const { key } = message.payload;
    this.deleteState(key);
  }
  
  async handleBulkUpdate(message) {
    const { updates } = message.payload;
    for (const update of updates) {
      await this.setState(update.key, update.value, update.metadata);
    }
  }
  
  // Peer State Management
  initializePeerState(peerId) {
    if (!this.peerStates.has(peerId)) {
      this.peerStates.set(peerId, {
        peerId,
        lastSeen: Date.now(),
        vectorClock: {},
        stateDigest: null
      });
    }
  }
  
  updatePeerState(peerId, vectorClock, stateDigest) {
    const peerState = this.peerStates.get(peerId) || {};
    this.peerStates.set(peerId, {
      ...peerState,
      peerId,
      lastSeen: Date.now(),
      vectorClock,
      stateDigest
    });
  }
  
  cleanupPeerState(peerId) {
    this.peerStates.delete(peerId);
  }
  
  // State Digest Generation
  async generateStateDigest() {
    const stateEntries = Array.from(this.state.entries())
      .sort(([a], [b]) => a.localeCompare(b)); // Deterministic ordering
    
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    
    for (const [key, entry] of stateEntries) {
      hash.update(JSON.stringify({ key, ...entry }));
    }
    
    return hash.digest('hex');
  }
  
  // Missing Data Detection
  getMissingDataRequests() {
    const requests = [];
    
    // Generate requests for data we might be missing
    for (const [peerId, peerState] of this.peerStates) {
      const peerClock = peerState.vectorClock || {};
      
      for (const [nodeId, peerTimestamp] of Object.entries(peerClock)) {
        const ourTimestamp = this.vectorClock.get(nodeId) || 0;
        
        if (peerTimestamp > ourTimestamp) {
          requests.push({
            type: 'missing_from_node',
            nodeId,
            fromTimestamp: ourTimestamp,
            toTimestamp: peerTimestamp
          });
        }
      }
    }
    
    return requests;
  }
  
  // Cleanup and Maintenance
  cleanupOldState() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    
    // Clean up old history entries
    for (const [key, history] of this.stateHistory) {
      const filteredHistory = history.filter(entry => 
        now - entry.historicalTimestamp < maxAge
      );
      
      if (filteredHistory.length !== history.length) {
        this.stateHistory.set(key, filteredHistory);
        cleaned += history.length - filteredHistory.length;
      }
      
      if (filteredHistory.length === 0) {
        this.stateHistory.delete(key);
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old state history entries`);
    }
    
    // Update metrics
    this.metrics.stateSize = this.state.size;
    this.metrics.historyEntries = Array.from(this.stateHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
  }
  
  // Public API Methods
  getMetrics() {
    return {
      ...this.metrics,
      currentStateSize: this.state.size,
      vectorClockSize: this.vectorClock.size,
      peerStatesCount: this.peerStates.size,
      historySize: this.stateHistory.size
    };
  }
  
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      vectorClock: this.getVectorClock(),
      stateKeys: Array.from(this.state.keys()),
      peerStates: Object.fromEntries(this.peerStates),
      metrics: this.getMetrics()
    };
  }
  
  async exportState() {
    return {
      nodeId: this.nodeId,
      vectorClock: this.getVectorClock(),
      state: Object.fromEntries(this.state),
      timestamp: Date.now()
    };
  }
  
  async importState(exportedState) {
    if (!exportedState || !exportedState.state) {
      throw new Error('Invalid exported state');
    }
    
    // Merge vector clocks
    this.updateVectorClock(exportedState.vectorClock);
    
    // Import state entries
    for (const [key, entry] of Object.entries(exportedState.state)) {
      await this.setState(key, entry.value, {
        ...entry.metadata,
        imported: true,
        importTimestamp: Date.now()
      });
    }
    
    this.emit('stateImported', exportedState.nodeId);
  }
}

export default StateManager;