/**
 * CRDT Synchronizer
 * 
 * Implements Conflict-free Replicated Data Types for eventually consistent
 * state synchronization across distributed agents. Supports both state-based
 * and operation-based CRDTs with automatic conflict resolution.
 */

import { EventEmitter } from 'events';

export interface VectorClock {
  [nodeId: string]: number;
}

export interface CRDTOperation {
  type: string;
  nodeId: string;
  timestamp: number;
  vectorClock: VectorClock;
  data: any;
  operationId: string;
}

export interface CRDTState {
  data: any;
  vectorClock: VectorClock;
  metadata: {
    nodeId: string;
    lastModified: number;
    operations: CRDTOperation[];
  };
}

export interface SynchronizationResult {
  success: boolean;
  conflictsResolved: number;
  operationsApplied: number;
  stateMerged: boolean;
  error?: string;
}

export interface GossipMetadata {
  nodeId: string;
  timestamp: number;
  stateHash: string;
  operationCount: number;
  lastSyncTime: number;
}

// State-based CRDT implementations

export class GCounter {
  private counts: Map<string, number> = new Map();
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  increment(amount: number = 1): void {
    const current = this.counts.get(this.nodeId) || 0;
    this.counts.set(this.nodeId, current + amount);
  }

  value(): number {
    return Array.from(this.counts.values()).reduce((a, b) => a + b, 0);
  }

  merge(other: GCounter): GCounter {
    const merged = new GCounter(this.nodeId);
    
    // Union of all nodes
    const allNodes = new Set([...this.counts.keys(), ...other.counts.keys()]);
    
    allNodes.forEach(nodeId => {
      const thisCount = this.counts.get(nodeId) || 0;
      const otherCount = other.counts.get(nodeId) || 0;
      merged.counts.set(nodeId, Math.max(thisCount, otherCount));
    });

    return merged;
  }

  compare(other: GCounter): 'less' | 'greater' | 'equal' | 'concurrent' {
    const allNodes = new Set([...this.counts.keys(), ...other.counts.keys()]);
    
    let thisGreater = false;
    let otherGreater = false;

    for (const nodeId of allNodes) {
      const thisCount = this.counts.get(nodeId) || 0;
      const otherCount = other.counts.get(nodeId) || 0;
      
      if (thisCount > otherCount) thisGreater = true;
      if (otherCount > thisCount) otherGreater = true;
    }

    if (thisGreater && !otherGreater) return 'greater';
    if (otherGreater && !thisGreater) return 'less';
    if (!thisGreater && !otherGreater) return 'equal';
    return 'concurrent';
  }

  serialize(): any {
    return {
      type: 'GCounter',
      nodeId: this.nodeId,
      counts: Object.fromEntries(this.counts)
    };
  }

  static deserialize(data: any): GCounter {
    const counter = new GCounter(data.nodeId);
    counter.counts = new Map(Object.entries(data.counts).map(([k, v]) => [k, v as number]));
    return counter;
  }
}

export class PNCounter {
  private increments: GCounter;
  private decrements: GCounter;

  constructor(nodeId: string) {
    this.increments = new GCounter(nodeId);
    this.decrements = new GCounter(nodeId);
  }

  increment(amount: number = 1): void {
    this.increments.increment(amount);
  }

  decrement(amount: number = 1): void {
    this.decrements.increment(amount);
  }

  value(): number {
    return this.increments.value() - this.decrements.value();
  }

  merge(other: PNCounter): PNCounter {
    const merged = new PNCounter(this.increments['nodeId']);
    merged.increments = this.increments.merge(other.increments);
    merged.decrements = this.decrements.merge(other.decrements);
    return merged;
  }

  serialize(): any {
    return {
      type: 'PNCounter',
      increments: this.increments.serialize(),
      decrements: this.decrements.serialize()
    };
  }

  static deserialize(data: any): PNCounter {
    const counter = new PNCounter(data.increments.nodeId);
    counter.increments = GCounter.deserialize(data.increments);
    counter.decrements = GCounter.deserialize(data.decrements);
    return counter;
  }
}

