/**
 * Complex Consensus Scenarios for Distributed Decision-Making
 * 
 * Demonstrates sophisticated consensus mechanisms for hive-mind operations
 * including Byzantine fault tolerance, distributed voting, and conflict resolution.
 */

// Example 1: Byzantine Fault Tolerant Consensus
async function byzantineFaultTolerantConsensus() {
  console.log("⚔️ Byzantine Fault Tolerant Consensus Example");
  
  try {
    // Initialize swarm with Byzantine fault tolerance
    const swarm = await claudeFlow.swarm_init({
      topology: "mesh",
      maxAgents: 10,
      strategy: "adaptive"
    });
    
    // Create Byzantine-tolerant consensus group
    const consensusNodes = await Promise.all([
      // Validator nodes (honest majority required)
      claudeFlow.agent_spawn({
        type: "coordinator",
        name: "validator-node-1",
        capabilities: ["consensus-validation", "byzantine-detection", "message-verification"]
      }),
      claudeFlow.agent_spawn({
        type: "coordinator", 
        name: "validator-node-2",
        capabilities: ["consensus-validation", "byzantine-detection", "message-verification"]
      }),
      claudeFlow.agent_spawn({
        type: "coordinator",
        name: "validator-node-3",
        capabilities: ["consensus-validation", "byzantine-detection", "message-verification"]
      }),
      claudeFlow.agent_spawn({
        type: "coordinator",
        name: "validator-node-4",
        capabilities: ["consensus-validation", "byzantine-detection", "message-verification"]
      }),
      
      // Proposer nodes
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "proposer-node-1",
        capabilities: ["proposal-generation", "data-analysis", "recommendation-engine"]
      }),
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "proposer-node-2", 
        capabilities: ["proposal-generation", "data-analysis", "recommendation-engine"]
      }),
      
      // Monitoring and auditing nodes
      claudeFlow.agent_spawn({
        type: "monitor",
        name: "consensus-monitor",
        capabilities: ["consensus-monitoring", "fault-detection", "performance-tracking"]
      }),
      claudeFlow.agent_spawn({
        type: "reviewer",
        name: "audit-node",
        capabilities: ["consensus-auditing", "integrity-verification", "compliance-checking"]
      })
    ]);
    
    // Define consensus scenarios to test
    const consensusScenarios = [
      {
        scenario: "architecture-decision",
        proposal: {
          id: "arch-001",
          title: "Microservices vs Monolithic Architecture",
          options: ["microservices", "monolithic", "hybrid"],
          criteria: ["scalability", "maintainability", "complexity", "cost"],
          proposedBy: "proposer-node-1"
        }
      },
      {
        scenario: "technology-selection",
        proposal: {
          id: "tech-002", 
          title: "Database Technology Selection",
          options: ["postgresql", "mongodb", "cassandra", "mysql"],
          criteria: ["performance", "scalability", "consistency", "ecosystem"],
          proposedBy: "proposer-node-2"
        }
      },
      {
        scenario: "deployment-strategy",
        proposal: {
          id: "deploy-003",
          title: "Deployment Strategy Decision", 
          options: ["blue-green", "canary", "rolling", "recreate"],
          criteria: ["risk", "downtime", "complexity", "rollback-ease"],
          proposedBy: "proposer-node-1"
        }
      }
    ];
    
    // Execute Byzantine consensus for each scenario
    const consensusResults = [];
    
    for (const scenario of consensusScenarios) {
      console.log(`🗳️ Starting Byzantine consensus for: ${scenario.proposal.title}`);
      
      // Phase 1: Proposal Distribution
      await distributeProposal(scenario.proposal, consensusNodes);
      
      // Phase 2: Pre-vote (Byzantine prepare phase)
      const preVoteResults = await executePreVotePhase(scenario.proposal, consensusNodes);
      
      // Phase 3: Main vote (Byzantine commit phase)  
      const mainVoteResults = await executeMainVotePhase(scenario.proposal, consensusNodes, preVoteResults);
      
      // Phase 4: Consensus verification and finalization
      const consensusResult = await finalizeByzantineConsensus(
        scenario.proposal,
        mainVoteResults,
        consensusNodes
      );
      
      consensusResults.push({
        scenario: scenario.scenario,
        proposal: scenario.proposal,
        result: consensusResult,
        byzantineFaultTolerant: true
      });
      
      console.log(`✅ Byzantine consensus completed for: ${scenario.proposal.title}`);
      console.log(`   Decision: ${consensusResult.decision}`);
      console.log(`   Confidence: ${consensusResult.confidence}%\n`);
    }
    
    return {
      swarmId: swarm.swarmId,
      consensusNodes,
      results: consensusResults,
      byzantineFaultTolerant: true
    };
    
  } catch (error) {
    console.error("❌ Byzantine consensus failed:", error);
    throw error;
  }
}

