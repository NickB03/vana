/**
 * Byzantine Fault Tolerance System - Main Export
 * 
 * Comprehensive Byzantine fault tolerance implementation for the Hive Mind
 * collective intelligence network.
 */

const ByzantineConsensusManager = require('./consensus-manager');
const QuorumManager = require('./quorum-manager');
const SecurityManager = require('./security-manager');
const NetworkResilienceManager = require('./network-resilience');
const HiveMindByzantineIntegration = require('./hive-mind-integration');

/**
 * Create a complete Byzantine fault tolerance system
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.nodeId - Unique node identifier
 * @param {number} options.totalNodes - Total number of nodes in the network
 * @param {number} options.maxFaults - Maximum Byzantine faults to tolerate
 * @param {Object} options.hiveMindConfig - Hive Mind specific configuration
 * @returns {HiveMindByzantineIntegration} Integrated Byzantine system
 */
function createByzantineSystem(options = {}) {
  const defaultOptions = {
    nodeId: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    totalNodes: 7,
    maxFaults: 2,
    hiveMindConfig: {
      collectiveIntelligence: true,
      swarmBehavior: true,
      adaptiveConsensus: true,
      distributedLearning: true
    }
  };
  
  const config = { ...defaultOptions, ...options };
  
  console.log(`🧠 Creating Byzantine fault tolerance system for Hive Mind`);
  console.log(`   Node ID: ${config.nodeId}`);
  console.log(`   Network: ${config.totalNodes} nodes, tolerating ${config.maxFaults} faults`);
  console.log(`   Features: Collective Intelligence, Swarm Behavior, Adaptive Consensus`);
  
  return new HiveMindByzantineIntegration(config);
}

/**
 * Create individual components for custom integration
 */
function createComponents(options = {}) {
  const nodeId = options.nodeId || `node-${Date.now()}`;
  
  return {
    consensusManager: new ByzantineConsensusManager({
      nodeId,
      totalNodes: options.totalNodes || 7,
      maxFaults: options.maxFaults || 2
    }),
    
    quorumManager: new QuorumManager({
      nodeId,
      totalNodes: options.totalNodes || 7,
      maxFaults: options.maxFaults || 2
    }),
    
    securityManager: new SecurityManager({
      nodeId,
      keySize: options.keySize || 2048,
      threshold: options.threshold || 4
    }),
    
    resilienceManager: new NetworkResilienceManager({
      nodeId,
      networkTimeout: options.networkTimeout || 30000,
      heartbeatInterval: options.heartbeatInterval || 10000
    })
  };
}

/**
 * Validate Byzantine network parameters
 * 
 * @param {number} totalNodes - Total nodes in network
 * @param {number} maxFaults - Maximum Byzantine faults
 * @returns {Object} Validation result
 */
function validateNetworkParameters(totalNodes, maxFaults) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    recommendations: {}
  };
  
  // Byzantine fault tolerance requires n >= 3f + 1
  if (totalNodes < 3 * maxFaults + 1) {
    result.valid = false;
    result.errors.push(`Network size (${totalNodes}) insufficient for ${maxFaults} faults. Need at least ${3 * maxFaults + 1} nodes.`);
  }
  
  // Odd number of nodes is preferred
  if (totalNodes % 2 === 0) {
    result.warnings.push('Even number of nodes may lead to ties. Odd numbers are preferred.');
    result.recommendations.nodes = totalNodes + 1;
  }
  
  // Minimum network size recommendation
  if (totalNodes < 7) {
    result.warnings.push('Small network size may not provide sufficient fault tolerance for production use.');
    result.recommendations.minProduction = 7;
  }
  
  // Calculate optimal parameters
  result.recommendations.quorumSize = Math.floor((totalNodes + maxFaults) / 2) + 1;
  result.recommendations.securityThreshold = Math.floor(totalNodes / 2) + 1;
  result.recommendations.minActiveNodes = totalNodes - maxFaults;
  
  return result;
}

/**
 * Generate optimal network configuration
 * 
 * @param {Object} requirements - Network requirements
 * @returns {Object} Optimal configuration
 */
