/**
 * Google ADK Event Processor
 * Transforms raw SSE events from Google ADK backend into structured frontend data
 */

import { 
  AgentType,
  ResponseSource,
  AgentResponse,
  ResearchResult,
  ProgressUpdate,
  UpdateType,
  ErrorInfo
} from '../types/chat';

// ===== RAW ADK EVENT INTERFACES =====

export interface RawAdkEvent {
  event: string;
  data: string | Record<string, any>;
  id?: string;
  retry?: number;
  timestamp?: string;
}

export interface AdkAgentEventData {
  type: string;
  sessionId: string;
  agentId?: string;
  agentType?: string;
  content?: string;
  resultId?: string;
  summary?: string;
  qualityScore?: number;
  wordCount?: number;
  readingTimeMinutes?: number;
  message?: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface AdkSourceEventData {
  url: string;
  title: string;
  excerpt: string;
  relevance: number;
  credibility: number;
  accessedAt: string;
  agentId?: string;
  searchQuery?: string;
}

export interface AdkResultEventData {
  resultId: string;
  content: {
    sections: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
      agentContributions: string[];
      confidence: number;
    }>;
    keyFindings: string[];
    recommendations: string[];
    limitations: string[];
    methodology: string;
  };
  citations: Array<{
    id: string;
    url: string;
    title: string;
    authors: string[];
    publishDate?: string;
    excerpt: string;
    usageContext: string;
  }>;
  qualityMetrics: {
    overallScore: number;
    completeness: number;
    accuracy: number;
    relevance: number;
    sourceQuality: number;
    coherence: number;
  };
}

// ===== PROCESSED EVENT INTERFACES =====

export interface ProcessedEvent<T = any> {
  id: string;
  type: string;
  timestamp: Date;
  source: 'google_adk';
  sessionId: string;
  data: T;
  processed: boolean;
  errors?: string[];
  metadata?: {
    processingTimeMs: number;
    originalEventSize: number;
    validationScore: number;
  };
}

export interface AgentProgressUpdate {
  agentId: string;
  agentType: AgentType;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  currentTask: string;
  confidence?: number;
  sources?: ResponseSource[];
  errors?: string[];
  estimatedCompletion?: Date;
  startTime?: Date;
  endTime?: Date;
}

// ===== EVENT PROCESSOR CLASS =====

export class GoogleAdkEventProcessor {
  private eventHistory: ProcessedEvent[] = [];
  private maxHistorySize = 1000;
  private agentStates = new Map<string, AgentProgressUpdate>();
  private sources = new Map<string, ResponseSource>();
  private debugMode = false;

  constructor(options?: { 
    maxHistorySize?: number; 
    debugMode?: boolean;
  }) {
    this.maxHistorySize = options?.maxHistorySize ?? 1000;
    this.debugMode = options?.debugMode ?? false;
  }

  // ===== MAIN PROCESSING ENTRY POINT =====

  processEvent(rawEvent: RawAdkEvent): ProcessedEvent[] {
    const startTime = performance.now();
    const events: ProcessedEvent[] = [];

    try {
      // Parse raw event data
      const parsedData = this.parseEventData(rawEvent);
      if (!parsedData) {
        console.warn('Failed to parse ADK event:', rawEvent);
        return [];
      }

      // Create base processed event
      const baseEvent: ProcessedEvent = {
        id: rawEvent.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: parsedData.type || rawEvent.event,
        timestamp: parsedData.timestamp ? new Date(parsedData.timestamp) : new Date(),
        source: 'google_adk',
        sessionId: parsedData.sessionId || 'unknown',
        data: parsedData,
        processed: true,
        metadata: {
          processingTimeMs: 0, // Will be set at the end
          originalEventSize: JSON.stringify(rawEvent).length,
          validationScore: this.validateEvent(parsedData)
        }
      };

      // Process based on event type
      switch (parsedData.type) {
        case 'agent_started':
          events.push(...this.processAgentStarted(baseEvent));
          break;
        case 'agent_progress':
          events.push(...this.processAgentProgress(baseEvent));
          break;
        case 'agent_completed':
          events.push(...this.processAgentCompleted(baseEvent));
          break;
        case 'source_found':
          events.push(...this.processSourceFound(baseEvent));
          break;
        case 'section_completed':
          events.push(...this.processSectionCompleted(baseEvent));
          break;
        case 'result_generated':
          events.push(...this.processResultGenerated(baseEvent));
          break;
        case 'processing_complete':
          events.push(...this.processProcessingComplete(baseEvent));
          break;
        case 'error_occurred':
          events.push(...this.processErrorOccurred(baseEvent));
          break;
        default:
          // Handle unknown event types gracefully
          console.log('Unknown ADK event type:', parsedData.type, parsedData);
          events.push(baseEvent);
      }

      // Update metadata with processing time
      const processingTime = performance.now() - startTime;
      events.forEach(event => {
        if (event.metadata) {
          event.metadata.processingTimeMs = processingTime;
        }
      });

      // Add to history
      this.addToHistory(events);

      if (this.debugMode) {
        console.log(`Processed ADK event ${parsedData.type} in ${processingTime.toFixed(2)}ms:`, events);
      }

      return events;

    } catch (error) {
      console.error('Error processing ADK event:', error, rawEvent);
      
      // Return error event
      const errorEvent: ProcessedEvent = {
        id: `error-${Date.now()}`,
        type: 'processing_error',
        timestamp: new Date(),
        source: 'google_adk',
        sessionId: 'unknown',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        processed: false,
        errors: [error instanceof Error ? error.message : 'Unknown processing error'],
        metadata: {
          processingTimeMs: performance.now() - startTime,
          originalEventSize: JSON.stringify(rawEvent).length,
          validationScore: 0
        }
      };
      
      this.addToHistory([errorEvent]);
      return [errorEvent];
    }
  }

