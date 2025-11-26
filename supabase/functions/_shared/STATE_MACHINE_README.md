# Conversation State Machine

A comprehensive system for tracking multi-turn conversation coherence, user goals, and conversation phases in the AI chat application.

## Overview

The conversation state machine addresses the problem of the AI treating each turn as independent by maintaining context across multiple interactions. It tracks:

- **Conversation phases**: Where we are in the conversation flow (greeting → understanding → planning → executing → reviewing → completed)
- **User goals**: What the user is trying to accomplish
- **Required information**: What information is needed to complete the goal
- **Completed goals**: History of what's been accomplished in the session

## Architecture

### Core Components

1. **`conversation-state.ts`** - Type definitions and interfaces
2. **`state-machine.ts`** - State management logic and transitions
3. **`state-machine.test.ts`** - Comprehensive test suite (36 tests)
4. **`state-machine-integration.example.ts`** - Integration examples

### Conversation Phases

```
greeting → understanding → planning → executing → reviewing → completed → idle
    ↑          ↓              ↓           ↓          ↓         ↓
    └──────────┴──────────────┴───────────┴──────────┴─────────┘
                    (Can transition back on changes)
```

| Phase | Description | Typical Actions |
|-------|-------------|-----------------|
| `greeting` | Initial engagement | Welcome user, ask how to help |
| `understanding` | Gathering requirements | Ask clarifying questions, identify goal |
| `planning` | Proposing solution | Suggest approach, get approval |
| `executing` | Doing the work | Generate artifact, perform task |
| `reviewing` | Presenting results | Show completed work, get feedback |
| `completed` | Goal accomplished | Confirm success, offer more help |
| `idle` | No active conversation | Wait for re-engagement |

### Goal Types

- **`artifact_creation`** - Building interactive components (React, HTML, SVG)
- **`question_answer`** - Answering questions
- **`task_execution`** - Performing specific tasks (fix, update, change)
- **`exploration`** - Open-ended learning/discussion

## Usage

### Basic Example

```typescript
import {
  createInitialState,
  updateState,
  getStateSummary,
} from './state-machine.ts';

// Create initial state for new session
const state = createInitialState('session-123');

// Update state with user message
const userTransition = updateState(state, 'I want to build a todo app', 'user');
console.log(userTransition.newState.phase); // 'understanding'
console.log(userTransition.newState.currentGoal?.type); // 'artifact_creation'

// Update state with assistant response
const assistantTransition = updateState(
  userTransition.newState,
  'I can help you build a todo app. What features do you need?',
  'assistant'
);

// Get human-readable summary
const summary = getStateSummary(assistantTransition.newState);
console.log(summary);
```

### Integration into Chat Function

```typescript
async function handleChat(sessionId: string, userMessage: string) {
  // 1. Get current state from database
  const currentState = await getConversationState(supabase, sessionId);

  // 2. Update state with user message
  const { newState } = updateState(currentState, userMessage, 'user');

  // 3. Generate AI prompt with state context
  const stateSummary = getStateSummary(newState);
  const systemPrompt = `
    Current conversation phase: ${newState.phase}
    ${newState.currentGoal ? `Goal: ${newState.currentGoal.description}` : ''}

    ${stateSummary}
  `;

  // 4. Call AI with context
  const aiResponse = await generateResponse(systemPrompt, userMessage);

  // 5. Update state with AI response
  const { newState: finalState } = updateState(newState, aiResponse, 'assistant');

  // 6. Save updated state
  await saveConversationState(supabase, finalState);

  return aiResponse;
}
```

### Database Integration

Add conversation state column to `chat_sessions` table:

```sql
ALTER TABLE chat_sessions
ADD COLUMN conversation_state JSONB DEFAULT NULL;

-- Index for phase queries
CREATE INDEX idx_chat_sessions_state_phase
ON chat_sessions ((conversation_state->>'phase'));

-- Index for goal tracking
CREATE INDEX idx_chat_sessions_state_goals
ON chat_sessions USING GIN ((conversation_state->'currentGoal'));
```

Store and retrieve state:

```typescript
// Save state
await supabase
  .from('chat_sessions')
  .update({ conversation_state: JSON.parse(serializeState(state)) })
  .eq('id', sessionId);

// Retrieve state
const { data } = await supabase
  .from('chat_sessions')
  .select('conversation_state')
  .eq('id', sessionId)
  .single();

const state = data?.conversation_state
  ? deserializeState(JSON.stringify(data.conversation_state))
  : createInitialState(sessionId);
```

## API Reference

### Functions

