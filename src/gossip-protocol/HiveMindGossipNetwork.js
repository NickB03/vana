/**
 * Hive Mind Gossip Network
 * Main orchestrator for the gossip-based communication network
 */

import { GossipProtocolCoordinator } from './core/GossipProtocolCoordinator.js';
import { getConfig, validateConfig } from '../config/gossip/network-config.js';

export class HiveMindGossipNetwork {
  constructor(nodeId, environment = 'development') {
    this.nodeId = nodeId || this.generateNodeId();
    this.environment = environment;
    this.config = getConfig(environment);
    
    // Validate configuration
    const validation = validateConfig(this.config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    this.coordinator = null;
    this.isRunning = false;
    this.startTime = null;
    
    // Network statistics
    this.stats = {
      messagesProcessed: 0,
      peersConnected: 0,
      convergenceEvents: 0,
      failureEvents: 0,
      uptime: 0
    };
    
    console.log(`Initialized Hive Mind Gossip Network for node ${this.nodeId}`);
  }
  
  generateNodeId() {
    return `hive-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async initialize() {
    try {
      console.log(`Initializing gossip network for ${this.nodeId}...`);
      
      // Create coordinator with merged config
      this.coordinator = new GossipProtocolCoordinator(this.nodeId, {
        ...this.config.node,
        ...this.config.epidemic,
        ...this.config.antiEntropy,
        ...this.config.failureDetection,
        ...this.config.convergence,
        ...this.config.state
      });
      
      // Set up event handlers
      this.setupEventHandlers();
      
      console.log(`Gossip network initialized for node ${this.nodeId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to initialize gossip network:', error);
      throw error;
    }
  }
  
  setupEventHandlers() {
    if (!this.coordinator) return;
    
    // Peer management events
    this.coordinator.on('peerJoined', (peer) => {
      this.stats.peersConnected++;
      console.log(`Peer joined the network: ${peer.id}`);
    });
    
    this.coordinator.on('peerLeft', (peer) => {
      this.stats.peersConnected = Math.max(0, this.stats.peersConnected - 1);
      console.log(`Peer left the network: ${peer.id}`);
    });
    
    this.coordinator.on('peerFailed', (peerId) => {
      this.stats.failureEvents++;
      console.log(`Peer failed: ${peerId}`);
    });
    
    // Message events
    this.coordinator.on('messageReceived', (message, senderId) => {
      this.stats.messagesProcessed++;
      this.handleNetworkMessage(message, senderId);
    });
    
    // Convergence events
    this.coordinator.on('convergenceAchieved', (metrics) => {
      this.stats.convergenceEvents++;
      console.log('Network convergence achieved:', metrics);
    });
    
    this.coordinator.on('convergenceLost', (metrics) => {
      console.warn('Network convergence lost:', metrics);
    });
    
    // Error handling
    this.coordinator.on('error', (error) => {
      console.error('Gossip coordinator error:', error);
    });
  }
  
  async start(bootstrapPeers = []) {
    if (this.isRunning) {
      console.warn('Network is already running');
      return;
    }
    
    try {
      if (!this.coordinator) {
        await this.initialize();
      }
      
      console.log(`Starting gossip network for ${this.nodeId}...`);
      
      // Start the coordinator
      await this.coordinator.start();
      
      // Join the network
      const peers = bootstrapPeers.length > 0 ? bootstrapPeers : this.config.discovery.bootstrapNodes;
      if (peers.length > 0) {
        await this.coordinator.joinNetwork(peers);
      }
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      console.log(`Gossip network started successfully for ${this.nodeId}`);
      
      // Start periodic maintenance
      this.startMaintenance();
      
    } catch (error) {
      console.error('Failed to start gossip network:', error);
      this.isRunning = false;
      throw error;
    }
  }
  
  async stop() {
    if (!this.isRunning) {
      console.warn('Network is not running');
      return;
    }
    
    try {
      console.log(`Stopping gossip network for ${this.nodeId}...`);
      
      // Stop maintenance
      this.stopMaintenance();
      
      // Leave the network gracefully
      if (this.coordinator) {
        await this.coordinator.leaveNetwork();
      }
      
      this.isRunning = false;
      console.log(`Gossip network stopped for ${this.nodeId}`);
      
    } catch (error) {
      console.error('Error stopping gossip network:', error);
      throw error;
    }
  }
  
  startMaintenance() {
    // Periodic statistics update
    this.statsTimer = setInterval(() => {
      this.updateStats();
    }, this.config.monitoring.metricsInterval);
    
    // Periodic health check
    this.healthTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }
  
  stopMaintenance() {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
  
  updateStats() {
    if (this.startTime) {
      this.stats.uptime = Date.now() - this.startTime;
    }
    
    if (this.coordinator) {
      const topology = this.coordinator.getNetworkTopology();
      this.stats.peersConnected = topology.peers.length;
    }
  }
  
  performHealthCheck() {
    if (!this.coordinator) return;
    
    try {
      const topology = this.coordinator.getNetworkTopology();
      const metrics = this.coordinator.getPerformanceMetrics();
      
      // Check for network health issues
      if (topology.peers.length < this.config.topology.minPeers) {
        console.warn(`Low peer count: ${topology.peers.length} (min: ${this.config.topology.minPeers})`);
      }
      
      // Check convergence metrics
      if (metrics.convergence && metrics.convergence.convergenceRate < 0.8) {
        console.warn(`Low convergence rate: ${(metrics.convergence.convergenceRate * 100).toFixed(1)}%`);
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }
  
  handleNetworkMessage(message, senderId) {
    try {
      // Process different message types
      switch (message.type) {
        case 'hive_mind_update':
          this.handleHiveMindUpdate(message, senderId);
          break;
        case 'consensus_proposal':
          this.handleConsensusProposal(message, senderId);
          break;
        case 'state_synchronization':
          this.handleStateSynchronization(message, senderId);
          break;
        default:
          console.log(`Received unknown message type: ${message.type} from ${senderId}`);
      }
      
    } catch (error) {
      console.error('Error handling network message:', error);
    }
  }
  
  handleHiveMindUpdate(message, senderId) {
    console.log(`Hive Mind update from ${senderId}:`, message.payload);
    // Forward to Hive Mind processing systems
  }
  
  handleConsensusProposal(message, senderId) {
    console.log(`Consensus proposal from ${senderId}:`, message.payload);
    // Forward to consensus mechanisms
  }
  
  handleStateSynchronization(message, senderId) {
    console.log(`State sync from ${senderId}:`, message.payload);
    // Handle state synchronization
  }
  
  // Public API Methods
  async broadcastMessage(type, payload, metadata = {}) {
    if (!this.isRunning || !this.coordinator) {
      throw new Error('Network is not running');
    }
    
    const message = {
      type,
      payload,
      metadata: {
        ...metadata,
        origin: this.nodeId,
        timestamp: Date.now()
      }
    };
    
    return await this.coordinator.broadcast(message);
  }
  
  async broadcastHiveMindUpdate(update) {
    return this.broadcastMessage('hive_mind_update', update);
  }
  
  async broadcastConsensusProposal(proposal) {
    return this.broadcastMessage('consensus_proposal', proposal);
  }
  
  async synchronizeState(stateUpdate) {
    return this.broadcastMessage('state_synchronization', stateUpdate);
  }
  
  getNetworkStatus() {
    if (!this.coordinator) {
      return { status: 'not_initialized' };
    }
    
    const topology = this.coordinator.getNetworkTopology();
    const metrics = this.coordinator.getPerformanceMetrics();
    
    return {
      status: this.isRunning ? 'running' : 'stopped',
      nodeId: this.nodeId,
      environment: this.environment,
      uptime: this.stats.uptime,
      stats: this.stats,
      topology,
      metrics,
      config: {
        fanout: this.config.epidemic.pushFanout,
        maxPeers: this.config.topology.maxPeers,
        convergenceThreshold: this.config.convergence.convergenceThreshold
      }
    };
  }
  
  getNetworkTopology() {
    return this.coordinator ? this.coordinator.getNetworkTopology() : null;
  }
  
  getPerformanceMetrics() {
    return this.coordinator ? this.coordinator.getPerformanceMetrics() : null;
  }
  
  // Network Management
  async addPeer(peerInfo) {
    if (!this.coordinator) {
      throw new Error('Network not initialized');
    }
    
    return await this.coordinator.peerManager.addPeer(peerInfo);
  }
  
  async removePeer(peerId) {
    if (!this.coordinator) {
      throw new Error('Network not initialized');
    }
    
    return await this.coordinator.peerManager.removePeer(peerId, 'manual_removal');
  }
  
  getPeers() {
    if (!this.coordinator) {
      return [];
    }
    
    return this.coordinator.peerManager.getPeers();
  }
  
  // Configuration Management
  updateConfig(newConfig) {
    const mergedConfig = { ...this.config, ...newConfig };
    const validation = validateConfig(mergedConfig);
    
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    this.config = mergedConfig;
    
    // Update coordinator if running
    if (this.coordinator) {
      // Apply configuration changes that can be updated at runtime
      if (newConfig.epidemic) {
        this.coordinator.epidemicProtocol.config = {
          ...this.coordinator.epidemicProtocol.config,
          ...newConfig.epidemic
        };
      }
      
      if (newConfig.failureDetection) {
        this.coordinator.failureDetector.updateConfig(newConfig.failureDetection);
      }
    }
    
    console.log('Configuration updated:', newConfig);
  }
  
  // Debugging and Diagnostics
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      environment: this.environment,
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.stats.uptime,
      stats: this.stats,
      config: this.config,
      coordinator: this.coordinator ? {
        state: this.coordinator.state,
        messageHistory: this.coordinator.messageHistory.size,
        vectorClock: this.coordinator.getVectorClock()
      } : null
    };
  }
  
  async exportNetworkState() {
    if (!this.coordinator) {
      throw new Error('Network not initialized');
    }
    
    return {
      nodeId: this.nodeId,
      exportTime: Date.now(),
      networkTopology: this.coordinator.getNetworkTopology(),
      performanceMetrics: this.coordinator.getPerformanceMetrics(),
      stats: this.stats,
      config: this.config
    };
  }
}

export default HiveMindGossipNetwork;