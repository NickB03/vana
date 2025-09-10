/**
 * Google ADK Agent Status Mapper
 * Converts Google ADK agent events and states into frontend AgentProgress format
 */

import { AgentType } from '../types/chat';

// ===== INTERFACES =====

export interface AdkAgentRawData {
  id: string;
  type: string;
  status: string;
  lastUpdate?: Date;
  data?: {
    currentTask?: string;
    progress?: number;
    confidence?: number;
    startTime?: string;
    endTime?: string;
    estimatedDuration?: number;
    processingTimeMs?: number;
    tokensUsed?: number;
    sources?: any[];
    errors?: string[];
    phase?: string;
  };
}

export interface AgentProgress {
  id: string;
  type: AgentType;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  startTime?: Date;
  endTime?: Date;
  confidence?: number;
  estimatedDuration?: number;
}

export interface AgentMetrics {
  totalProcessingTime: number;
  averageConfidence: number;
  successRate: number;
  tasksCompleted: number;
  sourcesFound: number;
  tokensUsed: number;
}

// ===== AGENT CONFIGURATION =====

interface AgentConfig {
  displayName: string;
  description: string;
  icon: string;
  averageDuration: number; // seconds
  priority: number; // 1-10, higher = more important
  dependencies: AgentType[];
  progressWeight: number; // contribution to overall progress
  phases: string[];
}

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  team_leader: {
    displayName: 'Team Leader',
    description: 'Coordinates research process and manages agent workflow',
    icon: 'users',
    averageDuration: 30,
    priority: 10,
    dependencies: [],
    progressWeight: 0.15,
    phases: ['initialization', 'coordination', 'quality_review', 'finalization']
  },
  plan_generator: {
    displayName: 'Plan Generator',
    description: 'Creates comprehensive research strategy and approach',
    icon: 'file-search',
    averageDuration: 45,
    priority: 9,
    dependencies: ['team_leader'],
    progressWeight: 0.12,
    phases: ['analysis', 'planning', 'strategy_development']
  },
  section_planner: {
    displayName: 'Section Planner',
    description: 'Organizes research into logical sections and structure',
    icon: 'layout',
    averageDuration: 35,
    priority: 8,
    dependencies: ['plan_generator'],
    progressWeight: 0.10,
    phases: ['structure_analysis', 'section_organization', 'outline_creation']
  },
  section_researcher: {
    displayName: 'Section Researcher',
    description: 'Conducts detailed research for specific content sections',
    icon: 'brain',
    averageDuration: 120,
    priority: 7,
    dependencies: ['section_planner'],
    progressWeight: 0.20,
    phases: ['research', 'fact_gathering', 'content_development']
  },
  enhanced_search: {
    displayName: 'Enhanced Search',
    description: 'Performs advanced web searches and source discovery',
    icon: 'search',
    averageDuration: 60,
    priority: 6,
    dependencies: ['plan_generator'],
    progressWeight: 0.15,
    phases: ['query_optimization', 'web_search', 'source_evaluation']
  },
  research_evaluator: {
    displayName: 'Research Evaluator',
    description: 'Evaluates research quality and validates findings',
    icon: 'check-circle',
    averageDuration: 40,
    priority: 8,
    dependencies: ['section_researcher', 'enhanced_search'],
    progressWeight: 0.12,
    phases: ['quality_assessment', 'fact_checking', 'source_validation']
  },
  escalation_checker: {
    displayName: 'Escalation Checker',
    description: 'Monitors for issues and triggers escalation when needed',
    icon: 'alert-triangle',
    averageDuration: 20,
    priority: 7,
    dependencies: [],
    progressWeight: 0.06,
    phases: ['monitoring', 'issue_detection', 'escalation_assessment']
  },
  report_writer: {
    displayName: 'Report Writer',
    description: 'Synthesizes research into final comprehensive report',
    icon: 'pen-tool',
    averageDuration: 80,
    priority: 9,
    dependencies: ['research_evaluator', 'section_researcher'],
    progressWeight: 0.10,
    phases: ['content_synthesis', 'report_structuring', 'final_formatting']
  }
};

