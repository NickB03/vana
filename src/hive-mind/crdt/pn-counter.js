/**
 * PN-Counter (Increment/Decrement Counter) CRDT Implementation
 * Combines two G-Counters to support both increment and decrement operations
 */

const GCounter = require('./g-counter');
const VectorClock = require('./vector-clock');

class PNCounter {
  constructor(nodeId, replicationGroup, initialState = null) {
    this.nodeId = nodeId;
    this.replicationGroup = new Set(replicationGroup);
    this.positiveCounter = new GCounter(nodeId, replicationGroup);
    this.negativeCounter = new GCounter(nodeId, replicationGroup);
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    if (initialState) {
      this.merge(initialState);
    }
    
    // Subscribe to counter updates
    this.positiveCounter.onUpdate((delta) => {
      this.handleCounterUpdate('POSITIVE', delta);
    });
    
    this.negativeCounter.onUpdate((delta) => {
      this.handleCounterUpdate('NEGATIVE', delta);
    });
  }

  // Handle updates from internal counters
  handleCounterUpdate(counterType, delta) {
    this.vectorClock.increment();
    
    const pnDelta = {
      type: 'COUNTER_UPDATE',
      counterType: counterType,
      originalDelta: delta,
      newValue: this.value(),
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(pnDelta);
  }

  // Increment operation
  increment(amount = 1) {
    if (amount < 0) {
      return this.decrement(-amount);
    }
    
    const oldValue = this.value();
    const newCounterValue = this.positiveCounter.increment(amount);
    this.vectorClock.increment();
    
    const delta = {
      type: 'INCREMENT',
      amount: amount,
      oldValue: oldValue,
      newValue: this.value(),
      positiveCounterValue: newCounterValue,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return this.value();
  }

  // Decrement operation
  decrement(amount = 1) {
    if (amount < 0) {
      return this.increment(-amount);
    }
    
    const oldValue = this.value();
    const newCounterValue = this.negativeCounter.increment(amount);
    this.vectorClock.increment();
    
    const delta = {
      type: 'DECREMENT',
      amount: amount,
      oldValue: oldValue,
      newValue: this.value(),
      negativeCounterValue: newCounterValue,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return this.value();
  }

  // Get current value (positive - negative)
  value() {
    return this.positiveCounter.value() - this.negativeCounter.value();
  }

  // Get positive counter value
  getPositiveValue() {
    return this.positiveCounter.value();
  }

  // Get negative counter value
  getNegativeValue() {
    return this.negativeCounter.value();
  }

  // Get value breakdown by node
  getValueBreakdown() {
    const breakdown = {};
    
    for (const node of this.replicationGroup) {
      const positive = this.positiveCounter.getNodeValue(node);
      const negative = this.negativeCounter.getNodeValue(node);
      
      breakdown[node] = {
        positive: positive,
        negative: negative,
        net: positive - negative
      };
    }
    
    return breakdown;
  }

  // Merge with another PN-Counter
  merge(otherState) {
    let changed = false;
    
    // Handle different input formats
    if (otherState.positiveCounter && otherState.negativeCounter) {
      // Full PN-Counter state
      const positiveChanged = this.positiveCounter.merge(otherState.positiveCounter);
      const negativeChanged = this.negativeCounter.merge(otherState.negativeCounter);
      changed = positiveChanged || negativeChanged;
    } else if (otherState.positive && otherState.negative) {
      // Simplified state format
      const positiveChanged = this.positiveCounter.merge({ payload: otherState.positive });
      const negativeChanged = this.negativeCounter.merge({ payload: otherState.negative });
      changed = positiveChanged || negativeChanged;
    } else {
      // Try to merge as single counter (assume positive)
      changed = this.positiveCounter.merge(otherState);
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
        newValue: this.value(),
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return changed;
  }

  // Apply delta from synchronization
  applyDelta(delta) {
    let applied = false;
    
    switch (delta.type) {
      case 'INCREMENT':
        // Apply increment by updating positive counter to match
        if (delta.positiveCounterValue !== undefined) {
          const currentPositive = this.positiveCounter.getNodeValue(delta.node || this.nodeId);
          if (delta.positiveCounterValue > currentPositive) {
            this.positiveCounter.payload.set(delta.node || this.nodeId, delta.positiveCounterValue);
            applied = true;
          }
        } else if (delta.amount !== undefined) {
          this.increment(delta.amount);
          applied = true;
        }
        break;
        
      case 'DECREMENT':
        // Apply decrement by updating negative counter to match
        if (delta.negativeCounterValue !== undefined) {
          const currentNegative = this.negativeCounter.getNodeValue(delta.node || this.nodeId);
          if (delta.negativeCounterValue > currentNegative) {
            this.negativeCounter.payload.set(delta.node || this.nodeId, delta.negativeCounterValue);
            applied = true;
          }
        } else if (delta.amount !== undefined) {
          this.decrement(delta.amount);
          applied = true;
        }
        break;
        
      case 'MERGE':
        applied = this.merge(delta.mergedFrom);
        break;
        
      case 'COUNTER_UPDATE':
        // Handle internal counter updates
        if (delta.counterType === 'POSITIVE') {
          applied = this.positiveCounter.applyDelta(delta.originalDelta);
        } else if (delta.counterType === 'NEGATIVE') {
          applied = this.negativeCounter.applyDelta(delta.originalDelta);
        }
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
        newValue: this.value(),
        timestamp: Date.now()
      });
    }
    
    return applied;
  }

  // Compare with another PN-Counter
  compare(otherState) {
    // Compare the final values
    const thisValue = this.value();
    const otherValue = typeof otherState === 'number' ? otherState : otherState.value();
    
    if (thisValue > otherValue) return 'GREATER_THAN';
    if (thisValue < otherValue) return 'LESS_THAN';
    return 'EQUAL';
  }

  // Clone current state
  clone() {
    const newCounter = new PNCounter(this.nodeId, this.replicationGroup);
    newCounter.positiveCounter = this.positiveCounter.clone();
    newCounter.negativeCounter = this.negativeCounter.clone();
    newCounter.vectorClock = this.vectorClock.clone();
    return newCounter;
  }

  // Get serializable state
  getState() {
    return {
      type: 'PN_COUNTER',
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      positiveCounter: this.positiveCounter.getState(),
      negativeCounter: this.negativeCounter.getState(),
      vectorClock: this.vectorClock.toJSON(),
      value: this.value(),
      breakdown: this.getValueBreakdown()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const counter = new PNCounter(state.nodeId, state.replicationGroup);
    
    if (state.positiveCounter) {
      counter.positiveCounter = GCounter.fromState(state.positiveCounter);
    }
    
    if (state.negativeCounter) {
      counter.negativeCounter = GCounter.fromState(state.negativeCounter);
    }
    
    if (state.vectorClock) {
      counter.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return counter;
  }

  // Reset to initial state
  reset() {
    this.positiveCounter.reset();
    this.negativeCounter.reset();
    this.vectorClock = new VectorClock(this.nodeId);
    
    this.notifyUpdate({
      type: 'RESET',
      newValue: this.value(),
      timestamp: Date.now()
    });
  }

  // Conditional operations
  incrementIfPositive(amount = 1) {
    if (this.value() >= 0) {
      return this.increment(amount);
    }
    return this.value();
  }

  decrementIfPositive(amount = 1) {
    if (this.value() >= 0) {
      return this.decrement(amount);
    }
    return this.value();
  }

  // Set to specific value (by adjusting counters)
  setTo(targetValue) {
    const currentValue = this.value();
    const difference = targetValue - currentValue;
    
    if (difference > 0) {
      return this.increment(difference);
    } else if (difference < 0) {
      return this.decrement(-difference);
    }
    
    return currentValue;
  }

  // Event handling
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate(delta) {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  // Utility methods
  isZero() {
    return this.value() === 0;
  }

  isPositive() {
    return this.value() > 0;
  }

  isNegative() {
    return this.value() < 0;
  }

  getAbsoluteValue() {
    return Math.abs(this.value());
  }

  // Statistics
  getStats() {
    const breakdown = this.getValueBreakdown();
    const nodes = Array.from(this.replicationGroup);
    
    return {
      nodeId: this.nodeId,
      replicationGroupSize: this.replicationGroup.size,
      value: this.value(),
      positiveValue: this.getPositiveValue(),
      negativeValue: this.getNegativeValue(),
      breakdown: breakdown,
      activeNodes: nodes.filter(node => 
        breakdown[node].positive > 0 || breakdown[node].negative > 0
      ),
      vectorClockSize: this.vectorClock.clock.size
    };
  }

  // Debug information
  toString() {
    return `PNCounter{value: ${this.value()}, positive: ${this.getPositiveValue()}, negative: ${this.getNegativeValue()}}`;
  }

  // Validation
  isValid() {
    return this.positiveCounter.isValid() && this.negativeCounter.isValid();
  }

  // Advanced operations
  addAndGet(amount) {
    if (amount >= 0) {
      return this.increment(amount);
    } else {
      return this.decrement(-amount);
    }
  }

  getAndAdd(amount) {
    const oldValue = this.value();
    this.addAndGet(amount);
    return oldValue;
  }

  compareAndSet(expectedValue, newValue) {
    if (this.value() === expectedValue) {
      this.setTo(newValue);
      return true;
    }
    return false;
  }
}

module.exports = PNCounter;