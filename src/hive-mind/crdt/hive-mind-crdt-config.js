/**
 * Hive Mind CRDT Configuration
 * Defines CRDT structures and synchronization settings for the Hive Mind system
 */

const { CRDTSynchronizer } = require('./crdt-synchronizer');
const { CRDTComposer, CompositeCRDT } = require('./crdt-composer');
const DeltaStateCRDT = require('./delta-state-crdt');

class HiveMindCRDTConfig {
  constructor(nodeId, options = {}) {
    this.nodeId = nodeId;
    this.options = {
      replicationGroup: options.replicationGroup || ['node1', 'node2', 'node3'],
      autoSync: options.autoSync !== false,
      syncInterval: options.syncInterval || 30000, // 30 seconds
      deltaCompression: options.deltaCompression !== false,
      ...options
    };
    
    this.composer = new CRDTComposer();
    this.synchronizer = null;
    this.crdtInstances = new Map();
    this.initialized = false;
    
    this.setupCompositeTypes();
  }

  // Initialize CRDT system
  async initialize() {
    if (this.initialized) {
      return this;
    }
    
    // Initialize synchronizer
    this.synchronizer = new CRDTSynchronizer(
      this.nodeId,
      this.options.replicationGroup,
      {
        autoSync: this.options.autoSync,
        syncInterval: this.options.syncInterval,
        maxDeltaBuffer: this.options.maxDeltaBuffer || 1000
      }
    );
    
    // Create Hive Mind CRDT structures
    await this.createHiveMindStructures();
    
    this.initialized = true;
    return this;
  }

  // Setup composite CRDT types for Hive Mind
  setupCompositeTypes() {
    // Agent State CRDT
    this.composer.defineComposite('AgentState', {
      id: { type: 'LWW_REGISTER' },
      status: { type: 'LWW_REGISTER' }, // active, idle, busy, offline
      capabilities: { type: 'OR_SET' },
      currentTask: { type: 'LWW_REGISTER' },
      taskHistory: { type: 'RGA' },
      performance: {
        type: 'OR_MAP',
        options: { valueType: 'G_COUNTER' }
      },
      metadata: {
        type: 'OR_MAP',
        options: { valueType: 'LWW_REGISTER' }
      }
    }, {
      validator: (agent) => {
        return agent.hasField('id') && agent.hasField('status');
      }
    });

    // Task CRDT
    this.composer.defineComposite('Task', {
      id: { type: 'LWW_REGISTER' },
      title: { type: 'LWW_REGISTER' },
      description: { type: 'LWW_REGISTER' },
      status: { type: 'LWW_REGISTER' }, // pending, in_progress, completed, failed
      priority: { type: 'LWW_REGISTER' },
      assignedAgents: { type: 'OR_SET' },
      dependencies: { type: 'OR_SET' },
      progress: { type: 'PN_COUNTER' }, // Can go up and down
      results: { type: 'OR_MAP', options: { valueType: 'LWW_REGISTER' } },
      timeline: { type: 'RGA' }
    });

    // Swarm Configuration CRDT
    this.composer.defineComposite('SwarmConfig', {
      topology: { type: 'LWW_REGISTER' },
      maxAgents: { type: 'LWW_REGISTER' },
      strategy: { type: 'LWW_REGISTER' },
      activeAgents: { type: 'OR_SET' },
      coordinators: { type: 'OR_SET' },
      policies: {
        type: 'OR_MAP',
        options: { valueType: 'LWW_REGISTER' }
      }
    });

    // Knowledge Base CRDT
    this.composer.defineComposite('KnowledgeBase', {
      facts: {
        type: 'OR_MAP',
        options: { valueType: 'LWW_REGISTER' }
      },
      patterns: {
        type: 'OR_MAP',
        options: { valueType: 'OR_SET' }
      },
      experiences: { type: 'RGA' },
      confidence: {
        type: 'OR_MAP',
        options: { valueType: 'PN_COUNTER' }
      }
    });

    // Consensus State CRDT
    this.composer.defineComposite('ConsensusState', {
      proposals: {
        type: 'OR_MAP',
        options: { valueType: 'COMPOSITE', compositeType: 'Proposal' }
      },
      votes: {
        type: 'OR_MAP',
        options: { valueType: 'OR_SET' }
      },
      decisions: { type: 'RGA' },
      participants: { type: 'OR_SET' }
    });

    // Proposal CRDT (sub-composite)
    this.composer.defineComposite('Proposal', {
      id: { type: 'LWW_REGISTER' },
      proposer: { type: 'LWW_REGISTER' },
      content: { type: 'LWW_REGISTER' },
      timestamp: { type: 'LWW_REGISTER' },
      voteCount: { type: 'G_COUNTER' },
      status: { type: 'LWW_REGISTER' }
    });

    // Memory CRDT for distributed state
    this.composer.defineComposite('DistributedMemory', {
      shortTerm: {
        type: 'OR_MAP',
        options: { valueType: 'LWW_REGISTER' }
      },
      longTerm: {
        type: 'OR_MAP',
        options: { valueType: 'RGA' }
      },
      cache: {
        type: 'OR_MAP',
        options: { valueType: 'LWW_REGISTER' }
      },
      indexes: {
        type: 'OR_MAP',
        options: { valueType: 'OR_SET' }
      }
    });
  }

