/**
 * Response Stream Adapter for SSE Integration
 * 
 * Converts SSE events to ResponseStream format for unified streaming experience.
 * Maintains compatibility with existing SSE service while adding ResponseStream support.
 */

import { ResearchProgressEvent, ResearchSSEEvent, ResearchSessionState, AgentStatus } from '@/lib/research-sse-service';

export interface StreamChunk {
  content: string;
  metadata?: {
    type: 'progress' | 'partial_result' | 'agent_update' | 'completion';
    timestamp: string;
    agents?: AgentStatus[];
    phase?: string;
    progress?: number;
  };
}

export interface ResponseStreamData {
  textStream: AsyncIterable<string>;
  metadata: {
    agents: AgentStatus[];
    connectionHealth: 'connected' | 'disconnected' | 'error' | 'connecting';
    overallProgress: number;
    currentPhase: string;
    sessionId: string;
  };
}

/**
 * Converts SSE events to ResponseStream-compatible async iterable
 */
export class ResponseStreamAdapter {
  private streamController: ReadableStreamDefaultController<string> | null = null;
  private accumulatedContent = '';
  private lastMetadata: ResponseStreamData['metadata'] | null = null;
  private isStreamClosed = false;

  /**
   * Creates ResponseStream data from session state
   */
  createResponseStreamData(sessionState: ResearchSessionState | null): ResponseStreamData {
    // Reset state for new stream
    this.reset();
    
    // Create readable stream
    const stream = new ReadableStream<string>({
      start: (controller) => {
        this.streamController = controller;
        this.isStreamClosed = false;
      },
      cancel: () => {
        this.cleanup();
      }
    });

    // Convert to async iterable
    const asyncIterable = this.streamToAsyncIterable(stream);

    // Initialize metadata
    const metadata: ResponseStreamData['metadata'] = {
      agents: sessionState?.agents || [],
      connectionHealth: this.mapStatusToHealth(sessionState?.status || 'disconnected'),
      overallProgress: sessionState?.overallProgress || 0,
      currentPhase: sessionState?.currentPhase || 'Initializing',
      sessionId: sessionState?.sessionId || 'unknown',
    };

    this.lastMetadata = metadata;

    return {
      textStream: asyncIterable,
      metadata
    };
  }

  /**
   * Processes SSE events and updates the stream
   */
  processSSEEvent(event: ResearchSSEEvent): void {
    if (!this.streamController || this.isStreamClosed) return;

    try {
      const content = this.extractContentFromEvent(event);
      
      if (content) {
        this.accumulatedContent += content;
        this.streamController.enqueue(content);
      }

      // Update metadata for progress events
      if (event.type === 'research_progress') {
        this.updateMetadata(event);
      }
    } catch (error) {
      console.error('[ResponseStream Adapter] Error processing event:', error);
    }
  }

  /**
   * Completes the stream
   */
  completeStream(finalReport?: string | null): void {
    if (!this.streamController || this.isStreamClosed) return;

    try {
      // Add any final content that wasn't streamed yet
      if (finalReport && finalReport !== this.accumulatedContent) {
        const remainingContent = finalReport.slice(this.accumulatedContent.length);
        if (remainingContent) {
          this.streamController.enqueue(remainingContent);
        }
      }

      this.streamController.close();
      this.cleanup();
    } catch (error) {
      console.error('[ResponseStream Adapter] Error completing stream:', error);
    }
  }

  /**
   * Handles stream errors
   */
  errorStream(error: string): void {
    if (!this.streamController || this.isStreamClosed) return;

    try {
      this.streamController.error(new Error(error));
      this.cleanup();
    } catch (err) {
      console.error('[ResponseStream Adapter] Error handling stream error:', err);
    }
  }

  /**
   * Gets current metadata
   */
  getMetadata(): ResponseStreamData['metadata'] | null {
    return this.lastMetadata;
  }

