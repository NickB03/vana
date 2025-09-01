/**
 * Vector Clock Implementation for Causal Ordering
 * Tracks causality between events in distributed systems
 */
class VectorClock {
  constructor(nodeId, initialClock = null) {
    this.nodeId = nodeId;
    this.clock = new Map();
    
    if (initialClock) {
      if (initialClock instanceof Map) {
        this.clock = new Map(initialClock);
      } else if (Array.isArray(initialClock)) {
        this.clock = new Map(initialClock);
      } else {
        this.clock = new Map(Object.entries(initialClock));
      }
    }
    
    // Initialize own clock to 0 if not present
    if (!this.clock.has(nodeId)) {
      this.clock.set(nodeId, 0);
    }
  }

  // Increment this node's clock
  increment() {
    const current = this.clock.get(this.nodeId) || 0;
    this.clock.set(this.nodeId, current + 1);
    return this.clock.get(this.nodeId);
  }

  // Update clock when receiving an event
  update(otherClock) {
    for (const [nodeId, timestamp] of otherClock.entries()) {
      const currentTime = this.clock.get(nodeId) || 0;
      this.clock.set(nodeId, Math.max(currentTime, timestamp));
    }
    
    // Increment own clock
    this.increment();
  }

  // Merge with another vector clock
  merge(otherClock) {
    const otherMap = otherClock instanceof VectorClock ? otherClock.clock : otherClock;
    
    for (const [nodeId, timestamp] of otherMap.entries()) {
      const currentTime = this.clock.get(nodeId) || 0;
      this.clock.set(nodeId, Math.max(currentTime, timestamp));
    }
  }

  // Check if this clock happens before another
  isBefore(otherClock) {
    const otherMap = otherClock instanceof VectorClock ? otherClock.clock : otherClock;
    let hasLess = false;
    
    // Check all nodes in both clocks
    const allNodes = new Set([...this.clock.keys(), ...otherMap.keys()]);
    
    for (const nodeId of allNodes) {
      const thisTime = this.clock.get(nodeId) || 0;
      const otherTime = otherMap.get(nodeId) || 0;
      
      if (thisTime > otherTime) {
        return false; // Not before if any timestamp is greater
      } else if (thisTime < otherTime) {
        hasLess = true;
      }
    }
    
    return hasLess; // Before only if at least one timestamp is less
  }

  // Check if this clock happens after another
  isAfter(otherClock) {
    const otherVectorClock = otherClock instanceof VectorClock ? otherClock : new VectorClock(this.nodeId, otherClock);
    return otherVectorClock.isBefore(this);
  }

  // Check if clocks are concurrent (neither before nor after)
  isConcurrent(otherClock) {
    return !this.isBefore(otherClock) && !this.isAfter(otherClock);
  }

  // Compare two clocks
  compare(otherClock) {
    if (this.isBefore(otherClock)) return -1;
    if (this.isAfter(otherClock)) return 1;
    return 0; // Concurrent or equal
  }

  // Get clock value for a specific node
  get(nodeId) {
    return this.clock.get(nodeId) || 0;
  }

  // Set clock value for a specific node
  set(nodeId, value) {
    this.clock.set(nodeId, value);
  }

  // Clone this vector clock
  clone() {
    return new VectorClock(this.nodeId, this.clock);
  }

  // Get all entries
  entries() {
    return this.clock.entries();
  }

  // Convert to JSON-serializable object
  toJSON() {
    return {
      nodeId: this.nodeId,
      clock: Array.from(this.clock.entries())
    };
  }

  // Create from JSON object
  static fromJSON(json) {
    return new VectorClock(json.nodeId, json.clock);
  }

  // String representation for debugging
  toString() {
    const entries = Array.from(this.clock.entries())
      .map(([node, time]) => `${node}:${time}`)
      .join(', ');
    return `VectorClock{${entries}}`;
  }
}

module.exports = VectorClock;