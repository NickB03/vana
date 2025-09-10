/**
 * Progress Calculator
 * Computes overall research completion percentage with intelligent weighting and estimation
 */

import { AgentType } from '../types/chat';
import { AgentProgress } from './agentMapper';

// ===== INTERFACES =====

export interface ProgressContext {
  agents: AgentProgress[];
  currentPhase: ResearchPhase;
  startTime?: Date;
  estimatedTotalDuration?: number;
  queryComplexity?: QueryComplexity;
  researchType?: ResearchType;
}

export interface ProgressCalculation {
  overallProgress: number;
  phaseProgress: number;
  estimatedTimeRemaining: number;
  completionProbability: number;
  bottlenecks: ProgressBottleneck[];
  milestones: ProgressMilestone[];
  confidence: number;
  metadata: {
    calculationMethod: string;
    lastUpdated: Date;
    samplingRate: number;
    accuracyScore: number;
  };
}

export interface ProgressBottleneck {
  agentId: string;
  agentType: AgentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedResolutionTime: number;
  suggestedAction: string;
}

export interface ProgressMilestone {
  id: string;
  title: string;
  description: string;
  targetProgress: number;
  actualProgress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  estimatedCompletionTime: Date;
  dependencies: string[];
}

export type ResearchPhase = 
  | 'initialization'
  | 'planning' 
  | 'research'
  | 'evaluation'
  | 'synthesis'
  | 'finalization'
  | 'completed';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'expert';
export type ResearchType = 'factual' | 'analytical' | 'comparative' | 'comprehensive';

// ===== PHASE CONFIGURATION =====

interface PhaseConfig {
  name: string;
  description: string;
  expectedDuration: number; // Base duration in seconds
  requiredAgents: AgentType[];
  optionalAgents: AgentType[];
  successCriteria: string[];
  progressWeight: number; // Contribution to overall progress
  complexityMultiplier: Record<QueryComplexity, number>;
}

const PHASE_CONFIGS: Record<ResearchPhase, PhaseConfig> = {
  initialization: {
    name: 'Initialization',
    description: 'Setting up research workflow and initial coordination',
    expectedDuration: 30,
    requiredAgents: ['team_leader'],
    optionalAgents: ['escalation_checker'],
    successCriteria: ['Workflow established', 'Agents coordinated'],
    progressWeight: 0.05,
    complexityMultiplier: { simple: 0.8, moderate: 1.0, complex: 1.2, expert: 1.5 }
  },
  planning: {
    name: 'Planning',
    description: 'Developing research strategy and structure',
    expectedDuration: 90,
    requiredAgents: ['plan_generator', 'section_planner'],
    optionalAgents: ['team_leader'],
    successCriteria: ['Research plan created', 'Sections outlined', 'Strategy approved'],
    progressWeight: 0.15,
    complexityMultiplier: { simple: 0.7, moderate: 1.0, complex: 1.4, expert: 2.0 }
  },
  research: {
    name: 'Research',
    description: 'Conducting detailed research and source gathering',
    expectedDuration: 180,
    requiredAgents: ['section_researcher', 'enhanced_search'],
    optionalAgents: ['escalation_checker'],
    successCriteria: ['Sources gathered', 'Content researched', 'Facts verified'],
    progressWeight: 0.45,
    complexityMultiplier: { simple: 0.6, moderate: 1.0, complex: 1.6, expert: 2.5 }
  },
  evaluation: {
    name: 'Evaluation',
    description: 'Evaluating research quality and validating findings',
    expectedDuration: 60,
    requiredAgents: ['research_evaluator'],
    optionalAgents: ['escalation_checker', 'team_leader'],
    successCriteria: ['Quality assessed', 'Facts validated', 'Sources verified'],
    progressWeight: 0.15,
    complexityMultiplier: { simple: 0.8, moderate: 1.0, complex: 1.3, expert: 1.8 }
  },
  synthesis: {
    name: 'Synthesis',
    description: 'Synthesizing research into final comprehensive report',
    expectedDuration: 120,
    requiredAgents: ['report_writer'],
    optionalAgents: ['team_leader', 'research_evaluator'],
    successCriteria: ['Content synthesized', 'Report structured', 'Final review completed'],
    progressWeight: 0.15,
    complexityMultiplier: { simple: 0.7, moderate: 1.0, complex: 1.4, expert: 2.0 }
  },
  finalization: {
    name: 'Finalization',
    description: 'Final quality checks and result delivery',
    expectedDuration: 30,
    requiredAgents: ['team_leader'],
    optionalAgents: ['research_evaluator'],
    successCriteria: ['Final review completed', 'Quality confirmed', 'Result delivered'],
    progressWeight: 0.05,
    complexityMultiplier: { simple: 0.8, moderate: 1.0, complex: 1.2, expert: 1.5 }
  },
  completed: {
    name: 'Completed',
    description: 'Research process completed successfully',
    expectedDuration: 0,
    requiredAgents: [],
    optionalAgents: [],
    successCriteria: ['Process completed'],
    progressWeight: 0.0,
    complexityMultiplier: { simple: 1.0, moderate: 1.0, complex: 1.0, expert: 1.0 }
  }
};

