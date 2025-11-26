/**
 * Conversation State Machine Types
 *
 * Defines the state structure for tracking multi-turn conversation coherence,
 * user goals, and conversation phases.
 */

/**
 * Represents the current phase of the conversation flow
 */
export type ConversationPhase =
  | 'greeting'          // Initial greeting or re-engagement
  | 'understanding'     // Gathering information about user's goal
  | 'planning'          // Proposing solution or approach
  | 'executing'         // Actively working on the task
  | 'reviewing'         // Reviewing completed work with user
  | 'completed'         // Goal accomplished, awaiting new goal
  | 'idle';             // No active conversation flow

/**
 * Types of user goals that can be tracked
 */
export type GoalType =
  | 'artifact_creation'  // Building interactive components
  | 'question_answer'    // Answering questions
  | 'task_execution'     // Performing specific tasks
  | 'exploration';       // Open-ended discussion/learning

/**
 * Status of information required to complete a goal
 */
export type InfoStatus = 'unknown' | 'asked' | 'provided';

/**
 * Status of a user goal
 */
export type GoalStatus = 'active' | 'completed' | 'abandoned';

/**
 * Information required to accomplish a user goal
 */
export interface RequiredInfo {
  /** Unique identifier for this piece of information */
  name: string;

  /** Human-readable description of what's needed */
  description: string;

  /** Current status of this information */
  status: InfoStatus;

  /** The actual value if provided */
  value?: string;
}

/**
 * Represents a user's goal in the conversation
 */
export interface UserGoal {
  /** Unique identifier for this goal */
  id: string;

  /** Natural language description of the goal */
  description: string;

  /** Classification of the goal type */
  type: GoalType;

  /** Current status of the goal */
  status: GoalStatus;

  /** Information needed to complete the goal */
  requiredInfo: RequiredInfo[];

  /** When this goal was identified */
  createdAt: string;

  /** When this goal was completed or abandoned */
  completedAt?: string;
}

/**
 * Complete state of the conversation
 */
export interface ConversationState {
  /** Session ID this state belongs to */
  sessionId: string;

  /** Current phase of the conversation */
  phase: ConversationPhase;

  /** Currently active goal, if any */
  currentGoal: UserGoal | null;

  /** History of completed goals in this session */
  completedGoals: UserGoal[];

  /** Number of turns in this conversation */
  turnCount: number;

  /** Timestamp of last state update */
  lastUpdated: string;

  /** Timestamp of last user message (for idle detection) */
  lastUserMessageAt?: string;

  /** Context from previous turns that might be relevant */
  contextSummary?: string;
}

/**
 * Result of a state transition
 */
export interface StateTransition {
  /** The new state after transition */
  newState: ConversationState;

  /** The phase that was transitioned from */
  previousPhase: ConversationPhase;

  /** Reason for the transition */
  reason: string;

  /** Whether the transition indicates a major milestone */
  isMilestone: boolean;
}

/**
 * Configuration for state machine behavior
 */
export interface StateMachineConfig {
  /** Minutes of inactivity before transitioning to idle */
  idleThresholdMinutes: number;

  /** Maximum number of understanding turns before forcing planning */
  maxUnderstandingTurns: number;

  /** Whether to auto-detect goal completion */
  autoDetectCompletion: boolean;
}

/**
 * Default configuration for the state machine
 */
export const DEFAULT_STATE_MACHINE_CONFIG: StateMachineConfig = {
  idleThresholdMinutes: 10,
  maxUnderstandingTurns: 3,
  autoDetectCompletion: true,
};
