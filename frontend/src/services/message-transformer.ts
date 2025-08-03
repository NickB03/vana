/**
 * Message Transformer for ADK Integration
 * Handles transformation between ADK and UI message formats
 */

import type {
  IMessageTransformer,
  Session,
  MessageMetadata,
  ADKRequestMessage
} from '../types/adk-service';
import type { ADKSSEEvent, UIEvent } from '../types/adk-events';
import { config } from '../lib/config';

interface AgentDisplayInfo {
  name: string;
  description: string;
  category: 'planner' | 'researcher' | 'composer' | 'evaluator' | 'executor';
}

interface ActionMapping {
  pattern: RegExp;
  description: string;
}

export class MessageTransformer implements IMessageTransformer {
  private readonly CLIENT_VERSION = '1.0.0';
  private readonly agentDisplayMap: Record<string, AgentDisplayInfo>;
  private readonly actionMappings: ActionMapping[];
  private readonly functionDescriptions: Record<string, string>;

  constructor() {
    this.agentDisplayMap = this.initializeAgentDisplayMap();
    this.actionMappings = this.initializeActionMappings();
    this.functionDescriptions = this.initializeFunctionDescriptions();
  }

  /**
   * Create ADK request message from user input
   */
  public createUserMessage(
    content: string,
    session: Session,
    metadata?: MessageMetadata
  ): ADKRequestMessage {
    const messageId = metadata?.messageId || this.generateMessageId();
    
    const message: ADKRequestMessage = {
      app_name: config.appName,
      user_id: session.userId,
      session_id: session.id,
      new_message: {
        role: 'user',
        parts: [{ text: content }]
      },
      streaming: true,
      metadata: {
        messageId,
        timestamp: metadata?.timestamp || Date.now(),
        clientVersion: this.CLIENT_VERSION,
        ...metadata
      }
    };

    return message;
  }

  /**
   * Transform ADK SSE event to UI events
   */
  public transformADKEvent(event: ADKSSEEvent): UIEvent[] {
    const uiEvents: UIEvent[] = [];

    // Handle agent thinking updates
    const thinkingUpdate = this.extractThinkingUpdate(event);
    if (thinkingUpdate) {
      uiEvents.push(thinkingUpdate);
    }

    // Handle content updates
    const contentUpdate = this.extractContentUpdate(event);
    if (contentUpdate) {
      uiEvents.push(contentUpdate);
    }

    // Handle workflow state changes
    const workflowUpdates = this.extractWorkflowUpdates(event);
    uiEvents.push(...workflowUpdates);

    return uiEvents;
  }

  /**
   * Extract thinking update from ADK event
   */
  public extractThinkingUpdate(event: ADKSSEEvent): UIEvent | null {
    // Only process events from agents (not user messages)
    if (!event.author || event.author === 'user') {
      return null;
    }

    const agentInfo = this.getAgentDisplayInfo(event.author);
    const action = this.extractActionFromEvent(event);

    return {
      type: 'thinking_update',
      data: {
        stepId: this.generateStepId(event.author),
        agent: agentInfo.name,
        action,
        status: 'active',
        timestamp: Date.now(),
        category: agentInfo.category
      }
    };
  }

  /**
   * Extract content update from ADK event
   */
  public extractContentUpdate(event: ADKSSEEvent): UIEvent | null {
    if (!event.content?.parts || event.content.parts.length === 0) {
      return null;
    }

    // Extract text content from parts
    let textContent = '';
    let hasContent = false;

    for (const part of event.content.parts) {
      if (part.text) {
        textContent += part.text;
        hasContent = true;
      }
    }

    if (!hasContent) {
      return null;
    }

    return {
      type: 'message_update',
      data: {
        messageId: this.generateMessageId(),
        content: textContent,
        isComplete: !event.partial,
        isPartial: Boolean(event.partial),
        format: 'markdown'
      }
    };
  }

  /**
   * Extract workflow updates from state changes
   */
  private extractWorkflowUpdates(event: ADKSSEEvent): UIEvent[] {
    const updates: UIEvent[] = [];

    if (event.actions?.stateDelta) {
      const stateDelta = event.actions.stateDelta;

      // Handle research plan updates
      if (stateDelta.research_plan) {
        updates.push({
          type: 'workflow_update',
          data: {
            phase: 'planning',
            status: 'complete',
            data: {
              plan: stateDelta.research_plan
            }
          }
        });
      }

      // Handle final report updates
      if (stateDelta.final_report_with_citations) {
        updates.push({
          type: 'workflow_update',
          data: {
            phase: 'reporting',
            status: 'complete',
            data: {
              report: stateDelta.final_report_with_citations,
              sources: stateDelta.sources || []
            }
          }
        });
      }

      // Handle URL mapping updates
      if (stateDelta.url_to_short_id) {
        updates.push({
          type: 'workflow_update',
          data: {
            phase: 'research',
            status: 'active',
            data: {
              urlMappings: stateDelta.url_to_short_id
            }
          }
        });
      }
    }

    return updates;
  }