// Example 2: Multi-Criteria Decision Making with Weighted Voting
async function multiCriteriaWeightedConsensus() {
  console.log("⚖️ Multi-Criteria Weighted Consensus Example");
  
  try {
    const swarm = await claudeFlow.swarm_init({
      topology: "hierarchical", 
      maxAgents: 12,
      strategy: "specialized"
    });
    
    // Create specialized decision-making council
    const decisionCouncil = await Promise.all([
      // Technical expertise (higher weight for technical decisions)
      claudeFlow.agent_spawn({
        type: "architect",
        name: "senior-architect",
        capabilities: ["system-design", "scalability-analysis", "technology-evaluation"]
      }),
      claudeFlow.agent_spawn({
        type: "coder",
        name: "tech-lead",
        capabilities: ["code-quality", "implementation-complexity", "maintainability"]
      }),
      claudeFlow.agent_spawn({
        type: "optimizer",
        name: "performance-specialist",
        capabilities: ["performance-optimization", "resource-efficiency", "bottleneck-analysis"]
      }),
      
      // Business expertise (higher weight for business decisions)
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "business-analyst",
        capabilities: ["requirement-analysis", "stakeholder-management", "roi-analysis"]
      }),
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "market-analyst", 
        capabilities: ["market-research", "competitive-analysis", "trend-identification"]
      }),
      
      // Quality and risk expertise
      claudeFlow.agent_spawn({
        type: "tester",
        name: "quality-assurance-lead",
        capabilities: ["quality-assessment", "testing-strategy", "defect-analysis"]
      }),
      claudeFlow.agent_spawn({
        type: "reviewer",
        name: "risk-assessor",
        capabilities: ["risk-analysis", "mitigation-planning", "compliance-review"]
      }),
      
      // User experience expertise
      claudeFlow.agent_spawn({
        type: "researcher",
        name: "ux-researcher",
        capabilities: ["user-research", "usability-analysis", "accessibility-review"]
      }),
      
      // Operations expertise
      claudeFlow.agent_spawn({
        type: "optimizer", 
        name: "devops-specialist",
        capabilities: ["deployment-strategy", "infrastructure-management", "monitoring-setup"]
      }),
      
      // Coordination and facilitation
      claudeFlow.agent_spawn({
        type: "coordinator",
        name: "decision-facilitator",
        capabilities: ["meeting-facilitation", "consensus-building", "conflict-mediation"]
      })
    ]);
    
    // Define expertise-based voting weights
    const votingWeights = {
      "senior-architect": { technical: 0.25, business: 0.10, quality: 0.15, ux: 0.10, operations: 0.20 },
      "tech-lead": { technical: 0.20, business: 0.05, quality: 0.20, ux: 0.10, operations: 0.15 },
      "performance-specialist": { technical: 0.15, business: 0.05, quality: 0.10, ux: 0.05, operations: 0.25 },
      "business-analyst": { technical: 0.10, business: 0.25, quality: 0.10, ux: 0.15, operations: 0.05 },
      "market-analyst": { technical: 0.05, business: 0.30, quality: 0.05, ux: 0.20, operations: 0.05 },
      "quality-assurance-lead": { technical: 0.15, business: 0.10, quality: 0.30, ux: 0.15, operations: 0.10 },
      "risk-assessor": { technical: 0.10, business: 0.20, quality: 0.25, ux: 0.10, operations: 0.15 },
      "ux-researcher": { technical: 0.05, business: 0.15, quality: 0.15, ux: 0.35, operations: 0.05 },
      "devops-specialist": { technical: 0.20, business: 0.05, quality: 0.15, ux: 0.05, operations: 0.30 },
      "decision-facilitator": { technical: 0.15, business: 0.15, quality: 0.15, ux: 0.15, operations: 0.15 }
    };
    
    // Store voting weights in memory
    await claudeFlow.memory_usage({
      action: "store",
      key: "consensus/voting-weights",
      value: JSON.stringify(votingWeights),
      namespace: "weighted-consensus"
    });
    
    // Define complex decision scenarios
    const decisionScenarios = [
      {
        id: "frontend-framework",
        title: "Frontend Framework Selection",
        type: "technical",
        options: [
          { name: "React", score: { technical: 8, business: 7, quality: 8, ux: 9, operations: 7 } },
          { name: "Vue", score: { technical: 7, business: 8, quality: 9, ux: 8, operations: 8 } },
          { name: "Angular", score: { technical: 9, business: 6, quality: 7, ux: 7, operations: 8 } },
          { name: "Svelte", score: { technical: 6, business: 5, quality: 8, ux: 8, operations: 6 } }
        ],
        criteria: ["performance", "learning-curve", "ecosystem", "long-term-support", "team-expertise"]
      },
      {
        id: "pricing-strategy",
        title: "Product Pricing Strategy",
        type: "business", 
        options: [
          { name: "Freemium", score: { technical: 6, business: 9, quality: 7, ux: 9, operations: 6 } },
          { name: "Subscription", score: { technical: 8, business: 8, quality: 8, ux: 7, operations: 9 } },
          { name: "Pay-per-use", score: { technical: 7, business: 7, quality: 6, ux: 6, operations: 7 } },
          { name: "One-time-purchase", score: { technical: 9, business: 6, quality: 9, ux: 8, operations: 8 } }
        ],
        criteria: ["revenue-potential", "user-acquisition", "retention", "implementation-complexity"]
      }
    ];
    
    // Execute weighted consensus for each scenario
    const weightedResults = [];
    
    for (const scenario of decisionScenarios) {
      console.log(`⚖️ Starting weighted consensus for: ${scenario.title}`);
      
      // Calculate weighted scores for each option
      const weightedScores = await calculateWeightedScores(
        scenario,
        votingWeights,
        decisionCouncil
      );
      
      // Execute voting with expertise-based weights
      const votingResult = await executeWeightedVoting(
        scenario,
        weightedScores,
        decisionCouncil,
        votingWeights
      );
      
      // Generate consensus report
      const consensusReport = await generateConsensusReport(
        scenario,
        votingResult,
        weightedScores
      );
      
      weightedResults.push({
        scenario: scenario.id,
        title: scenario.title,
        type: scenario.type,
        result: votingResult,
        report: consensusReport
      });
      
      console.log(`✅ Weighted consensus completed for: ${scenario.title}`);
      console.log(`   Winner: ${votingResult.winner}`);
      console.log(`   Weighted Score: ${votingResult.winnerScore.toFixed(2)}\n`);
    }
    
    return {
      swarmId: swarm.swarmId,
      council: decisionCouncil,
      votingWeights,
      results: weightedResults
    };
    
  } catch (error) {
    console.error("❌ Multi-criteria weighted consensus failed:", error);
    throw error;
  }
}

