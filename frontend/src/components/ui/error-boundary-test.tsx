'use client'

/**
 * Error Boundary Test Component
 *
 * This component is used to test error boundary functionality
 * Only use in development environment
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface TestErrorProps {
  errorType: 'runtime' | 'network' | 'chunk' | 'type' | 'custom'
}

function TestError({ errorType }: TestErrorProps) {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    switch (errorType) {
      case 'runtime':
        throw new Error('Test runtime error: Something went wrong in the component')

      case 'network':
        const networkError = new Error('Network Error: Failed to fetch data from server')
        networkError.name = 'NetworkError'
        throw networkError

      case 'chunk':
        const chunkError = new Error('Loading chunk 0 failed')
        chunkError.name = 'ChunkLoadError'
        throw chunkError

      case 'type':
        // This will cause a TypeError
        const obj: null = null
        // @ts-expect-error - Intentionally accessing property of null for testing
        return obj.someProperty.map(() => {})

      case 'custom':
        const customError = new Error('Custom error with specific handling')
        customError.name = 'CustomTestError'
        throw customError

      default:
        throw new Error('Unknown error type')
    }
  }

  const getButtonText = () => {
    switch (errorType) {
      case 'runtime': return 'Trigger Runtime Error'
      case 'network': return 'Trigger Network Error'
      case 'chunk': return 'Trigger Chunk Load Error'
      case 'type': return 'Trigger Type Error'
      case 'custom': return 'Trigger Custom Error'
      default: return 'Trigger Error'
    }
  }

  const getDescription = () => {
    switch (errorType) {
      case 'runtime': return 'Tests general runtime error handling'
      case 'network': return 'Tests network-related error handling'
      case 'chunk': return 'Tests code splitting/chunk loading error handling'
      case 'type': return 'Tests TypeError handling (null/undefined access)'
      case 'custom': return 'Tests custom error type handling'
      default: return 'Tests error handling'
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-sm">{errorType.toUpperCase()} Error Test</CardTitle>
        <CardDescription className="text-xs">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShouldError(true)}
          className="w-full"
        >
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ErrorBoundaryTest() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Error Boundary Test Suite</h2>
        <p className="text-muted-foreground">
          Test different types of errors to verify error boundary functionality
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ErrorBoundary
          componentName="RuntimeErrorTest"
          allowRetry={true}
          showErrorDetails={true}
        >
          <TestError errorType="runtime" />
        </ErrorBoundary>

        <ErrorBoundary
          componentName="NetworkErrorTest"
          allowRetry={true}
          showErrorDetails={true}
        >
          <TestError errorType="network" />
        </ErrorBoundary>

        <ErrorBoundary
          componentName="ChunkErrorTest"
          allowRetry={true}
          showErrorDetails={true}
        >
          <TestError errorType="chunk" />
        </ErrorBoundary>

        <ErrorBoundary
          componentName="TypeErrorTest"
          allowRetry={true}
          showErrorDetails={true}
        >
          <TestError errorType="type" />
        </ErrorBoundary>

        <ErrorBoundary
          componentName="CustomErrorTest"
          allowRetry={true}
          showErrorDetails={true}
        >
          <TestError errorType="custom" />
        </ErrorBoundary>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Development Only</h3>
        <p className="text-sm text-yellow-700">
          This test component only appears in development mode. Each card tests a different
          type of error to ensure the error boundaries handle them appropriately with proper
          fallbacks and user-friendly error messages.
        </p>
      </div>
    </div>
  )
}