// ===== PROGRESS CALCULATION STRATEGIES =====

type ProgressStrategy = 'linear' | 'logarithmic' | 'sigmoid' | 'phase_based';

interface ProgressCalculationContext {
  strategy: ProgressStrategy;
  elapsedTime: number;
  estimatedDuration: number;
  phase: string;
  subtasks: number;
  completedSubtasks: number;
}

class ProgressCalculator {
  static calculate(context: ProgressCalculationContext): number {
    switch (context.strategy) {
      case 'linear':
        return this.linearProgress(context);
      case 'logarithmic':
        return this.logarithmicProgress(context);
      case 'sigmoid':
        return this.sigmoidProgress(context);
      case 'phase_based':
        return this.phaseBasedProgress(context);
      default:
        return this.linearProgress(context);
    }
  }

  private static linearProgress(context: ProgressCalculationContext): number {
    if (context.estimatedDuration <= 0) return 0;
    return Math.min(100, (context.elapsedTime / context.estimatedDuration) * 100);
  }

  private static logarithmicProgress(context: ProgressCalculationContext): number {
    if (context.estimatedDuration <= 0) return 0;
    const ratio = context.elapsedTime / context.estimatedDuration;
    // Logarithmic curve that starts fast and slows down
    return Math.min(100, Math.log(ratio + 1) / Math.log(2) * 100);
  }

  private static sigmoidProgress(context: ProgressCalculationContext): number {
    if (context.estimatedDuration <= 0) return 0;
    const ratio = context.elapsedTime / context.estimatedDuration;
    // Sigmoid curve: slow start, fast middle, slow end
    const sigmoid = 1 / (1 + Math.exp(-6 * (ratio - 0.5)));
    return Math.min(100, sigmoid * 100);
  }

  private static phaseBasedProgress(context: ProgressCalculationContext): number {
    // Progress based on completed subtasks and current phase
    const subtaskProgress = context.subtasks > 0 
      ? (context.completedSubtasks / context.subtasks) * 100
      : this.linearProgress(context);
    
    // Apply phase weighting
    const phaseWeights: Record<string, number> = {
      initialization: 0.1,
      planning: 0.15,
      research: 0.5,
      evaluation: 0.15,
      synthesis: 0.1
    };
    
    const weight = phaseWeights[context.phase] || 1.0;
    return Math.min(100, subtaskProgress * weight);
  }
}

// ===== MAIN MAPPER CLASS =====

export class GoogleAdkAgentMapper {
  private agentMetrics = new Map<string, AgentMetrics>();
  private agentStartTimes = new Map<string, Date>();
  private progressHistory = new Map<string, number[]>();
  private debugMode = false;

  constructor(options?: { debugMode?: boolean }) {
    this.debugMode = options?.debugMode ?? false;
  }

  // ===== MAIN MAPPING METHODS =====

  /**
   * Convert raw ADK agent data to AgentProgress format
   */
  mapAgent(rawAgent: AdkAgentRawData): AgentProgress {
    const config = this.getAgentConfig(rawAgent.type);
    const normalizedType = this.normalizeAgentType(rawAgent.type);
    
    // Calculate progress based on agent state
    const progress = this.calculateProgress(rawAgent);
    
    // Track progress history for smoothing
    this.updateProgressHistory(rawAgent.id, progress);
    
    // Apply progress smoothing
    const smoothedProgress = this.smoothProgress(rawAgent.id, progress);

    const agentProgress: AgentProgress = {
      id: rawAgent.id,
      type: normalizedType,
      status: this.mapStatus(rawAgent.status),
      progress: smoothedProgress,
      currentTask: this.formatCurrentTask(rawAgent, config),
      startTime: this.getStartTime(rawAgent),
      endTime: this.getEndTime(rawAgent),
      confidence: rawAgent.data?.confidence,
      estimatedDuration: rawAgent.data?.estimatedDuration || config.averageDuration
    };

    // Update metrics
    this.updateAgentMetrics(rawAgent.id, rawAgent, agentProgress);

    if (this.debugMode) {
      console.log(`Mapped agent ${rawAgent.id} (${normalizedType}):`, agentProgress);
    }

    return agentProgress;
  }