#### `createInitialState(sessionId: string): ConversationState`

Creates initial state for a new session.

**Parameters:**
- `sessionId` - Unique identifier for the chat session

**Returns:** Initial `ConversationState` in greeting phase

---

#### `extractUserGoal(message: string): UserGoal | null`

Extracts user goal from message using pattern matching.

**Parameters:**
- `message` - User's message text

**Returns:** `UserGoal` object if goal detected, otherwise `null`

**Detected patterns:**
- "I want to build/create/make..." → `artifact_creation`
- "What/How/Why..." → `question_answer`
- "Fix/Update/Change..." → `task_execution`
- "Help me/Show me..." → `exploration`

---

#### `detectPhaseTransition(state: ConversationState, message: string, role: 'user' | 'assistant', config?: StateMachineConfig): ConversationPhase`

Determines next phase based on current state and message.

**Parameters:**
- `state` - Current conversation state
- `message` - New message text
- `role` - Who sent the message
- `config` - Optional configuration (idle timeout, max turns, etc.)

**Returns:** New conversation phase

---

#### `updateState(state: ConversationState, message: string, role: 'user' | 'assistant', config?: StateMachineConfig): StateTransition`

Updates conversation state with new message.

**Parameters:**
- `state` - Current conversation state
- `message` - New message text
- `role` - Who sent the message
- `config` - Optional configuration

**Returns:** `StateTransition` object containing:
- `newState` - Updated conversation state
- `previousPhase` - Phase before transition
- `reason` - Human-readable transition reason
- `isMilestone` - Whether this is a major milestone

---

#### `getStateSummary(state: ConversationState): string`

Generates human-readable summary of conversation state.

**Parameters:**
- `state` - Conversation state to summarize

**Returns:** Formatted string summary

---

#### `serializeState(state: ConversationState): string`

Serializes state to JSON for storage.

**Parameters:**
- `state` - Conversation state

**Returns:** JSON string

---

#### `deserializeState(json: string): ConversationState`

Deserializes state from JSON.

**Parameters:**
- `json` - Serialized state JSON

**Returns:** `ConversationState` object

## Configuration

### StateMachineConfig

Configure state machine behavior:

```typescript
const config: StateMachineConfig = {
  idleThresholdMinutes: 10,        // Minutes before transitioning to idle
  maxUnderstandingTurns: 3,        // Max turns in understanding before forcing planning
  autoDetectCompletion: true,      // Automatically detect goal completion
};

const transition = updateState(state, message, role, config);
```

### Default Configuration

```typescript
{
  idleThresholdMinutes: 10,
  maxUnderstandingTurns: 3,
  autoDetectCompletion: true,
}
```

## Testing

Run the comprehensive test suite:

```bash
cd supabase/functions
deno task test state-machine.test.ts
```

### Test Coverage

- ✅ Initial state creation
- ✅ Goal extraction (artifact, question, task, exploration)
- ✅ Phase transitions (all phase combinations)
- ✅ Multi-goal tracking
- ✅ Required info detection
- ✅ Idle timeout
- ✅ Milestone detection
- ✅ Full conversation flows
- ✅ Serialization/deserialization
- ✅ State summaries

**Total: 36 tests**

## Examples

### Example 1: Building an Artifact

```typescript
let state = createInitialState('session-1');

// User: "I want to build a todo app"
let transition = updateState(state, 'I want to build a todo app', 'user');
// Phase: greeting → understanding
// Goal: artifact_creation, "a todo app"

state = transition.newState;

// Assistant: "What features do you need?"
transition = updateState(state, 'What features do you need?', 'assistant');
// Phase: understanding (remains)

state = transition.newState;

// User: "Add, delete, and mark as complete with React components"
transition = updateState(
  state,
  'Add, delete, and mark as complete with React components',
  'user'
);
// Required info updated: component_type → provided, requirements → provided

state = transition.newState;

// Assistant: "I'll create a React todo app component"
transition = updateState(state, "I'll create a React todo app", 'assistant');
// Phase: understanding → planning

state = transition.newState;

// User: "Go ahead"
transition = updateState(state, 'Go ahead', 'user');
// Phase: planning → executing

state = transition.newState;

// Assistant: "<artifact>...</artifact>"
transition = updateState(state, '<artifact type="react">code</artifact>', 'assistant');
// Phase: executing → reviewing

state = transition.newState;

// User: "Perfect!"
transition = updateState(state, 'Perfect!', 'user');
// Phase: reviewing → completed
// Goal marked as completed
```

### Example 2: Handling Changes

