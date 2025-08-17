'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  Code2, 
  Globe, 
  Terminal, 
  Upload, 
  Save,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { CanvasModes } from './canvas-modes';
import { ExportSystem } from './export-system';
import { CollaborativeEditor } from './collaborative-editor';
import { cn } from '@/lib/utils';
import type { 
  CanvasMode, 
  CanvasState, 
  CollaborativeSession, 
  AgentInfo 
} from '@/types/canvas';

interface CanvasSystemProps {
  initialMode?: CanvasMode;
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onModeChange?: (mode: CanvasMode) => void;
  enableCollaboration?: boolean;
  initialSession?: CollaborativeSession;
  onSessionUpdate?: (session: CollaborativeSession) => void;
  className?: string;
}

export function CanvasSystem({
  initialMode = 'markdown',
  initialContent = '',
  onContentChange,
  onModeChange,
  enableCollaboration = false,
  initialSession,
  onSessionUpdate,
  className
}: CanvasSystemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    currentMode: initialMode,
    content: {
      id: crypto.randomUUID(),
      mode: initialMode,
      title: 'Untitled Canvas',
      content: initialContent,
      lastModified: new Date()
    },
    isEditing: true,
    isDirty: false,
    collaborativeSession: enableCollaboration ? (initialSession || createDefaultSession()) : createDefaultSession()
  });

  // Create default collaborative session with demo agents
  function createDefaultSession(): CollaborativeSession {
    const canvasId = crypto.randomUUID();
    const now = new Date();
    
    const demoAgents: AgentInfo[] = [
      {
        id: 'agent-coder-1',
        name: 'CodeBot',
        type: 'coder',
        color: '#3B82F6',
        capabilities: ['javascript', 'typescript', 'react', 'debugging'],
        status: 'active',
        lastActivity: now
      },
      {
        id: 'agent-reviewer-1',
        name: 'ReviewBot',
        type: 'reviewer',
        color: '#10B981',
        capabilities: ['code-review', 'best-practices', 'security'],
        status: 'active',
        lastActivity: now
      },
      {
        id: 'agent-researcher-1',
        name: 'ResearchBot',
        type: 'researcher',
        color: '#F59E0B',
        capabilities: ['documentation', 'research', 'analysis'],
        status: 'idle',
        lastActivity: now
      },
      {
        id: 'agent-architect-1',
        name: 'ArchBot',
        type: 'architect',
        color: '#8B5CF6',
        capabilities: ['system-design', 'architecture', 'patterns'],
        status: 'working',
        lastActivity: now
      }
    ];

    return {
      id: `session-${canvasId}`,
      canvasId,
      agents: demoAgents,
      cursors: {},
      suggestions: [],
      activities: [],
      createdAt: now,
      lastActivity: now
    };
  }

  const handleModeChange = useCallback((mode: CanvasMode) => {
    setCanvasState(prev => ({
      ...prev,
      currentMode: mode,
      content: {
        ...prev.content,
        mode,
        lastModified: new Date()
      },
      isDirty: true
    }));
    onModeChange?.(mode);
  }, [onModeChange]);

  const handleContentChange = useCallback((content: string) => {
    setCanvasState(prev => ({
      ...prev,
      content: {
        ...prev.content,
        content,
        lastModified: new Date()
      },
      isDirty: true
    }));
    onContentChange?.(content);
  }, [onContentChange]);

  const handleTitleChange = useCallback((title: string) => {
    setCanvasState(prev => ({
      ...prev,
      content: {
        ...prev.content,
        title,
        lastModified: new Date()
      },
      isDirty: true
    }));
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const autoDetectedMode = detectModeFromFile(file);
      
      setCanvasState(prev => ({
        ...prev,
        currentMode: autoDetectedMode,
        content: {
          ...prev.content,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          content,
          mode: autoDetectedMode,
          lastModified: new Date()
        },
        isDirty: true
      }));

      onModeChange?.(autoDetectedMode);
      onContentChange?.(content);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }, [onContentChange, onModeChange]);

  const detectModeFromFile = (file: File): CanvasMode => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return 'code';
      case 'html':
      case 'htm':
      case 'css':
        return 'web';
      default:
        return 'markdown';
    }
  };

  const handleSave = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date()
    }));
  }, []);

  const handleSessionUpdate = useCallback((updatedSession: CollaborativeSession) => {
    setCanvasState(prev => ({
      ...prev,
      collaborativeSession: updatedSession
    }));
    onSessionUpdate?.(updatedSession);
  }, [onSessionUpdate]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const modeIcons = {
    markdown: FileText,
    code: Code2,
    web: Globe,
    sandbox: Terminal
  };

  const modeLabels = {
    markdown: 'Markdown',
    code: 'Code',
    web: 'Web',
    sandbox: 'Sandbox'
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-background',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Input
                value={canvasState.content.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Canvas Title"
              />
              {canvasState.isDirty && (
                <div className="w-2 h-2 bg-amber-500 rounded-full" title="Unsaved changes" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.js,.ts,.jsx,.tsx,.py,.html,.css,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File</TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!canvasState.isDirty}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Canvas</TooltipContent>
              </Tooltip>

              {/* Export System */}
              <ExportSystem
                content={canvasState.content}
                mode={canvasState.currentMode}
              />

              {/* Fullscreen Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mode Tabs */}
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="p-0">
          <Tabs value={canvasState.currentMode} onValueChange={handleModeChange as (value: string) => void}>
            <TabsList className="w-full justify-start rounded-none bg-muted/50">
              {Object.entries(modeLabels).map(([mode, label]) => {
                const Icon = modeIcons[mode as CanvasMode];
                return (
                  <TabsTrigger key={mode} value={mode} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Canvas Content */}
      <div className="flex-1 overflow-hidden">
        {enableCollaboration && canvasState.collaborativeSession && canvasState.currentMode === 'code' ? (
          <CollaborativeEditor
            value={canvasState.content.content}
            onChange={handleContentChange}
            language={canvasState.content.language || 'javascript'}
            session={canvasState.collaborativeSession}
            onSessionUpdate={handleSessionUpdate}
            height="100%"
          />
        ) : (
          <CanvasModes
            mode={canvasState.currentMode}
            content={canvasState.content.content}
            onContentChange={handleContentChange}
            title={canvasState.content.title}
            isFullscreen={isFullscreen}
          />
        )}
      </div>

      {/* Status Bar */}
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="py-2 px-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Mode: {modeLabels[canvasState.currentMode]}</span>
              <span>Characters: {canvasState.content.content.length}</span>
              <span>Words: {canvasState.content.content.split(/\s+/).filter(word => word.length > 0).length}</span>
              {enableCollaboration && canvasState.collaborativeSession && (
                <>
                  <span>•</span>
                  <span>
                    Agents: {canvasState.collaborativeSession.agents.filter(a => a.status !== 'offline').length} active
                  </span>
                  <span>
                    Suggestions: {canvasState.collaborativeSession.suggestions.filter(s => s.status === 'pending').length} pending
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {canvasState.lastSaved && (
                <span>Saved: {canvasState.lastSaved.toLocaleTimeString()}</span>
              )}
              <span>Modified: {canvasState.content.lastModified.toLocaleTimeString()}</span>
              {enableCollaboration && canvasState.collaborativeSession && (
                <>
                  <span>•</span>
                  <span>Session: {canvasState.collaborativeSession.id.substring(0, 8)}...</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}