"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle, 
  Clock, 
  Bot, 
  AlertCircle, 
  Minimize2,
  Maximize2,
  X,
  Users,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

// Onboarding Flow Types
export interface OnboardingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'current' | 'completed' | 'error'
  progress?: number
  agent?: {
    name: string
    role: string
  }
  substeps?: OnboardingStep[]
  errorMessage?: string
}

export interface OnboardingFlowProps {
  steps: OnboardingStep[]
  currentStep: number
  overallProgress: number
  isMinimized?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
  title?: string
  className?: string
}

// Step Component
function StepComponent({ step, isActive }: { step: OnboardingStep; isActive: boolean }) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'current':
        return <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = () => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Complete</Badge>
      case 'current':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">Active</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>
    }
  }

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
      isActive && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
      step.status === 'error' && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
    )}>
      {/* Status Icon */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm border">
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{step.title}</h4>
          {getStatusBadge()}
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {step.description}
        </p>

        {step.agent && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>{step.agent.name} • {step.agent.role}</span>
          </div>
        )}

        {/* Progress for current step */}
        {step.status === 'current' && step.progress !== undefined && (
          <div className="space-y-1">
            <Progress value={step.progress} className="h-1" />
            <div className="text-xs text-gray-500">
              {Math.round(step.progress)}% complete
            </div>
          </div>
        )}

        {/* Error message */}
        {step.status === 'error' && step.errorMessage && (
          <div className="text-xs text-red-600 dark:text-red-400">
            {step.errorMessage}
          </div>
        )}

        {/* Substeps */}
        {step.substeps && step.substeps.length > 0 && step.status === 'current' && (
          <div className="ml-4 space-y-1 border-l-2 border-blue-200 pl-3">
            {step.substeps.map((substep) => (
              <div key={substep.id} className="flex items-center gap-2 text-xs">
                {getStatusIcon()}
                <span className={cn(
                  substep.status === 'completed' ? 'text-green-600' : 'text-gray-600'
                )}>
                  {substep.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main Onboarding Flow Component  
export function OnboardingFlow({
  steps,
  currentStep,
  overallProgress,
  isMinimized = false,
  onMinimize,
  onMaximize,
  onClose,
  title = "Agent Research Progress",
  className
}: OnboardingFlowProps) {
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.length

  if (isMinimized) {
    return (
      <Card className={cn("w-80 fixed bottom-4 right-4 z-50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {completedSteps}/{totalSteps}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMaximize}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={overallProgress} className="h-1 mt-2" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-96 fixed bottom-4 right-4 z-50 max-h-[80vh] flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {completedSteps} of {totalSteps} complete
            </Badge>
            {onMinimize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMinimize}
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {steps.map((step, index) => (
          <StepComponent
            key={step.id}
            step={step}
            isActive={index === currentStep}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export default OnboardingFlow