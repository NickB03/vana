import React, { useState, useEffect } from 'react'
import { AIToolsContainer } from './ui/ai-tool'
import { transformThinkingStepsToAITools } from '../utils/ai-tool-transformer'
import type { ThinkingStep } from './ui/AIReasoning'

/**
 * Demo component to showcase the consolidated agent activity view
 */
export function AgentActivityDemo() {
  const [steps, setSteps] = useState<ThinkingStep[]>([])

  // Simulate agent activities over time
  useEffect(() => {
    const simulatedSteps: ThinkingStep[] = [
      // Research Planner - multiple planning steps
      {
        id: 'plan-1',
        agent: 'plan_generator',
        action: 'Generating comprehensive research structure for "AI impact on software development"',
        status: 'complete',
        duration: 1200,
        details: 'Created 5-section research outline'
      },
      {
        id: 'plan-2',
        agent: 'plan_generator', 
        action: 'Refining research objectives and methodology',
        status: 'complete',
        duration: 800
      },
      {
        id: 'plan-3',
        agent: 'plan_generator',
        action: 'Finalizing research timeline and deliverables',
        status: 'complete',
        duration: 600
      },
      
      // Section Researcher - active research
      {
        id: 'research-1',
        agent: 'section_researcher',
        action: 'Searching for recent studies on AI development tools',
        status: 'complete',
        duration: 2100
      },
      {
        id: 'research-2', 
        agent: 'section_researcher',
        action: 'Analyzing research papers on LLM-assisted coding',
        status: 'active'
      },
      {
        id: 'research-3',
        agent: 'section_researcher',
        action: 'Gathering industry reports on AI adoption in software teams',
        status: 'pending'
      },
      
      // Report Composer - pending
      {
        id: 'compose-1',
        agent: 'report_composer_with_citations',
        action: 'Compiling findings into structured report sections',
        status: 'pending'
      }
    ]

    // Simulate progressive loading of steps
    let stepIndex = 0
    const interval = setInterval(() => {
      if (stepIndex < simulatedSteps.length) {
        setSteps(prev => [...prev, simulatedSteps[stepIndex]])
        stepIndex++
      } else {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const tools = transformThinkingStepsToAITools(steps)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">
          Consolidated Agent Activity Demo
        </h1>
        <p className="text-[var(--text-secondary)]">
          Showing how multiple agent calls are grouped into unified progress views
        </p>
      </div>

      <div className="bg-[var(--bg-element)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Before: Individual Tool Boxes (Old Behavior)
        </h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Multiple "Research Planner" boxes (5-6 identical entries)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Cluttered interface with repeated agent names</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>No high-level progress indication</span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-element)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          After: Consolidated Agent View (New Behavior)
        </h2>
        
        {tools.length > 0 ? (
          <AIToolsContainer 
            tools={tools}
            title="Agent Execution Progress"
          />
        ) : (
          <div className="text-center text-[var(--text-secondary)] py-8">
            <div className="animate-pulse">Loading agent activities...</div>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-element)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Key Improvements
        </h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span><strong className="text-green-400">One box per agent type</strong> - No more duplicate entries</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span><strong className="text-green-400">Progress tracking</strong> - Shows completed/total tasks with progress bar</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span><strong className="text-green-400">High-level descriptions</strong> - Focus on what agents are accomplishing</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span><strong className="text-green-400">Real-time status</strong> - Clear indication of pending/running/completed states</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span><strong className="text-green-400">Cleaner interface</strong> - Summary statistics in header</span>
          </div>
        </div>
      </div>
    </div>
  )
}