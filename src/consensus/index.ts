/**
 * Hive-Mind Consensus Mechanisms - Export Index
 * 
 * Provides a unified interface to all consensus mechanisms and the main
 * orchestrator for distributed decision-making and fault tolerance.
 */

// Main orchestrator
export { default as HiveMindConsensusOrchestrator } from './hive-mind-orchestrator';
export type {
  ConsensusMode,
  DecisionContext,
  ConsensusRequest,
  ConsensusResult,
  NetworkConditions,
  HiveMindConfiguration,
  ConsensusMetrics
} from './hive-mind-orchestrator';

// Byzantine fault tolerance
export { default as ByzantineConsensusCoordinator } from './byzantine-consensus-coordinator';
export type {
  ConsensusState as ByzantineConsensusState,
  MessageType as ByzantineMessageType,
  ByzantineNode,
  ConsensusMessage as ByzantineMessage,
  ValidationResult as ByzantineValidationResult,
  ViewChangeData
} from './byzantine-consensus-coordinator';

// Raft consensus
export { default as RaftConsensusManager } from './raft-consensus-manager';
export type {
  NodeState as RaftNodeState,
  MessageType as RaftMessageType,
  LogEntry,
  RaftNode,
  RaftMessage,
  ClusterConfiguration,
  CommitResult
} from './raft-consensus-manager';

// CRDT synchronization
export { default as CRDTSynchronizer } from './crdt-synchronizer';
export type {
  VectorClock,
  CRDTOperation,
  CRDTState,
  SynchronizationResult,
  GossipMetadata
} from './crdt-synchronizer';
export {
  GCounter,
  PNCounter,
  GSet,
  ORSet
} from './crdt-synchronizer';

// Quorum management
export { default as QuorumManager } from './quorum-manager';
export type {
  FaultModel,
  OperationType,
  QuorumNode,
  QuorumCalculation,
  QuorumValidation,
  NetworkPartition,
  QuorumConfiguration
} from './quorum-manager';

// Gossip protocol
export { default as GossipCoordinator } from './gossip-coordinator';
export type {
  GossipType,
  MessagePriority,
  GossipMessage,
  GossipPeer,
  GossipRound,
  GossipConfiguration,
  AntiEntropySession
} from './gossip-coordinator';

// Security management
export { default as SecurityManager } from './security-manager';
export type {
  ThreatLevel,
  AttackType,
  SecurityNode,
  ThreatDetection,
  SecurityMessage,
  TrustMetrics,
  SecurityConfiguration,
  CryptographicProof
} from './security-manager';

/**
 * Factory function to create a fully configured hive-mind consensus system
 */
import HiveMindConsensusOrchestrator, { HiveMindConfiguration } from './hive-mind-orchestrator';
import CRDTSynchronizer from './crdt-synchronizer';
import QuorumManager, { QuorumConfiguration } from './quorum-manager';
import GossipCoordinator, { GossipConfiguration } from './gossip-coordinator';
import SecurityManager, { SecurityConfiguration } from './security-manager';

export interface HiveMindSystemConfiguration {
  hiveMind: HiveMindConfiguration;
  quorum: QuorumConfiguration;
  gossip: GossipConfiguration;
  security: SecurityConfiguration;
  // Optional Byzantine and Raft configurations will be passed separately
}

export function createHiveMindConsensusSystem(
  configuration: HiveMindSystemConfiguration
): HiveMindConsensusOrchestrator {
  // Create CRDT synchronizer
  const crdtSynchronizer = new CRDTSynchronizer(configuration.hiveMind.nodeId);
  
  // Create quorum manager
  const quorumManager = new QuorumManager(configuration.quorum);
  
  // Create gossip coordinator
  const gossipCoordinator = new GossipCoordinator(
    configuration.hiveMind.nodeId,
    configuration.gossip
  );
  
  // Create security manager (requires keys to be provided separately)
  const privateKey = Buffer.alloc(32); // Placeholder - should be provided
  const publicKey = Buffer.alloc(64);  // Placeholder - should be provided
  const securityManager = new SecurityManager(
    configuration.hiveMind.nodeId,
    privateKey,
    publicKey,
    configuration.security
  );
  
  // Create main orchestrator
  const orchestrator = new HiveMindConsensusOrchestrator(
    configuration.hiveMind,
    crdtSynchronizer,
    quorumManager,
    gossipCoordinator,
    securityManager
  );
  
  return orchestrator;
}

