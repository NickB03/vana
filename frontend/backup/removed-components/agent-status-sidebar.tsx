/**
 * Enhanced Agent Status Sidebar Component
 * 
 * Optimized sidebar for displaying agent cards alongside chat with proper
 * positioning, responsive behavior, and smooth interactions.
 */

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Minimize2, 
  Maximize2,
  Grid3X3,
  List,
  // Settings import removed as it's not used
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatus } from "@/lib/research-sse-service";
import { AgentStatusCard, AgentStatusMiniCard } from "@/components/ui/agent-status-card";

// ============================================================================
// Type Definitions
// ============================================================================

interface AgentStatusSidebarProps {
  agents: AgentStatus[];
  isConnected?: boolean;
  streamingStatus?: 'idle' | 'active' | 'error' | 'disconnected';
  className?: string;
  onAgentClick?: (agent: AgentStatus) => void;
  defaultCollapsed?: boolean;
  position?: 'left' | 'right';
  showConnectionHealth?: boolean;
}

type SidebarLayout = 'cards' | 'compact' | 'mini';
type SidebarSize = 'small' | 'medium' | 'large';

// ============================================================================
// Agent Status Statistics
// ============================================================================

function AgentStats({ agents, isConnected }: { agents: AgentStatus[]; isConnected: boolean }) {
  const stats = useMemo(() => {
    const total = agents.length;
    const completed = agents.filter(a => a.status === 'completed').length;
    const active = agents.filter(a => a.status === 'current').length;
    const waiting = agents.filter(a => a.status === 'waiting').length;
    const errors = agents.filter(a => a.status === 'error').length;

    return { total, completed, active, waiting, errors };
  }, [agents]);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Agents ({stats.completed}/{stats.total})
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {stats.active > 0 && (
          <Badge variant="default" className="text-xs bg-blue-500">
            {stats.active} active
          </Badge>
        )}
        {stats.errors > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.errors} errors
          </Badge>
        )}
        
        {/* Connection indicator */}
        <div className="flex items-center gap-1 ml-2">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Agent Status Sidebar Component
// ============================================================================

export function AgentStatusSidebar({
  agents,
  isConnected = true,
  streamingStatus = 'idle',
  className,
  onAgentClick,
  defaultCollapsed = false,
  position = 'right',
  showConnectionHealth = true,
}: AgentStatusSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [layout, setLayout] = useState<SidebarLayout>('cards');
  const [size, setSize] = useState<SidebarSize>('medium');
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Early return for empty state
  if (agents.length === 0) {
    return (
      <div className={cn(
        'agent-cards-sidebar',
        'flex items-center justify-center p-6 text-gray-500 dark:text-gray-400',
        'min-w-[280px] max-w-[380px] w-[25vw]',
        position === 'left' ? 'border-r' : 'border-l',
        'border-gray-200 dark:border-gray-800',
        className
      )}>
        <div className="text-center space-y-3">
          <Users className="h-8 w-8 mx-auto opacity-50" />
          <div>
            <p className="text-sm font-medium">No active agents</p>
            <p className="text-xs text-gray-400">Agent cards will appear during research</p>
          </div>
        </div>
      </div>
    );
  }

  // Minimized mobile state
  if (isMinimized) {
    return (
      <div className={cn(
        'fixed bottom-4 right-4 z-50 lg:hidden',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-lg backdrop-blur-sm',
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="p-3 gap-2"
        >
          <Users className="h-4 w-4" />
          <span className="text-sm">{agents.length}</span>
          {agents.some(a => a.status === 'current') && (
            <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
          )}
        </Button>
      </div>
    );
  }

  // Mobile full-screen overlay
  if (window?.innerWidth < 1024 && !isMinimized) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMinimized(true)}
        />
        
        {/* Sidebar */}
        <div className={cn(
          'absolute inset-x-4 bottom-4 top-20',
          'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
          'rounded-lg shadow-xl',
          'agent-cards-container',
          className
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">Research Agents</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="p-4">
            <AgentStats agents={agents} isConnected={isConnected} />
          </div>

          {/* Agents */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {agents.map((agent, index) => (
                <AgentStatusCard
                  key={agent.agent_id}
                  agent={agent}
                  isActive={agent.status === 'current'}
                  isConnected={isConnected}
                  streamingStatus={streamingStatus}
                  showConnectionHealth={showConnectionHealth}
                  compact={true}
                  className="w-full"
                  // Note: AgentStatusCard doesn't support onClick or style props
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop sidebar
  const sidebarWidth = isCollapsed ? '60px' : size === 'small' ? '280px' : size === 'medium' ? '320px' : '380px';

  return (
    <div 
      className={cn(
        'agent-cards-sidebar hidden lg:flex flex-col',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
        position === 'left' ? 'border-r' : 'border-l',
        'border-gray-200 dark:border-gray-800',
        'transition-all duration-300 ease-in-out',
        className
      )}
      style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
    >
      {/* Connection Status Overlay */}
      {!isConnected && (
        <div className="connection-status-overlay disconnected">
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>Connection Issues</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Users className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              Research Agents
            </span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Layout Toggle */}
          {!isCollapsed && (
            <div className="flex items-center border rounded-md mr-1">
              <Button
                variant={layout === 'cards' ? "default" : "ghost"}
                size="sm"
                onClick={() => setLayout('cards')}
                className="px-2"
              >
                <Grid3X3 className="h-3 w-3" />
              </Button>
              <Button
                variant={layout === 'compact' ? "default" : "ghost"}
                size="sm"
                onClick={() => setLayout('compact')}
                className="px-2"
              >
                <List className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2"
          >
            {isCollapsed ? (
              position === 'right' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              position === 'right' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex flex-col items-center p-2 space-y-2">
          <Badge variant="outline" className="text-xs">
            {agents.length}
          </Badge>
          {agents.filter(a => a.status === 'current').length > 0 && (
            <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
          )}
          {agents.filter(a => a.status === 'error').length > 0 && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}

      {/* Expanded Content */}
      {!isCollapsed && (
        <>
          {/* Stats */}
          <div className="p-3 flex-shrink-0">
            <AgentStats agents={agents} isConnected={isConnected} />
          </div>

          {/* Agents List */}
          <ScrollArea className="flex-1 px-3">
            <div className={cn(
              layout === 'cards' && 'space-y-3',
              layout === 'compact' && 'space-y-2',
              'pb-3'
            )}>
              {agents.map((agent, index) => (
                layout === 'cards' ? (
                  <AgentStatusCard
                    key={agent.agent_id}
                    agent={agent}
                    isActive={agent.status === 'current'}
                    isConnected={isConnected}
                    streamingStatus={streamingStatus}
                    showConnectionHealth={showConnectionHealth}
                    compact={size === 'small'}
                    className="w-full"
                    // Note: AgentStatusCard doesn't support onClick or style props
                  />
                ) : (
                  <AgentStatusMiniCard
                    key={agent.agent_id}
                    agent={agent}
                    isActive={agent.status === 'current'}
                    onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
                    className="w-full agent-mini-card"
                  />
                )
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {agents.filter(a => a.status === 'completed').length} / {agents.length} completed
              </span>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-red-500" />
                    <span>Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentStatusSidebar;