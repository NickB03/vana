/**
 * Enhanced Agent Status Grid Component
 * 
 * Responsive grid layout for displaying multiple agent status cards with
 * flexible layouts, filtering options, and real-time updates from SSE.
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Tabs and ScrollArea imports removed as they are not used in this component
import { 
  Users, 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Grid3X3,
  List,
  Filter,
  TrendingUp,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import { AgentStatus } from "@/lib/research-sse-service";
import { AgentStatusCard, AgentStatusMiniCard } from "@/components/ui/agent-status-card";
import { cn } from "@/lib/utils";

// ============================================================================
// Type Definitions
// ============================================================================

interface AgentStatusGridProps {
  agents: AgentStatus[];
  isConnected?: boolean;
  streamingStatus?: 'idle' | 'active' | 'error' | 'disconnected';
  layout?: 'grid' | 'list' | 'compact';
  showConnectionHealth?: boolean;
  showFilters?: boolean;
  className?: string;
  onAgentClick?: (agent: AgentStatus) => void;
  maxVisibleCards?: number;
}

type AgentFilter = 'all' | 'active' | 'completed' | 'waiting' | 'error';
type SortBy = 'name' | 'progress' | 'status' | 'type';

// ============================================================================
// Grid Statistics Component
// ============================================================================

interface GridStatsProps {
  agents: AgentStatus[];
  isConnected?: boolean;
}

function GridStats({ agents, isConnected }: GridStatsProps) {
  const stats = useMemo(() => {
    const total = agents.length;
    const completed = agents.filter(a => a.status === 'completed').length;
    const active = agents.filter(a => a.status === 'current').length;
    const waiting = agents.filter(a => a.status === 'waiting').length;
    const errors = agents.filter(a => a.status === 'error').length;
    const avgProgress = total > 0 ? agents.reduce((sum, a) => sum + a.progress, 0) / total : 0;

    return { total, completed, active, waiting, errors, avgProgress };
  }, [agents]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
      <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.total}</div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Total</div>
      </div>
      
      <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Complete</div>
      </div>
      
      <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.active}</div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Active</div>
      </div>
      
      <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-gray-600">{stats.waiting}</div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Waiting</div>
      </div>
      
      <div className="text-center p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-red-600">{stats.errors}</div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Errors</div>
      </div>
      
      <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-all hover:shadow-sm">
        <div className="text-lg sm:text-xl font-bold text-purple-600">
          {Math.round(stats.avgProgress * 100)}%
        </div>
        <div className="text-2xs sm:text-xs text-gray-600 dark:text-gray-400">Avg Progress</div>
      </div>
    </div>
  );
}

// ============================================================================
// Filter Controls Component
// ============================================================================

interface FilterControlsProps {
  activeFilter: AgentFilter;
  onFilterChange: (filter: AgentFilter) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  layout: 'grid' | 'list' | 'compact';
  onLayoutChange: (layout: 'grid' | 'list' | 'compact') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function FilterControls({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  layout,
  onLayoutChange,
  isCollapsed,
  onToggleCollapse,
}: FilterControlsProps) {
  const filterOptions: { value: AgentFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'all', label: 'All', icon: Users },
    { value: 'active', label: 'Active', icon: Activity },
    { value: 'completed', label: 'Done', icon: CheckCircle },
    { value: 'waiting', label: 'Waiting', icon: Clock },
    { value: 'error', label: 'Errors', icon: AlertTriangle },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'status', label: 'Status' },
    { value: 'progress', label: 'Progress' },
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter Buttons */}
        <div className="flex items-center gap-1">
          {filterOptions.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={activeFilter === value ? "default" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(value)}
              className="gap-1"
            >
              <Icon className="h-3 w-3" />
              {label}
            </Button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1 ml-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="text-sm bg-transparent border-none focus:outline-none"
          >
            {sortOptions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Layout Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={layout === 'grid' ? "default" : "ghost"}
            size="sm"
            onClick={() => onLayoutChange('grid')}
            className="px-2"
          >
            <Grid3X3 className="h-3 w-3" />
          </Button>
          <Button
            variant={layout === 'list' ? "default" : "ghost"}
            size="sm"
            onClick={() => onLayoutChange('list')}
            className="px-2"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            variant={layout === 'compact' ? "default" : "ghost"}
            size="sm"
            onClick={() => onLayoutChange('compact')}
            className="px-2"
          >
            <TrendingUp className="h-3 w-3" />
          </Button>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="px-2"
        >
          {isCollapsed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Agent Status Grid Component
// ============================================================================

export function AgentStatusGrid({
  agents,
  isConnected = true,
  streamingStatus = 'idle',
  layout: initialLayout = 'grid',
  showConnectionHealth = true,
  showFilters = true,
  className,
  onAgentClick,
  maxVisibleCards = 12,
}: AgentStatusGridProps) {
  const [activeFilter, setActiveFilter] = useState<AgentFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('status');
  const [layout, setLayout] = useState<'grid' | 'list' | 'compact'>(initialLayout);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Filter and sort agents
  const processedAgents = useMemo(() => {
    let filtered = agents;

    // Apply filters
    if (activeFilter !== 'all') {
      filtered = agents.filter(agent => {
        switch (activeFilter) {
          case 'active': return agent.status === 'current';
          case 'completed': return agent.status === 'completed';
          case 'waiting': return agent.status === 'waiting';
          case 'error': return agent.status === 'error';
          default: return true;
        }
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return b.progress - a.progress;
        case 'type':
          return a.agent_type.localeCompare(b.agent_type);
        case 'status':
        default:
          const statusOrder = { current: 0, error: 1, waiting: 2, completed: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
      }
    });

    return sorted;
  }, [agents, activeFilter, sortBy]);

  // Limit visible cards
  const visibleAgents = showAll ? processedAgents : processedAgents.slice(0, maxVisibleCards);
  const hasMore = processedAgents.length > maxVisibleCards;

  if (agents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-12 text-gray-500 dark:text-gray-400', className)}>
        <div className="text-center space-y-3">
          <Users className="h-12 w-12 mx-auto opacity-50" />
          <div>
            <p className="text-lg font-medium">No agents active</p>
            <p className="text-sm">Agent status cards will appear here when research starts</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Research Agents ({agents.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-1 flex-wrap">
            {agents.slice(0, 8).map((agent) => (
              <Badge
                key={agent.agent_id}
                variant={agent.status === 'current' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {agent.name} ({Math.round(agent.progress * 100)}%)
              </Badge>
            ))}
            {agents.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{agents.length - 8} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="agent-status-grid">
      {/* Statistics Overview */}
      <GridStats agents={agents} isConnected={isConnected} />

      {/* Filter Controls */}
      {showFilters && (
        <FilterControls
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          layout={layout}
          onLayoutChange={setLayout}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(true)}
        />
      )}

      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Connection Issues Detected</span>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            Agent status updates may be delayed or unavailable.
          </p>
        </div>
      )}

      {/* Agent Grid/List */}
      <div className="space-y-4">
        {layout === 'grid' && (
          <div className="agent-grid stagger-children">
            {visibleAgents.map((agent, index) => (
              <AgentStatusCard
                key={agent.agent_id}
                agent={agent}
                isActive={agent.status === 'current'}
                isConnected={isConnected}
                streamingStatus={streamingStatus}
                showConnectionHealth={showConnectionHealth}
                className="h-full"
                // Note: AgentStatusCard doesn't support onClick or style props
              />
            ))}
          </div>
        )}

        {layout === 'list' && (
          <div className="space-y-2 sm:space-y-3">
            {visibleAgents.map((agent) => (
              <div key={agent.agent_id} className="w-full">
                <AgentStatusCard
                  agent={agent}
                  isActive={agent.status === 'current'}
                  isConnected={isConnected}
                  streamingStatus={streamingStatus}
                  showConnectionHealth={showConnectionHealth}
                  compact={true}
                  className="w-full max-w-none"
                  // Note: AgentStatusCard doesn't support onClick prop
                />
              </div>
            ))}
          </div>
        )}

        {layout === 'compact' && (
          <div className="agent-cards-compact">
            {visibleAgents.map((agent, index) => (
              <div key={agent.agent_id} className="min-h-0">
                <AgentStatusMiniCard
                  agent={agent}
                  isActive={agent.status === 'current'}
                  onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
                  className="h-full agent-mini-card"
                  // Note: AgentStatusMiniCard doesn't support style prop
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show More Button */}
      {hasMore && !showAll && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Show {processedAgents.length - maxVisibleCards} More Agents
          </Button>
        </div>
      )}

      {/* No Results Message */}
      {processedAgents.length === 0 && activeFilter !== 'all' && (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          <div className="space-y-2">
            <Filter className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">No agents found for the current filter</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              Clear Filter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentStatusGrid;