/**
 * Enhanced Research Chat Interface with Agent Status Cards
 * 
 * Example implementation showing how to integrate the enhanced agent status cards
 * alongside chat messages in a unified interface with real-time updates.
 */

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Bot, 
  Activity, 
  Settings, 
  Minimize2, 
  Maximize2,
  PanelRight,
  PanelRightClose,
  Zap,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import our new components
import { AgentStatusGrid } from "@/components/ui/agent-status-grid";
import { AgentStatusCard, AgentStatusMiniCard } from "@/components/ui/agent-status-card";
import { ConnectionStatusCard, ConnectionStatusIndicator } from "@/components/ui/connection-status-card";
import { useEnhancedResearchSSE } from "@/hooks/use-enhanced-research-sse";

// Mock message type - replace with your actual message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    agentId?: string;
    phase?: string;
    progress?: number;
  };
}

interface EnhancedResearchChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function EnhancedResearchChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  className,
}: EnhancedResearchChatInterfaceProps) {
  // Enhanced SSE hook with connection health
  const {
    sessionState,
    connectionHealth,
    streamingStatus,
    agentTracker,
    isConnected,
    isHealthy,
    startResearch,
    reconnect,
    resetCircuitBreaker,
  } = useEnhancedResearchSSE({
    enableConnectionMonitoring: true,
    enableMetricsTracking: true,
    onComplete: (finalReport) => {
      console.log('Research completed:', finalReport);
    },
    onError: (error) => {
      console.error('Research error:', error);
    },
  });

  // UI State
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [agentPanelSize, setAgentPanelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [activeTab, setActiveTab] = useState<'agents' | 'connection' | 'metrics'>('agents');
  const [compactView, setCompactView] = useState(false);

  // Handle research start
  const handleStartResearch = useCallback(async (query: string) => {
    try {
      await startResearch(query);
      onSendMessage(query); // Also add to chat
    } catch (error) {
      console.error('Failed to start research:', error);
    }
  }, [startResearch, onSendMessage]);

  // Example handler for agent interactions
  const handleAgentClick = useCallback((agent: any) => {
    console.log('Agent clicked:', agent);
    // Could open detail modal, scroll to relevant message, etc.
  }, []);

  // Determine layout based on panel state and size - mobile-first responsive approach
  const getLayoutClasses = () => {
    if (!showAgentPanel) return 'grid-cols-1';
    
    // Mobile: Always stack vertically
    const mobileLayout = 'grid-cols-1';
    
    // Desktop: Side panel based on size
    const desktopLayout = (() => {
      switch (agentPanelSize) {
        case 'small': return 'lg:grid-cols-[1fr,280px] xl:grid-cols-[1fr,320px]';
        case 'large': return 'lg:grid-cols-[1fr,480px] xl:grid-cols-[1fr,560px] 2xl:grid-cols-[1fr,640px]';
        case 'medium':
        default: return 'lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px] 2xl:grid-cols-[1fr,480px]';
      }
    })();
    
    return `${mobileLayout} ${desktopLayout}`;
  };

  return (
    <div className={cn(
      'h-screen flex flex-col bg-gray-50 dark:bg-gray-900',
      'overflow-hidden', // Prevent layout shifts
      className
    )}>
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Research Assistant
          </h1>
          
          {/* Connection Status Indicator */}
          <ConnectionStatusIndicator
            connectionHealth={connectionHealth}
            onClick={() => setActiveTab('connection')}
          />
          
          {/* Agent Summary */}
          {agentTracker.totalAgents > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {agentTracker.activeCount} / {agentTracker.totalAgents} agents
            </Badge>
          )}
        </div>

        {/* Panel Controls */}
        <div className="flex items-center gap-2">
          {/* Panel Size Toggle */}
          {showAgentPanel && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={agentPanelSize === 'small' ? "default" : "ghost"}
                size="sm"
                onClick={() => setAgentPanelSize('small')}
                className="px-2"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant={agentPanelSize === 'medium' ? "default" : "ghost"}
                size="sm"
                onClick={() => setAgentPanelSize('medium')}
                className="px-2"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant={agentPanelSize === 'large' ? "default" : "ghost"}
                size="sm"
                onClick={() => setAgentPanelSize('large')}
                className="px-2"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Panel Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAgentPanel(!showAgentPanel)}
            className="gap-1"
          >
            {showAgentPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            {showAgentPanel ? 'Hide' : 'Show'} Panel
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 grid gap-2 sm:gap-4 p-2 sm:p-4 min-h-0',
        'overflow-hidden', // Ensure proper scrolling
        getLayoutClasses()
      )}>
        {/* Chat Messages */}
        <div className="flex flex-col min-h-0 w-full overflow-hidden">
          <Card className="flex-1 flex flex-col min-h-0 shadow-sm">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Conversation</span>
                {sessionState && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {Math.round(sessionState.overallProgress * 100)}% complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-2 sm:p-6">
              <ScrollArea className="flex-1 pr-2 sm:pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex flex-col gap-2',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-4 py-2',
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.role === 'system'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            : 'bg-white dark:bg-gray-800 border'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.metadata && (
                          <div className="text-xs opacity-70 mt-1">
                            {message.metadata.phase} • {Math.round((message.metadata.progress || 0) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}

                  {/* Inline Agent Progress for Active Research */}
                  {sessionState && agentTracker.activeCount > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Activity className="h-4 w-4 text-blue-500 mt-1 animate-pulse" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Research in Progress: {sessionState.currentPhase}
                        </p>
                        <div className="grid gap-2">
                          {agentTracker.agents
                            .filter(agent => agent.status === 'current')
                            .slice(0, 2)
                            .map((agent) => (
                            <AgentStatusMiniCard
                              key={agent.agent_id}
                              agent={agent}
                              isActive={true}
                              onClick={() => handleAgentClick(agent)}
                            />
                          ))}
                          {agentTracker.activeCount > 2 && (
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              +{agentTracker.activeCount - 2} more agents working...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Zap className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Agent Status Panel */}
        {showAgentPanel && (
          <div className="flex flex-col min-h-0 w-full overflow-hidden lg:order-last">
            {/* Mobile: Collapsible panel at bottom, Desktop: Side panel */}
            <Card className={cn(
              'flex-1 flex flex-col min-h-0 shadow-sm agent-panel-responsive',
              'lg:h-full', // Full height on desktop
              'max-h-[40vh] lg:max-h-none' // Limit height on mobile
            )}>
              <CardHeader className="pb-2 flex-shrink-0">
                <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
                  <TabsList className="w-full h-8 grid grid-cols-3">
                    <TabsTrigger value="agents" className="text-2xs sm:text-xs">Agents</TabsTrigger>
                    <TabsTrigger value="connection" className="text-2xs sm:text-xs">Health</TabsTrigger>
                    <TabsTrigger value="metrics" className="text-2xs sm:text-xs">Metrics</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-2 sm:p-4">
                <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
                  {/* Agents Tab */}
                  <TabsContent value="agents" className="flex-1 flex flex-col min-h-0 mt-0">
                    <ScrollArea className="flex-1">
                      {sessionState?.agents && sessionState.agents.length > 0 ? (
                        <AgentStatusGrid
                          agents={sessionState.agents}
                          isConnected={isConnected}
                          streamingStatus={streamingStatus}
                          layout={(() => {
                            // Mobile: Always use compact
                            if (window.innerWidth < 1024) return 'compact';
                            // Desktop: Based on panel size
                            return compactView ? 'compact' : agentPanelSize === 'small' ? 'list' : 'grid';
                          })()}
                          showConnectionHealth={true}
                          showFilters={agentPanelSize !== 'small' && window.innerWidth >= 1024}
                          onAgentClick={handleAgentClick}
                          maxVisibleCards={(() => {
                            if (window.innerWidth < 640) return 3; // Mobile: fewer cards
                            if (window.innerWidth < 1024) return 6; // Tablet: moderate cards
                            return agentPanelSize === 'small' ? 4 : 12; // Desktop: more cards
                          })()}
                          className="pb-4"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                          <div className="text-center">
                            <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs sm:text-sm">No active research</p>
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Connection Health Tab */}
                  <TabsContent value="connection" className="flex-1 flex flex-col min-h-0 mt-0">
                    <ScrollArea className="flex-1">
                      <div className="space-y-4">
                        <ConnectionStatusCard
                          connectionHealth={connectionHealth}
                          onReconnect={reconnect}
                          onReset={resetCircuitBreaker}
                          compact={agentPanelSize === 'small'}
                          showDetails={agentPanelSize !== 'small'}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Metrics Tab */}
                  <TabsContent value="metrics" className="flex-1 flex flex-col min-h-0 mt-0">
                    <ScrollArea className="flex-1">
                      <div className="space-y-4">
                        {/* Session Overview */}
                        {sessionState && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <div className="text-lg font-bold text-blue-600">
                                {Math.round(sessionState.overallProgress * 100)}%
                              </div>
                              <div className="text-xs text-blue-800 dark:text-blue-200">Progress</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="text-lg font-bold text-green-600">
                                {agentTracker.completedCount}
                              </div>
                              <div className="text-xs text-green-800 dark:text-green-200">Completed</div>
                            </div>
                          </div>
                        )}

                        {/* Connection Quality */}
                        <div className="p-3 border rounded">
                          <h4 className="text-sm font-medium mb-2">Connection Quality</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status</span>
                            <Badge variant={isHealthy ? 'default' : 'destructive'}>
                              {isHealthy ? 'Healthy' : 'Issues Detected'}
                            </Badge>
                          </div>
                        </div>

                        {/* Session Info */}
                        {sessionState && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Session: {sessionState.sessionId.split('_').pop()}</div>
                            <div>Phase: {sessionState.currentPhase}</div>
                            <div>Last Update: {sessionState.lastUpdate.toLocaleTimeString()}</div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedResearchChatInterface;