/**
 * Convergence Monitor
 * Monitors and ensures eventual consistency across all nodes in the gossip network
 */

import { EventEmitter } from 'events';

export class ConvergenceMonitor extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      convergenceThreshold: config.convergenceThreshold || 0.95,
      monitoringInterval: config.monitoringInterval || 5000,
      maxConvergenceTime: config.maxConvergenceTime || 30000,
      stabilityWindow: config.stabilityWindow || 10000,
      messageTrackingWindow: config.messageTrackingWindow || 60000,
      ...config
    };
    
    this.messageTracker = new Map();
    this.convergenceHistory = [];
    this.networkState = new Map();
    this.lastConvergenceCheck = Date.now();
    this.isRunning = false;
    
    // Convergence metrics
    this.metrics = {
      convergenceRounds: 0,
      averageConvergenceTime: 0,
      convergenceRate: 0,
      messagesTracked: 0,
      networkCoverage: 0,
      stabilityScore: 0,
      lastConvergenceTime: null
    };
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start convergence monitoring
    this.monitoringTimer = setInterval(() => {
      this.checkConvergence();
    }, this.config.monitoringInterval);
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, this.config.messageTrackingWindow);
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.emit('stopped');
  }
  
  // Message Tracking
  recordMessage(message, senderId) {
    const messageId = message?.id ?? message?.messageId;
    if (messageId == null) {
      return; // cannot track messages without a stable ID
    }
    const timestamp = Date.now();

    if (!this.messageTracker.has(messageId)) {
      this.messageTracker.set(messageId, {
        id: messageId,
        originalSender: message.originalSender || senderId,
        firstSeen: timestamp,
        propagationPath: [],
        nodesReached: new Set(),
        isConverged: false,
        convergenceTime: null
      });
      
      this.metrics.messagesTracked++;
    }
    
    const tracker = this.messageTracker.get(messageId);
    
    // Record propagation
    tracker.nodesReached.add(senderId);
    tracker.propagationPath.push({
      nodeId: senderId,
      timestamp,
      hopCount: message.hopCount || 0
    });
    
    // Check if message has converged
    this.checkMessageConvergence(messageId);
  }
  
  checkMessageConvergence(messageId) {
    const tracker = this.messageTracker.get(messageId);
    if (!tracker || tracker.isConverged) return;
    
    const totalNodes = this.getTotalNodeCount();
    const nodesReached = tracker.nodesReached.size;
    const coverageRatio = totalNodes > 0 ? nodesReached / totalNodes : 0;
    
    if (coverageRatio >= this.config.convergenceThreshold) {
      tracker.isConverged = true;
      tracker.convergenceTime = Date.now() - tracker.firstSeen;
      
      this.recordConvergenceEvent(messageId, tracker);
      this.emit('messageConverged', {
        messageId,
        convergenceTime: tracker.convergenceTime,
        nodesReached,
        totalNodes,
        coverageRatio
      });
    }
  }
  
  recordConvergenceEvent(messageId, tracker) {
    this.convergenceHistory.push({
      messageId,
      convergenceTime: tracker.convergenceTime,
      nodesReached: tracker.nodesReached.size,
      totalNodes: this.getTotalNodeCount(),
      timestamp: Date.now(),
      propagationPath: [...tracker.propagationPath]
    });
    
    // Limit history size
    if (this.convergenceHistory.length > 1000) {
      this.convergenceHistory.shift();
    }
    
    this.updateConvergenceMetrics();
  }
  
  updateConvergenceMetrics() {
    const recentEvents = this.getRecentConvergenceEvents();
    
    if (recentEvents.length > 0) {
      const totalTime = recentEvents.reduce((sum, event) => sum + event.convergenceTime, 0);
      this.metrics.averageConvergenceTime = totalTime / recentEvents.length;
      
      const convergedMessages = recentEvents.length;
      const trackedMessages = this.getRecentMessageCount();
      this.metrics.convergenceRate = trackedMessages > 0 ? convergedMessages / trackedMessages : 0;
      
      this.metrics.lastConvergenceTime = Date.now();
    }
    
    this.metrics.convergenceRounds++;
  }
  
  // Network State Monitoring
  updateNetworkState(peerId, state) {
    this.networkState.set(peerId, {
      ...state,
      lastUpdated: Date.now(),
      isActive: true
    });
    
    this.calculateNetworkCoverage();
  }
  
  calculateNetworkCoverage() {
    const activeNodes = Array.from(this.networkState.values())
      .filter(state => this.isNodeActive(state));
    
    const totalNodes = this.getTotalNodeCount();
    this.metrics.networkCoverage = totalNodes > 0 ? activeNodes.length / totalNodes : 0;
  }
  
  isNodeActive(nodeState) {
    const now = Date.now();
    const timeSinceUpdate = now - nodeState.lastUpdated;
    return timeSinceUpdate < this.config.stabilityWindow;
  }
  
  getTotalNodeCount() {
    // In real implementation, this would get the actual network size
    return Math.max(this.networkState.size, 1);
  }
  
  // Convergence Analysis
  checkConvergence() {
    const now = Date.now();
    
    // Analyze recent convergence patterns
    const convergenceMetrics = this.analyzeConvergencePattern();
    
    // Check for convergence issues
    this.detectConvergenceIssues(convergenceMetrics);
    
    // Update stability score
    this.calculateStabilityScore();
    
    // Emit convergence status
    this.emit('convergenceStatus', {
      timestamp: now,
      metrics: convergenceMetrics,
      networkState: this.getNetworkStateSummary(),
      isConverged: this.isNetworkConverged(convergenceMetrics)
    });
    
    this.lastConvergenceCheck = now;
  }
  
  analyzeConvergencePattern() {
    const recentEvents = this.getRecentConvergenceEvents();
    const recentMessages = this.getRecentMessages();
    
    return {
      recentConvergenceEvents: recentEvents.length,
      averageConvergenceTime: this.metrics.averageConvergenceTime,
      convergenceRate: this.metrics.convergenceRate,
      networkCoverage: this.metrics.networkCoverage,
      pendingMessages: recentMessages.filter(msg => !msg.isConverged).length,
      slowConvergingMessages: this.identifySlowConvergingMessages()
    };
  }
  
  identifySlowConvergingMessages() {
    const now = Date.now();
    const slowMessages = [];
    
    for (const [messageId, tracker] of this.messageTracker) {
      if (!tracker.isConverged) {
        const ageMs = now - tracker.firstSeen;
        if (ageMs > this.config.maxConvergenceTime) {
          slowMessages.push({
            messageId,
            age: ageMs,
            nodesReached: tracker.nodesReached.size,
            expectedNodes: this.getTotalNodeCount()
          });
        }
      }
    }
    
    return slowMessages;
  }
  
  detectConvergenceIssues(metrics) {
    const issues = [];
    
    // Check convergence rate
    if (metrics.convergenceRate < 0.8) {
      issues.push({
        type: 'low_convergence_rate',
        severity: 'warning',
        message: `Low convergence rate: ${(metrics.convergenceRate * 100).toFixed(1)}%`,
        recommendation: 'Increase gossip fanout or reduce gossip interval'
      });
    }
    
    // Check network coverage
    if (metrics.networkCoverage < 0.9) {
      issues.push({
        type: 'poor_network_coverage',
        severity: 'error',
        message: `Poor network coverage: ${(metrics.networkCoverage * 100).toFixed(1)}%`,
        recommendation: 'Check network connectivity and peer discovery'
      });
    }
    
    // Check convergence time
    if (metrics.averageConvergenceTime > this.config.maxConvergenceTime) {
      issues.push({
        type: 'slow_convergence',
        severity: 'warning',
        message: `Slow convergence: ${metrics.averageConvergenceTime}ms`,
        recommendation: 'Optimize gossip protocol parameters'
      });
    }
    
    // Check for stuck messages
    if (metrics.slowConvergingMessages.length > 0) {
      issues.push({
        type: 'stuck_messages',
        severity: 'error',
        message: `${metrics.slowConvergingMessages.length} messages failed to converge`,
        recommendation: 'Investigate network partitions or node failures'
      });
    }
    
    if (issues.length > 0) {
      this.emit('convergenceIssues', issues);
    }
  }
  
  calculateStabilityScore() {
    const recentEvents = this.getRecentConvergenceEvents();
    const timeWindow = this.config.stabilityWindow;
    
    if (recentEvents.length === 0) {
      this.metrics.stabilityScore = 1.0;
      return;
    }
    
    // Calculate stability based on convergence time variance
    const avgTime = this.metrics.averageConvergenceTime;
    const variance = recentEvents.reduce((sum, event) => {
      const diff = event.convergenceTime - avgTime;
      return sum + diff * diff;
    }, 0) / recentEvents.length;
    
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = avgTime > 0 ? standardDeviation / avgTime : 0;
    
    // Stability score (0-1, where 1 is most stable)
    this.metrics.stabilityScore = Math.max(0, 1 - coefficientOfVariation);
  }
  
  isNetworkConverged(metrics) {
    return (
      metrics.convergenceRate >= this.config.convergenceThreshold &&
      metrics.networkCoverage >= 0.9 &&
      metrics.pendingMessages === 0
    );
  }
  
  // Data Retrieval Methods
  getRecentConvergenceEvents() {
    const cutoff = Date.now() - this.config.stabilityWindow;
    return this.convergenceHistory.filter(event => event.timestamp > cutoff);
  }
  
  getRecentMessages() {
    const cutoff = Date.now() - this.config.messageTrackingWindow;
    return Array.from(this.messageTracker.values())
      .filter(tracker => tracker.firstSeen > cutoff);
  }
  
  getRecentMessageCount() {
    return this.getRecentMessages().length;
  }
  
  getNetworkStateSummary() {
    const activeNodes = [];
    const inactiveNodes = [];

    for (const [nodeId, state] of this.networkState) {
      if (this.isNodeActive(state)) {
        activeNodes.push(nodeId);
      } else {
        inactiveNodes.push(nodeId);
      }
    }

    return {
      totalNodes: this.networkState.size,
      activeNodes: activeNodes.length,
      inactiveNodes: inactiveNodes.length,
      coverage: this.metrics.networkCoverage
    };
  }
  
  // Cleanup Methods
  cleanupOldData() {
    const cutoff = Date.now() - this.config.messageTrackingWindow;
    let cleaned = 0;
    
    // Clean up old message trackers
    for (const [messageId, tracker] of this.messageTracker) {
      if (tracker.firstSeen < cutoff) {
        this.messageTracker.delete(messageId);
        cleaned++;
      }
    }
    
    // Clean up old network state
    for (const [nodeId, state] of this.networkState) {
      if (state.lastUpdated < cutoff) {
        this.networkState.delete(nodeId);
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old message trackers`);
    }
  }
  
  // Public API Methods
  getMetrics() {
    return {
      ...this.metrics,
      recentConvergenceEvents: this.getRecentConvergenceEvents().length,
      pendingMessages: this.getRecentMessages().filter(msg => !msg.isConverged).length,
      networkSummary: this.getNetworkStateSummary()
    };
  }
  
  getConvergenceReport() {
    const recentEvents = this.getRecentConvergenceEvents();
    const slowMessages = this.identifySlowConvergingMessages();
    
    return {
      timestamp: Date.now(),
      nodeId: this.nodeId,
      totalMessages: this.messageTracker.size,
      convergedMessages: recentEvents.length,
      convergenceRate: this.metrics.convergenceRate,
      averageConvergenceTime: this.metrics.averageConvergenceTime,
      networkCoverage: this.metrics.networkCoverage,
      stabilityScore: this.metrics.stabilityScore,
      slowMessages: slowMessages.length,
      networkState: this.getNetworkStateSummary(),
      recentHistory: recentEvents.slice(-10) // Last 10 events
    };
  }
  
  forceConvergenceCheck() {
    this.checkConvergence();
    return this.getConvergenceReport();
  }
  
  resetMetrics() {
    this.metrics = {
      convergenceRounds: 0,
      averageConvergenceTime: 0,
      convergenceRate: 0,
      messagesTracked: 0,
      networkCoverage: 0,
      stabilityScore: 0,
      lastConvergenceTime: null
    };
    
    this.convergenceHistory = [];
  }
  
  // Debugging and Analysis
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      config: this.config,
      metrics: this.getMetrics(),
      messageTracker: Object.fromEntries(this.messageTracker),
      networkState: Object.fromEntries(this.networkState),
      convergenceHistory: this.convergenceHistory.slice(-20)
    };
  }
  
  analyzeMessagePath(messageId) {
    const tracker = this.messageTracker.get(messageId);
    if (!tracker) {
      return null;
    }
    
    return {
      messageId,
      originalSender: tracker.originalSender,
      firstSeen: tracker.firstSeen,
      isConverged: tracker.isConverged,
      convergenceTime: tracker.convergenceTime,
      nodesReached: Array.from(tracker.nodesReached),
      propagationPath: tracker.propagationPath,
      coverage: tracker.nodesReached.size / this.getTotalNodeCount()
    };
  }
  
  getTopSlowMessages(count = 10) {
    const slowMessages = this.identifySlowConvergingMessages()
      .sort((a, b) => b.age - a.age)
      .slice(0, count);
    
    return slowMessages.map(msg => ({
      ...msg,
      details: this.analyzeMessagePath(msg.messageId)
    }));
  }
  
  // Network Health Assessment
  assessNetworkHealth() {
    const metrics = this.getMetrics();
    const issues = [];
    const recommendations = [];
    
    // Assess convergence rate
    if (metrics.convergenceRate < 0.95) {
      issues.push('Suboptimal convergence rate');
      recommendations.push('Increase gossip fanout or frequency');
    }
    
    // Assess network coverage
    if (metrics.networkCoverage < 0.9) {
      issues.push('Poor network coverage');
      recommendations.push('Check peer discovery and network connectivity');
    }
    
    // Assess stability
    if (metrics.stabilityScore < 0.8) {
      issues.push('Network instability detected');
      recommendations.push('Investigate network partitions or node failures');
    }
    
    const healthScore = (
      metrics.convergenceRate * 0.4 +
      metrics.networkCoverage * 0.3 +
      metrics.stabilityScore * 0.3
    );
    
    return {
      healthScore,
      status: healthScore > 0.9 ? 'excellent' : 
              healthScore > 0.8 ? 'good' :
              healthScore > 0.6 ? 'fair' : 'poor',
      issues,
      recommendations,
      metrics
    };
  }
}

export default ConvergenceMonitor;