/**
 * Utility functions for consensus system configuration
 */
export function createDefaultHiveMindConfiguration(nodeId: string): HiveMindSystemConfiguration {
  return {
    hiveMind: {
      nodeId,
      defaultMode: 'auto' as any,
      adaptiveSelection: true,
      hybridFallback: true,
      performanceThresholds: {
        maxLatency: 1000,
        minThroughput: 100,
        maxNetworkOverhead: 1024 * 1024
      },
      faultToleranceRequirements: {
        byzantineFaultTolerance: false,
        crashFaultTolerance: true,
        partitionTolerance: true
      },
      securityRequirements: {
        cryptographicValidation: true,
        trustManagement: true,
        threatDetection: true
      }
    },
    quorum: {
      faultModel: 'crash' as any,
      baseThreshold: 0.51,
      maxFaults: 1,
      minActiveNodes: 3,
      weightDecayFactor: 0.01,
      partitionDetectionTimeout: 30000,
      adaptiveThresholds: true,
      requireGeographicDistribution: false,
      emergencyMode: {
        enabled: true,
        reducedThreshold: 0.4,
        timeoutPeriod: 300000
      }
    },
    gossip: {
      fanout: 3,
      interval: 5000,
      maxMessageAge: 300000,
      maxMessageSize: 1024 * 64,
      maxBatchSize: 10,
      duplicateDetectionWindow: 60000,
      compressionThreshold: 1024,
      adaptiveParameters: true,
      topologyAware: true,
      enableBloomFilters: true,
      retransmissionCount: 3
    },
    security: {
      signatureAlgorithm: 'RSA' as any,
      hashAlgorithm: 'SHA-256' as any,
      keySize: 2048,
      nonceSize: 16,
      maxMessageAge: 300000,
      trustDecayRate: 0.01,
      suspicionThreshold: 5,
      blacklistThreshold: 10,
      rateLimiting: {
        maxMessagesPerSecond: 100,
        maxBytesPerSecond: 1024 * 1024,
        windowSize: 60000
      },
      cryptographicProofs: true,
      zeroKnowledgeProofs: false,
      thresholdSignatures: false
    }
  };
}

/**
 * Consensus algorithm comparison utilities
 */
export interface ConsensusComparison {
  algorithm: string;
  faultTolerance: string;
  consistency: string;
  availability: string;
  partitionTolerance: string;
  performance: {
    latency: 'low' | 'medium' | 'high';
    throughput: 'low' | 'medium' | 'high';
    networkOverhead: 'low' | 'medium' | 'high';
  };
  useCases: string[];
  limitations: string[];
}

