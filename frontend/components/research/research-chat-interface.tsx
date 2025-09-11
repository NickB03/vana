/**
 * Research Chat Interface Component
 * 
 * Enhanced chat interface that integrates real-time multi-agent research
 * streaming with the existing chat functionality.
 */

"use client";

import React, { useState, useCallback } from 'react';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatProvider } from '@/contexts/chat-context';
import { ResearchProgressPanel } from './research-progress-panel';
import { useResearchSSE } from '@/hooks/use-research-sse';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Search, 
  Bot, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock
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
// Research Mode Toggle Component
// ============================================================================

interface ResearchModeToggleProps {
  isResearchMode: boolean;
  onToggle: (enabled: boolean) => void;
  isResearchActive: boolean;
}

function ResearchModeToggle({ isResearchMode, onToggle, isResearchActive }: ResearchModeToggleProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant={isResearchMode ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(!isResearchMode)}
          disabled={isResearchActive}
          className="gap-1"
          aria-label="Switch to chat mode"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
        <Button
          variant={!isResearchMode ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(!isResearchMode)}
          disabled={isResearchActive}
          className="gap-1"
          aria-label="Switch to research mode"
        >
          <Search className="h-4 w-4" />
          Research
        </Button>
      </div>
      
      {isResearchActive && (
        <Badge variant="default" className="gap-1">
          <Bot className="h-3 w-3 animate-pulse" />
          Research Active
        </Badge>
      )}
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
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (sessionState.status) {
      case 'connecting':
        return 'Connecting to research agents...';
      case 'running':
        return `${sessionState.currentPhase} - ${Math.round(sessionState.overallProgress * 100)}%`;
      case 'completed':
        return 'Research complete - Report ready!';
      case 'error':
        return sessionState.error || 'Research failed';
      default:
        return 'Ready to start research';
    }
  };
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b',
      className
    )}>
      {getStatusIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium">{getStatusText()}</p>
        {sessionState.agents && (
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
// Main Research Chat Interface Component
// ============================================================================

export function ResearchChatInterface({ className }: ResearchChatInterfaceProps) {
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [activeTab, setActiveTab] = useState('interface');
  
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
  } = useResearchSSE({
    onComplete: (finalReport) => {
      console.log('[Research] Research completed:', finalReport);
    },
    onError: (error) => {
      console.error('[Research] Research error:', error);
    },
    onProgress: (progress, phase) => {
      console.log('[Research] Progress update:', progress, phase);
    },
  });
  
  const handleStartResearch = useCallback(async (query: string) => {
    setIsResearchMode(true);
    try {
      await startResearch(query);
    } catch (error) {
      console.error('[Research] Failed to start research:', error);
    }
  }, [startResearch]);
  
  const handleStopResearch = useCallback(() => {
    stopResearch();
    setIsResearchMode(false);
  }, [stopResearch]);
  
  const handleRetryResearch = useCallback(() => {
    clearError();
    // Could implement retry logic here if needed
  }, [clearError]);
  
  return (
    <ChatProvider>
      <div className={cn('flex flex-col h-full w-full', className)}>
        {/* Mode Toggle */}
        <ResearchModeToggle
          isResearchMode={isResearchMode}
          onToggle={setIsResearchMode}
          isResearchActive={isResearchActive}
        />
        
        {/* Research Status (when active) */}
        {isResearchMode && sessionState && (
          <ResearchStatusIndicator sessionState={sessionState} />
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {isResearchMode ? (
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
                        disabled={isResearchActive}
                        placeholder={
                          isResearchActive
                            ? 'Research in progress...'
                            : 'Enter your research query...'
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
          ) : (
            // Standard chat interface
            <>
              <div className="flex-1 overflow-hidden">
                <ChatMessages />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800">
                <ChatInput />
              </div>
            </>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </ChatProvider>
  );
}

export default ResearchChatInterface;