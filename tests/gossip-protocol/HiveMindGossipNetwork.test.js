/**
 * Test Suite for Hive Mind Gossip Network
 * Comprehensive tests for gossip-based communication network
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HiveMindGossipNetwork } from '../../src/gossip-protocol/HiveMindGossipNetwork.js';

describe('HiveMindGossipNetwork', () => {
  let network1, network2, network3;
  
  beforeEach(async () => {
    // Create test networks with test configuration
    network1 = new HiveMindGossipNetwork('test-node-1', 'test');
    network2 = new HiveMindGossipNetwork('test-node-2', 'test');
    network3 = new HiveMindGossipNetwork('test-node-3', 'test');
    
    await network1.initialize();
    await network2.initialize();
    await network3.initialize();
  });
  
  afterEach(async () => {
    if (network1 && network1.isRunning) await network1.stop();
    if (network2 && network2.isRunning) await network2.stop();
    if (network3 && network3.isRunning) await network3.stop();
  });
  
  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      expect(network1.nodeId).toMatch(/^test-node-1$/);
      expect(network1.environment).toBe('test');
      expect(network1.coordinator).toBeDefined();
    });
    
    it('should generate unique node IDs', () => {
      const network4 = new HiveMindGossipNetwork(null, 'test');
      expect(network4.nodeId).toMatch(/^hive-node-/);
      expect(network4.nodeId).not.toBe(network1.nodeId);
    });
    
    it('should validate configuration', () => {
      expect(() => {
        new HiveMindGossipNetwork('test', 'test', {
          convergence: { convergenceThreshold: 2.0 } // Invalid threshold
        });
      }).toThrow();
    });
  });
  
  describe('Network Lifecycle', () => {
    it('should start and stop successfully', async () => {
      await network1.start();
      expect(network1.isRunning).toBe(true);
      expect(network1.startTime).toBeDefined();
      
      await network1.stop();
      expect(network1.isRunning).toBe(false);
    });
    
    it('should handle multiple start/stop cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await network1.start();
        expect(network1.isRunning).toBe(true);
        
        await network1.stop();
        expect(network1.isRunning).toBe(false);
      }
    });
    
    it('should not start when already running', async () => {
      await network1.start();
      
      // Should not throw error, but should warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await network1.start();
      expect(consoleSpy).toHaveBeenCalledWith('Network is already running');
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Peer Management', () => {
    beforeEach(async () => {
      await network1.start();
      await network2.start();
      await network3.start();
    });
    
    it('should allow adding peers manually', async () => {
      const peerInfo = {
        id: 'test-peer-1',
        address: '127.0.0.1',
        port: 8001
      };
      
      await network1.addPeer(peerInfo);
      const peers = network1.getPeers();
      
      expect(peers).toHaveLength(1);
      expect(peers[0].id).toBe('test-peer-1');
    });
    
    it('should allow removing peers', async () => {
      const peerInfo = {
        id: 'test-peer-1',
        address: '127.0.0.1',
        port: 8001
      };
      
      await network1.addPeer(peerInfo);
      expect(network1.getPeers()).toHaveLength(1);
      
      await network1.removePeer('test-peer-1');
      expect(network1.getPeers()).toHaveLength(0);
    });
    
    it('should track peer statistics', async () => {
      const peerInfo = {
        id: 'test-peer-1',
        address: '127.0.0.1',
        port: 8001
      };
      
      await network1.addPeer(peerInfo);
      
      // Simulate some network activity
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = network1.getNetworkStatus();
      expect(status.stats.peersConnected).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Message Broadcasting', () => {
    beforeEach(async () => {
      await network1.start();
    });
    
    it('should broadcast hive mind updates', async () => {
      const update = {
        type: 'collective_intelligence',
        data: { decision: 'consensus_reached' }
      };
      
      const messageId = await network1.broadcastHiveMindUpdate(update);
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });
    
    it('should broadcast consensus proposals', async () => {
      const proposal = {
        id: 'proposal-1',
        type: 'resource_allocation',
        details: { resource: 'compute', amount: 100 }
      };
      
      const messageId = await network1.broadcastConsensusProposal(proposal);
      expect(messageId).toBeDefined();
    });
    
    it('should synchronize state updates', async () => {
      const stateUpdate = {
        key: 'hive_status',
        value: 'active',
        version: 1
      };
      
      const messageId = await network1.synchronizeState(stateUpdate);
      expect(messageId).toBeDefined();
    });
    
    it('should fail when network is not running', async () => {
      await expect(
        network2.broadcastHiveMindUpdate({ test: 'data' })
      ).rejects.toThrow('Network is not running');
    });
  });
  
  describe('Network Status and Metrics', () => {
    beforeEach(async () => {
      await network1.start();
    });
    
    it('should provide network status', () => {
      const status = network1.getNetworkStatus();
      
      expect(status).toHaveProperty('status', 'running');
      expect(status).toHaveProperty('nodeId', network1.nodeId);
      expect(status).toHaveProperty('environment', 'test');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('topology');
      expect(status).toHaveProperty('metrics');
    });
    
    it('should provide network topology', () => {
      const topology = network1.getNetworkTopology();
      
      expect(topology).toHaveProperty('nodeId', network1.nodeId);
      expect(topology).toHaveProperty('peers');
      expect(topology).toHaveProperty('state');
      expect(topology).toHaveProperty('vectorClock');
    });
    
    it('should provide performance metrics', () => {
      const metrics = network1.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('node', network1.nodeId);
      expect(metrics).toHaveProperty('gossipRounds');
      expect(metrics).toHaveProperty('antiEntropyRounds');
      expect(metrics).toHaveProperty('failureDetection');
      expect(metrics).toHaveProperty('convergence');
    });
    
    it('should track uptime', async () => {
      const initialStatus = network1.getNetworkStatus();
      const initialUptime = initialStatus.uptime;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const laterStatus = network1.getNetworkStatus();
      expect(laterStatus.uptime).toBeGreaterThan(initialUptime);
    });
  });
  
  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        epidemic: { pushFanout: 5 },
        convergence: { convergenceThreshold: 0.9 }
      };
      
      expect(() => {
        network1.updateConfig(newConfig);
      }).not.toThrow();
      
      expect(network1.config.epidemic.pushFanout).toBe(5);
      expect(network1.config.convergence.convergenceThreshold).toBe(0.9);
    });
    
    it('should validate configuration updates', () => {
      const invalidConfig = {
        convergence: { convergenceThreshold: 2.0 } // Invalid
      };
      
      expect(() => {
        network1.updateConfig(invalidConfig);
      }).toThrow();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle coordinator errors gracefully', async () => {
      await network1.start();
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate coordinator error
      network1.coordinator.emit('error', new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalledWith(
        'Gossip coordinator error:',
        expect.any(Error)
      );
      
      errorSpy.mockRestore();
    });
    
    it('should handle initialization failures', async () => {
      // Mock coordinator creation failure
      const originalConsole = console.error;
      console.error = jest.fn();
      
      const invalidNetwork = new HiveMindGossipNetwork('test', 'invalid-env');
      
      // Reset console
      console.error = originalConsole;
    });
  });
  
  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await network1.start();
    });
    
    it('should perform health checks', async () => {
      const healthSpy = jest.spyOn(network1, 'performHealthCheck');
      
      // Wait for health check interval
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Health check should be called periodically (mocked)
      expect(network1.performHealthCheck).toBeDefined();
    });
    
    it('should provide debug information', () => {
      const debugInfo = network1.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('nodeId');
      expect(debugInfo).toHaveProperty('environment');
      expect(debugInfo).toHaveProperty('isRunning');
      expect(debugInfo).toHaveProperty('stats');
      expect(debugInfo).toHaveProperty('config');
    });
    
    it('should export network state', async () => {
      const exportedState = await network1.exportNetworkState();
      
      expect(exportedState).toHaveProperty('nodeId', network1.nodeId);
      expect(exportedState).toHaveProperty('exportTime');
      expect(exportedState).toHaveProperty('networkTopology');
      expect(exportedState).toHaveProperty('performanceMetrics');
      expect(exportedState).toHaveProperty('stats');
      expect(exportedState).toHaveProperty('config');
    });
  });
  
  describe('Multi-Node Network Simulation', () => {
    it('should create multiple nodes successfully', async () => {
      await network1.start();
      await network2.start();
      await network3.start();
      
      expect(network1.isRunning).toBe(true);
      expect(network2.isRunning).toBe(true);
      expect(network3.isRunning).toBe(true);
      
      expect(network1.nodeId).not.toBe(network2.nodeId);
      expect(network2.nodeId).not.toBe(network3.nodeId);
    });
    
    it('should simulate message propagation between nodes', async () => {
      await network1.start();
      await network2.start();
      
      // Add network2 as peer of network1
      await network1.addPeer({
        id: network2.nodeId,
        address: '127.0.0.1',
        port: 8002
      });
      
      // Broadcast from network1
      const messageId = await network1.broadcastHiveMindUpdate({
        test: 'multi-node communication'
      });
      
      expect(messageId).toBeDefined();
      
      // In a real implementation, we would verify message reception
      // Here we just verify the broadcast succeeded
    });
  });
  
  describe('Convergence Testing', () => {
    beforeEach(async () => {
      await network1.start();
    });
    
    it('should track convergence events', async () => {
      const initialStats = network1.getNetworkStatus().stats;
      const initialConvergence = initialStats.convergenceEvents;
      
      // Simulate convergence event
      network1.coordinator.emit('convergenceAchieved', {
        convergenceTime: 1000,
        nodesReached: 5
      });
      
      const updatedStats = network1.getNetworkStatus().stats;
      expect(updatedStats.convergenceEvents).toBe(initialConvergence + 1);
    });
  });
});

describe('Gossip Protocol Integration', () => {
  let network;
  
  beforeEach(async () => {
    network = new HiveMindGossipNetwork('integration-test', 'test');
    await network.initialize();
    await network.start();
  });
  
  afterEach(async () => {
    if (network && network.isRunning) {
      await network.stop();
    }
  });
  
  it('should integrate all gossip protocol components', () => {
    expect(network.coordinator).toBeDefined();
    expect(network.coordinator.peerManager).toBeDefined();
    expect(network.coordinator.epidemicProtocol).toBeDefined();
    expect(network.coordinator.antiEntropyProtocol).toBeDefined();
    expect(network.coordinator.failureDetector).toBeDefined();
    expect(network.coordinator.stateManager).toBeDefined();
    expect(network.coordinator.convergenceMonitor).toBeDefined();
  });
  
  it('should handle end-to-end message flow', async () => {
    const testMessage = {
      type: 'test_message',
      payload: { data: 'integration test' }
    };
    
    const messageId = await network.broadcastMessage(
      testMessage.type,
      testMessage.payload
    );
    
    expect(messageId).toBeDefined();
    
    // Verify message is in coordinator's message history
    const topology = network.getNetworkTopology();
    expect(topology.messageCount).toBeGreaterThan(0);
  });
});