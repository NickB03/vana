/**
 * Basic Swarm Initialization Examples
 * 
 * This example demonstrates different ways to initialize and configure
 * a hive-mind swarm with various topologies and configurations.
 */

// Example 1: Basic Mesh Topology Setup
async function basicMeshSetup() {
  console.log("🚀 Starting Basic Mesh Topology Setup");
  
  try {
    // Initialize swarm with mesh topology for full connectivity
    const swarm = await claudeFlow.swarm_init({
      topology: "mesh",
      maxAgents: 5,
      strategy: "balanced"
    });
    
    console.log("✅ Mesh swarm initialized:", swarm.swarmId);
    
    // Spawn core agent types
    const agents = await Promise.all([
      claudeFlow.agent_spawn({ type: "coordinator", name: "mesh-coordinator" }),
      claudeFlow.agent_spawn({ type: "researcher", name: "research-agent" }),
      claudeFlow.agent_spawn({ type: "coder", name: "development-agent" }),
      claudeFlow.agent_spawn({ type: "tester", name: "testing-agent" }),
      claudeFlow.agent_spawn({ type: "analyst", name: "analysis-agent" })
    ]);
    
    console.log("✅ Agents spawned:", agents.map(a => a.agentId));
    
    return { swarmId: swarm.swarmId, agents };
    
  } catch (error) {
    console.error("❌ Mesh setup failed:", error);
    throw error;
  }
}

// Example 2: Hierarchical Topology for Large Teams
async function hierarchicalSetup() {
  console.log("🏗️ Starting Hierarchical Topology Setup");
  
  try {
    // Initialize hierarchical swarm for structured coordination
    const swarm = await claudeFlow.swarm_init({
      topology: "hierarchical",
      maxAgents: 12,
      strategy: "specialized"
    });
    
    // Create management layer
    const coordinatorAgent = await claudeFlow.agent_spawn({
      type: "coordinator",
      name: "master-coordinator",
      capabilities: ["task-delegation", "resource-allocation", "conflict-resolution"]
    });
    
    // Create specialized teams
    const teams = {
      backend: await Promise.all([
        claudeFlow.agent_spawn({ type: "coder", name: "backend-lead" }),
        claudeFlow.agent_spawn({ type: "coder", name: "api-developer" }),
        claudeFlow.agent_spawn({ type: "coder", name: "database-specialist" })
      ]),
      frontend: await Promise.all([
        claudeFlow.agent_spawn({ type: "coder", name: "frontend-lead" }),
        claudeFlow.agent_spawn({ type: "coder", name: "ui-developer" }),
        claudeFlow.agent_spawn({ type: "coder", name: "ux-specialist" })
      ]),
      qa: await Promise.all([
        claudeFlow.agent_spawn({ type: "tester", name: "qa-lead" }),
        claudeFlow.agent_spawn({ type: "tester", name: "automation-tester" }),
        claudeFlow.agent_spawn({ type: "analyst", name: "performance-analyst" })
      ])
    };
    
    console.log("✅ Hierarchical swarm with teams created");
    
    return { swarmId: swarm.swarmId, coordinator: coordinatorAgent, teams };
    
  } catch (error) {
    console.error("❌ Hierarchical setup failed:", error);
    throw error;
  }
}

// Example 3: Adaptive Topology with Auto-Scaling
async function adaptiveSetup() {
  console.log("🤖 Starting Adaptive Topology Setup");
  
  try {
    const swarm = await claudeFlow.swarm_init({
      topology: "star", // Start with star, will adapt
      maxAgents: 8,
      strategy: "adaptive"
    });
    
    // Enable auto-scaling based on workload
    await claudeFlow.swarm_scale({
      swarmId: swarm.swarmId,
      targetSize: 6
    });
    
    // Monitor and adapt topology based on performance
    const monitoringTask = claudeFlow.swarm_monitor({
      swarmId: swarm.swarmId,
      interval: 5000 // Monitor every 5 seconds
    });
    
    // Auto-optimize topology based on performance metrics
    setTimeout(async () => {
      await claudeFlow.topology_optimize({
        swarmId: swarm.swarmId
      });
      console.log("🔄 Topology optimized based on performance");
    }, 30000);
    
    return { swarmId: swarm.swarmId, monitoring: monitoringTask };
    
  } catch (error) {
    console.error("❌ Adaptive setup failed:", error);
    throw error;
  }
}

