/**
 * Delta-State CRDT Framework
 * Implements efficient incremental synchronization using deltas instead of full states
 */

const VectorClock = require('./vector-clock');

class DeltaStateCRDT {
  constructor(baseCRDT, options = {}) {
    this.baseCRDT = baseCRDT;
    this.deltaBuffer = [];
    this.lastSyncVector = new Map();
    this.maxDeltaBuffer = options.maxDeltaBuffer || 1000;
    this.compressionThreshold = options.compressionThreshold || 100;
    this.deltaCallbacks = [];
    
    // Hook into base CRDT updates
    if (this.baseCRDT.onUpdate) {
      this.baseCRDT.onUpdate((delta) => this.handleBaseCRDTUpdate(delta));
    }
  }

  // Handle updates from base CRDT
  handleBaseCRDTUpdate(delta) {
    const deltaEntry = this.createDeltaEntry(delta);
    this.addDelta(deltaEntry);
    this.notifyDelta(deltaEntry);
  }

  // Create delta entry with metadata
  createDeltaEntry(delta) {
    return {
      id: this.generateDeltaId(),
      delta: delta,
      timestamp: Date.now(),
      vectorClock: this.baseCRDT.vectorClock ? this.baseCRDT.vectorClock.clone() : new VectorClock(this.baseCRDT.nodeId),
      nodeId: this.baseCRDT.nodeId,
      compressed: false
    };
  }

