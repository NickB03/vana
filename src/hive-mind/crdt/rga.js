/**
 * RGA (Replicated Growable Array) CRDT Implementation
 * Maintains a sequence of elements with causal ordering
 */

const VectorClock = require('./vector-clock');

class RGA {
  constructor(nodeId, initialSequence = []) {
    this.nodeId = nodeId;
    this.sequence = [];
    this.tombstones = new Set();
    this.vertexCounter = 0;
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    
    // Initialize with sequence
    for (let i = 0; i < initialSequence.length; i++) {
      this.insert(i, initialSequence[i]);
    }
  }

  // Insert element at position
  insert(position, element) {
    const vertex = this.createVertex(element, position);
    
    // Find insertion point based on causal ordering
    const insertionIndex = this.findInsertionIndex(vertex, position);
    
    this.sequence.splice(insertionIndex, 0, vertex);
    this.vectorClock.increment();
    
    const delta = {
      type: 'INSERT',
      position: insertionIndex,
      visiblePosition: position,
      element: element,
      vertex: vertex,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return vertex.id;
  }

  // Remove element at visible position
  remove(position) {
    if (position < 0 || position >= this.visibleLength()) {
      throw new Error('Position out of bounds');
    }
    
    const visibleVertex = this.getVisibleVertex(position);
    if (visibleVertex) {
      this.tombstones.add(visibleVertex.id);
      this.vectorClock.increment();
      
      const delta = {
        type: 'REMOVE',
        position: position,
        vertex: visibleVertex,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
      
      return true;
    }
    
    return false;
  }

  // Remove element by vertex ID
  removeVertex(vertexId) {
    if (this.tombstones.has(vertexId)) {
      return false; // Already removed
    }
    
    const vertex = this.sequence.find(v => v.id === vertexId);
    if (!vertex) {
      return false; // Vertex not found
    }
    
    this.tombstones.add(vertexId);
    this.vectorClock.increment();
    
    const visiblePosition = this.getVisiblePositionOfVertex(vertexId);
    
    const delta = {
      type: 'REMOVE_VERTEX',
      vertexId: vertexId,
      vertex: vertex,
      visiblePosition: visiblePosition,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    this.notifyUpdate(delta);
    
    return true;
  }

  // Get visible elements (non-tombstoned)
  toArray() {
    return this.sequence
      .filter(vertex => !this.tombstones.has(vertex.id))
      .map(vertex => vertex.element);
  }

  // Get element at visible position
  get(position) {
    if (position < 0 || position >= this.visibleLength()) {
      return undefined;
    }
    
    const vertex = this.getVisibleVertex(position);
    return vertex ? vertex.element : undefined;
  }

  // Set element at visible position (remove old, insert new)
  set(position, element) {
    if (position < 0 || position > this.visibleLength()) {
      throw new Error('Position out of bounds');
    }
    
    if (position === this.visibleLength()) {
      // Append
      return this.insert(position, element);
    } else {
      // Replace
      const oldElement = this.get(position);
      this.remove(position);
      const vertexId = this.insert(position, element);
      
      const delta = {
        type: 'SET',
        position: position,
        oldElement: oldElement,
        newElement: element,
        vertexId: vertexId,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
      
      return vertexId;
    }
  }

  // Get visible length
  visibleLength() {
    return this.sequence.filter(vertex => !this.tombstones.has(vertex.id)).length;
  }

  // Get total length (including tombstoned)
  totalLength() {
    return this.sequence.length;
  }

  // Check if array is empty
  isEmpty() {
    return this.visibleLength() === 0;
  }

  // Merge with another RGA
  merge(otherRGA) {
    let changed = false;
    
    // Handle different input formats
    const otherSequence = otherRGA.sequence || otherRGA;
    const otherTombstones = otherRGA.tombstones || new Set();
    
    // Merge sequences
    const mergedSequence = this.mergeSequences(this.sequence, otherSequence);
    if (mergedSequence.length !== this.sequence.length || 
        !this.sequencesEqual(mergedSequence, this.sequence)) {
      this.sequence = mergedSequence;
      changed = true;
    }
    
    // Merge tombstones
    const tombstonesSet = otherTombstones instanceof Set ? 
      otherTombstones : 
      new Set(Array.isArray(otherTombstones) ? otherTombstones : Object.keys(otherTombstones));
    
    for (const tombstone of tombstonesSet) {
      if (!this.tombstones.has(tombstone)) {
        this.tombstones.add(tombstone);
        changed = true;
      }
    }
    
    // Merge vector clocks if present
    if (otherRGA.vectorClock) {
      const otherClock = otherRGA.vectorClock instanceof VectorClock ? 
        otherRGA.vectorClock : 
        VectorClock.fromJSON(otherRGA.vectorClock);
      this.vectorClock.merge(otherClock);
    }
    
    if (changed) {
      const delta = {
        type: 'MERGE',
        mergedFrom: otherRGA,
        newLength: this.visibleLength(),
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
      case 'INSERT':
        if (delta.vertex && !this.sequence.find(v => v.id === delta.vertex.id)) {
          const insertIndex = this.findInsertionIndex(delta.vertex, delta.visiblePosition);
          this.sequence.splice(insertIndex, 0, delta.vertex);
          applied = true;
        }
        break;
        
      case 'REMOVE':
      case 'REMOVE_VERTEX':
        const vertexId = delta.vertexId || (delta.vertex && delta.vertex.id);
        if (vertexId && !this.tombstones.has(vertexId)) {
          this.tombstones.add(vertexId);
          applied = true;
        }
        break;
        
      case 'SET':
        // Set operation is a combination of remove and insert
        if (delta.oldVertexId) {
          this.tombstones.add(delta.oldVertexId);
        }
        if (delta.vertex && !this.sequence.find(v => v.id === delta.vertex.id)) {
          const insertIndex = this.findInsertionIndex(delta.vertex, delta.position);
          this.sequence.splice(insertIndex, 0, delta.vertex);
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
        newLength: this.visibleLength(),
        timestamp: Date.now()
      });
    }
    
    return applied;
  }

  // Create vertex for element
  createVertex(element, position) {
    const leftVertex = position > 0 ? this.getVisibleVertex(position - 1) : null;
    const rightVertex = position < this.visibleLength() ? this.getVisibleVertex(position) : null;
    
    return {
      id: `${this.nodeId}-${++this.vertexCounter}-${Date.now()}`,
      element: element,
      leftOrigin: leftVertex ? leftVertex.id : null,
      rightOrigin: rightVertex ? rightVertex.id : null,
      timestamp: Date.now(),
      nodeId: this.nodeId,
      vectorClock: this.vectorClock.toJSON()
    };
  }

  // Find insertion index for vertex based on causal ordering
  findInsertionIndex(vertex, targetPosition) {
    // Simple approach: find position based on left origin
    if (!vertex.leftOrigin) {
      return 0; // Insert at beginning
    }
    
    // Find left origin in sequence
    let leftOriginIndex = -1;
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.sequence[i].id === vertex.leftOrigin) {
        leftOriginIndex = i;
        break;
      }
    }
    
    if (leftOriginIndex === -1) {
      // Left origin not found, insert based on timestamp
      return this.findInsertionByTimestamp(vertex);
    }
    
    // Insert after left origin, considering right origin if present
    let insertIndex = leftOriginIndex + 1;
    
    if (vertex.rightOrigin) {
      // Find right origin and ensure we don't go past it
      for (let i = insertIndex; i < this.sequence.length; i++) {
        if (this.sequence[i].id === vertex.rightOrigin) {
          insertIndex = i;
          break;
        }
      }
    }
    
    return insertIndex;
  }

  // Find insertion index by timestamp (fallback method)
  findInsertionByTimestamp(vertex) {
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.sequence[i].timestamp > vertex.timestamp ||
          (this.sequence[i].timestamp === vertex.timestamp && 
           this.sequence[i].nodeId > vertex.nodeId)) {
        return i;
      }
    }
    return this.sequence.length;
  }