// Example 3: Real-time Adaptive Consensus
async function realTimeAdaptiveConsensus() {
  console.log("⚡ Real-time Adaptive Consensus Example");
  
  try {
    const swarm = await claudeFlow.swarm_init({
      topology: "mesh",
      maxAgents: 8,
      strategy: "adaptive"
    });
    
    // Create adaptive consensus agents
    const adaptiveAgents = await Promise.all([
      claudeFlow.agent_spawn({
        type: "coordinator",
        name: "adaptive-coordinator",
        capabilities: ["real-time-coordination", "dynamic-weighting", "consensus-adaptation"]
      }),
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "context-analyzer",
        capabilities: ["context-analysis", "situational-awareness", "priority-assessment"]
      }),
      claudeFlow.agent_spawn({
        type: "monitor",
        name: "consensus-monitor", 
        capabilities: ["real-time-monitoring", "anomaly-detection", "performance-tracking"]
      }),
      claudeFlow.agent_spawn({
        type: "optimizer",
        name: "consensus-optimizer",
        capabilities: ["algorithm-optimization", "efficiency-improvement", "bottleneck-resolution"]
      }),
      
      // Domain experts with adaptive weights
      claudeFlow.agent_spawn({
        type: "coder",
        name: "technical-expert",
        capabilities: ["technical-analysis", "implementation-feasibility", "risk-assessment"]
      }),
      claudeFlow.agent_spawn({
        type: "analyst",
        name: "business-expert", 
        capabilities: ["business-impact", "market-analysis", "stakeholder-input"]
      }),
      claudeFlow.agent_spawn({
        type: "researcher",
        name: "user-expert",
        capabilities: ["user-impact", "experience-analysis", "feedback-integration"]
      }),
      claudeFlow.agent_spawn({
        type: "reviewer",
        name: "quality-expert",
        capabilities: ["quality-impact", "testing-requirements", "maintenance-considerations"]
      })
    ]);
    
    // Define real-time decision stream
    const realTimeDecisions = [
      {
        id: "incident-001",
        title: "Critical Performance Issue Response",
        urgency: "critical",
        timeWindow: 300, // 5 minutes
        context: { systemLoad: 95, errorRate: 15, userImpact: "high" },
        options: ["immediate-rollback", "hotfix-deployment", "traffic-throttling", "service-restart"]
      },
      {
        id: "feature-toggle",
        title: "New Feature Release Decision",
        urgency: "high",
        timeWindow: 900, // 15 minutes
        context: { testCoverage: 85, stakeholderApproval: true, marketTiming: "optimal" },
        options: ["full-release", "gradual-rollout", "beta-release", "delay-release"]
      },
      {
        id: "scaling-decision",
        title: "Auto-scaling Threshold Adjustment",
        urgency: "medium",
        timeWindow: 1800, // 30 minutes
        context: { currentLoad: 70, predictedGrowth: 25, costImpact: "medium" },
        options: ["increase-threshold", "decrease-threshold", "maintain-current", "implement-predictive"]
      }
    ];
    
    // Process real-time decisions with adaptive consensus
    const adaptiveResults = [];
    
    for (const decision of realTimeDecisions) {
      console.log(`⚡ Processing real-time decision: ${decision.title}`);
      console.log(`   Urgency: ${decision.urgency}, Time Window: ${decision.timeWindow}s`);
      
      const startTime = Date.now();
      
      // Analyze context and adapt consensus parameters
      const contextAnalysis = await analyzeDecisionContext(decision, adaptiveAgents);
      
      // Dynamically adjust voting weights based on context
      const adaptedWeights = await adaptVotingWeights(decision, contextAnalysis, adaptiveAgents);
      
      // Execute time-constrained consensus
      const consensusResult = await executeTimeConstrainedConsensus(
        decision,
        adaptedWeights,
        adaptiveAgents,
        decision.timeWindow
      );
      
      const executionTime = Date.now() - startTime;
      
      // Verify consensus meets time constraints
      if (executionTime > decision.timeWindow * 1000) {
        console.warn(`⚠️ Consensus exceeded time window: ${executionTime}ms > ${decision.timeWindow * 1000}ms`);
      }
      
      adaptiveResults.push({
        decision: decision.id,
        title: decision.title,
        result: consensusResult,
        executionTime,
        contextAnalysis,
        adaptedWeights,
        timeConstraintMet: executionTime <= decision.timeWindow * 1000
      });
      
      console.log(`✅ Decision completed: ${consensusResult.selectedOption}`);
      console.log(`   Execution time: ${executionTime}ms\n`);
    }
    
    // Generate adaptive consensus performance report
    const performanceReport = await generateAdaptivePerformanceReport(adaptiveResults);
    
    return {
      swarmId: swarm.swarmId,
      agents: adaptiveAgents,
      results: adaptiveResults,
      performanceReport
    };
    
  } catch (error) {
    console.error("❌ Real-time adaptive consensus failed:", error);
    throw error;
  }
}