export function getConsensusAlgorithmComparison(): ConsensusComparison[] {
  return [
    {
      algorithm: 'Byzantine Fault Tolerance (pBFT)',
      faultTolerance: 'f < n/3 arbitrary failures',
      consistency: 'Strong consistency',
      availability: 'High availability with sufficient nodes',
      partitionTolerance: 'Limited partition tolerance',
      performance: {
        latency: 'high',
        throughput: 'low',
        networkOverhead: 'high'
      },
      useCases: [
        'Financial systems',
        'Critical infrastructure',
        'Adversarial environments',
        'High-value transactions'
      ],
      limitations: [
        'Requires 3f+1 nodes minimum',
        'High message complexity O(n²)',
        'Network partition sensitive',
        'Expensive cryptographic operations'
      ]
    },
    {
      algorithm: 'Raft Consensus',
      faultTolerance: 'f < n/2 crash failures',
      consistency: 'Strong consistency',
      availability: 'Good availability with leader',
      partitionTolerance: 'Majority partition remains available',
      performance: {
        latency: 'medium',
        throughput: 'medium',
        networkOverhead: 'medium'
      },
      useCases: [
        'Distributed databases',
        'Configuration management',
        'Log replication',
        'Trusted environments'
      ],
      limitations: [
        'Single leader bottleneck',
        'No Byzantine fault tolerance',
        'Network partition affects minority',
        'Leader election overhead'
      ]
    },
    {
      algorithm: 'CRDT Synchronization',
      faultTolerance: 'All partition scenarios',
      consistency: 'Eventual consistency',
      availability: 'Always available',
      partitionTolerance: 'Full partition tolerance',
      performance: {
        latency: 'low',
        throughput: 'high',
        networkOverhead: 'low'
      },
      useCases: [
        'Collaborative editing',
        'Distributed caches',
        'Mobile applications',
        'Offline-first systems'
      ],
      limitations: [
        'Eventual consistency only',
        'State size growth',
        'Complex conflict resolution',
        'Limited operation types'
      ]
    },
    {
      algorithm: 'Gossip Protocol',
      faultTolerance: 'High fault tolerance',
      consistency: 'Probabilistic eventual consistency',
      availability: 'Very high availability',
      partitionTolerance: 'Excellent partition tolerance',
      performance: {
        latency: 'medium',
        throughput: 'high',
        networkOverhead: 'medium'
      },
      useCases: [
        'Large-scale systems',
        'Peer-to-peer networks',
        'Information dissemination',
        'Failure detection'
      ],
      limitations: [
        'Probabilistic guarantees',
        'Message duplication',
        'Convergence time uncertainty',
        'Bandwidth utilization'
      ]
    }
  ];
}

/**
 * Performance benchmarking utilities
 */
export interface BenchmarkResult {
  algorithm: string;
  nodeCount: number;
  averageLatency: number;
  throughput: number;
  messageComplexity: number;
  networkOverhead: number;
  faultsTolerated: number;
}

export function benchmarkConsensusAlgorithms(nodeCount: number): BenchmarkResult[] {
  // Theoretical performance estimates based on algorithm characteristics
  return [
    {
      algorithm: 'Byzantine pBFT',
      nodeCount,
      averageLatency: 100 + (nodeCount * 10), // Increases with nodes
      throughput: Math.max(10, 1000 / nodeCount), // Decreases with nodes
      messageComplexity: nodeCount * nodeCount * 3, // O(n²) for 3 phases
      networkOverhead: nodeCount * nodeCount * 3 * 1024,
      faultsTolerated: Math.floor((nodeCount - 1) / 3)
    },
    {
      algorithm: 'Raft',
      nodeCount,
      averageLatency: 50 + (nodeCount * 2),
      throughput: Math.max(50, 2000 / Math.sqrt(nodeCount)),
      messageComplexity: nodeCount * 2, // Leader to followers
      networkOverhead: nodeCount * 2 * 512,
      faultsTolerated: Math.floor((nodeCount - 1) / 2)
    },
    {
      algorithm: 'CRDT',
      nodeCount,
      averageLatency: 20, // Local operations
      throughput: 5000, // Very high for local ops
      messageComplexity: nodeCount, // Gossip dissemination
      networkOverhead: nodeCount * 256,
      faultsTolerated: nodeCount // All nodes can fail and recover
    },
    {
      algorithm: 'Gossip',
      nodeCount,
      averageLatency: 30 + Math.log2(nodeCount) * 10,
      throughput: 2000,
      messageComplexity: nodeCount * Math.log2(nodeCount),
      networkOverhead: nodeCount * Math.log2(nodeCount) * 512,
      faultsTolerated: Math.floor(nodeCount * 0.8) // Very fault tolerant
    }
  ];
}

// Re-export enums for convenience
export { ConsensusState as ByzantineConsensusState } from './byzantine-consensus-coordinator';
export { NodeState as RaftNodeState } from './raft-consensus-manager';
export { FaultModel, OperationType } from './quorum-manager';
export { GossipType, MessagePriority } from './gossip-coordinator';
export { ThreatLevel, AttackType } from './security-manager';