  // ===== EVENT PARSING =====

  private parseEventData(rawEvent: RawAdkEvent): AdkAgentEventData | null {
    try {
      let data: any;
      
      if (typeof rawEvent.data === 'string') {
        data = JSON.parse(rawEvent.data);
      } else {
        data = rawEvent.data;
      }

      // Ensure required fields
      if (!data.type || !data.sessionId) {
        console.warn('Missing required fields in ADK event:', data);
        return null;
      }

      return {
        type: data.type,
        sessionId: data.sessionId,
        agentId: data.agentId,
        agentType: data.agentType,
        content: data.content,
        resultId: data.resultId,
        summary: data.summary,
        qualityScore: data.qualityScore,
        wordCount: data.wordCount,
        readingTimeMinutes: data.readingTimeMinutes,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        data: data.data || {}
      };

    } catch (error) {
      console.error('Failed to parse ADK event data:', error, rawEvent);
      return null;
    }
  }

  private validateEvent(data: AdkAgentEventData): number {
    let score = 0;
    
    // Basic required fields (50% weight)
    if (data.type) score += 25;
    if (data.sessionId) score += 25;
    
    // Optional but important fields (30% weight)
    if (data.timestamp) score += 10;
    if (data.agentId || data.agentType) score += 10;
    if (data.content || data.message || data.summary) score += 10;
    
    // Data quality indicators (20% weight)
    if (data.data && Object.keys(data.data).length > 0) score += 10;
    if (data.qualityScore !== undefined) score += 5;
    if (data.timestamp && !isNaN(Date.parse(data.timestamp))) score += 5;
    
    return score;
  }

  // ===== AGENT EVENT PROCESSORS =====

  private processAgentStarted(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;
    
    if (!data.agentId || !data.agentType) {
      baseEvent.errors = ['Missing agentId or agentType for agent_started event'];
      return [baseEvent];
    }

    // Update agent state
    const agentUpdate: AgentProgressUpdate = {
      agentId: data.agentId,
      agentType: this.normalizeAgentType(data.agentType),
      status: 'active',
      progress: 0,
      currentTask: data.data?.task || `${data.agentType} initializing`,
      confidence: data.data?.confidence,
      startTime: baseEvent.timestamp,
      estimatedCompletion: data.data?.estimatedDuration 
        ? new Date(Date.now() + data.data.estimatedDuration * 1000)
        : undefined
    };

    this.agentStates.set(data.agentId, agentUpdate);

    // Create agent progress event
    const progressEvent: ProcessedEvent = {
      ...baseEvent,
      type: 'agent_progress_update',
      data: agentUpdate
    };

    return [baseEvent, progressEvent];
  }

  private processAgentProgress(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;
    
    if (!data.agentId) {
      baseEvent.errors = ['Missing agentId for agent_progress event'];
      return [baseEvent];
    }

    // Update existing agent state
    const currentState = this.agentStates.get(data.agentId);
    if (!currentState) {
      console.warn('No existing state for agent:', data.agentId);
      return [baseEvent];
    }

    const updatedState: AgentProgressUpdate = {
      ...currentState,
      progress: data.data?.progress || currentState.progress + 10, // Incremental progress
      currentTask: data.data?.currentTask || data.content || currentState.currentTask,
      confidence: data.data?.confidence || currentState.confidence
    };

    this.agentStates.set(data.agentId, updatedState);

    // Create progress update event
    const progressEvent: ProcessedEvent = {
      ...baseEvent,
      type: 'agent_progress_update',
      data: updatedState
    };

    return [baseEvent, progressEvent];
  }

