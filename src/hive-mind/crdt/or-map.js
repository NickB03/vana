/**
 * OR-Map (Observe-Remove Map) CRDT Implementation
 * A map where keys can be added and removed, with configurable value types
 */

const ORSet = require('./or-set');
const LWWRegister = require('./lww-register');
const GCounter = require('./g-counter');
const VectorClock = require('./vector-clock');

class ORMap {
  constructor(nodeId, replicationGroup, valueType = 'LWW_REGISTER', initialState = null) {
    this.nodeId = nodeId;
    this.replicationGroup = new Set(replicationGroup);
    this.valueType = valueType;
    this.keySet = new ORSet(nodeId); // Track which keys exist
    this.values = new Map(); // key -> CRDT value
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    if (initialState) {
      this.merge(initialState);
    }
    
    // Subscribe to key set updates
    this.keySet.onUpdate((delta) => {
      this.handleKeySetUpdate(delta);
    });
  }

  // Handle key set updates
  handleKeySetUpdate(delta) {
    this.vectorClock.increment();
    
    const mapDelta = {
      type: 'KEY_SET_UPDATE',
      originalDelta: delta,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(mapDelta);
  }

  // Set key-value pair
  set(key, value) {
    // Add key to key set
    this.keySet.add(key);
    
    // Create or update value CRDT
    let valueCRDT = this.values.get(key);
    
    if (!valueCRDT) {
      valueCRDT = this.createValueCRDT();
      this.values.set(key, valueCRDT);
      
      // Subscribe to value updates
      valueCRDT.onUpdate((delta) => {
        this.handleValueUpdate(key, delta);
      });
    }
    
    // Set value in the value CRDT
    if (valueCRDT.set) {
      valueCRDT.set(value);
    } else if (valueCRDT.add) {
      valueCRDT.add(value);
    } else {
      // Fallback for simple value types
      this.values.set(key, value);
    }
    
    this.vectorClock.increment();
    
    const delta = {
      type: 'SET',
      key: key,
      value: value,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return value;
  }

  // Get value for key
  get(key) {
    if (!this.has(key)) {
      return undefined;
    }
    
    const valueCRDT = this.values.get(key);
    
    if (!valueCRDT) {
      return undefined;
    }
    
    // Extract value based on CRDT type
    if (valueCRDT.get) {
      return valueCRDT.get();
    } else if (valueCRDT.value) {
      return valueCRDT.value();
    } else if (valueCRDT.values) {
      return valueCRDT.values();
    } else if (valueCRDT.toArray) {
      return valueCRDT.toArray();
    } else {
      return valueCRDT;
    }
  }

  // Check if key exists
  has(key) {
    return this.keySet.has(key);
  }

  // Remove key (tombstone it in key set)
  delete(key) {
    if (!this.has(key)) {
      return false;
    }
    
    const removed = this.keySet.remove(key);
    this.vectorClock.increment();
    
    if (removed) {
      const delta = {
        type: 'DELETE',
        key: key,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return removed;
  }

  // Get all keys
  keys() {
    return Array.from(this.keySet.values());
  }

  // Get all values
  values() {
    const result = [];
    
    for (const key of this.keys()) {
      result.push(this.get(key));
    }
    
    return result;
  }

  // Get all key-value pairs
  entries() {
    const result = [];
    
    for (const key of this.keys()) {
      result.push([key, this.get(key)]);
    }
    
    return result;
  }

  // Get size of map
  size() {
    return this.keySet.size();
  }

  // Check if map is empty
  isEmpty() {
    return this.size() === 0;
  }

  // Clear all entries
  clear() {
    let cleared = 0;
    
    for (const key of this.keys()) {
      if (this.delete(key)) {
        cleared++;
      }
    }
    
    if (cleared > 0) {
      const delta = {
        type: 'CLEAR',
        clearedCount: cleared,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return cleared;
  }

  // Handle value updates
  handleValueUpdate(key, delta) {
    this.vectorClock.increment();
    
    const mapDelta = {
      type: 'VALUE_UPDATE',
      key: key,
      valueDelta: delta,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(mapDelta);
  }

  // Create value CRDT based on configured type
  createValueCRDT() {
    switch (this.valueType.toUpperCase()) {
      case 'LWW_REGISTER':
        return new LWWRegister(this.nodeId);
      case 'G_COUNTER':
        return new GCounter(this.nodeId, this.replicationGroup);
      case 'OR_SET':
        return new ORSet(this.nodeId);
      case 'OR_MAP':
        return new ORMap(this.nodeId, this.replicationGroup, 'LWW_REGISTER');
      default:
        // For unknown types, return a simple LWW register
        return new LWWRegister(this.nodeId);
    }
  }

  // Merge with another OR-Map
  merge(otherMap) {
    let changed = false;
    
    // Handle different input formats
    const otherKeySet = otherMap.keySet || otherMap.keys;
    const otherValues = otherMap.values || new Map();
    
    // Merge key sets
    if (otherKeySet) {
      const keySetChanged = this.keySet.merge(otherKeySet);
      if (keySetChanged) {
        changed = true;
      }
    }
    
    // Merge values
    const valuesMap = otherValues instanceof Map ? 
      otherValues : 
      new Map(Object.entries(otherValues || {}));
    
    for (const [key, otherValue] of valuesMap) {
      if (this.keySet.has(key)) {
        let localValue = this.values.get(key);
        
        if (!localValue) {
          localValue = this.createValueCRDT();
          this.values.set(key, localValue);
          
          // Subscribe to value updates
          localValue.onUpdate((delta) => {
            this.handleValueUpdate(key, delta);
          });
        }
        
        // Merge values
        if (localValue.merge) {
          const valueChanged = localValue.merge(otherValue);
          if (valueChanged) {
            changed = true;
          }
        } else {
          // Simple value replacement for non-CRDT values
          if (localValue !== otherValue) {
            this.values.set(key, otherValue);
            changed = true;
          }
        }
      }
    }
    
    // Merge vector clocks if present
    if (otherMap.vectorClock) {
      const otherClock = otherMap.vectorClock instanceof VectorClock ? 
        otherMap.vectorClock : 
        VectorClock.fromJSON(otherMap.vectorClock);
      this.vectorClock.merge(otherClock);
    }
    
    if (changed) {
      const delta = {
        type: 'MERGE',
        mergedFrom: otherMap,
        newSize: this.size(),
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
      case 'SET':
        if (delta.key !== undefined && delta.value !== undefined) {
          this.set(delta.key, delta.value);
          applied = true;
        }
        break;
        
      case 'DELETE':
        if (delta.key !== undefined) {
          applied = this.delete(delta.key);
        }
        break;
        
      case 'CLEAR':
        applied = this.clear() > 0;
        break;
        
      case 'KEY_SET_UPDATE':
        if (delta.originalDelta) {
          applied = this.keySet.applyDelta(delta.originalDelta);
        }
        break;
        
      case 'VALUE_UPDATE':
        if (delta.key && delta.valueDelta) {
          const valueCRDT = this.values.get(delta.key);
          if (valueCRDT && valueCRDT.applyDelta) {
            applied = valueCRDT.applyDelta(delta.valueDelta);
          }
        }
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
        newSize: this.size(),
        timestamp: Date.now()
      });
    }
    
    return applied;
  }

  // Clone current state
  clone() {
    const newMap = new ORMap(this.nodeId, this.replicationGroup, this.valueType);
    
    // Clone key set
    newMap.keySet = this.keySet.clone();
    
    // Clone values
    for (const [key, value] of this.values) {
      if (value.clone) {
        newMap.values.set(key, value.clone());
      } else {
        newMap.values.set(key, value);
      }
    }
    
    newMap.vectorClock = this.vectorClock.clone();
    
    return newMap;
  }

  // Get serializable state
  getState() {
    const valueStates = {};
    
    for (const [key, value] of this.values) {
      if (value.getState) {
        valueStates[key] = value.getState();
      } else {
        valueStates[key] = value;
      }
    }
    
    return {
      type: 'OR_MAP',
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      valueType: this.valueType,
      keySet: this.keySet.getState(),
      values: valueStates,
      vectorClock: this.vectorClock.toJSON(),
      size: this.size(),
      entries: this.entries()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const orMap = new ORMap(
      state.nodeId,
      state.replicationGroup,
      state.valueType
    );
    
    // Restore key set
    if (state.keySet) {
      orMap.keySet = ORSet.fromState(state.keySet);
    }
    
    // Restore values
    for (const [key, valueState] of Object.entries(state.values || {})) {
      if (typeof valueState === 'object' && valueState.type) {
        // Restore CRDT value
        switch (valueState.type) {
          case 'LWW_REGISTER':
            orMap.values.set(key, LWWRegister.fromState(valueState));
            break;
          case 'G_COUNTER':
            orMap.values.set(key, GCounter.fromState(valueState));
            break;
          case 'OR_SET':
            orMap.values.set(key, ORSet.fromState(valueState));
            break;
          default:
            orMap.values.set(key, valueState);
        }
      } else {
        // Simple value
        orMap.values.set(key, valueState);
      }
    }
    
    if (state.vectorClock) {
      orMap.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return orMap;
  }

  // Map-like operations
  forEach(callback) {
    for (const [key, value] of this.entries()) {
      callback(value, key, this);
    }
  }

  // Update value with function
  update(key, updateFn, defaultValue = null) {
    const currentValue = this.has(key) ? this.get(key) : defaultValue;
    const newValue = updateFn(currentValue);
    this.set(key, newValue);
    return newValue;
  }

  // Compute if absent
  computeIfAbsent(key, computeFn) {
    if (this.has(key)) {
      return this.get(key);
    }
    
    const newValue = computeFn(key);
    this.set(key, newValue);
    return newValue;
  }

  // Replace value only if key exists
  replace(key, value) {
    if (this.has(key)) {
      return this.set(key, value);
    }
    return undefined;
  }

  // Replace value only if current value matches expected
  replaceIfMatch(key, expectedValue, newValue) {
    if (this.has(key) && this.get(key) === expectedValue) {
      return this.set(key, newValue);
    }
    return false;
  }

  // Get value with default
  getOrDefault(key, defaultValue) {
    return this.has(key) ? this.get(key) : defaultValue;
  }

  // Event handling
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate(delta) {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  // Debug information
  toString() {
    const entries = this.entries()
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    return `ORMap{${entries}}`;
  }

  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      valueType: this.valueType,
      replicationGroup: Array.from(this.replicationGroup),
      keySet: this.keySet.getDebugInfo(),
      values: Object.fromEntries(
        Array.from(this.values.entries()).map(([k, v]) => [
          k,
          v.getDebugInfo ? v.getDebugInfo() : v
        ])
      ),
      size: this.size(),
      vectorClock: this.vectorClock.toString()
    };
  }

  // Statistics
  getStats() {
    const valueTypes = {};
    let crdtValues = 0;
    let simpleValues = 0;
    
    for (const value of this.values.values()) {
      if (value.constructor && value.constructor.name) {
        const typeName = value.constructor.name;
        valueTypes[typeName] = (valueTypes[typeName] || 0) + 1;
        if (typeName !== 'Object' && typeName !== 'String' && typeName !== 'Number') {
          crdtValues++;
        } else {
          simpleValues++;
        }
      } else {
        simpleValues++;
      }
    }
    
    return {
      nodeId: this.nodeId,
      size: this.size(),
      valueType: this.valueType,
      keySetSize: this.keySet.size(),
      valueTypes: valueTypes,
      crdtValues: crdtValues,
      simpleValues: simpleValues,
      vectorClockSize: this.vectorClock.clock.size
    };
  }

  // Validation
  isValid() {
    // Check that all keys in values are also in key set
    for (const key of this.values.keys()) {
      if (!this.keySet.has(key)) {
        return false;
      }
    }
    
    // Validate key set
    if (!this.keySet.isValid()) {
      return false;
    }
    
    // Validate value CRDTs
    for (const value of this.values.values()) {
      if (value.isValid && !value.isValid()) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = ORMap;