  /**
   * Gets accumulated content
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }

  /**
   * Resets adapter state
   */
  reset(): void {
    this.cleanup();
    this.accumulatedContent = '';
    this.lastMetadata = null;
  }

  // Private methods

  private cleanup(): void {
    if (this.streamController && !this.isStreamClosed) {
      try {
        this.streamController.close();
      } catch (error) {
        // Stream might already be closed
      }
    }
    this.streamController = null;
    this.isStreamClosed = true;
  }

  private extractContentFromEvent(event: ResearchSSEEvent): string {
    switch (event.type) {
      case 'research_progress':
        return this.extractProgressContent(event);
      case 'research_complete':
        return this.extractCompleteContent(event);
      case 'research_started':
        return ''; // Start events don't add content initially
      case 'error':
        return `\n\n**Error:** ${event.error}\n`;
      case 'connection':
        return ''; // Connection events don't add content
      default:
        return '';
    }
  }

  private extractProgressContent(event: ResearchProgressEvent): string {
    let content = '';

    // Add phase header if it's a new phase
    if (event.current_phase && !this.accumulatedContent.includes(event.current_phase)) {
      content += `\n## ${event.current_phase}\n`;
    }

    // Extract content from partial results
    if (event.partial_results) {
      const newContent = this.extractPartialResults(event.partial_results);
      content += newContent;
    }

    return content;
  }

  private extractCompleteContent(event: { final_report?: string | null }): string {
    const finalReport = event.final_report || '';
    
    // Only return content that hasn't been streamed yet
    if (finalReport.length > this.accumulatedContent.length) {
      return finalReport.slice(this.accumulatedContent.length);
    }
    
    return '';
  }

  private extractPartialResults(partialResults: Record<string, unknown>): string {
    let content = '';
    
    Object.entries(partialResults).forEach(([_agentType, result]) => {
      if (result && typeof result === 'object' && 'content' in result) {
        const resultContent = (result as { content: string }).content;
        if (resultContent && !this.accumulatedContent.includes(resultContent)) {
          content += `${resultContent}\n\n`;
        }
      }
    });

    return content;
  }

  private updateMetadata(event: ResearchProgressEvent): void {
    if (this.lastMetadata) {
      this.lastMetadata.agents = event.agents;
      this.lastMetadata.overallProgress = event.overall_progress;
      this.lastMetadata.currentPhase = event.current_phase;
      this.lastMetadata.connectionHealth = this.mapStatusToHealth(event.status);
    }
  }

  private mapStatusToHealth(status: string): 'connected' | 'disconnected' | 'error' | 'connecting' {
    switch (status) {
      case 'connecting':
      case 'initializing':
        return 'connecting';
      case 'connected':
      case 'running':
        return 'connected';
      case 'error':
        return 'error';
      case 'completed':
        return 'connected';
      case 'disconnected':
      default:
        return 'disconnected';
    }
  }

  private async* streamToAsyncIterable(stream: ReadableStream<string>): AsyncIterable<string> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Creates a new ResponseStream adapter instance
 */
export function createResponseStreamAdapter(): ResponseStreamAdapter {
  return new ResponseStreamAdapter();
}

/**
 * Utility to convert session state to streaming format
 */
export function sessionStateToStreamingContent(sessionState: ResearchSessionState): string {
  let content = '';

  // Add current phase
  if (sessionState.currentPhase) {
    content += `## ${sessionState.currentPhase}\n\n`;
  }

  // Add partial results
  if (sessionState.partialResults) {
    Object.entries(sessionState.partialResults).forEach(([_agentType, result]) => {
      if (result && typeof result === 'object' && 'content' in result) {
        const resultContent = (result as { content: string }).content;
        if (resultContent) {
          content += `${resultContent}\n\n`;
        }
      }
    });
  }

  // Add final report if available
  if (sessionState.finalReport) {
    content = sessionState.finalReport;
  }

  return content;
}