  // Create Hive Mind CRDT structures
  async createHiveMindStructures() {
    // Create main Hive Mind state structure
    const hiveMindState = this.composer.create('SwarmConfig', this.nodeId, this.options.replicationGroup);
    
    // Initialize with default values
    hiveMindState.setFieldValue('topology', 'mesh');
    hiveMindState.setFieldValue('maxAgents', 10);
    hiveMindState.setFieldValue('strategy', 'adaptive');
    
    // Register with synchronizer
    this.synchronizer.registerCRDT('hiveMindState', 'OR_MAP');
    this.crdtInstances.set('hiveMindState', hiveMindState);

    // Create agent registry
    const agentRegistry = this.synchronizer.registerCRDT('agentRegistry', 'OR_MAP');
    this.crdtInstances.set('agentRegistry', agentRegistry);

    // Create task queue
    const taskQueue = this.synchronizer.registerCRDT('taskQueue', 'RGA');
    this.crdtInstances.set('taskQueue', taskQueue);

    // Create knowledge base
    const knowledgeBase = this.composer.create('KnowledgeBase', this.nodeId, this.options.replicationGroup);
    this.crdtInstances.set('knowledgeBase', knowledgeBase);

    // Create consensus state
    const consensusState = this.composer.create('ConsensusState', this.nodeId, this.options.replicationGroup);
    this.crdtInstances.set('consensusState', consensusState);

    // Create distributed memory
    const distributedMemory = this.composer.create('DistributedMemory', this.nodeId, this.options.replicationGroup);
    this.crdtInstances.set('distributedMemory', distributedMemory);

    // Enable delta-state synchronization for efficiency
    if (this.options.deltaCompression) {
      for (const [name, crdt] of this.crdtInstances) {
        if (crdt.onUpdate) {
          const deltaCRDT = new DeltaStateCRDT(crdt, {
            maxDeltaBuffer: 500,
            compressionThreshold: 50
          });
          this.crdtInstances.set(`${name}_delta`, deltaCRDT);
        }
      }
    }
  }

  // Get CRDT instance
  getCRDT(name) {
    return this.crdtInstances.get(name);
  }

  // Register new agent
  registerAgent(agentId, capabilities = [], metadata = {}) {
    const agentState = this.composer.create('AgentState', this.nodeId, this.options.replicationGroup);
    
    agentState.setFieldValue('id', agentId);
    agentState.setFieldValue('status', 'active');
    
    // Add capabilities
    const capabilitySet = agentState.getField('capabilities');
    for (const capability of capabilities) {
      capabilitySet.add(capability);
    }
    
    // Add metadata
    const metadataMap = agentState.getField('metadata');
    for (const [key, value] of Object.entries(metadata)) {
      metadataMap.set(key, value);
    }
    
    // Add to agent registry
    const agentRegistry = this.getCRDT('agentRegistry');
    if (agentRegistry) {
      agentRegistry.set(agentId, agentState);
    }
    
    this.crdtInstances.set(`agent_${agentId}`, agentState);
    
    return agentState;
  }

  // Create task
  createTask(taskData) {
    const task = this.composer.create('Task', this.nodeId, this.options.replicationGroup);
    
    // Set task properties
    task.setFieldValue('id', taskData.id || this.generateTaskId());
    task.setFieldValue('title', taskData.title || 'Untitled Task');
    task.setFieldValue('description', taskData.description || '');
    task.setFieldValue('status', taskData.status || 'pending');
    task.setFieldValue('priority', taskData.priority || 'medium');
    
    // Add to task queue
    const taskQueue = this.getCRDT('taskQueue');
    if (taskQueue) {
      taskQueue.push(task);
    }
    
    const taskId = task.getFieldValue('id');
    this.crdtInstances.set(`task_${taskId}`, task);
    
    return task;
  }

  // Update agent status
  updateAgentStatus(agentId, status, taskId = null) {
    const agent = this.getCRDT(`agent_${agentId}`);
    if (agent) {
      agent.setFieldValue('status', status);
      if (taskId) {
        agent.setFieldValue('currentTask', taskId);
      }
    }
  }

  // Add knowledge to knowledge base
  addKnowledge(key, value, confidence = 1.0) {
    const knowledgeBase = this.getCRDT('knowledgeBase');
    if (knowledgeBase) {
      const facts = knowledgeBase.getField('facts');
      facts.set(key, value);
      
      const confidenceMap = knowledgeBase.getField('confidence');
      confidenceMap.set(key, Math.floor(confidence * 100)); // Store as integer
    }
  }

