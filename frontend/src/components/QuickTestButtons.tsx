import { Button } from '@/components/ui/button'
import { Zap, TestTube, Gauge } from 'lucide-react'

interface QuickTestButtonsProps {
  onSendMessage: (message: string) => void
  className?: string
}

const QUICK_TEST_QUERIES = [
  {
    icon: <Zap className="w-4 h-4" />,
    label: "Quick Test",
    query: "What is 2+2?",
    description: "Minimal query for UI testing"
  },
  {
    icon: <TestTube className="w-4 h-4" />,
    label: "Simple Research",
    query: "List 3 benefits of water. Just list them briefly.",
    description: "Short research task"
  },
  {
    icon: <Gauge className="w-4 h-4" />,
    label: "UI Stress Test",
    query: "Research the Google Agent Starter Pack",
    description: "Full research flow"
  }
]

export function QuickTestButtons({ onSendMessage, className }: QuickTestButtonsProps) {
  // Temporarily always show for testing
  // if (!import.meta.env.DEV) {
  //   return null
  // }

  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-2">Quick Tests (Dev Only):</p>
      <div className="flex gap-2 flex-wrap">
        {QUICK_TEST_QUERIES.map((test, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSendMessage(test.query)}
            className="text-xs"
            title={test.description}
          >
            {test.icon}
            <span className="ml-1">{test.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}