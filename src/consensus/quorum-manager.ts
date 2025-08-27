/**
 * Quorum Manager
 * 
 * Manages dynamic quorum calculation and validation for distributed consensus.
 * Supports multiple fault models, weighted voting, and adaptive thresholds
 * based on network conditions and node trust levels.
 */

import { EventEmitter } from 'events';

export enum FaultModel {
  CRASH = 'crash',
  BYZANTINE = 'byzantine',
  OMISSION = 'omission',
  WEIGHTED = 'weighted'
}

export enum OperationType {
  STANDARD = 'standard',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
  MAINTENANCE = 'maintenance'
}

export interface QuorumNode {
  id: string;
  weight: number;
  trustScore: number;
  isOnline: boolean;
  lastActivity: number;
  responseTime: number;
  failureCount: number;
  stake?: number; // For weighted systems
  region?: string; // For geo-distributed systems
  capabilities: string[];
}

export interface QuorumCalculation {
  requiredNodes: number;
  requiredWeight: number;
  faultTolerance: number;
  safetyMargin: number;
  availableNodes: number;
  totalWeight: number;
  canReachQuorum: boolean;
  participatingNodes: string[];
  excludedNodes: string[];
  confidence: number;
}

export interface QuorumValidation {
  isValid: boolean;
  hasQuorum: boolean;
  participantCount: number;
  totalWeight: number;
  requiredWeight: number;
  missingNodes: string[];
  trustLevel: number;
  reason?: string;
}

export interface NetworkPartition {
  partitionId: string;
  nodes: Set<string>;
  totalWeight: number;
  canFormQuorum: boolean;
  isMajority: boolean;
  timestamp: number;
}

export interface QuorumConfiguration {
  faultModel: FaultModel;
  baseThreshold: number; // 0.5 for simple majority, 0.67 for supermajority
  maxFaults: number;
  minActiveNodes: number;
  weightDecayFactor: number; // For trust-based weight adjustment
  partitionDetectionTimeout: number;
  adaptiveThresholds: boolean;
  requireGeographicDistribution: boolean;
  emergencyMode: {
    enabled: boolean;
    reducedThreshold: number;
    timeoutPeriod: number;
  };
}

export class QuorumManager extends EventEmitter {
  private nodes: Map<string, QuorumNode> = new Map();
  private configuration: QuorumConfiguration;
  private partitions: Map<string, NetworkPartition> = new Map();
  private quorumHistory: Array<{
    timestamp: number;
    calculation: QuorumCalculation;
    operationType: OperationType;
    success: boolean;
  }> = [];
  
  private emergencyModeActive: boolean = false;
  private emergencyModeStartTime: number = 0;
  private partitionDetectionTimer: NodeJS.Timeout | null = null;
  
  // Metrics
  private quorumSuccessRate: number = 1.0;
  private averageQuorumSize: number = 0;
  private partitionEvents: number = 0;
  private emergencyActivations: number = 0;

  constructor(configuration: QuorumConfiguration) {
    super();
    this.configuration = configuration;
    
    this.startPartitionDetection();
    this.startTrustScoreMonitoring();
    
    this.emit('initialized', {
      faultModel: this.configuration.faultModel,
      baseThreshold: this.configuration.baseThreshold,
      emergencyModeEnabled: this.configuration.emergencyMode.enabled
    });
  }

  /**
   * Add or update a node in the quorum
   */
  addNode(node: QuorumNode): void {
    const existingNode = this.nodes.get(node.id);
    
    if (existingNode) {
      // Update existing node
      this.nodes.set(node.id, {
        ...existingNode,
        ...node,
        lastActivity: Date.now()
      });
    } else {
      // Add new node
      this.nodes.set(node.id, {
        ...node,
        lastActivity: Date.now(),
        failureCount: 0
      });
    }
    
    this.emit('node_added', {
      nodeId: node.id,
      weight: node.weight,
      trustScore: node.trustScore,
      totalNodes: this.nodes.size
    });
    
    // Recalculate quorum requirements
    this.recalculateQuorumThresholds();
  }