// Example 4: Configuration with Custom Parameters
async function customConfigSetup() {
  console.log("⚙️ Starting Custom Configuration Setup");
  
  try {
    // Load custom configuration
    const config = await claudeFlow.config_manage({
      action: "load",
      config: {
        swarm: {
          topology: "mesh",
          maxAgents: 10,
          strategy: "balanced",
          features: {
            neuralTraining: true,
            memoryPersistence: true,
            autoOptimization: true,
            faultTolerance: true
          }
        },
        agents: {
          defaultCapabilities: ["collaboration", "learning", "adaptation"],
          specialization: {
            coder: ["javascript", "typescript", "react", "node.js"],
            tester: ["unit-testing", "integration-testing", "e2e-testing"],
            analyst: ["performance-analysis", "code-quality", "metrics"]
          }
        },
        memory: {
          persistence: "disk",
          ttl: 7200000, // 2 hours
          compression: true,
          encryption: false
        }
      }
    });
    
    // Initialize with custom config
    const swarm = await claudeFlow.swarm_init({
      topology: config.swarm.topology,
      maxAgents: config.swarm.maxAgents,
      strategy: config.swarm.strategy
    });
    
    // Enable advanced features
    if (config.swarm.features.neuralTraining) {
      await claudeFlow.neural_train({
        pattern_type: "coordination",
        training_data: "historical_swarm_interactions",
        epochs: 25
      });
    }
    
    if (config.swarm.features.memoryPersistence) {
      await claudeFlow.memory_persist({
        sessionId: swarm.swarmId
      });
    }
    
    console.log("✅ Custom configured swarm ready");
    
    return { swarmId: swarm.swarmId, config };
    
  } catch (error) {
    console.error("❌ Custom setup failed:", error);
    throw error;
  }
}

// Example 5: Quick Start Template
async function quickStart() {
  console.log("⚡ Quick Start Swarm Setup");
  
  const swarm = await claudeFlow.swarm_init({
    topology: "mesh",
    maxAgents: 5,
    strategy: "balanced"
  });
  
  // Spawn essential agents concurrently
  const [coordinator, researcher, coder, tester] = await Promise.all([
    claudeFlow.agent_spawn({ type: "coordinator" }),
    claudeFlow.agent_spawn({ type: "researcher" }),
    claudeFlow.agent_spawn({ type: "coder" }),
    claudeFlow.agent_spawn({ type: "tester" })
  ]);
  
  console.log("🚀 Quick start swarm ready!");
  
  return {
    swarmId: swarm.swarmId,
    agents: { coordinator, researcher, coder, tester }
  };
}

// Usage Examples
async function runExamples() {
  console.log("📚 Running Swarm Initialization Examples\n");
  
  try {
    // Run all examples
    const meshResult = await basicMeshSetup();
    console.log("✅ Mesh setup complete\n");
    
    const hierarchicalResult = await hierarchicalSetup();
    console.log("✅ Hierarchical setup complete\n");
    
    const adaptiveResult = await adaptiveSetup();
    console.log("✅ Adaptive setup complete\n");
    
    const customResult = await customConfigSetup();
    console.log("✅ Custom config setup complete\n");
    
    const quickResult = await quickStart();
    console.log("✅ Quick start complete\n");
    
    return {
      mesh: meshResult,
      hierarchical: hierarchicalResult,
      adaptive: adaptiveResult,
      custom: customResult,
      quick: quickResult
    };
    
  } catch (error) {
    console.error("❌ Example execution failed:", error);
  }
}

// Export for use in other modules
module.exports = {
  basicMeshSetup,
  hierarchicalSetup,
  adaptiveSetup,
  customConfigSetup,
  quickStart,
  runExamples
};

// Run examples if called directly
if (require.main === module) {
  runExamples();
}