// ===== AGENT WEIGHTS AND DEPENDENCIES =====

interface AgentWeightConfig {
  baseWeight: number;
  phaseWeights: Partial<Record<ResearchPhase, number>>;
  dependencies: AgentType[];
  parallelismFactor: number; // How much this agent can run in parallel
}

const AGENT_WEIGHTS: Record<AgentType, AgentWeightConfig> = {
  team_leader: {
    baseWeight: 0.15,
    phaseWeights: { initialization: 0.4, planning: 0.1, evaluation: 0.1, finalization: 0.4 },
    dependencies: [],
    parallelismFactor: 1.0
  },
  plan_generator: {
    baseWeight: 0.12,
    phaseWeights: { planning: 0.5, research: 0.1 },
    dependencies: ['team_leader'],
    parallelismFactor: 0.8
  },
  section_planner: {
    baseWeight: 0.08,
    phaseWeights: { planning: 0.4, research: 0.1 },
    dependencies: ['plan_generator'],
    parallelismFactor: 0.9
  },
  section_researcher: {
    baseWeight: 0.25,
    phaseWeights: { research: 0.6, evaluation: 0.1 },
    dependencies: ['section_planner'],
    parallelismFactor: 0.7
  },
  enhanced_search: {
    baseWeight: 0.18,
    phaseWeights: { research: 0.5, planning: 0.1 },
    dependencies: ['plan_generator'],
    parallelismFactor: 0.9
  },
  research_evaluator: {
    baseWeight: 0.12,
    phaseWeights: { evaluation: 0.6, synthesis: 0.1 },
    dependencies: ['section_researcher', 'enhanced_search'],
    parallelismFactor: 0.8
  },
  escalation_checker: {
    baseWeight: 0.05,
    phaseWeights: { research: 0.3, evaluation: 0.2, synthesis: 0.1 },
    dependencies: [],
    parallelismFactor: 1.0
  },
  report_writer: {
    baseWeight: 0.15,
    phaseWeights: { synthesis: 0.7, finalization: 0.1 },
    dependencies: ['research_evaluator'],
    parallelismFactor: 0.6
  }
};

// ===== PROGRESS CALCULATION ALGORITHMS =====

export class ProgressCalculator {
  private historicalData: Map<string, number[]> = new Map();
  private phaseTransitionTimes: Map<ResearchPhase, Date> = new Map();
  private debugMode = false;

  constructor(options?: { debugMode?: boolean }) {
    this.debugMode = options?.debugMode ?? false;
  }

  // ===== MAIN CALCULATION METHOD =====