  /**
   * Remove a node from the quorum
   */
  removeNode(nodeId: string): boolean {
    if (this.nodes.has(nodeId)) {
      const node = this.nodes.get(nodeId)!;
      this.nodes.delete(nodeId);
      
      this.emit('node_removed', {
        nodeId,
        weight: node.weight,
        reason: 'manual_removal',
        totalNodes: this.nodes.size
      });
      
      this.recalculateQuorumThresholds();
      return true;
    }
    return false;
  }

  /**
   * Update node status and metrics
   */
  updateNodeStatus(nodeId: string, updates: Partial<QuorumNode>): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const updatedNode = {
      ...node,
      ...updates,
      lastActivity: updates.isOnline ? Date.now() : node.lastActivity
    };
    
    // Handle trust score changes
    if (updates.trustScore !== undefined && updates.trustScore !== node.trustScore) {
      this.handleTrustScoreChange(nodeId, node.trustScore, updates.trustScore);
    }
    
    // Handle online status changes
    if (updates.isOnline !== undefined && updates.isOnline !== node.isOnline) {
      this.handleNodeStatusChange(nodeId, updates.isOnline);
    }
    
    this.nodes.set(nodeId, updatedNode);
    
    this.emit('node_updated', {
      nodeId,
      changes: updates,
      newState: updatedNode
    });
  }

  /**
   * Calculate quorum requirements for specific operation
   */
  calculateQuorum(operationType: OperationType = OperationType.STANDARD): QuorumCalculation {
    const activeNodes = Array.from(this.nodes.values()).filter(node => 
      node.isOnline && !this.isNodePartitioned(node.id)
    );
    
    const totalNodes = this.nodes.size;
    const availableNodes = activeNodes.length;
    const totalWeight = activeNodes.reduce((sum, node) => sum + node.weight, 0);
    
    let requiredWeight: number;
    let requiredNodes: number;
    let faultTolerance: number;
    
    // Calculate based on fault model and operation type
    switch (this.configuration.faultModel) {
      case FaultModel.CRASH:
        faultTolerance = Math.floor((totalNodes - 1) / 2);
        requiredNodes = faultTolerance + 1;
        requiredWeight = this.calculateCrashFaultThreshold(totalWeight, operationType);
        break;
        
      case FaultModel.BYZANTINE:
        faultTolerance = Math.floor((totalNodes - 1) / 3);
        requiredNodes = 2 * faultTolerance + 1;
        requiredWeight = this.calculateByzantineFaultThreshold(totalWeight, operationType);
        break;
        
      case FaultModel.OMISSION:
        faultTolerance = Math.floor((totalNodes - 1) / 2);
        requiredNodes = faultTolerance + 1;
        requiredWeight = this.calculateOmissionFaultThreshold(totalWeight, operationType);
        break;
        
      case FaultModel.WEIGHTED:
        const result = this.calculateWeightedQuorum(activeNodes, operationType);
        requiredNodes = result.nodes;
        requiredWeight = result.weight;
        faultTolerance = result.faultTolerance;
        break;
        
      default:
        throw new Error(`Unsupported fault model: ${this.configuration.faultModel}`);
    }
    
    // Apply emergency mode adjustments
    if (this.emergencyModeActive) {
      const emergencyFactor = this.configuration.emergencyMode.reducedThreshold;
      requiredWeight *= emergencyFactor;
      requiredNodes = Math.floor(requiredNodes * emergencyFactor);
    }
    
    // Select participating nodes
    const { participatingNodes, excludedNodes } = this.selectParticipatingNodes(
      activeNodes, 
      requiredNodes, 
      requiredWeight,
      operationType
    );
    
    const canReachQuorum = participatingNodes.length >= requiredNodes && 
                          participatingNodes.reduce((sum, nodeId) => {
                            const node = this.nodes.get(nodeId);
                            return sum + (node?.weight || 0);
                          }, 0) >= requiredWeight;
    
    // Calculate confidence based on trust scores and network conditions
    const confidence = this.calculateQuorumConfidence(participatingNodes, operationType);
    
    const calculation: QuorumCalculation = {
      requiredNodes,
      requiredWeight,
      faultTolerance,
      safetyMargin: availableNodes - requiredNodes,
      availableNodes,
      totalWeight,
      canReachQuorum,
      participatingNodes,
      excludedNodes,
      confidence
    };
    
    // Store in history
    this.quorumHistory.push({
      timestamp: Date.now(),
      calculation,
      operationType,
      success: canReachQuorum
    });
    
    // Trim history
    if (this.quorumHistory.length > 1000) {
      this.quorumHistory = this.quorumHistory.slice(-1000);
    }
    
    this.emit('quorum_calculated', {
      operationType,
      calculation,
      emergencyMode: this.emergencyModeActive
    });
    
    return calculation;
  }

  /**
   * Validate if a set of nodes forms a valid quorum
   */
  validateQuorum(nodeIds: string[], operationType: OperationType = OperationType.STANDARD): QuorumValidation {
    const calculation = this.calculateQuorum(operationType);
    
    // Filter to only include online, non-partitioned nodes
    const validParticipants = nodeIds.filter(nodeId => {
      const node = this.nodes.get(nodeId);
      return node && node.isOnline && !this.isNodePartitioned(nodeId);
    });
    
    const participantCount = validParticipants.length;
    const totalWeight = validParticipants.reduce((sum, nodeId) => {
      const node = this.nodes.get(nodeId);
      return sum + (node?.weight || 0);
    }, 0);
    
    const hasQuorum = participantCount >= calculation.requiredNodes && 
                      totalWeight >= calculation.requiredWeight;
    
    // Calculate trust level
    const trustScores = validParticipants.map(nodeId => 
      this.nodes.get(nodeId)?.trustScore || 0
    );
    const trustLevel = trustScores.length > 0 
      ? trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length 
      : 0;
    
    // Find missing nodes if quorum not reached
    const missingNodes: string[] = [];
    if (!hasQuorum) {
      const allEligibleNodes = Array.from(this.nodes.keys()).filter(nodeId => {
        const node = this.nodes.get(nodeId);
        return node && node.isOnline && !this.isNodePartitioned(nodeId);
      });
      
      missingNodes.push(...allEligibleNodes.filter(nodeId => !nodeIds.includes(nodeId)));
    }
    
    // Determine reason if not valid
    let reason: string | undefined;
    if (!hasQuorum) {
      if (participantCount < calculation.requiredNodes) {
        reason = `Insufficient nodes: ${participantCount}/${calculation.requiredNodes}`;
      } else if (totalWeight < calculation.requiredWeight) {
        reason = `Insufficient weight: ${totalWeight.toFixed(2)}/${calculation.requiredWeight.toFixed(2)}`;
      }
    }
    
    const validation: QuorumValidation = {
      isValid: hasQuorum && trustLevel >= 0.3, // Minimum trust threshold
      hasQuorum,
      participantCount,
      totalWeight,
      requiredWeight: calculation.requiredWeight,
      missingNodes,
      trustLevel,
      reason
    };
    
    this.emit('quorum_validated', {
      nodeIds,
      operationType,
      validation
    });
    
    return validation;
  }

  /**
   * Handle network partitions
   */
  detectPartitions(): NetworkPartition[] {
    const now = Date.now();
    const timeout = this.configuration.partitionDetectionTimeout;
    
    // Group nodes by connectivity
    const connectedGroups = this.groupNodesByConnectivity();
    const partitions: NetworkPartition[] = [];
    
    for (const [groupId, nodeIds] of connectedGroups) {
      const nodes = new Set(nodeIds);
      const totalWeight = nodeIds.reduce((sum, nodeId) => {
        const node = this.nodes.get(nodeId);
        return sum + (node?.weight || 0);
      }, 0);
      
      const totalSystemWeight = Array.from(this.nodes.values())
        .reduce((sum, node) => sum + node.weight, 0);
      
      const canFormQuorum = this.canPartitionFormQuorum(nodeIds);
      const isMajority = totalWeight > (totalSystemWeight / 2);
      
      const partition: NetworkPartition = {
        partitionId: groupId,
        nodes,
        totalWeight,
        canFormQuorum,
        isMajority,
        timestamp: now
      };
      
      partitions.push(partition);
    }
    
    // Update partition state
    this.partitions.clear();
    partitions.forEach(partition => {
      this.partitions.set(partition.partitionId, partition);
    });
    
    // Emit partition events
    if (partitions.length > 1) {
      this.partitionEvents++;
      this.emit('partitions_detected', {
        partitionCount: partitions.length,
        partitions: partitions.map(p => ({
          id: p.partitionId,
          nodeCount: p.nodes.size,
          weight: p.totalWeight,
          canFormQuorum: p.canFormQuorum,
          isMajority: p.isMajority
        }))
      });
    }
    
    return partitions;
  }

  /**
   * Activate emergency mode for degraded operation
   */
  activateEmergencyMode(reason: string): void {
    if (this.emergencyModeActive) return;
    
    this.emergencyModeActive = true;
    this.emergencyModeStartTime = Date.now();
    this.emergencyActivations++;
    
    this.emit('emergency_mode_activated', {
      reason,
      reducedThreshold: this.configuration.emergencyMode.reducedThreshold,
      timeout: this.configuration.emergencyMode.timeoutPeriod
    });
    
    // Set timeout to deactivate emergency mode
    setTimeout(() => {
      this.deactivateEmergencyMode('timeout');
    }, this.configuration.emergencyMode.timeoutPeriod);
  }

  /**
   * Deactivate emergency mode
   */
  deactivateEmergencyMode(reason: string): void {
    if (!this.emergencyModeActive) return;
    
    const duration = Date.now() - this.emergencyModeStartTime;
    this.emergencyModeActive = false;
    this.emergencyModeStartTime = 0;
    
    this.emit('emergency_mode_deactivated', {
      reason,
      duration,
      activationCount: this.emergencyActivations
    });
  }

  /**
   * Private helper methods
   */

  private calculateCrashFaultThreshold(totalWeight: number, operationType: OperationType): number {
    let threshold = this.configuration.baseThreshold;
    
    switch (operationType) {
      case OperationType.CRITICAL:
        threshold = Math.max(threshold, 0.67); // Supermajority for critical ops
        break;
      case OperationType.EMERGENCY:
        threshold = Math.max(threshold, 0.75); // Higher threshold for emergency
        break;
      case OperationType.MAINTENANCE:
        threshold = Math.min(threshold, 0.51); // Lower threshold for maintenance
        break;
    }
    
    return totalWeight * threshold;
  }

  private calculateByzantineFaultThreshold(totalWeight: number, operationType: OperationType): number {
    // Byzantine requires higher thresholds
    let threshold = Math.max(this.configuration.baseThreshold, 0.67);
    
    switch (operationType) {
      case OperationType.CRITICAL:
        threshold = 0.75;
        break;
      case OperationType.EMERGENCY:
        threshold = 0.8;
        break;
      case OperationType.MAINTENANCE:
        threshold = 0.67;
        break;
    }
    
    return totalWeight * threshold;
  }

  private calculateOmissionFaultThreshold(totalWeight: number, operationType: OperationType): number {
    // Similar to crash faults but slightly higher for reliability
    let threshold = Math.max(this.configuration.baseThreshold, 0.55);
    
    switch (operationType) {
      case OperationType.CRITICAL:
        threshold = 0.7;
        break;
      case OperationType.EMERGENCY:
        threshold = 0.75;
        break;
      case OperationType.MAINTENANCE:
        threshold = 0.55;
        break;
    }
    
    return totalWeight * threshold;
  }

  private calculateWeightedQuorum(
    activeNodes: QuorumNode[], 
    operationType: OperationType
  ): { nodes: number; weight: number; faultTolerance: number } {
    const totalWeight = activeNodes.reduce((sum, node) => sum + node.weight, 0);
    const totalNodes = activeNodes.length;
    
    // Calculate based on stake and trust
    const averageTrust = activeNodes.reduce((sum, node) => sum + node.trustScore, 0) / totalNodes;
    let threshold = this.configuration.baseThreshold;
    
    // Adjust threshold based on average trust
    if (averageTrust < 0.7) {
      threshold += 0.1; // Require more consensus if trust is low
    }
    
    // Adjust for operation type
    switch (operationType) {
      case OperationType.CRITICAL:
        threshold = Math.max(threshold, 0.7);
        break;
      case OperationType.EMERGENCY:
        threshold = Math.max(threshold, 0.75);
        break;
    }
    
    const requiredWeight = totalWeight * threshold;
    const requiredNodes = Math.max(
      Math.ceil(totalNodes * 0.5), // At least half the nodes
      Math.ceil(totalNodes * threshold * 0.8) // But scale with threshold
    );
    
    // Calculate fault tolerance
    const faultTolerance = totalNodes - requiredNodes;
    
    return {
      nodes: requiredNodes,
      weight: requiredWeight,
      faultTolerance
    };
  }

  private selectParticipatingNodes(
    activeNodes: QuorumNode[],
    requiredNodes: number,
    requiredWeight: number,
    operationType: OperationType
  ): { participatingNodes: string[]; excludedNodes: string[] } {
    
    // Sort nodes by selection criteria
    const sortedNodes = activeNodes.sort((a, b) => {
      // Prioritize by trust score, weight, and response time
      const aScore = a.trustScore * 0.5 + (a.weight / 10) * 0.3 - (a.responseTime / 1000) * 0.2;
      const bScore = b.trustScore * 0.5 + (b.weight / 10) * 0.3 - (b.responseTime / 1000) * 0.2;
      return bScore - aScore;
    });
    
    const participatingNodes: string[] = [];
    const excludedNodes: string[] = [];
    let accumulatedWeight = 0;
    
    // Select nodes until we meet requirements
    for (const node of sortedNodes) {
      if (participatingNodes.length >= requiredNodes && accumulatedWeight >= requiredWeight) {
        excludedNodes.push(node.id);
      } else {
        // Additional checks for geographic distribution if required
        if (this.configuration.requireGeographicDistribution && 
            !this.hasGeographicDistribution(participatingNodes, node)) {
          continue;
        }
        
        participatingNodes.push(node.id);
        accumulatedWeight += node.weight;
      }
    }
    
    // Add remaining nodes to excluded list
    for (const node of sortedNodes) {
      if (!participatingNodes.includes(node.id) && !excludedNodes.includes(node.id)) {
        excludedNodes.push(node.id);
      }
    }
    
    return { participatingNodes, excludedNodes };
  }

  private calculateQuorumConfidence(participatingNodes: string[], operationType: OperationType): number {
    if (participatingNodes.length === 0) return 0;
    
    let confidence = 0;
    let weightSum = 0;
    
    // Calculate weighted confidence based on trust scores
    for (const nodeId of participatingNodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        confidence += node.trustScore * node.weight;
        weightSum += node.weight;
      }
    }
    
    const baseConfidence = weightSum > 0 ? confidence / weightSum : 0;
    
    // Adjust for operation type
    let adjustment = 1.0;
    switch (operationType) {
      case OperationType.CRITICAL:
        adjustment = 0.9; // Be more conservative
        break;
      case OperationType.EMERGENCY:
        adjustment = 0.85;
        break;
      case OperationType.MAINTENANCE:
        adjustment = 1.1; // Be less conservative
        break;
    }
    
    // Adjust for network conditions
    const networkHealth = this.calculateNetworkHealth();
    adjustment *= networkHealth;
    
    return Math.min(1.0, baseConfidence * adjustment);
  }

  private isNodePartitioned(nodeId: string): boolean {
    // Check if node is in a minority partition
    for (const partition of this.partitions.values()) {
      if (partition.nodes.has(nodeId) && !partition.isMajority) {
        return true;
      }
    }
    return false;
  }

  private groupNodesByConnectivity(): Map<string, string[]> {
    // Simplified connectivity grouping
    // In practice, this would use network topology information
    const groups = new Map<string, string[]>();
    const now = Date.now();
    
    const recentlyActive = Array.from(this.nodes.entries())
      .filter(([_, node]) => now - node.lastActivity < 30000) // Active in last 30 seconds
      .map(([nodeId]) => nodeId);
    
    const stale = Array.from(this.nodes.entries())
      .filter(([_, node]) => now - node.lastActivity >= 30000)
      .map(([nodeId]) => nodeId);
    
    if (recentlyActive.length > 0) {
      groups.set('active', recentlyActive);
    }
    
    if (stale.length > 0) {
      groups.set('stale', stale);
    }
    
    return groups;
  }

  private canPartitionFormQuorum(nodeIds: string[]): boolean {
    const nodes = nodeIds.map(id => this.nodes.get(id)).filter(node => node) as QuorumNode[];
    const mockCalculation = this.calculateQuorum(OperationType.STANDARD);
    
    const partitionWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
    return nodes.length >= mockCalculation.requiredNodes && 
           partitionWeight >= mockCalculation.requiredWeight;
  }

  private hasGeographicDistribution(selectedNodes: string[], candidate: QuorumNode): boolean {
    if (!candidate.region) return true;
    
    const selectedRegions = new Set(
      selectedNodes
        .map(nodeId => this.nodes.get(nodeId)?.region)
        .filter(region => region)
    );
    
    // Ensure we don't over-concentrate in one region
    const maxNodesPerRegion = Math.max(2, Math.ceil(selectedNodes.length / 3));
    const nodesInCandidateRegion = selectedNodes.filter(nodeId => {
      const node = this.nodes.get(nodeId);
      return node?.region === candidate.region;
    }).length;
    
    return nodesInCandidateRegion < maxNodesPerRegion;
  }

  private calculateNetworkHealth(): number {
    const now = Date.now();
    const activeNodes = Array.from(this.nodes.values()).filter(node => 
      node.isOnline && (now - node.lastActivity) < 60000
    );
    
    if (activeNodes.length === 0) return 0;
    
    // Calculate based on response times and failure rates
    const averageResponseTime = activeNodes.reduce((sum, node) => sum + node.responseTime, 0) / activeNodes.length;
    const averageFailureRate = activeNodes.reduce((sum, node) => sum + node.failureCount, 0) / activeNodes.length;
    
    const responseScore = Math.max(0, 1 - (averageResponseTime / 5000)); // Normalize to 5 second max
    const reliabilityScore = Math.max(0, 1 - (averageFailureRate / 10)); // Normalize to 10 failures max
    
    return (responseScore * 0.6 + reliabilityScore * 0.4);
  }

  private handleTrustScoreChange(nodeId: string, oldScore: number, newScore: number): void {
    const change = newScore - oldScore;
    
    if (Math.abs(change) > 0.2) { // Significant trust change
      this.emit('significant_trust_change', {
        nodeId,
        oldScore,
        newScore,
        change,
        timestamp: Date.now()
      });
      
      // Consider recalculating quorum if trust drops significantly
      if (change < -0.3) {
        this.recalculateQuorumThresholds();
      }
    }
  }

  private handleNodeStatusChange(nodeId: string, isOnline: boolean): void {
    if (!isOnline) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.failureCount++;
      }
      
      // Check if we need emergency mode
      const onlineNodes = Array.from(this.nodes.values()).filter(n => n.isOnline).length;
      const totalNodes = this.nodes.size;
      
      if (onlineNodes / totalNodes < 0.6 && !this.emergencyModeActive) {
        this.activateEmergencyMode('insufficient_online_nodes');
      }
    }
    
    this.emit('node_status_changed', {
      nodeId,
      isOnline,
      timestamp: Date.now()
    });
  }

  private recalculateQuorumThresholds(): void {
    // Recalculate thresholds based on current node composition
    const activeNodes = Array.from(this.nodes.values()).filter(node => node.isOnline);
    const averageTrust = activeNodes.reduce((sum, node) => sum + node.trustScore, 0) / activeNodes.length;
    
    // Adjust configuration based on trust levels
    if (averageTrust < 0.7 && this.configuration.adaptiveThresholds) {
      // Increase thresholds if trust is low
      this.configuration.baseThreshold = Math.min(0.8, this.configuration.baseThreshold + 0.05);
    } else if (averageTrust > 0.9 && this.configuration.adaptiveThresholds) {
      // Decrease thresholds if trust is very high
      this.configuration.baseThreshold = Math.max(0.51, this.configuration.baseThreshold - 0.02);
    }
    
    this.emit('thresholds_recalculated', {
      averageTrust,
      newBaseThreshold: this.configuration.baseThreshold,
      activeNodes: activeNodes.length
    });
  }

  private startPartitionDetection(): void {
    this.partitionDetectionTimer = setInterval(() => {
      this.detectPartitions();
    }, 15000); // Check every 15 seconds
  }

  private startTrustScoreMonitoring(): void {
    setInterval(() => {
      this.updateTrustScores();
    }, 30000); // Update every 30 seconds
  }

  private updateTrustScores(): void {
    const now = Date.now();
    const decayFactor = this.configuration.weightDecayFactor;
    
    this.nodes.forEach((node, nodeId) => {
      // Decay trust score based on inactivity
      const timeSinceActivity = now - node.lastActivity;
      if (timeSinceActivity > 300000) { // 5 minutes
        const decayAmount = (timeSinceActivity / 3600000) * decayFactor; // Hourly decay
        node.trustScore = Math.max(0.1, node.trustScore - decayAmount);
      }
      
      // Adjust weight based on trust score
      const originalWeight = node.weight;
      node.weight = originalWeight * Math.max(0.1, node.trustScore);
    });
  }

  /**
   * Public API methods
   */

  public getQuorumStatus(): {
    totalNodes: number;
    onlineNodes: number;
    averageTrust: number;
    canFormQuorum: boolean;
    emergencyMode: boolean;
    partitions: number;
    successRate: number;
  } {
    const onlineNodes = Array.from(this.nodes.values()).filter(node => node.isOnline);
    const averageTrust = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, node) => sum + node.trustScore, 0) / onlineNodes.length
      : 0;
    
    const calculation = this.calculateQuorum();
    
    // Calculate success rate from recent history
    const recentHistory = this.quorumHistory.slice(-100); // Last 100 operations
    this.quorumSuccessRate = recentHistory.length > 0
      ? recentHistory.filter(h => h.success).length / recentHistory.length
      : 1.0;
    
    return {
      totalNodes: this.nodes.size,
      onlineNodes: onlineNodes.length,
      averageTrust,
      canFormQuorum: calculation.canReachQuorum,
      emergencyMode: this.emergencyModeActive,
      partitions: this.partitions.size,
      successRate: this.quorumSuccessRate
    };
  }

  public getNodeDetails(nodeId?: string): QuorumNode | QuorumNode[] | null {
    if (nodeId) {
      return this.nodes.get(nodeId) || null;
    }
    return Array.from(this.nodes.values());
  }

  public getMetrics(): {
    totalQuorumCalculations: number;
    successRate: number;
    averageQuorumSize: number;
    partitionEvents: number;
    emergencyActivations: number;
    averageConfidence: number;
  } {
    const avgQuorumSize = this.quorumHistory.length > 0
      ? this.quorumHistory.reduce((sum, h) => sum + h.calculation.participatingNodes.length, 0) / this.quorumHistory.length
      : 0;
    
    const avgConfidence = this.quorumHistory.length > 0
      ? this.quorumHistory.reduce((sum, h) => sum + h.calculation.confidence, 0) / this.quorumHistory.length
      : 0;
    
    return {
      totalQuorumCalculations: this.quorumHistory.length,
      successRate: this.quorumSuccessRate,
      averageQuorumSize: avgQuorumSize,
      partitionEvents: this.partitionEvents,
      emergencyActivations: this.emergencyActivations,
      averageConfidence: avgConfidence
    };
  }

  public shutdown(): void {
    if (this.partitionDetectionTimer) {
      clearInterval(this.partitionDetectionTimer);
    }
    
    this.emit('shutdown', {
      finalMetrics: this.getMetrics(),
      finalStatus: this.getQuorumStatus()
    });
  }
}

export default QuorumManager;