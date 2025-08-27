/**
 * Basic Agent Spawning Examples
 * 
 * Demonstrates fundamental patterns for creating and managing agents
 * within a hive-mind swarm with proper coordination hooks.
 */

// Example 1: Sequential Agent Creation with Coordination Hooks
async function sequentialAgentSpawning() {
  console.log("🔄 Sequential Agent Spawning Example");
  
  try {
    // Pre-task hook: Prepare for agent spawning
    await claudeFlow.hooks.pre_task({
      description: "Sequential agent spawning with coordination setup"
    });
    
    // Initialize swarm first
    const swarm = await claudeFlow.swarm_init({
      topology: "hierarchical",
      maxAgents: 6,
      strategy: "specialized"
    });
    
    // Spawn coordinator first
    console.log("🎯 Spawning coordinator agent...");
    const coordinator = await claudeFlow.agent_spawn({
      type: "coordinator",
      name: "master-coordinator",
      capabilities: [
        "task-delegation",
        "resource-allocation",
        "progress-monitoring",
        "conflict-resolution"
      ]
    });
    
    // Store coordinator info in memory
    await claudeFlow.memory_usage({
      action: "store",
      key: "swarm/coordinator",
      value: JSON.stringify({
        agentId: coordinator.agentId,
        role: "master-coordinator",
        spawned: new Date().toISOString()
      }),
      namespace: "agents",
      ttl: 3600000 // 1 hour
    });
    
    // Spawn specialized agents in sequence
    const agentTypes = [
      { type: "researcher", name: "requirements-analyst" },
      { type: "architect", name: "system-architect" },
      { type: "coder", name: "lead-developer" },
      { type: "tester", name: "qa-engineer" },
      { type: "reviewer", name: "code-reviewer" }
    ];
    
    const agents = [];
    for (const agentConfig of agentTypes) {
      console.log(`🤖 Spawning ${agentConfig.name}...`);
      
      const agent = await claudeFlow.agent_spawn({
        type: agentConfig.type,
        name: agentConfig.name,
        capabilities: getCapabilitiesForType(agentConfig.type)
      });
      
      agents.push(agent);
      
      // Store agent info and notify coordinator
      await claudeFlow.memory_usage({
        action: "store",
        key: `swarm/agents/${agent.agentId}`,
        value: JSON.stringify({
          ...agent,
          type: agentConfig.type,
          name: agentConfig.name,
          spawned: new Date().toISOString()
        }),
        namespace: "agents"
      });
      
      // Notify other agents of new team member
      await claudeFlow.hooks.notify({
        message: `New agent spawned: ${agentConfig.name} (${agentConfig.type})`
      });
      
      // Brief pause for coordination
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Post-task hook: Complete agent spawning
    await claudeFlow.hooks.post_task({
      taskId: "sequential-spawning"
    });
    
    console.log(`✅ Sequential spawning complete: ${agents.length} agents created`);
    
    return { swarmId: swarm.swarmId, coordinator, agents };
    
  } catch (error) {
    console.error("❌ Sequential spawning failed:", error);
    throw error;
  }
}

// Example 2: Parallel Agent Creation for Speed
async function parallelAgentSpawning() {
  console.log("⚡ Parallel Agent Spawning Example");
  
  try {
    // Initialize swarm
    const swarm = await claudeFlow.swarm_init({
      topology: "mesh",
      maxAgents: 8,
      strategy: "balanced"
    });
    
    // Define agent configurations
    const agentConfigs = [
      {
        type: "coordinator",
        name: "swarm-coordinator",
        capabilities: ["coordination", "task-distribution", "monitoring"]
      },
      {
        type: "researcher",
        name: "market-researcher",
        capabilities: ["data-analysis", "trend-identification", "reporting"]
      },
      {
        type: "architect",
        name: "solution-architect",
        capabilities: ["system-design", "scalability-planning", "tech-selection"]
      },
      {
        type: "coder",
        name: "full-stack-developer",
        capabilities: ["frontend-dev", "backend-dev", "database-design"]
      },
      {
        type: "coder",
        name: "mobile-developer",
        capabilities: ["react-native", "ios-dev", "android-dev"]
      },
      {
        type: "tester",
        name: "automation-engineer",
        capabilities: ["test-automation", "ci-cd", "performance-testing"]
      },
      {
        type: "analyst",
        name: "performance-analyst",
        capabilities: ["performance-monitoring", "optimization", "metrics"]
      },
      {
        type: "reviewer",
        name: "security-reviewer",
        capabilities: ["security-audit", "code-review", "compliance"]
      }
    ];
    
    console.log("🚀 Spawning all agents in parallel...");
    
    // Spawn all agents concurrently
    const agentPromises = agentConfigs.map(config =>
      claudeFlow.agent_spawn({
        type: config.type,
        name: config.name,
        capabilities: config.capabilities
      })
    );
    
    const agents = await Promise.all(agentPromises);
    
    // Store all agent information in parallel
    const memoryPromises = agents.map((agent, index) =>
      claudeFlow.memory_usage({
        action: "store",
        key: `swarm/parallel-agents/${agent.agentId}`,
        value: JSON.stringify({
          ...agent,
          config: agentConfigs[index],
          spawned: new Date().toISOString()
        }),
        namespace: "parallel-spawn"
      })
    );
    
    await Promise.all(memoryPromises);
    
    console.log(`✅ Parallel spawning complete: ${agents.length} agents created simultaneously`);
    
    return { swarmId: swarm.swarmId, agents };
    
  } catch (error) {
    console.error("❌ Parallel spawning failed:", error);
    throw error;
  }
}

// Example 3: Dynamic Agent Spawning Based on Workload
async function dynamicAgentSpawning() {
  console.log("🔄 Dynamic Agent Spawning Example");
  
  try {
    const swarm = await claudeFlow.swarm_init({
      topology: "star",
      maxAgents: 15,
      strategy: "adaptive"
    });
    
    // Start with minimal agent set
    const coreAgents = await Promise.all([
      claudeFlow.agent_spawn({ type: "coordinator", name: "adaptive-coordinator" }),
      claudeFlow.agent_spawn({ type: "analyst", name: "workload-analyst" })
    ]);
    
    // Simulate workload analysis
    const workloadAnalysis = await analyzeWorkload();
    
    // Dynamically spawn agents based on needs
    const dynamicAgents = [];
    
    if (workloadAnalysis.needsResearch) {
      console.log("📊 Spawning research team...");
      const researchTeam = await Promise.all([
        claudeFlow.agent_spawn({ type: "researcher", name: "primary-researcher" }),
        claudeFlow.agent_spawn({ type: "researcher", name: "data-analyst" })
      ]);
      dynamicAgents.push(...researchTeam);
    }
    
    if (workloadAnalysis.needsDevelopment) {
      console.log("👨‍💻 Spawning development team...");
      const devTeam = await Promise.all([
        claudeFlow.agent_spawn({ type: "architect", name: "lead-architect" }),
        claudeFlow.agent_spawn({ type: "coder", name: "backend-dev" }),
        claudeFlow.agent_spawn({ type: "coder", name: "frontend-dev" })
      ]);
      dynamicAgents.push(...devTeam);
    }
    
    if (workloadAnalysis.needsTesting) {
      console.log("🧪 Spawning testing team...");
      const testTeam = await Promise.all([
        claudeFlow.agent_spawn({ type: "tester", name: "test-lead" }),
        claudeFlow.agent_spawn({ type: "tester", name: "automation-specialist" })
      ]);
      dynamicAgents.push(...testTeam);
    }
    
    // Monitor and potentially spawn more agents
    const monitoringInterval = setInterval(async () => {
      const metrics = await claudeFlow.agent_metrics();
      const currentLoad = metrics.averageLoad;
      
      if (currentLoad > 0.8 && dynamicAgents.length < 10) {
        console.log("⚡ High load detected, spawning additional agent...");
        const additionalAgent = await claudeFlow.agent_spawn({
          type: "optimizer",
          name: `load-balancer-${Date.now()}`
        });
        dynamicAgents.push(additionalAgent);
      }
    }, 10000); // Check every 10 seconds
    
    // Cleanup monitoring after 2 minutes
    setTimeout(() => {
      clearInterval(monitoringInterval);
      console.log("🛑 Dynamic spawning monitoring stopped");
    }, 120000);
    
    console.log(`✅ Dynamic spawning complete: ${coreAgents.length + dynamicAgents.length} total agents`);
    
    return {
      swarmId: swarm.swarmId,
      coreAgents,
      dynamicAgents,
      workloadAnalysis
    };
    
  } catch (error) {
    console.error("❌ Dynamic spawning failed:", error);
    throw error;
  }
}

// Example 4: Specialized Agent Teams
async function specializedTeamSpawning() {
  console.log("🏗️ Specialized Team Spawning Example");
  
  try {
    const swarm = await claudeFlow.swarm_init({
      topology: "hierarchical",
      maxAgents: 20,
      strategy: "specialized"
    });
    
    // Define specialized teams
    const teams = {
      leadership: [
        { type: "coordinator", name: "project-manager", capabilities: ["project-management", "stakeholder-communication"] },
        { type: "architect", name: "technical-lead", capabilities: ["technical-leadership", "architecture-decisions"] }
      ],
      research: [
        { type: "researcher", name: "user-researcher", capabilities: ["user-interviews", "market-analysis"] },
        { type: "researcher", name: "tech-researcher", capabilities: ["technology-scouting", "competitive-analysis"] },
        { type: "analyst", name: "business-analyst", capabilities: ["requirements-analysis", "process-modeling"] }
      ],
      development: [
        { type: "coder", name: "senior-backend-dev", capabilities: ["microservices", "database-design", "api-development"] },
        { type: "coder", name: "senior-frontend-dev", capabilities: ["react", "typescript", "responsive-design"] },
        { type: "coder", name: "mobile-developer", capabilities: ["react-native", "mobile-optimization"] },
        { type: "coder", name: "devops-engineer", capabilities: ["ci-cd", "containerization", "cloud-deployment"] }
      ],
      quality: [
        { type: "tester", name: "qa-lead", capabilities: ["test-strategy", "quality-assurance"] },
        { type: "tester", name: "automation-engineer", capabilities: ["test-automation", "performance-testing"] },
        { type: "reviewer", name: "code-reviewer", capabilities: ["code-quality", "security-review"] },
        { type: "analyst", name: "quality-analyst", capabilities: ["metrics-analysis", "quality-reporting"] }
      ]
    };
    
    // Spawn teams sequentially to maintain hierarchy
    const spawnedTeams = {};
    
    for (const [teamName, teamMembers] of Object.entries(teams)) {
      console.log(`🎯 Spawning ${teamName} team...`);
      
      const teamAgents = await Promise.all(
        teamMembers.map(member =>
          claudeFlow.agent_spawn({
            type: member.type,
            name: member.name,
            capabilities: member.capabilities
          })
        )
      );
      
      spawnedTeams[teamName] = teamAgents;
      
      // Store team structure in memory
      await claudeFlow.memory_usage({
        action: "store",
        key: `teams/${teamName}`,
        value: JSON.stringify({
          teamName,
          members: teamAgents.map(agent => ({
            agentId: agent.agentId,
            name: teamMembers.find(m => m.type === agent.type)?.name,
            type: agent.type
          })),
          spawned: new Date().toISOString()
        }),
        namespace: "team-structure"
      });
      
      console.log(`✅ ${teamName} team spawned (${teamAgents.length} members)`);
    }
    
    // Establish team communication channels
    await establishTeamCommunication(spawnedTeams);
    
    console.log("✅ All specialized teams spawned and configured");
    
    return { swarmId: swarm.swarmId, teams: spawnedTeams };
    
  } catch (error) {
    console.error("❌ Specialized team spawning failed:", error);
    throw error;
  }
}

// Helper Functions
function getCapabilitiesForType(agentType) {
  const capabilityMap = {
    coordinator: ["task-delegation", "progress-monitoring", "resource-allocation"],
    researcher: ["data-collection", "analysis", "reporting"],
    architect: ["system-design", "technology-selection", "scalability-planning"],
    coder: ["programming", "debugging", "code-optimization"],
    tester: ["test-design", "automation", "quality-assurance"],
    reviewer: ["code-review", "quality-assessment", "best-practices"],
    analyst: ["data-analysis", "performance-monitoring", "metrics-reporting"],
    optimizer: ["performance-tuning", "resource-optimization", "bottleneck-analysis"]
  };
  
  return capabilityMap[agentType] || ["general-purpose"];
}

async function analyzeWorkload() {
  // Simulate workload analysis
  return {
    needsResearch: Math.random() > 0.3,
    needsDevelopment: Math.random() > 0.2,
    needsTesting: Math.random() > 0.4,
    complexity: Math.random(),
    estimatedDuration: Math.floor(Math.random() * 10) + 1
  };
}

async function establishTeamCommunication(teams) {
  console.log("📡 Establishing team communication channels...");
  
  // Set up inter-team communication protocols
  for (const [teamName, teamMembers] of Object.entries(teams)) {
    await claudeFlow.memory_usage({
      action: "store",
      key: `communication/${teamName}`,
      value: JSON.stringify({
        channelType: "hierarchical",
        members: teamMembers.map(agent => agent.agentId),
        protocols: ["status-updates", "task-coordination", "resource-sharing"]
      }),
      namespace: "communication"
    });
  }
  
  console.log("✅ Team communication channels established");
}

// Usage Examples
async function runAgentSpawningExamples() {
  console.log("🚀 Running Agent Spawning Examples\n");
  
  try {
    // Sequential spawning
    const sequentialResult = await sequentialAgentSpawning();
    console.log("✅ Sequential spawning example completed\n");
    
    // Parallel spawning  
    const parallelResult = await parallelAgentSpawning();
    console.log("✅ Parallel spawning example completed\n");
    
    // Dynamic spawning
    const dynamicResult = await dynamicAgentSpawning();
    console.log("✅ Dynamic spawning example completed\n");
    
    // Specialized teams
    const teamResult = await specializedTeamSpawning();
    console.log("✅ Specialized team spawning example completed\n");
    
    return {
      sequential: sequentialResult,
      parallel: parallelResult,
      dynamic: dynamicResult,
      teams: teamResult
    };
    
  } catch (error) {
    console.error("❌ Agent spawning examples failed:", error);
  }
}

module.exports = {
  sequentialAgentSpawning,
  parallelAgentSpawning,
  dynamicAgentSpawning,
  specializedTeamSpawning,
  runAgentSpawningExamples
};

if (require.main === module) {
  runAgentSpawningExamples();
}