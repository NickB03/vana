/**
 * Research Status Bridge Component
 * 
 * Integration bridge that connects the existing research-agent-status component
 * with the new enhanced agent status cards, providing backwards compatibility
 * while enabling progressive enhancement.
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutGrid, 
  List, 
  Activity, 
  Settings,
  ChevronUp,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import existing components
import { ResearchAgentStatus, useResearchAgentStatus } from "@/components/ui/research-agent-status";

// Import new enhanced components
import { AgentStatusGrid } from "@/components/ui/agent-status-grid";
import { ConnectionStatusCard, ConnectionStatusIndicator } from "@/components/ui/connection-status-card";
import { useEnhancedResearchSSE } from "@/hooks/use-enhanced-research-sse";

// Types
import type { ResearchSessionState } from "@/lib/research-sse-service";

interface ResearchStatusBridgeProps {
  sessionState: ResearchSessionState | null;
  mode?: 'legacy' | 'enhanced' | 'hybrid';
  initialLayout?: 'compact' | 'expanded';
  showTransition?: boolean;
  enableUpgrade?: boolean;
  onModeChange?: (mode: 'legacy' | 'enhanced' | 'hybrid') => void;
  className?: string;
}

export function ResearchStatusBridge({
  sessionState,
  mode: initialMode = 'hybrid',
  initialLayout = 'compact',
  showTransition = true,
  enableUpgrade = true,
  onModeChange,
  className,
}: ResearchStatusBridgeProps) {
  const [mode, setMode] = useState(initialMode);
  const [layout, setLayout] = useState<'compact' | 'expanded'>(initialLayout);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Enhanced SSE hook for new features
  const enhanced = useEnhancedResearchSSE({
    enableConnectionMonitoring: mode !== 'legacy',
    enableMetricsTracking: mode === 'enhanced',
  });

  // Legacy hook for backwards compatibility
  const legacy = useResearchAgentStatus();

  // Determine which data source to use
  const activeSessionState = sessionState || enhanced.sessionState || legacy.sessionState;
  const agents = activeSessionState?.agents || [];
  const isConnected = enhanced.isConnected;
  const connectionHealth = enhanced.connectionHealth;

  // Handle mode transitions with animation
  const handleModeChange = async (newMode: 'legacy' | 'enhanced' | 'hybrid') => {
    if (showTransition && newMode !== mode) {
      setIsTransitioning(true);
      
      // Brief transition period
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setMode(newMode);
      setIsTransitioning(false);
      
      if (onModeChange) {
        onModeChange(newMode);
      }
    } else {
      setMode(newMode);
      if (onModeChange) {
        onModeChange(newMode);
      }
    }
  };

  // Auto-upgrade suggestion logic
  const shouldSuggestUpgrade = useMemo(() => {
    return enableUpgrade && 
           mode === 'legacy' && 
           agents.length > 3 && 
           isConnected;
  }, [enableUpgrade, mode, agents.length, isConnected]);

  // Render legacy mode
  const renderLegacyMode = () => (
    <div className="space-y-4">
      <ResearchAgentStatus
        sessionState={activeSessionState}
        layout={layout === 'compact' ? 'header' : 'sidebar'}
        showConnection={true}
        showStats={layout === 'expanded'}
        animate={true}
      />
      
      {shouldSuggestUpgrade && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Enhanced monitoring available
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Get detailed agent cards and connection health
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleModeChange('enhanced')}
              className="gap-1"
            >
              <LayoutGrid className="h-3 w-3" />
              Upgrade
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Render enhanced mode
  const renderEnhancedMode = () => (
    <div className="space-y-4">
      {/* Connection Status */}
      <ConnectionStatusCard
        connectionHealth={connectionHealth}
        onReconnect={enhanced.reconnect}
        onReset={enhanced.resetCircuitBreaker}
        compact={layout === 'compact'}
        showDetails={layout === 'expanded'}
      />
      
      {/* Agent Grid */}
      <AgentStatusGrid
        agents={agents}
        isConnected={isConnected}
        streamingStatus={enhanced.streamingStatus}
        layout={layout === 'compact' ? 'compact' : 'grid'}
        showConnectionHealth={false} // Already shown above
        showFilters={layout === 'expanded'}
      />
    </div>
  );

  // Render hybrid mode (both legacy and enhanced)
  const renderHybridMode = () => (
    <Tabs defaultValue="legacy" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="legacy" className="gap-1">
          <List className="h-3 w-3" />
          Classic View
        </TabsTrigger>
        <TabsTrigger value="enhanced" className="gap-1">
          <LayoutGrid className="h-3 w-3" />
          Enhanced Cards
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="legacy" className="mt-4">
        {renderLegacyMode()}
      </TabsContent>
      
      <TabsContent value="enhanced" className="mt-4">
        {renderEnhancedMode()}
      </TabsContent>
    </Tabs>
  );

  if (isTransitioning) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Switching view...</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Research Status</h3>
          {agents.length > 0 && (
            <Badge variant="outline">
              {agents.filter(a => a.status === 'current').length} active
            </Badge>
          )}
          
          {/* Connection indicator for all modes */}
          <ConnectionStatusIndicator
            connectionHealth={connectionHealth}
            className="ml-2"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout(layout === 'compact' ? 'expanded' : 'compact')}
            className="gap-1"
          >
            {layout === 'compact' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            {layout === 'compact' ? 'Expand' : 'Compact'}
          </Button>
          
          {/* Mode switcher */}
          {enableUpgrade && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={mode === 'legacy' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange('legacy')}
                className="px-2"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={mode === 'hybrid' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange('hybrid')}
                className="px-2"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant={mode === 'enhanced' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange('enhanced')}
                className="px-2"
              >
                <LayoutGrid className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        {mode === 'legacy' && renderLegacyMode()}
        {mode === 'enhanced' && renderEnhancedMode()}
        {mode === 'hybrid' && renderHybridMode()}
        
        {/* No agents state */}
        {agents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active research session</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Integration Helper Hook
// ============================================================================

export function useResearchStatusBridge(options?: {
  enableEnhanced?: boolean;
  preferredMode?: 'legacy' | 'enhanced' | 'hybrid';
}) {
  const { enableEnhanced = true, preferredMode = 'hybrid' } = options || {};
  
  const [mode, setMode] = useState(preferredMode);
  
  // Get both legacy and enhanced data
  const legacy = useResearchAgentStatus();
  const enhanced = useEnhancedResearchSSE({
    enableConnectionMonitoring: enableEnhanced,
    enableMetricsTracking: enableEnhanced,
  });
  
  // Choose active session based on mode
  const activeSession = enhanced.sessionState || legacy.sessionState;
  const isActive = Boolean(activeSession && activeSession.agents?.length > 0);
  
  return {
    // State
    mode,
    setMode,
    activeSession,
    isActive,
    
    // Data sources
    legacy,
    enhanced,
    
    // Render helper
    renderBridge: (props?: Partial<ResearchStatusBridgeProps>) => (
      <ResearchStatusBridge
        sessionState={activeSession}
        mode={mode}
        onModeChange={setMode}
        enableUpgrade={enableEnhanced}
        {...props}
      />
    ),
  };
}

export default ResearchStatusBridge;