/**
 * CRDT Synchronizer - Main coordination class for Conflict-free Replicated Data Types
 * Implements state-based and operation-based CRDTs for eventually consistent distributed state
 */

const VectorClock = require('./vector-clock');
const GCounter = require('./g-counter');
const ORSet = require('./or-set');
const LWWRegister = require('./lww-register');
const RGA = require('./rga');
const PNCounter = require('./pn-counter');
const ORMap = require('./or-map');

class CRDTSynchronizer {
  constructor(nodeId, replicationGroup, options = {}) {
    this.nodeId = nodeId;
    this.replicationGroup = new Set(replicationGroup);
    this.crdtInstances = new Map();
    this.vectorClock = new VectorClock(nodeId);
    this.deltaBuffer = new Map();
    this.lastSyncVector = new Map();
    this.causalTracker = new CausalTracker(nodeId);
    
    // Configuration
    this.maxDeltaBuffer = options.maxDeltaBuffer || 1000;
    this.syncInterval = options.syncInterval || 30000; // 30 seconds
    this.garbageCollectInterval = options.garbageCollectInterval || 3600000; // 1 hour
    
    // Callbacks
    this.updateCallbacks = [];
    this.syncCallbacks = [];
    
    // Auto-sync setup
    if (options.autoSync !== false) {
      this.startAutoSync();
    }
    
    // Auto-garbage collection
    if (options.autoGC !== false) {
      this.startGarbageCollection();
    }
  }

  // Register CRDT instance
  registerCRDT(name, crdtType, initialState = null, options = {}) {
    const crdt = this.createCRDTInstance(crdtType, initialState, options);
    this.crdtInstances.set(name, crdt);
    
    // Subscribe to CRDT changes for delta tracking
    crdt.onUpdate((delta) => {
      this.trackDelta(name, delta);
      this.notifyUpdate(name, delta);
    });
    
    return crdt;
  }

  // Create specific CRDT instance
  createCRDTInstance(type, initialState, options = {}) {
    switch (type.toUpperCase()) {
      case 'G_COUNTER':
        return new GCounter(this.nodeId, this.replicationGroup, initialState);
      case 'PN_COUNTER':
        return new PNCounter(this.nodeId, this.replicationGroup, initialState);
      case 'OR_SET':
        return new ORSet(this.nodeId, initialState);
      case 'LWW_REGISTER':
        return new LWWRegister(this.nodeId, initialState);
      case 'OR_MAP':
        return new ORMap(this.nodeId, this.replicationGroup, options.valueType || 'LWW_REGISTER', initialState);
      case 'RGA':
        return new RGA(this.nodeId, initialState);
      default:
        throw new Error(`Unknown CRDT type: ${type}`);
    }
  }

  // Get CRDT instance by name
  getCRDT(name) {
    return this.crdtInstances.get(name);
  }

  // Track delta changes
  trackDelta(crdtName, delta) {
    const deltaEntry = {
      crdtName: crdtName,
      delta: delta,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.clone(),
      nodeId: this.nodeId
    };
    
    this.addDeltaToBuffer(deltaEntry);
    this.vectorClock.increment();
  }

  // Add delta to buffer
  addDeltaToBuffer(deltaEntry) {
    const key = `${deltaEntry.crdtName}-${deltaEntry.timestamp}-${this.nodeId}`;
    this.deltaBuffer.set(key, deltaEntry);
    
    // Maintain buffer size
    if (this.deltaBuffer.size > this.maxDeltaBuffer) {
      const oldestKey = Array.from(this.deltaBuffer.keys())[0];
      this.deltaBuffer.delete(oldestKey);
    }
  }

  // Get current state of all CRDTs
  getCurrentState() {
    const state = {};
    
    for (const [name, crdt] of this.crdtInstances) {
      state[name] = {
        type: crdt.constructor.name,
        state: crdt.getState ? crdt.getState() : crdt,
        vectorClock: this.vectorClock.clone()
      };
    }
    
    return state;
  }

