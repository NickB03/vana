import type { ThinkingStep } from '../components/ui/AIReasoning'
import type { AIToolProps, AIToolParameter, AIToolResult } from '../components/ui/ai-tool'

/**
 * Consolidated agent activity that groups multiple steps by agent
 */
export interface ConsolidatedAgentActivity {
  agentName: string
  displayName: string
  status: 'pending' | 'running' | 'completed' | 'error'
  steps: ThinkingStep[]
  currentAction?: string
  progress: {
    completed: number
    total: number
  }
  totalDuration?: number
  lastActivity?: Date
}

/**
 * Transform thinking steps into consolidated agent activities for better visualization
 */
export function transformThinkingStepsToAITools(steps: ThinkingStep[]): AIToolProps[] {
  const consolidatedActivities = consolidateAgentActivities(steps)
  
  return consolidatedActivities.map((activity) => {
    const tool: AIToolProps = {
      name: activity.agentName,
      title: activity.displayName,
      status: activity.status,
      duration: activity.totalDuration,
      parameters: extractConsolidatedParameters(activity),
      result: activity.status === 'completed' ? extractConsolidatedResult(activity) : undefined,
      collapsible: true,
      defaultExpanded: activity.status === 'running' || (activity.status === 'completed' && activity.steps.length === 1)
    }

    return tool
  })
}

/**
 * Consolidate thinking steps by agent to show unified progress
 */
export function consolidateAgentActivities(steps: ThinkingStep[]): ConsolidatedAgentActivity[] {
  // Group steps by agent
  const agentGroups = steps.reduce((groups, step) => {
    const agentName = step.agent || 'unknown_agent'
    if (!groups[agentName]) {
      groups[agentName] = []
    }
    groups[agentName].push(step)
    return groups
  }, {} as Record<string, ThinkingStep[]>)

  // Create consolidated activities
  return Object.entries(agentGroups).map(([agentName, agentSteps]: [string, ThinkingStep[]]) => {
    const completedSteps = agentSteps.filter(s => s.status === 'complete')
    const activeSteps = agentSteps.filter(s => s.status === 'active')
    const pendingSteps = agentSteps.filter(s => s.status === 'pending')

    // Determine overall status
    let status: ConsolidatedAgentActivity['status']
    if (activeSteps.length > 0) {
      status = 'running'
    } else if (pendingSteps.length > 0) {
      status = 'pending'
    } else if (completedSteps.length === agentSteps.length) {
      status = 'completed'
    } else {
      status = 'error'
    }

    // Get current action (most recent active or latest step)
    const currentAction = activeSteps.length > 0 
      ? activeSteps[activeSteps.length - 1].action
      : agentSteps[agentSteps.length - 1]?.action

    // Calculate total duration for completed steps
    const totalDuration = completedSteps.reduce((total, step) => {
      const duration = typeof step.duration === 'string' ? parseInt(step.duration) : step.duration
      return total + (duration || 0)
    }, 0)

    return {
      agentName,
      displayName: getAgentDisplayName(agentName),
      status,
      steps: agentSteps,
      currentAction: generateProgressDescription(status, currentAction, completedSteps.length, agentSteps.length),
      progress: {
        completed: completedSteps.length,
        total: agentSteps.length
      },
      totalDuration: totalDuration || undefined,
      lastActivity: new Date()
    }
  })
}

/**
 * Generate a high-level progress description for the agent
 */
function generateProgressDescription(
  status: ConsolidatedAgentActivity['status'], 
  currentAction?: string,
  completed?: number,
  total?: number
): string {
  switch (status) {
    case 'pending':
      return 'Waiting to start...'
    case 'running':
      if (currentAction) {
        // Clean up the action description for display
        const cleanAction = currentAction
          .replace(/^(Generating|Searching|Analyzing|Composing|Routing)\s*/i, '')
          .replace(/\.\.\.$/, '')
          .trim()
        return cleanAction || 'Processing...'
      }
      return 'Processing...'
    case 'completed':
      if (completed && total && completed > 1) {
        return `Completed ${completed} tasks successfully`
      }
      return 'Task completed successfully'
    case 'error':
      return 'Error occurred during execution'
    default:
      return 'Unknown status'
  }
}