  private processAgentCompleted(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;
    const events: ProcessedEvent[] = [baseEvent];
    
    if (!data.agentId) {
      baseEvent.errors = ['Missing agentId for agent_completed event'];
      return events;
    }

    // Update agent state to completed
    const currentState = this.agentStates.get(data.agentId);
    if (currentState) {
      const completedState: AgentProgressUpdate = {
        ...currentState,
        status: 'completed',
        progress: 100,
        currentTask: 'Completed',
        endTime: baseEvent.timestamp,
        confidence: data.data?.confidence || currentState.confidence
      };

      this.agentStates.set(data.agentId, completedState);

      // Create completion event
      events.push({
        ...baseEvent,
        type: 'agent_progress_update',
        data: completedState
      });
    }

    // If this agent produced content, create response event
    if (data.content || data.summary) {
      const response: AgentResponse = {
        id: `${data.agentId}-response-${Date.now()}`,
        queryId: data.data?.queryId || 'unknown',
        agentId: data.agentId,
        agentType: this.normalizeAgentType(data.agentType || 'section_researcher'),
        content: data.content || data.summary || '',
        status: 'completed',
        confidence: data.data?.confidence || 0.8,
        sources: data.data?.sources || [],
        createdAt: baseEvent.timestamp,
        processingTimeMs: data.data?.processingTimeMs || 0,
        tokens: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: data.data?.tokensUsed || 0,
          cost: 0
        },
        metadata: {
          model: 'gemini-2.5-pro',
          temperature: 0.7,
          maxTokens: 4000
        }
      };

      events.push({
        ...baseEvent,
        type: 'agent_response_generated',
        data: response
      });
    }