  /**
   * Batch convert multiple agents
   */
  mapAgents(rawAgents: AdkAgentRawData[]): AgentProgress[] {
    return rawAgents.map(agent => this.mapAgent(agent));
  }

  /**
   * Calculate overall research progress from all agents
   */
  calculateOverallProgress(agents: AgentProgress[]): number {
    if (agents.length === 0) return 0;

    let weightedProgress = 0;
    let totalWeight = 0;

    for (const agent of agents) {
      const config = AGENT_CONFIGS[agent.type];
      const weight = config.progressWeight;
      
      weightedProgress += agent.progress * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedProgress / totalWeight : 0;
  }

  /**
   * Get current research phase based on agent states
   */
  getCurrentPhase(agents: AgentProgress[]): string {
    // Determine phase based on which agents are active
    const activeAgents = agents.filter(a => a.status === 'active');
    const completedAgents = agents.filter(a => a.status === 'completed');

    if (completedAgents.length === agents.length) {
      return 'completed';
    }

    if (activeAgents.some(a => a.type === 'team_leader' || a.type === 'plan_generator')) {
      return 'planning';
    }

    if (activeAgents.some(a => a.type === 'section_researcher' || a.type === 'enhanced_search')) {
      return 'research';
    }

    if (activeAgents.some(a => a.type === 'research_evaluator')) {
      return 'evaluation';
    }

    if (activeAgents.some(a => a.type === 'report_writer')) {
      return 'synthesis';
    }

    return 'initializing';
  }

  /**
   * Estimate time remaining for research completion
   */
  estimateTimeRemaining(agents: AgentProgress[]): number {
    let totalEstimatedTime = 0;

    for (const agent of agents) {
      if (agent.status === 'completed') continue;
      
      const config = AGENT_CONFIGS[agent.type];
      const remainingProgress = 100 - agent.progress;
      const estimatedRemaining = (remainingProgress / 100) * config.averageDuration;
      
      totalEstimatedTime += estimatedRemaining;
    }

    // Account for parallel processing - agents can work simultaneously
    const parallelFactor = Math.min(agents.filter(a => a.status !== 'completed').length, 4);
    return parallelFactor > 0 ? totalEstimatedTime / parallelFactor : 0;
  }

  // ===== PRIVATE HELPER METHODS =====

  private normalizeAgentType(type: string): AgentType {
    const mapping: Record<string, AgentType> = {
      'team_leader': 'team_leader',
      'teamleader': 'team_leader',
      'coordinator': 'team_leader',
      'plan_generator': 'plan_generator',
      'plangenerator': 'plan_generator',
      'planner': 'plan_generator',
      'section_planner': 'section_planner',
      'sectionplanner': 'section_planner',
      'section_researcher': 'section_researcher',
      'sectionresearcher': 'section_researcher',
      'researcher': 'section_researcher',
      'enhanced_search': 'enhanced_search',
      'enhancedsearch': 'enhanced_search',
      'search': 'enhanced_search',
      'research_evaluator': 'research_evaluator',
      'researchevaluator': 'research_evaluator',
      'evaluator': 'research_evaluator',
      'escalation_checker': 'escalation_checker',
      'escalationchecker': 'escalation_checker',
      'checker': 'escalation_checker',
      'report_writer': 'report_writer',
      'reportwriter': 'report_writer',
      'writer': 'report_writer'
    };

    return mapping[type.toLowerCase().replace(/[-_\s]/g, '')] || 'section_researcher';
  }

  private mapStatus(status: string): 'waiting' | 'active' | 'completed' | 'failed' {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('start') || normalizedStatus.includes('progress') || normalizedStatus.includes('active') || normalizedStatus.includes('running')) {
      return 'active';
    }
    
    if (normalizedStatus.includes('complet') || normalizedStatus.includes('done') || normalizedStatus.includes('finish')) {
      return 'completed';
    }
    
    if (normalizedStatus.includes('fail') || normalizedStatus.includes('error')) {
      return 'failed';
    }
    
    return 'waiting';
  }

