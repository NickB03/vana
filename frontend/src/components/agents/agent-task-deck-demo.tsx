'use client';

import React, { useState } from 'react';
import { AgentTaskDeck } from './agent-task-deck';
import { Agent } from '@/types/agents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AgentTaskDeckDemo() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [gridCols, setGridCols] = useState<2 | 3 | 4 | 6>(3);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleTaskAssign = (agentId: string, taskId: string) => {
    console.log(`Assigning task ${taskId} to agent ${agentId}`);
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Task Deck Demo</h1>
        <p className="text-muted-foreground mt-2">
          Interactive demonstration of the Agent Task Deck component with real-time animations
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="metrics"
                checked={showMetrics}
                onCheckedChange={setShowMetrics}
              />
              <Label htmlFor="metrics">Show Performance Metrics</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="confidence"
                checked={showConfidence}
                onCheckedChange={setShowConfidence}
              />
              <Label htmlFor="confidence">Show Confidence Scores</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="realtime"
                checked={realTimeUpdates}
                onCheckedChange={setRealTimeUpdates}
              />
              <Label htmlFor="realtime">Real-time Updates</Label>
            </div>

            <div className="space-y-2">
              <Label>Grid Layout</Label>
              <div className="flex gap-1">
                {[2, 3, 4, 6].map((cols) => (
                  <Button
                    key={cols}
                    variant={gridCols === cols ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGridCols(cols as 2 | 3 | 4 | 6)}
                  >
                    {cols}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Task Deck */}
      <AgentTaskDeck
        onAgentSelect={handleAgentSelect}
        onTaskAssign={handleTaskAssign}
        selectedAgentId={selectedAgent?.id}
        showPerformanceMetrics={showMetrics}
        showConfidenceScores={showConfidence}
        gridCols={gridCols}
        enableRealTimeUpdates={realTimeUpdates}
        maxAgents={12}
      />

      {/* Selected Agent Details */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-2xl">{selectedAgent.personality.emoji}</span>
              Selected Agent: {selectedAgent.name}
              <Badge variant="outline" className="ml-2">
                {selectedAgent.role}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Agent Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Status:</span> {selectedAgent.status}</div>
                  <div><span className="font-medium">Type:</span> {selectedAgent.type}</div>
                  <div><span className="font-medium">Style:</span> {selectedAgent.personality.style}</div>
                  <div><span className="font-medium">Tone:</span> {selectedAgent.personality.tone}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Performance Stats</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Success Rate:</span> {Math.round(selectedAgent.stats.success_rate * 100)}%</div>
                  <div><span className="font-medium">Tasks Completed:</span> {selectedAgent.stats.tasks_completed}</div>
                  <div><span className="font-medium">Messages Sent:</span> {selectedAgent.stats.messages_sent}</div>
                  <div><span className="font-medium">Collaborations:</span> {selectedAgent.stats.collaborations}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Component Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">🎨 Visual Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Animated status indicators</li>
                <li>• Color-coded agent states</li>
                <li>• Smooth hover animations</li>
                <li>• Progress bars for active tasks</li>
                <li>• Confidence score indicators</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">⚡ Real-time Updates</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• SSE-based status updates</li>
                <li>• Live activity stream</li>
                <li>• Thought bubble displays</li>
                <li>• Dynamic progress tracking</li>
                <li>• Performance metrics</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">🔧 Interactive Elements</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click to select agents</li>
                <li>• Hover cards with details</li>
                <li>• Tooltips for quick info</li>
                <li>• Customizable grid layouts</li>
                <li>• Task assignment interface</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}