/**
 * OR-Set (Observe-Remove Set) CRDT Implementation
 * Supports add and remove operations with unique tags for conflict resolution
 */

const VectorClock = require('./vector-clock');

class ORSet {
  constructor(nodeId, initialState = null) {
    this.nodeId = nodeId;
    this.elements = new Map(); // element -> Set of unique tags
    this.tombstones = new Set(); // removed element tags
    this.tagCounter = 0;
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    if (initialState) {
      this.merge(initialState);
    }
  }

  // Add element to set
  add(element) {
    const tag = this.generateUniqueTag();
    
    if (!this.elements.has(element)) {
      this.elements.set(element, new Set());
    }
    
    this.elements.get(element).add(tag);
    this.vectorClock.increment();
    
    const delta = {
      type: 'ADD',
      element: element,
      tag: tag,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return tag;
  }

  // Remove element from set
  remove(element) {
    if (!this.elements.has(element)) {
      return false; // Element not present
    }
    
    const tags = this.elements.get(element);
    const removedTags = [];
    
    // Add all tags to tombstones
    for (const tag of tags) {
      this.tombstones.add(tag);
      removedTags.push(tag);
    }
    
    this.vectorClock.increment();
    
    const delta = {
      type: 'REMOVE',
      element: element,
      removedTags: removedTags,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return true;
  }

  // Remove specific tag (for precise removal)
  removeTag(element, tag) {
    if (!this.elements.has(element)) {
      return false;
    }
    
    const tags = this.elements.get(element);
    if (!tags.has(tag)) {
      return false;
    }
    
    this.tombstones.add(tag);
    this.vectorClock.increment();
    
    const delta = {
      type: 'REMOVE_TAG',
      element: element,
      tag: tag,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return true;
  }

  // Check if element is in set
  has(element) {
    if (!this.elements.has(element)) {
      return false;
    }
    
    const tags = this.elements.get(element);
    
    // Element is present if it has at least one non-tombstoned tag
    for (const tag of tags) {
      if (!this.tombstones.has(tag)) {
        return true;
      }
    }
    
    return false;
  }

  // Get all elements in set
  values() {
    const result = new Set();
    
    for (const [element, tags] of this.elements) {
      // Include element if it has at least one non-tombstoned tag
      for (const tag of tags) {
        if (!this.tombstones.has(tag)) {
          result.add(element);
          break;
        }
      }
    }
    
    return result;
  }

  // Get all elements as array
  toArray() {
    return Array.from(this.values());
  }

  // Get size of set
  size() {
    return this.values().size;
  }

  // Check if set is empty
  isEmpty() {
    return this.size() === 0;
  }

  // Merge with another OR-Set
  merge(otherState) {
    let changed = false;
    const otherElements = otherState.elements || otherState;
    const otherTombstones = otherState.tombstones || new Set();
    
    // Handle different input formats
    const elementsMap = otherElements instanceof Map ? 
      otherElements : 
      new Map(Object.entries(otherElements).map(([k, v]) => [k, new Set(v)]));
    
    const tombstonesSet = otherTombstones instanceof Set ?
      otherTombstones :
      new Set(Array.isArray(otherTombstones) ? otherTombstones : Object.keys(otherTombstones));
    
    // Merge elements and their tags
    for (const [element, otherTags] of elementsMap) {
      if (!this.elements.has(element)) {
        this.elements.set(element, new Set());
      }
      
      const currentTags = this.elements.get(element);
      
      for (const tag of otherTags) {
        if (!currentTags.has(tag)) {
          currentTags.add(tag);
          changed = true;
        }
      }
    }
    
    // Merge tombstones
    for (const tombstone of tombstonesSet) {
      if (!this.tombstones.has(tombstone)) {
        this.tombstones.add(tombstone);
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
    let applied = false;
    
    switch (delta.type) {
      case 'ADD':
        if (!this.elements.has(delta.element)) {
          this.elements.set(delta.element, new Set());
        }
        
        if (!this.elements.get(delta.element).has(delta.tag)) {
          this.elements.get(delta.element).add(delta.tag);
          applied = true;
        }
        break;
        
      case 'REMOVE':
        for (const tag of delta.removedTags) {
          if (!this.tombstones.has(tag)) {
            this.tombstones.add(tag);
            applied = true;
          }
        }
        break;
        
      case 'REMOVE_TAG':
        if (!this.tombstones.has(delta.tag)) {
          this.tombstones.add(delta.tag);
          applied = true;
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
        timestamp: Date.now()
      });
    }
    
    return applied;
  }

  // Generate unique tag for elements
  generateUniqueTag() {
    return `${this.nodeId}-${Date.now()}-${++this.tagCounter}`;
  }

  // Get all tags for an element
  getTags(element) {
    return this.elements.get(element) || new Set();
  }

  // Get live tags for an element (non-tombstoned)
  getLiveTags(element) {
    const allTags = this.getTags(element);
    const liveTags = new Set();
    
    for (const tag of allTags) {
      if (!this.tombstones.has(tag)) {
        liveTags.add(tag);
      }
    }
    
    return liveTags;
  }

  // Clone current state
  clone() {
    const newSet = new ORSet(this.nodeId);
    
    // Deep copy elements
    for (const [element, tags] of this.elements) {
      newSet.elements.set(element, new Set(tags));
    }
    
    // Copy tombstones
    newSet.tombstones = new Set(this.tombstones);
    newSet.tagCounter = this.tagCounter;
    newSet.vectorClock = this.vectorClock.clone();
    
    return newSet;
  }

  // Get serializable state
  getState() {
    return {
      type: 'OR_SET',
      nodeId: this.nodeId,
      elements: Object.fromEntries(
        Array.from(this.elements.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      tombstones: Array.from(this.tombstones),
      tagCounter: this.tagCounter,
      vectorClock: this.vectorClock.toJSON(),
      values: this.toArray()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const orSet = new ORSet(state.nodeId);
    
    // Restore elements
    for (const [element, tags] of Object.entries(state.elements)) {
      orSet.elements.set(element, new Set(tags));
    }
    
    // Restore tombstones
    orSet.tombstones = new Set(state.tombstones);
    orSet.tagCounter = state.tagCounter || 0;
    
    if (state.vectorClock) {
      orSet.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return orSet;
  }

  // Set operations
  union(otherSet) {
    const result = this.clone();
    
    for (const element of otherSet.values()) {
      result.add(element);
    }
    
    return result;
  }

  intersection(otherSet) {
    const result = new ORSet(this.nodeId);
    const otherValues = otherSet.values();
    
    for (const element of this.values()) {
      if (otherValues.has(element)) {
        result.add(element);
      }
    }
    
    return result;
  }

  difference(otherSet) {
    const result = new ORSet(this.nodeId);
    const otherValues = otherSet.values();
    
    for (const element of this.values()) {
      if (!otherValues.has(element)) {
        result.add(element);
      }
    }
    
    return result;
  }

  // Clear all elements (add tombstones for all tags)
  clear() {
    let removed = 0;
    
    for (const [element, tags] of this.elements) {
      for (const tag of tags) {
        if (!this.tombstones.has(tag)) {
          this.tombstones.add(tag);
          removed++;
        }
      }
    }
    
    if (removed > 0) {
      this.vectorClock.increment();
      
      this.notifyUpdate({
        type: 'CLEAR',
        removedCount: removed,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      });
    }
    
    return removed;
  }

  // Event handling
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate(delta) {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  // Utility methods
  forEach(callback) {
    for (const element of this.values()) {
      callback(element);
    }
  }

  map(callback) {
    return Array.from(this.values()).map(callback);
  }

  filter(predicate) {
    const result = new ORSet(this.nodeId);
    
    for (const element of this.values()) {
      if (predicate(element)) {
        result.add(element);
      }
    }
    
    return result;
  }

  // Debug information
  toString() {
    const elements = Array.from(this.values()).join(', ');
    return `ORSet{${elements}}`;
  }

  // Get detailed debug info
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      elements: Object.fromEntries(
        Array.from(this.elements.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      tombstones: Array.from(this.tombstones),
      liveElements: this.toArray(),
      size: this.size(),
      tagCounter: this.tagCounter,
      vectorClock: this.vectorClock.toString()
    };
  }

  // Validation
  isValid() {
    // Check that all tombstoned tags exist in some element
    const allTags = new Set();
    for (const tags of this.elements.values()) {
      for (const tag of tags) {
        allTags.add(tag);
      }
    }
    
    for (const tombstone of this.tombstones) {
      if (!allTags.has(tombstone)) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = ORSet;