export class GSet<T> {
  private elements: Set<T> = new Set();
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  add(element: T): void {
    this.elements.add(element);
  }

  has(element: T): boolean {
    return this.elements.has(element);
  }

  values(): T[] {
    return Array.from(this.elements);
  }

  size(): number {
    return this.elements.size;
  }

  merge(other: GSet<T>): GSet<T> {
    const merged = new GSet<T>(this.nodeId);
    
    // Union of both sets
    for (const element of this.elements) {
      merged.elements.add(element);
    }
    for (const element of other.elements) {
      merged.elements.add(element);
    }

    return merged;
  }

  serialize(): any {
    return {
      type: 'GSet',
      nodeId: this.nodeId,
      elements: Array.from(this.elements)
    };
  }

  static deserialize<T>(data: any): GSet<T> {
    const set = new GSet<T>(data.nodeId);
    set.elements = new Set(data.elements);
    return set;
  }
}

export class ORSet<T> {
  private added: Map<T, Set<string>> = new Map();
  private removed: Map<T, Set<string>> = new Map();
  private nodeId: string;
  private uniqueIdCounter: number = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  add(element: T): void {
    const uniqueId = `${this.nodeId}-${Date.now()}-${this.uniqueIdCounter++}`;
    
    if (!this.added.has(element)) {
      this.added.set(element, new Set());
    }
    this.added.get(element)!.add(uniqueId);
  }

  remove(element: T): void {
    const addedIds = this.added.get(element);
    if (addedIds) {
      if (!this.removed.has(element)) {
        this.removed.set(element, new Set());
      }
      const removedIds = this.removed.get(element)!;
      
      // Add all current added IDs to removed
      for (const id of addedIds) {
        removedIds.add(id);
      }
    }
  }

  has(element: T): boolean {
    const addedIds = this.added.get(element) || new Set();
    const removedIds = this.removed.get(element) || new Set();
    
    // Element exists if there are added IDs not in removed
    for (const id of addedIds) {
      if (!removedIds.has(id)) {
        return true;
      }
    }
    return false;
  }

  values(): T[] {
    const result: T[] = [];
    
    for (const [element] of this.added) {
      if (this.has(element)) {
        result.push(element);
      }
    }
    
    return result;
  }

  merge(other: ORSet<T>): ORSet<T> {
    const merged = new ORSet<T>(this.nodeId);
    
    // Union of added sets
    const allElements = new Set([...this.added.keys(), ...other.added.keys()]);
    
    for (const element of allElements) {
      const thisAdded = this.added.get(element) || new Set();
      const otherAdded = other.added.get(element) || new Set();
      const thisRemoved = this.removed.get(element) || new Set();
      const otherRemoved = other.removed.get(element) || new Set();
      
      // Union of added IDs
      const mergedAdded = new Set([...thisAdded, ...otherAdded]);
      if (mergedAdded.size > 0) {
        merged.added.set(element, mergedAdded);
      }
      
      // Union of removed IDs
      const mergedRemoved = new Set([...thisRemoved, ...otherRemoved]);
      if (mergedRemoved.size > 0) {
        merged.removed.set(element, mergedRemoved);
      }
    }
    
    return merged;
  }