// Helper Functions for Consensus Mechanisms

async function distributeProposal(proposal, nodes) {
  console.log(`📤 Distributing proposal: ${proposal.id}`);
  
  // Store proposal in shared memory for all nodes
  await claudeFlow.memory_usage({
    action: "store", 
    key: `consensus/proposals/${proposal.id}`,
    value: JSON.stringify(proposal),
    namespace: "byzantine-consensus",
    ttl: 3600000
  });
  
  // Notify all nodes of new proposal
  const notificationPromises = nodes.map(node =>
    claudeFlow.hooks.notify({
      message: `New proposal available: ${proposal.id} - ${proposal.title}`
    })
  );
  
  await Promise.all(notificationPromises);
}

async function executePreVotePhase(proposal, nodes) {
  console.log(`🗳️ Executing pre-vote phase for: ${proposal.id}`);
  
  const validatorNodes = nodes.filter(node => node.name.includes('validator'));
  
  const preVotePromises = validatorNodes.map(async (node) => {
    const preVote = await claudeFlow.task_orchestrate({
      task: `Pre-vote on proposal ${proposal.id}: ${proposal.title}`,
      strategy: "adaptive",
      priority: "high"
    });
    
    return {
      nodeId: node.agentId,
      nodeName: node.name,
      vote: Math.random() > 0.2 ? "prepare" : "reject", // 80% prepare rate
      timestamp: Date.now()
    };
  });
  
  const preVoteResults = await Promise.all(preVotePromises);
  
  // Store pre-vote results
  await claudeFlow.memory_usage({
    action: "store",
    key: `consensus/prevotes/${proposal.id}`,
    value: JSON.stringify(preVoteResults),
    namespace: "byzantine-consensus"
  });
  
  return preVoteResults;
}

