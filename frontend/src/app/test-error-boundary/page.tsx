'use client'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import ErrorBoundaryTest from '@/components/ui/error-boundary-test'

export default function TestErrorBoundaryPage() {
  return (
    <ErrorBoundary
      componentName="TestErrorBoundaryPage"
      allowRetry={true}
      showErrorDetails={true}
      showHomeButton={true}
    >
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Error Boundary Testing</h1>
          <p className="text-muted-foreground">Development testing interface for error boundaries</p>
        </header>

        <main className="container mx-auto px-6 py-8">
          <ErrorBoundaryTest />
        </main>
      </div>
    </ErrorBoundary>
  )
}