function generateOptimalConfig(requirements = {}) {
  const {
    expectedFaults = 2,
    performancePriority = 'balanced', // 'speed', 'security', 'balanced'
    networkSize = 'medium' // 'small', 'medium', 'large'
  } = requirements;
  
  let totalNodes;
  switch (networkSize) {
    case 'small':
      totalNodes = Math.max(7, 3 * expectedFaults + 1);
      break;
    case 'large':
      totalNodes = Math.max(15, 3 * expectedFaults + 1);
      break;
    default: // medium
      totalNodes = Math.max(10, 3 * expectedFaults + 1);
  }
  
  // Ensure odd number
  if (totalNodes % 2 === 0) {
    totalNodes++;
  }
  
  const config = {
    totalNodes,
    maxFaults: expectedFaults,
    quorumSize: Math.floor((totalNodes + expectedFaults) / 2) + 1,
    
    // Performance tuning based on priority
    networkTimeout: performancePriority === 'speed' ? 15000 : 30000,
    heartbeatInterval: performancePriority === 'speed' ? 5000 : 10000,
    keySize: performancePriority === 'security' ? 4096 : 2048,
    
    // Hive Mind features
    hiveMindConfig: {
      collectiveIntelligence: true,
      swarmBehavior: true,
      adaptiveConsensus: performancePriority === 'balanced',
      distributedLearning: true,
      emergentBehavior: networkSize !== 'small'
    }
  };
  
  const validation = validateNetworkParameters(totalNodes, expectedFaults);
  
  return {
    config,
    validation,
    estimatedPerformance: {
      throughput: `${Math.round(1000 / config.networkTimeout * config.quorumSize)} req/s`,
      latency: `${config.networkTimeout}ms`,
      faultTolerance: `${expectedFaults}/${totalNodes} nodes`,
      securityLevel: config.keySize >= 4096 ? 'high' : 'standard'
    }
  };
}

/**
 * Byzantine system utilities
 */
const ByzantineUtils = {
  /**
   * Calculate minimum network size for fault tolerance
   */
  calculateMinimumNodes: (maxFaults) => 3 * maxFaults + 1,
  
  /**
   * Calculate optimal quorum size
   */
  calculateQuorumSize: (totalNodes, maxFaults) => Math.floor((totalNodes + maxFaults) / 2) + 1,
  
  /**
   * Estimate system performance
   */
  estimatePerformance: (config) => {
    const { totalNodes, maxFaults, networkTimeout, quorumSize } = config;
    
    return {
      maxThroughput: Math.round(1000 / networkTimeout * quorumSize),
      averageLatency: networkTimeout,
      worstCaseLatency: networkTimeout * 3, // View changes
      faultTolerance: maxFaults / totalNodes,
      networkEfficiency: (totalNodes - maxFaults) / totalNodes
    };
  },
  
  /**
   * Generate test network configuration
   */
  createTestConfig: (nodeCount = 7) => ({
    totalNodes: nodeCount,
    maxFaults: Math.floor((nodeCount - 1) / 3),
    networkTimeout: 5000, // Faster for testing
    heartbeatInterval: 2000,
    keySize: 1024, // Smaller for faster key generation in tests
    hiveMindConfig: {
      collectiveIntelligence: true,
      swarmBehavior: false, // Simplified for testing
      adaptiveConsensus: false,
      distributedLearning: false
    }
  })
};

module.exports = {
  // Main components
  ByzantineConsensusManager,
  QuorumManager,
  SecurityManager,
  NetworkResilienceManager,
  HiveMindByzantineIntegration,
  
  // Factory functions
  createByzantineSystem,
  createComponents,
  
  // Configuration utilities
  validateNetworkParameters,
  generateOptimalConfig,
  
  // Utilities
  ByzantineUtils,
  
  // Constants
  CONSTANTS: {
    DEFAULT_NETWORK_SIZE: 7,
    DEFAULT_MAX_FAULTS: 2,
    DEFAULT_QUORUM_SIZE: 4,
    DEFAULT_NETWORK_TIMEOUT: 30000,
    DEFAULT_HEARTBEAT_INTERVAL: 10000,
    DEFAULT_KEY_SIZE: 2048,
    
    // Byzantine fault tolerance limits
    MIN_NETWORK_SIZE: 4,
    MAX_PRACTICAL_NETWORK_SIZE: 100,
    
    // Security levels
    SECURITY_LEVELS: {
      MINIMAL: { keySize: 1024, threshold: 2 },
      STANDARD: { keySize: 2048, threshold: 3 },
      HIGH: { keySize: 4096, threshold: 5 },
      MAXIMUM: { keySize: 8192, threshold: 7 }
    }
  }
};

// Export default for convenience
module.exports.default = createByzantineSystem;