  // Get visible vertex at position
  getVisibleVertex(position) {
    let visibleCount = 0;
    
    for (const vertex of this.sequence) {
      if (!this.tombstones.has(vertex.id)) {
        if (visibleCount === position) {
          return vertex;
        }
        visibleCount++;
      }
    }
    
    return null;
  }

  // Get visible position of vertex
  getVisiblePositionOfVertex(vertexId) {
    let visiblePosition = 0;
    
    for (const vertex of this.sequence) {
      if (vertex.id === vertexId) {
        return this.tombstones.has(vertexId) ? -1 : visiblePosition;
      }
      
      if (!this.tombstones.has(vertex.id)) {
        visiblePosition++;
      }
    }
    
    return -1; // Not found
  }

  // Merge two sequences maintaining causal order
  mergeSequences(seq1, seq2) {
    const merged = [...seq1];
    
    for (const vertex of seq2) {
      if (!merged.find(v => v.id === vertex.id)) {
        const insertIndex = this.findInsertionIndex(vertex, 0);
        merged.splice(insertIndex, 0, vertex);
      }
    }
    
    // Sort by causal order and timestamp
    return merged.sort((a, b) => {
      // Try to use causal ordering first
      if (a.leftOrigin === b.id) return 1;  // a comes after b
      if (b.leftOrigin === a.id) return -1; // b comes after a
      
      // Fall back to timestamp ordering
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      
      // Final tiebreaker: node ID
      return a.nodeId.localeCompare(b.nodeId);
    });
  }

