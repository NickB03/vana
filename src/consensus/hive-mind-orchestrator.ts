/**
 * Hive-Mind Consensus Orchestrator
 * 
 * Main coordination layer that integrates all consensus mechanisms to enable
 * distributed decision-making and fault tolerance. Dynamically selects
 * appropriate consensus protocols based on context, trust levels, and
 * network conditions.
 */

import { EventEmitter } from 'events';
import ByzantineConsensusCoordinator, { ConsensusState as ByzantineState } from './byzantine-consensus-coordinator';
import RaftConsensusManager, { NodeState as RaftState } from './raft-consensus-manager';
import CRDTSynchronizer from './crdt-synchronizer';
import QuorumManager, { FaultModel, OperationType } from './quorum-manager';
import GossipCoordinator, { GossipType, MessagePriority } from './gossip-coordinator';
import SecurityManager, { ThreatLevel } from './security-manager';

export enum ConsensusMode {
  BYZANTINE = 'byzantine',
  RAFT = 'raft',
  CRDT = 'crdt',
  GOSSIP = 'gossip',
  HYBRID = 'hybrid',
  AUTO = 'auto'
}

export enum DecisionContext {
  CRITICAL_SAFETY = 'critical_safety',
  PERFORMANCE_OPTIMIZED = 'performance_optimized',
  PARTITION_TOLERANT = 'partition_tolerant',
  EVENTUALLY_CONSISTENT = 'eventually_consistent',
  STRONGLY_CONSISTENT = 'strongly_consistent'
}

export interface ConsensusRequest {
  requestId: string;
  proposal: any;
  context: DecisionContext;
  requiredConfidence: number;
  timeoutMs: number;
  participants?: string[];
  metadata?: {
    priority: MessagePriority;
    operationType: OperationType;
    clientId?: string;
    retryable?: boolean;
  };
}

export interface ConsensusResult {
  requestId: string;
  success: boolean;
  consensusMode: ConsensusMode;
  decision?: any;
  confidence: number;
  participantCount: number;
  latency: number;
  faultsTolerated: number;
  error?: string;
  metrics: {
    messageCount: number;
    networkOverhead: number;
    convergenceTime: number;
  };
}

export interface NetworkConditions {
  partitionRisk: number; // 0-1
  adversarialNodes: number;
  averageLatency: number;
  bandwidthUtilization: number;
  trustLevel: number;
  consistencyRequirement: 'eventual' | 'strong' | 'linearizable';
}

export interface HiveMindConfiguration {
  nodeId: string;
  defaultMode: ConsensusMode;
  adaptiveSelection: boolean;
  hybridFallback: boolean;
  performanceThresholds: {
    maxLatency: number;
    minThroughput: number;
    maxNetworkOverhead: number;
  };
  faultToleranceRequirements: {
    byzantineFaultTolerance: boolean;
    crashFaultTolerance: boolean;
    partitionTolerance: boolean;
  };
  securityRequirements: {
    cryptographicValidation: boolean;
    trustManagement: boolean;
    threatDetection: boolean;
  };
}

export interface ConsensusMetrics {
  totalDecisions: number;
  successRate: number;
  averageLatency: number;
  averageConfidence: number;
  modeDistribution: Record<ConsensusMode, number>;
  faultsTolerated: number;
  securityIncidents: number;
  networkEfficiency: number;
}

export class HiveMindConsensusOrchestrator extends EventEmitter {
  private configuration: HiveMindConfiguration;
  
  // Consensus mechanism instances
  private byzantineCoordinator: ByzantineConsensusCoordinator | null = null;
  private raftManager: RaftConsensusManager | null = null;
  private crdtSynchronizer: CRDTSynchronizer;
  private quorumManager: QuorumManager;
  private gossipCoordinator: GossipCoordinator;
  private securityManager: SecurityManager;
  