async function executeMainVotePhase(proposal, nodes, preVoteResults) {
  console.log(`📊 Executing main vote phase for: ${proposal.id}`);
  
  const prepareCount = preVoteResults.filter(vote => vote.vote === "prepare").length;
  const requiredMajority = Math.ceil(preVoteResults.length * 2/3); // Byzantine majority
  
  if (prepareCount < requiredMajority) {
    throw new Error(`Insufficient prepare votes: ${prepareCount}/${requiredMajority}`);
  }
  
  const validatorNodes = nodes.filter(node => node.name.includes('validator'));
  
  const mainVotePromises = validatorNodes.map(async (node) => {
    const mainVote = await claudeFlow.task_orchestrate({
      task: `Main vote on proposal ${proposal.id} options: ${proposal.options.join(', ')}`,
      strategy: "adaptive", 
      priority: "high"
    });
    
    // Simulate weighted voting based on criteria
    const selectedOption = proposal.options[Math.floor(Math.random() * proposal.options.length)];
    
    return {
      nodeId: node.agentId,
      nodeName: node.name,
      selectedOption,
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      timestamp: Date.now()
    };
  });
  
  const mainVoteResults = await Promise.all(mainVotePromises);
  
  // Store main vote results
  await claudeFlow.memory_usage({
    action: "store",
    key: `consensus/mainvotes/${proposal.id}`,
    value: JSON.stringify(mainVoteResults),
    namespace: "byzantine-consensus"
  });
  
  return mainVoteResults;
}

async function finalizeByzantineConsensus(proposal, voteResults, nodes) {
  console.log(`✅ Finalizing Byzantine consensus for: ${proposal.id}`);
  
  // Count votes for each option
  const voteCounts = {};
  let totalConfidence = 0;
  
  voteResults.forEach(vote => {
    if (!voteCounts[vote.selectedOption]) {
      voteCounts[vote.selectedOption] = { count: 0, totalConfidence: 0 };
    }
    voteCounts[vote.selectedOption].count++;
    voteCounts[vote.selectedOption].totalConfidence += vote.confidence;
    totalConfidence += vote.confidence;
  });
  
  // Find winning option
  const winner = Object.entries(voteCounts).reduce((a, b) => 
    voteCounts[a[0]].count > voteCounts[b[0]].count ? a : b
  )[0];
  
  const winnerCount = voteCounts[winner].count;
  const requiredMajority = Math.ceil(voteResults.length * 2/3);
  const consensusReached = winnerCount >= requiredMajority;
  
  const result = {
    proposal: proposal.id,
    decision: consensusReached ? winner : "no-consensus",
    voteCounts,
    totalVotes: voteResults.length,
    requiredMajority,
    consensusReached,
    confidence: consensusReached ? Math.round((voteCounts[winner].totalConfidence / winnerCount) * 100) : 0,
    byzantineFaultTolerant: true,
    finalizedAt: new Date().toISOString()
  };
  
  // Store final result
  await claudeFlow.memory_usage({
    action: "store",
    key: `consensus/results/${proposal.id}`,
    value: JSON.stringify(result),
    namespace: "byzantine-consensus"
  });
  
  return result;
}

async function calculateWeightedScores(scenario, votingWeights, council) {
  const weightedScores = {};
  
  scenario.options.forEach(option => {
    weightedScores[option.name] = 0;
    
    // Calculate weighted score based on agent expertise
    Object.entries(votingWeights).forEach(([agentName, weights]) => {
      const weight = weights[scenario.type] || 0.1; // Default weight if not specified
      const baseScore = option.score[scenario.type] || 5; // Default score
      weightedScores[option.name] += baseScore * weight;
    });
  });
  
  return weightedScores;
}

