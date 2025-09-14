import * as React from 'react';
import { cn } from '@/lib/utils';
import { AgentBadge, getAgentBadgeStatus } from './agent-badge';
import { ProgressDot, getProgressDotVariant } from './progress-dot';
import { ConnectionHealth, useConnectionHealth } from './connection-health';
import { AgentQueue, QueueStats, type QueueAgent, sortAgentsForQueue } from './agent-queue';
import { useResearchSSE, useAgentStatusTracker } from '@/hooks/use-research-sse';
import type { ResearchSessionState } from '@/lib/research-sse-service';

export interface ResearchAgentStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  sessionState: ResearchSessionState | null;
  layout?: 'header' | 'overlay' | 'footer' | 'sidebar';
  showConnection?: boolean;
  showStats?: boolean;
  animate?: boolean;
  maxVisible?: number;
  onAgentClick?: (agentId: string, agentType: string) => void;
}

// Convert research agents to queue agents format
function convertToQueueAgents(sessionState: ResearchSessionState | null): QueueAgent[] {
  if (!sessionState?.agents) return [];
  
  return sessionState.agents.map(agent => ({
    id: agent.agent_id || agent.agent_type,
    type: agent.agent_type,
    status: (agent.status || 'waiting') as string,
    progress: agent.progress || 0,
    current_task: agent.current_task || undefined,
    error: agent.error || undefined,
  }));
}

export function ResearchAgentStatus({
  className,
  sessionState,
  layout = 'header',
  showConnection = true,
  showStats = true,
  animate = true,
  maxVisible,
  onAgentClick,
  ...props
}: ResearchAgentStatusProps) {
  const connectionHealth = useConnectionHealth();
  const agentTracker = useAgentStatusTracker(sessionState);
  const queueAgents = React.useMemo(() => {
    const agents = convertToQueueAgents(sessionState);
    return sortAgentsForQueue(agents);
  }, [sessionState]);
  
  // Layout-specific configurations
  const layoutConfig = React.useMemo(() => {
    switch (layout) {
      case 'header':
        return {
          container: 'flex items-center gap-3 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          queueLayout: 'compact' as const,
          maxVisible: maxVisible || 5,
          showLabels: false,
          size: 'sm' as const,
        };
      case 'overlay':
        return {
          container: 'fixed top-4 right-4 z-50 p-3 bg-card rounded-lg shadow-lg border max-w-sm',
          queueLayout: 'vertical' as const,
          maxVisible: maxVisible || 4,
          showLabels: true,
          size: 'default' as const,
        };
      case 'footer':
        return {
          container: 'flex items-center justify-between gap-3 px-4 py-3 bg-muted/50 border-t',
          queueLayout: 'horizontal' as const,
          maxVisible: maxVisible || 6,
          showLabels: true,
          size: 'sm' as const,
        };
      case 'sidebar':
        return {
          container: 'flex flex-col gap-3 p-3',
          queueLayout: 'vertical' as const,
          maxVisible: maxVisible || 8,
          showLabels: true,
          size: 'default' as const,
        };
      default:
        return {
          container: 'flex items-center gap-3',
          queueLayout: 'horizontal' as const,
          maxVisible: maxVisible || 5,
          showLabels: true,
          size: 'default' as const,
        };
    }
  }, [layout, maxVisible]);
  
  // Don't render if no agents
  if (!queueAgents.length && !sessionState) {
    return null;
  }
  
  const handleAgentClick = (agent: QueueAgent) => {
    if (onAgentClick) {
      onAgentClick(agent.id, agent.type);
    }
  };
  
  return (
    <div
      className={cn(layoutConfig.container, className)}
      {...props}
    >
      {/* Connection indicator (if enabled and space allows) */}
      {showConnection && (layout === 'overlay' || layout === 'sidebar' || layout === 'footer') && (
        <ConnectionHealth
          status={connectionHealth.status}
          networkType={connectionHealth.networkType}
          size={layoutConfig.size}
          showDetails={layout !== 'footer'}
        />
      )}
      
      {/* Main agent queue */}
      <div className="flex-1 min-w-0">
        <AgentQueue
          agents={queueAgents}
          layout={layoutConfig.queueLayout}
          maxVisible={layoutConfig.maxVisible}
          showProgress={true}
          showLabels={layoutConfig.showLabels}
          animate={animate}
          onAgentClick={handleAgentClick}
        />
      </div>
      
      {/* Statistics (if enabled and space allows) */}
      {showStats && (layout === 'footer' || layout === 'overlay' || layout === 'sidebar') && (
        <QueueStats
          agents={queueAgents}
          layout={layout === 'sidebar' ? 'vertical' : 'horizontal'}
        />
      )}
      
      {/* Research phase indicator (overlay and sidebar) */}
      {(layout === 'overlay' || layout === 'sidebar') && sessionState?.currentPhase && (
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
          <span className="font-medium">Phase:</span> {sessionState.currentPhase}
        </div>
      )}
    </div>
  );
}

// Specialized components for common use cases
export function HeaderAgentStatus(props: Omit<ResearchAgentStatusProps, 'layout'>) {
  return <ResearchAgentStatus {...props} layout="header" />;
}

export function OverlayAgentStatus(props: Omit<ResearchAgentStatusProps, 'layout'>) {
  return <ResearchAgentStatus {...props} layout="overlay" />;
}

export function FooterAgentStatus(props: Omit<ResearchAgentStatusProps, 'layout'>) {
  return <ResearchAgentStatus {...props} layout="footer" />;
}

export function SidebarAgentStatus(props: Omit<ResearchAgentStatusProps, 'layout'>) {
  return <ResearchAgentStatus {...props} layout="sidebar" />;
}

// Hook for easy integration with research SSE
export function useResearchAgentStatus(options?: Parameters<typeof useResearchSSE>[0]) {
  const research = useResearchSSE(options);
  const agentTracker = useAgentStatusTracker(research.sessionState);
  const connectionHealth = useConnectionHealth();
  
  const queueAgents = React.useMemo(() => {
    const agents = convertToQueueAgents(research.sessionState);
    return sortAgentsForQueue(agents);
  }, [research.sessionState]);
  
  return {
    ...research,
    agentTracker,
    queueAgents,
    connectionHealth,
    // Helper functions for common UI patterns
    renderHeaderStatus: (props?: Partial<ResearchAgentStatusProps>) => (
      <HeaderAgentStatus sessionState={research.sessionState} {...props} />
    ),
    renderOverlayStatus: (props?: Partial<ResearchAgentStatusProps>) => (
      <OverlayAgentStatus sessionState={research.sessionState} {...props} />
    ),
    renderFooterStatus: (props?: Partial<ResearchAgentStatusProps>) => (
      <FooterAgentStatus sessionState={research.sessionState} {...props} />
    ),
    renderSidebarStatus: (props?: Partial<ResearchAgentStatusProps>) => (
      <SidebarAgentStatus sessionState={research.sessionState} {...props} />
    ),
  };
}

export default ResearchAgentStatus;