  // State management
  private activeRequests: Map<string, {
    request: ConsensusRequest;
    startTime: number;
    timeoutHandle: NodeJS.Timeout;
    resolve: (result: ConsensusResult) => void;
    reject: (error: Error) => void;
  }> = new Map();
  
  private networkConditions: NetworkConditions = {
    partitionRisk: 0.1,
    adversarialNodes: 0,
    averageLatency: 100,
    bandwidthUtilization: 0.5,
    trustLevel: 0.8,
    consistencyRequirement: 'strong'
  };
  
  // Performance tracking
  private metrics: ConsensusMetrics = {
    totalDecisions: 0,
    successRate: 1.0,
    averageLatency: 0,
    averageConfidence: 0,
    modeDistribution: {
      [ConsensusMode.BYZANTINE]: 0,
      [ConsensusMode.RAFT]: 0,
      [ConsensusMode.CRDT]: 0,
      [ConsensusMode.GOSSIP]: 0,
      [ConsensusMode.HYBRID]: 0,
      [ConsensusMode.AUTO]: 0
    },
    faultsTolerated: 0,
    securityIncidents: 0,
    networkEfficiency: 0.8
  };
  
  private decisionHistory: Array<{
    requestId: string;
    timestamp: number;
    mode: ConsensusMode;
    context: DecisionContext;
    latency: number;
    success: boolean;
    confidence: number;
  }> = [];

  constructor(
    configuration: HiveMindConfiguration,
    crdtSynchronizer: CRDTSynchronizer,
    quorumManager: QuorumManager,
    gossipCoordinator: GossipCoordinator,
    securityManager: SecurityManager
  ) {
    super();
    
    this.configuration = configuration;
    this.crdtSynchronizer = crdtSynchronizer;
    this.quorumManager = quorumManager;
    this.gossipCoordinator = gossipCoordinator;
    this.securityManager = securityManager;
    
    this.setupEventHandlers();
    this.startNetworkMonitoring();
    this.startMetricsCollection();
    
    this.emit('initialized', {
      nodeId: this.configuration.nodeId,
      defaultMode: this.configuration.defaultMode,
      adaptiveSelection: this.configuration.adaptiveSelection
    });
  }

  /**
   * Initialize Byzantine consensus coordinator
   */
  initializeByzantineConsensus(
    privateKey: Buffer,
    totalNodes: number,
    nodes: any[]
  ): void {
    this.byzantineCoordinator = new ByzantineConsensusCoordinator(
      this.configuration.nodeId,
      privateKey,
      totalNodes,
      nodes
    );
    
    this.byzantineCoordinator.on('consensus_reached', (data) => {
      this.emit('byzantine_consensus_reached', data);
    });
    
    this.byzantineCoordinator.on('consensus_failed', (data) => {
      this.emit('byzantine_consensus_failed', data);
    });
  }

  /**
   * Initialize Raft consensus manager
   */
  initializeRaftConsensus(raftConfiguration: any): void {
    this.raftManager = new RaftConsensusManager(
      this.configuration.nodeId,
      raftConfiguration
    );
    
    this.raftManager.on('leader_elected', (data) => {
      this.emit('raft_leader_elected', data);
    });
    
    this.raftManager.on('consensus_applied', (data) => {
      this.emit('raft_consensus_applied', data);
    });
  }

