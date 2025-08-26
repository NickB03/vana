/**
 * Gossip Protocol Coordinator
 * 
 * Implements epidemic-style information dissemination for scalable distributed
 * coordination. Supports push/pull gossip variants, topology-aware propagation,
 * and efficient convergence with content filtering.
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export enum GossipType {
  PUSH = 'push',
  PULL = 'pull',
  PUSH_PULL = 'push_pull'
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface GossipMessage {
  id: string;
  type: string;
  payload: any;
  version: number;
  timestamp: number;
  ttl: number;
  priority: MessagePriority;
  sourceNodeId: string;
  path: string[]; // Nodes that have seen this message
  hash: string;
  signature?: Buffer;
  bloomFilter?: Buffer; // For efficient duplicate detection
}

export interface GossipPeer {
  nodeId: string;
  address: string;
  lastSeen: number;
  latency: number;
  reliability: number; // 0-1 score based on successful exchanges
  bandwidth: number; // Estimated bandwidth
  connectionQuality: number; // Composite score
  region?: string;
  capabilities: string[];
  isOnline: boolean;
  failureCount: number;
}

export interface GossipRound {
  roundId: string;
  timestamp: number;
  type: GossipType;
  selectedPeers: string[];
  messagesExchanged: number;
  latency: number;
  success: boolean;
  errors: string[];
}

export interface GossipConfiguration {
  fanout: number; // Number of peers to gossip with per round
  interval: number; // Milliseconds between gossip rounds
  maxMessageAge: number; // Maximum age of messages to keep
  maxMessageSize: number; // Maximum size of individual messages
  maxBatchSize: number; // Maximum messages per gossip exchange
  duplicateDetectionWindow: number; // Time window for duplicate detection
  compressionThreshold: number; // Compress messages larger than this
  adaptiveParameters: boolean; // Adjust parameters based on network conditions
  topologyAware: boolean; // Use network topology for peer selection
  enableBloomFilters: boolean; // Use Bloom filters for duplicate detection
  retransmissionCount: number; // How many times to retry failed transmissions
}

export interface AntiEntropySession {
  sessionId: string;
  peerId: string;
  startTime: number;
  myDigest: Map<string, number>; // message_id -> version
  peerDigest: Map<string, number>;
  deltaMessages: GossipMessage[];
  completed: boolean;
}

export class GossipCoordinator extends EventEmitter {
  private nodeId: string;
  private peers: Map<string, GossipPeer> = new Map();
  private messages: Map<string, GossipMessage> = new Map();
  private messageHistory: Map<string, { timestamp: number; version: number }> = new Map();
  private configuration: GossipConfiguration;
  
  // Gossip state
  private gossipTimer: NodeJS.Timeout | null = null;
  private currentRound: number = 0;
  private recentRounds: GossipRound[] = [];
  
  // Anti-entropy sessions
  private antiEntropySessions: Map<string, AntiEntropySession> = new Map();
  
  // Bloom filters for duplicate detection
  private bloomFilters: Map<string, Buffer> = new Map();
  private bloomFilterSize: number = 1000; // bits
  
  // Performance metrics
  private totalMessagesProcessed: number = 0;
  private totalBytesTransmitted: number = 0;
  private averageConvergenceTime: number = 0;
  private duplicateMessageCount: number = 0;
  
  // Network topology
  private networkRegions: Map<string, string[]> = new Map();
  private peerLatencies: Map<string, number> = new Map();

  constructor(nodeId: string, configuration: GossipConfiguration) {
    super();
    this.nodeId = nodeId;
    this.configuration = configuration;
    
    this.startGossipRounds();
    this.startMessageCleanup();
    this.startPerformanceMonitoring();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      configuration: this.configuration
    });
  }

  /**
   * Add a peer to the gossip network
   */
  addPeer(peer: GossipPeer): void {
    this.peers.set(peer.nodeId, {
      ...peer,
      lastSeen: Date.now(),
      failureCount: 0,
      reliability: 1.0,
      connectionQuality: this.calculateConnectionQuality(peer)
    });
    
    // Update network topology
    if (peer.region) {
      if (!this.networkRegions.has(peer.region)) {
        this.networkRegions.set(peer.region, []);
      }
      this.networkRegions.get(peer.region)!.push(peer.nodeId);
    }
    
    this.emit('peer_added', {
      peerId: peer.nodeId,
      region: peer.region,
      totalPeers: this.peers.size
    });
  }

  /**
   * Remove a peer from the gossip network
   */
  removePeer(nodeId: string): boolean {
    const peer = this.peers.get(nodeId);
    if (!peer) return false;
    
    this.peers.delete(nodeId);
    
    // Clean up from network regions
    if (peer.region) {
      const regionPeers = this.networkRegions.get(peer.region);
      if (regionPeers) {
        const index = regionPeers.indexOf(nodeId);
        if (index !== -1) {
          regionPeers.splice(index, 1);
        }
      }
    }
    
    // Clean up ongoing sessions
    this.antiEntropySessions.delete(nodeId);
    
    this.emit('peer_removed', {
      peerId: nodeId,
      reason: 'manual_removal',
      totalPeers: this.peers.size
    });
    
    return true;
  }

  /**
   * Broadcast a message through the gossip network
   */
  broadcast(
    type: string, 
    payload: any, 
    priority: MessagePriority = MessagePriority.NORMAL,
    ttl: number = 300000 // 5 minutes default TTL
  ): string {
    const messageId = this.generateMessageId();
    const message: GossipMessage = {
      id: messageId,
      type,
      payload,
      version: 1,
      timestamp: Date.now(),
      ttl,
      priority,
      sourceNodeId: this.nodeId,
      path: [this.nodeId],
      hash: this.calculateMessageHash(type, payload)
    };
    
    // Add to local message store
    this.messages.set(messageId, message);
    this.messageHistory.set(messageId, {
      timestamp: message.timestamp,
      version: message.version
    });
    
    this.totalMessagesProcessed++;
    
    this.emit('message_broadcast', {
      messageId,
      type,
      priority,
      timestamp: message.timestamp
    });
    
    // Start immediate propagation for high priority messages
    if (priority === MessagePriority.HIGH || priority === MessagePriority.URGENT) {
      this.propagateMessage(message);
    }
    
    return messageId;
  }

  /**
   * Receive and process a gossip message from a peer
   */
  async receiveMessage(message: GossipMessage, fromPeerId: string): Promise<boolean> {
    // Update peer last seen
    const peer = this.peers.get(fromPeerId);
    if (peer) {
      peer.lastSeen = Date.now();
    }
    
    // Check if message is expired
    if (Date.now() - message.timestamp > message.ttl) {
      this.emit('message_expired', {
        messageId: message.id,
        age: Date.now() - message.timestamp,
        ttl: message.ttl
      });
      return false;
    }
    
    // Check for duplicates
    if (this.isDuplicateMessage(message)) {
      this.duplicateMessageCount++;
      this.emit('duplicate_message', {
        messageId: message.id,
        fromPeerId
      });
      return false;
    }
    
    // Validate message integrity
    if (!this.validateMessage(message)) {
      this.emit('invalid_message', {
        messageId: message.id,
        fromPeerId,
        reason: 'validation_failed'
      });
      return false;
    }
    
    // Add to message store
    this.messages.set(message.id, message);
    this.messageHistory.set(message.id, {
      timestamp: message.timestamp,
      version: message.version
    });
    
    // Update path to prevent loops
    if (!message.path.includes(this.nodeId)) {
      message.path.push(this.nodeId);
    }
    
    this.totalMessagesProcessed++;
    
    this.emit('message_received', {
      messageId: message.id,
      type: message.type,
      fromPeerId,
      pathLength: message.path.length,
      priority: message.priority
    });
    
    // Continue propagation
    await this.propagateMessage(message, fromPeerId);
    
    return true;
  }

  /**
   * Perform a single gossip round
   */
  async performGossipRound(type: GossipType = GossipType.PUSH_PULL): Promise<GossipRound> {
    const roundId = `round-${++this.currentRound}-${Date.now()}`;
    const startTime = Date.now();
    
    // Select peers for this round
    const selectedPeers = this.selectGossipPeers();
    
    let messagesExchanged = 0;
    const errors: string[] = [];
    let success = true;
    
    try {
      // Execute gossip with each selected peer
      const gossipPromises = selectedPeers.map(async (peerId) => {
        try {
          const result = await this.gossipWithPeer(peerId, type);
          messagesExchanged += result.messagesExchanged;
          return result;
        } catch (error) {
          errors.push(`${peerId}: ${error}`);
          success = false;
          return { messagesExchanged: 0 };
        }
      });
      
      await Promise.all(gossipPromises);
      
    } catch (error) {
      errors.push(`Round failed: ${error}`);
      success = false;
    }
    
    const latency = Date.now() - startTime;
    
    const round: GossipRound = {
      roundId,
      timestamp: startTime,
      type,
      selectedPeers,
      messagesExchanged,
      latency,
      success,
      errors
    };
    
    // Store round history
    this.recentRounds.push(round);
    if (this.recentRounds.length > 100) {
      this.recentRounds.shift();
    }
    
    this.emit('gossip_round_completed', round);
    
    return round;
  }

  /**
   * Start anti-entropy session with a peer
   */
  async startAntiEntropy(peerId: string): Promise<boolean> {
    if (this.antiEntropySessions.has(peerId)) {
      return false; // Session already in progress
    }
    
    const sessionId = `anti-entropy-${this.nodeId}-${peerId}-${Date.now()}`;
    
    // Create digest of our messages
    const myDigest = new Map<string, number>();
    for (const [messageId, message] of this.messages) {
      myDigest.set(messageId, message.version);
    }
    
    const session: AntiEntropySession = {
      sessionId,
      peerId,
      startTime: Date.now(),
      myDigest,
      peerDigest: new Map(),
      deltaMessages: [],
      completed: false
    };
    
    this.antiEntropySessions.set(peerId, session);
    
    try {
      // Send our digest to peer
      this.emit('anti_entropy_request', {
        sessionId,
        peerId,
        digest: Array.from(myDigest.entries())
      });
      
      return true;
    } catch (error) {
      this.antiEntropySessions.delete(peerId);
      this.emit('anti_entropy_error', {
        sessionId,
        peerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Handle anti-entropy response from peer
   */
  async handleAntiEntropyResponse(
    peerId: string,
    peerDigest: Array<[string, number]>,
    deltaMessages: GossipMessage[]
  ): Promise<void> {
    const session = this.antiEntropySessions.get(peerId);
    if (!session) {
      return; // No active session
    }
    
    session.peerDigest = new Map(peerDigest);
    session.deltaMessages = deltaMessages;
    
    // Process received messages
    for (const message of deltaMessages) {
      await this.receiveMessage(message, peerId);
    }
    
    // Determine what we need to send to peer
    const messagesToSend: GossipMessage[] = [];
    
    for (const [messageId, myVersion] of session.myDigest) {
      const peerVersion = session.peerDigest.get(messageId) || 0;
      
      if (myVersion > peerVersion) {
        const message = this.messages.get(messageId);
        if (message) {
          messagesToSend.push(message);
        }
      }
    }
    
    // Send delta to peer
    this.emit('anti_entropy_response', {
      sessionId: session.sessionId,
      peerId,
      deltaMessages: messagesToSend
    });
    
    session.completed = true;
    
    const duration = Date.now() - session.startTime;
    this.emit('anti_entropy_completed', {
      sessionId: session.sessionId,
      peerId,
      duration,
      messagesReceived: deltaMessages.length,
      messagesSent: messagesToSend.length
    });
    
    this.antiEntropySessions.delete(peerId);
  }

  /**
   * Private helper methods
   */

  private selectGossipPeers(): string[] {
    const availablePeers = Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.isOnline && Date.now() - peer.lastSeen < 60000)
      .sort(([_, a], [__, b]) => this.comparePeers(a, b));
    
    let fanout = this.configuration.fanout;
    
    // Adaptive fanout based on network size
    if (this.configuration.adaptiveParameters) {
      const networkSize = this.peers.size;
      if (networkSize < 10) {
        fanout = Math.min(fanout, Math.ceil(networkSize / 2));
      } else if (networkSize > 100) {
        fanout = Math.min(fanout, Math.ceil(Math.log2(networkSize)) + 2);
      }
    }
    
    const selectedPeers: string[] = [];
    
    if (this.configuration.topologyAware) {
      // Topology-aware selection
      selectedPeers.push(...this.selectTopologyAwarePeers(availablePeers, fanout));
    } else {
      // Random selection with quality bias
      const peerCount = Math.min(fanout, availablePeers.length);
      for (let i = 0; i < peerCount; i++) {
        // Weighted random selection based on connection quality
        const peer = this.weightedRandomSelection(availablePeers);
        if (peer && !selectedPeers.includes(peer[0])) {
          selectedPeers.push(peer[0]);
        }
      }
    }
    
    return selectedPeers;
  }

  private selectTopologyAwarePeers(
    availablePeers: Array<[string, GossipPeer]>, 
    fanout: number
  ): string[] {
    const selected: string[] = [];
    const peersByRegion = new Map<string, Array<[string, GossipPeer]>>();
    
    // Group peers by region
    for (const [peerId, peer] of availablePeers) {
      const region = peer.region || 'default';
      if (!peersByRegion.has(region)) {
        peersByRegion.set(region, []);
      }
      peersByRegion.get(region)!.push([peerId, peer]);
    }
    
    // Select peers from different regions first
    const regions = Array.from(peersByRegion.keys());
    let regionIndex = 0;
    
    while (selected.length < fanout && regions.length > 0) {
      const region = regions[regionIndex % regions.length];
      const regionPeers = peersByRegion.get(region)!;
      
      if (regionPeers.length > 0) {
        // Select best peer from this region
        const bestPeer = regionPeers.reduce((best, current) => 
          this.comparePeers(current[1], best[1]) < 0 ? current : best
        );
        
        selected.push(bestPeer[0]);
        
        // Remove selected peer from available list
        const index = regionPeers.indexOf(bestPeer);
        regionPeers.splice(index, 1);
        
        if (regionPeers.length === 0) {
          regions.splice(regions.indexOf(region), 1);
        }
      }
      
      regionIndex++;
    }
    
    // Fill remaining slots with best available peers
    while (selected.length < fanout && availablePeers.length > 0) {
      const bestPeer = availablePeers.find(([peerId]) => !selected.includes(peerId));
      if (bestPeer) {
        selected.push(bestPeer[0]);
        availablePeers.splice(availablePeers.indexOf(bestPeer), 1);
      } else {
        break;
      }
    }
    
    return selected;
  }

  private async gossipWithPeer(
    peerId: string,
    type: GossipType
  ): Promise<{ messagesExchanged: number }> {
    let messagesExchanged = 0;
    
    try {
      switch (type) {
        case GossipType.PUSH:
          messagesExchanged = await this.pushGossip(peerId);
          break;
        case GossipType.PULL:
          messagesExchanged = await this.pullGossip(peerId);
          break;
        case GossipType.PUSH_PULL:
          const pushCount = await this.pushGossip(peerId);
          const pullCount = await this.pullGossip(peerId);
          messagesExchanged = pushCount + pullCount;
          break;
      }
      
      // Update peer reliability
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.reliability = Math.min(1.0, peer.reliability + 0.01);
        peer.connectionQuality = this.calculateConnectionQuality(peer);
      }
      
    } catch (error) {
      // Update peer failure count
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.failureCount++;
        peer.reliability = Math.max(0.0, peer.reliability - 0.05);
        peer.connectionQuality = this.calculateConnectionQuality(peer);
      }
      
      throw error;
    }
    
    return { messagesExchanged };
  }

  private async pushGossip(peerId: string): Promise<number> {
    // Select messages to push
    const messagesToPush = this.selectMessagesToShare(peerId);
    
    if (messagesToPush.length === 0) {
      return 0;
    }
    
    // Emit push event for network layer
    this.emit('push_gossip', {
      peerId,
      messages: messagesToPush,
      messageCount: messagesToPush.length
    });
    
    return messagesToPush.length;
  }

  private async pullGossip(peerId: string): Promise<number> {
    // Create digest of our messages
    const digest = Array.from(this.messageHistory.entries()).map(([id, info]) => ({
      id,
      version: info.version,
      timestamp: info.timestamp
    }));
    
    // Emit pull request for network layer
    this.emit('pull_gossip_request', {
      peerId,
      digest
    });
    
    // This would be completed when we receive the response
    return 0; // Placeholder
  }

  private selectMessagesToShare(peerId: string): GossipMessage[] {
    const now = Date.now();
    const maxAge = this.configuration.maxMessageAge;
    const maxBatch = this.configuration.maxBatchSize;
    
    // Get recent, relevant messages
    const candidates = Array.from(this.messages.values())
      .filter(msg => {
        // Check age
        if (now - msg.timestamp > maxAge) return false;
        
        // Don't send back to source
        if (msg.sourceNodeId === peerId) return false;
        
        // Don't send if peer was in path
        if (msg.path.includes(peerId)) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by priority and recency
        if (a.priority !== b.priority) {
          return this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
        }
        return b.timestamp - a.timestamp;
      });
    
    return candidates.slice(0, maxBatch);
  }

  private async propagateMessage(message: GossipMessage, excludePeerId?: string): Promise<void> {
    // Select peers for propagation
    const availablePeers = Array.from(this.peers.keys())
      .filter(peerId => {
        if (peerId === excludePeerId) return false;
        if (message.path.includes(peerId)) return false;
        
        const peer = this.peers.get(peerId);
        return peer && peer.isOnline;
      });
    
    // Determine propagation fanout based on message priority
    let propagationFanout = Math.ceil(this.configuration.fanout * 0.5);
    
    switch (message.priority) {
      case MessagePriority.URGENT:
        propagationFanout = Math.min(availablePeers.length, this.configuration.fanout * 2);
        break;
      case MessagePriority.HIGH:
        propagationFanout = this.configuration.fanout;
        break;
      case MessagePriority.LOW:
        propagationFanout = Math.ceil(this.configuration.fanout * 0.3);
        break;
    }
    
    // Select peers
    const selectedPeers = availablePeers
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, propagationFanout);
    
    // Emit propagation events
    for (const peerId of selectedPeers) {
      this.emit('propagate_message', {
        messageId: message.id,
        peerId,
        priority: message.priority
      });
    }
  }

  private isDuplicateMessage(message: GossipMessage): boolean {
    const existingMessage = this.messages.get(message.id);
    if (!existingMessage) return false;
    
    // Check if we have a newer version
    return existingMessage.version >= message.version;
  }

  private validateMessage(message: GossipMessage): boolean {
    // Validate message structure
    if (!message.id || !message.type || !message.sourceNodeId) {
      return false;
    }
    
    // Validate hash
    const calculatedHash = this.calculateMessageHash(message.type, message.payload);
    if (message.hash !== calculatedHash) {
      return false;
    }
    
    // Additional validation rules can be added here
    return true;
  }

  private calculateMessageHash(type: string, payload: any): string {
    const content = JSON.stringify({ type, payload });
    return createHash('sha256').update(content).digest('hex');
  }

  private generateMessageId(): string {
    return `${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateConnectionQuality(peer: GossipPeer): number {
    const latencyScore = Math.max(0, 1 - (peer.latency / 5000)); // Normalize to 5 seconds
    const reliabilityScore = peer.reliability;
    const bandwidthScore = Math.min(1, peer.bandwidth / 1000000); // Normalize to 1MB/s
    const recentnessScore = Math.max(0, 1 - ((Date.now() - peer.lastSeen) / 300000)); // 5 minutes
    
    return (latencyScore * 0.3 + reliabilityScore * 0.4 + bandwidthScore * 0.2 + recentnessScore * 0.1);
  }

  private comparePeers(a: GossipPeer, b: GossipPeer): number {
    return b.connectionQuality - a.connectionQuality;
  }

  private weightedRandomSelection(peers: Array<[string, GossipPeer]>): [string, GossipPeer] | null {
    if (peers.length === 0) return null;
    
    const totalQuality = peers.reduce((sum, [_, peer]) => sum + peer.connectionQuality, 0);
    if (totalQuality === 0) return peers[Math.floor(Math.random() * peers.length)];
    
    let random = Math.random() * totalQuality;
    
    for (const peer of peers) {
      random -= peer[1].connectionQuality;
      if (random <= 0) {
        return peer;
      }
    }
    
    return peers[peers.length - 1];
  }

  private getPriorityValue(priority: MessagePriority): number {
    switch (priority) {
      case MessagePriority.URGENT: return 4;
      case MessagePriority.HIGH: return 3;
      case MessagePriority.NORMAL: return 2;
      case MessagePriority.LOW: return 1;
      default: return 2;
    }
  }

  private startGossipRounds(): void {
    this.gossipTimer = setInterval(async () => {
      try {
        await this.performGossipRound();
      } catch (error) {
        this.emit('gossip_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      }
    }, this.configuration.interval);
  }

  private startMessageCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000); // Every minute
  }

  private cleanupExpiredMessages(): void {
    const now = Date.now();
    const maxAge = this.configuration.maxMessageAge;
    let cleanedCount = 0;
    
    for (const [messageId, message] of this.messages) {
      if (now - message.timestamp > maxAge) {
        this.messages.delete(messageId);
        this.messageHistory.delete(messageId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.emit('messages_cleaned', {
        cleanedCount,
        remainingMessages: this.messages.size
      });
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  private updatePerformanceMetrics(): void {
    // Calculate average convergence time from recent rounds
    if (this.recentRounds.length > 0) {
      const successfulRounds = this.recentRounds.filter(r => r.success);
      if (successfulRounds.length > 0) {
        this.averageConvergenceTime = successfulRounds
          .reduce((sum, round) => sum + round.latency, 0) / successfulRounds.length;
      }
    }
    
    // Emit metrics
    this.emit('performance_metrics', this.getMetrics());
  }

  /**
   * Public API methods
   */

  public getMetrics(): {
    totalMessagesProcessed: number;
    totalBytesTransmitted: number;
    averageConvergenceTime: number;
    duplicateMessageCount: number;
    activePeers: number;
    successfulRounds: number;
    messageStoreSize: number;
  } {
    const successfulRounds = this.recentRounds.filter(r => r.success).length;
    
    return {
      totalMessagesProcessed: this.totalMessagesProcessed,
      totalBytesTransmitted: this.totalBytesTransmitted,
      averageConvergenceTime: this.averageConvergenceTime,
      duplicateMessageCount: this.duplicateMessageCount,
      activePeers: Array.from(this.peers.values()).filter(p => p.isOnline).length,
      successfulRounds,
      messageStoreSize: this.messages.size
    };
  }

  public getPeerStatus(): Array<{
    nodeId: string;
    isOnline: boolean;
    lastSeen: number;
    reliability: number;
    connectionQuality: number;
    region?: string;
  }> {
    return Array.from(this.peers.values()).map(peer => ({
      nodeId: peer.nodeId,
      isOnline: peer.isOnline,
      lastSeen: peer.lastSeen,
      reliability: peer.reliability,
      connectionQuality: peer.connectionQuality,
      region: peer.region
    }));
  }

  public getRecentRounds(count: number = 10): GossipRound[] {
    return this.recentRounds.slice(-count);
  }

  public updateConfiguration(updates: Partial<GossipConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates };
    
    // Restart timer if interval changed
    if (updates.interval && this.gossipTimer) {
      clearInterval(this.gossipTimer);
      this.startGossipRounds();
    }
    
    this.emit('configuration_updated', {
      updates,
      newConfiguration: this.configuration
    });
  }

  public shutdown(): void {
    if (this.gossipTimer) {
      clearInterval(this.gossipTimer);
    }
    
    // Complete any ongoing anti-entropy sessions
    for (const session of this.antiEntropySessions.values()) {
      session.completed = true;
    }
    
    this.emit('shutdown', {
      finalMetrics: this.getMetrics(),
      messageCount: this.messages.size,
      peerCount: this.peers.size
    });
  }
}

export default GossipCoordinator;