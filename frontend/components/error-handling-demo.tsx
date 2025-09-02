'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  SSEConnectionError, 
  VanaBackendError, 
  StreamParsingError,
  isRetryableError,
  calculateBackoffDelay 
} from '@/lib/errors';
import { ErrorBoundary, useErrorHandler } from './error-boundary';

interface ErrorScenario {
  name: string;
  description: string;
  error: Error;
  category: 'sse' | 'vana' | 'parsing' | 'network';
}

const ERROR_SCENARIOS: ErrorScenario[] = [
  {
    name: 'SSE Connection Timeout',
    description: 'Server-Sent Events connection times out after 15 seconds',
    error: new SSEConnectionError(
      'SSE connection timeout',
      { 
        retryable: true, 
        retryAfter: 5000,
        reconnectAttempt: 1 
      }
    ),
    category: 'sse'
  },
  {
    name: 'SSE Connection Lost',
    description: 'Network connection drops during streaming',
    error: new SSEConnectionError(
      'Connection lost during streaming',
      { 
        retryable: true,
        reconnectAttempt: 3
      }
    ),
    category: 'sse'
  },
  {
    name: 'SSE Max Retries Exceeded',
    description: 'Connection fails after maximum retry attempts',
    error: new SSEConnectionError(
      'Connection failed after 5 retry attempts',
      { 
        retryable: false,
        reconnectAttempt: 5
      }
    ),
    category: 'sse'
  },
  {
    name: 'VANA Service Unavailable',
    description: 'VANA backend returns 503 Service Unavailable',
    error: new VanaBackendError(
      'VANA backend service is temporarily unavailable',
      'SERVICE_UNAVAILABLE',
      503,
      { 
        retryable: true,
        details: { endpoint: '/chat/stream', timestamp: Date.now() }
      }
    ),
    category: 'vana'
  },
  {
    name: 'VANA Authentication Error',
    description: 'VANA API authentication failure',
    error: new VanaBackendError(
      'Invalid API key or authentication failed',
      'AUTH_FAILED',
      401,
      { 
        retryable: false,
        details: { reason: 'Invalid credentials' }
      }
    ),
    category: 'vana'
  },
  {
    name: 'VANA Rate Limit',
    description: 'VANA API rate limit exceeded',
    error: new VanaBackendError(
      'API rate limit exceeded. Try again later.',
      'RATE_LIMIT_EXCEEDED',
      429,
      { 
        retryable: true,
        details: { retryAfter: 60000 }
      }
    ),
    category: 'vana'
  },
  {
    name: 'JSON Parsing Error',
    description: 'Invalid JSON received in SSE event',
    error: new StreamParsingError(
      'Failed to parse JSON in SSE event',
      '{ "type": "invalid", "data": { incomplete...',
      'json'
    ),
    category: 'parsing'
  },
  {
    name: 'Event Structure Error',
    description: 'SSE event missing required fields',
    error: new StreamParsingError(
      'Missing required field: type',
      '{ "data": { "content": "hello" }, "timestamp": 1234567890 }',
      'event'
    ),
    category: 'parsing'
  },
  {
    name: 'Message Format Error',
    description: 'Invalid message format in stream',
    error: new StreamParsingError(
      'Invalid message structure received',
      'agent_response_chunk:invalid-format-here',
      'message'
    ),
    category: 'parsing'
  },
  {
    name: 'Network Timeout',
    description: 'Generic network timeout error',
    error: new Error('Network request timed out'),
    category: 'network'
  }
];