    return events;
  }

  private processSourceFound(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;
    const events: ProcessedEvent[] = [baseEvent];

    if (!data.data?.source) {
      baseEvent.errors = ['Missing source data for source_found event'];
      return events;
    }

    const sourceData = data.data.source as AdkSourceEventData;
    
    // Create or update source
    const source: ResponseSource = {
      id: `source-${Buffer.from(sourceData.url).toString('base64').slice(0, 12)}`,
      url: sourceData.url,
      title: sourceData.title || 'Unknown Title',
      excerpt: sourceData.excerpt || '',
      relevanceScore: sourceData.relevance || 0.5,
      credibilityScore: sourceData.credibility || 0.5,
      accessedAt: sourceData.accessedAt ? new Date(sourceData.accessedAt) : baseEvent.timestamp
    };

    // Deduplicate sources
    const existingSource = this.sources.get(source.id);
    if (!existingSource || existingSource.relevanceScore < source.relevanceScore) {
      this.sources.set(source.id, source);

      // Create source discovery event
      events.push({
        ...baseEvent,
        type: 'research_source_discovered',
        data: source
      });
    }

    return events;
  }

  private processSectionCompleted(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;

    // Create section completion progress update
    const progressUpdate: ProgressUpdate = {
      id: `section-progress-${Date.now()}`,
      queryId: data.data?.queryId || 'unknown',
      agentId: data.agentId,
      type: 'agent_completed',
      message: `Section "${data.data?.sectionTitle || 'Unknown'}" completed`,
      progress: data.data?.progress || 100,
      timestamp: baseEvent.timestamp,
      metadata: {
        estimatedCompletion: undefined,
        agentsCompleted: data.data?.agentsCompleted || 0,
        agentsTotal: data.data?.agentsTotal || 8,
        currentPhase: data.data?.phase || 'research'
      },
      severity: 'info'
    };

    const progressEvent: ProcessedEvent = {
      ...baseEvent,
      type: 'section_progress_update',
      data: progressUpdate
    };

    return [baseEvent, progressEvent];
  }

  private processResultGenerated(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;
    const events: ProcessedEvent[] = [baseEvent];

    if (!data.resultId || !data.summary) {
      baseEvent.errors = ['Missing resultId or summary for result_generated event'];
      return events;
    }

    // Create research result
    const result: ResearchResult = {
      id: data.resultId,
      queryId: data.data?.queryId || 'unknown',
      title: data.data?.title || 'Research Result',
      summary: data.summary,
      content: {
        sections: data.data?.sections || [],
        keyFindings: data.data?.keyFindings || [],
        recommendations: data.data?.recommendations || [],
        limitations: data.data?.limitations || [],
        methodology: 'Multi-agent research approach'
      },
      status: 'completed',
      quality: {
        overallScore: data.qualityScore || 0.85,
        completeness: 0.9,
        accuracy: 0.85,
        relevance: 0.9,
        sourceQuality: 0.8,
        coherence: 0.85
      },
      citations: Array.from(this.sources.values()).map(source => ({
        id: source.id,
        url: source.url,
        title: source.title,
        authors: [],
        accessDate: source.accessedAt,
        excerpt: source.excerpt,
        usageContext: 'Research evidence'
      })),
      generatedAt: baseEvent.timestamp,
      wordCount: data.wordCount || 0,
      readingTimeMinutes: data.readingTimeMinutes || 0,
      format: {
        structure: 'business',
        includeCharts: false,
        includeTables: false,
        citationStyle: 'APA'
      }
    };

    events.push({
      ...baseEvent,
      type: 'research_result_ready',
      data: result
    });

    return events;
  }

  private processProcessingComplete(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;

    // Mark all agents as completed if they're not already
    for (const [agentId, state] of this.agentStates.entries()) {
      if (state.status === 'active') {
        this.agentStates.set(agentId, {
          ...state,
          status: 'completed',
          progress: 100,
          currentTask: 'Completed',
          endTime: baseEvent.timestamp
        });
      }
    }

    // Create completion summary event
    const completionEvent: ProcessedEvent = {
      ...baseEvent,
      type: 'research_processing_complete',
      data: {
        totalAgents: this.agentStates.size,
        completedAgents: Array.from(this.agentStates.values()).filter(s => s.status === 'completed').length,
        failedAgents: Array.from(this.agentStates.values()).filter(s => s.status === 'failed').length,
        totalSources: this.sources.size,
        processingTimeMs: data.data?.totalDurationMs || 0
      }
    };

    return [baseEvent, completionEvent];
  }

  private processErrorOccurred(baseEvent: ProcessedEvent): ProcessedEvent[] {
    const data = baseEvent.data as AdkAgentEventData;

    // Update agent state if error is agent-specific
    if (data.agentId) {
      const currentState = this.agentStates.get(data.agentId);
      if (currentState) {
        const errorState: AgentProgressUpdate = {
          ...currentState,
          status: 'failed',
          errors: [...(currentState.errors || []), data.message || 'Unknown error'],
          endTime: baseEvent.timestamp
        };
        this.agentStates.set(data.agentId, errorState);
      }
    }

    // Create error info event
    const errorInfo: ErrorInfo = {
      code: data.data?.errorCode || 'UNKNOWN_ERROR',
      details: data.message || 'Unknown error occurred',
      recoverable: data.data?.recoverable ?? true,
      suggestedAction: data.data?.suggestedAction || 'Please try again'
    };

    const errorEvent: ProcessedEvent = {
      ...baseEvent,
      type: 'research_error_occurred',
      data: errorInfo
    };

    return [baseEvent, errorEvent];
  }

  // ===== UTILITY METHODS =====

  private normalizeAgentType(agentType: string): AgentType {
    const mapping: Record<string, AgentType> = {
      'team_leader': 'team_leader',
      'plan_generator': 'plan_generator',
      'section_planner': 'section_planner',
      'section_researcher': 'section_researcher',
      'enhanced_search': 'enhanced_search',
      'research_evaluator': 'research_evaluator',
      'escalation_checker': 'escalation_checker',
      'report_writer': 'report_writer'
    };

    return mapping[agentType.toLowerCase()] || 'section_researcher';
  }

  private addToHistory(events: ProcessedEvent[]): void {
    this.eventHistory.push(...events);
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  // ===== PUBLIC API METHODS =====

  getAgentStates(): Map<string, AgentProgressUpdate> {
    return new Map(this.agentStates);
  }

  getSources(): Map<string, ResponseSource> {
    return new Map(this.sources);
  }

  getEventHistory(): ProcessedEvent[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  getOverallProgress(): number {
    if (this.agentStates.size === 0) return 0;
    
    const totalProgress = Array.from(this.agentStates.values())
      .reduce((sum, state) => sum + state.progress, 0);
    
    return totalProgress / this.agentStates.size;
  }

  getActiveAgents(): AgentProgressUpdate[] {
    return Array.from(this.agentStates.values())
      .filter(state => state.status === 'active');
  }

  getCompletedAgents(): AgentProgressUpdate[] {
    return Array.from(this.agentStates.values())
      .filter(state => state.status === 'completed');
  }

  getFailedAgents(): AgentProgressUpdate[] {
    return Array.from(this.agentStates.values())
      .filter(state => state.status === 'failed');
  }

  reset(): void {
    this.agentStates.clear();
    this.sources.clear();
    this.eventHistory = [];
  }
}

// ===== SINGLETON INSTANCE =====

export const googleAdkEventProcessor = new GoogleAdkEventProcessor({
  maxHistorySize: 1000,
  debugMode: process.env.NODE_ENV === 'development'
});

export default GoogleAdkEventProcessor;