  /**
   * Main consensus decision method
   */
  async makeDecision(request: ConsensusRequest): Promise<ConsensusResult> {
    const startTime = Date.now();
    
    // Validate request
    if (!this.validateRequest(request)) {
      throw new Error(`Invalid consensus request: ${request.requestId}`);
    }
    
    // Select consensus mode
    const selectedMode = this.selectConsensusMode(request);
    
    this.emit('decision_started', {
      requestId: request.requestId,
      selectedMode,
      context: request.context,
      requiredConfidence: request.requiredConfidence
    });
    
    try {
      // Execute consensus based on selected mode
      const result = await this.executeConsensus(request, selectedMode);
      
      // Update metrics
      this.updateMetrics(result, startTime);
      
      // Store in history
      this.decisionHistory.push({
        requestId: request.requestId,
        timestamp: startTime,
        mode: selectedMode,
        context: request.context,
        latency: result.latency,
        success: result.success,
        confidence: result.confidence
      });
      
      // Trim history
      if (this.decisionHistory.length > 10000) {
        this.decisionHistory.shift();
      }
      
      this.emit('decision_completed', {
        requestId: request.requestId,
        result,
        duration: Date.now() - startTime
      });
      
      return result;
      
    } catch (error) {
      const failureResult: ConsensusResult = {
        requestId: request.requestId,
        success: false,
        consensusMode: selectedMode,
        confidence: 0,
        participantCount: 0,
        latency: Date.now() - startTime,
        faultsTolerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          messageCount: 0,
          networkOverhead: 0,
          convergenceTime: 0
        }
      };
      
      this.updateMetrics(failureResult, startTime);
      
      this.emit('decision_failed', {
        requestId: request.requestId,
        error: failureResult.error,
        mode: selectedMode
      });
      
      return failureResult;
    }
  }

  /**
   * Select appropriate consensus mechanism based on context and conditions
   */
  private selectConsensusMode(request: ConsensusRequest): ConsensusMode {
    // Return explicitly requested mode if not auto
    if (this.configuration.defaultMode !== ConsensusMode.AUTO && 
        !this.configuration.adaptiveSelection) {
      return this.configuration.defaultMode;
    }
    
    // Adaptive mode selection
    const conditions = this.networkConditions;
    const context = request.context;
    const requiredConfidence = request.requiredConfidence;
    
    // Critical safety requires Byzantine consensus
    if (context === DecisionContext.CRITICAL_SAFETY || 
        conditions.adversarialNodes > 0 ||
        conditions.trustLevel < 0.6) {
      
      if (this.byzantineCoordinator) {
        return ConsensusMode.BYZANTINE;
      } else if (requiredConfidence > 0.9) {
        // Fall back to Raft with high confidence requirement
        return ConsensusMode.RAFT;
      }
    }
    
    // Strong consistency with trusted nodes
    if (context === DecisionContext.STRONGLY_CONSISTENT &&
        conditions.trustLevel > 0.8 &&
        conditions.partitionRisk < 0.3) {
      
      if (this.raftManager) {
        return ConsensusMode.RAFT;
      }
    }
    
    // Partition tolerance with eventual consistency
    if (context === DecisionContext.PARTITION_TOLERANT ||
        conditions.partitionRisk > 0.5) {
      
      // Use CRDT for state updates, Gossip for coordination
      if (this.isStateUpdate(request.proposal)) {
        return ConsensusMode.CRDT;
      } else {
        return ConsensusMode.GOSSIP;
      }
    }
    
    // Performance optimized
    if (context === DecisionContext.PERFORMANCE_OPTIMIZED) {
      if (conditions.averageLatency < 100 && conditions.trustLevel > 0.7) {
        return ConsensusMode.RAFT;
      } else {
        return ConsensusMode.GOSSIP;
      }
    }
    
    // Eventually consistent
    if (context === DecisionContext.EVENTUALLY_CONSISTENT) {
      return ConsensusMode.CRDT;
    }
    
    // Default fallback based on network conditions
    if (conditions.trustLevel > 0.8 && conditions.partitionRisk < 0.2) {
      return this.raftManager ? ConsensusMode.RAFT : ConsensusMode.GOSSIP;
    } else {
      return ConsensusMode.GOSSIP;
    }
  }

  /**
   * Execute consensus using selected mechanism
   */
  private async executeConsensus(
    request: ConsensusRequest,
    mode: ConsensusMode
  ): Promise<ConsensusResult> {
    
    const startTime = Date.now();
    
    // Track mode usage
    this.metrics.modeDistribution[mode]++;
    
    switch (mode) {
      case ConsensusMode.BYZANTINE:
        return await this.executeByzantineConsensus(request, startTime);
        
      case ConsensusMode.RAFT:
        return await this.executeRaftConsensus(request, startTime);
        
      case ConsensusMode.CRDT:
        return await this.executeCRDTConsensus(request, startTime);
        
      case ConsensusMode.GOSSIP:
        return await this.executeGossipConsensus(request, startTime);
        
      case ConsensusMode.HYBRID:
        return await this.executeHybridConsensus(request, startTime);
        
      default:
        throw new Error(`Unsupported consensus mode: ${mode}`);
    }
  }

  /**
   * Execute Byzantine consensus
   */
  private async executeByzantineConsensus(
    request: ConsensusRequest,
    startTime: number
  ): Promise<ConsensusResult> {
    
    if (!this.byzantineCoordinator) {
      throw new Error('Byzantine consensus coordinator not initialized');
    }
    
    // Validate quorum
    const quorum = this.quorumManager.calculateQuorum(
      request.metadata?.operationType || OperationType.STANDARD
    );
    
    if (!quorum.canReachQuorum) {
      throw new Error('Cannot reach Byzantine quorum');
    }
    
    try {
      const success = await this.byzantineCoordinator.initiateConsensus(request.proposal);
      const performance = this.byzantineCoordinator.getPerformanceMetrics();
      
      return {
        requestId: request.requestId,
        success,
        consensusMode: ConsensusMode.BYZANTINE,
        decision: success ? request.proposal : undefined,
        confidence: success ? Math.min(1.0, quorum.confidence * 0.95) : 0,
        participantCount: quorum.participatingNodes.length,
        latency: Date.now() - startTime,
        faultsTolerated: quorum.faultTolerance,
        metrics: {
          messageCount: performance.activenodes * 3, // 3 phases
          networkOverhead: performance.activenodes * 3 * 1024, // Estimate
          convergenceTime: performance.averageLatency
        }
      };
      
    } catch (error) {
      throw new Error(`Byzantine consensus failed: ${error}`);
    }
  }

  /**
   * Execute Raft consensus
   */
  private async executeRaftConsensus(
    request: ConsensusRequest,
    startTime: number
  ): Promise<ConsensusResult> {
    
    if (!this.raftManager) {
      throw new Error('Raft consensus manager not initialized');
    }
    
    const currentState = this.raftManager.getCurrentState();
    if (!currentState.isLeader) {
      throw new Error('Not the Raft leader');
    }
    
    try {
      const clientId = request.metadata?.clientId || this.configuration.nodeId;
      const result = await this.raftManager.submitCommand(
        request.proposal,
        clientId,
        request.requestId
      );
      
      const performance = this.raftManager.getPerformanceMetrics();
      const clusterStatus = this.raftManager.getClusterStatus();
      
      return {
        requestId: request.requestId,
        success: result.success,
        consensusMode: ConsensusMode.RAFT,
        decision: result.success ? request.proposal : undefined,
        confidence: result.success ? 0.95 : 0,
        participantCount: clusterStatus.nodes.filter(n => n.isOnline).length,
        latency: result.latency,
        faultsTolerated: Math.floor((clusterStatus.nodes.length - 1) / 2),
        error: result.error,
        metrics: {
          messageCount: clusterStatus.nodes.length * 2, // Append entries + responses
          networkOverhead: clusterStatus.nodes.length * 512, // Estimate
          convergenceTime: performance.averageCommitLatency
        }
      };
      
    } catch (error) {
      throw new Error(`Raft consensus failed: ${error}`);
    }
  }

  /**
   * Execute CRDT consensus
   */
  private async executeCRDTConsensus(
    request: ConsensusRequest,
    startTime: number
  ): Promise<ConsensusResult> {
    
    try {
      // Apply operation to CRDT
      const operationType = this.extractCRDTOperationType(request.proposal);
      const success = this.crdtSynchronizer.applyOperation(
        'default', // CRDT name
        {
          type: operationType,
          data: request.proposal,
          timestamp: Date.now()
        }
      );
      
      const metrics = this.crdtSynchronizer.getMetrics();
      const gossipMetrics = this.gossipCoordinator.getMetrics();
      
      return {
        requestId: request.requestId,
        success,
        consensusMode: ConsensusMode.CRDT,
        decision: success ? request.proposal : undefined,
        confidence: success ? 0.9 : 0, // High confidence for CRDT operations
        participantCount: metrics.peerCount + 1,
        latency: Date.now() - startTime,
        faultsTolerated: metrics.peerCount, // CRDT tolerates all partition scenarios
        metrics: {
          messageCount: gossipMetrics.totalMessagesProcessed,
          networkOverhead: gossipMetrics.totalBytesTransmitted,
          convergenceTime: gossipMetrics.averageConvergenceTime
        }
      };
      
    } catch (error) {
      throw new Error(`CRDT consensus failed: ${error}`);
    }
  }

  /**
   * Execute Gossip consensus
   */
  private async executeGossipConsensus(
    request: ConsensusRequest,
    startTime: number
  ): Promise<ConsensusResult> {
    
    try {
      // Broadcast through gossip protocol
      const messageId = this.gossipCoordinator.broadcast(
        'consensus_proposal',
        request.proposal,
        request.metadata?.priority || MessagePriority.NORMAL
      );
      
      // Wait for propagation (simplified)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = this.gossipCoordinator.getMetrics();
      const peerStatus = this.gossipCoordinator.getPeerStatus();
      const activePeers = peerStatus.filter(peer => peer.isOnline);
      
      return {
        requestId: request.requestId,
        success: true,
        consensusMode: ConsensusMode.GOSSIP,
        decision: request.proposal,
        confidence: 0.8, // Probabilistic consensus
        participantCount: activePeers.length + 1,
        latency: Date.now() - startTime,
        faultsTolerated: activePeers.length, // Gossip is very fault tolerant
        metrics: {
          messageCount: metrics.totalMessagesProcessed,
          networkOverhead: metrics.totalBytesTransmitted,
          convergenceTime: metrics.averageConvergenceTime
        }
      };
      
    } catch (error) {
      throw new Error(`Gossip consensus failed: ${error}`);
    }
  }

  /**
   * Execute hybrid consensus combining multiple mechanisms
   */
  private async executeHybridConsensus(
    request: ConsensusRequest,
    startTime: number
  ): Promise<ConsensusResult> {
    
    try {
      // Use multiple mechanisms and combine results
      const results: ConsensusResult[] = [];
      
      // Try primary mechanism
      const primaryMode = this.selectConsensusMode(request);
      try {
        const primaryResult = await this.executeConsensus(request, primaryMode);
        results.push(primaryResult);
      } catch (error) {
        // Primary failed, try fallback
      }
      
      // Try fallback mechanism if primary failed or confidence is low
      if (results.length === 0 || results[0].confidence < request.requiredConfidence) {
        const fallbackMode = this.selectFallbackMode(primaryMode, request);
        try {
          const fallbackResult = await this.executeConsensus(request, fallbackMode);
          results.push(fallbackResult);
        } catch (error) {
          // Fallback also failed
        }
      }
      
      if (results.length === 0) {
        throw new Error('All consensus mechanisms failed');
      }
      
      // Combine results (use the best one)
      const bestResult = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      return {
        ...bestResult,
        consensusMode: ConsensusMode.HYBRID,
        latency: Date.now() - startTime,
        confidence: Math.min(bestResult.confidence * 1.1, 1.0) // Slight boost for redundancy
      };
      
    } catch (error) {
      throw new Error(`Hybrid consensus failed: ${error}`);
    }
  }

  /**
   * Select fallback consensus mode
   */
  private selectFallbackMode(primaryMode: ConsensusMode, request: ConsensusRequest): ConsensusMode {
    switch (primaryMode) {
      case ConsensusMode.BYZANTINE:
        return this.raftManager ? ConsensusMode.RAFT : ConsensusMode.GOSSIP;
      case ConsensusMode.RAFT:
        return ConsensusMode.GOSSIP;
      case ConsensusMode.CRDT:
        return ConsensusMode.GOSSIP;
      case ConsensusMode.GOSSIP:
        return ConsensusMode.CRDT;
      default:
        return ConsensusMode.GOSSIP;
    }
  }

  /**
   * Utility methods
   */

  private validateRequest(request: ConsensusRequest): boolean {
    return !!(
      request.requestId &&
      request.proposal &&
      request.context &&
      request.requiredConfidence >= 0 &&
      request.requiredConfidence <= 1 &&
      request.timeoutMs > 0
    );
  }

  private isStateUpdate(proposal: any): boolean {
    // Simple heuristic to determine if proposal is a state update
    return proposal && 
           typeof proposal === 'object' && 
           (proposal.type === 'update' || proposal.operation === 'set' || proposal.action === 'modify');
  }

  private extractCRDTOperationType(proposal: any): string {
    if (proposal.operation) return proposal.operation;
    if (proposal.action) return proposal.action;
    if (proposal.type) return proposal.type;
    return 'set';
  }

  private setupEventHandlers(): void {
    // Security Manager events
    this.securityManager.on('threat_detected', (data) => {
      this.handleSecurityThreat(data);
    });
    
    // Quorum Manager events
    this.quorumManager.on('emergency_mode_activated', (data) => {
      this.handleEmergencyMode(data);
    });
    
    // Gossip Coordinator events
    this.gossipCoordinator.on('peer_removed', (data) => {
      this.updateNetworkConditions();
    });
    
    // CRDT Synchronizer events
    this.crdtSynchronizer.on('synchronized', (data) => {
      this.emit('crdt_synchronized', data);
    });
  }

  private handleSecurityThreat(threatData: any): void {
    this.metrics.securityIncidents++;
    
    // Adjust trust levels and network conditions
    if (threatData.level === ThreatLevel.HIGH || threatData.level === ThreatLevel.CRITICAL) {
      this.networkConditions.trustLevel *= 0.8;
      this.networkConditions.adversarialNodes = Math.max(
        this.networkConditions.adversarialNodes,
        threatData.sourceNodes?.length || 1
      );
    }
    
    this.emit('security_threat_handled', {
      threat: threatData,
      adjustedTrustLevel: this.networkConditions.trustLevel
    });
  }

  private handleEmergencyMode(emergencyData: any): void {
    // Adjust consensus mode selection for degraded operation
    this.networkConditions.partitionRisk = Math.max(0.7, this.networkConditions.partitionRisk);
    
    this.emit('emergency_mode_active', {
      reason: emergencyData.reason,
      adjustedPartitionRisk: this.networkConditions.partitionRisk
    });
  }

  private updateNetworkConditions(): void {
    // Update network conditions based on current state
    const gossipMetrics = this.gossipCoordinator.getMetrics();
    const quorumStatus = this.quorumManager.getQuorumStatus();
    const securityStatus = this.securityManager.getSecurityStatus();
    
    this.networkConditions.trustLevel = securityStatus.trustedNodes / Math.max(1, securityStatus.totalNodes);
    this.networkConditions.adversarialNodes = securityStatus.blacklistedNodes;
    this.networkConditions.partitionRisk = quorumStatus.partitions > 1 ? 0.8 : 0.1;
    
    this.emit('network_conditions_updated', {
      conditions: this.networkConditions,
      metrics: { gossipMetrics, quorumStatus, securityStatus }
    });
  }

  private startNetworkMonitoring(): void {
    setInterval(() => {
      this.updateNetworkConditions();
    }, 30000); // Every 30 seconds
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateAggregateMetrics();
    }, 60000); // Every minute
  }

  private updateAggregateMetrics(): void {
    // Update success rate
    const recentDecisions = this.decisionHistory.slice(-100);
    if (recentDecisions.length > 0) {
      const successes = recentDecisions.filter(d => d.success).length;
      this.metrics.successRate = successes / recentDecisions.length;
      
      // Update average latency
      this.metrics.averageLatency = recentDecisions
        .reduce((sum, d) => sum + d.latency, 0) / recentDecisions.length;
      
      // Update average confidence
      this.metrics.averageConfidence = recentDecisions
        .reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length;
    }
    
    // Update network efficiency
    const gossipMetrics = this.gossipCoordinator.getMetrics();
    this.metrics.networkEfficiency = Math.max(0.1, 1 - (gossipMetrics.duplicateMessageCount / Math.max(1, gossipMetrics.totalMessagesProcessed)));
    
    this.emit('metrics_updated', {
      metrics: this.metrics,
      timestamp: Date.now()
    });
  }

  private updateMetrics(result: ConsensusResult, startTime: number): void {
    this.metrics.totalDecisions++;
    
    if (result.success) {
      this.metrics.faultsTolerated += result.faultsTolerated;
    }
    
    // Update running averages
    const totalDecisions = this.metrics.totalDecisions;
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (totalDecisions - 1) + result.latency) / totalDecisions;
    
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (totalDecisions - 1) + result.confidence) / totalDecisions;
  }

  /**
   * Public API methods
   */

  public getCurrentMetrics(): ConsensusMetrics {
    return { ...this.metrics };
  }

  public getNetworkConditions(): NetworkConditions {
    return { ...this.networkConditions };
  }

  public getDecisionHistory(limit: number = 100): Array<{
    requestId: string;
    timestamp: number;
    mode: ConsensusMode;
    context: DecisionContext;
    latency: number;
    success: boolean;
    confidence: number;
  }> {
    return this.decisionHistory.slice(-limit);
  }

  public updateConfiguration(updates: Partial<HiveMindConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates };
    
    this.emit('configuration_updated', {
      updates,
      newConfiguration: this.configuration
    });
  }

  public getSystemStatus(): {
    consensus: {
      byzantine: boolean;
      raft: boolean;
      crdt: boolean;
      gossip: boolean;
      security: boolean;
      quorum: boolean;
    };
    networkConditions: NetworkConditions;
    activeRequests: number;
    metrics: ConsensusMetrics;
  } {
    return {
      consensus: {
        byzantine: !!this.byzantineCoordinator,
        raft: !!this.raftManager,
        crdt: !!this.crdtSynchronizer,
        gossip: !!this.gossipCoordinator,
        security: !!this.securityManager,
        quorum: !!this.quorumManager
      },
      networkConditions: this.networkConditions,
      activeRequests: this.activeRequests.size,
      metrics: this.metrics
    };
  }

  public shutdown(): void {
    // Clear active requests
    for (const [requestId, request] of this.activeRequests) {
      clearTimeout(request.timeoutHandle);
      request.reject(new Error('System shutting down'));
    }
    this.activeRequests.clear();
    
    // Shutdown components
    if (this.byzantineCoordinator) {
      // Byzantine coordinator doesn't have shutdown method in our implementation
    }
    
    if (this.raftManager) {
      this.raftManager.shutdown();
    }
    
    this.crdtSynchronizer.shutdown();
    this.quorumManager.shutdown();
    this.gossipCoordinator.shutdown();
    this.securityManager.shutdown();
    
    this.emit('shutdown', {
      finalMetrics: this.metrics,
      totalDecisions: this.decisionHistory.length
    });
  }
}

export default HiveMindConsensusOrchestrator;