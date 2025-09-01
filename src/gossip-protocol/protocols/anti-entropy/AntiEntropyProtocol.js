/**
 * Anti-Entropy Protocol
 * Ensures eventual consistency through state synchronization and Merkle tree comparison
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class AntiEntropyProtocol extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      syncInterval: config.syncInterval || 10000,
      merkleTreeDepth: config.merkleTreeDepth || 8,
      maxSyncBatch: config.maxSyncBatch || 100,
      compressionThreshold: config.compressionThreshold || 1024,
      ...config
    };
    
    this.merkleTree = null;
    this.stateDigest = null;
    this.lastSyncTime = Date.now();
    this.isRunning = false;
    
    // Performance metrics
    this.metrics = {
      syncRounds: 0,
      statesSynchronized: 0,
      differencesDetected: 0,
      bytesTransferred: 0,
      merkleComparisons: 0,
      conflictsResolved: 0
    };
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Initialize Merkle tree
    await this.initializeMerkleTree();
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.emit('stopped');
  }
  
  async initializeMerkleTree() {
    this.merkleTree = new MerkleTree(this.config.merkleTreeDepth);
    this.stateDigest = await this.generateStateDigest();
  }
  
  async generateStateDigest() {
    // Generate a digest of the current state
    const stateHash = crypto.createHash('sha256');
    
    // In real implementation, this would hash all state elements
    const mockState = {
      nodeId: this.nodeId,
      timestamp: this.lastSyncTime,
      stateVersion: Date.now()
    };
    
    stateHash.update(JSON.stringify(mockState));
    this.stateDigest = stateHash.digest('hex');
    
    return this.stateDigest;
  }
  
  async requestStateDigest(peerId) {
    try {
      const request = {
        type: 'state_digest_request',
        senderId: this.nodeId,
        timestamp: Date.now()
      };
      
      const response = await this.sendToPeer(peerId, request);
      return response.digest;
      
    } catch (error) {
      console.error(`Failed to request state digest from ${peerId}:`, error);
      throw error;
    }
  }
  
  async compareTrees(peerId, remoteDigest) {
    this.metrics.merkleComparisons++;
    
    if (this.stateDigest === remoteDigest) {
      // States are identical
      return [];
    }
    
    try {
      // Request detailed tree comparison
      const request = {
        type: 'merkle_tree_request',
        senderId: this.nodeId,
        localDigest: this.stateDigest,
        remoteDigest: remoteDigest,
        timestamp: Date.now()
      };
      
      const response = await this.sendToPeer(peerId, request);
      const differences = this.analyzeDifferences(response.tree);
      
      this.metrics.differencesDetected += differences.length;
      return differences;
      
    } catch (error) {
      console.error(`Failed to compare trees with ${peerId}:`, error);
      throw error;
    }
  }
  
  analyzeDifferences(remoteTree) {
    // Analyze differences between local and remote Merkle trees
    const differences = [];
    
    // Simplified difference detection
    for (let i = 0; i < this.config.merkleTreeDepth; i++) {
      const localNode = this.merkleTree.getNode(i);
      const remoteNode = remoteTree.nodes?.[i];
      
      if (localNode && remoteNode && localNode.hash !== remoteNode.hash) {
        differences.push({
          level: i,
          localHash: localNode.hash,
          remoteHash: remoteNode.hash,
          dataKeys: remoteNode.keys || []
        });
      }
    }
    
    return differences;
  }
  
  async synchronizeStates(peerId, differences) {
    if (!differences || differences.length === 0) {
      return;
    }
    
    try {
      this.metrics.syncRounds++;
      
      // Request missing data for each difference
      for (const diff of differences) {
        await this.requestMissingData(peerId, diff);
      }
      
      // Update our state digest after synchronization
      await this.generateStateDigest();
      this.lastSyncTime = Date.now();
      
      this.metrics.statesSynchronized++;
      this.emit('stateSynchronized', peerId, differences);
      
    } catch (error) {
      console.error(`Failed to synchronize states with ${peerId}:`, error);
      this.emit('synchronizationError', error, peerId);
    }
  }
  
  async requestMissingData(peerId, difference) {
    const request = {
      type: 'missing_data_request',
      senderId: this.nodeId,
      difference: difference,
      timestamp: Date.now()
    };
    
    try {
      const response = await this.sendToPeer(peerId, request);
      
      if (response.data && response.data.length > 0) {
        await this.applyMissingData(response.data);
        this.metrics.bytesTransferred += this.estimateDataSize(response.data);
      }
      
    } catch (error) {
      console.error(`Failed to request missing data from ${peerId}:`, error);
    }
  }
  
  async applyMissingData(missingData) {
    for (const dataItem of missingData) {
      try {
        // Apply the data item to local state
        await this.integrateDataItem(dataItem);
        
        // Update Merkle tree
        this.merkleTree.addData(dataItem.key, dataItem.value);
        
      } catch (error) {
        console.error('Failed to apply missing data:', error);
      }
    }
  }
  
  async integrateDataItem(dataItem) {
    // Vector clock-based conflict resolution
    const conflict = await this.detectConflict(dataItem);
    
    if (conflict) {
      const resolution = await this.resolveConflict(conflict, dataItem);
      await this.applyResolution(resolution);
      this.metrics.conflictsResolved++;
    } else {
      // No conflict - direct integration
      await this.storeDataItem(dataItem);
    }
  }
  
  async detectConflict(dataItem) {
    // Check if local state has conflicting data
    const localData = await this.getLocalData(dataItem.key);
    
    if (!localData) {
      return null; // No conflict - new data
    }
    
    // Compare vector clocks
    const localClock = localData.vectorClock || {};
    const remoteClock = dataItem.vectorClock || {};
    
    const localHappensFirst = this.happensBefore(localClock, remoteClock);
    const remoteHappensFirst = this.happensBefore(remoteClock, localClock);
    
    if (localHappensFirst && !remoteHappensFirst) {
      return null; // Remote is newer
    } else if (remoteHappensFirst && !localHappensFirst) {
      return null; // Local is newer
    } else {
      // Concurrent updates - conflict
      return {
        key: dataItem.key,
        local: localData,
        remote: dataItem,
        type: 'concurrent'
      };
    }
  }
  
  happensBefore(clockA, clockB) {
    let hasSmaller = false;
    
    for (const nodeId in clockB) {
      const timestampA = clockA[nodeId] || 0;
      const timestampB = clockB[nodeId] || 0;
      
      if (timestampA > timestampB) {
        return false;
      } else if (timestampA < timestampB) {
        hasSmaller = true;
      }
    }
    
    return hasSmaller;
  }
  
  async resolveConflict(conflict, dataItem) {
    // Application-specific conflict resolution strategies
    switch (conflict.type) {
      case 'concurrent':
        return this.resolveConcurrentConflict(conflict, dataItem);
      case 'version':
        return this.resolveVersionConflict(conflict, dataItem);
      default:
        return this.resolveDefaultConflict(conflict, dataItem);
    }
  }
  
  resolveConcurrentConflict(conflict, dataItem) {
    // Last-writer-wins with timestamp tiebreaker
    const localTimestamp = conflict.local.timestamp || 0;
    const remoteTimestamp = dataItem.timestamp || 0;
    
    if (remoteTimestamp > localTimestamp) {
      return { action: 'accept_remote', data: dataItem };
    } else if (localTimestamp > remoteTimestamp) {
      return { action: 'keep_local', data: conflict.local };
    } else {
      // Same timestamp - use node ID for deterministic resolution
      if (dataItem.senderId > conflict.local.senderId) {
        return { action: 'accept_remote', data: dataItem };
      } else {
        return { action: 'keep_local', data: conflict.local };
      }
    }
  }
  
  resolveVersionConflict(conflict, dataItem) {
    // Version-based resolution
    const localVersion = conflict.local.version || 0;
    const remoteVersion = dataItem.version || 0;
    
    return remoteVersion > localVersion 
      ? { action: 'accept_remote', data: dataItem }
      : { action: 'keep_local', data: conflict.local };
  }
  
  resolveDefaultConflict(conflict, dataItem) {
    // Merge strategy for default conflicts
    return {
      action: 'merge',
      data: {
        ...conflict.local,
        ...dataItem,
        conflictResolved: true,
        resolvedAt: Date.now(),
        mergeType: 'default'
      }
    };
  }
  
  async applyResolution(resolution) {
    switch (resolution.action) {
      case 'accept_remote':
        await this.storeDataItem(resolution.data);
        break;
      case 'keep_local':
        // No action needed
        break;
      case 'merge':
        await this.storeDataItem(resolution.data);
        break;
      default:
        console.warn(`Unknown resolution action: ${resolution.action}`);
    }
  }
  
  async storeDataItem(dataItem) {
    // Store data item in local state
    // In real implementation, this would update the actual state store
    console.log(`Storing data item: ${dataItem.key}`);
  }
  
  async getLocalData(key) {
    // Retrieve local data by key
    // In real implementation, this would query the actual state store
    return null; // Mock implementation
  }
  
  estimateDataSize(data) {
    return JSON.stringify(data).length * 2; // Rough estimate
  }
  
  // Mock network communication
  async sendToPeer(peerId, request) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    console.log(`AntiEntropy: Sending ${request.type} to ${peerId}`);
    
    // Mock responses based on request type
    switch (request.type) {
      case 'state_digest_request':
        return { digest: 'mock-digest-' + Math.random().toString(36).substr(2, 8) };
      case 'merkle_tree_request':
        return { tree: { nodes: [] } };
      case 'missing_data_request':
        return { data: [] };
      default:
        return {};
    }
  }
  
  // Public API methods
  async performAntiEntropyRound(peerId) {
    if (!this.isRunning) return;
    
    try {
      // Generate current state digest
      const localDigest = await this.generateStateDigest();
      
      // Get peer's state digest
      const remoteDigest = await this.requestStateDigest(peerId);
      
      // Compare and synchronize if different
      if (localDigest !== remoteDigest) {
        const differences = await this.compareTrees(peerId, remoteDigest);
        await this.synchronizeStates(peerId, differences);
      }
      
    } catch (error) {
      console.error(`Anti-entropy round failed with ${peerId}:`, error);
      this.emit('antiEntropyError', error, peerId);
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      lastSyncTime: this.lastSyncTime,
      currentStateDigest: this.stateDigest,
      merkleTreeSize: this.merkleTree?.size || 0
    };
  }
  
  getStateDigest() {
    return this.stateDigest;
  }
  
  async forceSync(peerId) {
    return this.performAntiEntropyRound(peerId);
  }
}

// Merkle Tree implementation for efficient state comparison
class MerkleTree {
  constructor(depth = 8) {
    this.depth = depth;
    this.nodes = new Array(Math.pow(2, depth)).fill(null);
    this.size = 0;
  }
  
  addData(key, value) {
    const hash = this.hashData(key, value);
    const index = this.getIndex(key);
    
    this.nodes[index] = {
      key,
      value,
      hash,
      timestamp: Date.now()
    };
    
    this.size++;
    this.updateParentHashes(index);
  }
  
  getNode(index) {
    return this.nodes[index];
  }
  
  getIndex(key) {
    // Simple hash-based index calculation
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % this.nodes.length;
  }
  
  hashData(key, value) {
    return crypto.createHash('sha256')
      .update(JSON.stringify({ key, value }))
      .digest('hex');
  }
  
  updateParentHashes(leafIndex) {
    // Update parent hashes up the tree
    let currentIndex = leafIndex;
    
    while (currentIndex > 0) {
      const parentIndex = Math.floor(currentIndex / 2);
      const leftChild = this.nodes[currentIndex * 2];
      const rightChild = this.nodes[currentIndex * 2 + 1];
      
      const parentHash = crypto.createHash('sha256')
        .update((leftChild?.hash || '') + (rightChild?.hash || ''))
        .digest('hex');
      
      if (!this.nodes[parentIndex]) {
        this.nodes[parentIndex] = {};
      }
      
      this.nodes[parentIndex].hash = parentHash;
      currentIndex = parentIndex;
    }
  }
  
  getRootHash() {
    return this.nodes[1]?.hash || '';
  }
}

export default AntiEntropyProtocol;