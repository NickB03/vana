/**
 * Agent Status Cards Test Component
 * 
 * Test component to demonstrate and validate the improved positioning,
 * responsive behavior, and animations of agent status cards.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Minus, 
  Shuffle, 
  Play, 
  Pause, 
  RotateCcw,
  Smartphone,
  Monitor,
  Tablet
} from "lucide-react";
import { AgentStatusGrid } from "@/components/ui/agent-status-grid";
import { AgentStatus } from "@/lib/research-sse-service";
import { cn } from "@/lib/utils";

// Mock agent data generator
const generateMockAgent = (id: number): AgentStatus => {
  const agentTypes = ['team_leader', 'researcher', 'evaluator', 'report_writer', 'coordinator', 'analyst'];
  const statuses: Array<'current' | 'completed' | 'waiting' | 'error'> = ['current', 'completed', 'waiting', 'error'];
  const names = [
    'Primary Researcher', 'Data Analyst', 'Report Coordinator', 'Quality Evaluator',
    'Information Gatherer', 'Content Writer', 'Technical Reviewer', 'Project Manager'
  ];

  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const progress = status === 'completed' ? 1 : status === 'waiting' ? 0 : Math.random();

  return {
    agent_id: `agent-${id}`,
    name: names[id % names.length],
    agent_type: agentTypes[Math.floor(Math.random() * agentTypes.length)],
    status,
    progress,
    current_task: status === 'current' ? 
      `Currently processing research phase ${Math.floor(Math.random() * 5) + 1}` : 
      status === 'completed' ? 'Task completed successfully' : 
      status === 'error' ? 'Error occurred during processing' :
      'Waiting for assignment',
    error: status === 'error' ? 'Connection timeout or processing error' : undefined,
  };
};

interface AgentStatusTestProps {
  className?: string;
}

export function AgentStatusTest({ className }: AgentStatusTestProps) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<'grid' | 'list' | 'compact'>('grid');
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Initialize with some agents
  useEffect(() => {
    setAgents(Array.from({ length: 4 }, (_, i) => generateMockAgent(i)));
  }, []);

  // Simulation of real-time updates
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        progress: agent.status === 'current' ? 
          Math.min(agent.progress + 0.05 + Math.random() * 0.1, 1) : 
          agent.progress,
        status: agent.status === 'current' && agent.progress >= 0.95 ? 
          'completed' : agent.status,
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const addAgent = () => {
    const newAgent = generateMockAgent(agents.length);
    setAgents(prev => [...prev, newAgent]);
  };

  const removeAgent = () => {
    setAgents(prev => prev.slice(0, -1));
  };

  const shuffleAgents = () => {
    setAgents(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const resetAgents = () => {
    setAgents(Array.from({ length: 4 }, (_, i) => generateMockAgent(i)));
  };

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  // Simulate different viewport sizes
  const getViewportClasses = () => {
    switch (viewportSize) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-2xl mx-auto';
      case 'desktop':
      default:
        return 'max-w-full';
    }
  };

  return (
    <div className={cn('space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen', className)}>
      <div className="max-w-7xl mx-auto">
        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agent Status Cards - Testing Interface</span>
              <Badge variant="outline" className="ml-2">
                {agents.length} agents
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Agent Controls */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={addAgent} size="sm" className="gap-1">
                <Plus className="h-3 w-3" />
                Add Agent
              </Button>
              <Button onClick={removeAgent} size="sm" variant="outline" className="gap-1" disabled={agents.length === 0}>
                <Minus className="h-3 w-3" />
                Remove Agent
              </Button>
              <Button onClick={shuffleAgents} size="sm" variant="outline" className="gap-1">
                <Shuffle className="h-3 w-3" />
                Shuffle
              </Button>
              <Button onClick={resetAgents} size="sm" variant="outline" className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
              <Button onClick={toggleSimulation} size="sm" variant={isSimulating ? "default" : "outline"} className="gap-1">
                {isSimulating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isSimulating ? 'Stop' : 'Start'} Simulation
              </Button>
            </div>

            {/* Layout Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium">Layout:</span>
              <div className="flex gap-1 border rounded-md">
                <Button
                  size="sm"
                  variant={currentLayout === 'grid' ? "default" : "ghost"}
                  onClick={() => setCurrentLayout('grid')}
                  className="px-3"
                >
                  Grid
                </Button>
                <Button
                  size="sm"
                  variant={currentLayout === 'list' ? "default" : "ghost"}
                  onClick={() => setCurrentLayout('list')}
                  className="px-3"
                >
                  List
                </Button>
                <Button
                  size="sm"
                  variant={currentLayout === 'compact' ? "default" : "ghost"}
                  onClick={() => setCurrentLayout('compact')}
                  className="px-3"
                >
                  Compact
                </Button>
              </div>
            </div>

            {/* Viewport Simulation */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium">Viewport:</span>
              <div className="flex gap-1 border rounded-md">
                <Button
                  size="sm"
                  variant={viewportSize === 'mobile' ? "default" : "ghost"}
                  onClick={() => setViewportSize('mobile')}
                  className="px-3 gap-1"
                >
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </Button>
                <Button
                  size="sm"
                  variant={viewportSize === 'tablet' ? "default" : "ghost"}
                  onClick={() => setViewportSize('tablet')}
                  className="px-3 gap-1"
                >
                  <Tablet className="h-3 w-3" />
                  Tablet
                </Button>
                <Button
                  size="sm"
                  variant={viewportSize === 'desktop' ? "default" : "ghost"}
                  onClick={() => setViewportSize('desktop')}
                  className="px-3 gap-1"
                >
                  <Monitor className="h-3 w-3" />
                  Desktop
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Display Area */}
        <div className={cn('transition-all duration-300', getViewportClasses())}>
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg">
                Agent Status Grid - {currentLayout} layout
                {isSimulating && (
                  <Badge variant="default" className="ml-2 animate-pulse">
                    Live Updates
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length > 0 ? (
                <AgentStatusGrid
                  agents={agents}
                  isConnected={true}
                  streamingStatus="active"
                  layout={currentLayout}
                  showConnectionHealth={true}
                  showFilters={true}
                  onAgentClick={(agent) => console.log('Clicked agent:', agent)}
                  className="min-h-[400px]"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <p className="text-lg">No agents to display</p>
                    <p className="text-sm">Click &ldquo;Add Agent&rdquo; to get started</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Performance & Behavior Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-500">
                <div className="font-medium text-green-800 dark:text-green-200">✓ Responsive Grid</div>
                <div className="text-xs text-green-600 dark:text-green-300">
                  Auto-sizing columns based on viewport
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                <div className="font-medium text-blue-800 dark:text-blue-200">✓ Smooth Animations</div>
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  Staggered fade-in with hover effects
                </div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border-l-4 border-purple-500">
                <div className="font-medium text-purple-800 dark:text-purple-200">✓ Z-Index Management</div>
                <div className="text-xs text-purple-600 dark:text-purple-300">
                  Proper layering for hover states
                </div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border-l-4 border-orange-500">
                <div className="font-medium text-orange-800 dark:text-orange-200">✓ Mobile Optimized</div>
                <div className="text-xs text-orange-600 dark:text-orange-300">
                  Responsive text sizes and spacing
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AgentStatusTest;