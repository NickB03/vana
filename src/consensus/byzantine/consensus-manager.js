/**
 * Byzantine Consensus Coordinator
 * 
 * Coordinates Byzantine fault-tolerant consensus protocols ensuring system integrity
 * and reliability in the presence of malicious actors.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class ByzantineConsensusManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeId = options.nodeId || this.generateNodeId();
    this.nodes = new Map(); // Active nodes in the network
    this.maliciousNodes = new Set(); // Detected Byzantine nodes
    this.viewNumber = 0;
    this.sequenceNumber = 0;
    this.primaryNode = null;
    
    // PBFT Configuration
    this.f = options.maxFaults || 1; // Maximum Byzantine faults tolerated
    this.n = options.totalNodes || 4; // Total nodes (must be >= 3f + 1)
    this.quorumSize = Math.floor((this.n + this.f) / 2) + 1;
    
    // Message stores for PBFT phases
    this.preprepareMessages = new Map();
    this.prepareMessages = new Map();
    this.commitMessages = new Map();
    this.checkpointMessages = new Map();
    
    // Security components
    this.messageDigests = new Map();
    this.signatures = new Map();
    this.sequenceHistory = new Map();
    
    // Network resilience
    this.networkPartitions = new Set();
    this.lastHeartbeat = new Map();
    this.recoveryQueue = [];
    
    this.initialize();
  }

  initialize() {
    console.log(`🛡️  Initializing Byzantine Consensus Manager (Node: ${this.nodeId})`);
    console.log(`📊 Network: ${this.n} nodes, tolerating ${this.f} faults, quorum: ${this.quorumSize}`);
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Initialize cryptographic components
    this.initializeCryptography();
    
    // Set up message handlers
    this.setupMessageHandlers();
    
    this.emit('initialized', { nodeId: this.nodeId, configuration: this.getConfiguration() });
  }

  generateNodeId() {
    return crypto.randomBytes(8).toString('hex');
  }

  getConfiguration() {
    return {
      nodeId: this.nodeId,
      totalNodes: this.n,
      maxFaults: this.f,
      quorumSize: this.quorumSize,
      viewNumber: this.viewNumber,
      primaryNode: this.primaryNode,
      activeNodes: this.nodes.size,
      maliciousNodes: this.maliciousNodes.size
    };
  }

  // PBFT Protocol Implementation
  
  /**
   * Phase 1: Pre-prepare - Primary broadcasts request to all replicas
   */
  async prePrepare(request, clientId) {
    if (!this.isPrimary()) {
      throw new Error('Only primary can initiate pre-prepare phase');
    }

    const sequenceNumber = ++this.sequenceNumber;
    const digest = this.computeDigest(request);
    
    const preprepareMessage = {
      type: 'PREPREPARE',
      viewNumber: this.viewNumber,
      sequenceNumber,
      digest,
      request,
      clientId,
      timestamp: Date.now(),
      nodeId: this.nodeId
    };

    // Sign the message
    const signature = this.signMessage(preprepareMessage);
    preprepareMessage.signature = signature;

    // Store locally
    this.preprepareMessages.set(sequenceNumber, preprepareMessage);
    
    console.log(`🚀 Pre-prepare phase initiated (seq: ${sequenceNumber}, digest: ${digest.substring(0, 8)})`);
    
    // Broadcast to all backup nodes
    await this.broadcastToBackups(preprepareMessage);
    
    // Auto-proceed to prepare phase for primary
    await this.prepare(preprepareMessage);
    
    return preprepareMessage;
  }

  /**
   * Phase 2: Prepare - Backup nodes broadcast prepare messages
   */
  async prepare(preprepareMessage) {
    const { viewNumber, sequenceNumber, digest } = preprepareMessage;
    
    // Validate pre-prepare message
    if (!this.validatePreprepareMessage(preprepareMessage)) {
      console.warn(`❌ Invalid pre-prepare message (seq: ${sequenceNumber})`);
      return false;
    }

    const prepareMessage = {
      type: 'PREPARE',
      viewNumber,
      sequenceNumber,
      digest,
      nodeId: this.nodeId,
      timestamp: Date.now()
    };

    const signature = this.signMessage(prepareMessage);
    prepareMessage.signature = signature;

    // Store locally
    if (!this.prepareMessages.has(sequenceNumber)) {
      this.prepareMessages.set(sequenceNumber, new Map());
    }
    this.prepareMessages.get(sequenceNumber).set(this.nodeId, prepareMessage);

    console.log(`📝 Prepare phase (seq: ${sequenceNumber}, node: ${this.nodeId})`);

    // Broadcast to all nodes
    await this.broadcastToAll(prepareMessage);

    // Check if we have enough prepare messages to proceed to commit
    await this.checkPreparePhaseCompletion(sequenceNumber);
    
    return true;
  }

  /**
   * Phase 3: Commit - Nodes broadcast commit messages after receiving 2f prepare messages
   */
  async commit(sequenceNumber, digest) {
    const commitMessage = {
      type: 'COMMIT',
      viewNumber: this.viewNumber,
      sequenceNumber,
      digest,
      nodeId: this.nodeId,
      timestamp: Date.now()
    };

    const signature = this.signMessage(commitMessage);
    commitMessage.signature = signature;

    // Store locally
    if (!this.commitMessages.has(sequenceNumber)) {
      this.commitMessages.set(sequenceNumber, new Map());
    }
    this.commitMessages.get(sequenceNumber).set(this.nodeId, commitMessage);

    console.log(`✅ Commit phase (seq: ${sequenceNumber}, node: ${this.nodeId})`);

    // Broadcast to all nodes
    await this.broadcastToAll(commitMessage);

    // Check if we have enough commit messages to execute
    await this.checkCommitPhaseCompletion(sequenceNumber);
    
    return true;
  }

  // Malicious Actor Detection
  
  detectByzantineBehavior(nodeId, message, evidence) {
    console.log(`🔍 Analyzing potential Byzantine behavior from node: ${nodeId}`);
    
    const suspiciousPatterns = [
      this.detectDoubleVoting(nodeId, message),
      this.detectInconsistentMessages(nodeId, message),
      this.detectTimingAttacks(nodeId, message),
      this.detectSignatureForging(nodeId, message),
      this.detectViewChangeManipulation(nodeId, message)
    ];

    const byzantineScore = suspiciousPatterns.reduce((score, detected) => 
      score + (detected ? 1 : 0), 0
    );

    if (byzantineScore >= 2) {
      this.markNodeAsMalicious(nodeId, evidence);
      return true;
    }

    return false;
  }

  detectDoubleVoting(nodeId, message) {
    const { sequenceNumber, type } = message;
    
    if (type === 'PREPARE' || type === 'COMMIT') {
      const existingMessages = this[`${type.toLowerCase()}Messages`].get(sequenceNumber);
      if (existingMessages && existingMessages.has(nodeId)) {
        const existing = existingMessages.get(nodeId);
        if (existing.digest !== message.digest) {
          console.warn(`⚠️  Double voting detected from ${nodeId} (seq: ${sequenceNumber})`);
          return true;
        }
      }
    }
    
    return false;
  }

  detectInconsistentMessages(nodeId, message) {
    // Check for messages that contradict previous messages from the same node
    const history = this.sequenceHistory.get(nodeId) || [];
    
    for (const prevMessage of history) {
      if (this.messagesContradict(message, prevMessage)) {
        console.warn(`⚠️  Inconsistent messages detected from ${nodeId}`);
        return true;
      }
    }
    
    return false;
  }

  detectTimingAttacks(nodeId, message) {
    const now = Date.now();
    const messageTime = message.timestamp;
    const timeDrift = Math.abs(now - messageTime);
    
    // Detect messages with suspicious timing (too old or from future)
    if (timeDrift > 300000) { // 5 minutes
      console.warn(`⚠️  Timing attack detected from ${nodeId} (drift: ${timeDrift}ms)`);
      return true;
    }
    
    return false;
  }

  detectSignatureForging(nodeId, message) {
    try {
      return !this.verifyMessageSignature(message, nodeId);
    } catch (error) {
      console.warn(`⚠️  Signature verification failed for ${nodeId}: ${error.message}`);
      return true;
    }
  }

  detectViewChangeManipulation(nodeId, message) {
    if (message.type === 'VIEW_CHANGE') {
      // Check if view change is justified
      const isJustified = this.isViewChangeJustified(message);
      if (!isJustified) {
        console.warn(`⚠️  Unjustified view change from ${nodeId}`);
        return true;
      }
    }
    
    return false;
  }

  markNodeAsMalicious(nodeId, evidence) {
    if (!this.maliciousNodes.has(nodeId)) {
      this.maliciousNodes.add(nodeId);
      console.error(`🚨 Node ${nodeId} marked as Byzantine! Evidence: ${JSON.stringify(evidence)}`);
      
      // Remove from active nodes
      this.nodes.delete(nodeId);
      
      // Emit event for other components
      this.emit('maliciousNodeDetected', { nodeId, evidence, timestamp: Date.now() });
      
      // Trigger view change if primary is malicious
      if (nodeId === this.primaryNode) {
        this.initiateViewChange('Primary node detected as malicious');
      }
    }
  }

  // View Change Coordination
  
  async initiateViewChange(reason) {
    console.log(`🔄 Initiating view change: ${reason}`);
    
    const newViewNumber = this.viewNumber + 1;
    
    const viewChangeMessage = {
      type: 'VIEW_CHANGE',
      newViewNumber,
      lastSequenceNumber: this.sequenceNumber,
      checkpointProof: this.generateCheckpointProof(),
      preparedRequests: this.getPreparedRequests(),
      nodeId: this.nodeId,
      reason,
      timestamp: Date.now()
    };

    const signature = this.signMessage(viewChangeMessage);
    viewChangeMessage.signature = signature;

    // Broadcast view change message
    await this.broadcastToAll(viewChangeMessage);
    
    // Update local view
    this.viewNumber = newViewNumber;
    this.selectNewPrimary();
    
    this.emit('viewChanged', { 
      oldView: this.viewNumber - 1, 
      newView: this.viewNumber, 
      newPrimary: this.primaryNode,
      reason 
    });
  }

  selectNewPrimary() {
    // Primary selection algorithm: (viewNumber mod |activeNodes|)
    const activeNodeIds = Array.from(this.nodes.keys()).filter(id => !this.maliciousNodes.has(id));
    if (activeNodeIds.length === 0) {
      throw new Error('No non-malicious nodes available for primary selection');
    }
    
    const primaryIndex = this.viewNumber % activeNodeIds.length;
    this.primaryNode = activeNodeIds[primaryIndex];
    
    console.log(`👑 New primary selected: ${this.primaryNode} (view: ${this.viewNumber})`);
  }

  // Attack Mitigation
  
  mitigateDoSAttack() {
    console.log('🛡️  Implementing DoS attack mitigation');
    
    // Rate limiting implementation
    const rateLimits = new Map();
    const now = Date.now();
    
    for (const [nodeId, node] of this.nodes) {
      if (!rateLimits.has(nodeId)) {
        rateLimits.set(nodeId, { count: 0, window: now });
      }
      
      const limit = rateLimits.get(nodeId);
      if (now - limit.window > 60000) { // 1 minute window
        limit.count = 0;
        limit.window = now;
      }
      
      if (limit.count > 100) { // Max 100 messages per minute
        console.warn(`⚠️  Rate limit exceeded for node ${nodeId}`);
        this.temporarilyIsolateNode(nodeId, 'Rate limit exceeded');
      }
    }
  }

  mitigateReplayAttack(message) {
    const messageHash = this.computeDigest(message);
    const key = `${message.nodeId}-${messageHash}`;
    
    if (this.messageDigests.has(key)) {
      console.warn(`⚠️  Replay attack detected from ${message.nodeId}`);
      return false;
    }
    
    this.messageDigests.set(key, Date.now());
    
    // Cleanup old digests (prevent memory leaks)
    this.cleanupOldDigests();
    
    return true;
  }

  temporarilyIsolateNode(nodeId, reason) {
    console.log(`🚫 Temporarily isolating node ${nodeId}: ${reason}`);
    
    // Remove from active participation for 5 minutes
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isolated = true;
      node.isolationReason = reason;
      node.isolationEnd = Date.now() + 300000; // 5 minutes
      
      setTimeout(() => {
        if (this.nodes.has(nodeId)) {
          this.nodes.get(nodeId).isolated = false;
          console.log(`✅ Node ${nodeId} reintegrated after isolation`);
        }
      }, 300000);
    }
  }

  // Network Resilience
  
  detectNetworkPartition() {
    const now = Date.now();
    const partitionedNodes = [];
    
    for (const [nodeId, lastSeen] of this.lastHeartbeat) {
      if (now - lastSeen > 30000) { // 30 second timeout
        partitionedNodes.push(nodeId);
      }
    }
    
    if (partitionedNodes.length > 0) {
      console.warn(`🌐 Network partition detected. Unreachable nodes: ${partitionedNodes.join(', ')}`);
      this.handleNetworkPartition(partitionedNodes);
    }
  }

  handleNetworkPartition(partitionedNodes) {
    for (const nodeId of partitionedNodes) {
      this.networkPartitions.add(nodeId);
      
      // Adjust quorum size if needed
      const activeNodes = this.nodes.size - this.networkPartitions.size - this.maliciousNodes.size;
      if (activeNodes < this.quorumSize) {
        console.warn(`⚠️  Active nodes (${activeNodes}) below quorum threshold (${this.quorumSize})`);
        this.adjustQuorumForPartition();
      }
    }
  }

  adjustQuorumForPartition() {
    const activeNodes = this.nodes.size - this.networkPartitions.size - this.maliciousNodes.size;
    const newQuorumSize = Math.max(Math.floor(activeNodes / 2) + 1, 1);
    
    console.log(`📊 Adjusting quorum size: ${this.quorumSize} → ${newQuorumSize}`);
    this.quorumSize = newQuorumSize;
    
    this.emit('quorumAdjusted', { 
      oldQuorum: this.quorumSize, 
      newQuorum: newQuorumSize, 
      activeNodes,
      reason: 'network partition'
    });
  }

  async reconcileAfterPartitionHealing(reconnectedNodes) {
    console.log(`🔄 Reconciling state after partition healing: ${reconnectedNodes.join(', ')}`);
    
    for (const nodeId of reconnectedNodes) {
      this.networkPartitions.delete(nodeId);
      
      // Request state synchronization
      await this.requestStateSynchronization(nodeId);
    }
    
    // Restore original quorum size if possible
    this.restoreOptimalQuorum();
  }

  // Cryptographic Components
  
  initializeCryptography() {
    // Generate key pair for this node
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    
    console.log('🔐 Cryptographic keys initialized');
  }

  signMessage(message) {
    const messageString = this.canonicalizeMessage(message);
    const signature = crypto.sign('sha256', Buffer.from(messageString), this.privateKey);
    return signature.toString('base64');
  }

  verifyMessageSignature(message, nodeId) {
    const publicKey = this.getPublicKeyForNode(nodeId);
    if (!publicKey) {
      throw new Error(`No public key available for node ${nodeId}`);
    }
    
    const messageString = this.canonicalizeMessage(message);
    const signature = Buffer.from(message.signature, 'base64');
    
    return crypto.verify('sha256', Buffer.from(messageString), publicKey, signature);
  }

  computeDigest(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  canonicalizeMessage(message) {
    // Create canonical string representation for signing
    const { signature, ...messageWithoutSignature } = message;
    return JSON.stringify(messageWithoutSignature, Object.keys(messageWithoutSignature).sort());
  }

  // Helper Methods
  
  isPrimary() {
    return this.nodeId === this.primaryNode;
  }

  async broadcastToAll(message) {
    console.log(`📡 Broadcasting ${message.type} to all nodes`);
    
    for (const [nodeId, node] of this.nodes) {
      if (nodeId !== this.nodeId && !this.maliciousNodes.has(nodeId) && !node.isolated) {
        try {
          await this.sendMessage(nodeId, message);
        } catch (error) {
          console.warn(`Failed to send message to ${nodeId}: ${error.message}`);
        }
      }
    }
  }

  async broadcastToBackups(message) {
    console.log(`📡 Broadcasting ${message.type} to backup nodes`);
    
    for (const [nodeId, node] of this.nodes) {
      if (nodeId !== this.nodeId && nodeId !== this.primaryNode && !this.maliciousNodes.has(nodeId) && !node.isolated) {
        try {
          await this.sendMessage(nodeId, message);
        } catch (error) {
          console.warn(`Failed to send message to backup ${nodeId}: ${error.message}`);
        }
      }
    }
  }

  async sendMessage(nodeId, message) {
    // Simulate network communication
    // In real implementation, this would use actual network protocols
    console.log(`→ Sending ${message.type} to ${nodeId}`);
    
    // Add message to recovery queue for reliability
    this.recoveryQueue.push({ nodeId, message, timestamp: Date.now() });
  }

  startHeartbeatMonitoring() {
    setInterval(() => {
      this.detectNetworkPartition();
      this.mitigateDoSAttack();
      this.cleanupOldMessages();
    }, 10000); // Every 10 seconds
  }

  cleanupOldMessages() {
    const cutoff = Date.now() - 3600000; // 1 hour
    
    // Cleanup message digests
    for (const [key, timestamp] of this.messageDigests) {
      if (timestamp < cutoff) {
        this.messageDigests.delete(key);
      }
    }
    
    // Cleanup recovery queue
    this.recoveryQueue = this.recoveryQueue.filter(item => item.timestamp > cutoff);
  }

  cleanupOldDigests() {
    const cutoff = Date.now() - 3600000; // 1 hour
    
    for (const [key, timestamp] of this.messageDigests) {
      if (timestamp < cutoff) {
        this.messageDigests.delete(key);
      }
    }
  }

  // Validation Methods
  
  validatePreprepareMessage(message) {
    // Validate message structure and authenticity
    if (!message.viewNumber || !message.sequenceNumber || !message.digest) {
      return false;
    }
    
    // Verify signature
    if (!this.verifyMessageSignature(message, message.nodeId)) {
      return false;
    }
    
    // Check if sender is current primary
    if (message.nodeId !== this.primaryNode) {
      return false;
    }
    
    // Verify digest matches request
    const computedDigest = this.computeDigest(message.request);
    if (computedDigest !== message.digest) {
      return false;
    }
    
    return true;
  }

  async checkPreparePhaseCompletion(sequenceNumber) {
    const prepareMessages = this.prepareMessages.get(sequenceNumber);
    if (!prepareMessages || prepareMessages.size < 2 * this.f) {
      return false;
    }
    
    console.log(`✅ Prepare phase completed for sequence ${sequenceNumber}`);
    
    // Proceed to commit phase
    const digest = Array.from(prepareMessages.values())[0].digest;
    await this.commit(sequenceNumber, digest);
    
    return true;
  }

  async checkCommitPhaseCompletion(sequenceNumber) {
    const commitMessages = this.commitMessages.get(sequenceNumber);
    if (!commitMessages || commitMessages.size < 2 * this.f + 1) {
      return false;
    }
    
    console.log(`🎉 Commit phase completed for sequence ${sequenceNumber} - Request can be executed`);
    
    // Execute the request
    await this.executeRequest(sequenceNumber);
    
    return true;
  }

  async executeRequest(sequenceNumber) {
    const preprepare = this.preprepareMessages.get(sequenceNumber);
    if (!preprepare) {
      console.error(`No pre-prepare message found for sequence ${sequenceNumber}`);
      return false;
    }
    
    console.log(`🚀 Executing request for sequence ${sequenceNumber}`);
    
    // Emit execution event
    this.emit('requestExecuted', {
      sequenceNumber,
      request: preprepare.request,
      clientId: preprepare.clientId,
      timestamp: Date.now()
    });
    
    return true;
  }

  // Utility Methods
  
  messagesContradict(message1, message2) {
    // Simple contradiction detection - can be enhanced
    if (message1.sequenceNumber === message2.sequenceNumber && 
        message1.digest !== message2.digest) {
      return true;
    }
    
    return false;
  }

  isViewChangeJustified(viewChangeMessage) {
    // Check if view change is justified based on timeout or primary failure
    // This is a simplified check - real implementation would be more sophisticated
    return true;
  }

  generateCheckpointProof() {
    // Generate proof of checkpoint for view change
    return {
      sequenceNumber: this.sequenceNumber,
      stateHash: this.computeStateHash(),
      timestamp: Date.now()
    };
  }

  getPreparedRequests() {
    // Get all prepared but not committed requests
    const prepared = [];
    for (const [seq, messages] of this.prepareMessages) {
      if (messages.size >= 2 * this.f) {
        prepared.push(seq);
      }
    }
    return prepared;
  }

  computeStateHash() {
    // Compute hash of current state for checkpointing
    const state = {
      sequenceNumber: this.sequenceNumber,
      viewNumber: this.viewNumber,
      executedRequests: Array.from(this.preprepareMessages.keys())
    };
    return this.computeDigest(state);
  }

  getPublicKeyForNode(nodeId) {
    // In real implementation, this would retrieve from a trusted registry
    // For now, return a mock public key
    return this.publicKey; // Simplified for demo
  }

  async requestStateSynchronization(nodeId) {
    console.log(`🔄 Requesting state synchronization from ${nodeId}`);
    
    const syncRequest = {
      type: 'STATE_SYNC_REQUEST',
      fromSequence: Math.max(0, this.sequenceNumber - 100),
      toSequence: this.sequenceNumber,
      nodeId: this.nodeId,
      timestamp: Date.now()
    };
    
    await this.sendMessage(nodeId, syncRequest);
  }

  restoreOptimalQuorum() {
    const activeNodes = this.nodes.size - this.networkPartitions.size - this.maliciousNodes.size;
    const optimalQuorum = Math.floor((this.n + this.f) / 2) + 1;
    
    if (activeNodes >= optimalQuorum && this.quorumSize !== optimalQuorum) {
      console.log(`📊 Restoring optimal quorum size: ${this.quorumSize} → ${optimalQuorum}`);
      this.quorumSize = optimalQuorum;
      
      this.emit('quorumAdjusted', {
        oldQuorum: this.quorumSize,
        newQuorum: optimalQuorum,
        activeNodes,
        reason: 'partition healing'
      });
    }
  }

  getStatus() {
    return {
      nodeId: this.nodeId,
      viewNumber: this.viewNumber,
      sequenceNumber: this.sequenceNumber,
      primaryNode: this.primaryNode,
      isPrimary: this.isPrimary(),
      activeNodes: this.nodes.size,
      maliciousNodes: this.maliciousNodes.size,
      networkPartitions: this.networkPartitions.size,
      quorumSize: this.quorumSize,
      pendingRequests: this.preprepareMessages.size,
      memoryUsage: {
        preprepareMessages: this.preprepareMessages.size,
        prepareMessages: this.prepareMessages.size,
        commitMessages: this.commitMessages.size,
        messageDigests: this.messageDigests.size
      }
    };
  }
}

module.exports = ByzantineConsensusManager;