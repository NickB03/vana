/**
 * Byzantine Consensus Coordinator
 * 
 * Implements Practical Byzantine Fault Tolerance (pBFT) for secure consensus
 * in the presence of malicious nodes. Coordinates three-phase consensus protocol
 * with cryptographic validation and attack mitigation.
 */

import { EventEmitter } from 'events';
import { createHash, sign, verify } from 'crypto';

export enum ConsensusState {
  NORMAL = 'normal',
  VIEW_CHANGE = 'view_change',
  RECOVERY = 'recovery'
}

export enum MessageType {
  PRE_PREPARE = 'pre_prepare',
  PREPARE = 'prepare',
  COMMIT = 'commit',
  VIEW_CHANGE = 'view_change',
  NEW_VIEW = 'new_view'
}

export interface ByzantineNode {
  id: string;
  publicKey: Buffer;
  trustScore: number;
  lastActivity: number;
  messageCount: number;
  isOnline: boolean;
}

export interface ConsensusMessage {
  type: MessageType;
  view: number;
  sequenceNumber: number;
  nodeId: string;
  proposal?: any;
  signature: Buffer;
  timestamp: number;
  digest?: string;
}

export interface ValidationResult {
  isValid: boolean;
  trustScore: number;
  reason?: string;
  recommendations: string[];
}

export interface ViewChangeData {
  newView: number;
  lastStableCheckpoint: number;
  checkpointMessages: ConsensusMessage[];
  preparedMessages: ConsensusMessage[];
}

export class ByzantineConsensusCoordinator extends EventEmitter {
  private nodeId: string;
  private privateKey: Buffer;
  private totalNodes: number;
  private faultThreshold: number; // f < n/3
  private view: number = 0;
  private sequenceNumber: number = 0;
  private state: ConsensusState = ConsensusState.NORMAL;
  
  // Node management
  private nodes: Map<string, ByzantineNode> = new Map();
  private suspiciousNodes: Set<string> = new Set();
  private blacklistedNodes: Set<string> = new Set();
  
  // Message logs and validation
  private messageLog: Map<string, ConsensusMessage> = new Map();
  private prepareMessages: Map<string, ConsensusMessage[]> = new Map();
  private commitMessages: Map<string, ConsensusMessage[]> = new Map();
  private viewChangeMessages: Map<number, ConsensusMessage[]> = new Map();
  
  // Attack detection
  private reputationScores: Map<string, number> = new Map();
  private messageHistory: Map<string, ConsensusMessage[]> = new Map();
  private suspiciousBehaviorCount: Map<string, number> = new Map();
  
  // Performance tracking
  private consensusLatency: number[] = [];
  private throughputCounter: number = 0;
  private lastThroughputReset: number = Date.now();