  private calculateProgress(rawAgent: AdkAgentRawData): number {
    // Use explicit progress if available
    if (rawAgent.data?.progress !== undefined) {
      return Math.max(0, Math.min(100, rawAgent.data.progress));
    }

    // Calculate based on status and time
    const status = this.mapStatus(rawAgent.status);
    
    if (status === 'completed') return 100;
    if (status === 'failed') return 0;
    if (status === 'waiting') return 0;
    
    // For active agents, calculate based on elapsed time
    const startTime = this.getStartTime(rawAgent);
    if (!startTime) return 10; // Default for active agents without start time
    
    const elapsedTime = (Date.now() - startTime.getTime()) / 1000;
    const config = this.getAgentConfig(rawAgent.type);
    
    const context: ProgressCalculationContext = {
      strategy: 'sigmoid', // Use sigmoid for more realistic progress curves
      elapsedTime,
      estimatedDuration: rawAgent.data?.estimatedDuration || config.averageDuration,
      phase: rawAgent.data?.phase || 'research',
      subtasks: 0,
      completedSubtasks: 0
    };

    return ProgressCalculator.calculate(context);
  }

  private smoothProgress(agentId: string, currentProgress: number): number {
    const history = this.progressHistory.get(agentId) || [];
    
    if (history.length === 0) {
      return currentProgress;
    }

    // Apply exponential moving average for smoothing
    const alpha = 0.3; // Smoothing factor
    const lastSmoothed = history[history.length - 1];
    return alpha * currentProgress + (1 - alpha) * lastSmoothed;
  }

  private updateProgressHistory(agentId: string, progress: number): void {
    const history = this.progressHistory.get(agentId) || [];
    history.push(progress);
    
    // Keep only last 10 progress values
    if (history.length > 10) {
      history.shift();
    }
    
    this.progressHistory.set(agentId, history);
  }

  private formatCurrentTask(rawAgent: AdkAgentRawData, config: AgentConfig): string {
    // Use explicit current task if provided
    if (rawAgent.data?.currentTask) {
      return rawAgent.data.currentTask;
    }

    // Generate task based on agent type and phase
    const phase = rawAgent.data?.phase || 'processing';
    const status = this.mapStatus(rawAgent.status);

    if (status === 'completed') {
      return 'Completed successfully';
    }

    if (status === 'failed') {
      return 'Processing failed';
    }

    if (status === 'waiting') {
      return 'Waiting to start';
    }

    // Generate phase-specific task descriptions
    const taskTemplates: Record<AgentType, Record<string, string>> = {
      team_leader: {
        initialization: 'Initializing research workflow',
        coordination: 'Coordinating agent activities',
        quality_review: 'Reviewing research quality',
        finalization: 'Finalizing research results'
      },
      plan_generator: {
        analysis: 'Analyzing research requirements',
        planning: 'Developing research strategy',
        strategy_development: 'Creating execution plan'
      },
      section_planner: {
        structure_analysis: 'Analyzing content structure',
        section_organization: 'Organizing research sections',
        outline_creation: 'Creating research outline'
      },
      section_researcher: {
        research: 'Conducting detailed research',
        fact_gathering: 'Gathering supporting facts',
        content_development: 'Developing section content'
      },
      enhanced_search: {
        query_optimization: 'Optimizing search queries',
        web_search: 'Searching web sources',
        source_evaluation: 'Evaluating source quality'
      },
      research_evaluator: {
        quality_assessment: 'Assessing research quality',
        fact_checking: 'Verifying facts and claims',
        source_validation: 'Validating source credibility'
      },
      escalation_checker: {
        monitoring: 'Monitoring research progress',
        issue_detection: 'Detecting potential issues',
        escalation_assessment: 'Assessing escalation needs'
      },
      report_writer: {
        content_synthesis: 'Synthesizing research content',
        report_structuring: 'Structuring final report',
        final_formatting: 'Formatting final output'
      }
    };

    const agentType = this.normalizeAgentType(rawAgent.type);
    const template = taskTemplates[agentType]?.[phase];
    
    return template || `${config.displayName} processing`;
  }

