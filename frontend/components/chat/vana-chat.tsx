"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { ActivityFeed, ActivityItem } from '@/components/ui/activity-feed'
import { OnboardingFlow, OnboardingStep } from '@/components/ui/onboarding-flow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useChatContext } from '@/contexts/chat-context'
import { 
  Bot, 
  FileText, 
  CheckCircle,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// Types
interface VanaChatProps {
  className?: string
}

interface ProgressModalState {
  isVisible: boolean
  isMinimized: boolean
}

// Main Vana Chat Component
export function VanaChat({ className }: VanaChatProps) {
  const router = useRouter()
  const { research } = useChatContext()
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [progressModal, setProgressModal] = useState<ProgressModalState>({
    isVisible: false,
    isMinimized: false
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])

  const {
    sessionState,
    isResearchActive,
    isResearchComplete,
    startResearch,
    error
  } = research

  // Convert research session to activity items
  useEffect(() => {
    if (!sessionState) {
      setActivities([])
      setOnboardingSteps([])
      return
    }

    // Create research plan activity
    const planActivity: ActivityItem = {
      id: 'research-plan',
      type: 'plan',
      title: 'Research Plan Generated',
      description: `Multi-agent research strategy created for your query. ${sessionState.agents?.length || 0} specialized agents will collaborate to provide comprehensive analysis.`,
      timestamp: new Date(),
      status: sessionState.status === 'connected' ? 'current' : 'completed',
      agent: {
        name: 'Research Coordinator',
        role: 'Planning Agent'
      }
    }

    const newActivities = [planActivity]

    // Add agent activities
    if (sessionState.agents) {
      sessionState.agents.forEach((agent, index) => {
        newActivities.push({
          id: `agent-${index}`,
          type: 'agent',
          title: `${agent.name} Research`,
          description: agent.current_task || `Conducting specialized research in ${agent.name}`,
          timestamp: new Date(Date.now() - (index * 1000)),
          status: agent.status === 'current' ? 'current' : 
                  agent.status === 'completed' ? 'completed' : 'pending',
          agent: {
            name: agent.name,
            role: agent.agent_type || 'Research Agent'
          }
        })
      })
    }

    setActivities(newActivities)

    // Convert to onboarding steps
    const steps: OnboardingStep[] = [
      {
        id: 'initialization',
        title: 'Team Assembly',
        description: 'Setting up research agents',
        status: sessionState.currentPhase === 'Initializing' ? 'current' : 'completed',
        agent: { name: 'Coordinator', role: 'System' }
      },
      {
        id: 'planning',
        title: 'Research Planning',
        description: 'Creating research strategy',
        status: sessionState.currentPhase === 'Research Planning' ? 'current' : 
               ['Content Structure Planning', 'Active Research', 'Quality Assessment', 'Report Synthesis', 'Research Complete'].includes(sessionState.currentPhase) ? 'completed' : 'pending',
        agent: { name: 'Planner', role: 'Strategy Agent' }
      },
      {
        id: 'research',
        title: 'Active Research',
        description: 'Conducting primary research',
        status: sessionState.currentPhase === 'Active Research' ? 'current' : 
               ['Quality Assessment', 'Report Synthesis', 'Research Complete'].includes(sessionState.currentPhase) ? 'completed' : 'pending',
        progress: sessionState.currentPhase === 'Active Research' ? sessionState.overallProgress * 100 : undefined,
        agent: { name: 'Research Team', role: 'Multi-Agent' }
      },
      {
        id: 'synthesis',
        title: 'Report Synthesis',
        description: 'Synthesizing final report',
        status: sessionState.currentPhase === 'Report Synthesis' ? 'current' : 
               sessionState.currentPhase === 'Research Complete' ? 'completed' : 'pending',
        agent: { name: 'Synthesizer', role: 'Report Agent' }
      }
    ]

    setOnboardingSteps(steps)
  }, [sessionState])

  // Handle research start
  const handleStartResearch = useCallback(async (query: string) => {
    try {
      await startResearch(query)
      setShowActivityFeed(true)
    } catch (error) {
      console.error('Failed to start research:', error)
    }
  }, [startResearch])

  // Handle plan confirmation
  const handleConfirmPlan = useCallback((activityId: string) => {
    setShowActivityFeed(false)
    setProgressModal({ isVisible: true, isMinimized: false })
  }, [])

  // Handle plan modification
  const handleModifyPlan = useCallback((_activityId: string) => {
    // TODO: Allow user to modify research plan
    console.log('Modify plan requested')
  }, [])

  // Handle progress modal actions
  const handleMinimizeProgress = useCallback(() => {
    setProgressModal(prev => ({ ...prev, isMinimized: true }))
  }, [])

  const handleMaximizeProgress = useCallback(() => {
    setProgressModal(prev => ({ ...prev, isMinimized: false }))
  }, [])

  const handleCloseProgress = useCallback(() => {
    setProgressModal({ isVisible: false, isMinimized: false })
  }, [])

  // Handle view results
  const handleViewResults = useCallback(() => {
    router.push('/canvas')
  }, [router])

  // Auto-show progress modal when research starts
  useEffect(() => {
    if (isResearchActive && !showActivityFeed) {
      setProgressModal({ isVisible: true, isMinimized: false })
    }
  }, [isResearchActive, showActivityFeed])

  const getCurrentStep = () => {
    return onboardingSteps.findIndex(step => step.status === 'current')
  }

  const getOverallProgress = () => {
    if (!sessionState) return 0
    return sessionState.overallProgress * 100
  }

  return (
    <div className={cn('flex flex-col h-full w-full relative', className)}>
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h1 className="font-semibold">Vana Research Assistant</h1>
          </div>
          
          {isResearchActive && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Bot className="h-3 w-3 animate-pulse" />
                Research Active
              </Badge>
              {!progressModal.isVisible && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProgressModal({ isVisible: true, isMinimized: false })}
                  className="gap-1"
                >
                  <FileText className="h-3 w-3" />
                  View Progress
                </Button>
              )}
            </div>
          )}

          {isResearchComplete && (
            <Button
              onClick={handleViewResults}
              className="gap-1"
            >
              <FileText className="h-4 w-4" />
              View Results
            </Button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages />
        </div>

        {/* Activity Feed */}
        {showActivityFeed && activities.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <Card className="border-0 rounded-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Research Plan Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed
                  activities={activities}
                  onConfirm={handleConfirmPlan}
                  onCancel={handleModifyPlan}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          <ChatInput
            onSendMessage={handleStartResearch}
            disabled={isResearchActive}
            placeholder={
              isResearchActive
                ? 'Research in progress...'
                : 'Ask me anything for comprehensive multi-agent research...'
            }
          />
        </div>
      </div>

      {/* Progress Modal Overlay */}
      {progressModal.isVisible && onboardingSteps.length > 0 && (
        <OnboardingFlow
          steps={onboardingSteps}
          currentStep={getCurrentStep()}
          overallProgress={getOverallProgress()}
          isMinimized={progressModal.isMinimized}
          onMinimize={handleMinimizeProgress}
          onMaximize={handleMaximizeProgress}
          onClose={handleCloseProgress}
          title="Agent Research Progress"
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-40">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <X className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => research.clearError()}
                  className="text-red-600 hover:text-red-800"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default VanaChat