  // Generate unique delta ID
  generateDeltaId() {
    return `delta-${this.baseCRDT.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add delta to buffer
  addDelta(deltaEntry) {
    this.deltaBuffer.push(deltaEntry);
    
    // Maintain buffer size
    if (this.deltaBuffer.length > this.maxDeltaBuffer) {
      this.deltaBuffer.shift();
    }
    
    // Check if compression is needed
    if (this.deltaBuffer.length >= this.compressionThreshold) {
      this.compressDeltas();
    }
  }

  // Get deltas since last sync with peer
  getDeltasSince(peerNode, lastSyncClock = null) {
    const since = lastSyncClock || this.lastSyncVector.get(peerNode);
    
    if (!since) {
      return this.deltaBuffer; // No previous sync, send all deltas
    }
    
    return this.deltaBuffer.filter(deltaEntry => 
      deltaEntry.vectorClock.isAfter(since)
    );
  }

  // Apply received deltas
  async applyDeltas(deltas) {
    const sortedDeltas = this.sortDeltasByCausalOrder(deltas);
    const applied = [];
    
    for (const deltaEntry of sortedDeltas) {
      try {
        const success = await this.applyDelta(deltaEntry);
        if (success) {
          applied.push(deltaEntry);
        }
      } catch (error) {
        console.error(`Failed to apply delta ${deltaEntry.id}:`, error);
      }
    }
    
    return applied;
  }

  // Apply single delta
  async applyDelta(deltaEntry) {
    // Check if delta has already been applied
    if (this.isDeltaApplied(deltaEntry)) {
      return false;
    }
    
    // Apply to base CRDT
    let success = false;
    
    if (this.baseCRDT.applyDelta) {
      success = await this.baseCRDT.applyDelta(deltaEntry.delta);
    } else if (this.baseCRDT.merge && deltaEntry.delta.type === 'MERGE') {
      success = this.baseCRDT.merge(deltaEntry.delta.mergedFrom);
    } else {
      // Try to apply operation based on delta type
      success = await this.applyOperationDelta(deltaEntry);
    }
    
    if (success) {
      // Update vector clock
      if (this.baseCRDT.vectorClock) {
        this.baseCRDT.vectorClock.merge(deltaEntry.vectorClock);
      }
      
      // Mark as applied
      this.markDeltaApplied(deltaEntry);
    }
    
    return success;
  }

  // Apply operation-based delta
  async applyOperationDelta(deltaEntry) {
    const { delta } = deltaEntry;
    
    switch (delta.type) {
      case 'INCREMENT':
        if (this.baseCRDT.increment && delta.node && delta.amount) {
          return this.baseCRDT.payload ? 
            this.tryIncrementPayload(delta.node, delta.newValue) :
            this.baseCRDT.increment(delta.amount);
        }
        break;
        
      case 'ADD':
        if (this.baseCRDT.add && delta.element !== undefined) {
          this.baseCRDT.add(delta.element);
          return true;
        }
        break;
        
      case 'REMOVE':
        if (this.baseCRDT.remove && delta.element !== undefined) {
          return this.baseCRDT.remove(delta.element);
        }
        break;
        
      case 'SET':
        if (this.baseCRDT.set && delta.newValue !== undefined) {
          return this.baseCRDT.set(delta.newValue, delta.newTimestamp, delta.newWriter);
        }
        break;
        
      default:
        console.warn(`Unknown operation delta type: ${delta.type}`);
    }
    
    return false;
  }

  // Try to increment payload-based CRDT
  tryIncrementPayload(node, newValue) {
    if (this.baseCRDT.payload && this.baseCRDT.payload.has) {
      const currentValue = this.baseCRDT.payload.get(node) || 0;
      if (newValue > currentValue) {
        this.baseCRDT.payload.set(node, newValue);
        return true;
      }
    }
    return false;
  }

  // Check if delta has been applied
  isDeltaApplied(deltaEntry) {
    // Simple check based on vector clock comparison
    if (this.baseCRDT.vectorClock) {
      return !deltaEntry.vectorClock.isAfter(this.baseCRDT.vectorClock);
    }
    return false;
  }

  // Mark delta as applied (placeholder for more sophisticated tracking)
  markDeltaApplied(deltaEntry) {
    // In a more sophisticated implementation, this would maintain
    // a record of applied deltas to avoid reapplication
  }

  // Sort deltas by causal order
  sortDeltasByCausalOrder(deltas) {
    return deltas.sort((a, b) => {
      const comparison = a.vectorClock.compare(b.vectorClock);
      if (comparison !== 0) return comparison;
      
      // If concurrent, sort by timestamp
      return a.timestamp - b.timestamp;
    });
  }

  // Compress deltas to save space
  compressDeltas() {
    const compressed = this.performDeltaCompression();
    
    if (compressed.length < this.deltaBuffer.length) {
      this.deltaBuffer = compressed;
      
      // Mark compressed entries
      for (const delta of this.deltaBuffer) {
        if (delta.compressionData) {
          delta.compressed = true;
        }
      }
    }
  }

  // Perform actual delta compression
  performDeltaCompression() {
    // Group deltas by type and compress similar operations
    const groupedDeltas = new Map();
    
    for (const deltaEntry of this.deltaBuffer) {
      const key = this.getDeltaCompressionKey(deltaEntry);
      
      if (!groupedDeltas.has(key)) {
        groupedDeltas.set(key, []);
      }
      groupedDeltas.get(key).push(deltaEntry);
    }
    
    const compressed = [];
    
    for (const [key, deltas] of groupedDeltas) {
      if (deltas.length === 1) {
        compressed.push(deltas[0]);
      } else {
        const compressedDelta = this.compressDeltaGroup(deltas);
        compressed.push(compressedDelta);
      }
    }
    
    return compressed.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get compression key for grouping similar deltas
  getDeltaCompressionKey(deltaEntry) {
    const { delta } = deltaEntry;
    
    switch (delta.type) {
      case 'INCREMENT':
        return `increment-${delta.node}`;
      case 'ADD':
      case 'REMOVE':
        return `set-operation-${delta.element}`;
      case 'SET':
        return `register-${delta.newWriter}`;
      default:
        return `misc-${delta.type}`;
    }
  }

  // Compress a group of similar deltas
  compressDeltaGroup(deltas) {
    const firstDelta = deltas[0];
    const lastDelta = deltas[deltas.length - 1];
    
    // Create compressed delta
    const compressed = {
      ...firstDelta,
      id: this.generateDeltaId(),
      delta: {
        ...lastDelta.delta,
        type: `COMPRESSED_${firstDelta.delta.type}`,
        compressionData: {
          originalCount: deltas.length,
          timeRange: {
            start: firstDelta.timestamp,
            end: lastDelta.timestamp
          }
        }
      },
      timestamp: lastDelta.timestamp,
      vectorClock: lastDelta.vectorClock,
      compressed: true
    };
    
    return compressed;
  }

  // Create delta-state for synchronization
  createDeltaState(targetNode, sinceVector = null) {
    const deltas = this.getDeltasSince(targetNode, sinceVector);
    
    return {
      nodeId: this.baseCRDT.nodeId,
      targetNode: targetNode,
      sinceVector: sinceVector ? sinceVector.toJSON() : null,
      deltas: deltas.map(delta => ({
        ...delta,
        vectorClock: delta.vectorClock.toJSON()
      })),
      timestamp: Date.now(),
      compressed: deltas.some(d => d.compressed)
    };
  }

  // Apply delta-state from synchronization
  async applyDeltaState(deltaState) {
    const deltas = deltaState.deltas.map(delta => ({
      ...delta,
      vectorClock: VectorClock.fromJSON(delta.vectorClock)
    }));
    
    const applied = await this.applyDeltas(deltas);
    
    // Update last sync vector
    if (applied.length > 0) {
      const latestClock = applied[applied.length - 1].vectorClock;
      this.lastSyncVector.set(deltaState.nodeId, latestClock.clone());
    }
    
    return applied;
  }

  // Get current delta buffer state
  getDeltaBufferState() {
    return {
      size: this.deltaBuffer.length,
      compressed: this.deltaBuffer.filter(d => d.compressed).length,
      oldestTimestamp: this.deltaBuffer.length > 0 ? this.deltaBuffer[0].timestamp : null,
      newestTimestamp: this.deltaBuffer.length > 0 ? 
        this.deltaBuffer[this.deltaBuffer.length - 1].timestamp : null,
      totalSize: this.estimateDeltaBufferSize()
    };
  }

  // Estimate memory usage of delta buffer
  estimateDeltaBufferSize() {
    return this.deltaBuffer.reduce((total, delta) => {
      return total + JSON.stringify(delta).length;
    }, 0);
  }

  // Garbage collection for old deltas
  garbageCollectDeltas(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoffTime = Date.now() - maxAge;
    const originalSize = this.deltaBuffer.length;
    
    this.deltaBuffer = this.deltaBuffer.filter(
      deltaEntry => deltaEntry.timestamp > cutoffTime
    );
    
    return originalSize - this.deltaBuffer.length; // Number of deltas removed
  }

  // Event handling
  onDelta(callback) {
    this.deltaCallbacks.push(callback);
  }

  notifyDelta(deltaEntry) {
    this.deltaCallbacks.forEach(callback => callback(deltaEntry));
  }

  // Utility methods
  getDeltaCount() {
    return this.deltaBuffer.length;
  }

  getLastDelta() {
    return this.deltaBuffer.length > 0 ? 
      this.deltaBuffer[this.deltaBuffer.length - 1] : null;
  }

  getOldestDelta() {
    return this.deltaBuffer.length > 0 ? this.deltaBuffer[0] : null;
  }

  // Debug information
  getDebugInfo() {
    return {
      baseCRDTType: this.baseCRDT.constructor.name,
      deltaBufferState: this.getDeltaBufferState(),
      lastSyncPeers: Array.from(this.lastSyncVector.keys()),
      compressionRatio: this.deltaBuffer.length > 0 ? 
        this.deltaBuffer.filter(d => d.compressed).length / this.deltaBuffer.length : 0
    };
  }

  // Reset delta state
  reset() {
    this.deltaBuffer = [];
    this.lastSyncVector.clear();
  }

  // Shutdown and cleanup
  shutdown() {
    this.reset();
    this.deltaCallbacks = [];
  }
}

module.exports = DeltaStateCRDT;