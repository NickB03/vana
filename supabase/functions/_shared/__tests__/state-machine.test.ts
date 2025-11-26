/**
 * Tests for Conversation State Machine
 */

import { assertEquals, assertExists } from '@std/assert';
import {
  createInitialState,
  extractUserGoal,
  detectPhaseTransition,
  updateState,
  serializeState,
  deserializeState,
  getStateSummary,
} from '../state-machine.ts';
import {
  ConversationState,
  ConversationPhase,
  DEFAULT_STATE_MACHINE_CONFIG,
} from '../conversation-state.ts';

Deno.test('State Machine - createInitialState creates valid initial state', () => {
  const sessionId = 'test-session-123';
  const state = createInitialState(sessionId);

  assertEquals(state.sessionId, sessionId);
  assertEquals(state.phase, 'greeting');
  assertEquals(state.currentGoal, null);
  assertEquals(state.completedGoals, []);
  assertEquals(state.turnCount, 0);
  assertExists(state.lastUpdated);
});

Deno.test('State Machine - extractUserGoal detects artifact creation goals', () => {
  const testCases = [
    'I want to build a todo app',
    'Create a calculator for me',
    'Can you make a weather widget',
    'Generate a contact form',
    'Design a landing page',
  ];

  for (const message of testCases) {
    const goal = extractUserGoal(message);
    assertExists(goal, `Failed to extract goal from: "${message}"`);
    assertEquals(goal!.type, 'artifact_creation');
    assertEquals(goal!.status, 'active');
    assertExists(goal!.id);
    assertExists(goal!.createdAt);
  }
});

Deno.test('State Machine - extractUserGoal detects question answering goals', () => {
  const testCases = [
    'What is React?',
    'How do I use TypeScript?',
    'Why should I use Supabase?',
    'Can you explain state management?',
    'Tell me about Edge Functions',
  ];

  for (const message of testCases) {
    const goal = extractUserGoal(message);
    assertExists(goal, `Failed to extract goal from: "${message}"`);
    assertEquals(goal!.type, 'question_answer');
  }
});

Deno.test('State Machine - extractUserGoal detects task execution goals', () => {
  const testCases = [
    'Fix the login button',
    'Update the header component',
    'Change the color scheme',
    'I need to modify the API',
    'Can you improve the performance?',
  ];

  for (const message of testCases) {
    const goal = extractUserGoal(message);
    assertExists(goal, `Failed to extract goal from: "${message}"`);
    assertEquals(goal!.type, 'task_execution');
  }
});

Deno.test('State Machine - extractUserGoal detects exploration goals', () => {
  const testCases = [
    'Help me understand databases',
    'Show me how to use Tailwind',
    "I'm trying to learn React",
    'I want to learn about AI',
  ];

  for (const message of testCases) {
    const goal = extractUserGoal(message);
    assertExists(goal, `Failed to extract goal from: "${message}"`);
    assertEquals(goal!.type, 'exploration');
  }
});

Deno.test('State Machine - extractUserGoal returns null for non-goal messages', () => {
  const testCases = [
    'Hello',
    'Thanks',
    'Yes',
    'Ok',
    'Looks good',
  ];

  for (const message of testCases) {
    const goal = extractUserGoal(message);
    assertEquals(goal, null, `Should not extract goal from: "${message}"`);
  }
});

Deno.test('State Machine - detectPhaseTransition: greeting to understanding', () => {
  const state = createInitialState('session-1');
  const message = 'I want to build a todo app';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'understanding');
});

Deno.test('State Machine - detectPhaseTransition: understanding to planning', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
    currentGoal: {
      id: 'goal-1',
      description: 'Build a todo app',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [
        { name: 'component_type', description: 'Type of component', status: 'provided', value: 'React' },
        { name: 'requirements', description: 'Requirements', status: 'provided', value: 'CRUD operations' },
      ],
      createdAt: new Date().toISOString(),
    },
  };

  const message = 'That sounds good';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'planning');
});

Deno.test('State Machine - detectPhaseTransition: planning to executing', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'planning',
  };

  const message = 'Go ahead and start building it';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'executing');
});

Deno.test('State Machine - detectPhaseTransition: executing to reviewing on artifact', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'executing',
  };

  const message = 'Here is your todo app: <artifact type="react">...</artifact>';
  const newPhase = detectPhaseTransition(state, message, 'assistant');

  assertEquals(newPhase, 'reviewing');
});

Deno.test('State Machine - detectPhaseTransition: reviewing to completed', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'reviewing',
  };

  const message = 'Perfect! This is exactly what I needed';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'completed');
});

Deno.test('State Machine - detectPhaseTransition: reviewing to understanding on change request', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'reviewing',
  };

  const message = 'Can you change the color to blue?';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'understanding');
});

