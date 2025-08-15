'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentAvatar } from './agent-avatar';
import { 
  Agent, 
  AgentType, 
  AgentSelection 
} from '@/types/agents';
import { Search, Users, Star, Zap } from 'lucide-react';

interface AgentSelectorProps {
  agents: Agent[];
  selection: AgentSelection;
  onSelectionChange: (selection: AgentSelection) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  allowMultiSelect?: boolean;
  maxSelections?: number;
  className?: string;
}

const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  coordinator: 'purple',
  analyst: 'blue',
  optimizer: 'green',
  documenter: 'yellow',
  monitor: 'orange',
  specialist: 'pink',
  researcher: 'indigo',
  coder: 'emerald',
  tester: 'red',
  reviewer: 'gray'
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All Agents', icon: Users },
  { key: 'active', label: 'Active', icon: Zap },
  { key: 'available', label: 'Available', icon: Star }
];

export function AgentSelector({ 
  agents,
  selection,
  onSelectionChange,
  showSearch = true,
  showFilters = true,
  allowMultiSelect = false,
  maxSelections = 3,
  className 
}: AgentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<AgentType | 'all'>('all');
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>(agents);

  // Filter agents based on search and filters
  useEffect(() => {
    let filtered = [...agents];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(term) ||
        agent.role.toLowerCase().includes(term) ||
        agent.type.toLowerCase().includes(term) ||
        agent.capabilities.some(cap => cap.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => {
        switch (statusFilter) {
          case 'active':
            return ['thinking', 'processing', 'responding', 'collaborating'].includes(agent.status);
          case 'available':
            return ['idle', 'waiting'].includes(agent.status);
          default:
            return true;
        }
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.type === typeFilter);
    }

    // Sort by performance and availability
    filtered.sort((a, b) => {
      // Prioritize available agents
      const aAvailable = ['idle', 'waiting'].includes(a.status) ? 1 : 0;
      const bAvailable = ['idle', 'waiting'].includes(b.status) ? 1 : 0;
      
      if (aAvailable !== bAvailable) {
        return bAvailable - aAvailable;
      }
      
      // Then by success rate
      return b.stats.success_rate - a.stats.success_rate;
    });

    setFilteredAgents(filtered);
  }, [agents, searchTerm, statusFilter, typeFilter]);

  const handleAgentSelect = (agent: Agent) => {
    if (!allowMultiSelect) {
      // Single selection
      onSelectionChange({
        ...selection,
        primary_agent: agent.id === selection.primary_agent ? null : agent.id
      });
      return;
    }

    // Multi selection
    const currentlySelected = selection.available_agents.includes(agent.id);
    
    if (currentlySelected) {
      // Remove from selection
      onSelectionChange({
        ...selection,
        available_agents: selection.available_agents.filter(id => id !== agent.id),
        primary_agent: selection.primary_agent === agent.id ? null : selection.primary_agent
      });
    } else {
      // Add to selection (if under limit)
      if (selection.available_agents.length < maxSelections) {
        onSelectionChange({
          ...selection,
          available_agents: [...selection.available_agents, agent.id],
          primary_agent: selection.primary_agent || agent.id
        });
      }
    }
  };

  const handleSetPrimary = (agent: Agent) => {
    if (!allowMultiSelect) return;
    
    // Ensure agent is in selection
    const updatedSelection = selection.available_agents.includes(agent.id) 
      ? selection.available_agents 
      : [...selection.available_agents, agent.id];

    onSelectionChange({
      ...selection,
      available_agents: updatedSelection,
      primary_agent: agent.id
    });
  };

  const toggleCollaborationMode = () => {
    onSelectionChange({
      ...selection,
      collaboration_mode: !selection.collaboration_mode
    });
  };

  const clearSelection = () => {
    onSelectionChange({
      ...selection,
      primary_agent: null,
      available_agents: [],
      collaboration_mode: false
    });
  };

  const isSelected = (agentId: string) => {
    if (allowMultiSelect) {
      return selection.available_agents.includes(agentId);
    }
    return selection.primary_agent === agentId;
  };

  const isPrimary = (agentId: string) => {
    return selection.primary_agent === agentId;
  };

  const uniqueTypes = Array.from(new Set(agents.map(a => a.type)));

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Select Agents</CardTitle>
          <div className="flex items-center gap-2">
            {allowMultiSelect && (
              <>
                <Button
                  variant={selection.collaboration_mode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleCollaborationMode}
                  className="text-xs"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Collaborate
                </Button>
                <Badge variant="outline" className="text-xs">
                  {selection.available_agents.length}/{maxSelections}
                </Badge>
              </>
            )}
            {(selection.primary_agent || selection.available_agents.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3">
            {/* Status Filter */}
            <div className="flex gap-2">
              {STATUS_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter.key)}
                    className="text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant={typeFilter === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className="text-xs"
              >
                All Types
              </Button>
              {uniqueTypes.map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className="text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-2">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                  "hover:bg-muted/50 hover:border-muted-foreground/20",
                  isSelected(agent.id) && "bg-blue-50 border-blue-200",
                  isPrimary(agent.id) && "ring-2 ring-blue-400 ring-opacity-50"
                )}
                onClick={() => handleAgentSelect(agent)}
              >
                <div className="flex items-center gap-3">
                  <AgentAvatar 
                    agent={agent} 
                    size="sm"
                    showTooltip={false}
                  />
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{agent.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          `border-${AGENT_TYPE_COLORS[agent.type]}-200 text-${AGENT_TYPE_COLORS[agent.type]}-700`
                        )}
                      >
                        {agent.type}
                      </Badge>
                      {isPrimary(agent.id) && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {agent.role} • {Math.round(agent.stats.success_rate * 100)}% success
                    </div>
                    
                    <div className="flex gap-1">
                      {agent.capabilities.slice(0, 2).map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                      {agent.capabilities.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{agent.capabilities.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {allowMultiSelect && isSelected(agent.id) && !isPrimary(agent.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(agent);
                      }}
                      className="text-xs h-6 px-2"
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs capitalize",
                      agent.status === 'idle' && "text-green-700 border-green-200",
                      agent.status === 'thinking' && "text-yellow-700 border-yellow-200",
                      agent.status === 'processing' && "text-blue-700 border-blue-200",
                      agent.status === 'error' && "text-red-700 border-red-200"
                    )}
                  >
                    {agent.status}
                  </Badge>
                </div>
              </div>
            ))}

            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm">No agents found matching your criteria</div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selection Summary */}
        {(selection.primary_agent || selection.available_agents.length > 0) && (
          <div className="border-t p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected Agents</div>
              
              {selection.primary_agent && (
                <div className="text-xs text-muted-foreground">
                  Primary: {agents.find(a => a.id === selection.primary_agent)?.name}
                </div>
              )}
              
              {allowMultiSelect && selection.collaboration_mode && (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  🤝 Collaboration mode enabled
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}