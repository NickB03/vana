/**
 * Quorum Manager
 * 
 * Manages dynamic quorum adjustments and fault tolerance calculations
 * for the Byzantine consensus system.
 */

const EventEmitter = require('events');

class QuorumManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.totalNodes = options.totalNodes || 4;
    this.maxFaults = options.maxFaults || 1;
    this.currentQuorum = this.calculateOptimalQuorum();
    this.minQuorum = Math.max(Math.floor(this.totalNodes / 2) + 1, 2);
    
    // Node tracking
    this.activeNodes = new Set();
    this.partitionedNodes = new Set();
    this.maliciousNodes = new Set();
    this.suspiciousNodes = new Set();
    
    // Dynamic adjustment parameters
    this.adjustmentThreshold = 0.1; // 10% change threshold
    this.lastAdjustment = Date.now();
    this.adjustmentCooldown = 30000; // 30 seconds
    
    // Performance metrics
    this.consensusLatency = [];
    this.throughputMetrics = [];
    
    this.initialize();
  }

  initialize() {
    console.log(`📊 Initializing Quorum Manager`);
    console.log(`   Total nodes: ${this.totalNodes}`);
    console.log(`   Max faults: ${this.maxFaults}`);
    console.log(`   Optimal quorum: ${this.currentQuorum}`);
    console.log(`   Minimum quorum: ${this.minQuorum}`);
    
    // Start monitoring
    this.startQuorumMonitoring();
    
    this.emit('initialized', {
      totalNodes: this.totalNodes,
      maxFaults: this.maxFaults,
      currentQuorum: this.currentQuorum,
      minQuorum: this.minQuorum
    });
  }

  calculateOptimalQuorum() {
    // Byzantine fault tolerance: need > 2f votes for safety
    // and > (n + f) / 2 for liveness
    return Math.floor((this.totalNodes + this.maxFaults) / 2) + 1;
  }

  calculateMinimumQuorum() {
    // Minimum quorum to maintain consensus
    const activeNodes = this.getActiveNodeCount();
    return Math.max(Math.floor(activeNodes / 2) + 1, 2);
  }

  getActiveNodeCount() {
    return this.totalNodes - this.partitionedNodes.size - this.maliciousNodes.size;
  }

  updateNodeStatus(nodeId, status, reason = '') {
    console.log(`🔄 Updating node ${nodeId} status: ${status} (${reason})`);
    
    // Clear node from all sets first
    this.activeNodes.delete(nodeId);
    this.partitionedNodes.delete(nodeId);
    this.maliciousNodes.delete(nodeId);
    this.suspiciousNodes.delete(nodeId);
    
    // Add to appropriate set
    switch (status) {
      case 'active':
        this.activeNodes.add(nodeId);
        break;
      case 'partitioned':
        this.partitionedNodes.add(nodeId);
        break;
      case 'malicious':
        this.maliciousNodes.add(nodeId);
        break;
      case 'suspicious':
        this.suspiciousNodes.add(nodeId);
        this.activeNodes.add(nodeId); // Keep in active but monitor
        break;
    }
    
    // Check if quorum adjustment is needed
    this.evaluateQuorumAdjustment(reason);
    
    this.emit('nodeStatusUpdated', {
      nodeId,
      status,
      reason,
      activeNodes: this.getActiveNodeCount(),
      currentQuorum: this.currentQuorum
    });
  }

  evaluateQuorumAdjustment(trigger) {
    const now = Date.now();
    
    // Respect cooldown period
    if (now - this.lastAdjustment < this.adjustmentCooldown) {
      return false;
    }
    
    const activeNodes = this.getActiveNodeCount();
    const optimalQuorum = this.calculateOptimalQuorum();
    const minimumQuorum = this.calculateMinimumQuorum();
    
    let newQuorum = this.currentQuorum;
    let adjustmentReason = '';
    
    // Emergency adjustment - active nodes below current quorum
    if (activeNodes < this.currentQuorum) {
      newQuorum = Math.max(minimumQuorum, Math.min(activeNodes, this.currentQuorum));
      adjustmentReason = `Emergency: active nodes (${activeNodes}) below quorum`;
    }
    // Performance-based adjustment
    else if (this.shouldAdjustForPerformance()) {
      const avgLatency = this.getAverageLatency();
      const avgThroughput = this.getAverageThroughput();
      
      if (avgLatency > 5000 && this.currentQuorum > minimumQuorum) {
        // High latency, reduce quorum if safe
        newQuorum = Math.max(minimumQuorum, this.currentQuorum - 1);
        adjustmentReason = `Performance: high latency (${avgLatency}ms)`;
      } else if (avgThroughput < 10 && activeNodes > this.currentQuorum + 1) {
        // Low throughput, increase quorum for better fault tolerance
        newQuorum = Math.min(optimalQuorum, this.currentQuorum + 1);
        adjustmentReason = `Performance: low throughput (${avgThroughput} req/s)`;
      }
    }
    // Optimal restoration
    else if (activeNodes >= optimalQuorum && this.currentQuorum !== optimalQuorum) {
      newQuorum = optimalQuorum;
      adjustmentReason = 'Restoring optimal quorum';
    }
    
    // Apply adjustment
    if (newQuorum !== this.currentQuorum) {
      this.adjustQuorum(newQuorum, `${trigger}: ${adjustmentReason}`);
      return true;
    }
    
    return false;
  }

  adjustQuorum(newQuorum, reason) {
    const oldQuorum = this.currentQuorum;
    
    // Validate new quorum
    if (newQuorum < 1) {
      console.warn(`❌ Invalid quorum size: ${newQuorum}, using minimum`);
      newQuorum = this.minQuorum;
    }
    
    if (newQuorum > this.getActiveNodeCount()) {
      console.warn(`❌ Quorum (${newQuorum}) exceeds active nodes (${this.getActiveNodeCount()})`);
      newQuorum = Math.max(this.minQuorum, this.getActiveNodeCount());
    }
    
    this.currentQuorum = newQuorum;
    this.lastAdjustment = Date.now();
    
    console.log(`📊 Quorum adjusted: ${oldQuorum} → ${newQuorum}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Active nodes: ${this.getActiveNodeCount()}`);
    console.log(`   Fault tolerance: ${this.calculateFaultTolerance()}`);
    
    this.emit('quorumAdjusted', {
      oldQuorum,
      newQuorum,
      reason,
      activeNodes: this.getActiveNodeCount(),
      faultTolerance: this.calculateFaultTolerance(),
      timestamp: Date.now()
    });
  }

  calculateFaultTolerance() {
    // Calculate how many Byzantine faults we can tolerate
    const activeNodes = this.getActiveNodeCount();
    return Math.floor((activeNodes - 1) / 3);
  }

  isQuorumMet(voteCount) {
    return voteCount >= this.currentQuorum;
  }

  isQuorumPossible() {
    // Check if we can still achieve quorum with current active nodes
    return this.getActiveNodeCount() >= this.currentQuorum;
  }

  getQuorumHealth() {
    const activeNodes = this.getActiveNodeCount();
    const optimalQuorum = this.calculateOptimalQuorum();
    
    let health = 'healthy';
    let healthScore = 1.0;
    
    if (activeNodes < this.currentQuorum) {
      health = 'critical';
      healthScore = activeNodes / this.currentQuorum;
    } else if (activeNodes < optimalQuorum) {
      health = 'degraded';
      healthScore = activeNodes / optimalQuorum;
    } else if (this.suspiciousNodes.size > 0) {
      health = 'warning';
      healthScore = (activeNodes - this.suspiciousNodes.size) / activeNodes;
    }
    
    return {
      health,
      healthScore,
      activeNodes,
      currentQuorum: this.currentQuorum,
      optimalQuorum,
      faultTolerance: this.calculateFaultTolerance(),
      canAchieveConsensus: this.isQuorumPossible()
    };
  }

  // Performance monitoring

  recordConsensusLatency(latency) {
    this.consensusLatency.push({
      latency,
      timestamp: Date.now()
    });
    
    // Keep only recent measurements
    const cutoff = Date.now() - 300000; // 5 minutes
    this.consensusLatency = this.consensusLatency.filter(m => m.timestamp > cutoff);
  }

  recordThroughput(requestCount, timeWindow) {
    const throughput = requestCount / (timeWindow / 1000); // req/s
    
    this.throughputMetrics.push({
      throughput,
      requestCount,
      timeWindow,
      timestamp: Date.now()
    });
    
    // Keep only recent measurements
    const cutoff = Date.now() - 300000; // 5 minutes
    this.throughputMetrics = this.throughputMetrics.filter(m => m.timestamp > cutoff);
  }

  getAverageLatency() {
    if (this.consensusLatency.length === 0) return 0;
    
    const sum = this.consensusLatency.reduce((acc, m) => acc + m.latency, 0);
    return sum / this.consensusLatency.length;
  }

  getAverageThroughput() {
    if (this.throughputMetrics.length === 0) return 0;
    
    const sum = this.throughputMetrics.reduce((acc, m) => acc + m.throughput, 0);
    return sum / this.throughputMetrics.length;
  }

  shouldAdjustForPerformance() {
    // Only adjust if we have sufficient performance data
    return this.consensusLatency.length >= 10 && this.throughputMetrics.length >= 5;
  }

  // Monitoring and maintenance

  startQuorumMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
      this.cleanupOldMetrics();
    }, 30000); // Every 30 seconds
  }

  performHealthCheck() {
    const health = this.getQuorumHealth();
    
    if (health.health === 'critical') {
      console.error(`🚨 CRITICAL: Quorum cannot be achieved! Active nodes: ${health.activeNodes}, Required: ${this.currentQuorum}`);
      this.emit('quorumCritical', health);
    } else if (health.health === 'degraded') {
      console.warn(`⚠️  Quorum degraded. Active nodes: ${health.activeNodes}, Optimal: ${health.optimalQuorum}`);
      this.emit('quorumDegraded', health);
    }
    
    // Check for potential adjustments
    this.evaluateQuorumAdjustment('health check');
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - 3600000; // 1 hour
    
    this.consensusLatency = this.consensusLatency.filter(m => m.timestamp > cutoff);
    this.throughputMetrics = this.throughputMetrics.filter(m => m.timestamp > cutoff);
  }

  // Network partition handling

  handleNetworkPartition(partitionedNodes) {
    console.log(`🌐 Handling network partition: ${partitionedNodes.join(', ')}`);
    
    for (const nodeId of partitionedNodes) {
      this.updateNodeStatus(nodeId, 'partitioned', 'network timeout');
    }
    
    const health = this.getQuorumHealth();
    if (!health.canAchieveConsensus) {
      this.handleQuorumFailure('network partition');
    }
  }

  handlePartitionHealing(reconectedNodes) {
    console.log(`🔄 Handling partition healing: ${reconectedNodes.join(', ')}`);
    
    for (const nodeId of reconectedNodes) {
      this.updateNodeStatus(nodeId, 'active', 'partition healed');
    }
    
    // Attempt to restore optimal quorum
    this.evaluateQuorumAdjustment('partition healing');
  }

  handleQuorumFailure(reason) {
    console.error(`🚨 QUORUM FAILURE: ${reason}`);
    console.error(`   Active nodes: ${this.getActiveNodeCount()}`);
    console.error(`   Required quorum: ${this.currentQuorum}`);
    console.error(`   System entering read-only mode`);
    
    this.emit('quorumFailure', {
      reason,
      activeNodes: this.getActiveNodeCount(),
      requiredQuorum: this.currentQuorum,
      timestamp: Date.now()
    });
  }

  // Advanced quorum strategies

  enableAdaptiveQuorum(options = {}) {
    this.adaptiveQuorum = {
      enabled: true,
      performanceWeight: options.performanceWeight || 0.3,
      securityWeight: options.securityWeight || 0.7,
      adaptationRate: options.adaptationRate || 0.1,
      lastAnalysis: Date.now()
    };
    
    console.log(`🧠 Adaptive quorum enabled`);
    
    // Start adaptive monitoring
    setInterval(() => {
      this.analyzeAdaptiveQuorum();
    }, 60000); // Every minute
  }

  analyzeAdaptiveQuorum() {
    if (!this.adaptiveQuorum?.enabled) return;
    
    const now = Date.now();
    if (now - this.adaptiveQuorum.lastAnalysis < 60000) return; // Rate limit
    
    const performanceScore = this.calculatePerformanceScore();
    const securityScore = this.calculateSecurityScore();
    
    const combinedScore = 
      (performanceScore * this.adaptiveQuorum.performanceWeight) +
      (securityScore * this.adaptiveQuorum.securityWeight);
    
    const targetQuorum = Math.round(
      this.minQuorum + 
      (this.calculateOptimalQuorum() - this.minQuorum) * combinedScore
    );
    
    if (Math.abs(targetQuorum - this.currentQuorum) >= 1) {
      this.adjustQuorum(
        targetQuorum, 
        `Adaptive analysis (perf: ${performanceScore.toFixed(2)}, sec: ${securityScore.toFixed(2)})`
      );
    }
    
    this.adaptiveQuorum.lastAnalysis = now;
  }

  calculatePerformanceScore() {
    const avgLatency = this.getAverageLatency();
    const avgThroughput = this.getAverageThroughput();
    
    // Normalize scores (lower latency and higher throughput = better performance)
    const latencyScore = Math.max(0, 1 - (avgLatency / 10000)); // 10s max
    const throughputScore = Math.min(1, avgThroughput / 100); // 100 req/s max
    
    return (latencyScore + throughputScore) / 2;
  }

  calculateSecurityScore() {
    const activeNodes = this.getActiveNodeCount();
    const maliciousRatio = this.maliciousNodes.size / this.totalNodes;
    const suspiciousRatio = this.suspiciousNodes.size / activeNodes;
    const partitionRatio = this.partitionedNodes.size / this.totalNodes;
    
    // Lower ratios = better security
    const securityScore = Math.max(0, 1 - (maliciousRatio + suspiciousRatio + partitionRatio));
    
    return securityScore;
  }

  // Utility methods

  getStatus() {
    const health = this.getQuorumHealth();
    
    return {
      currentQuorum: this.currentQuorum,
      minQuorum: this.minQuorum,
      optimalQuorum: this.calculateOptimalQuorum(),
      totalNodes: this.totalNodes,
      activeNodes: this.getActiveNodeCount(),
      partitionedNodes: this.partitionedNodes.size,
      maliciousNodes: this.maliciousNodes.size,
      suspiciousNodes: this.suspiciousNodes.size,
      faultTolerance: this.calculateFaultTolerance(),
      health: health.health,
      healthScore: health.healthScore,
      canAchieveConsensus: health.canAchieveConsensus,
      averageLatency: this.getAverageLatency(),
      averageThroughput: this.getAverageThroughput(),
      adaptiveQuorum: this.adaptiveQuorum?.enabled || false
    };
  }

  getMetrics() {
    return {
      quorum: {
        current: this.currentQuorum,
        optimal: this.calculateOptimalQuorum(),
        minimum: this.minQuorum
      },
      nodes: {
        total: this.totalNodes,
        active: this.getActiveNodeCount(),
        partitioned: this.partitionedNodes.size,
        malicious: this.maliciousNodes.size,
        suspicious: this.suspiciousNodes.size
      },
      performance: {
        averageLatency: this.getAverageLatency(),
        averageThroughput: this.getAverageThroughput(),
        latencyMeasurements: this.consensusLatency.length,
        throughputMeasurements: this.throughputMetrics.length
      },
      health: this.getQuorumHealth()
    };
  }
}

module.exports = QuorumManager;