  // Check if two sequences are equal
  sequencesEqual(seq1, seq2) {
    if (seq1.length !== seq2.length) return false;
    
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i].id !== seq2[i].id) return false;
    }
    
    return true;
  }

  // Clone current state
  clone() {
    const newRGA = new RGA(this.nodeId);
    newRGA.sequence = this.sequence.map(v => ({ ...v }));
    newRGA.tombstones = new Set(this.tombstones);
    newRGA.vertexCounter = this.vertexCounter;
    newRGA.vectorClock = this.vectorClock.clone();
    return newRGA;
  }

  // Get serializable state
  getState() {
    return {
      type: 'RGA',
      nodeId: this.nodeId,
      sequence: this.sequence,
      tombstones: Array.from(this.tombstones),
      vertexCounter: this.vertexCounter,
      vectorClock: this.vectorClock.toJSON(),
      visibleArray: this.toArray(),
      visibleLength: this.visibleLength(),
      totalLength: this.totalLength()
    };
  }

  // Create from serialized state
  static fromState(state) {
    const rga = new RGA(state.nodeId);
    rga.sequence = state.sequence || [];
    rga.tombstones = new Set(state.tombstones || []);
    rga.vertexCounter = state.vertexCounter || 0;
    
    if (state.vectorClock) {
      rga.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    return rga;
  }

  // Array-like operations
  push(element) {
    return this.insert(this.visibleLength(), element);
  }

  pop() {
    if (this.isEmpty()) return undefined;
    
    const lastElement = this.get(this.visibleLength() - 1);
    this.remove(this.visibleLength() - 1);
    return lastElement;
  }

  shift() {
    if (this.isEmpty()) return undefined;
    
    const firstElement = this.get(0);
    this.remove(0);
    return firstElement;
  }

  unshift(element) {
    return this.insert(0, element);
  }

  splice(start, deleteCount = 0, ...items) {
    const removed = [];
    
    // Remove elements
    for (let i = 0; i < deleteCount && start < this.visibleLength(); i++) {
      removed.push(this.get(start));
      this.remove(start);
    }
    
    // Insert new elements
    for (let i = 0; i < items.length; i++) {
      this.insert(start + i, items[i]);
    }
    
    return removed;
  }

  // Utility methods
  indexOf(element) {
    const array = this.toArray();
    return array.indexOf(element);
  }

  includes(element) {
    return this.indexOf(element) !== -1;
  }

  forEach(callback) {
    const array = this.toArray();
    array.forEach(callback);
  }

  map(callback) {
    return this.toArray().map(callback);
  }

  filter(predicate) {
    const result = new RGA(this.nodeId);
    this.toArray().forEach((element, index) => {
      if (predicate(element, index)) {
        result.push(element);
      }
    });
    return result;
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
    return `RGA[${this.toArray().join(', ')}]`;
  }

  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      sequence: this.sequence,
      tombstones: Array.from(this.tombstones),
      visibleArray: this.toArray(),
      visibleLength: this.visibleLength(),
      totalLength: this.totalLength(),
      vertexCounter: this.vertexCounter,
      vectorClock: this.vectorClock.toString()
    };
  }

  // Validation
  isValid() {
    // Check that all tombstoned vertices exist in sequence
    for (const tombstone of this.tombstones) {
      if (!this.sequence.find(v => v.id === tombstone)) {
        return false;
      }
    }
    
    // Check that all vertex IDs are unique
    const ids = new Set();
    for (const vertex of this.sequence) {
      if (ids.has(vertex.id)) {
        return false;
      }
      ids.add(vertex.id);
    }
    
    return true;
  }
}

module.exports = RGA;