/**
 * Extract consolidated parameters from all steps of an agent activity
 */
function extractConsolidatedParameters(activity: ConsolidatedAgentActivity): AIToolParameter[] {
  const allParameters: AIToolParameter[] = []
  
  // Add current action description as primary parameter
  if (activity.currentAction) {
    allParameters.push({
      name: 'currentAction',
      value: activity.currentAction,
      type: 'string'
    })
  }
  
  // Add progress information
  if (activity.progress.total > 1) {
    allParameters.push({
      name: 'progress',
      value: `${activity.progress.completed}/${activity.progress.total}`,
      type: 'string'
    })
  }
  
  // Extract unique parameters from all steps (but limit to avoid clutter)
  const seenParams = new Set<string>()
  const maxParams = 3 // Limit to most important parameters
  
  activity.steps.forEach(step => {
    if (allParameters.length >= maxParams + 2) return // +2 for currentAction and progress
    
    const stepParams = extractParameters(step.action)
    stepParams.forEach(param => {
      if (allParameters.length >= maxParams + 2) return
      
      const key = `${param.name}:${param.value}`
      if (!seenParams.has(key) && param.name !== 'progress') {
        seenParams.add(key)
        allParameters.push(param)
      }
    })
  })

  return allParameters
}

/**
 * Extract consolidated result from completed agent activity
 */
function extractConsolidatedResult(activity: ConsolidatedAgentActivity): AIToolResult {
  const completedSteps = activity.steps.filter(s => s.status === 'complete')
  
  if (completedSteps.length === 0) {
    return {
      summary: 'No completed tasks',
      details: 'Agent has not completed any tasks yet'
    }
  }

  // Generate summary based on agent type and completed tasks
  let summary = ''
  const agentType = activity.agentName.toLowerCase()
  
  if (agentType.includes('plan')) {
    summary = `Research plan generated with ${completedSteps.length} step${completedSteps.length > 1 ? 's' : ''}`
  } else if (agentType.includes('search') || agentType.includes('research')) {
    summary = `Research completed across ${completedSteps.length} search${completedSteps.length > 1 ? 'es' : ''}`
  } else if (agentType.includes('compos')) {
    summary = `Report composition completed with ${completedSteps.length} section${completedSteps.length > 1 ? 's' : ''}`
  } else {
    summary = `Completed ${completedSteps.length} task${completedSteps.length > 1 ? 's' : ''} successfully`
  }

  // Get details from the most recent completed step
  const lastCompleted = completedSteps[completedSteps.length - 1]
  const details = lastCompleted?.details || extractActionSummary(lastCompleted?.action || '')

  return {
    summary,
    details
  }
}

/**
 * Convert thinking step status to AI tool status
 */
function mapStatus(status: ThinkingStep['status']): AIToolProps['status'] {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'active':
      return 'running'
    case 'complete':
      return 'completed'
    default:
      return 'pending'
  }
}

/**
 * Get a human-readable display name for agents
 */
function getAgentDisplayName(agentName: string): string {
  const agentDisplayNames: Record<string, string> = {
    'plan_generator': 'Research Planner',
    'section_researcher': 'Research Executor',
    'enhanced_search_executor': 'Search Specialist',
    'report_composer_with_citations': 'Report Composer',
    'section_planner': 'Section Planner',
    'interactive_planner_agent': 'Interactive Planner',
    'research_coordinator': 'Research Coordinator',
    'data_analyzer': 'Data Analyzer',
    'content_synthesizer': 'Content Synthesizer'
  }

  return agentDisplayNames[agentName] || formatAgentName(agentName)
}

/**
 * Format agent name by converting snake_case to Title Case
 */
