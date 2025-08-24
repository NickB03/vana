'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Code2, 
  Search, 
  FileCheck, 
  Building, 
  TestTube, 
  Users,
  Circle,
  Activity,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientNonce } from '@/lib/csp';
import type { AgentInfo, CollaborativeSession } from '@/types/canvas';

interface AgentCursorsProps {
  session: CollaborativeSession;
  editorRef: React.RefObject<import('monaco-editor').editor.IStandaloneCodeEditor | null>;
  className?: string;
}

interface CursorDecoration {
  agentId: string;
  decorationId: string;
  cursorDecorationId: string;
  selectionDecorationId?: string;
}

// Type-safe Monaco globals interface
interface MonacoGlobal {
  monaco: {
    Range: new (
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number
    ) => import('monaco-editor').Range;
  };
}

export function AgentCursors({ session, editorRef, className }: AgentCursorsProps) {
  const decorationIdsRef = useRef<string[]>([]);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  // Agent type icons
  const getAgentIcon = (type: AgentInfo['type']) => {
    switch (type) {
      case 'coder': return Code2;
      case 'reviewer': return FileCheck;
      case 'researcher': return Search;
      case 'architect': return Building;
      case 'tester': return TestTube;
      case 'coordinator': return Users;
      default: return Circle;
    }
  };

  // Agent status colors
  const getAgentStatusColor = (status: AgentInfo['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'working': return 'bg-blue-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  // Create cursor decorations in Monaco editor
  const updateCursorDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Type-safe access to Monaco global using SSR-safe approach
    const win = typeof window !== 'undefined' ? window : undefined;
    if (!win) return;
    const monacoGlobal = win as unknown as MonacoGlobal;
    if (!monacoGlobal?.monaco?.Range) return;

    // Create new decorations for each agent cursor
    const decorationOptions: import('monaco-editor').editor.IModelDeltaDecoration[] = [];

    Object.values(session.cursors).forEach(cursor => {
      const agent = session.agents.find(a => a.id === cursor.agentId);
      if (!agent || agent.status === 'offline') return;

      const { position, selection } = cursor;
      
      // Cursor decoration
      decorationOptions.push({
        range: new monacoGlobal.monaco.Range(
          position.lineNumber, 
          position.column, 
          position.lineNumber, 
          position.column
        ),
        options: {
          className: `agent-cursor-${agent.id}`,
          stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          beforeContentClassName: 'agent-cursor-line',
          afterContentClassName: 'agent-cursor-marker'
        }
      });

      // Selection decoration (if exists)
      if (selection) {
        decorationOptions.push({
          range: new monacoGlobal.monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: `agent-selection-${agent.id}`,
            stickiness: 1
          }
        });
      }
    });

    // Apply/replace decorations
    const newDecorationIds = editor.deltaDecorations(decorationIdsRef.current, decorationOptions);
    decorationIdsRef.current = newDecorationIds;
  }, [session.cursors, session.agents, editorRef]);

  // Inject CSS for cursor styles (CSP-compliant with SSR safety)
  useEffect(() => {
    const doc = typeof document !== 'undefined' ? document : undefined;
    
    if (!doc) return;
    
    const style = doc.createElement('style');
    const nonce = getClientNonce();
    
    // Apply CSP nonce if available
    if (nonce) {
      style.setAttribute('nonce', nonce);
    }
    
    // CSP-compliant CSS generation
    const css = session.agents.map(agent => {
      const initials = (agent.name || '')
        .substring(0, 2)
        .toUpperCase()
        .replace(/["'\\]/g, '');
      return `
      .agent-cursor-${agent.id}.agent-cursor-line::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 2px;
        background-color: ${agent.color};
        z-index: 10;
      }
      
      .agent-cursor-${agent.id}.agent-cursor-marker::after {
        content: "${initials}";
        position: absolute;
        top: -20px;
        left: 0;
        background-color: ${agent.color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 3px;
        white-space: nowrap;
        z-index: 20;
        pointer-events: none;
      }
      
      .agent-selection-${agent.id} {
        background-color: ${agent.color}20;
        border: 1px solid ${agent.color}40;
      }
    `}).join('\n');
    
    style.textContent = css;
    doc.head.appendChild(style);

    return () => {
      if (doc.head.contains(style)) {
        doc.head.removeChild(style);
      }
    };
  }, [session.agents]);

  // Update decorations when cursors change
  useEffect(() => {
    updateCursorDecorations();
  }, [updateCursorDecorations]);

  // Active agents (exclude offline)
  const activeAgents = useMemo(() => 
    session.agents.filter(agent => agent.status !== 'offline'),
    [session.agents]
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Active Agents List */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-sm font-medium text-muted-foreground">
          Agents ({activeAgents.length})
        </div>
        
        {activeAgents.map(agent => {
          const Icon = getAgentIcon(agent.type);
          const cursor = session.cursors[agent.id];
          const hasActivity = cursor && 
            (new Date().getTime() - cursor.timestamp.getTime()) < 30000; // Active in last 30s
          
          return (
            <Tooltip key={agent.id}>
              <TooltipTrigger>
                <div
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border transition-all duration-200',
                    'hover:shadow-md cursor-pointer',
                    hoveredAgent === agent.id && 'ring-2 ring-primary/20',
                    hasActivity && 'animate-pulse'
                  )}
                  style={{ borderColor: agent.color + '40' }}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback 
                        style={{ backgroundColor: agent.color + '20' }}
                        className="text-xs font-semibold"
                      >
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status indicator */}
                    <div 
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                        getAgentStatusColor(agent.status)
                      )}
                    />
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div className="text-xs font-medium truncate">
                      {agent.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {agent.type}
                      </Badge>
                    </div>
                  </div>
                  
                  {hasActivity && (
                    <Activity className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </TooltipTrigger>
              
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-sm">
                    <div>Type: {agent.type}</div>
                    <div>Status: {agent.status}</div>
                    {cursor && (
                      <div>
                        Position: Line {cursor.position.lineNumber}, Column {cursor.position.column}
                      </div>
                    )}
                  </div>
                  
                  {agent.capabilities.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.slice(0, 3).map(cap => (
                          <Badge key={cap} variant="outline" className="text-xs px-1 py-0">
                            {cap}
                          </Badge>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{agent.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last activity: {agent.lastActivity.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Session Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Session: {session.id.substring(0, 8)}...
        </div>
        <div>
          Last activity: {session.lastActivity.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}