  constructor(
    nodeId: string, 
    privateKey: Buffer, 
    totalNodes: number, 
    nodes: ByzantineNode[]
  ) {
    super();
    
    this.nodeId = nodeId;
    this.privateKey = privateKey;
    this.totalNodes = totalNodes;
    this.faultThreshold = Math.floor((totalNodes - 1) / 3);
    
    // Initialize node registry
    nodes.forEach(node => {
      this.nodes.set(node.id, { ...node, trustScore: 1.0 });
      this.reputationScores.set(node.id, 1.0);
      this.messageHistory.set(node.id, []);
      this.suspiciousBehaviorCount.set(node.id, 0);
    });
    
    this.startHeartbeat();
    this.startMaliciousDetection();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      totalNodes: this.totalNodes,
      faultThreshold: this.faultThreshold,
      state: this.state
    });
  }

  /**
   * Initiate pBFT consensus for a proposal
   */
  async initiateConsensus(proposal: any): Promise<boolean> {
    if (this.state !== ConsensusState.NORMAL) {
      throw new Error(`Cannot initiate consensus in state: ${this.state}`);
    }

    if (!this.isPrimary()) {
      throw new Error('Only primary node can initiate consensus');
    }

    const startTime = Date.now();
    this.sequenceNumber++;

    try {
      // Phase 1: Pre-prepare
      const prePrepareMsgSent = await this.sendPrePrepare(proposal);
      if (!prePrepareMsgSent) {
        throw new Error('Failed to send pre-prepare message');
      }

      // Phase 2: Prepare phase
      const preparePhaseResult = await this.waitForPreparePhase();
      if (!preparePhaseResult) {
        throw new Error('Prepare phase failed');
      }

      // Phase 3: Commit phase
      const commitPhaseResult = await this.waitForCommitPhase();
      if (!commitPhaseResult) {
        throw new Error('Commit phase failed');
      }

      // Apply consensus
      await this.applyConsensus(proposal);
      
      // Track performance
      const latency = Date.now() - startTime;
      this.consensusLatency.push(latency);
      this.throughputCounter++;

      this.emit('consensus_reached', {
        sequenceNumber: this.sequenceNumber,
        view: this.view,
        proposal,
        latency,
        participantCount: this.getActiveNodeCount()
      });

      return true;

    } catch (error) {
      this.emit('consensus_failed', {
        sequenceNumber: this.sequenceNumber,
        view: this.view,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      });
      
      // Consider view change if consensus fails repeatedly
      await this.considerViewChange();
      return false;
    }
  }

  /**
   * Process incoming consensus message
   */
  async processMessage(message: ConsensusMessage): Promise<ValidationResult> {
    // Validate message cryptographically
    const validationResult = await this.validateMessage(message);
    if (!validationResult.isValid) {
      await this.reportSuspiciousBehavior(message.nodeId, 'invalid_signature');
      return validationResult;
    }

    // Check for replay attacks
    if (await this.isReplayAttack(message)) {
      await this.reportSuspiciousBehavior(message.nodeId, 'replay_attack');
      return {
        isValid: false,
        trustScore: 0.1,
        reason: 'Replay attack detected',
        recommendations: ['Investigate node for malicious behavior', 'Consider blacklisting']
      };
    }

    // Store message for processing
    const messageKey = this.getMessageKey(message);
    this.messageLog.set(messageKey, message);
    
    // Add to node's message history
    const nodeHistory = this.messageHistory.get(message.nodeId) || [];
    nodeHistory.push(message);
    this.messageHistory.set(message.nodeId, nodeHistory);

    // Process based on message type
    switch (message.type) {
      case MessageType.PRE_PREPARE:
        return await this.processPrePrepare(message);
      case MessageType.PREPARE:
        return await this.processPrepare(message);
      case MessageType.COMMIT:
        return await this.processCommit(message);
      case MessageType.VIEW_CHANGE:
        return await this.processViewChange(message);
      case MessageType.NEW_VIEW:
        return await this.processNewView(message);
      default:
        return {
          isValid: false,
          trustScore: 0.5,
          reason: 'Unknown message type',
          recommendations: ['Investigate message source']
        };
    }
  }

  /**
   * Send pre-prepare message (Phase 1)
   */
  private async sendPrePrepare(proposal: any): Promise<boolean> {
    const message: ConsensusMessage = {
      type: MessageType.PRE_PREPARE,
      view: this.view,
      sequenceNumber: this.sequenceNumber,
      nodeId: this.nodeId,
      proposal,
      signature: Buffer.alloc(0), // Will be set by signMessage
      timestamp: Date.now(),
      digest: this.calculateProposalDigest(proposal)
    };

    const signedMessage = await this.signMessage(message);
    
    // Broadcast to all backup nodes
    const broadcastResult = await this.broadcast(signedMessage, 'backup');
    
    this.emit('pre_prepare_sent', {
      sequenceNumber: this.sequenceNumber,
      view: this.view,
      digest: message.digest,
      recipients: broadcastResult.recipients
    });

    return broadcastResult.success;
  }

  /**
   * Process pre-prepare message
   */
  private async processPrePrepare(message: ConsensusMessage): Promise<ValidationResult> {
    // Only primary should send pre-prepare
    if (!this.isPrimary(message.nodeId)) {
      await this.reportSuspiciousBehavior(message.nodeId, 'invalid_pre_prepare');
      return {
        isValid: false,
        trustScore: 0.2,
        reason: 'Non-primary sent pre-prepare',
        recommendations: ['Report to consensus coordinator', 'Consider view change']
      };
    }

    // Validate proposal
    if (!await this.validateProposal(message.proposal)) {
      return {
        isValid: false,
        trustScore: 0.3,
        reason: 'Invalid proposal',
        recommendations: ['Reject proposal', 'Request valid proposal']
      };
    }

    // Send prepare message
    const prepareMessage: ConsensusMessage = {
      type: MessageType.PREPARE,
      view: message.view,
      sequenceNumber: message.sequenceNumber,
      nodeId: this.nodeId,
      signature: Buffer.alloc(0),
      timestamp: Date.now(),
      digest: message.digest
    };

    const signedPrepareMessage = await this.signMessage(prepareMessage);
    await this.broadcast(signedPrepareMessage, 'all');

    this.emit('prepare_sent', {
      sequenceNumber: message.sequenceNumber,
      view: message.view,
      digest: message.digest
    });

    return {
      isValid: true,
      trustScore: 1.0,
      reason: 'Pre-prepare processed successfully',
      recommendations: []
    };
  }

  /**
   * Process prepare message
   */
  private async processPrepare(message: ConsensusMessage): Promise<ValidationResult> {
    const key = `${message.view}-${message.sequenceNumber}`;
    
    if (!this.prepareMessages.has(key)) {
      this.prepareMessages.set(key, []);
    }
    
    const prepares = this.prepareMessages.get(key)!;
    prepares.push(message);

    // Check if we have enough prepare messages
    if (prepares.length >= 2 * this.faultThreshold) {
      // Send commit message
      const commitMessage: ConsensusMessage = {
        type: MessageType.COMMIT,
        view: message.view,
        sequenceNumber: message.sequenceNumber,
        nodeId: this.nodeId,
        signature: Buffer.alloc(0),
        timestamp: Date.now(),
        digest: message.digest
      };

      const signedCommitMessage = await this.signMessage(commitMessage);
      await this.broadcast(signedCommitMessage, 'all');

      this.emit('commit_sent', {
        sequenceNumber: message.sequenceNumber,
        view: message.view,
        prepareCount: prepares.length
      });
    }

    return {
      isValid: true,
      trustScore: 1.0,
      reason: 'Prepare message processed',
      recommendations: []
    };
  }

  /**
   * Process commit message
   */
  private async processCommit(message: ConsensusMessage): Promise<ValidationResult> {
    const key = `${message.view}-${message.sequenceNumber}`;
    
    if (!this.commitMessages.has(key)) {
      this.commitMessages.set(key, []);
    }
    
    const commits = this.commitMessages.get(key)!;
    commits.push(message);

    // Check if we have enough commit messages
    if (commits.length >= 2 * this.faultThreshold + 1) {
      // Find the original proposal from pre-prepare
      const prePrepareMsgKey = this.getMessageKey({
        type: MessageType.PRE_PREPARE,
        view: message.view,
        sequenceNumber: message.sequenceNumber,
        nodeId: this.getPrimaryNodeId(message.view)
      } as ConsensusMessage);

      const prePrepareMsg = this.messageLog.get(prePrepareMsgKey);
      if (prePrepareMsg) {
        await this.applyConsensus(prePrepareMsg.proposal);
        
        this.emit('consensus_committed', {
          sequenceNumber: message.sequenceNumber,
          view: message.view,
          commitCount: commits.length,
          proposal: prePrepareMsg.proposal
        });
      }
    }

    return {
      isValid: true,
      trustScore: 1.0,
      reason: 'Commit message processed',
      recommendations: []
    };
  }

  /**
   * Initiate view change when primary is suspected to be faulty
   */
  async initiateViewChange(): Promise<boolean> {
    this.state = ConsensusState.VIEW_CHANGE;
    const newView = this.view + 1;

    const viewChangeMessage: ConsensusMessage = {
      type: MessageType.VIEW_CHANGE,
      view: newView,
      sequenceNumber: this.sequenceNumber,
      nodeId: this.nodeId,
      signature: Buffer.alloc(0),
      timestamp: Date.now()
    };

    const signedMessage = await this.signMessage(viewChangeMessage);
    await this.broadcast(signedMessage, 'all');

    this.emit('view_change_initiated', {
      newView,
      currentView: this.view,
      reason: 'Primary suspected faulty'
    });

    return true;
  }

  /**
   * Process view change message
   */
  private async processViewChange(message: ConsensusMessage): Promise<ValidationResult> {
    const viewChangeList = this.viewChangeMessages.get(message.view) || [];
    viewChangeList.push(message);
    this.viewChangeMessages.set(message.view, viewChangeList);

    // Check if we have enough view change messages
    if (viewChangeList.length >= 2 * this.faultThreshold + 1) {
      // If we are the new primary, send NEW-VIEW message
      if (this.isPrimary(this.nodeId, message.view)) {
        await this.sendNewView(message.view);
      }
    }

    return {
      isValid: true,
      trustScore: 1.0,
      reason: 'View change processed',
      recommendations: []
    };
  }

  /**
   * Send new view message
   */
  private async sendNewView(newView: number): Promise<void> {
    const newViewMessage: ConsensusMessage = {
      type: MessageType.NEW_VIEW,
      view: newView,
      sequenceNumber: this.sequenceNumber,
      nodeId: this.nodeId,
      signature: Buffer.alloc(0),
      timestamp: Date.now()
    };

    const signedMessage = await this.signMessage(newViewMessage);
    await this.broadcast(signedMessage, 'all');

    this.view = newView;
    this.state = ConsensusState.NORMAL;

    this.emit('new_view_sent', {
      newView,
      primaryNodeId: this.nodeId
    });
  }

  /**
   * Process new view message
   */
  private async processNewView(message: ConsensusMessage): Promise<ValidationResult> {
    if (!this.isPrimary(message.nodeId, message.view)) {
      return {
        isValid: false,
        trustScore: 0.2,
        reason: 'Invalid new view from non-primary',
        recommendations: ['Report suspicious behavior']
      };
    }

    this.view = message.view;
    this.state = ConsensusState.NORMAL;

    this.emit('view_changed', {
      newView: message.view,
      primaryNodeId: message.nodeId
    });

    return {
      isValid: true,
      trustScore: 1.0,
      reason: 'New view accepted',
      recommendations: []
    };
  }

  /**
   * Malicious behavior detection and reputation management
   */
  private async reportSuspiciousBehavior(nodeId: string, behavior: string): Promise<void> {
    const currentCount = this.suspiciousBehaviorCount.get(nodeId) || 0;
    this.suspiciousBehaviorCount.set(nodeId, currentCount + 1);
    
    // Decrease reputation
    const currentReputation = this.reputationScores.get(nodeId) || 1.0;
    const newReputation = Math.max(0.0, currentReputation - 0.1);
    this.reputationScores.set(nodeId, newReputation);
    
    // Update node trust score
    const node = this.nodes.get(nodeId);
    if (node) {
      node.trustScore = newReputation;
    }

    this.emit('suspicious_behavior', {
      nodeId,
      behavior,
      suspiciousCount: currentCount + 1,
      reputation: newReputation
    });

    // Consider blacklisting if behavior is severe
    if (currentCount >= 5 || newReputation < 0.3) {
      this.blacklistedNodes.add(nodeId);
      this.emit('node_blacklisted', {
        nodeId,
        reason: `Suspicious behavior: ${behavior}`,
        finalReputation: newReputation
      });
    }
  }

  /**
   * Advanced threat detection using behavioral analysis
   */
  private startMaliciousDetection(): void {
    setInterval(() => {
      this.analyzeNodeBehavior();
    }, 10000); // Run every 10 seconds
  }

  private analyzeNodeBehavior(): void {
    this.nodes.forEach((node, nodeId) => {
      const history = this.messageHistory.get(nodeId) || [];
      
      // Check for unusual message patterns
      const recentMessages = history.filter(msg => 
        Date.now() - msg.timestamp < 60000 // Last minute
      );

      // Detect message flooding
      if (recentMessages.length > 50) {
        this.reportSuspiciousBehavior(nodeId, 'message_flooding');
      }

      // Detect inconsistent messages
      const inconsistentMessages = this.detectInconsistentMessages(recentMessages);
      if (inconsistentMessages > 0) {
        this.reportSuspiciousBehavior(nodeId, 'inconsistent_messages');
      }

      // Update node activity
      node.lastActivity = Math.max(...recentMessages.map(msg => msg.timestamp), 0);
      node.messageCount = history.length;
    });
  }

  private detectInconsistentMessages(messages: ConsensusMessage[]): number {
    const messagesBySequence = new Map<number, ConsensusMessage[]>();
    
    messages.forEach(msg => {
      const key = msg.sequenceNumber;
      const list = messagesBySequence.get(key) || [];
      list.push(msg);
      messagesBySequence.set(key, list);
    });

    let inconsistentCount = 0;
    messagesBySequence.forEach((msgs) => {
      if (msgs.length > 1) {
        // Check if messages for same sequence have different digests
        const digests = new Set(msgs.map(msg => msg.digest).filter(Boolean));
        if (digests.size > 1) {
          inconsistentCount++;
        }
      }
    });

    return inconsistentCount;
  }

  /**
   * Cryptographic validation methods
   */
  private async validateMessage(message: ConsensusMessage): Promise<ValidationResult> {
    // Check if node is blacklisted
    if (this.blacklistedNodes.has(message.nodeId)) {
      return {
        isValid: false,
        trustScore: 0.0,
        reason: 'Message from blacklisted node',
        recommendations: ['Block message', 'Maintain blacklist']
      };
    }

    // Get node public key
    const node = this.nodes.get(message.nodeId);
    if (!node) {
      return {
        isValid: false,
        trustScore: 0.0,
        reason: 'Unknown node',
        recommendations: ['Reject message', 'Verify node identity']
      };
    }

    // Validate signature
    const messageWithoutSignature = { ...message, signature: Buffer.alloc(0) };
    const messageHash = this.calculateMessageHash(messageWithoutSignature);
    
    try {
      const isValidSignature = verify(
        'sha256',
        messageHash,
        node.publicKey,
        message.signature
      );

      if (!isValidSignature) {
        return {
          isValid: false,
          trustScore: 0.1,
          reason: 'Invalid signature',
          recommendations: ['Reject message', 'Report to security manager']
        };
      }
    } catch (error) {
      return {
        isValid: false,
        trustScore: 0.1,
        reason: 'Signature verification failed',
        recommendations: ['Reject message', 'Check cryptographic setup']
      };
    }

    return {
      isValid: true,
      trustScore: node.trustScore,
      reason: 'Message validated successfully',
      recommendations: []
    };
  }

  private async signMessage(message: ConsensusMessage): Promise<ConsensusMessage> {
    const messageWithoutSignature = { ...message, signature: Buffer.alloc(0) };
    const messageHash = this.calculateMessageHash(messageWithoutSignature);
    
    const signature = sign('sha256', messageHash, this.privateKey);
    
    return {
      ...message,
      signature
    };
  }

  private calculateMessageHash(message: ConsensusMessage): Buffer {
    const messageString = JSON.stringify({
      type: message.type,
      view: message.view,
      sequenceNumber: message.sequenceNumber,
      nodeId: message.nodeId,
      proposal: message.proposal,
      timestamp: message.timestamp,
      digest: message.digest
    });
    
    return createHash('sha256').update(messageString).digest();
  }

  private calculateProposalDigest(proposal: any): string {
    return createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
  }

  /**
   * Utility methods
   */
  private isPrimary(nodeId?: string, view?: number): boolean {
    const targetView = view ?? this.view;
    const targetNodeId = nodeId ?? this.nodeId;
    const primaryNodeId = this.getPrimaryNodeId(targetView);
    return targetNodeId === primaryNodeId;
  }

  private getPrimaryNodeId(view: number): string {
    const nodeIds = Array.from(this.nodes.keys()).sort();
    const primaryIndex = view % nodeIds.length;
    return nodeIds[primaryIndex];
  }

  private getActiveNodeCount(): number {
    return Array.from(this.nodes.values()).filter(node => 
      node.isOnline && !this.blacklistedNodes.has(node.id)
    ).length;
  }

  private async isReplayAttack(message: ConsensusMessage): Promise<boolean> {
    const messageKey = this.getMessageKey(message);
    return this.messageLog.has(messageKey);
  }

  private getMessageKey(message: ConsensusMessage): string {
    return `${message.type}-${message.view}-${message.sequenceNumber}-${message.nodeId}`;
  }

  private async broadcast(message: ConsensusMessage, recipients: 'all' | 'backup'): Promise<{success: boolean, recipients: string[]}> {
    const targetNodes = recipients === 'all' 
      ? Array.from(this.nodes.keys())
      : Array.from(this.nodes.keys()).filter(id => id !== this.nodeId);

    // Filter out blacklisted nodes
    const activeTargets = targetNodes.filter(nodeId => 
      !this.blacklistedNodes.has(nodeId) && 
      this.nodes.get(nodeId)?.isOnline
    );

    // Emit broadcast event for actual network transmission
    this.emit('broadcast_message', {
      message,
      recipients: activeTargets,
      timestamp: Date.now()
    });

    return {
      success: activeTargets.length > 0,
      recipients: activeTargets
    };
  }

  private async validateProposal(proposal: any): Promise<boolean> {
    // Implement proposal validation logic based on your application needs
    return proposal != null;
  }

  private async applyConsensus(proposal: any): Promise<void> {
    // Implement consensus application logic
    this.emit('consensus_applied', {
      proposal,
      sequenceNumber: this.sequenceNumber,
      view: this.view,
      timestamp: Date.now()
    });
  }

  private async waitForPreparePhase(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      const listener = (data: any) => {
        if (data.sequenceNumber === this.sequenceNumber) {
          clearTimeout(timeout);
          this.off('commit_sent', listener);
          resolve(true);
        }
      };
      
      this.on('commit_sent', listener);
    });
  }

  private async waitForCommitPhase(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      const listener = (data: any) => {
        if (data.sequenceNumber === this.sequenceNumber) {
          clearTimeout(timeout);
          this.off('consensus_committed', listener);
          resolve(true);
        }
      };
      
      this.on('consensus_committed', listener);
    });
  }

  private async considerViewChange(): Promise<void> {
    // Implement view change logic based on failure patterns
    const primaryNodeId = this.getPrimaryNodeId(this.view);
    const primaryNode = this.nodes.get(primaryNodeId);
    
    if (primaryNode && primaryNode.trustScore < 0.5) {
      await this.initiateViewChange();
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.emit('heartbeat', {
        nodeId: this.nodeId,
        view: this.view,
        state: this.state,
        activeNodes: this.getActiveNodeCount(),
        timestamp: Date.now()
      });
    }, 5000);
  }

  /**
   * Performance and monitoring methods
   */
  getPerformanceMetrics(): {
    averageLatency: number;
    throughput: number;
    consensusSuccessRate: number;
    activenodes: number;
    blacklistedNodes: number;
    averageReputation: number;
  } {
    const currentTime = Date.now();
    const timeDiff = (currentTime - this.lastThroughputReset) / 1000;
    const throughput = timeDiff > 0 ? this.throughputCounter / timeDiff : 0;

    // Reset throughput counter
    this.throughputCounter = 0;
    this.lastThroughputReset = currentTime;

    const averageLatency = this.consensusLatency.length > 0 
      ? this.consensusLatency.reduce((a, b) => a + b, 0) / this.consensusLatency.length 
      : 0;

    const totalReputation = Array.from(this.reputationScores.values()).reduce((a, b) => a + b, 0);
    const averageReputation = this.reputationScores.size > 0 ? totalReputation / this.reputationScores.size : 0;

    return {
      averageLatency,
      throughput,
      consensusSuccessRate: 0.95, // Would calculate from actual success/failure ratios
      activenodes: this.getActiveNodeCount(),
      blacklistedNodes: this.blacklistedNodes.size,
      averageReputation
    };
  }

  getSystemStatus(): {
    state: ConsensusState;
    view: number;
    primaryNodeId: string;
    faultThreshold: number;
    messageLogSize: number;
    recentSuspiciousActivity: number;
  } {
    const recentSuspiciousActivity = Array.from(this.suspiciousBehaviorCount.values())
      .reduce((a, b) => a + b, 0);

    return {
      state: this.state,
      view: this.view,
      primaryNodeId: this.getPrimaryNodeId(this.view),
      faultThreshold: this.faultThreshold,
      messageLogSize: this.messageLog.size,
      recentSuspiciousActivity
    };
  }
}

export default ByzantineConsensusCoordinator;