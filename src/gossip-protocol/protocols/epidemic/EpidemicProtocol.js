/**
 * Epidemic Information Spread Protocol
 * Implements push/pull gossip protocols for efficient information dissemination
 */

import { EventEmitter } from 'events';

export class EpidemicProtocol extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      pushFanout: config.pushFanout || 3,
      pullFanout: config.pullFanout || 3,
      rumorLifetime: config.rumorLifetime || 30000,
      maxRumorAge: config.maxRumorAge || 60000,
      retransmissionProbability: config.retransmissionProbability || 0.8,
      ...config
    };
    
    this.rumors = new Map();
    this.rumorCounters = new Map();
    this.isRunning = false;
    
    // Performance metrics
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransmitted: 0,
      bytesReceived: 0,
      pushRounds: 0,
      pullRounds: 0,
      rumorsSpread: 0,
      duplicatesReceived: 0
    };
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start rumor cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldRumors();
    }, this.config.rumorLifetime);
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.emit('stopped');
  }
  
  // Push Gossip Protocol - Proactive Information Spreading
  async pushMessages(peerId, messages) {
    if (!this.isRunning) return;
    
    try {
      const rumorMessages = this.prepareRumorMessages(messages);
      
      if (rumorMessages.length === 0) return;
      
      const pushPacket = {
        type: 'push',
        senderId: this.nodeId,
        timestamp: Date.now(),
        messages: rumorMessages
      };
      
      await this.sendToPeer(peerId, pushPacket);
      
      // Update metrics
      this.metrics.pushRounds++;
      this.metrics.messagesSent += rumorMessages.length;
      this.metrics.bytesTransmitted += this.estimatePacketSize(pushPacket);
      
      // Update rumor counters for sent messages
      for (const message of rumorMessages) {
        const counter = this.rumorCounters.get(message.id) || 0;
        this.rumorCounters.set(message.id, counter + 1);
      }
      
    } catch (error) {
      console.error(`Failed to push messages to ${peerId}:`, error);
      this.emit('pushError', error, peerId);
    }
  }
  
  // Pull Gossip Protocol - Reactive Information Retrieval
  async pullMessages(peerId, pullRequests) {
    if (!this.isRunning) return;
    
    try {
      const pullPacket = {
        type: 'pull_request',
        senderId: this.nodeId,
        timestamp: Date.now(),
        requests: pullRequests
      };
      
      await this.sendToPeer(peerId, pullPacket);
      
      // Update metrics
      this.metrics.pullRounds++;
      this.metrics.bytesTransmitted += this.estimatePacketSize(pullPacket);
      
    } catch (error) {
      console.error(`Failed to pull messages from ${peerId}:`, error);
      this.emit('pullError', error, peerId);
    }
  }
  
  prepareRumorMessages(messages) {
    const rumors = [];
    
    for (const message of messages) {
      // Check if message should be spread based on retransmission probability
      if (Math.random() <= this.config.retransmissionProbability) {
        const rumor = {
          id: message.id || this.generateMessageId(),
          type: 'rumor',
          payload: message.payload || message,
          senderId: this.nodeId,
          originalSender: message.originalSender || this.nodeId,
          timestamp: message.timestamp || Date.now(),
          hopCount: (message.hopCount || 0) + 1,
          vectorClock: message.vectorClock || {}
        };
        
        // Store rumor locally
        this.rumors.set(rumor.id, rumor);
        rumors.push(rumor);
      }
    }
    
    return rumors;
  }
  
  async handleIncomingMessage(packet, senderId) {
    try {
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += this.estimatePacketSize(packet);
      
      switch (packet.type) {
        case 'push':
          await this.handlePushMessage(packet, senderId);
          break;
        case 'pull_request':
          await this.handlePullRequest(packet, senderId);
          break;
        case 'pull_response':
          await this.handlePullResponse(packet, senderId);
          break;
        default:
          console.warn(`Unknown packet type: ${packet.type}`);
      }
      
    } catch (error) {
      console.error('Error handling incoming message:', error);
      this.emit('messageError', error, packet, senderId);
    }
  }
  
  async handlePushMessage(packet, senderId) {
    const newMessages = [];
    
    for (const message of packet.messages) {
      if (!this.rumors.has(message.id)) {
        // New message - store and forward
        this.rumors.set(message.id, {
          ...message,
          receivedFrom: senderId,
          receivedAt: Date.now()
        });
        
        newMessages.push(message);
        this.metrics.rumorsSpread++;
      } else {
        this.metrics.duplicatesReceived++;
      }
    }
    
    // Emit new messages for application processing
    for (const message of newMessages) {
      this.emit('messageReceived', message, senderId);
    }
    
    // Forward messages to other peers (rumor spreading)
    if (newMessages.length > 0) {
      await this.spreadRumors(newMessages, senderId);
    }
  }
  
  async handlePullRequest(packet, senderId) {
    const requestedMessages = [];
    
    for (const request of packet.requests) {
      const messages = this.findMessagesForRequest(request);
      requestedMessages.push(...messages);
    }
    
    if (requestedMessages.length > 0) {
      const pullResponse = {
        type: 'pull_response',
        senderId: this.nodeId,
        timestamp: Date.now(),
        messages: requestedMessages,
        requestId: packet.requestId
      };
      
      await this.sendToPeer(senderId, pullResponse);
    }
  }
  
  async handlePullResponse(packet, senderId) {
    // Process pulled messages similar to push messages
    await this.handlePushMessage({
      ...packet,
      type: 'push'
    }, senderId);
  }
  
  findMessagesForRequest(request) {
    const messages = [];
    
    switch (request.type) {
      case 'since_timestamp':
        for (const [id, rumor] of this.rumors) {
          if (rumor.timestamp > request.timestamp) {
            messages.push(rumor);
          }
        }
        break;
      case 'by_pattern':
        for (const [id, rumor] of this.rumors) {
          if (this.matchesPattern(rumor, request.pattern)) {
            messages.push(rumor);
          }
        }
        break;
      case 'missing_ids':
        for (const messageId of request.ids) {
          if (this.rumors.has(messageId)) {
            messages.push(this.rumors.get(messageId));
          }
        }
        break;
    }
    
    return messages;
  }
  
  matchesPattern(rumor, pattern) {
    // Simple pattern matching - can be extended
    if (pattern.senderId && rumor.senderId !== pattern.senderId) {
      return false;
    }
    if (pattern.type && rumor.payload?.type !== pattern.type) {
      return false;
    }
    if (pattern.tag && !rumor.payload?.tags?.includes(pattern.tag)) {
      return false;
    }
    return true;
  }
  
  async spreadRumors(rumors, excludePeerId) {
    // Spread rumors to random peers (excluding sender)
    const fanout = Math.min(this.config.pushFanout, this.getPeerCount() - 1);
    const peers = this.selectRandomPeers(fanout, [excludePeerId]);
    
    for (const peer of peers) {
      try {
        await this.pushMessages(peer.id, rumors);
      } catch (error) {
        console.error(`Failed to spread rumors to ${peer.id}:`, error);
      }
    }
  }
  
  cleanupOldRumors() {
    const now = Date.now();
    const toDelete = [];
    
    for (const [id, rumor] of this.rumors) {
      if (now - rumor.timestamp > this.config.maxRumorAge) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => {
      this.rumors.delete(id);
      this.rumorCounters.delete(id);
    });
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old rumors`);
    }
  }
  
  generateMessageId() {
    return `msg-${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  estimatePacketSize(packet) {
    // Rough estimation of packet size in bytes
    return JSON.stringify(packet).length * 2; // Unicode characters are 2 bytes
  }
  
  // Mock peer communication methods (to be replaced with actual network layer)
  async sendToPeer(peerId, packet) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    // In real implementation, this would send via network transport
    console.log(`Epidemic: Sending ${packet.type} to ${peerId}`);
    return Promise.resolve();
  }
  
  selectRandomPeers(count, exclude = []) {
    // Mock peer selection - in real implementation, would use PeerManager
    const mockPeers = [
      { id: 'peer1' }, { id: 'peer2' }, { id: 'peer3' },
      { id: 'peer4' }, { id: 'peer5' }, { id: 'peer6' }
    ].filter(peer => !exclude.includes(peer.id) && peer.id !== this.nodeId);
    
    return mockPeers.slice(0, count);
  }
  
  getPeerCount() {
    // Mock peer count - in real implementation, would use PeerManager
    return 6;
  }
  
  // Public API methods
  async broadcastRumor(payload, metadata = {}) {
    const rumor = {
      id: this.generateMessageId(),
      type: 'rumor',
      payload,
      senderId: this.nodeId,
      originalSender: this.nodeId,
      timestamp: Date.now(),
      hopCount: 0,
      metadata
    };
    
    this.rumors.set(rumor.id, rumor);
    
    // Immediately spread to random peers
    const peers = this.selectRandomPeers(this.config.pushFanout);
    for (const peer of peers) {
      await this.pushMessages(peer.id, [rumor]);
    }
    
    return rumor.id;
  }
  
  getRumorById(rumorId) {
    return this.rumors.get(rumorId);
  }
  
  getAllRumors() {
    return Array.from(this.rumors.values());
  }
  
  getRecentRumors(since = Date.now() - 60000) {
    return Array.from(this.rumors.values())
      .filter(rumor => rumor.timestamp > since);
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeRumors: this.rumors.size,
      averageHopCount: this.calculateAverageHopCount(),
      convergenceRate: this.calculateConvergenceRate()
    };
  }
  
  calculateAverageHopCount() {
    const rumors = Array.from(this.rumors.values());
    if (rumors.length === 0) return 0;
    
    const totalHops = rumors.reduce((sum, rumor) => sum + (rumor.hopCount || 0), 0);
    return totalHops / rumors.length;
  }
  
  calculateConvergenceRate() {
    // Simple convergence rate calculation
    const recentRumors = this.getRecentRumors(Date.now() - 30000);
    return recentRumors.length > 0 ? this.metrics.rumorsSpread / recentRumors.length : 0;
  }
}

export default EpidemicProtocol;