'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  MessageSquare, 
  Eye, 
  EyeOff,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { MonacoEditor } from './monaco-editor';
import { AgentCursors } from './agent-cursors';
import { AgentSuggestions } from './agent-suggestions';
import type { 
  CollaborativeSession, 
  AgentSuggestion, 
  AgentCursor, 
  AgentActivity
} from '@/types/canvas';

interface CollaborativeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light';
  session: CollaborativeSession;
  onSessionUpdate?: (session: CollaborativeSession) => void;
  readOnly?: boolean;
  className?: string;
  height?: string | number;
}

export function CollaborativeEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  session,
  onSessionUpdate,
  readOnly = false,
  className,
  height = '100%'
}: CollaborativeEditorProps) {
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const [showAgents, setShowAgents] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'suggestions' | 'activity'>('agents');
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulate agent activity for demo purposes
  const simulateAgentActivity = useCallback(() => {
    if (!session || isSimulating) return;
    
    setIsSimulating(true);
    
    // Simulate cursors moving and suggestions being created
    const agents = session.agents.filter(a => a.status !== 'offline');
    if (agents.length === 0) {
      setIsSimulating(false);
      return;
    }

    const simulationInterval = setInterval(() => {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const lineCount = value.split('\n').length;
      const randomLine = Math.floor(Math.random() * lineCount) + 1;
      const randomColumn = Math.floor(Math.random() * 20) + 1;

      // Update cursor position
      const updatedCursors = {
        ...session.cursors,
        [randomAgent.id]: {
          agentId: randomAgent.id,
          position: { lineNumber: randomLine, column: randomColumn },
          timestamp: new Date()
        } as AgentCursor
      };

      // Occasionally create a suggestion
      const shouldCreateSuggestion = Math.random() < 0.3;
      let updatedSuggestions = session.suggestions;
      
      if (shouldCreateSuggestion) {
        const suggestionTypes: AgentSuggestion['type'][] = ['edit', 'comment', 'review', 'optimization', 'bug-fix'];
        const randomType = suggestionTypes[Math.floor(Math.random() * suggestionTypes.length)];
        
        const newSuggestion: AgentSuggestion = {
          id: crypto.randomUUID(),
          agentId: randomAgent.id,
          type: randomType,
          position: { lineNumber: randomLine, column: randomColumn },
          title: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} suggestion`,
          description: `Agent ${randomAgent.name} suggests a ${randomType} at line ${randomLine}`,
          confidence: 0.7 + Math.random() * 0.3,
          status: 'pending',
          timestamp: new Date()
        };
        
        updatedSuggestions = [...session.suggestions, newSuggestion];
      }

      // Create activity record
      const newActivity: AgentActivity = {
        id: crypto.randomUUID(),
        agentId: randomAgent.id,
        type: shouldCreateSuggestion ? 'suggestion' : 'cursor-move',
        timestamp: new Date(),
        data: { line: randomLine, column: randomColumn }
      };

      const updatedSession: CollaborativeSession = {
        ...session,
        cursors: updatedCursors,
        suggestions: updatedSuggestions,
        activities: [...session.activities, newActivity].slice(-50), // Keep last 50 activities
        lastActivity: new Date()
      };

      onSessionUpdate?.(updatedSession);
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds

    // Stop simulation after 30 seconds
    setTimeout(() => {
      clearInterval(simulationInterval);
      setIsSimulating(false);
    }, 30000);
  }, [session, onSessionUpdate, value, isSimulating]);

  // Handle suggestion actions
  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    const updatedSuggestions = session.suggestions.map(suggestion =>
      suggestion.id === suggestionId
        ? { ...suggestion, status: 'accepted' as const }
        : suggestion
    );
    
    const updatedSession: CollaborativeSession = {
      ...session,
      suggestions: updatedSuggestions,
      lastActivity: new Date()
    };
    
    onSessionUpdate?.(updatedSession);
  }, [session, onSessionUpdate]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    const updatedSuggestions = session.suggestions.map(suggestion =>
      suggestion.id === suggestionId
        ? { ...suggestion, status: 'rejected' as const }
        : suggestion
    );
    
    const updatedSession: CollaborativeSession = {
      ...session,
      suggestions: updatedSuggestions,
      lastActivity: new Date()
    };
    
    onSessionUpdate?.(updatedSession);
  }, [session, onSessionUpdate]);

  const handleViewSuggestion = useCallback((suggestion: AgentSuggestion) => {
    // Navigate to suggestion position in editor
    if (editorRef.current) {
      editorRef.current.setPosition({
        lineNumber: suggestion.position.lineNumber,
        column: suggestion.position.column
      });
      
      editorRef.current.revealLineInCenter(suggestion.position.lineNumber);
      editorRef.current.focus();
    }
  }, []);

  // Activity stats
  const activityStats = useMemo(() => {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentActivities = session.activities.filter(
      activity => activity.timestamp > lastHour
    );
    
    return {
      total: session.activities.length,
      recent: recentActivities.length,
      byType: recentActivities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [session.activities]);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <MonacoEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          language={language}
          theme={theme}
          readOnly={readOnly}
          height={height}
          className="flex-1"
        />
        
        {/* Editor Footer */}
        <Card className="rounded-none border-x-0 border-b-0">
          <CardContent className="py-2 px-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Language: {language}</span>
                <span>Theme: {theme}</span>
                <span>Lines: {value.split('\n').length}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={simulateAgentActivity}
                  disabled={isSimulating}
                  className="h-auto p-1 text-xs"
                >
                  {isSimulating ? (
                    <>
                      <Activity className="h-3 w-3 mr-1 animate-pulse" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Simulate Activity
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAgents(!showAgents)}
                    className="h-auto p-1"
                  >
                    {showAgents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <span>Show Panel</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Collaboration Panel */}
      {showAgents && (
        <>
          <Separator orientation="vertical" />
          
          <div className="w-80 flex flex-col bg-muted/50">
            {/* Panel Header */}
            <Card className="rounded-none border-x-0 border-t-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">Collaboration</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {session.agents.filter(a => a.status !== 'offline').length} active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAgents(false)}
                      className="h-auto p-1"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab as (value: string) => void}>
                <Card className="rounded-none border-x-0">
                  <CardContent className="p-0">
                    <TabsList className="w-full justify-start rounded-none bg-transparent">
                      <TabsTrigger value="agents" className="flex-1">
                        <Users className="h-4 w-4 mr-1" />
                        Agents
                      </TabsTrigger>
                      <TabsTrigger value="suggestions" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Suggestions
                        {session.suggestions.filter(s => s.status === 'pending').length > 0 && (
                          <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                            {session.suggestions.filter(s => s.status === 'pending').length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="flex-1">
                        <Activity className="h-4 w-4 mr-1" />
                        Activity
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                <div className="flex-1 overflow-y-auto p-4">
                  <TabsContent value="agents" className="mt-0">
                    <AgentCursors 
                      session={session}
                      editorRef={editorRef}
                    />
                  </TabsContent>

                  <TabsContent value="suggestions" className="mt-0">
                    <AgentSuggestions
                      session={session}
                      onAcceptSuggestion={handleAcceptSuggestion}
                      onRejectSuggestion={handleRejectSuggestion}
                      onViewSuggestion={handleViewSuggestion}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    <div className="space-y-4">
                      {/* Activity Stats */}
                      <Card>
                        <CardHeader className="pb-2">
                          <h4 className="font-medium text-sm">Activity Overview</h4>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Total Activities</div>
                              <div className="font-semibold">{activityStats.total}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Last Hour</div>
                              <div className="font-semibold">{activityStats.recent}</div>
                            </div>
                          </div>
                          
                          {Object.keys(activityStats.byType).length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground mb-2">Recent Activity Types</div>
                              <div className="space-y-1">
                                {Object.entries(activityStats.byType).map(([type, count]) => (
                                  <div key={type} className="flex justify-between text-xs">
                                    <span className="capitalize">{type.replace('-', ' ')}</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Recent Activity Feed */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Recent Activity</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {session.activities.slice(-10).reverse().map(activity => {
                            const agent = session.agents.find(a => a.id === activity.agentId);
                            return (
                              <div key={activity.id} className="text-xs p-2 bg-background rounded border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium" style={{ color: agent?.color }}>
                                    {agent?.name || 'Unknown Agent'}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {activity.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-muted-foreground capitalize">
                                  {activity.type.replace('-', ' ')}
                                  {activity.data.line && ` at line ${activity.data.line}`}
                                </div>
                              </div>
                            );
                          })}
                          
                          {session.activities.length === 0 && (
                            <div className="text-center text-muted-foreground py-4">
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No activity yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </>
      )}
    </div>
  );
}