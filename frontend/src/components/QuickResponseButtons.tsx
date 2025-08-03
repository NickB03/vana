import { Button } from '@/components/ui/button'
import { CheckCircle, FileText, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickResponseButtonsProps {
  messageContent: string
  onSendMessage: (message: string) => void
  className?: string
}

export function QuickResponseButtons({ 
  messageContent, 
  onSendMessage,
  className 
}: QuickResponseButtonsProps) {
  const lowerContent = messageContent.toLowerCase()
  
  // Detect different types of agent questions
  const isAskingToCreatePlan = lowerContent.includes('would like me to create a research plan')
  const isAskingForApproval = lowerContent.includes('does this research plan look good')
  
  if (!isAskingToCreatePlan && !isAskingForApproval) {
    return null
  }
  
  return (
    <div className={cn("flex gap-2 mt-3", className)}>
      {isAskingToCreatePlan && (
        <>
          <Button
            onClick={() => onSendMessage('Yes, please create a research plan for the benefits of water')}
            size="sm"
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
          <Button
            onClick={() => onSendMessage('No, let me rephrase my question')}
            size="sm"
            variant="outline"
            className="border-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Rephrase
          </Button>
        </>
      )}
      
      {isAskingForApproval && (
        <>
          <Button
            onClick={() => onSendMessage('Yes, proceed with the research')}
            size="sm"
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve & Run
          </Button>
          <Button
            onClick={() => onSendMessage('Please make changes to the plan')}
            size="sm"
            variant="outline"
            className="border-gray-700"
          >
            Request Changes
          </Button>
        </>
      )}
    </div>
  )
}