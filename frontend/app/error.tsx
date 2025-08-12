'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Something went wrong!</h2>
      </div>
      
      <p className="text-center text-muted-foreground max-w-md">
        We apologize for the inconvenience. An unexpected error has occurred.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <pre className="bg-muted p-4 rounded-lg text-sm max-w-2xl overflow-auto">
          {error.message}
        </pre>
      )}
      
      <Button onClick={reset} className="flex items-center space-x-2">
        <RefreshCcw className="h-4 w-4" />
        <span>Try again</span>
      </Button>
    </div>
  )
}