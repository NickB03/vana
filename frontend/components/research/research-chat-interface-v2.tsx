/**
 * Research Chat Interface V2 Component - Prompt-Kit Integration
 * 
 * Enhanced interface using prompt-kit components for improved styling and UX.
 * Maintains all existing functionality while providing modern chat interface.
 * Features: prompt-kit containers, ResponseStream, enhanced agent status badges.
 */

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { ChatProvider, useChatContext } from '@/contexts/chat-context';
import { ResearchProgressPanel } from './research-progress-panel';
import { ConnectionFallback, useConnectionHealth } from './connection-fallback';

// Prompt-Kit Components
import {
  ChatContainerRoot,
  ChatContainerContent, 
  ChatContainerScrollAnchor,
  ChatMessage,
  ChatInputContainer,
} from '@/components/ui/prompt-kit-chat-container';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/ui/prompt-input';
import { ResponseStream } from '@/components/ui/response-stream';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AgentStatusSidebar } from '@/components/ui/agent-status-sidebar';

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
  Router,
  Send,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
import type { ResearchSessionState, AgentStatus } from '@/lib/research-sse-service';
import type { ChatMessage as ChatMessageType } from '@/types/api';

// ============================================================================
// Feature Flag Configuration
// ============================================================================

const FEATURE_FLAGS = {
  usePromptKit: true,
  useResponseStream: true,
  enhancedAgentBadges: true,
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface ResearchChatInterfaceV2Props {
  className?: string;
}

// ============================================================================
// Enhanced Agent Status Badge with Prompt-Kit Styling
// ============================================================================

interface EnhancedAgentStatusBadgeProps {
  agent: AgentStatus;
  className?: string;
}

function EnhancedAgentStatusBadge({ agent, className }: EnhancedAgentStatusBadgeProps) {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 animate-pulse';
      case 'waiting':
        return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'current':
        return <Bot className="h-3 w-3 animate-pulse" />;
      case 'waiting':
        return <Clock className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 text-xs font-medium border transition-all duration-200',
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}
      <span>{agent.agent_type || agent.name}</span>
      {agent.progress !== undefined && agent.progress > 0 && (
        <span className="opacity-75">({Math.round(agent.progress * 100)}%)</span>
      )}
    </Badge>
  );
}

// ============================================================================
// Enhanced Research Status Indicator
// ============================================================================

interface ResearchStatusIndicatorV2Props {
  sessionState: ResearchSessionState | null;
  className?: string;
}