  // Get deltas since last sync with peer
  getDeltasSince(peerNode, lastSyncClock = null) {
    const since = lastSyncClock || this.lastSyncVector.get(peerNode) || new VectorClock(peerNode);
    
    return Array.from(this.deltaBuffer.values()).filter(deltaEntry => 
      deltaEntry.vectorClock.isAfter(since)
    );
  }

  // Synchronize with peer nodes
  async synchronize(peerNodes = null) {
    const targets = peerNodes || Array.from(this.replicationGroup);
    const results = [];
    
    for (const peer of targets) {
      if (peer !== this.nodeId) {
        try {
          const result = await this.synchronizeWithPeer(peer);
          results.push({ peer, success: true, result });
        } catch (error) {
          results.push({ peer, success: false, error: error.message });
        }
      }
    }
    
    return results;
  }

  // Synchronize with single peer
  async synchronizeWithPeer(peerNode) {
    // Get current state and deltas
    const localState = this.getCurrentState();
    const deltas = this.getDeltasSince(peerNode);
    
    // Create sync request
    const syncRequest = {
      type: 'CRDT_SYNC_REQUEST',
      sender: this.nodeId,
      vectorClock: this.vectorClock.toJSON(),
      state: localState,
      deltas: deltas.map(d => ({
        ...d,
        vectorClock: d.vectorClock.toJSON()
      }))
    };
    
    // In a real implementation, this would send over network
    // For now, we'll simulate the response
    const response = await this.simulateSyncRequest(peerNode, syncRequest);
    
    // Process response
    return await this.processSyncResponse(response);
  }

  // Simulate sync request (in real implementation, this would be network call)
  async simulateSyncRequest(peerNode, syncRequest) {
    // This would be replaced with actual network communication
    return {
      type: 'CRDT_SYNC_RESPONSE',
      sender: peerNode,
      success: true,
      deltas: [], // Peer's deltas
      ack: true
    };
  }

  // Process sync response from peer
  async processSyncResponse(response) {
    if (!response.success) {
      throw new Error(`Sync failed: ${response.error}`);
    }
    
    // Apply received deltas
    if (response.deltas && response.deltas.length > 0) {
      await this.applyDeltas(response.deltas);
    }
    
    // Update last sync vector for peer
    this.lastSyncVector.set(response.sender, this.vectorClock.clone());
    
    // Notify sync completion
    this.notifySync(response.sender, response.deltas?.length || 0);
    
    return {
      appliedDeltas: response.deltas?.length || 0,
      currentState: this.getCurrentState()
    };
  }

  // Apply received deltas
  async applyDeltas(deltas) {
    // Sort deltas by causal order
    const sortedDeltas = this.sortDeltasByCausalOrder(deltas);
    
    for (const deltaEntry of sortedDeltas) {
      const crdt = this.crdtInstances.get(deltaEntry.crdtName);
      
      if (crdt && crdt.applyDelta) {
        await crdt.applyDelta(deltaEntry.delta);
        
        // Update vector clock
        const deltaVectorClock = VectorClock.fromJSON(deltaEntry.vectorClock);
        this.vectorClock.merge(deltaVectorClock);
      }
    }
  }

  // Sort deltas by causal order
  sortDeltasByCausalOrder(deltas) {
    return deltas.sort((a, b) => {
      const clockA = VectorClock.fromJSON(a.vectorClock);
      const clockB = VectorClock.fromJSON(b.vectorClock);
      return clockA.compare(clockB);
    });
  }

  // Merge state from another synchronizer
  mergeState(otherState) {
    let changed = false;
    
    for (const [name, stateInfo] of Object.entries(otherState)) {
      const localCRDT = this.crdtInstances.get(name);
      
      if (localCRDT && localCRDT.merge) {
        const oldState = localCRDT.clone ? localCRDT.clone() : { ...localCRDT };
        localCRDT.merge(stateInfo.state);
        
        if (JSON.stringify(oldState) !== JSON.stringify(localCRDT)) {
          changed = true;
        }
      }
    }
    
    return changed;
  }

