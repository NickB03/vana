/**
 * Research Progress Panel Component
 * 
 * Comprehensive real-time research progress visualization with phase tracking,
 * overall progress indicators, streaming results, and error handling.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Activity,
  Users,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResearchSessionState } from "@/lib/research-sse-service";
import { AgentStatusDisplay, AgentStatusBar } from "./agent-status-display";

// ============================================================================
// Type Definitions
// ============================================================================

interface ResearchProgressPanelProps {
  sessionState: ResearchSessionState | null;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
  className?: string;
}

interface ProgressHeaderProps {
  sessionState: ResearchSessionState | null;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
}

interface PhaseIndicatorProps {
  currentPhase: string;
  progress: number;
  status: ResearchSessionState['status'];
}

interface ResultsSectionProps {
  partialResults: Record<string, unknown> | null;
  finalReport: string | null;
  status: ResearchSessionState['status'];
}

// ============================================================================
// Research Phase Configuration
// ============================================================================

const RESEARCH_PHASES = [
  { key: 'Initializing', name: 'Team Assembly', description: 'Setting up research agents' },
  { key: 'Research Planning', name: 'Planning', description: 'Creating research strategy' },
  { key: 'Content Structure Planning', name: 'Structure', description: 'Organizing content framework' },
  { key: 'Active Research', name: 'Research', description: 'Conducting primary research' },
  { key: 'Quality Assessment', name: 'Review', description: 'Evaluating findings' },
  { key: 'Report Synthesis', name: 'Writing', description: 'Synthesizing final report' },
  { key: 'Research Complete', name: 'Complete', description: 'Research finished' },
];

const getPhaseInfo = (currentPhase: string) => {
  return RESEARCH_PHASES.find(phase => phase.key === currentPhase) || 
         { key: currentPhase, name: currentPhase, description: '' };
};

const getPhaseProgress = (currentPhase: string) => {
  const index = RESEARCH_PHASES.findIndex(phase => phase.key === currentPhase);
  return index >= 0 ? ((index + 1) / RESEARCH_PHASES.length) * 100 : 0;
};

// ============================================================================
// Status Configuration
// ============================================================================

const getStatusConfig = (status: ResearchSessionState['status']) => {
  switch (status) {
    case 'connecting':
      return { icon: RefreshCw, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Connecting' };
    case 'connected':
      return { icon: Activity, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Connected' };
    case 'running':
      return { icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Research Active' };
    case 'completed':
      return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Completed' };
    case 'error':
      return { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Error' };
    case 'disconnected':
    default:
      return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-50', label: 'Disconnected' };
  }
};

// ============================================================================
// Progress Header Component
// ============================================================================

function ProgressHeader({ sessionState, isLoading, error, onStart, onStop, onRetry }: ProgressHeaderProps) {
  const canStart = !isLoading && !sessionState;
  const canStop = sessionState && ['connecting', 'connected', 'running'].includes(sessionState.status);
  const canRetry = error || (sessionState?.status === 'error');
  
  const statusConfig = sessionState ? getStatusConfig(sessionState.status) : null;
  const StatusIcon = statusConfig?.icon || Clock;
  
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            statusConfig?.bgColor || 'bg-gray-50'
          )}>
            <StatusIcon className={cn('h-5 w-5', statusConfig?.color || 'text-gray-500')} />
          </div>
          <div>
            <CardTitle className="text-lg">Multi-Agent Research</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {statusConfig?.label || 'Ready to start'}
              {sessionState?.sessionId && (
                <span className="ml-2 font-mono text-xs">
                  {sessionState.sessionId.split('_').pop()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
          {canStop && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="gap-1"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          {canStart && (
            <Button
              size="sm"
              onClick={onStart}
              disabled={isLoading}
              className="gap-1"
            >
              <Play className="h-4 w-4" />
              Start Research
            </Button>
          )}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium mb-1">Research Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}
    </CardHeader>
  );
}

// ============================================================================
// Phase Indicator Component
// ============================================================================

function PhaseIndicator({ currentPhase, progress, status }: PhaseIndicatorProps) {
  const phaseInfo = getPhaseInfo(currentPhase);
  const phaseProgress = getPhaseProgress(currentPhase);
  const isActive = status === 'running' || status === 'connected';
  
  return (
    <div className="space-y-4">
      {/* Current Phase */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{phaseInfo.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {phaseInfo.description}
          </p>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {Math.round(progress * 100)}%
        </Badge>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress * 100} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Overall Progress</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>
      
      {/* Phase Timeline */}
      <div className="flex items-center justify-between text-xs">
        {RESEARCH_PHASES.map((phase, index) => {
          const isCurrentPhase = phase.key === currentPhase;
          const isCompletedPhase = getPhaseProgress(currentPhase) > ((index + 1) / RESEARCH_PHASES.length) * 100;
          
          return (
            <div
              key={phase.key}
              className={cn(
                'flex flex-col items-center gap-1 flex-1',
                index > 0 && 'border-l border-gray-200 dark:border-gray-700'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isCurrentPhase
                    ? 'bg-blue-500'
                    : isCompletedPhase
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
              <span
                className={cn(
                  'text-center',
                  isCurrentPhase
                    ? 'text-blue-600 font-medium'
                    : isCompletedPhase
                    ? 'text-green-600'
                    : 'text-gray-500'
                )}
              >
                {phase.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Results Section Component
// ============================================================================

function ResultsSection({ partialResults, finalReport, status }: ResultsSectionProps) {
  const [selectedSection, setSelectedSection] = useState<string>('summary');
  
  const sections = partialResults ? Object.entries(partialResults) : [];
  const hasResults = finalReport || sections.length > 0;
  
  if (!hasResults) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto opacity-50" />
          <p className="text-sm">Research results will appear here</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Results Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <Button
          variant={selectedSection === 'summary' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedSection('summary')}
          className="shrink-0"
        >
          Summary
        </Button>
        {sections.map(([agentType]) => (
          <Button
            key={agentType}
            variant={selectedSection === agentType ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedSection(agentType)}
            className="shrink-0"
          >
            {agentType.replace('_', ' ').toUpperCase()}
          </Button>
        ))}
      </div>
      
      {/* Results Content */}
      <ScrollArea className="h-64 w-full rounded border">
        <div className="p-4">
          {selectedSection === 'summary' && (
            <div className="space-y-3">
              <h4 className="font-medium">Research Summary</h4>
              {finalReport ? (
                <div className="text-sm whitespace-pre-wrap">{finalReport}</div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {status === 'running' 
                    ? 'Research in progress... Final summary will be available upon completion.'
                    : 'Summary will be generated when research is complete.'
                  }
                </div>
              )}
            </div>
          )}
          
          {selectedSection !== 'summary' && (
            <div className="space-y-3">
              {(() => {
                const result = partialResults?.[selectedSection];
                if (result && typeof result === 'object' && result.content) {
                  return (
                    <>
                      <h4 className="font-medium">
                        {selectedSection.replace('_', ' ').toUpperCase()}
                      </h4>
                      <div className="text-sm whitespace-pre-wrap">
                        {result.content}
                      </div>
                    </>
                  );
                }
                return (
                  <div className="text-sm text-gray-500">
                    No content available for this section yet.
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Main Research Progress Panel Component
// ============================================================================

export function ResearchProgressPanel({
  sessionState,
  isLoading,
  error,
  onStart,
  onStop,
  onRetry,
  className,
}: ResearchProgressPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <Card className={cn('w-full', className)}>
      <ProgressHeader
        sessionState={sessionState}
        isLoading={isLoading}
        error={error}
        onStart={onStart}
        onStop={onStop}
        onRetry={onRetry}
      />
      
      <CardContent className="space-y-6">
        {/* Quick Status Bar */}
        {sessionState?.agents && sessionState.agents.length > 0 && (
          <AgentStatusBar agents={sessionState.agents} />
        )}
        
        {/* Phase Progress (only when active) */}
        {sessionState && sessionState.status !== 'disconnected' && (
          <PhaseIndicator
            currentPhase={sessionState.currentPhase}
            progress={sessionState.overallProgress}
            status={sessionState.status}
          />
        )}
        
        {/* Detailed Tabs */}
        {sessionState && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex-1">
                <Users className="h-4 w-4 mr-1" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1">
                <FileText className="h-4 w-4 mr-1" />
                Results
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {sessionState.agents?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Total Agents</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {sessionState.agents?.filter(a => a.status === 'completed').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {sessionState.agents?.filter(a => a.status === 'current').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Active</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold">
                      {Math.round(sessionState.overallProgress * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">Progress</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="agents" className="mt-4">
              {sessionState.agents && sessionState.agents.length > 0 ? (
                <AgentStatusDisplay agents={sessionState.agents} />
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">No agents active</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="results" className="mt-4">
              <ResultsSection
                partialResults={sessionState.partialResults}
                finalReport={sessionState.finalReport}
                status={sessionState.status}
              />
            </TabsContent>
          </Tabs>
        )}
        
        {/* Session Info */}
        {sessionState && (
          <div className="text-xs text-gray-500 border-t pt-4 flex justify-between">
            <span>Session: {sessionState.sessionId}</span>
            <span>Last Updated: {sessionState.lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}