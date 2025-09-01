/**
 * Gossip Network Configuration
 * Central configuration for the Hive Mind gossip-based communication network
 */

export const GossipNetworkConfig = {
  // Network Topology
  topology: {
    type: 'mesh', // mesh, hierarchical, ring, star
    maxPeers: 50,
    minPeers: 3,
    fanout: 3,
    targetNetworkSize: 100
  },

  // Node Configuration
  node: {
    heartbeatInterval: 1000, // ms
    gossipInterval: 1000, // ms
    antiEntropyInterval: 10000, // ms
    peerTimeout: 30000, // ms
    maxMessageAge: 60000 // ms
  },

  // Epidemic Protocol Settings
  epidemic: {
    pushFanout: 3,
    pullFanout: 3,
    rumorLifetime: 30000,
    maxRumorAge: 60000,
    retransmissionProbability: 0.8,
    maxHopCount: 10
  },

  // Anti-Entropy Protocol Settings
  antiEntropy: {
    syncInterval: 10000,
    merkleTreeDepth: 8,
    maxSyncBatch: 100,
    compressionThreshold: 1024
  },

  // Failure Detection Settings
  failureDetection: {
    phiThreshold: 8.0,
    windowSize: 100,
    minStandardDeviation: 0.5,
    acceptableHeartbeatPause: 0,
    firstHeartbeatEstimate: 500,
    maxSampleSize: 200,
    suspicionMultiplier: 3
  },

  // Convergence Monitoring Settings
  convergence: {
    convergenceThreshold: 0.95,
    monitoringInterval: 5000,
    maxConvergenceTime: 30000,
    stabilityWindow: 10000,
    messageTrackingWindow: 60000
  },

  // State Management Settings
  state: {
    maxStateEntries: 10000,
    stateCleanupInterval: 300000, // 5 minutes
    conflictResolutionStrategy: 'last-writer-wins',
    enableVersioning: true,
    vectorClockSize: 1000
  },

  // Network Discovery Settings
  discovery: {
    bootstrapNodes: [
      // These would be real bootstrap nodes in production
      { id: 'bootstrap-1', address: '127.0.0.1', port: 8001 },
      { id: 'bootstrap-2', address: '127.0.0.1', port: 8002 },
      { id: 'bootstrap-3', address: '127.0.0.1', port: 8003 }
    ],
    discoveryInterval: 30000,
    maxDiscoveryRetries: 3,
    discoveryTimeout: 5000
  },

  // Security Settings
  security: {
    enableEncryption: false, // Set to true in production
    enableAuthentication: false, // Set to true in production
    trustedNodes: [],
    blacklistedNodes: []
  },

  // Performance Tuning
  performance: {
    maxConcurrentConnections: 100,
    connectionTimeout: 5000,
    messageQueueSize: 1000,
    batchSize: 50,
    compressionEnabled: true
  },

  // Monitoring and Metrics
  monitoring: {
    enableMetrics: true,
    metricsInterval: 10000,
    logLevel: 'info', // debug, info, warn, error
    enableDetailedLogging: false
  },

  // Memory and Storage
  storage: {
    enablePersistence: true,
    dataDirectory: './.hive-mind/gossip-data',
    maxMemoryUsage: '512MB',
    cleanupInterval: 3600000 // 1 hour
  },

  // Network Adaptation
  adaptation: {
    enableAdaptiveParameters: true,
    adaptationInterval: 60000,
    minAdaptationThreshold: 0.1,
    maxParameterChange: 0.2
  }
};

// Environment-specific configurations
export const DevelopmentConfig = {
  ...GossipNetworkConfig,
  node: {
    ...GossipNetworkConfig.node,
    heartbeatInterval: 500,
    gossipInterval: 500
  },
  monitoring: {
    ...GossipNetworkConfig.monitoring,
    logLevel: 'debug',
    enableDetailedLogging: true
  }
};

export const ProductionConfig = {
  ...GossipNetworkConfig,
  security: {
    ...GossipNetworkConfig.security,
    enableEncryption: true,
    enableAuthentication: true
  },
  performance: {
    ...GossipNetworkConfig.performance,
    maxConcurrentConnections: 1000
  },
  monitoring: {
    ...GossipNetworkConfig.monitoring,
    logLevel: 'warn'
  }
};

export const TestConfig = {
  ...GossipNetworkConfig,
  topology: {
    ...GossipNetworkConfig.topology,
    maxPeers: 10,
    fanout: 2
  },
  node: {
    ...GossipNetworkConfig.node,
    heartbeatInterval: 100,
    gossipInterval: 100,
    peerTimeout: 5000
  },
  convergence: {
    ...GossipNetworkConfig.convergence,
    monitoringInterval: 1000,
    maxConvergenceTime: 5000
  }
};

// Configuration selector based on environment
export function getConfig(environment = 'development') {
  switch (environment.toLowerCase()) {
    case 'production':
      return ProductionConfig;
    case 'test':
      return TestConfig;
    case 'development':
    default:
      return DevelopmentConfig;
  }
}

// Configuration validation
export function validateConfig(config) {
  const errors = [];

  // Validate required fields
  if (!config.topology?.type) {
    errors.push('topology.type is required');
  }

  if (config.topology?.fanout > config.topology?.maxPeers) {
    errors.push('fanout cannot be greater than maxPeers');
  }

  if (config.node?.gossipInterval < 100) {
    errors.push('gossipInterval should be at least 100ms');
  }

  if (config.failureDetection?.phiThreshold < 1.0) {
    errors.push('phiThreshold should be at least 1.0');
  }

  if (config.convergence?.convergenceThreshold < 0.5 || config.convergence?.convergenceThreshold > 1.0) {
    errors.push('convergenceThreshold should be between 0.5 and 1.0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default GossipNetworkConfig;