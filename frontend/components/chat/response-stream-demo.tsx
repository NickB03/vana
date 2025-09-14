/**
 * ResponseStream SSE Integration Demo
 * 
 * Demonstrates the ResponseStream integration with SSE streaming.
 * Shows both traditional SSE display and ResponseStream mode side-by-side.
 */

"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
// Separator import removed as it's not used in this component

import { useResponseStreamSSE, useResponseStreamFeatureFlag } from '@/hooks/use-response-stream-sse';
import { ResponseStreamWrapper } from '@/components/chat/response-stream-wrapper';
import { StreamingMessage } from '@/components/chat/streaming-message';

export function ResponseStreamDemo() {
  const [query, setQuery] = useState('Analyze the benefits of renewable energy');
  const [selectedMode, setSelectedMode] = useState<'typewriter' | 'fade'>('typewriter');
  const [selectedSpeed, setSelectedSpeed] = useState(30);
  
  const { isResponseStreamEnabled, toggleResponseStream } = useResponseStreamFeatureFlag();
  
  // Hook that supports both traditional SSE and ResponseStream
  const {
    // Traditional SSE results
    sessionState,
    isConnected,
    isLoading,
    error,
    startResearch,
    stopResearch,
    clearError,
    isResearchActive,
    isResearchComplete,
    hasError,
    
    // ResponseStream results
    responseStreamData,
    isResponseStreamMode,
    streamingError,
    switchToResponseStreamMode,
    switchToTraditionalMode,
  } = useResponseStreamSSE({
    enableResponseStream: isResponseStreamEnabled,
    streamMode: selectedMode,
    streamSpeed: selectedSpeed,
    onComplete: () => console.log('Research completed!'),
    onStreamComplete: () => console.log('ResponseStream completed!'),
    onError: (error) => console.error('Research error:', error),
    onProgress: (progress, phase) => console.log(`Progress: ${Math.round(progress * 100)}% - ${phase}`),
  });

  const handleStartResearch = useCallback(async () => {
    if (!query.trim()) return;
    
    try {
      await startResearch(query);
    } catch (err) {
      console.error('Failed to start research:', err);
    }
  }, [query, startResearch]);

  const handleStopResearch = useCallback(() => {
    stopResearch();
  }, [stopResearch]);

  const handleToggleMode = useCallback(() => {
    if (isResponseStreamMode) {
      switchToTraditionalMode();
    } else {
      switchToResponseStreamMode();
    }
  }, [isResponseStreamMode, switchToResponseStreamMode, switchToTraditionalMode]);

  const getTraditionalConnectionState = () => {
    if (hasError) return 'failed';
    if (isLoading) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const getTraditionalContent = () => {
    if (sessionState?.finalReport) {
      return sessionState.finalReport;
    }
    
    if (sessionState?.partialResults) {
      let content = '';
      Object.entries(sessionState.partialResults).forEach(([agentType, result]) => {
        if (result && typeof result === 'object' && 'content' in result) {
          content += (result as { content: string }).content + '\n\n';
        }
      });
      return content;
    }
    
    if (sessionState?.currentPhase) {
      return `Research in progress: ${sessionState.currentPhase}`;
    }
    
    return 'Waiting to start research...';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ResponseStream SSE Integration Demo</span>
            <div className="flex items-center gap-2">
              <Badge variant={isResponseStreamEnabled ? "default" : "secondary"}>
                {isResponseStreamEnabled ? "ResponseStream Mode" : "Traditional SSE"}
              </Badge>
              <Badge variant={isResearchActive ? "destructive" : "outline"}>
                {isResearchActive ? "Active" : "Idle"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="query">Research Query</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter research query..."
                disabled={isResearchActive}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="feature-flag"
                  checked={isResponseStreamEnabled}
                  onCheckedChange={toggleResponseStream}
                  disabled={isResearchActive}
                />
                <Label htmlFor="feature-flag">Enable ResponseStream Mode</Label>
              </div>
              
              {isResponseStreamEnabled && (
                <div className="space-y-2">
                  <Label>ResponseStream Settings</Label>
                  <div className="flex gap-2">
                    <select
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value as 'typewriter' | 'fade')}
                      className="flex-1 px-3 py-1 border rounded-md text-sm"
                      disabled={isResearchActive}
                    >
                      <option value="typewriter">Typewriter</option>
                      <option value="fade">Fade</option>
                    </select>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={selectedSpeed}
                      onChange={(e) => setSelectedSpeed(Number(e.target.value))}
                      className="flex-1"
                      disabled={isResearchActive}
                    />
                    <span className="text-xs text-gray-500 w-8">{selectedSpeed}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStartResearch}
              disabled={isResearchActive || !query.trim()}
              className="flex-1"
            >
              {isLoading ? 'Starting...' : 'Start Research'}
            </Button>
            <Button
              onClick={handleStopResearch}
              disabled={!isResearchActive}
              variant="outline"
            >
              Stop
            </Button>
            <Button
              onClick={handleToggleMode}
              disabled={!sessionState}
              variant="secondary"
            >
              Switch to {isResponseStreamMode ? 'Traditional' : 'ResponseStream'}
            </Button>
            {hasError && (
              <Button onClick={clearError} variant="ghost" size="sm">
                Clear Error
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Display Area */}
      <Card>
        <CardHeader>
          <CardTitle>Live Research Display</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={isResponseStreamMode ? "responsestream" : "traditional"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="traditional">Traditional SSE</TabsTrigger>
              <TabsTrigger value="responsestream">ResponseStream Mode</TabsTrigger>
            </TabsList>
            
            <TabsContent value="traditional" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Traditional SSE Display</h3>
                  {sessionState && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Progress: {Math.round(sessionState.overallProgress * 100)}%</span>
                      <span>•</span>
                      <span>{sessionState.agents.length} agents</span>
                    </div>
                  )}
                </div>
                
                <StreamingMessage
                  content={getTraditionalContent()}
                  isComplete={isResearchComplete}
                  error={error || undefined}
                  connectionState={getTraditionalConnectionState()}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="responsestream" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">ResponseStream Mode</h3>
                  {responseStreamData && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Mode: {selectedMode}</span>
                      <span>•</span>
                      <span>Speed: {selectedSpeed}</span>
                    </div>
                  )}
                </div>
                
                {responseStreamData ? (
                  <ResponseStreamWrapper
                    responseStreamData={responseStreamData}
                    mode={selectedMode}
                    speed={selectedSpeed}
                    onComplete={() => console.log('ResponseStream display completed')}
                    error={streamingError}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>Start a research session to see ResponseStream in action</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {(sessionState || responseStreamData) && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">SSE Session State</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(sessionState, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">ResponseStream Metadata</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(responseStreamData?.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}