  /**
   * Extract action description from event
   */
  private extractActionFromEvent(event: ADKSSEEvent): string {
    // Check for function calls first
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.functionCall) {
          return this.getFunctionCallDescription(part.functionCall.name);
        }
      }
    }

    // Check for text content
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text) {
          return this.extractActionFromText(part.text);
        }
      }
    }

    // Fallback based on agent name
    return this.getDefaultActionForAgent(event.author);
  }

  /**
   * Extract action from text content
   */
  private extractActionFromText(text: string): string {
    // Try action mappings first
    for (const mapping of this.actionMappings) {
      if (mapping.pattern.test(text)) {
        return mapping.description;
      }
    }

    // Extract first meaningful sentence
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length <= 60) {
      return firstLine;
    }

    return firstLine.substring(0, 57) + '...';
  }

  /**
   * Get function call description
   */
  private getFunctionCallDescription(functionName: string): string {
    return this.functionDescriptions[functionName] || `Executing ${functionName}`;
  }

  /**
   * Get agent display information
   */
  private getAgentDisplayInfo(agentName: string): AgentDisplayInfo {
    return this.agentDisplayMap[agentName] || {
      name: this.formatAgentName(agentName),
      description: 'Processing',
      category: 'executor'
    };
  }

  /**
   * Get default action for agent
   */
  private getDefaultActionForAgent(agentName: string): string {
    const agentInfo = this.getAgentDisplayInfo(agentName);
    return agentInfo.description;
  }

  /**
   * Format agent name for display
   */
  private formatAgentName(agentName: string): string {
    return agentName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Generate unique step ID
   */
  private generateStepId(agentName: string): string {
    return `step_${agentName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  }

  /**
   * Initialize agent display mapping
   */
  private initializeAgentDisplayMap(): Record<string, AgentDisplayInfo> {
    return {
      'interactive_planner_agent': {
        name: 'Research Planner',
        description: 'Planning research approach',
        category: 'planner'
      },
      'plan_generator': {
        name: 'Plan Generator',
        description: 'Generating research plan',
        category: 'planner'
      },
      'section_planner': {
        name: 'Section Planner',
        description: 'Planning report sections',
        category: 'planner'
      },
      'section_researcher': {
        name: 'Researcher',
        description: 'Conducting research',
        category: 'researcher'
      },
      'research_evaluator': {
        name: 'Quality Evaluator',
        description: 'Evaluating research quality',
        category: 'evaluator'
      },
      'enhanced_search_executor': {
        name: 'Search Expert',
        description: 'Executing search queries',
        category: 'executor'
      },
      'report_composer_with_citations': {
        name: 'Report Composer',
        description: 'Composing final report',
        category: 'composer'
      },
      'research_pipeline': {
        name: 'Research Pipeline',
        description: 'Coordinating research workflow',
        category: 'executor'
      },
      'iterative_refinement_loop': {
        name: 'Refinement Loop',
        description: 'Refining research results',
        category: 'evaluator'
      },
      'escalation_checker': {
        name: 'Completion Checker',
        description: 'Checking completion status',
        category: 'evaluator'
      }
    };
  }

  /**
   * Initialize action pattern mappings
   */
  private initializeActionMappings(): ActionMapping[] {
    return [
      { pattern: /searching|search/i, description: 'Searching for information' },
      { pattern: /analyzing|analysis/i, description: 'Analyzing content' },
      { pattern: /generating|creating/i, description: 'Generating content' },
      { pattern: /evaluating|assessing/i, description: 'Evaluating quality' },
      { pattern: /composing|writing/i, description: 'Writing report' },
      { pattern: /planning|organizing/i, description: 'Planning approach' },
      { pattern: /fetching|retrieving/i, description: 'Retrieving data' },
      { pattern: /processing|handling/i, description: 'Processing information' },
      { pattern: /reviewing|checking/i, description: 'Reviewing results' },
      { pattern: /refining|improving/i, description: 'Refining output' }
    ];
  }

  /**
   * Initialize function descriptions
   */
  private initializeFunctionDescriptions(): Record<string, string> {
    return {
      'search_web': 'Searching the web',
      'get_search_results': 'Getting search results',
      'get_page_content': 'Fetching page content',
      'analyze_content': 'Analyzing content', 
      'generate_plan': 'Generating research plan',
      'compose_report': 'Composing report',
      'evaluate_quality': 'Evaluating quality',
      'extract_citations': 'Extracting citations',
      'format_content': 'Formatting content',
      'validate_sources': 'Validating sources',
      'synthesize_information': 'Synthesizing information',
      'create_summary': 'Creating summary'
    };
  }
}