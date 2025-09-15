/**
 * Agent Status Card Examples
 * 
 * Example implementations showing different ways to integrate the enhanced
 * agent status cards in various UI patterns and layouts.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Sidebar, 
  Layout, 
  PanelRight,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";

// Import the enhanced components
import { AgentStatusCard } from "@/components/ui/agent-status-card"; // AgentStatusMiniCard removed as it's not used
import { AgentStatusGrid } from "@/components/ui/agent-status-grid";
import { ConnectionStatusCard, ConnectionStatusIndicator } from "@/components/ui/connection-status-card";
import { EnhancedResearchChatInterface } from "@/components/ui/enhanced-research-chat-interface";
import { ResearchStatusBridge } from "@/components/ui/research-status-bridge";

// Mock data for examples
const mockAgents = [
  {
    agent_id: "team_leader_1",
    agent_type: "team_leader",
    name: "Research Coordinator",
    status: "current" as const,
    progress: 0.65,
    current_task: "Coordinating research across multiple agents and ensuring quality standards are met",
    error: null,
  },
  {
    agent_id: "researcher_1", 
    agent_type: "researcher",
    name: "Primary Researcher",
    status: "completed" as const,
    progress: 1.0,
    current_task: null,
    error: null,
  },
  {
    agent_id: "analyst_1",
    agent_type: "evaluator", 
    name: "Quality Evaluator",
    status: "waiting" as const,
    progress: 0.0,
    current_task: null,
    error: null,
  },
  {
    agent_id: "writer_1",
    agent_type: "report_writer",
    name: "Report Writer", 
    status: "error" as const,
    progress: 0.3,
    current_task: "Writing comprehensive research report",
    error: "Failed to access required data sources for report compilation",
  }
];

const mockConnectionHealth = {
  status: "connected" as const,
  latency: 145,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  lastConnected: new Date(),
  circuitBreakerStatus: "CLOSED" as const,
  streamingActive: true,
  totalMessages: 47,
  messagesPerMinute: 12,
};

const mockMessages = [
  {
    id: "1",
    role: "user" as const,
    content: "Research the latest developments in AI agent coordination",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "2", 
    role: "assistant" as const,
    content: "I'll coordinate a multi-agent research team to analyze the latest developments in AI agent coordination. Let me deploy specialized agents to gather and analyze the most current information.",
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: "3",
    role: "system" as const,
    content: "Research team assembled. Primary research phase completed with 95% accuracy.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    metadata: {
      agentId: "researcher_1",
      phase: "Primary Research",
      progress: 1.0,
    },
  },
];

export function AgentStatusExamples() {
  const [selectedExample, setSelectedExample] = useState("cards");
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const examples = [
    { id: "cards", label: "Individual Cards", icon: Layout },
    { id: "grid", label: "Agent Grid", icon: Monitor },
    { id: "connection", label: "Connection Health", icon: Sidebar },
    { id: "chat", label: "Chat Integration", icon: MessageSquare },
    { id: "bridge", label: "Legacy Bridge", icon: PanelRight },
  ];

  const getDeviceClass = () => {
    switch (deviceView) {
      case "mobile": return "max-w-sm mx-auto";
      case "tablet": return "max-w-2xl mx-auto";
      case "desktop": 
      default: return "max-w-full";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Agent Status Cards Examples</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Interactive examples showing different ways to integrate enhanced agent status cards 
          in your research interface. Try different layouts and device views.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {/* Example Selection */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          {examples.map((example) => {
            const Icon = example.icon;
            return (
              <Button
                key={example.id}
                variant={selectedExample === example.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedExample(example.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {example.label}
              </Button>
            );
          })}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Device View Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={deviceView === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDeviceView("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={deviceView === "tablet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDeviceView("tablet")}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={deviceView === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDeviceView("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Example Content */}
      <div className={getDeviceClass()}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {examples.find(e => e.id === selectedExample)?.label}
              <Badge variant="outline">
                {deviceView} view
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Individual Agent Cards */}
            {selectedExample === "cards" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {mockAgents.slice(0, deviceView === "mobile" ? 2 : 4).map((agent) => (
                  <AgentStatusCard
                    key={agent.agent_id}
                    agent={agent}
                    isActive={agent.status === "current"}
                    isConnected={true}
                    streamingStatus="active"
                    showConnectionHealth={true}
                    compact={deviceView === "mobile"}
                  />
                ))}
              </div>
            )}

            {/* Agent Grid */}
            {selectedExample === "grid" && (
              <AgentStatusGrid
                agents={mockAgents}
                isConnected={true}
                streamingStatus="active"
                layout={deviceView === "mobile" ? "list" : "grid"}
                showConnectionHealth={true}
                showFilters={deviceView !== "mobile"}
                maxVisibleCards={deviceView === "mobile" ? 3 : 8}
              />
            )}

            {/* Connection Health */}
            {selectedExample === "connection" && (
              <div className="space-y-4">
                <ConnectionStatusCard
                  connectionHealth={mockConnectionHealth}
                  compact={deviceView === "mobile"}
                  showDetails={deviceView !== "mobile"}
                />
                
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm">Indicator variant:</span>
                  <ConnectionStatusIndicator
                    connectionHealth={mockConnectionHealth}
                  />
                </div>
              </div>
            )}

            {/* Chat Integration */}
            {selectedExample === "chat" && (
              <div className="h-96 border rounded-lg overflow-hidden">
                <EnhancedResearchChatInterface
                  messages={mockMessages}
                  onSendMessage={(msg) => console.log("Send:", msg)}
                  isLoading={false}
                />
              </div>
            )}

            {/* Legacy Bridge */}
            {selectedExample === "bridge" && (
              <ResearchStatusBridge
                sessionState={{
                  sessionId: "demo_session_123",
                  status: "running",
                  overallProgress: 0.65,
                  currentPhase: "Quality Assessment",
                  agents: mockAgents,
                  partialResults: null,
                  finalReport: null,
                  error: null,
                  lastUpdate: new Date(),
                }}
                mode="hybrid"
                initialLayout={deviceView === "mobile" ? "compact" : "expanded"}
                showTransition={true}
                enableUpgrade={true}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>
                {selectedExample === "cards" && `// Individual Agent Status Cards
import { AgentStatusCard } from '@/components/ui/agent-status-card';

<AgentStatusCard
  agent={agent}
  isActive={agent.status === 'current'}
  isConnected={true}
  streamingStatus="active"
  showConnectionHealth={true}
  compact={false}
  onDismiss={() => console.log('Dismissed')}
/>`}

                {selectedExample === "grid" && `// Agent Status Grid
import { AgentStatusGrid } from '@/components/ui/agent-status-grid';

<AgentStatusGrid
  agents={agents}
  isConnected={isConnected}
  streamingStatus={streamingStatus}
  layout="grid" // 'grid' | 'list' | 'compact'
  showConnectionHealth={true}
  showFilters={true}
  onAgentClick={handleAgentClick}
  maxVisibleCards={12}
/>`}

                {selectedExample === "connection" && `// Connection Status Card
import { ConnectionStatusCard } from '@/components/ui/connection-status-card';

<ConnectionStatusCard
  connectionHealth={connectionHealth}
  onReconnect={handleReconnect}
  onReset={handleReset}
  compact={false}
  showDetails={true}
/>`}

                {selectedExample === "chat" && `// Enhanced Chat Interface
import { EnhancedResearchChatInterface } from '@/components/ui/enhanced-research-chat-interface';

<EnhancedResearchChatInterface
  messages={messages}
  onSendMessage={handleSendMessage}
  isLoading={isLoading}
/>`}

                {selectedExample === "bridge" && `// Legacy Bridge Component
import { ResearchStatusBridge } from '@/components/ui/research-status-bridge';

<ResearchStatusBridge
  sessionState={sessionState}
  mode="hybrid" // 'legacy' | 'enhanced' | 'hybrid'
  initialLayout="expanded"
  enableUpgrade={true}
  onModeChange={handleModeChange}
/>`}
              </code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentStatusExamples;