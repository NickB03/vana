import { EventEmitter } from '../utils/event-emitter';
import type { 
  ADKSSEEvent, 
  UIEvent
} from '../types/adk-events';
// Types are used for the public interface in emit events
import { sessionManager } from './session-manager';

interface SSEClientConfig {
  url: string;
  maxRetries?: number;
  retryDelay?: number;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
}

interface MessageState {
  id: string;
  content: string;
  isStreaming: boolean;
}

interface StepState {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'active' | 'complete';
  startTime: number;
}

export class SSEClient extends EventEmitter {
  private config: Required<SSEClientConfig>;
  private retryTimeout: NodeJS.Timeout | null = null;
  private currentMessageState: MessageState | null = null;
  private activeSteps: Map<string, StepState> = new Map();
  public isConnected = false;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private abortController: AbortController | null = null;
  private processedMessageIds: Set<string> = new Set();

  constructor(config: SSEClientConfig) {
    super();
    this.config = {
      maxRetries: 5,
      retryDelay: 1000,
      onConnectionChange: () => {},
      ...config
    };
  }

  /**
   * Initialize the SSE connection with session info
   */
  public async connect(userId: string, _sessionId?: string): Promise<void> {
    // Prevent duplicate connections - check both connection state AND session ID
    if (this.isConnected && this.userId === userId && this.sessionId) {
      console.log('[SSE] Already connected for user:', userId, 'with session:', this.sessionId);
      return;
    }
    
    // If we have a session ID passed in, check if it matches our current one
    if (_sessionId && this.sessionId === _sessionId && this.isConnected) {
      console.log('[SSE] Already connected with same session ID:', _sessionId);
      return;
    }
    
    console.log('[SSE] Connecting with userId:', userId, 'sessionId:', _sessionId);
    this.userId = userId;
    
    try {
      // Get or create a session via ADK
      const session = await sessionManager.getOrCreateSession(userId);
      this.sessionId = session.sessionId;
      console.log('[SSE] Session created/retrieved:', this.sessionId);
      
      // For ADK, we don't maintain a persistent connection
      // Instead, we connect per message
      this.isConnected = true;
      this.config.onConnectionChange('connected');
      this.emitUIEvent({
        type: 'connection',
        data: { status: 'connected' }
      });
      console.log('[SSE] Connected successfully');
    } catch (error) {
      console.error('[SSE] Connection error:', error);
      this.isConnected = false;
      this.config.onConnectionChange('disconnected');
      throw error;
    }
  }

  /**
   * Send a message to the ADK backend and receive SSE response
   */
  public async sendMessage(message: string, messageId?: string): Promise<void> {
    console.log('[SSE] Sending message:', message);
    console.log('[SSE] Session:', this.sessionId, 'User:', this.userId);
    
    if (!this.sessionId || !this.userId) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Use provided message ID or create a new one
    const finalMessageId = messageId || `msg_${Date.now()}`;
    
    // Check if we've already processed this message ID
    if (this.processedMessageIds.has(finalMessageId)) {
      console.log('[SSE] Ignoring duplicate message with ID:', finalMessageId);
      return;
    }
    
    // Mark this message ID as being processed
    this.processedMessageIds.add(finalMessageId);

    // Cancel any existing request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.currentMessageState = {
      id: finalMessageId,
      content: '',
      isStreaming: true
    };

    // Reset active steps for new message
    this.activeSteps.clear();

    // Emit initial message update with the correct message ID
    this.emitUIEvent({
      type: 'message_update',
      data: {
        messageId: finalMessageId,
        content: '',
        isComplete: false
      }
    });