  private getStartTime(rawAgent: AdkAgentRawData): Date | undefined {
    // Use explicit start time if provided
    if (rawAgent.data?.startTime) {
      return new Date(rawAgent.data.startTime);
    }

    // Use cached start time
    const cachedStart = this.agentStartTimes.get(rawAgent.id);
    if (cachedStart) {
      return cachedStart;
    }

    // Set start time for active agents
    if (this.mapStatus(rawAgent.status) === 'active') {
      const startTime = rawAgent.lastUpdate || new Date();
      this.agentStartTimes.set(rawAgent.id, startTime);
      return startTime;
    }

    return undefined;
  }

  private getEndTime(rawAgent: AdkAgentRawData): Date | undefined {
    if (rawAgent.data?.endTime) {
      return new Date(rawAgent.data.endTime);
    }

    const status = this.mapStatus(rawAgent.status);
    if (status === 'completed' || status === 'failed') {
      return rawAgent.lastUpdate || new Date();
    }

    return undefined;
  }

  private getAgentConfig(type: string): AgentConfig {
    const normalizedType = this.normalizeAgentType(type);
    return AGENT_CONFIGS[normalizedType];
  }

  private updateAgentMetrics(agentId: string, rawAgent: AdkAgentRawData, progress: AgentProgress): void {
    const current = this.agentMetrics.get(agentId) || {
      totalProcessingTime: 0,
      averageConfidence: 0,
      successRate: 0,
      tasksCompleted: 0,
      sourcesFound: 0,
      tokensUsed: 0
    };

    const updated: AgentMetrics = {
      ...current,
      totalProcessingTime: rawAgent.data?.processingTimeMs || current.totalProcessingTime,
      averageConfidence: progress.confidence || current.averageConfidence,
      successRate: progress.status === 'completed' ? 1 : current.successRate,
      tasksCompleted: progress.status === 'completed' ? current.tasksCompleted + 1 : current.tasksCompleted,
      sourcesFound: (rawAgent.data?.sources?.length || 0) + current.sourcesFound,
      tokensUsed: (rawAgent.data?.tokensUsed || 0) + current.tokensUsed
    };

    this.agentMetrics.set(agentId, updated);
  }

  // ===== PUBLIC API METHODS =====

  getAgentMetrics(agentId?: string): Map<string, AgentMetrics> | AgentMetrics | undefined {
    if (agentId) {
      return this.agentMetrics.get(agentId);
    }
    return new Map(this.agentMetrics);
  }

  getAgentConfig(type: AgentType): AgentConfig {
    return AGENT_CONFIGS[type];
  }

  getAllAgentConfigs(): Record<AgentType, AgentConfig> {
    return AGENT_CONFIGS;
  }

  reset(): void {
    this.agentMetrics.clear();
    this.agentStartTimes.clear();
    this.progressHistory.clear();
  }
}

// ===== SINGLETON INSTANCE =====

export const googleAdkAgentMapper = new GoogleAdkAgentMapper({
  debugMode: process.env.NODE_ENV === 'development'
});

export default GoogleAdkAgentMapper;