async function executeWeightedVoting(scenario, weightedScores, council, votingWeights) {
  console.log(`🗳️ Executing weighted voting for: ${scenario.title}`);
  
  // Simulate voting by each council member
  const votes = [];
  
  for (const agent of council) {
    const agentWeights = votingWeights[agent.name] || { [scenario.type]: 0.1 };
    const agentWeight = agentWeights[scenario.type] || 0.1;
    
    // Agent selects option based on weighted scores with some randomness
    const optionScores = Object.entries(weightedScores).map(([option, score]) => ({
      option,
      adjustedScore: score * (0.8 + Math.random() * 0.4) // +/- 20% randomness
    }));
    
    const selectedOption = optionScores.reduce((a, b) => 
      a.adjustedScore > b.adjustedScore ? a : b
    ).option;
    
    votes.push({
      agent: agent.name,
      selectedOption,
      weight: agentWeight,
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    });
  }
  
  // Calculate final weighted results
  const finalScores = {};
  scenario.options.forEach(option => {
    finalScores[option.name] = votes
      .filter(vote => vote.selectedOption === option.name)
      .reduce((sum, vote) => sum + vote.weight * vote.confidence, 0);
  });
  
  const winner = Object.entries(finalScores).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0];
  
  return {
    winner,
    winnerScore: finalScores[winner],
    allScores: finalScores,
    votes,
    totalParticipants: council.length
  };
}

async function generateConsensusReport(scenario, votingResult, weightedScores) {
  const report = {
    scenario: scenario.id,
    title: scenario.title,
    recommendation: votingResult.winner,
    confidence: Math.round((votingResult.winnerScore / votingResult.totalParticipants) * 100),
    alternativeOptions: Object.entries(votingResult.allScores)
      .filter(([option, score]) => option !== votingResult.winner)
      .sort((a, b) => b[1] - a[1])
      .map(([option, score]) => ({
        option,
        score: score.toFixed(2),
        gap: (votingResult.winnerScore - score).toFixed(2)
      })),
    participantVotes: votingResult.votes,
    generatedAt: new Date().toISOString()
  };
  
  // Store report
  await claudeFlow.memory_usage({
    action: "store",
    key: `consensus/reports/${scenario.id}`,
    value: JSON.stringify(report),
    namespace: "weighted-consensus"
  });
  
  return report;
}

async function analyzeDecisionContext(decision, agents) {
  console.log(`🔍 Analyzing context for: ${decision.title}`);
  
  const contextAnalysis = {
    urgency: decision.urgency,
    timeConstraints: decision.timeWindow,
    systemContext: decision.context,
    riskLevel: calculateRiskLevel(decision),
    complexityScore: calculateComplexityScore(decision),
    stakeholderImpact: assessStakeholderImpact(decision)
  };
  
  // Store context analysis
  await claudeFlow.memory_usage({
    action: "store",
    key: `adaptive/context/${decision.id}`,
    value: JSON.stringify(contextAnalysis),
    namespace: "adaptive-consensus"
  });
  
  return contextAnalysis;
}

async function adaptVotingWeights(decision, contextAnalysis, agents) {
  const baseWeights = {
    "technical-expert": 0.25,
    "business-expert": 0.25,
    "user-expert": 0.25,
    "quality-expert": 0.25
  };
  
  // Adapt weights based on decision context
  const adaptedWeights = { ...baseWeights };
  
  if (decision.urgency === "critical") {
    // Increase technical expert weight for critical issues
    adaptedWeights["technical-expert"] += 0.15;
    adaptedWeights["business-expert"] -= 0.05;
    adaptedWeights["user-expert"] -= 0.05;
    adaptedWeights["quality-expert"] -= 0.05;
  }
  
  if (contextAnalysis.riskLevel === "high") {
    // Increase quality expert weight for high-risk decisions
    adaptedWeights["quality-expert"] += 0.1;
    adaptedWeights["technical-expert"] -= 0.03;
    adaptedWeights["business-expert"] -= 0.03;
    adaptedWeights["user-expert"] -= 0.04;
  }
  
  return adaptedWeights;
}

