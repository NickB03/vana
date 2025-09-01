/**
 * Failure Detection Protocol
 * Implements phi-accrual failure detection for gossip protocol networks
 */

import { EventEmitter } from 'events';

export class FailureDetector extends EventEmitter {
  constructor(nodeId, config = {}) {
    super();
    
    this.nodeId = nodeId;
    this.config = {
      phiThreshold: config.phiThreshold || 8.0,
      windowSize: config.windowSize || 100,
      minStandardDeviation: config.minStandardDeviation || 0.5,
      acceptableHeartbeatPause: config.acceptableHeartbeatPause || 0,
      firstHeartbeatEstimate: config.firstHeartbeatEstimate || 500,
      maxSampleSize: config.maxSampleSize || 200,
      heartbeatInterval: config.heartbeatInterval || 1000,
      suspicionMultiplier: config.suspicionMultiplier || 3,
      ...config
    };
    
    this.heartbeatHistory = new Map();
    this.failureStates = new Map();
    this.lastHeartbeats = new Map();
    this.isRunning = false;
    
    // Performance metrics
    this.metrics = {
      heartbeatsSent: 0,
      heartbeatsReceived: 0,
      failuresDetected: 0,
      falsePositives: 0,
      recoveredNodes: 0,
      averagePhiValue: 0
    };
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start heartbeat monitoring
    this.monitoringTimer = setInterval(() => {
      this.checkFailures();
    }, this.config.heartbeatInterval);
    
    this.emit('started');
  }
  
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.emit('stopped');
  }
  
  // Heartbeat Management
  recordHeartbeat(peerId, timestamp = Date.now()) {
    if (!this.heartbeatHistory.has(peerId)) {
      this.heartbeatHistory.set(peerId, []);
      this.failureStates.set(peerId, {
        suspected: false,
        phi: 0,
        lastHeartbeat: timestamp,
        suspicionLevel: 0
      });
    }
    
    const history = this.heartbeatHistory.get(peerId);
    const lastTimestamp = this.lastHeartbeats.get(peerId) || timestamp;
    
    // Calculate inter-arrival time
    if (this.lastHeartbeats.has(peerId)) {
      const interArrivalTime = timestamp - lastTimestamp;
      history.push(interArrivalTime);
      
      // Maintain window size
      if (history.length > this.config.maxSampleSize) {
        history.shift();
      }
    }
    
    this.lastHeartbeats.set(peerId, timestamp);
    
    // Update failure state
    const failureState = this.failureStates.get(peerId);
    failureState.lastHeartbeat = timestamp;
    
    // If node was suspected, mark as recovered
    if (failureState.suspected) {
      failureState.suspected = false;
      failureState.suspicionLevel = 0;
      this.metrics.recoveredNodes++;
      this.emit('nodeRecovered', peerId);
    }
    
    this.metrics.heartbeatsReceived++;
  }
  
  // Phi Accrual Failure Detection Algorithm
  calculatePhi(peerId, now = Date.now()) {
    const history = this.heartbeatHistory.get(peerId);
    const lastHeartbeat = this.lastHeartbeats.get(peerId);
    
    if (!history || history.length === 0 || !lastHeartbeat) {
      return 0;
    }
    
    // Calculate time since last heartbeat
    const timeSinceLastHeartbeat = now - lastHeartbeat;
    
    // Calculate mean and standard deviation of inter-arrival times
    const mean = this.calculateMean(history);
    const stdDev = Math.max(
      this.calculateStandardDeviation(history, mean),
      this.config.minStandardDeviation
    );
    
    // Calculate phi value using normal distribution
    const normalizedTime = (timeSinceLastHeartbeat - mean) / stdDev;
    const phi = -Math.log10(this.normalCDF(normalizedTime));
    
    return Math.max(0, phi);
  }
  
  calculateMean(values) {
    if (values.length === 0) return this.config.firstHeartbeatEstimate;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  calculateStandardDeviation(values, mean) {
    if (values.length <= 1) return this.config.minStandardDeviation;
    
    const variance = values.reduce((sum, val) => {
      const diff = val - mean;
      return sum + diff * diff;
    }, 0) / (values.length - 1);
    
    return Math.sqrt(variance);
  }
  
  // Approximation of normal cumulative distribution function
  normalCDF(x) {
    if (x < -8.0) return 0.0;
    if (x > 8.0) return 1.0;
    
    let sum = 0.0;
    let term = x;
    
    for (let i = 3; i < 100; i += 2) {
      sum += term;
      term *= -x * x / i;
      if (Math.abs(term) < 0.0001) break;
    }
    
    return 0.5 + sum * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  }
  
  // Failure Detection Logic
  checkFailures() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    let totalPhi = 0;
    let phiCount = 0;
    
    for (const [peerId] of this.heartbeatHistory) {
      const phi = this.calculatePhi(peerId, now);
      const failureState = this.failureStates.get(peerId);
      
      if (failureState) {
        failureState.phi = phi;
        totalPhi += phi;
        phiCount++;
        
        // Check if node should be suspected
        if (!failureState.suspected && phi > this.config.phiThreshold) {
          this.suspectNode(peerId, phi);
        }
        
        // Update suspicion level
        if (failureState.suspected) {
          failureState.suspicionLevel = Math.min(
            failureState.suspicionLevel + 1,
            this.config.suspicionMultiplier * this.config.phiThreshold
          );
          
          // Declare failure if suspicion level is high enough
          if (failureState.suspicionLevel >= this.config.phiThreshold * this.config.suspicionMultiplier) {
            this.declareFailure(peerId, phi);
          }
        }
      }
    }
    
    // Update average phi value
    this.metrics.averagePhiValue = phiCount > 0 ? totalPhi / phiCount : 0;
  }
  
  suspectNode(peerId, phi) {
    const failureState = this.failureStates.get(peerId);
    if (!failureState) return;
    
    failureState.suspected = true;
    failureState.suspicionLevel = 1;
    
    console.log(`Node ${peerId} is suspected of failure (phi=${phi.toFixed(2)})`);
    this.emit('nodeSuspected', { peerId, phi, timestamp: Date.now() });
  }
  
  declareFailure(peerId, phi) {
    const failureState = this.failureStates.get(peerId);
    if (!failureState) return;
    
    console.log(`Node ${peerId} declared as failed (phi=${phi.toFixed(2)})`);
    
    // Clean up state
    this.heartbeatHistory.delete(peerId);
    this.failureStates.delete(peerId);
    this.lastHeartbeats.delete(peerId);
    
    this.metrics.failuresDetected++;
    this.emit('peerFailed', { peerId, phi, timestamp: Date.now() });
  }
  
  // Adaptive Threshold Management
  adaptThreshold() {
    const avgPhi = this.metrics.averagePhiValue;
    const failureRate = this.metrics.failuresDetected / Math.max(1, this.metrics.heartbeatsReceived);
    
    // Adjust threshold based on network conditions
    if (failureRate > 0.1) { // Too many failures
      this.config.phiThreshold *= 1.1; // Increase threshold (be more tolerant)
    } else if (failureRate < 0.01 && avgPhi < this.config.phiThreshold * 0.5) {
      this.config.phiThreshold *= 0.95; // Decrease threshold (be more sensitive)
    }
    
    // Ensure threshold stays within reasonable bounds
    this.config.phiThreshold = Math.max(2.0, Math.min(16.0, this.config.phiThreshold));
  }
  
  // Network Quality Assessment
  assessNetworkQuality() {
    const now = Date.now();
    let healthyNodes = 0;
    let suspectedNodes = 0;
    let recentHeartbeats = 0;
    
    for (const [peerId, failureState] of this.failureStates) {
      const timeSinceLastHeartbeat = now - failureState.lastHeartbeat;
      
      if (timeSinceLastHeartbeat < this.config.heartbeatInterval * 2) {
        recentHeartbeats++;
      }
      
      if (failureState.suspected) {
        suspectedNodes++;
      } else {
        healthyNodes++;
      }
    }
    
    const totalNodes = healthyNodes + suspectedNodes;
    
    return {
      totalNodes,
      healthyNodes,
      suspectedNodes,
      healthyPercentage: totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0,
      recentHeartbeats,
      averagePhi: this.metrics.averagePhiValue,
      networkStability: this.calculateNetworkStability()
    };
  }
  
  calculateNetworkStability() {
    const recentFailures = this.metrics.failuresDetected;
    const recentRecoveries = this.metrics.recoveredNodes;
    const totalEvents = recentFailures + recentRecoveries;
    
    if (totalEvents === 0) return 1.0; // Perfectly stable
    
    // Stability decreases with more failure events
    const stabilityScore = Math.max(0, 1 - (totalEvents / 100));
    return stabilityScore;
  }
  
  // Public API Methods
  addPeer(peerId) {
    if (!this.heartbeatHistory.has(peerId)) {
      this.heartbeatHistory.set(peerId, []);
      this.failureStates.set(peerId, {
        suspected: false,
        phi: 0,
        lastHeartbeat: Date.now(),
        suspicionLevel: 0
      });
      
      console.log(`Added peer ${peerId} to failure detection`);
    }
  }
  
  removePeer(peerId) {
    this.heartbeatHistory.delete(peerId);
    this.failureStates.delete(peerId);
    this.lastHeartbeats.delete(peerId);
    
    console.log(`Removed peer ${peerId} from failure detection`);
  }
  
  isPeerSuspected(peerId) {
    const failureState = this.failureStates.get(peerId);
    return failureState ? failureState.suspected : false;
  }
  
  getPeerPhi(peerId) {
    return this.calculatePhi(peerId);
  }
  
  getAllPeerStates() {
    const states = {};
    const now = Date.now();
    
    for (const [peerId, failureState] of this.failureStates) {
      states[peerId] = {
        ...failureState,
        phi: this.calculatePhi(peerId, now),
        timeSinceLastHeartbeat: now - failureState.lastHeartbeat,
        heartbeatCount: this.heartbeatHistory.get(peerId)?.length || 0
      };
    }
    
    return states;
  }
  
  // Heartbeat Sending (for testing and simulation)
  async sendHeartbeat(peerId) {
    try {
      // In real implementation, this would send via network
      const heartbeat = {
        type: 'heartbeat',
        senderId: this.nodeId,
        timestamp: Date.now(),
        sequenceNumber: this.metrics.heartbeatsSent
      };
      
      // Simulate network call
      await this.simulateNetworkSend(peerId, heartbeat);
      
      this.metrics.heartbeatsSent++;
      
    } catch (error) {
      console.error(`Failed to send heartbeat to ${peerId}:`, error);
    }
  }
  
  async simulateNetworkSend(peerId, message) {
    // Simulate network delay and potential packet loss
    const networkDelay = Math.random() * 100; // 0-100ms delay
    const packetLoss = Math.random() < 0.01; // 1% packet loss
    
    if (packetLoss) {
      throw new Error('Simulated packet loss');
    }
    
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    console.log(`Sent ${message.type} to ${peerId}`);
  }
  
  // Configuration Management
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Failure detector configuration updated:', newConfig);
  }
  
  getConfig() {
    return { ...this.config };
  }
  
  // Metrics and Monitoring
  getMetrics() {
    return {
      ...this.metrics,
      currentThreshold: this.config.phiThreshold,
      monitoredPeers: this.heartbeatHistory.size,
      networkQuality: this.assessNetworkQuality()
    };
  }
  
  resetMetrics() {
    this.metrics = {
      heartbeatsSent: 0,
      heartbeatsReceived: 0,
      failuresDetected: 0,
      falsePositives: 0,
      recoveredNodes: 0,
      averagePhiValue: 0
    };
  }
  
  // Debugging and Diagnostics
  getDebugInfo() {
    return {
      nodeId: this.nodeId,
      config: this.config,
      metrics: this.getMetrics(),
      peerStates: this.getAllPeerStates(),
      networkQuality: this.assessNetworkQuality()
    };
  }
  
  // Health Check
  performHealthCheck() {
    const now = Date.now();
    const issues = [];
    
    // Check for stale heartbeats
    for (const [peerId, lastHeartbeat] of this.lastHeartbeats) {
      const timeSinceHeartbeat = now - lastHeartbeat;
      if (timeSinceHeartbeat > this.config.heartbeatInterval * 5) {
        issues.push(`Stale heartbeat from ${peerId}: ${timeSinceHeartbeat}ms`);
      }
    }
    
    // Check threshold appropriateness
    if (this.metrics.averagePhiValue > this.config.phiThreshold * 0.8) {
      issues.push('Average phi value too close to threshold - consider increasing threshold');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations: this.generateRecommendations()
    };
  }
  
  generateRecommendations() {
    const recommendations = [];
    const networkQuality = this.assessNetworkQuality();
    
    if (networkQuality.healthyPercentage < 80) {
      recommendations.push('Network instability detected - consider adjusting phi threshold');
    }
    
    if (this.metrics.failuresDetected > this.metrics.recoveredNodes * 2) {
      recommendations.push('High failure rate - check network connectivity');
    }
    
    if (networkQuality.averagePhi > this.config.phiThreshold * 0.7) {
      recommendations.push('Consider increasing phi threshold for better stability');
    }
    
    return recommendations;
  }
}

export default FailureDetector;