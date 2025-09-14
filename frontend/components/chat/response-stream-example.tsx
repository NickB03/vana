/**
 * ResponseStream Integration Example
 * 
 * Demonstrates how to use the new prompt-kit ResponseStream integration
 * with existing SSE research endpoints.
 */

"use client";

import React from 'react';
import { StreamingMessagePromptKit } from './streaming-message-prompt-kit';
import { useStreamingResponse, useResponseStreamFeatureFlag } from '@/hooks/use-streaming-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function ResponseStreamExample() {
  const { isResponseStreamEnabled, toggleResponseStream } = useResponseStreamFeatureFlag();
  const {
    sessionState,
    isLoading,
    error,
    responseStreamData,
    isResponseStreamMode,
    startResearch,
    stopResearch,
    enableResponseStream,
    disableResponseStream,
    isResearchActive,
  } = useStreamingResponse({
    enableResponseStream: isResponseStreamEnabled,
    showAgentOverlay: true,
    showConnectionHealth: true,
  });

  const handleTest = async () => {
    await startResearch("Test query for ResponseStream integration");
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt-Kit ResponseStream Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feature Flag Control */}
          <div className="flex items-center space-x-2">
            <Switch
              id="responsestream-toggle"
              checked={isResponseStreamEnabled}
              onCheckedChange={toggleResponseStream}
            />
            <Label htmlFor="responsestream-toggle">
              Enable ResponseStream Mode
            </Label>
            <Badge variant={isResponseStreamEnabled ? "default" : "secondary"}>
              {isResponseStreamEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {/* Mode Control */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isResponseStreamMode ? "default" : "outline"}
              onClick={enableResponseStream}
              disabled={!isResponseStreamEnabled}
            >
              ResponseStream Mode
            </Button>
            <Button
              size="sm"
              variant={!isResponseStreamMode ? "default" : "outline"}
              onClick={disableResponseStream}
            >
              Traditional Mode
            </Button>
          </div>

          {/* Status Display */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current Mode:</strong> {isResponseStreamMode ? "ResponseStream" : "Traditional"}
            </div>
            <div>
              <strong>Research Active:</strong> {isResearchActive ? "Yes" : "No"}
            </div>
            <div>
              <strong>Stream Data:</strong> {responseStreamData ? "Available" : "None"}
            </div>
            <div>
              <strong>Session:</strong> {sessionState?.sessionId?.slice(-6) || "None"}
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isLoading || isResearchActive}
              size="sm"
            >
              Test Research Stream
            </Button>
            <Button
              onClick={stopResearch}
              disabled={!isResearchActive}
              variant="outline"
              size="sm"
            >
              Stop Research
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streaming Message Display */}
      {(sessionState || responseStreamData) && (
        <Card>
          <CardContent className="p-4">
            <StreamingMessagePromptKit
              content={sessionState?.finalReport || "Loading..."}
              isComplete={sessionState?.status === 'completed'}
              error={error || undefined}
              sessionState={sessionState}
              responseStreamData={responseStreamData}
              streamMode="typewriter"
              streamSpeed={30}
              showAgentOverlay={true}
              showConnectionHealth={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Development Info */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div><strong>Components:</strong> StreamingMessagePromptKit, ResponseStreamWrapper</div>
          <div><strong>Adapters:</strong> ResponseStreamAdapter for SSE conversion</div>
          <div><strong>Hooks:</strong> useStreamingResponse, useResponseStreamFeatureFlag</div>
          <div><strong>Feature Flags:</strong> enablePromptKitResponseStream</div>
          <div><strong>URL Override:</strong> Add ?responsestream=true to enable</div>
        </CardContent>
      </Card>
    </div>
  );
}