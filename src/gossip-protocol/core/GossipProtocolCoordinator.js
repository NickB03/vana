/**
 * Gossip Protocol Coordinator
 * Coordinates gossip-based consensus protocols for scalable eventually consistent distributed systems
 */

import { EventEmitter } from 'events';
import { PeerManager } from '../peer-management/PeerManager.js';
import { EpidemicProtocol } from '../protocols/epidemic/EpidemicProtocol.js';
import { AntiEntropyProtocol } from '../protocols/anti-entropy/AntiEntropyProtocol.js';
import { FailureDetector } from '../protocols/failure-detection/FailureDetector.js';
import { StateManager } from '../synchronization/StateManager.js';
import { ConvergenceMonitor } from '../monitoring/ConvergenceMonitor.js';

export class GossipProtocolCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.nodeId = config.nodeId || this.generateNodeId();
    this.config = {
      fanout: config.fanout || 3,
      gossipInterval: config.gossipInterval || 1000,
      maxMessageAge: config.maxMessageAge || 30000,
      convergenceThreshold: config.convergenceThreshold || 0.95,
      failureDetectionInterval: config.failureDetectionInterval || 5000,
      antiEntropyInterval: config.antiEntropyInterval || 10000,
      ...config
    };
    
    this.state = 'initialized';
    this.messageHistory = new Map();
    this.vectorClock = new Map();
    
    // Initialize core components
    this.peerManager = new PeerManager(this.nodeId, this.config);
    this.epidemicProtocol = new EpidemicProtocol(this.nodeId, this.config);
    this.antiEntropyProtocol = new AntiEntropyProtocol(this.nodeId, this.config);
    this.failureDetector = new FailureDetector(this.nodeId, this.config);
    this.stateManager = new StateManager(this.nodeId, this.config);
    this.convergenceMonitor = new ConvergenceMonitor(this.nodeId, this.config);
    
    this.setupEventHandlers();
  }
  
  generateNodeId() {
    return `gossip-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  setupEventHandlers() {
    // Peer management events
    this.peerManager.on('peerJoined', (peer) => {
      this.emit('peerJoined', peer);
      this.stateManager.initializePeerState(peer.id);
    });
    
    this.peerManager.on('peerLeft', (peer) => {
      this.emit('peerLeft', peer);
      this.stateManager.cleanupPeerState(peer.id);
    });
    
    // Epidemic protocol events
    this.epidemicProtocol.on('messageReceived', (message, sender) => {
      this.handleGossipMessage(message, sender);
    });
    
    // Failure detection events
    this.failureDetector.on('peerFailed', (peerId) => {
      this.peerManager.removePeer(peerId);
      this.emit('peerFailed', peerId);
    });
    
    // Convergence monitoring
    this.convergenceMonitor.on('convergenceAchieved', (metrics) => {
      this.emit('convergenceAchieved', metrics);
    });
    
    this.convergenceMonitor.on('convergenceLost', (metrics) => {
      this.emit('convergenceLost', metrics);
    });
  }
  
  async start() {
    if (this.state === 'running') {
      return;
    }
    
    try {
      this.state = 'starting';
      
      // Start all components
      await this.peerManager.start();
      await this.epidemicProtocol.start();
      await this.antiEntropyProtocol.start();
      await this.failureDetector.start();
      await this.stateManager.start();
      await this.convergenceMonitor.start();
      
      // Start periodic processes
      this.startPeriodicProcesses();
      
      this.state = 'running';
      this.emit('started');
      
      console.log(`Gossip Protocol Coordinator started for node ${this.nodeId}`);
    } catch (error) {
      this.state = 'error';
      this.emit('error', error);
      throw error;
    }
  }
  
  startPeriodicProcesses() {
    // Gossip round timer
    this.gossipTimer = setInterval(() => {
      this.performGossipRound();
    }, this.config.gossipInterval);
    
    // Anti-entropy timer
    this.antiEntropyTimer = setInterval(() => {
      this.performAntiEntropyRound();
    }, this.config.antiEntropyInterval);
    
    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMessages();
    }, this.config.maxMessageAge);
  }
  
  async performGossipRound() {
    try {
      const peers = this.peerManager.selectRandomPeers(this.config.fanout);
      const messages = this.getMessagesToGossip();
      
      if (messages.length === 0 || peers.length === 0) {
        return;
      }
      
      // Push gossip - proactive information spreading
      for (const peer of peers) {
        await this.epidemicProtocol.pushMessages(peer.id, messages);
      }
      
      // Pull gossip - reactive information retrieval
      const pullRequests = this.generatePullRequests();
      if (pullRequests.length > 0) {
        for (const peer of peers) {
          await this.epidemicProtocol.pullMessages(peer.id, pullRequests);
        }
      }
      
    } catch (error) {
      console.error('Error in gossip round:', error);
      this.emit('gossipError', error);
    }
  }
  
  async performAntiEntropyRound() {
    try {
      const peer = this.peerManager.selectRandomPeer();
      if (!peer) return;
      
      // Merkle tree comparison for efficient difference detection
      const localDigest = await this.stateManager.generateStateDigest();
      const peerDigest = await this.antiEntropyProtocol.requestStateDigest(peer.id);
      
      if (localDigest !== peerDigest) {
        // States differ - synchronize
        const differences = await this.antiEntropyProtocol.compareTrees(peer.id, localDigest);
        await this.synchronizeState(peer.id, differences);
      }
      
    } catch (error) {
      console.error('Error in anti-entropy round:', error);
      this.emit('antiEntropyError', error);
    }
  }
  
  getMessagesToGossip() {
    // Get recent messages that should be propagated
    const recentMessages = [];
    const now = Date.now();
    
    for (const [messageId, message] of this.messageHistory) {
      if (now - message.timestamp < this.config.maxMessageAge) {
        recentMessages.push(message);
      }
    }
    
    return recentMessages;
  }
  
  generatePullRequests() {
    // Generate requests for missing information
    return this.stateManager.getMissingDataRequests();
  }
  
  handleGossipMessage(message, senderId) {
    try {
      // Update vector clock
      this.updateVectorClock(message.vectorClock);
      
      // Check for duplicates
      if (this.messageHistory.has(message.id)) {
        return; // Already processed
      }
      
      // Store message
      this.messageHistory.set(message.id, {
        ...message,
        timestamp: Date.now(),
        receivedFrom: senderId
      });
      
      // Apply message to state
      this.stateManager.applyMessage(message);
      
      // Emit for application handling
      this.emit('messageReceived', message, senderId);
      
      // Update convergence monitoring
      this.convergenceMonitor.recordMessage(message, senderId);
      
    } catch (error) {
      console.error('Error handling gossip message:', error);
      this.emit('messageError', error, message, senderId);
    }
  }
  
  updateVectorClock(peerVectorClock) {
    for (const [nodeId, timestamp] of Object.entries(peerVectorClock || {})) {
      const currentTimestamp = this.vectorClock.get(nodeId) || 0;
      this.vectorClock.set(nodeId, Math.max(currentTimestamp, timestamp));
    }
    
    // Increment our own timestamp
    const ourTimestamp = this.vectorClock.get(this.nodeId) || 0;
    this.vectorClock.set(this.nodeId, ourTimestamp + 1);
  }
  
  async synchronizeState(peerId, differences) {
    try {
      // Resolve conflicts using vector clocks
      for (const diff of differences) {
        const resolution = await this.resolveConflict(diff);
        await this.stateManager.applyResolution(resolution);
      }
      
      this.emit('stateSynchronized', peerId, differences);
    } catch (error) {
      console.error('Error synchronizing state:', error);
      this.emit('synchronizationError', error, peerId);
    }
  }
  
  async resolveConflict(conflict) {
    // Implement conflict resolution using vector clocks
    const localClock = conflict.local?.vectorClock || {};
    const remoteClock = conflict.remote?.vectorClock || {};
    
    // Check causality
    const localHappensFirst = this.happensBefore(localClock, remoteClock);
    const remoteHappensFirst = this.happensBefore(remoteClock, localClock);
    
    if (localHappensFirst && !remoteHappensFirst) {
      return { action: 'keep_remote', data: conflict.remote };
    } else if (remoteHappensFirst && !localHappensFirst) {
      return { action: 'keep_local', data: conflict.local };
    } else {
      // Concurrent updates - use application-specific resolution
      return this.resolveConcurrentConflict(conflict);
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
  
  resolveConcurrentConflict(conflict) {
    // Default resolution strategy - can be overridden
    return {
      action: 'merge',
      data: this.mergeConflictingData(conflict.local, conflict.remote)
    };
  }
  
  mergeConflictingData(local, remote) {
    // Simple merge strategy - application specific
    return {
      ...local,
      ...remote,
      merged: true,
      mergeTimestamp: Date.now()
    };
  }
  
  cleanupOldMessages() {
    const now = Date.now();
    const toDelete = [];
    
    for (const [messageId, message] of this.messageHistory) {
      if (now - message.timestamp > this.config.maxMessageAge) {
        toDelete.push(messageId);
      }
    }
    
    toDelete.forEach(id => this.messageHistory.delete(id));
  }
  
  // Public API methods
  async joinNetwork(bootstrapPeers = []) {
    return this.peerManager.joinNetwork(bootstrapPeers);
  }
  
  async leaveNetwork() {
    if (this.state !== 'running') return;
    
    this.state = 'stopping';
    
    // Cleanup timers
    if (this.gossipTimer) clearInterval(this.gossipTimer);
    if (this.antiEntropyTimer) clearInterval(this.antiEntropyTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    
    // Stop components
    await Promise.all([
      this.peerManager.stop(),
      this.epidemicProtocol.stop(),
      this.antiEntropyProtocol.stop(),
      this.failureDetector.stop(),
      this.stateManager.stop(),
      this.convergenceMonitor.stop()
    ]);
    
    this.state = 'stopped';
    this.emit('stopped');
  }
  
  async broadcast(message) {
    if (this.state !== 'running') {
      throw new Error('Coordinator not running');
    }
    
    const gossipMessage = {
      id: this.generateMessageId(),
      type: 'broadcast',
      payload: message,
      senderId: this.nodeId,
      vectorClock: Object.fromEntries(this.vectorClock),
      timestamp: Date.now()
    };
    
    // Add to our message history
    this.messageHistory.set(gossipMessage.id, gossipMessage);
    
    // Trigger immediate gossip round
    await this.performGossipRound();
    
    return gossipMessage.id;
  }
  
  generateMessageId() {
    return `msg-${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getNetworkTopology() {
    return {
      nodeId: this.nodeId,
      peers: this.peerManager.getPeers(),
      state: this.state,
      vectorClock: Object.fromEntries(this.vectorClock),
      messageCount: this.messageHistory.size,
      convergenceMetrics: this.convergenceMonitor.getMetrics()
    };
  }
  
  getPerformanceMetrics() {
    return {
      node: this.nodeId,
      gossipRounds: this.epidemicProtocol.getMetrics(),
      antiEntropyRounds: this.antiEntropyProtocol.getMetrics(),
      failureDetection: this.failureDetector.getMetrics(),
      convergence: this.convergenceMonitor.getMetrics(),
      bandwidth: this.getBandwidthMetrics()
    };
  }
  
  getBandwidthMetrics() {
    return {
      messagesSent: this.epidemicProtocol.messagesSent || 0,
      messagesReceived: this.epidemicProtocol.messagesReceived || 0,
      bytesTransmitted: this.epidemicProtocol.bytesTransmitted || 0,
      bytesReceived: this.epidemicProtocol.bytesReceived || 0
    };
  }
}

export default GossipProtocolCoordinator;