Deno.test('State Machine - detectPhaseTransition: any phase to idle', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
  };

  const message = 'Never mind, forget it';
  const newPhase = detectPhaseTransition(state, message, 'user');

  assertEquals(newPhase, 'idle');
});

Deno.test('State Machine - updateState creates new goal from user message', () => {
  const state = createInitialState('session-1');
  const message = 'I want to build a calculator';

  const transition = updateState(state, message, 'user');

  assertEquals(transition.newState.phase, 'understanding');
  assertExists(transition.newState.currentGoal);
  assertEquals(transition.newState.currentGoal!.type, 'artifact_creation');
  assertEquals(transition.newState.turnCount, 1);
  assertEquals(transition.previousPhase, 'greeting');
  assertEquals(transition.isMilestone, true);
});

Deno.test('State Machine - updateState increments turn count', () => {
  const state = createInitialState('session-1');

  let currentState = state;
  for (let i = 0; i < 5; i++) {
    const transition = updateState(currentState, 'Hello', 'user');
    currentState = transition.newState;
  }

  assertEquals(currentState.turnCount, 5);
});

Deno.test('State Machine - updateState completes goal on transition to completed', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'reviewing',
    currentGoal: {
      id: 'goal-1',
      description: 'Build a todo app',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [],
      createdAt: new Date().toISOString(),
    },
  };

  const transition = updateState(state, 'Perfect! Thanks!', 'user');

  assertEquals(transition.newState.phase, 'completed');
  assertEquals(transition.newState.currentGoal, null);
  assertEquals(transition.newState.completedGoals.length, 1);
  assertEquals(transition.newState.completedGoals[0].status, 'completed');
  assertExists(transition.newState.completedGoals[0].completedAt);
});

Deno.test('State Machine - updateState abandons goal on transition to idle', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
    currentGoal: {
      id: 'goal-1',
      description: 'Build a todo app',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [],
      createdAt: new Date().toISOString(),
    },
  };

  const transition = updateState(state, 'Never mind', 'user');

  assertEquals(transition.newState.phase, 'idle');
  assertEquals(transition.newState.currentGoal, null);
  assertEquals(transition.newState.completedGoals.length, 1);
  assertEquals(transition.newState.completedGoals[0].status, 'abandoned');
});

Deno.test('State Machine - updateState handles multiple goals', () => {
  let state = createInitialState('session-1');

  // First goal
  let transition = updateState(state, 'Build a todo app', 'user');
  state = transition.newState;

  // Move to completed
  state = { ...state, phase: 'reviewing' };
  transition = updateState(state, 'Perfect!', 'user');
  state = transition.newState;

  assertEquals(state.completedGoals.length, 1);

  // Second goal
  transition = updateState(state, 'Now build a calculator', 'user');
  state = transition.newState;

  assertExists(state.currentGoal);
  assertEquals(state.currentGoal!.description, 'a calculator');
  assertEquals(state.completedGoals.length, 2); // First goal still in completed
});

Deno.test('State Machine - updateState updates required info status', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
    currentGoal: {
      id: 'goal-1',
      description: 'Build something',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [
        { name: 'component_type', description: 'Type', status: 'unknown' },
        { name: 'requirements', description: 'Requirements', status: 'unknown' },
      ],
      createdAt: new Date().toISOString(),
    },
  };

  const message = 'I need a React component with form validation and error handling';
  const transition = updateState(state, message, 'user');

  const updatedGoal = transition.newState.currentGoal!;
  const componentTypeInfo = updatedGoal.requiredInfo.find(i => i.name === 'component_type');
  const requirementsInfo = updatedGoal.requiredInfo.find(i => i.name === 'requirements');

  assertEquals(componentTypeInfo!.status, 'provided');
  assertEquals(requirementsInfo!.status, 'provided');
});

Deno.test('State Machine - serializeState and deserializeState round trip', () => {
  const state: ConversationState = {
    sessionId: 'test-123',
    phase: 'understanding',
    currentGoal: {
      id: 'goal-1',
      description: 'Build a todo app',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [
        { name: 'component_type', description: 'Type', status: 'provided', value: 'React' },
      ],
      createdAt: new Date().toISOString(),
    },
    completedGoals: [],
    turnCount: 5,
    lastUpdated: new Date().toISOString(),
    lastUserMessageAt: new Date().toISOString(),
  };

  const serialized = serializeState(state);
  const deserialized = deserializeState(serialized);

  assertEquals(deserialized.sessionId, state.sessionId);
  assertEquals(deserialized.phase, state.phase);
  assertEquals(deserialized.currentGoal?.id, state.currentGoal?.id);
  assertEquals(deserialized.turnCount, state.turnCount);
});

