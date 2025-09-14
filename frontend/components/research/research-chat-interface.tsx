/**
 * Research Chat Interface Component
 * 
 * Enhanced interface that ONLY uses multi-agent research through ADK.
 * Features comprehensive error handling, connection monitoring, and fallback UI.
 * Now supports both original and prompt-kit enhanced versions via feature flags.
 */

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { ResearchChatInterfaceV2 } from './research-chat-interface-v2';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatProvider, useChatContext } from '@/contexts/chat-context';
import { ResearchProgressPanel } from './research-progress-panel';
import { ConnectionFallback, useConnectionHealth } from './connection-fallback';
import { AgentStatusSidebar } from '@/components/ui/agent-status-sidebar';
import { ResearchStatusIntegration } from '@/components/ui/research-status-integration';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

// ============================================================================
// Type Definitions
// ============================================================================

import type { ResearchSessionState, AgentStatus } from '@/lib/research-sse-service';

interface ResearchChatInterfaceProps {
  className?: string;
}

// ============================================================================
// Research Status Indicator with Enhanced Error States
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
      'flex items-center gap-2 px-3 py-2 border-b',
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
// Research Results Display
// ============================================================================

interface ResearchResultsDisplayProps {
  sessionState: ResearchSessionState | null;
  className?: string;
}

function ResearchResultsDisplay({ sessionState, className }: ResearchResultsDisplayProps) {
  if (!sessionState || !sessionState.finalReport) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        <Search className="h-8 w-8 mx-auto opacity-50 mb-2" />
        <p className="text-sm">Research results will appear here when complete</p>
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Research Complete</h3>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm">
              {sessionState.finalReport}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Research Header Component
// ============================================================================

interface ResearchHeaderProps {
  isResearchActive: boolean;
  sessionState: ResearchSessionState | null;
  connectionHealth?: 'good' | 'degraded' | 'poor';
}

function ResearchHeader({ isResearchActive, sessionState, connectionHealth }: ResearchHeaderProps) {
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
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
      <div className="flex items-center gap-2 flex-1">
        {getConnectionIcon()}
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Multi-Agent Research Interface
        </span>
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

function ResearchChatInterfaceInner({ className }: ResearchChatInterfaceProps) {
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
      console.error('[Research] Failed to start research:', error);
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
    // Clear any existing errors
    clearError();
    setLastErrorDismissed(null);
    
    updateConnectionState({ 
      status: 'connecting',
      error: undefined 
    });
    
    // Simulate connection attempt - in reality this would trigger actual reconnection
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
    <div className={cn('flex flex-col h-full w-full', className)} data-testid="chat-interface">
      {/* Research Header */}
      <ResearchHeader 
        isResearchActive={isResearchActive} 
        sessionState={sessionState}
        connectionHealth={connectionHealth}
      />
      
      {/* Research Status (when active) */}
      {sessionState && (
        <ResearchStatusIndicator 
          sessionState={sessionState} 
          data-testid="research-status" 
        />
      )}
      
      {/* Connection Status Banner for Degraded Connections */}
      {(connectionState.status === 'reconnecting' || 
        (isConnected && connectionHealth === 'degraded')) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
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
      
      {/* Agent Status Popup Integration */}
      {featureFlags.useAgentStatusPopup && (
        <ResearchStatusIntegration
          sessionState={sessionState}
          isResearchActive={isResearchActive}
          mode="full"
          position="inline"
        />
      )}
      
      {/* Main Content with Agent Status Sidebar */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-hidden min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList className="w-full">
                  <TabsTrigger value="interface" className="flex-1">
                    Interface
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="flex-1">
                    Progress
                  </TabsTrigger>
                  {isResearchComplete && (
                    <TabsTrigger value="results" className="flex-1">
                      Results
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="interface" className="h-full m-0">
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-hidden">
                      <ChatMessages />
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-800">
                      <ChatInput
                        onSendMessage={handleStartResearch}
                        disabled={isResearchActive || connectionHealth === 'poor'}
                        placeholder={
                          connectionHealth === 'poor'
                            ? 'Connection issues - please wait...'
                            : isResearchActive
                            ? 'Research in progress...'
                            : 'Enter your research query to start multi-agent analysis...'
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="progress" className="h-full m-0 p-4 overflow-auto">
                  <ResearchProgressPanel
                    sessionState={sessionState}
                    isLoading={isLoading}
                    error={error}
                    onStart={() => {
                      // This would need to be connected to a research query input
                      console.log('Start research clicked');
                    }}
                    onStop={handleStopResearch}
                    onRetry={handleRetryResearch}
                  />
                </TabsContent>
                
                {isResearchComplete && (
                  <TabsContent value="results" className="h-full m-0 p-4 overflow-auto">
                    <ResearchResultsDisplay sessionState={sessionState} />
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
                // Switch to progress tab when agent is clicked
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
// Main Research Chat Interface Component with Version Selection
// ============================================================================

export function ResearchChatInterface({ className }: ResearchChatInterfaceProps) {
  // Use feature flag to determine which version to render
  if (featureFlags.usePromptKitInterface) {
    return <ResearchChatInterfaceV2 className={className} />;
  }
  
  // Fall back to original version
  return (
    <ChatProvider>
      <ResearchChatInterfaceInner className={className} />
    </ChatProvider>
  );
}

export default ResearchChatInterface;