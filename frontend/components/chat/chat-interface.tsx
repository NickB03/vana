"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { ChatProvider, useChatContext } from '@/contexts/chat-context';

// Prompt-Kit Components
import { ChatContainerRoot } from '@/components/ui/prompt-kit-chat-container';
import { ChatPromptInput } from '@/components/prompt-kit/prompt-input';
import { ChatMessagesPromptKit } from './chat-messages-prompt-kit';

// Research Components
import { ConnectionFallback, useConnectionHealth } from '@/components/research/connection-fallback';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Icons
import { 
  Search, 
  Bot, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Router
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
import type { ResearchSessionState, AgentStatus } from '@/lib/research-sse-service';

// ============================================================================
// Type Definitions
// ============================================================================

interface ChatInterfaceProps {
  className?: string;
}

// ============================================================================
// Enhanced Agent Status Display
// ============================================================================

interface AgentStatusCardsProps {
  sessionState: ResearchSessionState | null;
  className?: string;
}

function AgentStatusCards({ sessionState, className }: AgentStatusCardsProps) {
  if (!sessionState?.agents || sessionState.agents.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'current':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 animate-pulse';
      case 'pending':
        return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      case 'failed':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'current':
        return <Bot className="h-4 w-4 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden",
      "bg-background/95 backdrop-blur-sm",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 p-4 border-b border-border">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">
          Research Agents ({sessionState.agents.filter(a => a.status === 'completed').length}/{sessionState.agents.length})
        </span>
      </div>
      
      {/* Agent Cards Grid with Proper Responsive Design */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4",
        "grid gap-3",
        // Mobile: Single column
        "grid-cols-1",
        // Tablet: Two columns for mobile landscape
        "sm:grid-cols-2 sm:gap-4",
        // Desktop sidebar: Single column with proper spacing  
        "lg:grid-cols-1 lg:gap-3",
        // Ensure proper scroll behavior
        "scroll-smooth"
      )}>
        {sessionState.agents.map((agent: AgentStatus, idx: number) => (
          <div
            key={`${agent.name}-${idx}`}
            className={cn(
              // Base card styling
              "p-4 rounded-lg border transition-all duration-200",
              "hover:shadow-md hover:-translate-y-0.5",
              "focus-within:ring-2 focus-within:ring-primary/20",
              // Status-based coloring with better contrast
              getStatusColor(agent.status),
              // Active animation
              agent.status === 'current' && "ring-2 ring-blue-200 dark:ring-blue-800"
            )}
          >
            {/* Agent Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {getStatusIcon(agent.status)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {agent.agent_type || agent.name}
                  </div>
                  {agent.name !== (agent.agent_type || agent.name) && (
                    <div className="text-xs opacity-70 truncate">
                      {agent.name}
                    </div>
                  )}
                </div>
              </div>
              {agent.progress !== undefined && agent.progress > 0 && (
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {Math.round(agent.progress * 100)}%
                </Badge>
              )}
            </div>
            
            {/* Current Task */}
            {agent.current_task && (
              <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {agent.current_task}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Research Status Indicator
// ============================================================================

interface ResearchStatusIndicatorProps {
  sessionState: ResearchSessionState | null;
  className?: string;
}

function ResearchStatusIndicator({ sessionState, className }: ResearchStatusIndicatorProps) {
  if (!sessionState) return null;
  
  const getStatusIcon = () => {
    switch (sessionState.status) {
      case 'running':
        return <Bot className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-yellow-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (sessionState.status) {
      case 'connecting':
        return 'Connecting to research agents...';
      case 'connected':
        return 'Connected - Ready to start research';
      case 'running':
        return `${sessionState.currentPhase} - ${Math.round(sessionState.overallProgress * 100)}%`;
      case 'completed':
        return 'Research complete - Report ready!';
      case 'error':
        return sessionState.error || 'Research failed';
      case 'disconnected':
        return 'Connection lost - Attempting to reconnect';
      default:
        return 'Ready to start research';
    }
  };
  
  const getStatusBgColor = () => {
    switch (sessionState.status) {
      case 'running':
      case 'connected':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'disconnected':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-3 border-b transition-colors duration-200',
      getStatusBgColor(),
      className
    )}>
      {getStatusIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium">{getStatusText()}</p>
        {sessionState.agents && sessionState.agents.length > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {sessionState.agents.filter((a: AgentStatus) => a.status === 'completed').length} of{' '}
            {sessionState.agents.length} agents completed
          </p>
        )}
      </div>
      {sessionState.status === 'running' && (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-blue-500" />
          <span className="text-xs text-blue-600">
            {sessionState.agents?.filter((a: AgentStatus) => a.status === 'current').length || 0} active
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Chat Header Component
// ============================================================================

interface ChatHeaderProps {
  isResearchActive: boolean;
  sessionState: ResearchSessionState | null;
  connectionHealth?: 'good' | 'degraded' | 'poor';
}

function ChatHeader({ isResearchActive, sessionState, connectionHealth }: ChatHeaderProps) {
  const getConnectionIcon = () => {
    switch (connectionHealth) {
      case 'good':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <Router className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Search className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
      <div className="flex items-center gap-2 flex-1">
        {getConnectionIcon()}
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Unified Multi-Agent Chat Interface
        </span>
        <Badge variant="secondary" className="text-xs">
          Prompt-Kit Enhanced
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        {connectionHealth && connectionHealth !== 'good' && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Router className="h-3 w-3" />
            {connectionHealth}
          </Badge>
        )}
        
        {isResearchActive && (
          <Badge variant="default" className="gap-1">
            <Bot className="h-3 w-3 animate-pulse" />
            Research Active
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Inner Component with Chat Context
// ============================================================================

function ChatInterfaceInner({ className }: ChatInterfaceProps) {
  const [lastErrorDismissed, setLastErrorDismissed] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<'good' | 'degraded' | 'poor'>('good');
  const { research, streamingState } = useChatContext();
  const { connectionState, updateConnectionState } = useConnectionHealth();
  
  const {
    sessionState,
    isConnected,
    error,
    stopResearch,
    clearError,
    isResearchActive,
  } = research;
  
  // Update connection state based on research state
  useEffect(() => {
    if (sessionState) {
      const status = sessionState.status;
      if (status === 'connected' || status === 'running') {
        updateConnectionState({ 
          status: 'connected',
          error: undefined 
        });
        setConnectionHealth('good');
      } else if (status === 'connecting') {
        updateConnectionState({ status: 'connecting' });
        setConnectionHealth('degraded');
      } else if (status === 'completed') {
        // Reset research session after completion to allow new queries
        updateConnectionState({ 
          status: 'connected',
          error: undefined 
        });
        setConnectionHealth('good');
        // Automatically stop research after a brief delay to allow UI to show completion
        setTimeout(() => {
          stopResearch();
        }, 2000);
      } else if (status === 'error') {
        updateConnectionState({ 
          status: 'error',
          error: sessionState.error || 'Research session failed'
        });
        setConnectionHealth('poor');
      } else if (status === 'disconnected') {
        updateConnectionState({ 
          status: 'disconnected',
          error: 'Connection to research service lost'
        });
        setConnectionHealth('poor');
      }
    } else if (error) {
      updateConnectionState({ 
        status: 'error',
        error: error
      });
      setConnectionHealth('poor');
    }
  }, [sessionState, error, updateConnectionState, stopResearch]);

  const { sendMessage } = useChatContext();
  
  const handleStartResearch = useCallback(async (query: string) => {
    try {
      setLastErrorDismissed(null);
      console.log('[Chat Interface] Sending message via context:', query);
      // Use the context sendMessage to properly add the message to chat
      await sendMessage(query);
    } catch (error) {
      console.error('[Chat] Failed to start research:', error);
    }
  }, [sendMessage]);

  const handleRetryResearch = useCallback(() => {
    clearError();
    setLastErrorDismissed(null);
  }, [clearError]);
  
  const handleRetryConnection = useCallback(async () => {
    clearError();
    setLastErrorDismissed(null);
    
    updateConnectionState({ 
      status: 'connecting',
      error: undefined 
    });
    
    setTimeout(() => {
      updateConnectionState({ status: 'connected' });
      setConnectionHealth('good');
    }, 2000);
  }, [clearError, updateConnectionState]);
  
  const handleDismissError = useCallback(() => {
    const currentError = error || streamingState.error;
    if (currentError) {
      setLastErrorDismissed(currentError);
      clearError();
    }
  }, [error, streamingState.error, clearError]);
  
  // Determine if we should show connection fallback
  const shouldShowConnectionFallback = (
    (connectionState.status === 'error' || connectionState.status === 'disconnected') &&
    lastErrorDismissed !== (error || streamingState.error)
  );

  return (
    <div className={cn('flex flex-col h-full min-w-0 overflow-hidden', className)} data-testid="chat-interface">
      {/* Research Status (when active) - Moved to be minimal */}
      {sessionState && (
        <div className="flex-shrink-0">
          <ResearchStatusIndicator 
            sessionState={sessionState} 
            data-testid="research-status" 
          />
        </div>
      )}
      
      {/* Connection Status Banner for Degraded Connections - Only when needed */}
      {(connectionState.status === 'reconnecting' || 
        (isConnected && connectionHealth === 'degraded')) && (
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 flex-1">
              {connectionState.status === 'reconnecting' ? (
                <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
              ) : (
                <Router className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {connectionState.status === 'reconnecting' ? 'Reconnecting...' : 'Connection unstable'}
              </span>
            </div>
            <Badge variant="outline" className="border-yellow-300 text-yellow-700">
              {connectionHealth}
            </Badge>
          </div>
        </div>
      )}
      
      {/* Main Content Area - Full Height Flex Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Chat Messages Container with Proper Grid Layout */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          <ChatContainerRoot className="flex-1 min-h-0 overflow-y-auto">
            <ChatMessagesPromptKit />
          </ChatContainerRoot>
        </div>
        
        {/* Agent Status Sidebar - Desktop Only, Mobile uses Bottom Panel */}
        {isResearchActive && sessionState && (
          <div className="hidden lg:flex lg:w-80 lg:border-l lg:border-gray-200 lg:dark:border-gray-800 flex-shrink-0 flex-col overflow-hidden" data-testid="agent-status-sidebar">
            <AgentStatusCards 
              sessionState={sessionState} 
              className="h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/20"
            />
          </div>
        )}
        
        {/* Mobile Agent Status - Bottom Panel */}
        {isResearchActive && sessionState && (
          <div className="lg:hidden flex-shrink-0 max-h-48 border-t border-gray-200 dark:border-gray-800">
            <AgentStatusCards 
              sessionState={sessionState} 
              className="h-full overflow-y-auto"
            />
          </div>
        )}
      </div>
      
      {/* Bottom Section - Input Only */}
      <div className="flex-shrink-0">
        {/* Chat Input */}
        <ChatPromptInput
          onSendMessage={handleStartResearch}
          disabled={connectionHealth === 'poor'}
          loading={isResearchActive}
          isResearchMode={true}
          researchActive={isResearchActive}
          placeholder={
            connectionHealth === 'poor'
              ? 'Connection issues - please wait...'
              : undefined
          }
        />
      </div>
      
      {/* Connection Status and Error Handling */}
      {shouldShowConnectionFallback && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <ConnectionFallback
            connectionState={connectionState}
            onRetry={handleRetryConnection}
            onDismiss={handleDismissError}
            showDetails={true}
          />
        </div>
      )}
      
      {/* Fallback for other errors */}
      {(error || streamingState.error) && 
       !shouldShowConnectionFallback && 
       lastErrorDismissed !== (error || streamingState.error) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error || streamingState.error}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryResearch}
                className="text-red-600 hover:text-red-800 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissError}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Chat Interface Component
// ============================================================================

export function ChatInterface({ className }: ChatInterfaceProps) {
  return (
    <ChatProvider>
      <ChatInterfaceInner className={className} />
    </ChatProvider>
  );
}

export default ChatInterface;