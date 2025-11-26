/**
 * Conversation State Machine
 *
 * Implements a state machine for tracking conversation phases, user goals,
 * and multi-turn coherence. This enables the AI to maintain context across
 * multiple turns and provide more coherent responses.
 */

import {
  ConversationPhase,
  ConversationState,
  GoalType,
  RequiredInfo,
  StateTransition,
  UserGoal,
  DEFAULT_STATE_MACHINE_CONFIG,
  StateMachineConfig,
} from './conversation-state.ts';

/**
 * Pattern matching for goal detection
 */
interface GoalPattern {
  pattern: RegExp;
  type: GoalType;
  requiredInfo?: string[];
}

/**
 * Patterns for detecting user goals from messages
 */
const GOAL_PATTERNS: GoalPattern[] = [
  // Artifact creation patterns
  {
    pattern: /(?:build|create|make|generate|design)\s+(?:a|an|me)?\s*(.*?)(?:\.|$)/i,
    type: 'artifact_creation',
    requiredInfo: ['component_type', 'requirements'],
  },
  {
    pattern: /(?:i want|i need|could you)\s+(?:to\s+)?(?:build|create|make|generate|design)\s+(.*?)(?:\.|$)/i,
    type: 'artifact_creation',
    requiredInfo: ['component_type', 'requirements'],
  },
  // Question answering patterns
  {
    pattern: /(?:what|how|why|when|where|who|which|can you explain|tell me about)\s+(.*?)(?:\?|$)/i,
    type: 'question_answer',
  },
  // Task execution patterns
  {
    pattern: /(?:fix|update|change|modify|improve|refactor|optimize)\s+(.*?)(?:\.|$)/i,
    type: 'task_execution',
    requiredInfo: ['target', 'desired_change'],
  },
  {
    pattern: /(?:i want to|i need to|can you|could you)\s+(?:fix|update|change|modify|improve)\s+(.*?)(?:\.|$)/i,
    type: 'task_execution',
    requiredInfo: ['target', 'desired_change'],
  },
  // Help/exploration patterns
  {
    pattern: /(?:help me|show me|teach me|i'm trying to|i want to learn)\s+(.*?)(?:\.|$)/i,
    type: 'exploration',
  },
];

/**
 * Phase transition trigger patterns
 */
const TRANSITION_PATTERNS = {
  toPlanning: [
    /(?:sounds good|that works|yes|ok|okay|sure|go ahead|proceed)/i,
    /(?:let's do|let me think|here's what)/i,
  ],
  toExecuting: [
    /(?:start|begin|go ahead|do it|make it|create it)/i,
    /(?:i'll start|i'm working on|generating|creating)/i,
  ],
  toReviewing: [
    /(?:done|finished|completed|here it is|check this out)/i,
    /(?:i've created|i've built|i've made|i've generated)/i,
  ],
  toCompleted: [
    /(?:perfect|great|thanks|thank you|that's it|looks good|works well)/i,
    /(?:this is exactly what i needed|this works|mission accomplished)/i,
  ],
  toIdle: [
    /(?:never mind|forget it|cancel|stop|bye|goodbye)/i,
  ],
};

/**
 * Creates initial conversation state for a new session
 */
export function createInitialState(sessionId: string): ConversationState {
  return {
    sessionId,
    phase: 'greeting',
    currentGoal: null,
    completedGoals: [],
    turnCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generates a unique ID for goals
 */
function generateGoalId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts user goal from a message
 */
export function extractUserGoal(message: string): UserGoal | null {
  const normalizedMessage = message.trim();

  for (const { pattern, type, requiredInfo = [] } of GOAL_PATTERNS) {
    const match = normalizedMessage.match(pattern);
    if (match) {
      const description = match[1]?.trim() || normalizedMessage;

      return {
        id: generateGoalId(),
        description,
        type,
        status: 'active',
        requiredInfo: requiredInfo.map(name => ({
          name,
          description: `Information about ${name}`,
          status: 'unknown' as const,
        })),
        createdAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Checks if message matches any pattern in a list
 */
function matchesAnyPattern(message: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(message));
}

/**
 * Detects whether required information has been provided in a message
 */
function detectProvidedInfo(
  message: string,
  requiredInfo: RequiredInfo[],
): RequiredInfo[] {
  return requiredInfo.map(info => {
    // If already provided, keep it
    if (info.status === 'provided') {
      return info;
    }

    // Simple heuristic: if the message contains relevant keywords
    // and is longer than a few words, consider it provided
    const keywords = info.name.split('_');
    const hasKeywords = keywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeywords && message.split(/\s+/).length > 5) {
      return {
        ...info,
        status: 'provided',
        value: message,
      };
    }

    return info;
  });
}

/**
 * Determines if a goal has all required information
 */
function hasAllRequiredInfo(goal: UserGoal): boolean {
  if (goal.requiredInfo.length === 0) return true;
  return goal.requiredInfo.every(info => info.status === 'provided');
}

/**
 * Detects phase transition based on current state and message
 */
export function detectPhaseTransition(
  state: ConversationState,
  message: string,
  role: 'user' | 'assistant',
  config: StateMachineConfig = DEFAULT_STATE_MACHINE_CONFIG,
): ConversationPhase {
  const { phase, currentGoal, turnCount, lastUserMessageAt } = state;

  // Check for idle timeout
  if (lastUserMessageAt && role === 'user') {
    const minutesSinceLastMessage =
      (Date.now() - new Date(lastUserMessageAt).getTime()) / 1000 / 60;
    if (minutesSinceLastMessage > config.idleThresholdMinutes) {
      return 'idle';
    }
  }

  // Check for explicit idle transitions
  if (matchesAnyPattern(message, TRANSITION_PATTERNS.toIdle)) {
    return 'idle';
  }

  // Phase-specific transition logic
  switch (phase) {
    case 'greeting':
    case 'idle':
      // Transition to understanding if user states a goal
      if (role === 'user') {
        const goal = extractUserGoal(message);
        if (goal) {
          return 'understanding';
        }
      }
      return phase;

    case 'understanding':
      // Transition to planning if:
      // 1. User approves/agrees
      // 2. We have all required info
      // 3. Max understanding turns exceeded
      if (matchesAnyPattern(message, TRANSITION_PATTERNS.toPlanning)) {
        return 'planning';
      }

      if (currentGoal && hasAllRequiredInfo(currentGoal)) {
        return 'planning';
      }

      // Force transition if stuck in understanding too long
      if (role === 'assistant' && turnCount > config.maxUnderstandingTurns * 2) {
        return 'planning';
      }

      return 'understanding';

    case 'planning':
      // Transition to executing if:
      // 1. User gives approval
      // 2. Assistant starts work
      if (matchesAnyPattern(message, TRANSITION_PATTERNS.toExecuting)) {
        return 'executing';
      }

      // User approval moves to executing
      if (role === 'user' && matchesAnyPattern(message, TRANSITION_PATTERNS.toPlanning)) {
        return 'executing';
      }

      return 'planning';

    case 'executing':
      // Transition to reviewing when work is complete
      if (matchesAnyPattern(message, TRANSITION_PATTERNS.toReviewing)) {
        return 'reviewing';
      }

      // Artifact creation triggers reviewing
      if (role === 'assistant' && message.includes('<artifact')) {
        return 'reviewing';
      }

      return 'executing';

    case 'reviewing': {
      // Transition to completed when user is satisfied
      if (role === 'user' && matchesAnyPattern(message, TRANSITION_PATTERNS.toCompleted)) {
        return 'completed';
      }

      // If user asks for changes, go back to understanding
      const hasChangeRequest = /(?:change|modify|update|fix|improve)/i.test(message);
      if (role === 'user' && hasChangeRequest) {
        return 'understanding';
      }

      return 'reviewing';
    }

    case 'completed':
      // Stay completed or start new goal
      if (role === 'user') {
        const newGoal = extractUserGoal(message);
        if (newGoal) {
          return 'understanding';
        }
      }
      return 'completed';

    default:
      return phase;
  }
}

/**
 * Updates conversation state based on a new message
 */
export function updateState(
  state: ConversationState,
  message: string,
  role: 'user' | 'assistant',
  config: StateMachineConfig = DEFAULT_STATE_MACHINE_CONFIG,
): StateTransition {
  const previousPhase = state.phase;
  const now = new Date().toISOString();

  // Detect new goal if user message
  let currentGoal = state.currentGoal;
  const completedGoals = [...state.completedGoals];

  if (role === 'user') {
    const detectedGoal = extractUserGoal(message);

    if (detectedGoal) {
      // Complete current goal if exists
      if (currentGoal && currentGoal.status === 'active') {
        currentGoal = {
          ...currentGoal,
          status: 'completed',
          completedAt: now,
        };
        completedGoals.push(currentGoal);
      }

      // Set new goal
      currentGoal = detectedGoal;
    } else if (currentGoal) {
      // Update required info based on user message
      currentGoal = {
        ...currentGoal,
        requiredInfo: detectProvidedInfo(message, currentGoal.requiredInfo),
      };
    }
  }

  // Detect phase transition
  const newPhase = detectPhaseTransition(state, message, role, config);

  // Mark goal as completed if transitioning to completed phase
  if (newPhase === 'completed' && currentGoal && currentGoal.status === 'active') {
    currentGoal = {
      ...currentGoal,
      status: 'completed',
      completedAt: now,
    };
    completedGoals.push(currentGoal);
    currentGoal = null;
  }

  // Mark goal as abandoned if transitioning to idle
  if (newPhase === 'idle' && currentGoal && currentGoal.status === 'active') {
    currentGoal = {
      ...currentGoal,
      status: 'abandoned',
      completedAt: now,
    };
    completedGoals.push(currentGoal);
    currentGoal = null;
  }

  const newState: ConversationState = {
    ...state,
    phase: newPhase,
    currentGoal,
    completedGoals,
    turnCount: state.turnCount + 1,
    lastUpdated: now,
    lastUserMessageAt: role === 'user' ? now : state.lastUserMessageAt,
  };

  return {
    newState,
    previousPhase,
    reason: generateTransitionReason(previousPhase, newPhase, message, role),
    isMilestone: isMilestoneTransition(previousPhase, newPhase),
  };
}

/**
 * Generates a human-readable reason for a phase transition
 */
function generateTransitionReason(
  from: ConversationPhase,
  to: ConversationPhase,
  message: string,
  role: 'user' | 'assistant',
): string {
  if (from === to) {
    return `Remaining in ${from} phase`;
  }

  const transitions: Record<string, string> = {
    'greeting->understanding': 'User stated a goal',
    'understanding->planning': 'Gathered sufficient information',
    'planning->executing': 'Plan approved, starting work',
    'executing->reviewing': 'Work completed',
    'reviewing->completed': 'User satisfied with result',
    'reviewing->understanding': 'User requested changes',
    'completed->understanding': 'User started new goal',
    'idle->understanding': 'User re-engaged with new goal',
  };

  const key = `${from}->${to}`;
  return transitions[key] || `Transitioned from ${from} to ${to}`;
}

/**
 * Determines if a phase transition represents a major milestone
 */
function isMilestoneTransition(from: ConversationPhase, to: ConversationPhase): boolean {
  const milestones = [
    'understanding',  // Goal identified
    'executing',      // Work started
    'completed',      // Goal achieved
  ];

  return milestones.includes(to) && from !== to;
}

/**
 * Serializes state to JSON for storage
 */
export function serializeState(state: ConversationState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes state from JSON
 */
export function deserializeState(json: string): ConversationState {
  return JSON.parse(json) as ConversationState;
}

/**
 * Gets a summary of the current state for inclusion in AI prompts
 */
export function getStateSummary(state: ConversationState): string {
  const { phase, currentGoal, completedGoals, turnCount } = state;

  let summary = `Conversation Phase: ${phase}\n`;
  summary += `Turn Count: ${turnCount}\n`;

  if (currentGoal) {
    summary += `\nCurrent Goal:\n`;
    summary += `  Type: ${currentGoal.type}\n`;
    summary += `  Description: ${currentGoal.description}\n`;

    if (currentGoal.requiredInfo.length > 0) {
      summary += `  Required Information:\n`;
      currentGoal.requiredInfo.forEach(info => {
        const status = info.status === 'provided' ? '✓' : '?';
        summary += `    ${status} ${info.name}: ${info.description}\n`;
      });
    }
  }

  if (completedGoals.length > 0) {
    summary += `\nCompleted Goals: ${completedGoals.length}\n`;
  }

  return summary;
}
