"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ComponentErrorBoundary, SectionErrorBoundary } from './error-boundary';
import { ErrorDisplay } from './ui/error-display';
import { ErrorHandler, AppError } from '../lib/error-handler';

// Component that throws errors for testing
function ErrorThrowingComponent({ errorType }: { errorType: string }) {
  switch (errorType) {
    case 'render':
      throw new Error('Simulated render error');
    case 'null_reference':
      // @ts-ignore - intentionally cause error
      const obj = null;
      return <div>{obj.property}</div>;
    case 'async':
      throw new Promise((_, reject) => reject(new Error('Async error')));
    case 'type':
      throw new TypeError('Type error occurred');
    default:
      return <div>No error</div>;
  }
}

// API error simulation component
function ApiErrorComponent() {
  const [error, setError] = useState<AppError | null>(null);

  const simulateApiError = async (statusCode: number) => {
    try {
      // Simulate API call
      const response = new Response(
        JSON.stringify({ message: `HTTP ${statusCode} error` }),
        { status: statusCode }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${statusCode}: ${response.statusText}`);
      }
    } catch (err) {
      const result = ErrorHandler.handleApiError(err, {
        url: '/api/test',
        action: 'test_api_call',
      });
      setError(result.error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Error Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => simulateApiError(400)} size="sm">
            400 Bad Request
          </Button>
          <Button onClick={() => simulateApiError(401)} size="sm">
            401 Unauthorized
          </Button>
          <Button onClick={() => simulateApiError(403)} size="sm">
            403 Forbidden
          </Button>
          <Button onClick={() => simulateApiError(404)} size="sm">
            404 Not Found
          </Button>
          <Button onClick={() => simulateApiError(429)} size="sm">
            429 Rate Limited
          </Button>
          <Button onClick={() => simulateApiError(500)} size="sm">
            500 Server Error
          </Button>
          <Button onClick={() => simulateApiError(503)} size="sm">
            503 Service Unavailable
          </Button>
        </div>
        
        {error && (
          <ErrorDisplay
            error={error}
            actions={[
              {
                type: 'retry',
                label: 'Retry',
                action: clearError,
                primary: true,
              },
              {
                type: 'ignore',
                label: 'Dismiss',
                action: clearError,
              },
            ]}
            onDismiss={clearError}
            variant="card"
            showDetails={true}
          />
        )}
      </CardContent>
    </Card>
  );
}

// SSE error simulation component
function SSEErrorComponent() {
  const [error, setError] = useState<AppError | null>(null);

  const simulateSSEError = (errorType: string) => {
    let err: any;
    
    switch (errorType) {
      case 'connection':
        err = new Error('Failed to establish SSE connection');
        break;
      case 'timeout':
        err = new Error('SSE connection timeout');
        break;
      case 'auth':
        err = new Error('SSE authentication failed');
        break;
      case 'parse':
        err = new Error('Failed to parse SSE event data');
        break;
      default:
        err = new Error('Unknown SSE error');
    }

    const result = ErrorHandler.handleSSEError(err, 'test-session-123', {
      action: 'sse_test',
      resource: 'test_connection',
    });
    setError(result.error);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SSE Error Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => simulateSSEError('connection')} size="sm">
            Connection Failed
          </Button>
          <Button onClick={() => simulateSSEError('timeout')} size="sm">
            Timeout
          </Button>
          <Button onClick={() => simulateSSEError('auth')} size="sm">
            Auth Failed
          </Button>
          <Button onClick={() => simulateSSEError('parse')} size="sm">
            Parse Error
          </Button>
        </div>
        
        {error && (
          <ErrorDisplay
            error={error}
            actions={[
              {
                type: 'retry',
                label: 'Reconnect',
                action: clearError,
                primary: true,
              },
              {
                type: 'ignore',
                label: 'Dismiss',
                action: clearError,
              },
            ]}
            onDismiss={clearError}
            variant="banner"
            showDetails={true}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Main error test component
export function ErrorTestComponent() {
  const [renderError, setRenderError] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Test Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This component tests various error scenarios and recovery mechanisms.
            Use this to verify that error boundaries and error handling work correctly.
          </p>
        </CardContent>
      </Card>

      {/* Error Boundary Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setRenderError('render')} size="sm">
              Throw Render Error
            </Button>
            <Button onClick={() => setRenderError('null_reference')} size="sm">
              Null Reference
            </Button>
            <Button onClick={() => setRenderError('type')} size="sm">
              Type Error
            </Button>
            <Button onClick={() => setRenderError(null)} size="sm" variant="outline">
              Clear Error
            </Button>
          </div>
          
          <Separator />
          
          <div className="border rounded p-4 min-h-[100px]">
            <ComponentErrorBoundary name="Test Component">
              {renderError ? (
                <ErrorThrowingComponent errorType={renderError} />
              ) : (
                <div className="text-green-600 font-medium">
                  ✓ Component is working normally
                </div>
              )}
            </ComponentErrorBoundary>
          </div>
        </CardContent>
      </Card>

      {/* Section Error Boundary Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Section Error Boundary Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionErrorBoundary name="Section A">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium">Section A</h4>
                <p className="text-sm text-gray-600">This section is working correctly.</p>
              </div>
            </SectionErrorBoundary>
            
            <SectionErrorBoundary name="Section B">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium">Section B</h4>
                <p className="text-sm text-gray-600">This section is also working.</p>
              </div>
            </SectionErrorBoundary>
          </div>
        </CardContent>
      </Card>

      {/* API Error Testing */}
      <ApiErrorComponent />

      {/* SSE Error Testing */}
      <SSEErrorComponent />

      {/* Error Display Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Error Display Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Inline Error</h4>
            <ErrorDisplay
              error={{
                id: 'test-inline',
                type: 'validation_error',
                message: 'Test validation error',
                userMessage: 'Please check your input and try again.',
                timestamp: new Date(),
                recoverable: true,
                retryable: false,
                category: 'validation',
                severity: 'medium',
                context: {},
              }}
              variant="inline"
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Toast Error</h4>
            <ErrorDisplay
              error={{
                id: 'test-toast',
                type: 'network_error',
                message: 'Test network error',
                userMessage: 'Network connection failed. Please try again.',
                timestamp: new Date(),
                recoverable: true,
                retryable: true,
                category: 'network',
                severity: 'high',
                context: {},
              }}
              variant="toast"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorTestComponent;