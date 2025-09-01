/**
 * G-Counter (Grow-only Counter) CRDT Implementation
 * Supports only increment operations, guarantees convergence
 */

const VectorClock = require('./vector-clock');

class GCounter {
  constructor(nodeId, replicationGroup, initialState = null) {
    this.nodeId = nodeId;
    this.replicationGroup = new Set(replicationGroup);
    this.payload = new Map();
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    // Initialize counters for all nodes
    for (const node of this.replicationGroup) {
      this.payload.set(node, 0);
    }
    
    if (initialState) {
      this.merge(initialState);
    }
  }

  // Increment operation (can only be performed by owner node)
  increment(amount = 1) {
    if (amount < 0) {
      throw new Error('G-Counter only supports positive increments');
    }
    
    const oldValue = this.payload.get(this.nodeId) || 0;
    const newValue = oldValue + amount;
    this.payload.set(this.nodeId, newValue);
    
    // Update vector clock
    this.vectorClock.increment();
    
    // Create delta for synchronization
    const delta = {
      type: 'INCREMENT',
      node: this.nodeId,
      oldValue: oldValue,
      newValue: newValue,
      amount: amount,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    // Notify observers
    this.notifyUpdate(delta);
    
    return newValue;
  }

  // Get current value (sum of all node counters)
  value() {
    return Array.from(this.payload.values()).reduce((sum, val) => sum + val, 0);
  }

  // Get value for specific node
  getNodeValue(nodeId) {
    return this.payload.get(nodeId) || 0;
  }

  // Merge with another G-Counter state
  merge(otherState) {
    let changed = false;
    const otherPayload = otherState.payload || otherState;
    
    // Handle different input formats
    const payloadMap = otherPayload instanceof Map ? 
      otherPayload : 
      new Map(Object.entries(otherPayload));
    
    for (const [node, otherValue] of payloadMap) {
      const currentValue = this.payload.get(node) || 0;
      if (otherValue > currentValue) {
        this.payload.set(node, otherValue);
        changed = true;
      }
    }
    
    // Merge vector clocks if present
    if (otherState.vectorClock) {
      const otherClock = otherState.vectorClock instanceof VectorClock ? 
        otherState.vectorClock : 
        VectorClock.fromJSON(otherState.vectorClock);
      this.vectorClock.merge(otherClock);
    }
    
    if (changed) {
      const delta = {
        type: 'MERGE',
        mergedFrom: otherState,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return changed;
  }

  // Apply delta from synchronization
  applyDelta(delta) {
    switch (delta.type) {
      case 'INCREMENT':
        // Apply increment if it increases the node's counter
        const currentValue = this.payload.get(delta.node) || 0;
        if (delta.newValue > currentValue) {
          this.payload.set(delta.node, delta.newValue);
          
          // Update vector clock
          if (delta.vectorClock) {
            const deltaClock = VectorClock.fromJSON(delta.vectorClock);
            this.vectorClock.merge(deltaClock);
          }
          
          this.notifyUpdate({
            type: 'DELTA_APPLIED',
            originalDelta: delta,
            timestamp: Date.now()
          });
          
          return true;
        }
        break;
        
      case 'MERGE':
        return this.merge(delta.mergedFrom);
        
      default:
        console.warn(`Unknown delta type: ${delta.type}`);
    }
    
    return false;
  }

  // Compare with another state
  compare(otherState) {
    const otherPayload = otherState.payload || otherState;
    const payloadMap = otherPayload instanceof Map ? 
      otherPayload : 
      new Map(Object.entries(otherPayload));
    
    let hasGreater = false;
    let hasLess = false;
    
    // Get all nodes from both states
    const allNodes = new Set([...this.payload.keys(), ...payloadMap.keys()]);
    
    for (const node of allNodes) {
      const thisValue = this.payload.get(node) || 0;
      const otherValue = payloadMap.get(node) || 0;
      
      if (thisValue > otherValue) {
        hasGreater = true;
      } else if (thisValue < otherValue) {
        hasLess = true;
      }
    }
    
    if (hasGreater && !hasLess) return 'GREATER_THAN';
    if (hasLess && !hasGreater) return 'LESS_THAN';
    if (!hasGreater && !hasLess) return 'EQUAL';
    return 'CONCURRENT'; // Both have greater values in different nodes
  }

  // Check if this state dominates another (all values >= other values)
  dominates(otherState) {
    return this.compare(otherState) === 'GREATER_THAN';
  }

  // Clone current state
  clone() {
    const newCounter = new GCounter(this.nodeId, this.replicationGroup);
    newCounter.payload = new Map(this.payload);
    newCounter.vectorClock = this.vectorClock.clone();
    return newCounter;
  }

  // Get serializable state
  getState() {
    return {
      type: 'G_COUNTER',
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      payload: Object.fromEntries(this.payload),
      vectorClock: this.vectorClock.toJSON(),
      value: this.value()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const counter = new GCounter(state.nodeId, state.replicationGroup);
    counter.payload = new Map(Object.entries(state.payload));
    
    if (state.vectorClock) {
      counter.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return counter;
  }

  // Reset to initial state
  reset() {
    for (const node of this.replicationGroup) {
      this.payload.set(node, 0);
    }
    
    this.vectorClock = new VectorClock(this.nodeId);
    
    this.notifyUpdate({
      type: 'RESET',
      timestamp: Date.now()
    });
  }

  // Get increment history for a node
  getIncrements(nodeId) {
    return this.payload.get(nodeId) || 0;
  }

  // Event handling
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate(delta) {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  // Utility methods
  isEmpty() {
    return this.value() === 0;
  }

  size() {
    return this.replicationGroup.size;
  }

  getNodes() {
    return Array.from(this.replicationGroup);
  }

  // Debug information
  toString() {
    const payloadStr = Array.from(this.payload.entries())
      .map(([node, value]) => `${node}:${value}`)
      .join(', ');
    return `GCounter{${payloadStr}, total: ${this.value()}}`;
  }

  // Validation
  isValid() {
    // Check that all values are non-negative
    for (const value of this.payload.values()) {
      if (value < 0) {
        return false;
      }
    }
    
    // Check that all replication group nodes are present
    for (const node of this.replicationGroup) {
      if (!this.payload.has(node)) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = GCounter;