function ErrorScenarioCard({ scenario, onTrigger }: { scenario: ErrorScenario; onTrigger: () => void }) {
  const isRetryable = isRetryableError(scenario.error);
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sse': return 'bg-blue-100 text-blue-800';
      case 'vana': return 'bg-purple-100 text-purple-800';
      case 'parsing': return 'bg-orange-100 text-orange-800';
      case 'network': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{scenario.name}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className={getCategoryColor(scenario.category)}>
              {scenario.category.toUpperCase()}
            </Badge>
            {isRetryable && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                RETRYABLE
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          {scenario.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs space-y-1">
          <div><strong>Error:</strong> {scenario.error.name}</div>
          <div><strong>Message:</strong> {scenario.error.message}</div>
          {scenario.error instanceof VanaBackendError && (
            <>
              <div><strong>Code:</strong> {scenario.error.code}</div>
              <div><strong>Status:</strong> {scenario.error.statusCode}</div>
            </>
          )}
          {scenario.error instanceof SSEConnectionError && (
            <>
              <div><strong>Attempt:</strong> {scenario.error.reconnectAttempt}</div>
              {scenario.error.retryAfter && (
                <div><strong>Retry After:</strong> {scenario.error.retryAfter}ms</div>
              )}
            </>
          )}
          {scenario.error instanceof StreamParsingError && (
            <>
              <div><strong>Parse Stage:</strong> {scenario.error.parseStage}</div>
              <div><strong>Raw Data:</strong> {scenario.error.rawData.substring(0, 50)}...</div>
            </>
          )}
        </div>
        
        <Button 
          onClick={onTrigger} 
          size="sm" 
          variant="outline"
          className="w-full"
        >
          Trigger Error
        </Button>
      </CardContent>
    </Card>
  );
}

function BackoffCalculatorDemo() {
  const [attempts, setAttempts] = useState<number[]>([]);
  
  const addAttempt = () => {
    const attempt = attempts.length;
    const delay = calculateBackoffDelay(attempt);
    setAttempts(prev => [...prev, delay]);
  };
  
  const reset = () => setAttempts([]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Exponential Backoff Calculator</CardTitle>
        <CardDescription className="text-xs">
          Demonstrates retry delay calculation with jitter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={addAttempt} size="sm" variant="outline">
            Add Retry Attempt
          </Button>
          <Button onClick={reset} size="sm" variant="outline">
            Reset
          </Button>
        </div>
        
        {attempts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium">Retry Delays:</div>
            {attempts.map((delay, index) => (
              <div key={`attempt-${index}-${delay}`} className="text-xs flex justify-between items-center">
                <span>Attempt {index + 1}:</span>
                <span className="font-mono">{Math.round(delay)}ms ({Math.round(delay/1000)}s)</span>
              </div>
            ))}
            <div className="text-xs text-muted-foreground mt-2">
              Total delay: {Math.round(attempts.reduce((sum, delay) => sum + delay, 0) / 1000)}s
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionStateDemo() {
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected');
  const [errors, setErrors] = useState<Error[]>([]);
  
  const simulateConnectionChange = (newState: typeof connectionState) => {
    setConnectionState(newState);
    
    if (newState === 'failed') {
      const error = new SSEConnectionError('Simulated connection failure', { retryable: false });
      setErrors(prev => [...prev.slice(-4), error]);
    } else if (newState === 'connected') {
      setErrors([]);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Connection State Demo</CardTitle>
        <CardDescription className="text-xs">
          Simulates different connection states and UI feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status Bar (like in enhanced-chat.tsx) */}
        <div className={`px-3 py-2 text-xs flex items-center gap-2 rounded border ${
          connectionState === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
          connectionState === 'reconnecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
          connectionState === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-gray-50 text-gray-700 border-gray-200'
        }`}>
          <div className={`size-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
            connectionState === 'failed' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          
          <span className="font-medium">
            VANA Backend: {
              connectionState === 'connected' ? 'Connected' :
              connectionState === 'reconnecting' ? 'Reconnecting...' :
              connectionState === 'failed' ? 'Connection Failed' :
              'Disconnected'
            }
          </span>
        </div>
        
        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => simulateConnectionChange('connected')} 
            size="sm" 
            variant="outline"
            className="text-xs"
          >
            Connect
          </Button>
          <Button 
            onClick={() => simulateConnectionChange('reconnecting')} 
            size="sm" 
            variant="outline"
            className="text-xs"
          >
            Reconnecting
          </Button>
          <Button 
            onClick={() => simulateConnectionChange('failed')} 
            size="sm" 
            variant="outline"
            className="text-xs"
          >
            Failed
          </Button>
          <Button 
            onClick={() => simulateConnectionChange('disconnected')} 
            size="sm" 
            variant="outline"
            className="text-xs"
          >
            Disconnect
          </Button>
        </div>
        
        {/* Error Display */}
        {errors.length > 0 && (
          <Alert>
            <AlertDescription className="text-xs">
              <div className="font-medium">Recent Connection Issues:</div>
              {errors.slice(-2).map((error, index) => (
                <div key={`error-${index}-${error.message.slice(0, 20)}`} className="opacity-75">
                  • {error.message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrorHandlingDemo() {
  const { handleError } = useErrorHandler();
  const [triggeredErrors, setTriggeredErrors] = useState<string[]>([]);
  
  const triggerError = (scenario: ErrorScenario) => {
    console.log('Triggering error scenario:', scenario.name);
    
    // Add to triggered list
    setTriggeredErrors(prev => [...prev, scenario.name]);
    
    // Handle the error (this will show toast notification)
    handleError(scenario.error, `Demo: ${scenario.name}`);
    
    // Log for debugging
    console.error('Demo error triggered:', scenario.error);
  };
  
  const clearTriggeredErrors = () => setTriggeredErrors([]);
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">VANA Error Handling Demo</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This demo showcases the comprehensive error handling system for VANA frontend integration.
          Click on any scenario to trigger the error and observe the handling behavior.
        </p>
        
        {triggeredErrors.length > 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Triggered Errors ({triggeredErrors.length}):</strong>
                  <div className="text-xs mt-1">
                    {triggeredErrors.slice(-3).map((name) => (
                      <div key={`error-${name}-${Date.now()}`}>• {name}</div>
                    ))}
                  </div>
                </div>
                <Button onClick={clearTriggeredErrors} size="sm" variant="outline">
                  Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Error Scenarios Grid */}
      <div>
        <h3 className="text-md font-medium mb-3">Error Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ERROR_SCENARIOS.map((scenario) => (
            <ErrorScenarioCard
              key={scenario.name}
              scenario={scenario}
              onTrigger={() => triggerError(scenario)}
            />
          ))}
        </div>
      </div>
      
      {/* Utility Demos */}
      <div>
        <h3 className="text-md font-medium mb-3">Utility Demonstrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BackoffCalculatorDemo />
          <ConnectionStateDemo />
        </div>
      </div>
      
      {/* Error Boundary Test */}
      <div>
        <h3 className="text-md font-medium mb-3">Error Boundary Test</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">React Error Boundary</CardTitle>
            <CardDescription className="text-xs">
              Tests the ErrorBoundary component with component crashes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBoundary
              enableRetry={true}
              maxRetries={3}
              showConnectionStatus={true}
            >
              <BuggyComponent />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Component that can intentionally crash for testing Error Boundary
function BuggyComponent() {
  const [shouldCrash, setShouldCrash] = useState(false);
  
  if (shouldCrash) {
    throw new SSEConnectionError('Intentional component crash for testing Error Boundary');
  }
  
  return (
    <div className="space-y-2">
      <p className="text-xs">This component can be made to crash to test the Error Boundary.</p>
      <Button 
        onClick={() => setShouldCrash(true)} 
        size="sm" 
        variant="destructive"
      >
        Crash Component
      </Button>
    </div>
  );
}

export default ErrorHandlingDemo;