```typescript
// In reviewing phase
let state = {
  phase: 'reviewing',
  currentGoal: { /* artifact goal */ },
  // ... other state
};

// User requests change
const transition = updateState(state, 'Can you change the color to blue?', 'user');
// Phase: reviewing → understanding
// New goal extracted or current goal remains active
```

### Example 3: Multiple Goals

```typescript
let state = createInitialState('session-1');

// First goal
let transition = updateState(state, 'Build a todo app', 'user');
state = { ...transition.newState, phase: 'completed' };
transition = updateState(state, 'Perfect!', 'user');
state = transition.newState;

// completedGoals.length === 1
// currentGoal === null

// Second goal
transition = updateState(state, 'Now build a calculator', 'user');
state = transition.newState;

// completedGoals.length === 2 (first goal still there)
// currentGoal === { description: 'a calculator', ... }
```

## Analytics Queries

### Sessions by Phase

```sql
SELECT
  conversation_state->>'phase' as phase,
  COUNT(*) as session_count
FROM chat_sessions
WHERE conversation_state IS NOT NULL
GROUP BY phase
ORDER BY session_count DESC;
```

### Completed Goals Analysis

```sql
SELECT
  id,
  title,
  jsonb_array_length(conversation_state->'completedGoals') as goals_completed,
  conversation_state->>'turnCount' as turns
FROM chat_sessions
WHERE conversation_state->'completedGoals' IS NOT NULL
  AND jsonb_array_length(conversation_state->'completedGoals') > 0
ORDER BY goals_completed DESC;
```

### Average Turns per Phase

```sql
SELECT
  conversation_state->>'phase' as phase,
  AVG((conversation_state->>'turnCount')::int) as avg_turns,
  COUNT(*) as sessions
FROM chat_sessions
WHERE conversation_state IS NOT NULL
GROUP BY phase
ORDER BY avg_turns DESC;
```

### Goal Type Distribution

```sql
SELECT
  goal->>'type' as goal_type,
  COUNT(*) as count
FROM chat_sessions,
     jsonb_array_elements(conversation_state->'completedGoals') as goal
WHERE conversation_state IS NOT NULL
GROUP BY goal_type
ORDER BY count DESC;
```

## Future Enhancements

### Planned Features

1. **Context Compression** - Automatically compress conversation history when context window fills
2. **Goal Prioritization** - Handle multiple concurrent goals with priority levels
3. **Learning from History** - Adapt phase transitions based on successful patterns
4. **Intent Classification** - ML-based goal type detection
5. **Conversation Branching** - Support for exploring alternatives within a goal
6. **State Persistence** - Redis caching for faster state retrieval
7. **Analytics Dashboard** - Real-time visualization of conversation flows

### Integration Points

- **Chat Function** - Add state context to AI prompts
- **Title Generation** - Use goal description for better titles
- **Analytics** - Track goal completion rates and phase durations
- **User Experience** - Show progress indicators based on phase
- **Recommendations** - Suggest next actions based on current phase

## Troubleshooting

### Issue: State not persisting

**Solution:** Ensure conversation_state column exists and updates are saved:

```typescript
// Verify column exists
const { data } = await supabase
  .from('chat_sessions')
  .select('conversation_state')
  .limit(1);

// Save state after each turn
await saveConversationState(supabase, state);
```

### Issue: Phase stuck in understanding

**Cause:** Max understanding turns exceeded or missing required info

**Solution:** Configure `maxUnderstandingTurns` or ensure info is marked as provided:

```typescript
const config = {
  maxUnderstandingTurns: 5, // Increase threshold
  // ...
};

const transition = updateState(state, message, role, config);
```

### Issue: Goals not being detected

**Cause:** Message doesn't match any goal patterns

**Solution:** Add custom patterns or adjust existing ones in `state-machine.ts`:

```typescript
const GOAL_PATTERNS: GoalPattern[] = [
  // Add custom pattern
  {
    pattern: /custom pattern/i,
    type: 'artifact_creation',
    requiredInfo: ['custom_info'],
  },
  // ... existing patterns
];
```

## Contributing

When adding new features:

1. Update type definitions in `conversation-state.ts`
2. Implement logic in `state-machine.ts`
3. Add tests in `state-machine.test.ts`
4. Update this documentation
5. Add integration examples if needed

## References

- [Finite State Machines](https://en.wikipedia.org/wiki/Finite-state_machine)
- [Conversation Design](https://developers.google.com/assistant/conversation-design)
- [Goal-Oriented Dialogue](https://arxiv.org/abs/1604.04562)
