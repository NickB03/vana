import * as React from 'react';
import { AgentBadge } from './agent-badge';
import { ProgressDot } from './progress-dot';
import { ConnectionHealth, useConnectionHealth } from './connection-health';
import { AgentQueue, QueueStats, type QueueAgent } from './agent-queue';

// Demo data for testing all component states
const demoAgents: QueueAgent[] = [
  {
    id: '1',
    type: 'Research Agent',
    status: 'completed',
    progress: 100,
    current_task: 'Research completed successfully',
  },
  {
    id: '2', 
    type: 'Data Analyzer',
    status: 'current',
    progress: 67,
    current_task: 'Analyzing data patterns...',
  },
  {
    id: '3',
    type: 'Report Generator',
    status: 'waiting',
    progress: 0,
    current_task: 'Waiting for data analysis',
  },
  {
    id: '4',
    type: 'Quality Checker',
    status: 'waiting',
    progress: 0,
    current_task: 'Pending report generation',
  },
  {
    id: '5',
    type: 'Failed Agent',
    status: 'error',
    progress: 25,
    error: 'Connection timeout after 30s',
  },
];

export interface AgentStatusDemoProps {
  className?: string;
  showAll?: boolean;
}

export function AgentStatusDemo({ className, showAll = false }: AgentStatusDemoProps) {
  const [currentDemo, setCurrentDemo] = React.useState(0);
  const connectionHealth = useConnectionHealth();
  
  const demos = [
    { name: 'Agent Badges', component: 'badges' },
    { name: 'Progress Dots', component: 'progress' },
    { name: 'Connection Health', component: 'connection' },
    { name: 'Agent Queue', component: 'queue' },
    { name: 'All Components', component: 'all' },
  ];
  
  React.useEffect(() => {
    if (!showAll && currentDemo !== demos.length - 1) {
      const timer = setInterval(() => {
        setCurrentDemo((prev) => (prev + 1) % demos.length);
      }, 3000);
      
      return () => clearInterval(timer);
    }
  }, [showAll, currentDemo, demos.length]);
  
  const renderBadgesDemo = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Agent Status Badges</h3>
      <div className="flex flex-wrap gap-2">
        <AgentBadge status="waiting" agentType="Research Agent" />
        <AgentBadge status="active" agentType="Data Analyzer" pulse />
        <AgentBadge status="current" agentType="Report Generator" />
        <AgentBadge status="done" agentType="Quality Checker" />
        <AgentBadge status="error" agentType="Failed Agent" />
      </div>
      <div className="flex flex-wrap gap-2">
        <AgentBadge status="waiting" size="sm" />
        <AgentBadge status="active" size="default" />
        <AgentBadge status="done" size="lg" />
      </div>
    </div>
  );
  
  const renderProgressDemo = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Progress Indicators</h3>
      <div className="flex flex-wrap gap-4">
        <ProgressDot progress={0} variant="waiting" />
        <ProgressDot progress={33} variant="active" animate pulse />
        <ProgressDot progress={67} variant="active" animate />
        <ProgressDot progress={100} variant="completed" />
        <ProgressDot progress={25} variant="error" />
      </div>
      <div className="flex flex-wrap gap-4">
        <ProgressDot progress={75} variant="active" size="sm" />
        <ProgressDot progress={75} variant="active" size="default" />
        <ProgressDot progress={75} variant="active" size="lg" />
        <ProgressDot progress={75} variant="active" size="xl" />
      </div>
    </div>
  );
  
  const renderConnectionDemo = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Connection Health</h3>
      <div className="flex flex-wrap gap-2">
        <ConnectionHealth status="good" networkType="4g" showDetails />
        <ConnectionHealth status="degraded" networkType="3g" rtt={150} showDetails />
        <ConnectionHealth status="poor" networkType="2g" rtt={500} downlink={0.5} showDetails />
        <ConnectionHealth status="offline" />
        <ConnectionHealth status="unknown" />
      </div>
      <div className="mt-4 p-3 bg-muted rounded-md">
        <h4 className="text-sm font-medium mb-2">Current Connection</h4>
        <ConnectionHealth
          status={connectionHealth.status}
          networkType={connectionHealth.networkType}
          rtt={connectionHealth.rtt}
          downlink={connectionHealth.downlink}
          showDetails
        />
      </div>
    </div>
  );
  
  const renderQueueDemo = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Agent Queue</h3>
      
      {/* Horizontal layout */}
      <div className="space-y-2">
        <h4 className="text-xs text-muted-foreground">Horizontal Pipeline</h4>
        <AgentQueue agents={demoAgents} layout="horizontal" />
        <QueueStats agents={demoAgents} />
      </div>
      
      {/* Compact layout */}
      <div className="space-y-2">
        <h4 className="text-xs text-muted-foreground">Compact View</h4>
        <AgentQueue agents={demoAgents} layout="compact" maxVisible={3} />
      </div>
      
      {/* Vertical layout */}
      <div className="space-y-2">
        <h4 className="text-xs text-muted-foreground">Vertical List</h4>
        <AgentQueue agents={demoAgents.slice(0, 3)} layout="vertical" />
      </div>
    </div>
  );
  
  const renderAllDemo = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Multi-Agent Research Status</h3>
        <ConnectionHealth
          status={connectionHealth.status}
          networkType={connectionHealth.networkType}
          showDetails
        />
      </div>
      
      {/* Main queue */}
      <AgentQueue agents={demoAgents} animate />
      
      {/* Statistics */}
      <QueueStats agents={demoAgents} />
      
      {/* Individual progress indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {demoAgents.map((agent) => (
          <div key={agent.id} className="flex flex-col items-center gap-2 text-center">
            <ProgressDot
              progress={agent.progress}
              variant={agent.status === 'error' ? 'error' : 
                      agent.status === 'completed' ? 'completed' :
                      agent.status === 'current' ? 'active' : 'waiting'}
              pulse={agent.status === 'current'}
            />
            <div className="text-xs text-muted-foreground truncate w-full">
              {agent.type.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderCurrentDemo = () => {
    switch (demos[currentDemo]?.component) {
      case 'badges': return renderBadgesDemo();
      case 'progress': return renderProgressDemo();
      case 'connection': return renderConnectionDemo();
      case 'queue': return renderQueueDemo();
      case 'all': return renderAllDemo();
      default: return renderAllDemo();
    }
  };
  
  return (
    <div className={className}>
      {showAll ? (
        <div className="space-y-8">
          {renderBadgesDemo()}
          {renderProgressDemo()}
          {renderConnectionDemo()}
          {renderQueueDemo()}
          {renderAllDemo()}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{demos[currentDemo]?.name || 'Agent Status Demo'}</h2>
            <div className="flex gap-1">
              {demos.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentDemo ? 'bg-primary' : 'bg-muted'
                  }`}
                  onClick={() => setCurrentDemo(index)}
                />
              ))}
            </div>
          </div>
          {renderCurrentDemo()}
        </div>
      )}
    </div>
  );
}

export default AgentStatusDemo;
