import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      
      <div className="flex space-x-4">
        <Button onClick={() => window.history.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  )
}