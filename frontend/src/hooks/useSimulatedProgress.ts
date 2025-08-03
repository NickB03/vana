import { useEffect, useState, useCallback } from 'react'
import type { ThinkingStep } from '../components/ui/AIReasoning'

interface SimulationConfig {
  totalDuration: number // milliseconds
  phases: Array<{
    name: string
    agents: string[]
    duration: number // percentage of total
  }>
}

const DEFAULT_SIMULATION: SimulationConfig = {
  totalDuration: 15000, // 15 seconds total
  phases: [
    {
      name: 'planning',
      agents: ['Research Planner', 'Plan Generator'],
      duration: 20
    },
    {
      name: 'researching',
      agents: ['Researcher', 'Search Expert'],
      duration: 50
    },
    {
      name: 'evaluating',
      agents: ['Quality Evaluator'],
      duration: 20
    },
    {
      name: 'composing',
      agents: ['Report Composer'],
      duration: 10
    }
  ]
}

export function useSimulatedProgress(enabled: boolean = false) {
  const [steps, setSteps] = useState<ThinkingStep[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  
  const startSimulation = useCallback(() => {
    if (!enabled) return
    
    let elapsed = 0
    const startTime = Date.now()
    const simulation = DEFAULT_SIMULATION
    
    const interval = setInterval(() => {
      elapsed = Date.now() - startTime
      const progress = (elapsed / simulation.totalDuration) * 100
      
      // Determine current phase
      let accumulatedProgress = 0
      let phaseIndex = 0
      
      for (let i = 0; i < simulation.phases.length; i++) {
        accumulatedProgress += simulation.phases[i].duration
        if (progress <= accumulatedProgress) {
          phaseIndex = i
          break
        }
      }
      
      setCurrentPhaseIndex(phaseIndex)
      const currentPhase = simulation.phases[phaseIndex]
      
      // Generate steps for current phase
      const newSteps: ThinkingStep[] = []
      
      // Add completed phases
      for (let i = 0; i < phaseIndex; i++) {
        const phase = simulation.phases[i]
        phase.agents.forEach((agent, j) => {
          newSteps.push({
            id: `${phase.name}-${j}`,
            agent,
            action: `${phase.name} completed`,
            status: 'complete',
            duration: '2.5s'
          })
        })
      }
      
      // Add current phase steps
      currentPhase.agents.forEach((agent, j) => {
        newSteps.push({
          id: `${currentPhase.name}-${j}`,
          agent,
          action: `Currently ${currentPhase.name}...`,
          status: 'active'
        })
      })
      
      setSteps(newSteps)
      
      // Check if complete
      if (elapsed >= simulation.totalDuration) {
        clearInterval(interval)
        setIsComplete(true)
        
        // Mark all as complete
        setSteps(prev => prev.map(step => ({
          ...step,
          status: 'complete',
          duration: step.duration || '1.5s'
        })))
      }
    }, 500) // Update every 500ms
    
    return () => clearInterval(interval)
  }, [enabled])
  
  return {
    steps,
    isComplete,
    startSimulation,
    reset: () => {
      setSteps([])
      setIsComplete(false)
      setCurrentPhaseIndex(0)
    }
  }
}