async function executeTimeConstrainedConsensus(decision, weights, agents, timeWindow) {
  const startTime = Date.now();
  const maxTime = timeWindow * 1000; // Convert to milliseconds
  
  console.log(`⏱️ Starting time-constrained consensus (${timeWindow}s window)`);
  
  // Execute rapid consensus with timeout
  const consensusPromise = Promise.race([
    // Main consensus process
    (async () => {
      const votes = await Promise.all(
        Object.entries(weights).map(async ([agentName, weight]) => {
          const vote = await claudeFlow.task_orchestrate({
            task: `Rapid decision on ${decision.title}: options ${decision.options.join(', ')}`,
            strategy: "adaptive",
            priority: decision.urgency
          });
          
          const selectedOption = decision.options[Math.floor(Math.random() * decision.options.length)];
          
          return {
            agent: agentName,
            selectedOption,
            weight,
            confidence: Math.random() * 0.3 + 0.7,
            responseTime: Date.now() - startTime
          };
        })
      );
      
      // Calculate weighted results
      const optionScores = {};
      decision.options.forEach(option => {
        optionScores[option] = votes
          .filter(vote => vote.selectedOption === option)
          .reduce((sum, vote) => sum + vote.weight * vote.confidence, 0);
      });
      
      const winner = Object.entries(optionScores).reduce((a, b) => 
        a[1] > b[1] ? a : b
      )[0];
      
      return {
        selectedOption: winner,
        score: optionScores[winner],
        allScores: optionScores,
        votes,
        completedInTime: true
      };
    })(),
    
    // Timeout fallback
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          selectedOption: decision.options[0], // Default to first option
          score: 0,
          allScores: {},
          votes: [],
          completedInTime: false,
          timeoutOccurred: true
        });
      }, maxTime);
    })
  ]);
  
  const result = await consensusPromise;
  result.executionTime = Date.now() - startTime;
  
  return result;
}

function calculateRiskLevel(decision) {
  const riskFactors = [
    decision.urgency === "critical" ? 3 : decision.urgency === "high" ? 2 : 1,
    decision.context.userImpact === "high" ? 3 : decision.context.userImpact === "medium" ? 2 : 1,
    decision.timeWindow < 600 ? 3 : decision.timeWindow < 1800 ? 2 : 1
  ];
  
  const avgRisk = riskFactors.reduce((a, b) => a + b, 0) / riskFactors.length;
  return avgRisk > 2.5 ? "high" : avgRisk > 1.5 ? "medium" : "low";
}

function calculateComplexityScore(decision) {
  return decision.options.length * (decision.context ? Object.keys(decision.context).length : 1);
}

function assessStakeholderImpact(decision) {
  const impacts = ["users", "developers", "business", "operations"];
  return impacts[Math.floor(Math.random() * impacts.length)];
}

async function generateAdaptivePerformanceReport(results) {
  const report = {
    totalDecisions: results.length,
    averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
    timeConstraintsMet: results.filter(r => r.timeConstraintMet).length,
    successRate: (results.filter(r => r.timeConstraintMet).length / results.length) * 100,
    decisionsByUrgency: {
      critical: results.filter(r => r.decision.includes("incident")).length,
      high: results.filter(r => r.decision.includes("feature")).length,
      medium: results.filter(r => r.decision.includes("scaling")).length
    },
    averageResponseTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
    generatedAt: new Date().toISOString()
  };
  
  return report;
}

// Export functions
module.exports = {
  byzantineFaultTolerantConsensus,
  multiCriteriaWeightedConsensus,
  realTimeAdaptiveConsensus
};

// Usage example
async function runConsensusExamples() {
  console.log("🚀 Running Complex Consensus Examples\n");
  
  try {
    const byzantineResult = await byzantineFaultTolerantConsensus();
    console.log("✅ Byzantine fault tolerant consensus completed\n");
    
    const weightedResult = await multiCriteriaWeightedConsensus();
    console.log("✅ Multi-criteria weighted consensus completed\n");
    
    const adaptiveResult = await realTimeAdaptiveConsensus();
    console.log("✅ Real-time adaptive consensus completed\n");
    
    return {
      byzantine: byzantineResult,
      weighted: weightedResult,
      adaptive: adaptiveResult
    };
    
  } catch (error) {
    console.error("❌ Consensus examples failed:", error);
  }
}

if (require.main === module) {
  runConsensusExamples();
}