  serialize(): any {
    return {
      type: 'ORSet',
      nodeId: this.nodeId,
      added: Object.fromEntries(
        Array.from(this.added.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      removed: Object.fromEntries(
        Array.from(this.removed.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      uniqueIdCounter: this.uniqueIdCounter
    };
  }

  static deserialize<T>(data: any): ORSet<T> {
    const set = new ORSet<T>(data.nodeId);
    
    set.added = new Map(
      Object.entries(data.added).map(([k, v]) => [k as T, new Set(v as string[])])
    );
    set.removed = new Map(
      Object.entries(data.removed).map(([k, v]) => [k as T, new Set(v as string[])])
    );
    set.uniqueIdCounter = data.uniqueIdCounter;
    
    return set;
  }
}

// Main CRDT Synchronizer class

export class CRDTSynchronizer extends EventEmitter {
  private nodeId: string;
  private vectorClock: VectorClock = {};
  private crdts: Map<string, any> = new Map();
  private operationLog: CRDTOperation[] = [];
  private syncPeers: Map<string, GossipMetadata> = new Map();
  private maxOperationLogSize: number = 1000;
  private gossipInterval: number = 5000; // 5 seconds
  private gossipFanout: number = 3;
  private conflictResolutionStrategies: Map<string, (local: any, remote: any) => any> = new Map();

  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
    this.vectorClock[nodeId] = 0;
    
    this.startGossipProtocol();
    this.setupDefaultConflictResolution();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      timestamp: Date.now()
    });
  }

  /**
   * Register a CRDT instance
   */
  registerCRDT<T>(name: string, crdt: T): void {
    this.crdts.set(name, crdt);
    
    this.emit('crdt_registered', {
      name,
      type: (crdt as any).constructor.name,
      nodeId: this.nodeId
    });
  }

  /**
   * Get a registered CRDT instance
   */
  getCRDT<T>(name: string): T | undefined {
    return this.crdts.get(name) as T;
  }

  /**
   * Apply an operation to a CRDT
   */
  applyOperation(crdtName: string, operation: Omit<CRDTOperation, 'operationId' | 'nodeId' | 'vectorClock'>): boolean {
    const crdt = this.crdts.get(crdtName);
    if (!crdt) {
      this.emit('error', { error: `CRDT ${crdtName} not found`, operation });
      return false;
    }

    // Increment vector clock
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1;

    // Create full operation
    const fullOperation: CRDTOperation = {
      ...operation,
      operationId: `${this.nodeId}-${Date.now()}-${this.vectorClock[this.nodeId]}`,
      nodeId: this.nodeId,
      vectorClock: { ...this.vectorClock }
    };

    // Apply operation based on type
    try {
      this.applyOperationToCRDT(crdt, fullOperation);
      this.operationLog.push(fullOperation);
      
      // Trim operation log if too large
      this.trimOperationLog();
      
      this.emit('operation_applied', {
        crdtName,
        operation: fullOperation,
        nodeId: this.nodeId
      });
      
      return true;
    } catch (error) {
      this.emit('error', { error: `Failed to apply operation: ${error}`, operation: fullOperation });
      return false;
    }
  }

  /**
   * Synchronize with another node's state
   */
  async synchronizeWith(peerId: string, peerState: CRDTState): Promise<SynchronizationResult> {
    let conflictsResolved = 0;
    let operationsApplied = 0;
    let stateMerged = false;

    try {
      // Update peer metadata
      this.updatePeerMetadata(peerId, peerState);
      
      // Merge vector clocks
      const clockMerged = this.mergeVectorClocks(this.vectorClock, peerState.vectorClock);
      
      // Process peer operations
      for (const operation of peerState.metadata.operations) {
        if (!this.hasOperation(operation.operationId)) {
          const crdt = this.crdts.get(this.getCRDTNameFromOperation(operation));
          if (crdt) {
            this.applyOperationToCRDT(crdt, operation);
            this.operationLog.push(operation);
            operationsApplied++;
          }
        }
      }
      
      // Merge CRDT states
      for (const [crdtName, localCrdt] of this.crdts) {
        const peerCrdt = this.extractCRDTFromState(peerState, crdtName);
        if (peerCrdt) {
          const mergeResult = this.mergeCRDTs(localCrdt, peerCrdt, crdtName);
          if (mergeResult.hadConflicts) {
            conflictsResolved++;
          }
          if (mergeResult.stateChanged) {
            stateMerged = true;
          }
        }
      }
      
      // Update vector clock
      this.vectorClock = clockMerged;
      this.trimOperationLog();
      
      this.emit('synchronized', {
        peerId,
        conflictsResolved,
        operationsApplied,
        stateMerged,
        timestamp: Date.now()
      });
      
      return {
        success: true,
        conflictsResolved,
        operationsApplied,
        stateMerged
      };
      
    } catch (error) {
      this.emit('synchronization_error', {
        peerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        conflictsResolved,
        operationsApplied,
        stateMerged,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current synchronizer state
   */
  getState(): CRDTState {
    const crdtData: any = {};
    
    for (const [name, crdt] of this.crdts) {
      crdtData[name] = this.serializeCRDT(crdt);
    }
    
    return {
      data: crdtData,
      vectorClock: { ...this.vectorClock },
      metadata: {
        nodeId: this.nodeId,
        lastModified: Date.now(),
        operations: [...this.operationLog]
      }
    };
  }

  /**
   * Start epidemic gossip protocol
   */
  private startGossipProtocol(): void {
    setInterval(() => {
      this.performGossipRound();
    }, this.gossipInterval);
  }

  /**
   * Perform a single gossip round
   */
  private async performGossipRound(): Promise<void> {
    if (this.syncPeers.size === 0) return;
    
    // Select random peers for gossip
    const availablePeers = Array.from(this.syncPeers.keys());
    const selectedPeers = this.selectGossipPeers(availablePeers);
    
    const myState = this.getState();
    
    for (const peerId of selectedPeers) {
      try {
        // Emit gossip event for network layer to handle
        this.emit('gossip_request', {
          peerId,
          state: myState,
          timestamp: Date.now()
        });
      } catch (error) {
        this.emit('gossip_error', {
          peerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Select peers for gossip based on various criteria
   */
  private selectGossipPeers(availablePeers: string[]): string[] {
    const now = Date.now();
    
    // Prioritize peers we haven't synced with recently
    const peersByLastSync = availablePeers
      .map(peerId => ({
        peerId,
        lastSync: this.syncPeers.get(peerId)?.lastSyncTime || 0,
        staleness: now - (this.syncPeers.get(peerId)?.lastSyncTime || 0)
      }))
      .sort((a, b) => b.staleness - a.staleness);
    
    return peersByLastSync
      .slice(0, Math.min(this.gossipFanout, availablePeers.length))
      .map(item => item.peerId);
  }

  /**
   * Merge vector clocks
   */
  private mergeVectorClocks(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = {};
    const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    
    for (const nodeId of allNodes) {
      merged[nodeId] = Math.max(clock1[nodeId] || 0, clock2[nodeId] || 0);
    }
    
    return merged;
  }

  /**
   * Apply operation to specific CRDT type
   */
  private applyOperationToCRDT(crdt: any, operation: CRDTOperation): void {
    switch (operation.type) {
      case 'increment':
        if (crdt.increment) {
          crdt.increment(operation.data.amount || 1);
        }
        break;
      case 'decrement':
        if (crdt.decrement) {
          crdt.decrement(operation.data.amount || 1);
        }
        break;
      case 'add':
        if (crdt.add) {
          crdt.add(operation.data.element);
        }
        break;
      case 'remove':
        if (crdt.remove) {
          crdt.remove(operation.data.element);
        }
        break;
      case 'set':
        if (crdt.set) {
          crdt.set(operation.data.key, operation.data.value);
        }
        break;
      case 'delete':
        if (crdt.delete) {
          crdt.delete(operation.data.key);
        }
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Merge two CRDT instances
   */
  private mergeCRDTs(localCrdt: any, remoteCrdt: any, crdtName: string): { hadConflicts: boolean; stateChanged: boolean } {
    let hadConflicts = false;
    let stateChanged = false;
    
    if (localCrdt.merge && typeof localCrdt.merge === 'function') {
      // Use CRDT's built-in merge function
      const mergedCrdt = localCrdt.merge(remoteCrdt);
      
      // Check if state changed
      const localSerialized = this.serializeCRDT(localCrdt);
      const mergedSerialized = this.serializeCRDT(mergedCrdt);
      stateChanged = JSON.stringify(localSerialized) !== JSON.stringify(mergedSerialized);
      
      // Replace local CRDT with merged version
      this.crdts.set(crdtName, mergedCrdt);
    } else {
      // Use conflict resolution strategy
      const strategy = this.conflictResolutionStrategies.get(crdtName);
      if (strategy) {
        const resolved = strategy(localCrdt, remoteCrdt);
        stateChanged = JSON.stringify(localCrdt) !== JSON.stringify(resolved);
        hadConflicts = stateChanged;
        this.crdts.set(crdtName, resolved);
      }
    }
    
    return { hadConflicts, stateChanged };
  }

  /**
   * Setup default conflict resolution strategies
   */
  private setupDefaultConflictResolution(): void {
    // Last-writer-wins strategy
    this.conflictResolutionStrategies.set('lww', (local: any, remote: any) => {
      if (!local.timestamp || !remote.timestamp) return local;
      return remote.timestamp > local.timestamp ? remote : local;
    });
    
    // Union merge strategy
    this.conflictResolutionStrategies.set('union', (local: any, remote: any) => {
      if (Array.isArray(local) && Array.isArray(remote)) {
        return [...new Set([...local, ...remote])];
      }
      if (typeof local === 'object' && typeof remote === 'object') {
        return { ...local, ...remote };
      }
      return local;
    });
    
    // Intersection merge strategy
    this.conflictResolutionStrategies.set('intersection', (local: any, remote: any) => {
      if (Array.isArray(local) && Array.isArray(remote)) {
        return local.filter(item => remote.includes(item));
      }
      return local;
    });
  }

  /**
   * Utility methods
   */
  
  private hasOperation(operationId: string): boolean {
    return this.operationLog.some(op => op.operationId === operationId);
  }

  private getCRDTNameFromOperation(operation: CRDTOperation): string {
    // Extract CRDT name from operation data or use a convention
    return operation.data?.crdtName || 'default';
  }

  private extractCRDTFromState(state: CRDTState, crdtName: string): any {
    return state.data[crdtName];
  }

  private serializeCRDT(crdt: any): any {
    if (crdt.serialize && typeof crdt.serialize === 'function') {
      return crdt.serialize();
    }
    return crdt;
  }

  private updatePeerMetadata(peerId: string, state: CRDTState): void {
    const metadata: GossipMetadata = {
      nodeId: peerId,
      timestamp: Date.now(),
      stateHash: this.calculateStateHash(state),
      operationCount: state.metadata.operations.length,
      lastSyncTime: Date.now()
    };
    
    this.syncPeers.set(peerId, metadata);
  }

  private calculateStateHash(state: CRDTState): string {
    // Simple hash calculation - could be improved with actual hashing
    return Buffer.from(JSON.stringify(state.data)).toString('base64').slice(0, 16);
  }

  private trimOperationLog(): void {
    if (this.operationLog.length > this.maxOperationLogSize) {
      // Keep only recent operations
      this.operationLog = this.operationLog.slice(-this.maxOperationLogSize);
    }
  }

  /**
   * Public configuration methods
   */
  
  public addPeer(peerId: string): void {
    if (!this.syncPeers.has(peerId)) {
      this.syncPeers.set(peerId, {
        nodeId: peerId,
        timestamp: Date.now(),
        stateHash: '',
        operationCount: 0,
        lastSyncTime: 0
      });
      
      this.emit('peer_added', { peerId, timestamp: Date.now() });
    }
  }

  public removePeer(peerId: string): void {
    if (this.syncPeers.has(peerId)) {
      this.syncPeers.delete(peerId);
      this.emit('peer_removed', { peerId, timestamp: Date.now() });
    }
  }

  public setConflictResolutionStrategy(crdtName: string, strategy: (local: any, remote: any) => any): void {
    this.conflictResolutionStrategies.set(crdtName, strategy);
  }

  public getMetrics(): {
    nodeId: string;
    vectorClock: VectorClock;
    operationLogSize: number;
    crdtCount: number;
    peerCount: number;
    lastGossipTime: number;
  } {
    return {
      nodeId: this.nodeId,
      vectorClock: { ...this.vectorClock },
      operationLogSize: this.operationLog.length,
      crdtCount: this.crdts.size,
      peerCount: this.syncPeers.size,
      lastGossipTime: Math.max(...Array.from(this.syncPeers.values()).map(p => p.lastSyncTime), 0)
    };
  }

  public shutdown(): void {
    this.emit('shutdown', {
      nodeId: this.nodeId,
      timestamp: Date.now(),
      finalState: this.getState()
    });
  }
}

export default CRDTSynchronizer;