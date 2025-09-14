/**
 * SSE to Prompt-Kit ResponseStream Adapter
 * 
 * Converts Server-Sent Events from research streaming into ResponseStream-compatible format.
 * Transforms SSE events to stream chunks while preserving agent status and partial results.
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

export class SSEToResponseStreamAdapter {
  private streamController: ReadableStreamDefaultController<string> | null = null;
  private accumulatedContent = '';
  private lastMetadata: ResponseStreamData['metadata'] | null = null;

  /**
   * Creates an AsyncIterable stream from SSE events for ResponseStream consumption
   */
  createResponseStreamData(sessionState: ResearchSessionState | null): ResponseStreamData {
    // Create readable stream that can be consumed as AsyncIterable
    const stream = new ReadableStream<string>({
      start: (controller) => {
        this.streamController = controller;
      },
      cancel: () => {
        this.streamController = null;
      }
    });

    // Convert ReadableStream to AsyncIterable
    const asyncIterable = this.readableStreamToAsyncIterable(stream);

    // Initialize metadata
    const metadata: ResponseStreamData['metadata'] = {
      agents: sessionState?.agents || [],
      connectionHealth: this.mapSessionStatusToConnectionHealth(sessionState?.status || 'disconnected'),
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
   * Processes SSE events and updates the response stream
   */
  processSSEEvent(event: ResearchSSEEvent): void {
    if (!this.streamController) return;

    try {
      const chunk = this.eventToStreamChunk(event);
      if (chunk) {
        // Add the new content to accumulated content
        this.accumulatedContent += chunk.content;
        
        // Push the new chunk to the stream
        this.streamController.enqueue(chunk.content);

        // Update metadata if it's a research_progress event
        if (event.type === 'research_progress') {
          this.updateMetadata(event);
        }
      }
    } catch (error) {
      console.error('[SSE-ResponseStream Adapter] Error processing event:', error);
    }
  }

  /**
   * Completes the response stream
   */
  completeStream(finalReport?: string | null): void {
    if (!this.streamController) return;

    try {
      // If we have a final report and it's different from accumulated content, add it
      if (finalReport && finalReport !== this.accumulatedContent) {
        const additionalContent = finalReport.replace(this.accumulatedContent, '');
        if (additionalContent) {
          this.streamController.enqueue(additionalContent);
        }
      }

      this.streamController.close();
      this.streamController = null;
    } catch (error) {
      console.error('[SSE-ResponseStream Adapter] Error completing stream:', error);
    }
  }

  /**
   * Handles stream errors
   */
  errorStream(error: string): void {
    if (!this.streamController) return;

    try {
      this.streamController.error(new Error(error));
      this.streamController = null;
    } catch (err) {
      console.error('[SSE-ResponseStream Adapter] Error handling stream error:', err);
    }
  }

  /**
   * Gets the current metadata
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
   * Resets the adapter state
   */
  reset(): void {
    if (this.streamController) {
      try {
        this.streamController.close();
      } catch (error) {
        // Controller might already be closed
      }
      this.streamController = null;
    }
    this.accumulatedContent = '';
    this.lastMetadata = null;
  }

  // Private methods

  private eventToStreamChunk(event: ResearchSSEEvent): StreamChunk | null {
    switch (event.type) {
      case 'research_progress':
        return this.progressEventToChunk(event);
      case 'research_complete':
        return this.completeEventToChunk(event);
      case 'connection':
        return null; // Connection events don't add content
      case 'research_started':
        return {
          content: '', // Start events don't add content initially
          metadata: {
            type: 'progress',
            timestamp: event.timestamp,
            phase: 'Research Started',
            progress: 0
          }
        };
      case 'error':
        return {
          content: `\n\n**Error:** ${event.error}\n`,
          metadata: {
            type: 'progress',
            timestamp: event.timestamp,
          }
        };
      default:
        return null;
    }
  }

  private progressEventToChunk(event: ResearchProgressEvent): StreamChunk {
    let content = '';

    // Process partial results to extract new content
    if (event.partial_results) {
      content = this.extractPartialResultsContent(event.partial_results);
    }

    // If we have a current phase change, add it as a section header
    if (event.current_phase && !this.accumulatedContent.includes(event.current_phase)) {
      content = `\n## ${event.current_phase}\n${content}`;
    }

    return {
      content,
      metadata: {
        type: 'partial_result',
        timestamp: event.timestamp,
        agents: event.agents,
        phase: event.current_phase,
        progress: event.overall_progress
      }
    };
  }

  private completeEventToChunk(event: { type: 'research_complete'; final_report?: string | null; timestamp: string }): StreamChunk {
    const finalContent = event.final_report || '';
    
    // Only add content that's not already in accumulated content
    const newContent = finalContent.replace(this.accumulatedContent, '');
    
    return {
      content: newContent,
      metadata: {
        type: 'completion',
        timestamp: event.timestamp,
      }
    };
  }

  private extractPartialResultsContent(partialResults: Record<string, unknown>): string {
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
      this.lastMetadata.connectionHealth = this.mapSessionStatusToConnectionHealth(event.status);
    }
  }

  private mapSessionStatusToConnectionHealth(status: string): 'connected' | 'disconnected' | 'error' | 'connecting' {
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
        return 'connected'; // Keep as connected when completed
      case 'disconnected':
      default:
        return 'disconnected';
    }
  }

  private async* readableStreamToAsyncIterable(stream: ReadableStream<string>): AsyncIterable<string> {
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
 * Utility function to create a new adapter instance
 */
export function createSSEResponseStreamAdapter(): SSEToResponseStreamAdapter {
  return new SSEToResponseStreamAdapter();
}