  calculateProgress(context: ProgressContext): ProgressCalculation {
    const startTime = performance.now();

    // Determine current phase if not provided
    const currentPhase = context.currentPhase || this.determineCurrentPhase(context.agents);
    
    // Calculate different progress metrics
    const weightedProgress = this.calculateWeightedProgress(context.agents, currentPhase);
    const phaseProgress = this.calculatePhaseProgress(context.agents, currentPhase);
    const timeBasedProgress = this.calculateTimeBasedProgress(context);
    
    // Combine progress metrics with confidence weighting
    const overallProgress = this.combineProgressMetrics({
      weighted: weightedProgress,
      phase: phaseProgress,
      time: timeBasedProgress
    }, currentPhase);

    // Calculate time estimations
    const estimatedTimeRemaining = this.estimateTimeRemaining(context, overallProgress);
    
    // Calculate completion probability
    const completionProbability = this.calculateCompletionProbability(context, overallProgress);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(context.agents, currentPhase);
    
    // Generate milestones
    const milestones = this.generateMilestones(context, currentPhase);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(context, overallProgress);

    const result: ProgressCalculation = {
      overallProgress: Math.max(0, Math.min(100, overallProgress)),
      phaseProgress,
      estimatedTimeRemaining,
      completionProbability,
      bottlenecks,
      milestones,
      confidence,
      metadata: {
        calculationMethod: 'hybrid_weighted',
        lastUpdated: new Date(),
        samplingRate: 1.0,
        accuracyScore: this.calculateAccuracyScore(context)
      }
    };

    // Store historical data
    this.storeHistoricalData(context.agents, overallProgress);

    if (this.debugMode) {
      const calculationTime = performance.now() - startTime;
      console.log(`Progress calculation completed in ${calculationTime.toFixed(2)}ms:`, result);
    }

    return result;
  }

  // ===== PROGRESS CALCULATION METHODS =====