    try {
      // Use the /run_sse endpoint with alt=sse parameter for SSE mode
      const url = `${this.config.url}/run_sse?alt=sse`;
      const payload = {
        app_name: 'app',
        user_id: this.userId,
        session_id: this.sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }]
        },
        streaming: true
      };
      
      console.log('[SSE] Sending to:', url);
      console.log('[SSE] Payload:', payload);
      
      // Send POST request to ADK backend with SSE response
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: this.abortController.signal
      });

      console.log('[SSE] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SSE] Error response:', errorText);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // Process the SSE stream
      await this.processSSEStream(response);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      this.emitUIEvent({
        type: 'error',
        data: { message: error.message || 'Failed to send message' }
      });
      throw error;
    } finally {
      // Clean up old message IDs after some time to prevent memory leak
      setTimeout(() => {
        this.processedMessageIds.delete(finalMessageId);
      }, 30000); // Clean up after 30 seconds
    }
  }

  /**
   * Process SSE stream from the response
   */
  private async processSSEStream(response: Response): Promise<void> {
    console.log('[SSE] Processing stream...');
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue; // Skip empty lines
          
          console.log('[SSE] Line:', line);
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('[SSE] Stream complete');
              this.handleStreamComplete();
              return;
            }
            
            try {
              const event: ADKSSEEvent = JSON.parse(data);
              console.log('[SSE] Parsed event:', event);
              this.transformAndEmitEvent(event);
            } catch (error) {
              console.error('Failed to parse SSE event:', error, 'Data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle stream completion
   */
  private handleStreamComplete(): void {
    // Complete all active steps
    for (const step of this.activeSteps.values()) {
      const duration = Date.now() - step.startTime;
      this.emitUIEvent({
        type: 'thinking_update',
        data: {
          stepId: step.id,
          agent: this.getAgentDisplayName(step.agent),
          action: step.action,
          status: 'complete',
          duration: duration.toString()
        }
      });
    }
    this.activeSteps.clear();

    // Complete the message if it exists
    if (this.currentMessageState) {
      this.emitUIEvent({
        type: 'message_update',
        data: {
          messageId: this.currentMessageState.id,
          content: this.currentMessageState.content,
          isComplete: true
        }
      });
      this.currentMessageState = null;
    }
  }

  /**
   * Transform ADK event to UI event
   */
  private transformAndEmitEvent(event: ADKSSEEvent): void {
    // Handle thinking updates from agents
    if (event.author && event.author !== 'user') {
      this.handleAgentEvent(event);
    }

    // Handle content updates
    if (event.content?.parts) {
      this.handleContentUpdate(event);
    }

    // Handle final report in state delta
    if (event.actions?.stateDelta?.final_report_with_citations) {
      console.log('[SSE] Final report with citations detected:', event.actions.stateDelta.final_report_with_citations.substring(0, 100) + '...');
      this.handleFinalReport(event.actions.stateDelta.final_report_with_citations);
    } else if (event.actions?.stateDelta?.research_plan) {
      // Handle research plan as final content if no other content was set
      console.log('[SSE] Research plan detected:', event.actions.stateDelta.research_plan.substring(0, 100) + '...');
      if (!this.currentMessageState?.content || this.currentMessageState.content === '') {
        console.log('[SSE] Using research plan as final report');
        this.handleFinalReport(event.actions.stateDelta.research_plan);
      }
    }
  }

  /**
   * Handle agent activity for thinking panel
   */
  private handleAgentEvent(event: ADKSSEEvent): void {
    const stepId = `step_${event.author}_${Date.now()}`;
    
    // Extract action from content or function call
    let action = 'Processing';
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text) {
          action = this.extractActionFromText(part.text);
          break;
        } else if (part.functionCall) {
          action = this.getFunctionCallDescription(part.functionCall.name);
          break;
        }
      }
    }

    // Check if we have an existing active step for this agent
    const existingStep = Array.from(this.activeSteps.values())
      .find(s => s.agent === event.author && s.status === 'active');

    if (existingStep) {
      // Complete existing step
      existingStep.status = 'complete';
      const duration = Date.now() - existingStep.startTime;
      
      this.emitUIEvent({
        type: 'thinking_update',
        data: {
          stepId: existingStep.id,
          agent: this.getAgentDisplayName(event.author),
          action: existingStep.action,
          status: 'complete',
          duration: duration.toString()
        }
      });
      
      this.activeSteps.delete(existingStep.id);
    }

    // Create new step
    const newStep: StepState = {
      id: stepId,
      agent: event.author,
      action,
      status: 'active',
      startTime: Date.now()
    };
    
    this.activeSteps.set(stepId, newStep);
    
    this.emitUIEvent({
      type: 'thinking_update',
      data: {
        stepId,
        agent: this.getAgentDisplayName(event.author),
        action,
        status: 'active'
      }
    });
  }

  /**
   * Handle content updates for message streaming
   */
  private handleContentUpdate(event: ADKSSEEvent): void {
    if (!this.currentMessageState || !event.content?.parts) return;

    // Check if this is a partial update or complete message
    const isPartial = event.partial === true;
    
    for (const part of event.content.parts) {
      if (part.text) {
        if (isPartial) {
          // For partial updates, accumulate content
          this.currentMessageState.content += part.text;
        } else {
          // For complete messages, replace content
          this.currentMessageState.content = part.text;
        }
        
        this.emitUIEvent({
          type: 'message_update',
          data: {
            messageId: this.currentMessageState.id,
            content: this.currentMessageState.content,
            isComplete: !isPartial
          }
        });
      }
    }
  }

  /**
   * Handle final report completion
   */
  private handleFinalReport(report: string): void {
    console.log('[SSE] handleFinalReport called with report length:', report.length);
    console.log('[SSE] Current message state:', this.currentMessageState);
    
    if (!this.currentMessageState) {
      console.warn('[SSE] No current message state - cannot display final report');
      return;
    }

    // Update message content with final report
    this.currentMessageState.content = report;
    this.currentMessageState.isStreaming = false;
    
    console.log('[SSE] Emitting message_update event for final report with messageId:', this.currentMessageState.id);
    
    // Emit message update using consistent event naming and structure
    this.emitUIEvent({
      type: 'message_update',
      data: {
        messageId: this.currentMessageState.id,
        content: report,
        isComplete: true
      }
    });
    
    // Clear active thinking steps as the report is complete
    this.completeAllThinkingSteps();
  }

  /**
   * Complete all active thinking steps
   */
  private completeAllThinkingSteps(): void {
    this.activeSteps.forEach((step) => {
      if (step.status === 'active') {
        step.status = 'complete';
        const duration = Date.now() - step.startTime;
        
        this.emitUIEvent({
          type: 'thinking_update',
          data: {
            stepId: step.id,
            agent: this.getAgentDisplayName(step.agent),
            action: step.action,
            status: 'complete',
            duration: `${(duration / 1000).toFixed(1)}s`
          }
        });
      }
    });
    
    // Clear active steps
    this.activeSteps.clear();
  }

  /**
   * Disconnect the SSE client
   */
  public disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.isConnected = false;
    this.config.onConnectionChange('disconnected');
    this.emitUIEvent({
      type: 'connection',
      data: { status: 'disconnected' }
    });
  }

  /**
   * Emit UI event
   */
  private emitUIEvent(event: UIEvent): void {
    this.emit(event.type, event.data);
  }

  /**
   * Extract action description from text
   */
  private extractActionFromText(text: string): string {
    // Simple extraction logic - can be enhanced
    const firstLine = text.split('\n')[0];
    if (firstLine.length <= 50) {
      return firstLine;
    }
    return firstLine.substring(0, 47) + '...';
  }

  /**
   * Get human-readable function call description
   */
  private getFunctionCallDescription(functionName: string): string {
    const descriptions: Record<string, string> = {
      'search_web': 'Searching the web',
      'analyze_content': 'Analyzing content',
      'generate_plan': 'Generating research plan',
      'compose_report': 'Composing report',
      'evaluate_quality': 'Evaluating quality',
      'get_search_results': 'Getting search results',
      'get_page_content': 'Fetching page content'
    };
    
    return descriptions[functionName] || `Running ${functionName}`;
  }

  /**
   * Get display name for agent
   */
  private getAgentDisplayName(agentName: string): string {
    const displayNames: Record<string, string> = {
      'interactive_planner_agent': 'Research Planner',
      'plan_generator': 'Plan Generator',
      'section_planner': 'Section Planner',
      'section_researcher': 'Researcher',
      'research_evaluator': 'Quality Evaluator',
      'enhanced_search_executor': 'Search Expert',
      'report_composer_with_citations': 'Report Composer',
      'research_pipeline': 'Research Pipeline',
      'iterative_refinement_loop': 'Refinement Loop',
      'escalation_checker': 'Completion Checker'
    };
    
    return displayNames[agentName] || agentName;
  }
}

// Create singleton instance with guard
let sseClientInstance: SSEClient | null = null;

function createSSEClient(): SSEClient {
  if (!sseClientInstance) {
    console.log('[SSE] Creating singleton SSE client instance');
    sseClientInstance = new SSEClient({
      url: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      maxRetries: 5,
      retryDelay: 1000
    });
  } else {
    console.log('[SSE] Returning existing SSE client instance');
  }
  return sseClientInstance;
}

// Export singleton instance
export const sseClient = createSSEClient();