function ResearchStatusIndicatorV2({ sessionState, className }: ResearchStatusIndicatorV2Props) {
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
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{getStatusText()}</p>
        {sessionState.agents && sessionState.agents.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {sessionState.agents.filter((a: AgentStatus) => a.status === 'completed').length} of{' '}
              {sessionState.agents.length} agents completed
            </p>
            {FEATURE_FLAGS.enhancedAgentBadges && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {sessionState.agents.slice(0, 3).map((agent: AgentStatus, idx: number) => (
                  <EnhancedAgentStatusBadge key={`${agent.name}-${idx}`} agent={agent} />
                ))}
                {sessionState.agents.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{sessionState.agents.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
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
// Prompt-Kit Enhanced Chat Messages
// ============================================================================

interface PromptKitChatMessagesProps {
  className?: string;
}

function PromptKitChatMessages({ className }: PromptKitChatMessagesProps) {
  const { messages, streamingState, research } = useChatContext();

  // Enhanced message rendering with prompt-kit styling
  const renderEnhancedMessage = (message: ChatMessageType) => {
    const isUser = message.role === 'user';
    // isSystem variable removed as 'system' is not a valid role type for this message type
    const isResearchQuery = 'isResearchQuery' in message && message.isResearchQuery;
    const isResearchResult = message.isResearchResult;
    const isAgentResponse = message.isAgentResponse;

    // Research Query Message
    if (isResearchQuery) {
      return (
        <ChatMessage 
          key={message.id} 
          variant="user"
          className="mb-4"
        >
          <div className="flex flex-col gap-3 max-w-3xl">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-2xl px-4 py-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Research Query
                </span>
              </div>
              {FEATURE_FLAGS.useResponseStream ? (
                <ResponseStream
                  textStream={message.content}
                  mode="typewriter"
                  speed={50}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        </ChatMessage>
      );
    }

    // Research Result Message
    if (isResearchResult) {
      return (
        <ChatMessage 
          key={message.id} 
          variant="assistant"
          className="mb-4"
        >
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 max-w-4xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800 dark:text-green-200">Research Complete</h3>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {FEATURE_FLAGS.useResponseStream ? (
                  <ResponseStream
                    textStream={message.content}
                    mode="typewriter"
                    speed={40}
                    className="whitespace-pre-wrap text-sm"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </ChatMessage>
      );
    }

    // Agent Response Message
    if (isAgentResponse) {
      return (
        <ChatMessage 
          key={message.id} 
          variant="assistant"
          className="mb-4"
        >
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 max-w-4xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <h3 className="font-medium text-sm text-blue-800 dark:text-blue-200">
                  {message.agentType ? `${message.agentType} Agent` : 'Research Agent'}
                </h3>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {FEATURE_FLAGS.useResponseStream ? (
                  <ResponseStream
                    textStream={message.content}
                    mode="fade"
                    speed={60}
                    className="whitespace-pre-wrap text-sm"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </ChatMessage>
      );
    }

    // Regular message
    return (
      <ChatMessage 
        key={message.id} 
        variant={isUser ? "user" : "assistant"}
        className="mb-4"
      >
        <div className={cn(
          'max-w-3xl rounded-2xl px-4 py-3',
          isUser 
            ? 'bg-blue-600 text-white ml-auto' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}>
          {FEATURE_FLAGS.useResponseStream && !isUser ? (
            <ResponseStream
              textStream={message.content}
              mode="typewriter"
              speed={50}
              className="text-sm"
            />
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      </ChatMessage>
    );
  };

  // Show welcome screen when no messages
  if (messages.length === 0 && !streamingState.isStreaming) {
    return (
      <ChatContainerContent className={cn('justify-center items-center min-h-full', className)}>
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <Bot className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Multi-Agent Research Interface
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ask any research question to activate our AI agents
            </p>
          </div>
        </div>
      </ChatContainerContent>
    );
  }

  // Show messages with enhanced styling
  return (
    <ChatContainerContent className={className}>
      {messages.map((message) => renderEnhancedMessage(message))}
      
      {/* Research progress when active */}
      {research.isResearchActive && research.sessionState && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 mb-4">
          <CardContent className="p-4">
            <ResearchProgressPanel 
              sessionState={research.sessionState}
              isLoading={research.isLoading}
              error={research.error}
              onStart={() => {}}
              onStop={research.stopResearch}
              onRetry={research.clearError}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Streaming indicator */}
      {streamingState.isStreaming && (
        <ChatMessage variant="assistant" isStreaming className="mb-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-3xl">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 animate-pulse text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                AI is thinking...
              </span>
            </div>
            {streamingState.content && (
              <div className="mt-2">
                {FEATURE_FLAGS.useResponseStream ? (
                  <ResponseStream
                    textStream={streamingState.content}
                    mode="typewriter"
                    speed={50}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm">{streamingState.content}</p>
                )}
              </div>
            )}
            {streamingState.error && (
              <div className="mt-2 text-red-600 text-sm">
                {streamingState.error}
              </div>
            )}
          </div>
        </ChatMessage>
      )}
      
      <ChatContainerScrollAnchor />
    </ChatContainerContent>
  );
}

// ============================================================================
// Prompt-Kit Enhanced Chat Input
// ============================================================================

interface PromptKitChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function PromptKitChatInput({ onSendMessage, disabled = false, placeholder }: PromptKitChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, research } = useChatContext();
  
  const isResearchMode = true;
  const isResearchDisabled = research.isResearchActive;

  const handleSubmit = useCallback(() => {
    if (!message.trim() || disabled) return;
    
    if (onSendMessage) {
      onSendMessage(message);
    } else {
      sendMessage(message);
    }
    setMessage('');
  }, [message, disabled, onSendMessage, sendMessage]);

  const handleUploadClick = useCallback(() => {
    console.log('Upload clicked - to be implemented');
  }, []);

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isResearchMode) {
      return isResearchDisabled 
        ? "Research in progress..." 
        : "Enter your research query to start multi-agent analysis...";
    }
    return "What can I help you with today?";
  };

  return (
    <ChatInputContainer isLoading={disabled || isResearchDisabled}>
      {isResearchDisabled && (
        <div className="flex justify-center mb-3">
          <Badge variant="default" className="gap-1">
            <Bot className="h-3 w-3 animate-pulse" />
            Research Active
          </Badge>
        </div>
      )}
      
      <PromptInput
        value={message}
        onValueChange={setMessage}
        onSubmit={handleSubmit}
        maxHeight={200}
        className="w-full"
      >
        <div className="flex items-end gap-2">
          <PromptInputActions>
            <PromptInputAction tooltip="Attach file">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUploadClick}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
          
          <PromptInputTextarea 
            placeholder={getPlaceholder()}
            disabled={disabled || isResearchDisabled}
            className="flex-1 min-h-[44px] max-h-[200px]"
          />
          
          <PromptInputActions>
            <PromptInputAction tooltip="Send message">
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || disabled || isResearchDisabled}
                onClick={handleSubmit}
                className="h-8 w-8 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </div>
      </PromptInput>
    </ChatInputContainer>
  );
}

// ============================================================================
// Research Results Display V2
// ============================================================================

interface ResearchResultsDisplayV2Props {
  sessionState: ResearchSessionState | null;
  className?: string;
}

function ResearchResultsDisplayV2({ sessionState, className }: ResearchResultsDisplayV2Props) {
  if (!sessionState || !sessionState.finalReport) {
    return (
      <div className={cn('p-8 text-center text-gray-500', className)}>
        <Search className="h-12 w-12 mx-auto opacity-30 mb-4" />
        <p className="text-sm">Research results will appear here when complete</p>
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold">Research Complete</h3>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {FEATURE_FLAGS.useResponseStream ? (
              <ResponseStream
                textStream={sessionState.finalReport}
                mode="fade"
                speed={30}
                className="whitespace-pre-wrap"
              />
            ) : (
              <div className="whitespace-pre-wrap">
                {sessionState.finalReport}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Research Header V2 Component
// ============================================================================

interface ResearchHeaderV2Props {
  isResearchActive: boolean;
  sessionState: ResearchSessionState | null;
  connectionHealth?: 'good' | 'degraded' | 'poor';
}

function ResearchHeaderV2({ isResearchActive, sessionState, connectionHealth }: ResearchHeaderV2Props) {
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
          Multi-Agent Research Interface V2
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
// Inner Component with Chat Context and Enhanced Error Handling
// ============================================================================

function ResearchChatInterfaceV2Inner({ className }: ResearchChatInterfaceV2Props) {
  const [activeTab, setActiveTab] = useState('interface');
  const [lastErrorDismissed, setLastErrorDismissed] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<'good' | 'degraded' | 'poor'>('good');
  const { research, streamingState } = useChatContext();
  const { connectionState, updateConnectionState } = useConnectionHealth();
  
  const {
    sessionState,
    isConnected,
    isLoading,
    error,
    startResearch,
    stopResearch,
    clearError,
    isResearchActive,
    isResearchComplete,
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
  }, [sessionState, error, updateConnectionState]);

  const handleStartResearch = useCallback(async (query: string) => {
    try {
      setLastErrorDismissed(null);
      await startResearch(query);
    } catch (error) {
      console.error('[Research V2] Failed to start research:', error);
    }
  }, [startResearch]);
  
  const handleStopResearch = useCallback(() => {
    stopResearch();
  }, [stopResearch]);

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
    <div className={cn('flex flex-col h-full w-full', className)} data-testid="research-chat-interface-v2">
      {/* Research Header V2 */}
      <ResearchHeaderV2 
        isResearchActive={isResearchActive} 
        sessionState={sessionState}
        connectionHealth={connectionHealth}
      />
      
      {/* Research Status (when active) */}
      {sessionState && (
        <ResearchStatusIndicatorV2 
          sessionState={sessionState} 
          data-testid="research-status-v2" 
        />
      )}
      
      {/* Connection Status Banner for Degraded Connections */}
      {(connectionState.status === 'reconnecting' || 
        (isConnected && connectionHealth === 'degraded')) && (
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
      )}
      
      {/* Main Content with Enhanced Tabs and Agent Status Sidebar */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-hidden min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
                <TabsList className="w-full">
                  <TabsTrigger value="interface" className="flex-1 gap-2">
                    <Bot className="h-4 w-4" />
                    Interface
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="flex-1 gap-2">
                    <Users className="h-4 w-4" />
                    Progress
                  </TabsTrigger>
                  {isResearchComplete && (
                    <TabsTrigger value="results" className="flex-1 gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Results
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="interface" className="h-full m-0">
                  <div className="flex flex-col h-full">
                    <ChatContainerRoot className="flex-1">
                      <PromptKitChatMessages />
                    </ChatContainerRoot>
                    <PromptKitChatInput
                      onSendMessage={handleStartResearch}
                      disabled={connectionHealth === 'poor'}
                      placeholder={
                        connectionHealth === 'poor'
                          ? 'Connection issues - please wait...'
                          : isResearchActive
                          ? 'Research in progress...'
                          : 'Enter your research query to start multi-agent analysis...'
                      }
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="progress" className="h-full m-0 p-4 overflow-auto">
                  <ResearchProgressPanel
                    sessionState={sessionState}
                    isLoading={isLoading}
                    error={error}
                    onStart={() => {
                      console.log('Start research clicked from progress tab');
                    }}
                    onStop={handleStopResearch}
                    onRetry={handleRetryResearch}
                  />
                </TabsContent>
                
                {isResearchComplete && (
                  <TabsContent value="results" className="h-full m-0 p-4 overflow-auto">
                    <ResearchResultsDisplayV2 sessionState={sessionState} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
          
          {/* Agent Status Sidebar - Only show when agents are active */}
          {sessionState && sessionState.agents && sessionState.agents.length > 0 && (
            <AgentStatusSidebar
              agents={sessionState.agents}
              isConnected={isConnected}
              streamingStatus={connectionHealth === 'good' ? 'active' : connectionHealth === 'degraded' ? 'idle' : 'error'}
              showConnectionHealth={true}
              position="right"
              defaultCollapsed={false}
              onAgentClick={(agent) => {
                console.log('Agent clicked:', agent.name);
                // Could show agent details in a modal or switch to progress tab
                if (activeTab !== 'progress') {
                  setActiveTab('progress');
                }
              }}
              className="border-l border-gray-200 dark:border-gray-800"
            />
          )}
        </div>
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
// Main Research Chat Interface V2 Component
// ============================================================================

export function ResearchChatInterfaceV2({ className }: ResearchChatInterfaceV2Props) {
  return (
    <ChatProvider>
      <ResearchChatInterfaceV2Inner className={className} />
    </ChatProvider>
  );
}

export default ResearchChatInterfaceV2;