import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const handleLoginClick = () => {
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 right-0 p-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLoginClick}
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <User className="h-5 w-5" />
        </Button>
      </header>
      
      {/* Main content */}
      {children}
    </div>
  )
}