function formatAgentName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Extract parameters from action description
 */
function extractParameters(action: string): AIToolParameter[] {
  const parameters: AIToolParameter[] = []

  // Look for common patterns in action descriptions
  
  // Extract quoted strings (queries, topics, etc.)
  const quotedMatches = action.match(/"([^"]+)"/g)
  if (quotedMatches) {
    quotedMatches.forEach((match, index) => {
      const value = match.slice(1, -1) // Remove quotes
      parameters.push({
        name: index === 0 ? 'query' : `param_${index}`,
        value: value,
        type: 'string'
      })
    })
  }

  // Extract section numbers or identifiers
  const sectionMatch = action.match(/section\s+(\d+|[A-Z]+)/i)
  if (sectionMatch) {
    parameters.push({
      name: 'section',
      value: sectionMatch[1],
      type: 'string'
    })
  }

  // Extract research topics
  const topicMatch = action.match(/(?:topic|research|analyzing):\s*([^,.]+)/i)
  if (topicMatch && !quotedMatches) {
    parameters.push({
      name: 'topic',
      value: topicMatch[1].trim(),
      type: 'string'
    })
  }

  // Extract file or document references
  const fileMatch = action.match(/(?:file|document|report):\s*([^\s,]+)/i)
  if (fileMatch) {
    parameters.push({
      name: 'document',
      value: fileMatch[1],
      type: 'string'
    })
  }

  return parameters
}

/**
 * Extract result information from completed actions
 */
function extractResult(action: string, details?: string): AIToolResult {
  // Generate appropriate summary based on action type
  let summary = ''
  
  if (action.includes('Generating') || action.includes('Generated')) {
    summary = 'Plan generated successfully'
  } else if (action.includes('Searching') || action.includes('Searched')) {
    summary = 'Search completed with results'
  } else if (action.includes('Analyzing') || action.includes('Analyzed')) {
    summary = 'Analysis completed'
  } else if (action.includes('Composing') || action.includes('Composed')) {
    summary = 'Report section composed'
  } else if (action.includes('Routing') || action.includes('Routed')) {
    summary = 'Request routed successfully'
  } else {
    summary = 'Task completed successfully'
  }

  return {
    summary,
    details: details || extractActionSummary(action)
  }
}

/**
 * Extract a concise summary from action description
 */
function extractActionSummary(action: string): string {
  // Remove common prefixes and clean up
  const cleaned = action
    .replace(/^(Generating|Searching|Analyzing|Composing|Routing)\s*/i, '')
    .replace(/\.\.\.$/, '')
    .trim()

  // Truncate if too long
  if (cleaned.length > 100) {
    return cleaned.substring(0, 97) + '...'
  }

  return cleaned || 'Processing completed'
}

/**
 * Group AI tools by agent type for better organization
 */
export function groupAIToolsByAgent(tools: AIToolProps[]): Record<string, AIToolProps[]> {
  return tools.reduce((groups, tool) => {
    const agentType = tool.name.split('_')[0] // Get first part of agent name
    if (!groups[agentType]) {
      groups[agentType] = []
    }
    groups[agentType].push(tool)
    return groups
  }, {} as Record<string, AIToolProps[]>)
}

/**
 * Get the current active tool from a list of tools
 */
export function getActiveTool(tools: AIToolProps[]): AIToolProps | undefined {
  return tools.find(tool => tool.status === 'running')
}

/**
 * Get completion statistics for a list of tools
 */
export function getToolStats(tools: AIToolProps[]) {
  const total = tools.length
  const completed = tools.filter(tool => tool.status === 'completed').length
  const running = tools.filter(tool => tool.status === 'running').length
  const pending = tools.filter(tool => tool.status === 'pending').length
  const errors = tools.filter(tool => tool.status === 'error').length

  return {
    total,
    completed,
    running,
    pending,
    errors,
    completionRate: total > 0 ? (completed / total) * 100 : 0
  }
}