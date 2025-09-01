/**
 * Peer Management System
 * Handles random peer selection, failure detection, and network topology maintenance
 */

import { EventEmitter } from 'events';

export class PeerManager extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      maxPeers: config.maxPeers || 50,
      minPeers: config.minPeers || 3,
      peerTimeout: config.peerTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 5000,
      ...config
    };
    
    this.peers = new Map();
    this.peerHealthStatus = new Map();
    this.lastHeartbeats = new Map();
    this.isRunning = false;
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start heartbeat monitoring
    this.heartbeatTimer = setInterval(() => {
      this.checkPeerHealth();
    }, this.config.heartbeatInterval);
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.emit('stopped');
  }
  
  async joinNetwork(bootstrapPeers = []) {
    console.log(`Node ${this.nodeId} joining network with bootstrap peers:`, bootstrapPeers);
    
    // Add bootstrap peers
    for (const peer of bootstrapPeers) {
      await this.addPeer(peer);
    }
    
    // Request peer lists from bootstrap peers
    for (const peer of bootstrapPeers) {
      try {
        const peerList = await this.requestPeerList(peer.id);
        for (const discoveredPeer of peerList) {
          if (discoveredPeer.id !== this.nodeId && !this.peers.has(discoveredPeer.id)) {
            await this.addPeer(discoveredPeer);
          }
        }
      } catch (error) {
        console.error(`Failed to get peer list from ${peer.id}:`, error);
      }
    }
    
    // Announce our presence
    await this.announcePresence();
    
    this.emit('networkJoined', {
      nodeId: this.nodeId,
      peerCount: this.peers.size
    });
  }
  
  async addPeer(peerInfo) {
    const { id, address, port, metadata = {} } = peerInfo;
    
    if (id === this.nodeId || this.peers.has(id)) {
      return; // Don't add ourselves or duplicates
    }
    
    const peer = {
      id,
      address,
      port,
      metadata,
      addedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'active'
    };
    
    this.peers.set(id, peer);
    this.peerHealthStatus.set(id, 'healthy');
    this.lastHeartbeats.set(id, Date.now());
    
    console.log(`Added peer ${id} to network`);
    this.emit('peerJoined', peer);
    
    // Maintain max peers limit
    if (this.peers.size > this.config.maxPeers) {
      await this.evictOldestPeer();
    }
  }
  
  async removePeer(peerId, reason = 'unknown') {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    
    this.peers.delete(peerId);
    this.peerHealthStatus.delete(peerId);
    this.lastHeartbeats.delete(peerId);
    
    console.log(`Removed peer ${peerId} from network. Reason: ${reason}`);
    this.emit('peerLeft', { ...peer, reason });
  }
  
  selectRandomPeers(count = 1) {
    const availablePeers = Array.from(this.peers.values())
      .filter(peer => this.peerHealthStatus.get(peer.id) === 'healthy');
    
    if (availablePeers.length <= count) {
      return availablePeers;
    }
    
    const selected = [];
    const indices = new Set();
    
    while (selected.length < count && indices.size < availablePeers.length) {
      const index = Math.floor(Math.random() * availablePeers.length);
      if (!indices.has(index)) {
        indices.add(index);
        selected.push(availablePeers[index]);
      }
    }
    
    return selected;
  }
  
  selectRandomPeer() {
    const peers = this.selectRandomPeers(1);
    return peers.length > 0 ? peers[0] : null;
  }
  
  checkPeerHealth() {
    const now = Date.now();
    const peersToRemove = [];
    
    for (const [peerId, lastHeartbeat] of this.lastHeartbeats) {
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      if (timeSinceHeartbeat > this.config.peerTimeout) {
        // Peer is considered failed
        this.peerHealthStatus.set(peerId, 'failed');
        peersToRemove.push(peerId);
      } else if (timeSinceHeartbeat > this.config.peerTimeout * 0.7) {
        // Peer is becoming suspicious
        this.peerHealthStatus.set(peerId, 'suspicious');
      } else {
        this.peerHealthStatus.set(peerId, 'healthy');
      }
    }
    
    // Remove failed peers
    for (const peerId of peersToRemove) {
      this.removePeer(peerId, 'timeout');
    }
  }
  
  async evictOldestPeer() {
    let oldestPeer = null;
    let oldestTime = Date.now();
    
    for (const peer of this.peers.values()) {
      if (peer.addedAt < oldestTime) {
        oldestTime = peer.addedAt;
        oldestPeer = peer;
      }
    }
    
    if (oldestPeer) {
      await this.removePeer(oldestPeer.id, 'eviction');
    }
  }
  
  async requestPeerList(peerId) {
    // Simulate peer list request - in real implementation, this would be a network call
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }
    
    // Return a subset of known peers
    const peerList = Array.from(this.peers.values())
      .filter(p => p.id !== peerId)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        address: p.address,
        port: p.port,
        metadata: p.metadata
      }));
    
    return peerList;
  }
  
  async announcePresence() {
    // Announce our presence to all peers
    const announcement = {
      type: 'peer_announcement',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      metadata: this.getNodeMetadata()
    };
    
    for (const peer of this.peers.values()) {
      try {
        await this.sendToPeer(peer.id, announcement);
      } catch (error) {
        console.error(`Failed to announce presence to ${peer.id}:`, error);
      }
    }
  }
  
  getNodeMetadata() {
    return {
      version: '1.0.0',
      capabilities: ['gossip', 'anti-entropy', 'failure-detection'],
      startTime: Date.now()
    };
  }
  
  async sendToPeer(peerId, message) {
    // Simulate network communication
    // In real implementation, this would send via network transport
    console.log(`Sending message to peer ${peerId}:`, message.type);
    
    // Update last communication time
    this.lastHeartbeats.set(peerId, Date.now());
    
    return Promise.resolve();
  }
  
  updatePeerHeartbeat(peerId) {
    if (this.peers.has(peerId)) {
      this.lastHeartbeats.set(peerId, Date.now());
      this.peerHealthStatus.set(peerId, 'healthy');
      
      const peer = this.peers.get(peerId);
      peer.lastSeen = Date.now();
    }
  }
  
  getPeers() {
    return Array.from(this.peers.values()).map(peer => ({
      ...peer,
      healthStatus: this.peerHealthStatus.get(peer.id),
      lastHeartbeat: this.lastHeartbeats.get(peer.id)
    }));
  }
  
  getHealthyPeers() {
    return this.getPeers().filter(peer => peer.healthStatus === 'healthy');
  }
  
  getPeerCount() {
    return this.peers.size;
  }
  
  getHealthyPeerCount() {
    return this.getHealthyPeers().length;
  }
  
  getTopology() {
    return {
      nodeId: this.nodeId,
      totalPeers: this.getPeerCount(),
      healthyPeers: this.getHealthyPeerCount(),
      peers: this.getPeers(),
      config: {
        maxPeers: this.config.maxPeers,
        minPeers: this.config.minPeers,
        peerTimeout: this.config.peerTimeout
      }
    };
  }
  
  // Network maintenance methods
  async performMaintenance() {
    // Check if we need more peers
    const healthyPeerCount = this.getHealthyPeerCount();
    
    if (healthyPeerCount < this.config.minPeers) {
      await this.requestMorePeers();
    }
    
    // Remove unhealthy peers
    this.checkPeerHealth();
    
    // Update topology
    this.emit('topologyUpdated', this.getTopology());
  }
  
  async requestMorePeers() {
    const peers = this.getHealthyPeers();
    
    for (const peer of peers.slice(0, 3)) { // Ask up to 3 peers
      try {
        const newPeers = await this.requestPeerList(peer.id);
        for (const newPeer of newPeers.slice(0, 5)) { // Add up to 5 new peers from each
          await this.addPeer(newPeer);
        }
      } catch (error) {
        console.error(`Failed to request peers from ${peer.id}:`, error);
      }
    }
  }
}

export default PeerManager;