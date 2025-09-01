/**
 * LWW-Register (Last-Writer-Wins Register) CRDT Implementation
 * Resolves conflicts by timestamp with node ID as tiebreaker
 */

const VectorClock = require('./vector-clock');

class LWWRegister {
  constructor(nodeId, initialValue = null, initialTimestamp = null) {
    this.nodeId = nodeId;
    this.value = initialValue;
    this.timestamp = initialTimestamp || (initialValue !== null ? Date.now() : 0);
    this.lastWriter = initialValue !== null ? nodeId : null;
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    if (initialValue !== null) {
      this.vectorClock.increment();
    }
  }

  // Set new value with timestamp
  set(newValue, timestamp = null, writer = null) {
    const ts = timestamp || Date.now();
    const writerNode = writer || this.nodeId;
    
    // Apply last-writer-wins logic
    if (this.shouldAcceptWrite(ts, writerNode)) {
      const oldValue = this.value;
      const oldTimestamp = this.timestamp;
      const oldWriter = this.lastWriter;
      
      this.value = newValue;
      this.timestamp = ts;
      this.lastWriter = writerNode;
      this.vectorClock.increment();
      
      const delta = {
        type: 'SET',
        oldValue: oldValue,
        newValue: newValue,
        oldTimestamp: oldTimestamp,
        newTimestamp: ts,
        oldWriter: oldWriter,
        newWriter: writerNode,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
      
      return true;
    }
    
    return false; // Write was rejected due to timestamp
  }

  // Get current value
  get() {
    return this.value;
  }

  // Get metadata about current value
  getMetadata() {
    return {
      value: this.value,
      timestamp: this.timestamp,
      lastWriter: this.lastWriter,
      vectorClock: this.vectorClock.toJSON()
    };
  }

  // Check if a write should be accepted based on LWW semantics
  shouldAcceptWrite(timestamp, writerNode) {
    // Accept if timestamp is newer
    if (timestamp > this.timestamp) {
      return true;
    }
    
    // Reject if timestamp is older
    if (timestamp < this.timestamp) {
      return false;
    }
    
    // For equal timestamps, use node ID as tiebreaker
    // Higher node ID wins (lexicographically)
    return writerNode > (this.lastWriter || '');
  }

  // Merge with another LWW-Register
  merge(otherRegister) {
    const otherValue = otherRegister.value !== undefined ? otherRegister.value : otherRegister;
    const otherTimestamp = otherRegister.timestamp || Date.now();
    const otherWriter = otherRegister.lastWriter || otherRegister.nodeId || 'unknown';
    
    const oldValue = this.value;
    const accepted = this.set(otherValue, otherTimestamp, otherWriter);
    
    // Merge vector clocks if present
    if (otherRegister.vectorClock) {
      const otherClock = otherRegister.vectorClock instanceof VectorClock ? 
        otherRegister.vectorClock : 
        VectorClock.fromJSON(otherRegister.vectorClock);
      this.vectorClock.merge(otherClock);
    }
    
    if (accepted) {
      const delta = {
        type: 'MERGE',
        oldValue: oldValue,
        newValue: this.value,
        mergedFrom: otherRegister,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return accepted;
  }

  // Apply delta from synchronization
  applyDelta(delta) {
    let applied = false;
    
    switch (delta.type) {
      case 'SET':
        applied = this.set(delta.newValue, delta.newTimestamp, delta.newWriter);
        break;
        
      case 'MERGE':
        applied = this.merge(delta.mergedFrom);
        break;
        
      default:
        console.warn(`Unknown delta type: ${delta.type}`);
    }
    
    if (applied) {
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
    }
    
    return applied;
  }

  // Compare with another register
  compare(otherRegister) {
    const otherTimestamp = otherRegister.timestamp || 0;
    const otherWriter = otherRegister.lastWriter || otherRegister.nodeId || '';
    
    if (this.timestamp > otherTimestamp) {
      return 'NEWER';
    } else if (this.timestamp < otherTimestamp) {
      return 'OLDER';
    } else {
      // Equal timestamps, compare writers
      if (this.lastWriter > otherWriter) {
        return 'NEWER';
      } else if (this.lastWriter < otherWriter) {
        return 'OLDER';
      } else {
        return 'EQUAL';
      }
    }
  }

  // Check if this register's value is newer than another
  isNewerThan(otherRegister) {
    return this.compare(otherRegister) === 'NEWER';
  }

  // Clone current state
  clone() {
    const newRegister = new LWWRegister(this.nodeId, this.value, this.timestamp);
    newRegister.lastWriter = this.lastWriter;
    newRegister.vectorClock = this.vectorClock.clone();
    return newRegister;
  }

  // Get serializable state
  getState() {
    return {
      type: 'LWW_REGISTER',
      nodeId: this.nodeId,
      value: this.value,
      timestamp: this.timestamp,
      lastWriter: this.lastWriter,
      vectorClock: this.vectorClock.toJSON()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const register = new LWWRegister(
      state.nodeId, 
      state.value, 
      state.timestamp
    );
    
    register.lastWriter = state.lastWriter;
    
    if (state.vectorClock) {
      register.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return register;
  }

  // Reset to initial state
  reset(initialValue = null) {
    const oldValue = this.value;
    
    this.value = initialValue;
    this.timestamp = initialValue !== null ? Date.now() : 0;
    this.lastWriter = initialValue !== null ? this.nodeId : null;
    this.vectorClock = new VectorClock(this.nodeId);
    
    if (initialValue !== null) {
      this.vectorClock.increment();
    }
    
    const delta = {
      type: 'RESET',
      oldValue: oldValue,
      newValue: this.value,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
  }

  // Conditional set (only if current value matches expected)
  compareAndSet(expectedValue, newValue) {
    if (this.value === expectedValue) {
      return this.set(newValue);
    }
    return false;
  }

  // Get age of current value
  getAge() {
    return Date.now() - this.timestamp;
  }

  // Check if value is stale (older than threshold)
  isStale(maxAge = 300000) { // 5 minutes default
    return this.getAge() > maxAge;
  }

  // Update timestamp without changing value (touch)
  touch(timestamp = null) {
    const ts = timestamp || Date.now();
    
    if (ts > this.timestamp) {
      const oldTimestamp = this.timestamp;
      this.timestamp = ts;
      this.lastWriter = this.nodeId;
      this.vectorClock.increment();
      
      const delta = {
        type: 'TOUCH',
        value: this.value,
        oldTimestamp: oldTimestamp,
        newTimestamp: ts,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
      
      return true;
    }
    
    return false;
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
    return this.value === null || this.value === undefined;
  }

  hasValue() {
    return !this.isEmpty();
  }

  // String representation
  toString() {
    return `LWWRegister{value: ${JSON.stringify(this.value)}, timestamp: ${this.timestamp}, writer: ${this.lastWriter}}`;
  }

  // Validation
  isValid() {
    // Check that timestamp is non-negative
    if (this.timestamp < 0) {
      return false;
    }
    
    // Check that if value is set, lastWriter is also set
    if (this.hasValue() && !this.lastWriter) {
      return false;
    }
    
    return true;
  }

  // Multi-value register functionality (for debugging conflicts)
  getConflictingValues() {
    // In a basic LWW register, there's only one value
    // This could be extended to track recent conflicting writes
    return [{
      value: this.value,
      timestamp: this.timestamp,
      writer: this.lastWriter
    }];
  }

  // Statistics
  getStats() {
    return {
      nodeId: this.nodeId,
      hasValue: this.hasValue(),
      age: this.getAge(),
      lastWriter: this.lastWriter,
      vectorClockSize: this.vectorClock.clock.size,
      isStale: this.isStale()
    };
  }
}

module.exports = LWWRegister;