Deno.test('State Machine - getStateSummary generates readable summary', () => {
  const state: ConversationState = {
    sessionId: 'test-123',
    phase: 'understanding',
    currentGoal: {
      id: 'goal-1',
      description: 'Build a todo app',
      type: 'artifact_creation',
      status: 'active',
      requiredInfo: [
        { name: 'component_type', description: 'Type of component', status: 'provided', value: 'React' },
        { name: 'requirements', description: 'Requirements', status: 'unknown' },
      ],
      createdAt: new Date().toISOString(),
    },
    completedGoals: [
      {
        id: 'goal-0',
        description: 'Previous goal',
        type: 'question_answer',
        status: 'completed',
        requiredInfo: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
    turnCount: 5,
    lastUpdated: new Date().toISOString(),
  };

  const summary = getStateSummary(state);

  assertEquals(summary.includes('Conversation Phase: understanding'), true);
  assertEquals(summary.includes('Turn Count: 5'), true);
  assertEquals(summary.includes('Current Goal:'), true);
  assertEquals(summary.includes('Type: artifact_creation'), true);
  assertEquals(summary.includes('Completed Goals: 1'), true);
  assertEquals(summary.includes('✓ component_type'), true);
  assertEquals(summary.includes('? requirements'), true);
});

Deno.test('State Machine - isMilestone detection', () => {
  const state = createInitialState('session-1');

  // Milestone: greeting -> understanding
  let transition = updateState(state, 'Build a todo app', 'user');
  assertEquals(transition.isMilestone, true);

  // Milestone: understanding -> executing
  const understandingState = { ...transition.newState, phase: 'planning' as ConversationPhase };
  transition = updateState(understandingState, 'Start building', 'user');
  assertEquals(transition.isMilestone, true);

  // Not a milestone: executing -> executing
  const executingState = { ...transition.newState, phase: 'executing' as ConversationPhase };
  transition = updateState(executingState, 'Working on it', 'assistant');
  assertEquals(transition.isMilestone, false);
});

Deno.test('State Machine - idle timeout detection', () => {
  const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();

  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
    lastUserMessageAt: tenMinutesAgo,
  };

  const newPhase = detectPhaseTransition(state, 'Hello', 'user', DEFAULT_STATE_MACHINE_CONFIG);

  assertEquals(newPhase, 'idle');
});

Deno.test('State Machine - does not timeout before threshold', () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'understanding',
    lastUserMessageAt: fiveMinutesAgo,
  };

  const newPhase = detectPhaseTransition(state, 'Hello', 'user', DEFAULT_STATE_MACHINE_CONFIG);

  assertEquals(newPhase, 'understanding');
});

Deno.test('State Machine - transitions from completed to understanding on new goal', () => {
  const state: ConversationState = {
    ...createInitialState('session-1'),
    phase: 'completed',
    completedGoals: [
      {
        id: 'goal-1',
        description: 'Previous goal',
        type: 'artifact_creation',
        status: 'completed',
        requiredInfo: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
  };

  const transition = updateState(state, 'Build a calculator', 'user');

  assertEquals(transition.newState.phase, 'understanding');
  assertExists(transition.newState.currentGoal);
  assertEquals(transition.newState.completedGoals.length, 1);
});

Deno.test('State Machine - full conversation flow', () => {
  let state = createInitialState('session-1');

  // User greets and states goal
  let transition = updateState(state, 'I want to build a todo app', 'user');
  state = transition.newState;
  assertEquals(state.phase, 'understanding');
  assertExists(state.currentGoal);

  // Assistant asks for details
  transition = updateState(state, 'What features do you need?', 'assistant');
  state = transition.newState;
  assertEquals(state.phase, 'understanding');

  // User provides details
  transition = updateState(
    state,
    'I need add, delete, and mark as complete functionality with React components',
    'user'
  );
  state = transition.newState;

  // Assistant proposes plan
  transition = updateState(state, "I'll create a React todo app component", 'assistant');
  state = transition.newState;

  // User approves
  transition = updateState(state, 'Sounds good, go ahead', 'user');
  state = transition.newState;
  assertEquals(state.phase, 'executing');

  // Assistant creates artifact
  transition = updateState(state, '<artifact type="react">component code</artifact>', 'assistant');
  state = transition.newState;
  assertEquals(state.phase, 'reviewing');

  // User is satisfied
  transition = updateState(state, 'Perfect! This is exactly what I needed', 'user');
  state = transition.newState;
  assertEquals(state.phase, 'completed');
  assertEquals(state.currentGoal, null);
  assertEquals(state.completedGoals.length, 1);
  assertEquals(state.completedGoals[0].status, 'completed');
});
