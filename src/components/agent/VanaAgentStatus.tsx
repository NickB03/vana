/**
 * VanaAgentStatus - Real-time agent coordination display
 * Shows agent progress, status, and coordination information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  TrendingUp,
  Zap,
  Brain,
  Search,
  FileText,
  Shield,
  Target
} from 'lucide-react';
import { AgentStatus, ResearchProgress } from '../../lib/api/types';
import { cn } from '../../lib/utils';

interface VanaAgentStatusProps {
  agents: AgentStatus[];
  progress?: ResearchProgress | null;
  className?: string;
}

interface AgentCardProps {
  agent: AgentStatus;
  className?: string;
}

const AGENT_ICONS: Record<string, React.ComponentType<any>> = {
  team_leader: Users,
  plan_generator: Target,
  section_planner: FileText,
  researcher: Search,
  evaluator: Shield,
  report_writer: FileText,
  coordinator: Brain,
  analyst: TrendingUp,
  optimizer: Zap,
  default: Activity,
};

const STATUS_COLORS = {
  current: 'bg-blue-500 text-white',
  waiting: 'bg-yellow-500 text-white',
  completed: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
} as const;

const STATUS_ICONS = {
  current: Activity,
  waiting: Clock,
  completed: CheckCircle2,
  error: AlertCircle,
} as const;

/**
 * Individual agent card component
 */
function AgentCard({ agent, className }: AgentCardProps) {
  const IconComponent = AGENT_ICONS[agent.agent_type] || AGENT_ICONS.default;
  const StatusIcon = STATUS_ICONS[agent.status] || STATUS_ICONS.current;
  
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDuration = () => {
    if (!agent.started_at) return null;
    
    const start = new Date(agent.started_at);
    const end = agent.completed_at ? new Date(agent.completed_at) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <Card className={cn('w-full transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10">
                <IconComponent className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{agent.agent_type.replace('_', ' ')}</p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={cn('flex items-center space-x-1', STATUS_COLORS[agent.status])}
          >
            <StatusIcon className="h-3 w-3" />
            <span className="capitalize">{agent.status}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(agent.progress * 100)}%</span>
          </div>
          <Progress 
            value={agent.progress * 100} 
            className="h-2"
            aria-label={`${agent.name} progress: ${Math.round(agent.progress * 100)}%`}
          />
        </div>

        {/* Current Task */}
        {agent.current_task && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Current Task</p>
            <p className="text-sm">{agent.current_task}</p>
          </div>
        )}

        {/* Timing Information */}
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          {agent.started_at && (
            <span>Started: {formatTime(agent.started_at)}</span>
          )}
          {getDuration() && (
            <span>Duration: {getDuration()}</span>
          )}
        </div>

        {/* Error Display */}
        {agent.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-red-600" />
              <span className="text-xs font-medium text-red-800">Error</span>
            </div>
            <p className="text-xs text-red-700 mt-1">{agent.error}</p>
          </div>
        )}

        {/* Results Preview */}
        {agent.results && Object.keys(agent.results).length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Results</p>
            <div className="text-xs bg-gray-50 p-2 rounded border">
              {Object.entries(agent.results).slice(0, 2).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className="truncate ml-2">
                    {typeof value === 'string' ? value.slice(0, 30) + (value.length > 30 ? '...' : '') : JSON.stringify(value)}
                  </span>
                </div>
              ))}
              {Object.keys(agent.results).length > 2 && (
                <p className="text-center text-muted-foreground">+{Object.keys(agent.results).length - 2} more</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Main agent status component
 */
export function VanaAgentStatus({ agents, progress, className }: VanaAgentStatusProps) {
  const activeAgents = agents.filter(agent => agent.status === 'current');
  const completedAgents = agents.filter(agent => agent.status === 'completed');
  const waitingAgents = agents.filter(agent => agent.status === 'waiting');
  const errorAgents = agents.filter(agent => agent.status === 'error');

  const overallProgress = progress?.overall_progress || 0;
  const currentPhase = progress?.current_phase || 'Initializing';

  if (agents.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No agents active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Research Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{currentPhase}</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress * 100)}%
              </span>
            </div>
            <Progress 
              value={overallProgress * 100} 
              className="h-3"
              aria-label={`Overall progress: ${Math.round(overallProgress * 100)}%`}
            />
            
            {/* Status Summary */}
            <div className="flex flex-wrap gap-2 mt-3">
              {activeAgents.length > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  <Activity className="h-3 w-3 mr-1" />
                  {activeAgents.length} Active
                </Badge>
              )}
              {waitingAgents.length > 0 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                  <Clock className="h-3 w-3 mr-1" />
                  {waitingAgents.length} Waiting
                </Badge>
              )}
              {completedAgents.length > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {completedAgents.length} Completed
                </Badge>
              )}
              {errorAgents.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errorAgents.length} Error
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Agent Network</span>
        </h3>
        
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3 pr-4">
            {/* Active Agents First */}
            {activeAgents.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Activity className="h-4 w-4" />
                  <span>Currently Active</span>
                </h4>
                {activeAgents.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </>
            )}

            {/* Waiting Agents */}
            {waitingAgents.length > 0 && (
              <>
                {activeAgents.length > 0 && <Separator className="my-4" />}
                <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Waiting</span>
                </h4>
                {waitingAgents.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </>
            )}

            {/* Error Agents */}
            {errorAgents.length > 0 && (
              <>
                {(activeAgents.length > 0 || waitingAgents.length > 0) && <Separator className="my-4" />}
                <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Errors</span>
                </h4>
                {errorAgents.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </>
            )}

            {/* Completed Agents */}
            {completedAgents.length > 0 && (
              <>
                {(activeAgents.length > 0 || waitingAgents.length > 0 || errorAgents.length > 0) && <Separator className="my-4" />}
                <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed</span>
                </h4>
                {completedAgents.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default VanaAgentStatus;