  // Create consensus proposal
  createProposal(content, proposerId) {
    const proposal = this.composer.create('Proposal', this.nodeId, this.options.replicationGroup);
    const proposalId = this.generateProposalId();
    
    proposal.setFieldValue('id', proposalId);
    proposal.setFieldValue('proposer', proposerId);
    proposal.setFieldValue('content', content);
    proposal.setFieldValue('timestamp', Date.now());
    proposal.setFieldValue('status', 'active');
    
    // Add to consensus state
    const consensusState = this.getCRDT('consensusState');
    if (consensusState) {
      const proposals = consensusState.getField('proposals');
      proposals.set(proposalId, proposal);
    }
    
    return proposal;
  }

  // Vote on proposal
  voteOnProposal(proposalId, voterIds) {
    const consensusState = this.getCRDT('consensusState');
    if (consensusState) {
      const votes = consensusState.getField('votes');
      let voteSet = votes.get(proposalId);
      
      if (!voteSet) {
        const newVoteSet = this.synchronizer.createCRDTInstance('OR_SET');
        votes.set(proposalId, newVoteSet);
        voteSet = newVoteSet;
      }
      
      // Add voters
      if (Array.isArray(voterIds)) {
        for (const voterId of voterIds) {
          voteSet.add(voterId);
        }
      } else {
        voteSet.add(voterIds);
      }
    }
  }

  // Store in distributed memory
  storeInMemory(key, value, type = 'shortTerm') {
    const distributedMemory = this.getCRDT('distributedMemory');
    if (distributedMemory) {
      const storage = distributedMemory.getField(type);
      if (storage) {
        storage.set(key, value);
      }
    }
  }

  // Retrieve from distributed memory
  retrieveFromMemory(key, type = 'shortTerm') {
    const distributedMemory = this.getCRDT('distributedMemory');
    if (distributedMemory) {
      const storage = distributedMemory.getField(type);
      if (storage) {
        return storage.get(key);
      }
    }
    return null;
  }

  // Synchronize with peers
  async synchronize(peerNodes = null) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.synchronizer.synchronize(peerNodes);
  }

  // Get synchronization statistics
  getSyncStats() {
    if (!this.synchronizer) {
      return null;
    }
    
    return this.synchronizer.getStats();
  }

  // Get complete Hive Mind state
  getHiveMindState() {
    const state = {};
    
    for (const [name, crdt] of this.crdtInstances) {
      if (crdt.getState) {
        state[name] = crdt.getState();
      } else if (crdt.getValue) {
        state[name] = crdt.getValue();
      } else {
        state[name] = crdt;
      }
    }
    
    return state;
  }

  // Get configuration for memory storage
  getMemoryConfig() {
    return {
      nodeId: this.nodeId,
      replicationGroup: this.options.replicationGroup,
      crdtTypes: Array.from(this.crdtInstances.keys()),
      compositeTypes: this.composer.getCompositeTypes(),
      syncStats: this.getSyncStats(),
      state: this.getHiveMindState(),
      initialized: this.initialized,
      timestamp: Date.now()
    };
  }

  // Restore from memory configuration
  static async fromMemoryConfig(config) {
    const hiveMindCRDT = new HiveMindCRDTConfig(config.nodeId, {
      replicationGroup: config.replicationGroup
    });
    
    await hiveMindCRDT.initialize();
    
    // Restore state if available
    if (config.state) {
      for (const [name, stateData] of Object.entries(config.state)) {
        const crdt = hiveMindCRDT.getCRDT(name);
        if (crdt && crdt.merge && stateData) {
          try {
            crdt.merge(stateData);
          } catch (error) {
            console.warn(`Failed to restore CRDT ${name}:`, error);
          }
        }
      }
    }
    
    return hiveMindCRDT;
  }

  // Utility methods
  generateTaskId() {
    return `task_${this.nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateProposalId() {
    return `proposal_${this.nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup and shutdown
  shutdown() {
    if (this.synchronizer) {
      this.synchronizer.shutdown();
    }
    
    this.crdtInstances.clear();
    this.initialized = false;
  }

  // Health check
  healthCheck() {
    const health = {
      initialized: this.initialized,
      synchronizerActive: !!this.synchronizer,
      crdtCount: this.crdtInstances.size,
      errors: []
    };
    
    // Check CRDT validity
    for (const [name, crdt] of this.crdtInstances) {
      if (crdt.isValid && !crdt.isValid()) {
        health.errors.push(`CRDT ${name} is invalid`);
      }
    }
    
    health.healthy = health.errors.length === 0;
    
    return health;
  }
}

module.exports = HiveMindCRDTConfig;