  private calculateWeightedProgress(agents: AgentProgress[], currentPhase: ResearchPhase): number {
    let totalWeightedProgress = 0;
    let totalWeight = 0;

    for (const agent of agents) {
      const config = AGENT_WEIGHTS[agent.type];
      const phaseWeight = config.phaseWeights[currentPhase] || 0;
      const weight = config.baseWeight * (1 + phaseWeight);
      
      totalWeightedProgress += agent.progress * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
  }

  private calculatePhaseProgress(agents: AgentProgress[], currentPhase: ResearchPhase): number {
    const phaseConfig = PHASE_CONFIGS[currentPhase];
    const requiredAgents = phaseConfig.requiredAgents;
    const optionalAgents = phaseConfig.optionalAgents;
    
    let requiredProgress = 0;
    let optionalProgress = 0;
    let requiredCount = 0;
    let optionalCount = 0;

    for (const agent of agents) {
      if (requiredAgents.includes(agent.type)) {
        requiredProgress += agent.progress;
        requiredCount++;
      } else if (optionalAgents.includes(agent.type)) {
        optionalProgress += agent.progress;
        optionalCount++;
      }
    }

    const avgRequiredProgress = requiredCount > 0 ? requiredProgress / requiredCount : 0;
    const avgOptionalProgress = optionalCount > 0 ? optionalProgress / optionalCount : 0;

    // Required agents contribute 80%, optional agents 20%
    return avgRequiredProgress * 0.8 + avgOptionalProgress * 0.2;
  }

  private calculateTimeBasedProgress(context: ProgressContext): number {
    if (!context.startTime || !context.estimatedTotalDuration) {
      return 0;
    }

    const elapsedTime = (Date.now() - context.startTime.getTime()) / 1000;
    const baseProgress = (elapsedTime / context.estimatedTotalDuration) * 100;

    // Apply complexity adjustments
    const complexity = context.queryComplexity || 'moderate';
    const complexityFactors = { simple: 0.8, moderate: 1.0, complex: 1.3, expert: 1.8 };
    const adjustedProgress = baseProgress / complexityFactors[complexity];

    return Math.min(95, adjustedProgress); // Cap at 95% to avoid premature completion
  }

  private combineProgressMetrics(
    metrics: { weighted: number; phase: number; time: number },
    currentPhase: ResearchPhase
  ): number {
    // Weight different metrics based on phase and reliability
    const weights = {
      weighted: 0.5,    // Agent-based progress (most reliable)
      phase: 0.3,       // Phase-specific progress
      time: 0.2         // Time-based estimation (least reliable)
    };

    // Adjust weights based on phase
    if (currentPhase === 'initialization' || currentPhase === 'planning') {
      weights.time = 0.4; // Time more important in early phases
      weights.weighted = 0.4;
      weights.phase = 0.2;
    } else if (currentPhase === 'research') {
      weights.weighted = 0.6; // Agent progress most important
      weights.phase = 0.3;
      weights.time = 0.1;
    }

    return (
      metrics.weighted * weights.weighted +
      metrics.phase * weights.phase +
      metrics.time * weights.time
    );
  }

  private estimateTimeRemaining(context: ProgressContext, currentProgress: number): number {
    const remainingProgress = Math.max(0, 100 - currentProgress);
    
    if (remainingProgress === 0) return 0;
    if (!context.startTime) return this.getDefaultTimeEstimate(context);

    const elapsedTime = (Date.now() - context.startTime.getTime()) / 1000;
    
    // Calculate rate of progress
    const progressRate = currentProgress > 0 ? currentProgress / elapsedTime : 0;
    
    if (progressRate <= 0) return this.getDefaultTimeEstimate(context);

    // Estimate remaining time with deceleration factor
    const decelerationFactor = 1.2; // Progress typically slows down
    const estimatedRemaining = (remainingProgress / progressRate) * decelerationFactor;

    // Apply bounds
    const minEstimate = 30; // Minimum 30 seconds
    const maxEstimate = 600; // Maximum 10 minutes
    
    return Math.max(minEstimate, Math.min(maxEstimate, estimatedRemaining));
  }

  private getDefaultTimeEstimate(context: ProgressContext): number {
    const complexity = context.queryComplexity || 'moderate';
    const baseEstimates = { simple: 120, moderate: 240, complex: 360, expert: 480 };
    return baseEstimates[complexity];
  }

  private calculateCompletionProbability(context: ProgressContext, currentProgress: number): number {
    let probability = 0.5; // Base 50% probability

    // Progress factor (higher progress = higher probability)
    probability += (currentProgress / 100) * 0.3;

    // Agent health factor
    const healthyAgents = context.agents.filter(a => a.status !== 'failed').length;
    const totalAgents = context.agents.length;
    if (totalAgents > 0) {
      probability += (healthyAgents / totalAgents) * 0.2;
    }

    // Time factor (consider if we're on track)
    if (context.startTime && context.estimatedTotalDuration) {
      const elapsedTime = (Date.now() - context.startTime.getTime()) / 1000;
      const timeProgress = elapsedTime / context.estimatedTotalDuration;
      const progressRatio = (currentProgress / 100) / Math.max(0.01, timeProgress);
      
      if (progressRatio > 0.8) probability += 0.1; // On track
      else if (progressRatio < 0.5) probability -= 0.1; // Behind schedule
    }

    return Math.max(0, Math.min(1, probability));
  }

  private identifyBottlenecks(agents: AgentProgress[], currentPhase: ResearchPhase): ProgressBottleneck[] {
    const bottlenecks: ProgressBottleneck[] = [];
    
    // Check for stalled agents
    for (const agent of agents) {
      if (agent.status === 'active' && agent.progress < 20) {
        const config = AGENT_WEIGHTS[agent.type];
        const severity = config.baseWeight > 0.2 ? 'high' : config.baseWeight > 0.1 ? 'medium' : 'low';
        
        bottlenecks.push({
          agentId: agent.id,
          agentType: agent.type,
          severity,
          description: `${agent.type} showing slow progress (${Math.round(agent.progress)}%)`,
          expectedResolutionTime: 60, // 1 minute
          suggestedAction: 'Monitor agent performance and consider escalation if no improvement'
        });
      }
    }

    // Check for failed agents
    const failedAgents = agents.filter(a => a.status === 'failed');
    for (const agent of failedAgents) {
      bottlenecks.push({
        agentId: agent.id,
        agentType: agent.type,
        severity: 'critical',
        description: `${agent.type} has failed and requires attention`,
        expectedResolutionTime: 120, // 2 minutes
        suggestedAction: 'Restart agent or assign task to alternative agent'
      });
    }

    // Check for dependency bottlenecks
    this.checkDependencyBottlenecks(agents, bottlenecks);

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private checkDependencyBottlenecks(agents: AgentProgress[], bottlenecks: ProgressBottleneck[]): void {
    const agentMap = new Map(agents.map(a => [a.type, a]));

    for (const agent of agents) {
      if (agent.status === 'waiting') {
        const dependencies = AGENT_WEIGHTS[agent.type].dependencies;
        const blockedBy = dependencies.filter(dep => {
          const depAgent = agentMap.get(dep);
          return !depAgent || depAgent.status !== 'completed';
        });

        if (blockedBy.length > 0) {
          bottlenecks.push({
            agentId: agent.id,
            agentType: agent.type,
            severity: 'medium',
            description: `${agent.type} waiting for dependencies: ${blockedBy.join(', ')}`,
            expectedResolutionTime: 90,
            suggestedAction: 'Ensure dependent agents complete their tasks'
          });
        }
      }
    }
  }

  private generateMilestones(context: ProgressContext, currentPhase: ResearchPhase): ProgressMilestone[] {
    const milestones: ProgressMilestone[] = [];
    const phases: ResearchPhase[] = ['planning', 'research', 'evaluation', 'synthesis', 'finalization'];
    
    let cumulativeProgress = 0;
    
    for (const phase of phases) {
      const phaseConfig = PHASE_CONFIGS[phase];
      const targetProgress = cumulativeProgress + (phaseConfig.progressWeight * 100);
      
      const milestone: ProgressMilestone = {
        id: `milestone-${phase}`,
        title: `${phaseConfig.name} Complete`,
        description: phaseConfig.description,
        targetProgress,
        actualProgress: phase === currentPhase ? this.calculatePhaseProgress(context.agents, phase) : 
                       this.isPhaseCompleted(phase, currentPhase) ? 100 : 0,
        status: this.getMilestoneStatus(phase, currentPhase, context),
        estimatedCompletionTime: this.estimateMilestoneCompletion(phase, context),
        dependencies: this.getMilestoneDependencies(phase)
      };
      
      milestones.push(milestone);
      cumulativeProgress = targetProgress;
    }

    return milestones;
  }

  private getMilestoneStatus(
    milestonePhase: ResearchPhase, 
    currentPhase: ResearchPhase, 
    context: ProgressContext
  ): 'pending' | 'in_progress' | 'completed' | 'delayed' {
    const phaseOrder = ['initialization', 'planning', 'research', 'evaluation', 'synthesis', 'finalization', 'completed'];
    const milestoneIndex = phaseOrder.indexOf(milestonePhase);
    const currentIndex = phaseOrder.indexOf(currentPhase);

    if (milestoneIndex < currentIndex) return 'completed';
    if (milestoneIndex === currentIndex) return 'in_progress';
    
    // Check if delayed based on time estimates
    if (context.startTime && context.estimatedTotalDuration) {
      const elapsedTime = (Date.now() - context.startTime.getTime()) / 1000;
      const expectedTimeForPhase = this.getExpectedTimeForPhase(milestonePhase, context);
      
      if (elapsedTime > expectedTimeForPhase * 1.5) return 'delayed';
    }

    return 'pending';
  }

  private estimateMilestoneCompletion(phase: ResearchPhase, context: ProgressContext): Date {
    const phaseConfig = PHASE_CONFIGS[phase];
    const complexity = context.queryComplexity || 'moderate';
    const multiplier = phaseConfig.complexityMultiplier[complexity];
    const estimatedDuration = phaseConfig.expectedDuration * multiplier;
    
    // Add current time plus estimated duration
    return new Date(Date.now() + estimatedDuration * 1000);
  }

  private getMilestoneDependencies(phase: ResearchPhase): string[] {
    const dependencies: Record<ResearchPhase, string[]> = {
      initialization: [],
      planning: ['milestone-initialization'],
      research: ['milestone-planning'],
      evaluation: ['milestone-research'],
      synthesis: ['milestone-evaluation'],
      finalization: ['milestone-synthesis'],
      completed: ['milestone-finalization']
    };
    
    return dependencies[phase] || [];
  }

  private calculateConfidence(context: ProgressContext, overallProgress: number): number {
    let confidence = 0.7; // Base confidence

    // Agent confidence factor
    const agentConfidences = context.agents
      .filter(a => a.confidence !== undefined)
      .map(a => a.confidence!);
    
    if (agentConfidences.length > 0) {
      const avgAgentConfidence = agentConfidences.reduce((sum, c) => sum + c, 0) / agentConfidences.length;
      confidence = confidence * 0.6 + avgAgentConfidence * 0.4;
    }

    // Progress consistency factor
    const progressConsistency = this.calculateProgressConsistency(context.agents);
    confidence = confidence * 0.8 + progressConsistency * 0.2;

    // Failure rate factor
    const failedAgents = context.agents.filter(a => a.status === 'failed').length;
    const failureRate = failedAgents / context.agents.length;
    confidence *= (1 - failureRate * 0.5);

    return Math.max(0, Math.min(1, confidence));
  }

  // ===== UTILITY METHODS =====

  private determineCurrentPhase(agents: AgentProgress[]): ResearchPhase {
    const completedAgents = agents.filter(a => a.status === 'completed');
    const activeAgents = agents.filter(a => a.status === 'active');

    if (completedAgents.length === agents.length) return 'completed';
    
    // Check which agents are active to determine phase
    const activeTypes = new Set(activeAgents.map(a => a.type));
    
    if (activeTypes.has('report_writer')) return 'synthesis';
    if (activeTypes.has('research_evaluator')) return 'evaluation';
    if (activeTypes.has('section_researcher') || activeTypes.has('enhanced_search')) return 'research';
    if (activeTypes.has('plan_generator') || activeTypes.has('section_planner')) return 'planning';
    
    return 'initialization';
  }

  private isPhaseCompleted(phase: ResearchPhase, currentPhase: ResearchPhase): boolean {
    const phaseOrder = ['initialization', 'planning', 'research', 'evaluation', 'synthesis', 'finalization', 'completed'];
    return phaseOrder.indexOf(phase) < phaseOrder.indexOf(currentPhase);
  }

  private getExpectedTimeForPhase(phase: ResearchPhase, context: ProgressContext): number {
    const phaseConfig = PHASE_CONFIGS[phase];
    const complexity = context.queryComplexity || 'moderate';
    const multiplier = phaseConfig.complexityMultiplier[complexity];
    return phaseConfig.expectedDuration * multiplier;
  }

  private calculateProgressConsistency(agents: AgentProgress[]): number {
    if (agents.length === 0) return 0;
    
    const progressValues = agents.map(a => a.progress);
    const mean = progressValues.reduce((sum, p) => sum + p, 0) / progressValues.length;
    const variance = progressValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / progressValues.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (lower deviation = higher consistency)
    return Math.max(0, 1 - (standardDeviation / 100));
  }

  private calculateAccuracyScore(context: ProgressContext): number {
    // Simple accuracy heuristic based on data quality
    let score = 0.8; // Base accuracy

    // More agents = potentially more accurate
    if (context.agents.length >= 6) score += 0.1;
    
    // Agent confidence affects accuracy
    const avgConfidence = context.agents
      .filter(a => a.confidence !== undefined)
      .reduce((sum, a, _, arr) => sum + a.confidence! / arr.length, 0);
    
    if (avgConfidence > 0.8) score += 0.1;
    else if (avgConfidence < 0.5) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private storeHistoricalData(agents: AgentProgress[], overallProgress: number): void {
    const key = `progress-${Date.now()}`;
    const data = this.historicalData.get(key) || [];
    data.push(overallProgress);
    
    // Keep only last 100 data points
    if (data.length > 100) {
      data.shift();
    }
    
    this.historicalData.set(key, data);
  }

  // ===== PUBLIC API METHODS =====

  getHistoricalProgress(): number[] {
    const allData: number[] = [];
    for (const data of this.historicalData.values()) {
      allData.push(...data);
    }
    return allData.slice(-50); // Last 50 data points
  }

  reset(): void {
    this.historicalData.clear();
    this.phaseTransitionTimes.clear();
  }
}

// ===== SINGLETON INSTANCE =====

export const progressCalculator = new ProgressCalculator({
  debugMode: process.env.NODE_ENV === 'development'
});

export default ProgressCalculator;