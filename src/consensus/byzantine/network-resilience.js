/**
 * Network Resilience Manager
 * 
 * Handles network partitions, connectivity issues, and recovery protocols
 * for the Byzantine consensus system.
 */

const EventEmitter = require('events');

class NetworkResilienceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeId = options.nodeId;
    this.networkTimeout = options.networkTimeout || 30000; // 30 seconds
    this.heartbeatInterval = options.heartbeatInterval || 10000; // 10 seconds
    this.recoveryTimeout = options.recoveryTimeout || 300000; // 5 minutes
    
    // Network topology tracking
    this.activeConnections = new Map(); // nodeId -> connection info
    this.networkPartitions = new Set(); // partitioned nodes
    this.connectionHistory = new Map(); // nodeId -> connection events
    this.routingTable = new Map(); // nodeId -> route information
    
    // Partition detection
    this.lastHeartbeat = new Map(); // nodeId -> timestamp
    this.suspectedFailures = new Map(); // nodeId -> suspicion level
    this.failureDetectionThreshold = 3; // strikes before marking as failed
    
    // Recovery management
    this.recoveryQueue = []; // nodes pending recovery
    this.reconciliationTasks = new Map(); // nodeId -> reconciliation state
    this.stateSnapshots = new Map(); // consensus state snapshots
    
    // Performance monitoring
    this.latencyMeasurements = new Map(); // nodeId -> latency history
    this.throughputMetrics = new Map(); // nodeId -> throughput data
    this.networkQuality = new Map(); // nodeId -> quality metrics
    
    this.initialize();
  }

  initialize() {
    console.log(`🌐 Initializing Network Resilience Manager for node ${this.nodeId}`);
    
    // Start monitoring services
    this.startHeartbeatMonitoring();
    this.startFailureDetection();
    this.startNetworkAnalysis();
    this.startRecoveryService();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      networkTimeout: this.networkTimeout,
      heartbeatInterval: this.heartbeatInterval
    });
  }

  // Connection Management

  registerConnection(nodeId, connectionInfo) {
    console.log(`🔗 Registering connection to node ${nodeId}`);
    
    const connectionData = {
      nodeId,
      address: connectionInfo.address,
      port: connectionInfo.port,
      protocol: connectionInfo.protocol || 'tcp',
      established: Date.now(),
      lastActivity: Date.now(),
      quality: 1.0,
      latency: 0,
      throughput: 0,
      active: true
    };
    
    this.activeConnections.set(nodeId, connectionData);
    this.lastHeartbeat.set(nodeId, Date.now());
    
    // Remove from partitions if recovering
    if (this.networkPartitions.has(nodeId)) {
      this.handlePartitionRecovery(nodeId);
    }
    
    // Record connection event
    this.recordConnectionEvent(nodeId, 'connected', connectionInfo);
    
    this.emit('connectionRegistered', { nodeId, connectionInfo });
  }

  updateConnectionActivity(nodeId, activity) {
    const connection = this.activeConnections.get(nodeId);
    if (!connection) {
      console.warn(`⚠️  No connection found for node ${nodeId}`);
      return false;
    }
    
    const now = Date.now();
    connection.lastActivity = now;
    this.lastHeartbeat.set(nodeId, now);
    
    // Update performance metrics
    if (activity.latency) {
      this.recordLatency(nodeId, activity.latency);
    }
    
    if (activity.throughput) {
      this.recordThroughput(nodeId, activity.throughput);
    }
    
    // Clear suspicion if node is responding
    if (this.suspectedFailures.has(nodeId)) {
      this.suspectedFailures.delete(nodeId);
      console.log(`✅ Node ${nodeId} cleared from suspected failures`);
    }
    
    return true;
  }

  // Heartbeat and Health Monitoring

  startHeartbeatMonitoring() {
    setInterval(() => {
      this.sendHeartbeats();
      this.checkHeartbeatResponses();
    }, this.heartbeatInterval);
  }

  sendHeartbeats() {
    const heartbeatMessage = {
      type: 'HEARTBEAT',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      sequenceNumber: this.getNextSequenceNumber()
    };
    
    for (const [nodeId, connection] of this.activeConnections) {
      if (connection.active && !this.networkPartitions.has(nodeId)) {
        this.sendMessage(nodeId, heartbeatMessage)
          .then(() => {
            console.log(`💓 Heartbeat sent to ${nodeId}`);
          })
          .catch(error => {
            console.warn(`❌ Failed to send heartbeat to ${nodeId}: ${error.message}`);
            this.recordConnectionFailure(nodeId, 'heartbeat_failed');
          });
      }
    }
  }

  checkHeartbeatResponses() {
    const now = Date.now();
    
    for (const [nodeId, lastSeen] of this.lastHeartbeat) {
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen > this.networkTimeout) {
        this.suspectNodeFailure(nodeId, timeSinceLastSeen);
      }
    }
  }

  suspectNodeFailure(nodeId, timeSinceLastSeen) {
    const currentSuspicion = this.suspectedFailures.get(nodeId) || 0;
    const newSuspicion = currentSuspicion + 1;
    
    console.warn(`⚠️  Suspecting node ${nodeId} failure (strike ${newSuspicion}/${this.failureDetectionThreshold}, ${timeSinceLastSeen}ms)`);
    
    this.suspectedFailures.set(nodeId, newSuspicion);
    
    if (newSuspicion >= this.failureDetectionThreshold) {
      this.declareNodePartitioned(nodeId, 'heartbeat timeout');
    }
    
    this.emit('nodeFailureSuspected', {
      nodeId,
      suspicionLevel: newSuspicion,
      timeSinceLastSeen,
      threshold: this.failureDetectionThreshold
    });
  }

  // Partition Detection and Handling

  startFailureDetection() {
    setInterval(() => {
      this.analyzeNetworkPartitions();
      this.evaluateNetworkHealth();
    }, 30000); // Every 30 seconds
  }

  analyzeNetworkPartitions() {
    const now = Date.now();
    const partitionThreshold = this.networkTimeout * 2;
    
    // Check for potential partitions based on communication patterns
    for (const [nodeId, connection] of this.activeConnections) {
      const timeSinceActivity = now - connection.lastActivity;
      
      if (timeSinceActivity > partitionThreshold && connection.active) {
        this.investigatePartition(nodeId);
      }
    }
    
    // Analyze partition patterns
    this.detectPartitionPatterns();
  }

  investigatePartition(nodeId) {
    console.log(`🔍 Investigating potential partition for node ${nodeId}`);
    
    // Attempt multiple communication channels
    Promise.all([
      this.pingNode(nodeId),
      this.traceRoute(nodeId),
      this.checkThirdPartyConnectivity(nodeId)
    ]).then(results => {
      const [pingSuccess, routeInfo, thirdPartyConnected] = results;
      
      if (!pingSuccess && !thirdPartyConnected) {
        this.declareNodePartitioned(nodeId, 'multiple channel failure');
      } else if (!pingSuccess && thirdPartyConnected) {
        this.declareNetworkIssue(nodeId, 'direct connection failure');
      } else {
        console.log(`✅ Node ${nodeId} connectivity restored`);
        this.updateConnectionActivity(nodeId, { restored: true });
      }
    }).catch(error => {
      console.error(`❌ Partition investigation failed for ${nodeId}: ${error.message}`);
    });
  }

  declareNodePartitioned(nodeId, reason) {
    if (this.networkPartitions.has(nodeId)) {
      return; // Already partitioned
    }
    
    console.error(`🌐 Node ${nodeId} declared partitioned: ${reason}`);
    
    this.networkPartitions.add(nodeId);
    
    // Mark connection as inactive
    const connection = this.activeConnections.get(nodeId);
    if (connection) {
      connection.active = false;
      connection.partitionReason = reason;
      connection.partitionTime = Date.now();
    }
    
    // Add to recovery queue
    this.recoveryQueue.push({
      nodeId,
      reason,
      partitionTime: Date.now(),
      recoveryAttempts: 0
    });
    
    this.recordConnectionEvent(nodeId, 'partitioned', { reason });
    
    this.emit('nodePartitioned', {
      nodeId,
      reason,
      totalPartitions: this.networkPartitions.size,
      timestamp: Date.now()
    });
  }

  handlePartitionRecovery(nodeId) {
    console.log(`🔄 Handling partition recovery for node ${nodeId}`);
    
    this.networkPartitions.delete(nodeId);
    
    // Mark connection as active
    const connection = this.activeConnections.get(nodeId);
    if (connection) {
      connection.active = true;
      connection.recoveryTime = Date.now();
      delete connection.partitionReason;
    }
    
    // Remove from recovery queue
    this.recoveryQueue = this.recoveryQueue.filter(item => item.nodeId !== nodeId);
    
    // Start state reconciliation
    this.initiateStateReconciliation(nodeId);
    
    this.recordConnectionEvent(nodeId, 'recovered', { recoveryTime: Date.now() });
    
    this.emit('partitionRecovered', {
      nodeId,
      totalPartitions: this.networkPartitions.size,
      timestamp: Date.now()
    });
  }

  // State Reconciliation

  initiateStateReconciliation(nodeId) {
    console.log(`🔄 Initiating state reconciliation with node ${nodeId}`);
    
    const reconciliationId = `recon_${nodeId}_${Date.now()}`;
    
    const reconciliationTask = {
      id: reconciliationId,
      nodeId,
      startTime: Date.now(),
      phase: 'initial',
      progress: 0,
      conflicts: [],
      resolved: false
    };
    
    this.reconciliationTasks.set(reconciliationId, reconciliationTask);
    
    // Start reconciliation process
    this.executeReconciliationPhases(reconciliationId);
  }

  async executeReconciliationPhases(reconciliationId) {
    const task = this.reconciliationTasks.get(reconciliationId);
    if (!task) return;
    
    try {
      // Phase 1: Exchange state summaries
      task.phase = 'summary_exchange';
      await this.exchangeStateSummary(task.nodeId);
      task.progress = 25;
      
      // Phase 2: Identify conflicts
      task.phase = 'conflict_detection';
      const conflicts = await this.detectStateConflicts(task.nodeId);
      task.conflicts = conflicts;
      task.progress = 50;
      
      // Phase 3: Resolve conflicts
      task.phase = 'conflict_resolution';
      await this.resolveStateConflicts(task.nodeId, conflicts);
      task.progress = 75;
      
      // Phase 4: Synchronize state
      task.phase = 'synchronization';
      await this.synchronizeState(task.nodeId);
      task.progress = 100;
      task.resolved = true;
      
      console.log(`✅ State reconciliation completed for node ${task.nodeId}`);
      
      this.emit('reconciliationCompleted', {
        reconciliationId,
        nodeId: task.nodeId,
        conflicts: conflicts.length,
        duration: Date.now() - task.startTime
      });
      
    } catch (error) {
      console.error(`❌ Reconciliation failed for node ${task.nodeId}: ${error.message}`);
      task.phase = 'failed';
      task.error = error.message;
      
      this.emit('reconciliationFailed', {
        reconciliationId,
        nodeId: task.nodeId,
        error: error.message
      });
    }
  }

  async exchangeStateSummary(nodeId) {
    const stateSummary = this.generateStateSummary();
    
    const exchangeMessage = {
      type: 'STATE_SUMMARY_EXCHANGE',
      nodeId: this.nodeId,
      stateSummary,
      timestamp: Date.now()
    };
    
    await this.sendMessage(nodeId, exchangeMessage);
  }

  async detectStateConflicts(nodeId) {
    // This would implement actual conflict detection logic
    // For now, return empty conflicts array
    return [];
  }

  async resolveStateConflicts(nodeId, conflicts) {
    // This would implement conflict resolution strategies
    console.log(`🔧 Resolving ${conflicts.length} conflicts with node ${nodeId}`);
  }

  async synchronizeState(nodeId) {
    // This would implement state synchronization
    console.log(`🔄 Synchronizing state with node ${nodeId}`);
  }

  // Network Analysis and Optimization

  startNetworkAnalysis() {
    setInterval(() => {
      this.analyzeNetworkPerformance();
      this.optimizeRouting();
      this.updateNetworkTopology();
    }, 60000); // Every minute
  }

  analyzeNetworkPerformance() {
    for (const [nodeId, connection] of this.activeConnections) {
      const quality = this.calculateConnectionQuality(nodeId);
      const latency = this.getAverageLatency(nodeId);
      const throughput = this.getAverageThroughput(nodeId);
      
      connection.quality = quality;
      connection.latency = latency;
      connection.throughput = throughput;
      
      this.networkQuality.set(nodeId, {
        quality,
        latency,
        throughput,
        timestamp: Date.now()
      });
    }
  }

  calculateConnectionQuality(nodeId) {
    const latencyHistory = this.latencyMeasurements.get(nodeId) || [];
    const throughputHistory = this.throughputMetrics.get(nodeId) || [];
    
    if (latencyHistory.length === 0) return 1.0;
    
    const avgLatency = latencyHistory.reduce((sum, l) => sum + l.value, 0) / latencyHistory.length;
    const avgThroughput = throughputHistory.reduce((sum, t) => sum + t.value, 0) / throughputHistory.length;
    
    // Quality score based on latency and throughput
    const latencyScore = Math.max(0, 1 - (avgLatency / 10000)); // 10s max
    const throughputScore = Math.min(1, avgThroughput / 1000); // 1000 msg/s max
    
    return (latencyScore + throughputScore) / 2;
  }

  optimizeRouting() {
    // Update routing table based on network performance
    for (const [nodeId, connection] of this.activeConnections) {
      if (connection.active) {
        this.routingTable.set(nodeId, {
          directConnection: true,
          quality: connection.quality,
          latency: connection.latency,
          hops: 1,
          lastUpdate: Date.now()
        });
      }
    }
    
    // Find optimal routes for partitioned nodes through intermediaries
    this.findAlternativeRoutes();
  }

  findAlternativeRoutes() {
    for (const partitionedNode of this.networkPartitions) {
      const alternativeRoutes = [];
      
      // Check if any active node can reach the partitioned node
      for (const [intermediaryNode, connection] of this.activeConnections) {
        if (connection.active && this.canReachThrough(intermediaryNode, partitionedNode)) {
          alternativeRoutes.push({
            intermediate: intermediaryNode,
            quality: connection.quality * 0.8, // Reduced quality for indirect route
            hops: 2
          });
        }
      }
      
      if (alternativeRoutes.length > 0) {
        // Choose best alternative route
        const bestRoute = alternativeRoutes.sort((a, b) => b.quality - a.quality)[0];
        
        this.routingTable.set(partitionedNode, {
          directConnection: false,
          intermediate: bestRoute.intermediate,
          quality: bestRoute.quality,
          hops: bestRoute.hops,
          lastUpdate: Date.now()
        });
        
        console.log(`🔀 Found alternative route to ${partitionedNode} via ${bestRoute.intermediate}`);
      }
    }
  }

  // Recovery Service

  startRecoveryService() {
    setInterval(() => {
      this.processRecoveryQueue();
      this.attemptNodeRecovery();
    }, 30000); // Every 30 seconds
  }

  processRecoveryQueue() {
    const now = Date.now();
    
    for (let i = this.recoveryQueue.length - 1; i >= 0; i--) {
      const recovery = this.recoveryQueue[i];
      
      // Remove old recovery attempts
      if (now - recovery.partitionTime > this.recoveryTimeout) {
        console.log(`⏰ Recovery timeout for node ${recovery.nodeId}`);
        this.recoveryQueue.splice(i, 1);
        continue;
      }
      
      // Attempt recovery if enough time has passed
      if (now - recovery.partitionTime > 60000 && recovery.recoveryAttempts < 5) {
        this.attemptNodeRecovery(recovery.nodeId);
        recovery.recoveryAttempts++;
        recovery.lastAttempt = now;
      }
    }
  }

  async attemptNodeRecovery(nodeId) {
    if (!nodeId) {
      // Attempt recovery for all nodes in queue
      for (const recovery of this.recoveryQueue) {
        await this.attemptNodeRecovery(recovery.nodeId);
      }
      return;
    }
    
    console.log(`🔄 Attempting recovery for node ${nodeId}`);
    
    try {
      // Try direct ping first
      const pingSuccess = await this.pingNode(nodeId);
      if (pingSuccess) {
        console.log(`✅ Direct recovery successful for node ${nodeId}`);
        this.handlePartitionRecovery(nodeId);
        return;
      }
      
      // Try alternative routes
      const route = this.routingTable.get(nodeId);
      if (route && !route.directConnection) {
        const indirectSuccess = await this.pingNodeIndirect(nodeId, route.intermediate);
        if (indirectSuccess) {
          console.log(`✅ Indirect recovery successful for node ${nodeId} via ${route.intermediate}`);
          this.handlePartitionRecovery(nodeId);
          return;
        }
      }
      
      console.warn(`⚠️  Recovery attempt failed for node ${nodeId}`);
      
    } catch (error) {
      console.error(`❌ Recovery error for node ${nodeId}: ${error.message}`);
    }
  }

  // Utility Methods

  async pingNode(nodeId) {
    try {
      const pingMessage = {
        type: 'PING',
        nodeId: this.nodeId,
        timestamp: Date.now()
      };
      
      const startTime = Date.now();
      await this.sendMessage(nodeId, pingMessage);
      const latency = Date.now() - startTime;
      
      this.recordLatency(nodeId, latency);
      return true;
    } catch (error) {
      return false;
    }
  }

  async pingNodeIndirect(nodeId, intermediateNode) {
    try {
      const indirectPingMessage = {
        type: 'INDIRECT_PING',
        targetNode: nodeId,
        nodeId: this.nodeId,
        timestamp: Date.now()
      };
      
      await this.sendMessage(intermediateNode, indirectPingMessage);
      return true;
    } catch (error) {
      return false;
    }
  }

  async traceRoute(nodeId) {
    // Simplified trace route implementation
    return { hops: 1, route: [this.nodeId, nodeId] };
  }

  async checkThirdPartyConnectivity(nodeId) {
    // Check if other nodes can reach the target node
    for (const [otherNodeId, connection] of this.activeConnections) {
      if (otherNodeId !== nodeId && connection.active) {
        try {
          const queryMessage = {
            type: 'CONNECTIVITY_QUERY',
            targetNode: nodeId,
            nodeId: this.nodeId,
            timestamp: Date.now()
          };
          
          await this.sendMessage(otherNodeId, queryMessage);
          return true;
        } catch (error) {
          continue;
        }
      }
    }
    return false;
  }

  canReachThrough(intermediaryNode, targetNode) {
    // Simplified reachability check
    // In real implementation, this would query the intermediary
    return this.activeConnections.has(intermediaryNode);
  }

  async sendMessage(nodeId, message) {
    // Simulate network communication
    // In real implementation, this would use actual network protocols
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connection = this.activeConnections.get(nodeId);
        if (connection && connection.active) {
          resolve(true);
        } else {
          reject(new Error(`No active connection to ${nodeId}`));
        }
      }, 100 + Math.random() * 200); // Simulate network delay
    });
  }

  recordLatency(nodeId, latency) {
    if (!this.latencyMeasurements.has(nodeId)) {
      this.latencyMeasurements.set(nodeId, []);
    }
    
    const measurements = this.latencyMeasurements.get(nodeId);
    measurements.push({ value: latency, timestamp: Date.now() });
    
    // Keep only recent measurements
    const cutoff = Date.now() - 300000; // 5 minutes
    this.latencyMeasurements.set(
      nodeId,
      measurements.filter(m => m.timestamp > cutoff)
    );
  }

  recordThroughput(nodeId, throughput) {
    if (!this.throughputMetrics.has(nodeId)) {
      this.throughputMetrics.set(nodeId, []);
    }
    
    const metrics = this.throughputMetrics.get(nodeId);
    metrics.push({ value: throughput, timestamp: Date.now() });
    
    // Keep only recent measurements
    const cutoff = Date.now() - 300000; // 5 minutes
    this.throughputMetrics.set(
      nodeId,
      metrics.filter(m => m.timestamp > cutoff)
    );
  }

  getAverageLatency(nodeId) {
    const measurements = this.latencyMeasurements.get(nodeId) || [];
    if (measurements.length === 0) return 0;
    
    const sum = measurements.reduce((acc, m) => acc + m.value, 0);
    return sum / measurements.length;
  }

  getAverageThroughput(nodeId) {
    const metrics = this.throughputMetrics.get(nodeId) || [];
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  recordConnectionEvent(nodeId, event, details) {
    if (!this.connectionHistory.has(nodeId)) {
      this.connectionHistory.set(nodeId, []);
    }
    
    const history = this.connectionHistory.get(nodeId);
    history.push({
      event,
      details,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    const cutoff = Date.now() - 3600000; // 1 hour
    this.connectionHistory.set(
      nodeId,
      history.filter(h => h.timestamp > cutoff)
    );
  }

  recordConnectionFailure(nodeId, reason) {
    this.recordConnectionEvent(nodeId, 'failure', { reason });
    this.suspectNodeFailure(nodeId, 0);
  }

  generateStateSummary() {
    // Generate a summary of the current consensus state
    return {
      nodeId: this.nodeId,
      timestamp: Date.now(),
      activeConnections: this.activeConnections.size,
      partitionedNodes: this.networkPartitions.size,
      networkQuality: Array.from(this.networkQuality.values()).reduce((sum, q) => sum + q.quality, 0) / this.networkQuality.size || 0
    };
  }

  getNextSequenceNumber() {
    if (!this.sequenceNumber) {
      this.sequenceNumber = 0;
    }
    return ++this.sequenceNumber;
  }

  detectPartitionPatterns() {
    // Analyze partition patterns to predict future issues
    const partitionFrequency = new Map();
    
    for (const [nodeId, history] of this.connectionHistory) {
      const partitionEvents = history.filter(h => h.event === 'partitioned');
      partitionFrequency.set(nodeId, partitionEvents.length);
    }
    
    // Identify frequently partitioned nodes
    for (const [nodeId, frequency] of partitionFrequency) {
      if (frequency >= 3) {
        console.warn(`⚠️  Node ${nodeId} has frequent partitions (${frequency} times)`);
        this.emit('frequentPartitionDetected', { nodeId, frequency });
      }
    }
  }

  evaluateNetworkHealth() {
    const totalNodes = this.activeConnections.size;
    const activeNodes = totalNodes - this.networkPartitions.size;
    const healthRatio = activeNodes / totalNodes;
    
    const avgQuality = Array.from(this.networkQuality.values())
      .reduce((sum, q) => sum + q.quality, 0) / this.networkQuality.size || 0;
    
    const networkHealth = {
      healthRatio,
      averageQuality: avgQuality,
      totalNodes,
      activeNodes,
      partitionedNodes: this.networkPartitions.size,
      suspectedNodes: this.suspectedFailures.size,
      recoveryQueueSize: this.recoveryQueue.length,
      status: this.getNetworkStatus(healthRatio, avgQuality)
    };
    
    this.emit('networkHealthEvaluated', networkHealth);
    
    return networkHealth;
  }

  getNetworkStatus(healthRatio, avgQuality) {
    if (healthRatio < 0.5 || avgQuality < 0.3) return 'critical';
    if (healthRatio < 0.7 || avgQuality < 0.5) return 'degraded';
    if (healthRatio < 0.9 || avgQuality < 0.8) return 'warning';
    return 'healthy';
  }

  updateNetworkTopology() {
    // Update understanding of network topology
    const topology = {
      nodeId: this.nodeId,
      connections: Array.from(this.activeConnections.keys()),
      partitions: Array.from(this.networkPartitions),
      routes: Object.fromEntries(this.routingTable),
      lastUpdate: Date.now()
    };
    
    // Store snapshot
    this.stateSnapshots.set(Date.now(), topology);
    
    // Clean old snapshots
    const cutoff = Date.now() - 3600000; // 1 hour
    for (const [timestamp, _] of this.stateSnapshots) {
      if (timestamp < cutoff) {
        this.stateSnapshots.delete(timestamp);
      }
    }
  }

  getNetworkMetrics() {
    return {
      connections: {
        total: this.activeConnections.size,
        active: Array.from(this.activeConnections.values()).filter(c => c.active).length,
        partitioned: this.networkPartitions.size,
        suspected: this.suspectedFailures.size
      },
      performance: {
        averageLatency: Array.from(this.activeConnections.values()).reduce((sum, c) => sum + c.latency, 0) / this.activeConnections.size || 0,
        averageThroughput: Array.from(this.activeConnections.values()).reduce((sum, c) => sum + c.throughput, 0) / this.activeConnections.size || 0,
        averageQuality: Array.from(this.activeConnections.values()).reduce((sum, c) => sum + c.quality, 0) / this.activeConnections.size || 0
      },
      recovery: {
        queueSize: this.recoveryQueue.length,
        activeReconciliations: this.reconciliationTasks.size,
        totalRecoveryAttempts: this.recoveryQueue.reduce((sum, r) => sum + r.recoveryAttempts, 0)
      },
      topology: {
        directRoutes: Array.from(this.routingTable.values()).filter(r => r.directConnection).length,
        indirectRoutes: Array.from(this.routingTable.values()).filter(r => !r.directConnection).length,
        snapshotsStored: this.stateSnapshots.size
      }
    };
  }

  getStatus() {
    const health = this.evaluateNetworkHealth();
    
    return {
      nodeId: this.nodeId,
      networkHealth: health,
      activeConnections: this.activeConnections.size,
      partitionedNodes: this.networkPartitions.size,
      recoveryQueueSize: this.recoveryQueue.length,
      reconciliationTasks: this.reconciliationTasks.size,
      networkTimeout: this.networkTimeout,
      heartbeatInterval: this.heartbeatInterval,
      lastHealthCheck: Date.now()
    };
  }
}

module.exports = NetworkResilienceManager;