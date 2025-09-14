/**
 * Agent Status Cards Integration Test Component
 * 
 * This component demonstrates and tests the integration of agent status cards
 * with the research chat interface, showing real-time updates and proper layout.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { AgentStatusSidebar } from '@/components/ui/agent-status-sidebar';
import { AgentStatusCard } from '@/components/ui/agent-status-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { AgentStatus } from '@/lib/research-sse-service';

// ============================================================================
// Mock Data Generator
// ============================================================================

const generateMockAgents = (): AgentStatus[] => [
  {
    agent_id: 'team-leader-1',
    agent_type: 'team_leader',
    name: 'Research Coordinator',
    status: 'current',
    progress: 0.75,
    current_task: 'Coordinating multi-agent research workflow and delegating tasks to specialized agents',
    error: null,
  },
  {
    agent_id: 'researcher-1',
    agent_type: 'researcher',
    name: 'Primary Researcher',
    status: 'completed',
    progress: 1.0,
    current_task: 'Completed comprehensive literature review and data analysis',
    error: null,
  },
  {
    agent_id: 'analyst-1',
    agent_type: 'analyst',
    name: 'Data Analyst',
    status: 'current',
    progress: 0.45,
    current_task: 'Processing quantitative data and generating statistical insights',
    error: null,
  },
  {
    agent_id: 'evaluator-1',
    agent_type: 'evaluator',
    name: 'Quality Evaluator',
    status: 'waiting',
    progress: 0.0,
    current_task: null,
    error: null,
  },
  {
    agent_id: 'writer-1',
    agent_type: 'report_writer',
    name: 'Report Writer',
    status: 'error',
    progress: 0.2,
    current_task: 'Failed to access required templates for report generation',
    error: 'Template access denied: insufficient permissions',
  },
  {
    agent_id: 'coordinator-1',
    agent_type: 'coordinator',
    name: 'Task Coordinator',
    status: 'current',
    progress: 0.6,
    current_task: 'Synchronizing agent outputs and managing workflow dependencies',
    error: null,
  },
];

// ============================================================================
// Agent Status Integration Test Component
// ============================================================================

interface AgentStatusIntegrationTestProps {
  className?: string;
}

export function AgentStatusIntegrationTest({ className }: AgentStatusIntegrationTestProps) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [streamingStatus, setStreamingStatus] = useState<'idle' | 'active' | 'error'>('idle');

  // Initialize with mock agents
  useEffect(() => {
    setAgents(generateMockAgents());
  }, []);

  // Simulate real-time progress updates
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAgents(prevAgents => 
        prevAgents.map(agent => {
          // Only update agents that are currently active
          if (agent.status !== 'current') return agent;

          // Simulate progress advancement
          const newProgress = Math.min(agent.progress + 0.05 + Math.random() * 0.1, 1.0);
          
          // Complete agent when progress reaches 100%
          const newStatus = newProgress >= 1.0 ? 'completed' : 'current';
          
          // Update task descriptions based on progress
          let newTask = agent.current_task;
          if (newProgress > 0.8 && agent.agent_type === 'team_leader') {
            newTask = 'Finalizing research coordination and preparing summary';
          } else if (newProgress > 0.7 && agent.agent_type === 'analyst') {
            newTask = 'Generating final statistical analysis and visualizations';
          }

          return {
            ...agent,
            progress: newProgress,
            status: newStatus as 'waiting' | 'current' | 'completed' | 'error',
            current_task: newTask,
          };
        })
      );

      // Randomly activate waiting agents
      setAgents(prevAgents => 
        prevAgents.map(agent => {
          if (agent.status === 'waiting' && Math.random() > 0.9) {
            return {
              ...agent,
              status: 'current' as 'waiting' | 'current' | 'completed' | 'error',
              progress: 0.1,
              current_task: `Starting ${agent.agent_type.replace('_', ' ')} operations`,
            };
          }
          return agent;
        })
      );

      // Update streaming status
      setStreamingStatus(prev => {
        const activeAgents = agents.filter(a => a.status === 'current').length;
        if (activeAgents > 0) return 'active';
        if (agents.some(a => a.status === 'error')) return 'error';
        return 'idle';
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, agents]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setStreamingStatus('active');
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setStreamingStatus('idle');
  };

  const handleResetAgents = () => {
    setAgents(generateMockAgents());
    setIsSimulating(false);
    setStreamingStatus('idle');
    setConnectionStatus('connected');
  };

  const handleToggleConnection = () => {
    setConnectionStatus(prev => prev === 'connected' ? 'disconnected' : 'connected');
  };

  const handleAgentClick = (agent: AgentStatus) => {
    console.log('Agent clicked:', agent.name, agent.status);
    // In a real application, this might open a detail modal or switch views
  };

  const activeAgents = agents.filter(a => a.status === 'current').length;
  const completedAgents = agents.filter(a => a.status === 'completed').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Agent Status Cards Integration Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          This demo shows how agent status cards integrate with the chat interface,
          displaying real-time progress updates and status changes during research operations.
        </p>
      </div>

      {/* Controls */}
      <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full" />
            Simulation Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {!isSimulating ? (
                <Button onClick={handleStartSimulation} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Simulation
                </Button>
              ) : (
                <Button onClick={handleStopSimulation} variant="outline" className="gap-2">
                  <Pause className="h-4 w-4" />
                  Stop Simulation
                </Button>
              )}
              
              <Button onClick={handleResetAgents} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>

              <Button 
                onClick={handleToggleConnection} 
                variant={connectionStatus === 'connected' ? 'destructive' : 'default'}
              >
                {connectionStatus === 'connected' ? 'Disconnect' : 'Reconnect'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                {activeAgents} Active
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {completedAgents} Completed
              </Badge>
              {errorAgents > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {errorAgents} Errors
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Demonstration */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sidebar Layout Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Sidebar Layout (Desktop)</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              How agent cards appear alongside the chat interface
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 flex border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              {/* Mock Chat Area */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 min-w-0">
                <div className="text-center text-gray-500 dark:text-gray-400 mt-16">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
                  <p className="text-sm">Chat Interface Area</p>
                  <p className="text-xs opacity-75">Messages would appear here</p>
                </div>
              </div>
              
              {/* Agent Status Sidebar */}
              {agents.length > 0 && (
                <AgentStatusSidebar
                  agents={agents}
                  isConnected={connectionStatus === 'connected'}
                  streamingStatus={streamingStatus}
                  showConnectionHealth={true}
                  position="right"
                  onAgentClick={handleAgentClick}
                  className="w-80 border-l-0"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual Cards Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Agent Cards</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Examples of different agent states and progress levels
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {agents.slice(0, 3).map((agent, index) => (
                <AgentStatusCard
                  key={agent.agent_id}
                  agent={agent}
                  isActive={agent.status === 'current'}
                  isConnected={connectionStatus === 'connected'}
                  streamingStatus={streamingStatus}
                  showConnectionHealth={true}
                  compact={true}
                  onDismiss={() => {
                    console.log('Dismiss clicked for:', agent.name);
                  }}
                  // CSS custom properties would be passed via className if needed
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">
                Integration Status
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Agent status cards are successfully integrated with real-time updates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-green-700 dark:text-green-300">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentStatusIntegrationTest;