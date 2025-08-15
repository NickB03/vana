'use client';

import React, { useState } from 'react';
import { useAgentStore } from '@/store/agent-store';
import { Agent, AgentRole, AGENT_PRESETS } from '@/types/agents';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Plus,
  Users,
  User,
  Zap,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentSelectorProps {
  className?: string;
  mode?: 'dropdown' | 'sidebar' | 'auto';
  showCreateAgent?: boolean;
  onAgentSelect?: (agent: Agent) => void;
}

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  showDetails?: boolean;
}

function AgentStatusIndicator({ status, isTyping }: { status: Agent['status'], isTyping: boolean }) {
  const getStatusColor = () => {
    if (isTyping) return 'bg-blue-500 animate-pulse';
    
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'thinking': return 'bg-blue-500 animate-pulse';
      case 'idle': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-300';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    if (isTyping) return 'Typing...';
    
    switch (status) {
      case 'active': return 'Active';
      case 'busy': return 'Busy';
      case 'thinking': return 'Thinking...';
      case 'idle': return 'Idle';
      case 'error': return 'Error';
      case 'offline': return 'Offline';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
      <span className="text-xs text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}

function AgentCard({ agent, isSelected, onSelect, showDetails = false }: AgentCardProps) {
  const { personality } = agent;
  
  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md border-2",
        isSelected ? "ring-2 ring-primary border-primary" : "border-transparent hover:border-border"
      )}
      onClick={onSelect}
      style={{
        borderColor: isSelected ? personality.colors.primary : undefined,
        backgroundColor: isSelected ? personality.colors.background : undefined
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ 
            backgroundColor: personality.colors.primary + '20',
            color: personality.colors.primary 
          }}
        >
          {agent.avatar}
        </div>
        
        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm truncate">{agent.name}</h4>
            {agent.messageCount > 0 && (
              <Badge variant="outline" className="text-xs h-4">
                {agent.messageCount}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {agent.description}
          </p>
          
          <div className="flex items-center justify-between">
            <AgentStatusIndicator status={agent.status} isTyping={agent.isTyping} />
            
            {showDetails && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: personality.colors.secondary + '20',
                  color: personality.colors.secondary 
                }}
              >
                {agent.role}
              </Badge>
            )}
          </div>
          
          {/* Capabilities (show on selected or in detailed view) */}
          {(isSelected || showDetails) && agent.capabilities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 3).map(capability => (
                <Badge 
                  key={capability} 
                  variant="outline" 
                  className="text-xs h-4 px-1"
                >
                  {capability.replace(/-/g, ' ')}
                </Badge>
              ))}
              {agent.capabilities.length > 3 && (
                <Badge variant="outline" className="text-xs h-4 px-1">
                  +{agent.capabilities.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Thinking State */}
          {agent.thinkingState && (
            <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: personality.colors.background }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{agent.thinkingState.phase}</span>
                <span>{agent.thinkingState.progress}%</span>
              </div>
              {agent.thinkingState.currentTask && (
                <p className="text-muted-foreground truncate">{agent.thinkingState.currentTask}</p>
              )}
              <div 
                className="w-full bg-gray-200 rounded-full h-1 mt-1"
              >
                <div 
                  className="h-1 rounded-full transition-all"
                  style={{ 
                    width: `${agent.thinkingState.progress}%`,
                    backgroundColor: personality.colors.primary
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CreateAgentButton({ onCreateAgent }: { onCreateAgent: (role: AgentRole) => void }) {
  const [isCreating, setIsCreating] = useState(false);
  
  return (
    <Sheet open={isCreating} onOpenChange={setIsCreating}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Agent</SheetTitle>
          <SheetDescription>
            Choose an agent role to add to your team
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-3">
            {Object.entries(AGENT_PRESETS).map(([role, preset]) => (
              <Card 
                key={role}
                className="p-3 cursor-pointer hover:shadow-md"
                onClick={() => {
                  onCreateAgent(role as AgentRole);
                  setIsCreating(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ 
                      backgroundColor: preset.personality.colors.primary + '20',
                      color: preset.personality.colors.primary 
                    }}
                  >
                    {preset.avatar}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.capabilities.slice(0, 2).map(cap => (
                        <Badge key={cap} variant="outline" className="text-xs h-4 px-1">
                          {cap.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DropdownSelector({ agent, onAgentSelect }: { agent: Agent | null, onAgentSelect: (agent: Agent) => void }) {
  const { availableAgents } = useAgentStore();
  
  return (
    <Select 
      value={agent?.id || ''} 
      onValueChange={(agentId) => {
        const selectedAgent = availableAgents.find(a => a.id === agentId);
        if (selectedAgent) onAgentSelect(selectedAgent);
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue>
          {agent ? (
            <div className="flex items-center gap-2">
              <span>{agent.avatar}</span>
              <span className="truncate">{agent.name}</span>
              <AgentStatusIndicator status={agent.status} isTyping={agent.isTyping} />
            </div>
          ) : (
            'Select Agent'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableAgents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            <div className="flex items-center gap-2">
              <span>{agent.avatar}</span>
              <span>{agent.name}</span>
              <AgentStatusIndicator status={agent.status} isTyping={agent.isTyping} />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SidebarSelector({ 
  selectedAgent, 
  onAgentSelect, 
  showCreateAgent 
}: { 
  selectedAgent: Agent | null,
  onAgentSelect: (agent: Agent) => void,
  showCreateAgent: boolean
}) {
  const { availableAgents, addAgent } = useAgentStore();
  
  // Group agents by status
  const activeAgents = availableAgents.filter(a => ['active', 'thinking', 'busy'].includes(a.status));
  const idleAgents = availableAgents.filter(a => ['idle', 'completed'].includes(a.status));
  const offlineAgents = availableAgents.filter(a => ['offline', 'error'].includes(a.status));
  
  const handleCreateAgent = (role: AgentRole) => {
    const preset = AGENT_PRESETS[role];
    const newAgent: Agent = {
      ...preset,
      id: `agent_${role}_${Date.now()}`,
      status: 'idle',
      lastActivity: Date.now(),
      messageCount: 0,
      isTyping: false
    };
    
    addAgent(newAgent);
    onAgentSelect(newAgent);
  };
  
  return (
    <div className="w-80 h-full border-r bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            AI Agents
          </h3>
          <Badge variant="secondary">{availableAgents.length}</Badge>
        </div>
        
        {showCreateAgent && (
          <CreateAgentButton onCreateAgent={handleCreateAgent} />
        )}
      </div>
      
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-4 space-y-6">
          {/* Active Agents */}
          {activeAgents.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Active ({activeAgents.length})
              </h4>
              <div className="space-y-2">
                {activeAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onSelect={() => onAgentSelect(agent)}
                    showDetails={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Idle Agents */}
          {idleAgents.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <User className="w-3 h-3" />
                Available ({idleAgents.length})
              </h4>
              <div className="space-y-2">
                {idleAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onSelect={() => onAgentSelect(agent)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Offline Agents */}
          {offlineAgents.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Offline ({offlineAgents.length})
              </h4>
              <div className="space-y-2">
                {offlineAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onSelect={() => onAgentSelect(agent)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function AgentSelector({ 
  className,
  mode = 'auto',
  showCreateAgent = true,
  onAgentSelect
}: AgentSelectorProps) {
  const { 
    selectedAgent, 
    agentSelectorMode, 
    selectAgent,
    initializeDefaultAgents,
    availableAgents 
  } = useAgentStore();
  
  // Initialize agents if none exist
  React.useEffect(() => {
    if (availableAgents.length === 0) {
      initializeDefaultAgents();
    }
  }, [availableAgents.length, initializeDefaultAgents]);
  
  const handleAgentSelect = (agent: Agent) => {
    selectAgent(agent.id);
    onAgentSelect?.(agent);
  };
  
  // Determine display mode
  const displayMode = mode === 'auto' ? agentSelectorMode : mode;
  
  if (displayMode === 'dropdown') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DropdownSelector 
          agent={selectedAgent}
          onAgentSelect={handleAgentSelect}
        />
      </div>
    );
  }
  
  return (
    <SidebarSelector
      selectedAgent={selectedAgent}
      onAgentSelect={handleAgentSelect}
      showCreateAgent={showCreateAgent}
    />
  );
}