  // Start automatic synchronization
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(async () => {
      try {
        await this.synchronize();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, this.syncInterval);
  }

  // Stop automatic synchronization
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Start garbage collection
  startGarbageCollection() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    this.gcTimer = setInterval(() => {
      this.garbageCollectDeltas();
    }, this.garbageCollectInterval);
  }

  // Stop garbage collection
  stopGarbageCollection() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }

  // Garbage collection for old deltas
  garbageCollectDeltas() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const toDelete = [];
    
    for (const [key, deltaEntry] of this.deltaBuffer) {
      if (deltaEntry.timestamp < cutoffTime) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.deltaBuffer.delete(key);
    }
    
    return toDelete.length;
  }

  // Event callbacks
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  notifyUpdate(crdtName, delta) {
    this.updateCallbacks.forEach(callback => callback(crdtName, delta));
  }

  notifySync(peerNode, deltaCount) {
    this.syncCallbacks.forEach(callback => callback(peerNode, deltaCount));
  }

  // Utility methods
  getStats() {
    return {
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      crdtCount: this.crdtInstances.size,
      deltaBufferSize: this.deltaBuffer.size,
      vectorClock: this.vectorClock.toString(),
      lastSyncTimes: Array.from(this.lastSyncVector.entries()).map(([node, clock]) => ({
        node,
        lastSync: clock.toString()
      }))
    };
  }

  // Shutdown
  shutdown() {
    this.stopAutoSync();
    this.stopGarbageCollection();
    this.crdtInstances.clear();
    this.deltaBuffer.clear();
  }
}

// Causal Tracker for event ordering
class CausalTracker {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.vectorClock = new VectorClock(nodeId);
    this.causalBuffer = new Map();
    this.deliveredEvents = new Set();
  }

  // Track causal dependencies
  trackEvent(event) {
    event.vectorClock = this.vectorClock.clone();
    this.vectorClock.increment();
    
    // Check if event can be delivered
    if (this.canDeliver(event)) {
      this.deliverEvent(event);
      this.checkBufferedEvents();
    } else {
      this.bufferEvent(event);
    }
  }

  canDeliver(event) {
    // Event can be delivered if all its causal dependencies are satisfied
    const eventClock = VectorClock.fromJSON(event.vectorClock);
    
    for (const [nodeId, clock] of eventClock.entries()) {
      if (nodeId === event.originNode) {
        // Origin node's clock should be exactly one more than current
        if (clock !== this.vectorClock.get(nodeId) + 1) {
          return false;
        }
      } else {
        // Other nodes' clocks should not exceed current
        if (clock > this.vectorClock.get(nodeId)) {
          return false;
        }
      }
    }
    return true;
  }

  deliverEvent(event) {
    if (!this.deliveredEvents.has(event.id)) {
      // Update vector clock
      const eventClock = VectorClock.fromJSON(event.vectorClock);
      this.vectorClock.merge(eventClock);
      
      // Mark as delivered
      this.deliveredEvents.add(event.id);
      
      // Process event (would be implemented by specific use case)
      this.processEvent(event);
    }
  }

  bufferEvent(event) {
    if (!this.causalBuffer.has(event.id)) {
      this.causalBuffer.set(event.id, event);
    }
  }

  checkBufferedEvents() {
    const deliverable = [];
    
    for (const [eventId, event] of this.causalBuffer) {
      if (this.canDeliver(event)) {
        deliverable.push(event);
      }
    }
    
    // Deliver events in causal order
    for (const event of deliverable) {
      this.causalBuffer.delete(event.id);
      this.deliverEvent(event);
    }
  }

  processEvent(event) {
    // Override in subclasses or provide callback
    console.log(`Processing event ${event.id} from ${event.originNode}`);
  }
}

module.exports = { CRDTSynchronizer, CausalTracker };