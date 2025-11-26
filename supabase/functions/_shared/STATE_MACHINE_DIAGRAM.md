# Conversation State Machine - Visual Flow Diagram

## State Transition Graph

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
           ┌─────────────────┐                                     │
           │    GREETING     │                                     │
           │  (Initial state) │                                    │
           └────────┬─────────┘                                    │
                    │                                              │
                    │ User states goal                             │
                    ▼                                              │
           ┌─────────────────┐                                     │
      ┌────│  UNDERSTANDING  │◄────────────────┐                  │
      │    │ (Gather info)   │                 │                  │
      │    └────────┬─────────┘                 │                  │
      │             │                           │                  │
      │             │ Have all info             │                  │
      │             │ OR                        │                  │
      │             │ Max turns reached         │                  │
      │             ▼                           │                  │
      │    ┌─────────────────┐                 │                  │
      │    │    PLANNING     │                 │                  │
      │    │ (Propose plan)  │                 │                  │
      │    └────────┬─────────┘                 │                  │
      │             │                           │                  │
      │             │ User approves             │                  │
      │             │ OR                        │                  │
      │             │ AI starts work            │                  │
      │             ▼                           │                  │
      │    ┌─────────────────┐                 │                  │
      │    │   EXECUTING     │                 │                  │
      │    │  (Do the work)  │                 │                  │
      │    └────────┬─────────┘                 │                  │
      │             │                           │                  │
      │             │ Work completed            │                  │
      │             │ (artifact created)        │                  │
      │             ▼                           │                  │
      │    ┌─────────────────┐                 │                  │
      └───►│    REVIEWING    │─────────────────┘                  │
           │ (Show results)  │ User requests                      │
           └────────┬─────────┘ changes                           │
                    │                                              │
                    │ User satisfied                               │
                    ▼                                              │
           ┌─────────────────┐                                     │
           │   COMPLETED     │                                     │
           │  (Goal done)    │                                     │
           └────────┬─────────┘                                    │
                    │                                              │
                    │ New goal                                     │
                    └──────────────────────────────────────────────┘
                                     │
                                     │ "Never mind"
                                     │ OR
                                     │ Idle timeout
                                     ▼
                            ┌─────────────────┐
                            │      IDLE       │
                            │  (Inactive)     │
                            └─────────────────┘
                                     │
                                     │ User re-engages
                                     └─────────────────────────────┐
                                                                   │
                                                                   ▼
                                                          (Back to GREETING
                                                           or UNDERSTANDING)
```

## Goal Type Detection Flow

```
User Message
     │
     ├─────► "I want to build/create/make..." ──► ARTIFACT_CREATION
     │                                              ├─ component_type
     │                                              └─ requirements
     │
     ├─────► "What/How/Why/When/Where..." ────────► QUESTION_ANSWER
     │                                              (no required info)
     │
     ├─────► "Fix/Update/Change/Modify..." ───────► TASK_EXECUTION
     │                                              ├─ target
     │                                              └─ desired_change
     │
     └─────► "Help me/Show me/I'm trying..." ─────► EXPLORATION
                                                    (no required info)
```

## Required Information Flow

```
Goal Created with Required Info
         │
         │ [component_type: unknown]
         │ [requirements: unknown]
         │
         ▼
User Message: "I need a React component with validation"
         │
         │ Pattern matching detects:
         ├─ "React component" ──► component_type: provided
         └─ "validation" ──────► requirements: provided
         │
         ▼
All Required Info Provided?
         │
         ├─ Yes ──► Transition to PLANNING
         └─ No ───► Stay in UNDERSTANDING
                    Ask clarifying questions
```

## Turn Count and Milestone Flow

```
Initial State
    │
    │ Turn 1: User message
    ├─► updateState() ──► Turn count: 1 ──► Phase: understanding ──► Milestone: ✓
    │
    │ Turn 2: AI response
    ├─► updateState() ──► Turn count: 2 ──► Phase: understanding ──► Milestone: ✗
    │
    │ Turn 3: User provides info
    ├─► updateState() ──► Turn count: 3 ──► Phase: understanding ──► Milestone: ✗
    │
    │ Turn 4: AI proposes plan
    ├─► updateState() ──► Turn count: 4 ──► Phase: planning ──────► Milestone: ✗
    │
    │ Turn 5: User approves
    ├─► updateState() ──► Turn count: 5 ──► Phase: executing ─────► Milestone: ✓
    │
    │ Turn 6: AI creates artifact
    ├─► updateState() ──► Turn count: 6 ──► Phase: reviewing ─────► Milestone: ✗
    │
    │ Turn 7: User satisfied
    └─► updateState() ──► Turn count: 7 ──► Phase: completed ─────► Milestone: ✓
```

## Goal Lifecycle States

```
┌────────────────────────────────────────────────────────────────┐
│                        Goal Lifecycle                          │
└────────────────────────────────────────────────────────────────┘

User states goal ──► Goal created
                         │
                         │ status: active
                         │ requiredInfo: [...unknown...]
                         │
                         ▼
                    Information gathered
                         │
                         │ requiredInfo: [...provided...]
                         │
                         ▼
                    Work executed
                         │
                         ▼
                    ┌────────────────┐
                    │  Goal outcome  │
                    └────────┬───────┘
                             │
                ┌────────────┼────────────┐
                │                         │
                ▼                         ▼
         ┌──────────────┐        ┌───────────────┐
         │  COMPLETED   │        │   ABANDONED   │
         │  status: ✓   │        │   status: ✗   │
         │              │        │               │
         │ completedAt  │        │  completedAt  │
         │   set        │        │    set        │
         └──────────────┘        └───────────────┘
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                    Added to completedGoals[]
                    currentGoal = null
```

## Multi-Goal Flow

```
Session Start
     │
     │ Goal 1: "Build todo app"
     ├─► UNDERSTANDING → PLANNING → EXECUTING → REVIEWING → COMPLETED
     │   currentGoal: Goal1
     │   completedGoals: []
     │
     │ Goal 1 completed
     ├─► currentGoal: null
     │   completedGoals: [Goal1]
     │
     │ Goal 2: "Build calculator"
     ├─► UNDERSTANDING → PLANNING → EXECUTING → REVIEWING → COMPLETED
     │   currentGoal: Goal2
     │   completedGoals: [Goal1]
     │
     │ Goal 2 completed
     └─► currentGoal: null
         completedGoals: [Goal1, Goal2]
```

## Decision Tree: Phase Transitions

```
Current Phase: UNDERSTANDING
         │
         ├─ User says "sounds good" ────────────────────► PLANNING
         │
         ├─ All required info provided ─────────────────► PLANNING
         │
         ├─ Turn count > maxUnderstandingTurns ────────► PLANNING
         │
         └─ Otherwise ──────────────────────────────────► UNDERSTANDING


Current Phase: PLANNING
         │
         ├─ User says "go ahead" ───────────────────────► EXECUTING
         │
         ├─ User approves plan ─────────────────────────► EXECUTING
         │
         ├─ AI starts executing ────────────────────────► EXECUTING
         │
         └─ Otherwise ──────────────────────────────────► PLANNING


Current Phase: EXECUTING
         │
         ├─ Work completed (artifact created) ──────────► REVIEWING
         │
         ├─ AI says "done" ─────────────────────────────► REVIEWING
         │
         └─ Otherwise ──────────────────────────────────► EXECUTING


Current Phase: REVIEWING
         │
         ├─ User satisfied ("perfect!") ────────────────► COMPLETED
         │
         ├─ User requests changes ──────────────────────► UNDERSTANDING
         │
         └─ Otherwise ──────────────────────────────────► REVIEWING


Current Phase: COMPLETED
         │
         ├─ New goal detected ──────────────────────────► UNDERSTANDING
         │
         ├─ User says "bye" ────────────────────────────► IDLE
         │
         └─ Otherwise ──────────────────────────────────► COMPLETED
```

## Idle Detection Flow

```
Last user message timestamp
         │
         ▼
Calculate time since last message
         │
         ├─ < idleThresholdMinutes (default: 10) ──► Continue in current phase
         │
         └─ ≥ idleThresholdMinutes ─────────────────► Transition to IDLE
                                                      Mark current goal as abandoned
```

## State Summary Generation

```
ConversationState
    │
    ├─ Phase: understanding
    ├─ Turn Count: 5
    ├─ Current Goal:
    │   ├─ Type: artifact_creation
    │   ├─ Description: "Build a todo app"
    │   └─ Required Info:
    │       ├─ ✓ component_type: provided
    │       └─ ? requirements: unknown
    └─ Completed Goals: 1
         │
         ▼
Generated Summary:
┌────────────────────────────────────────────┐
│ Conversation Phase: understanding          │
│ Turn Count: 5                              │
│                                            │
│ Current Goal:                              │
│   Type: artifact_creation                  │
│   Description: Build a todo app            │
│   Required Information:                    │
│     ✓ component_type: Type of component    │
│     ? requirements: Requirements           │
│                                            │
│ Completed Goals: 1                         │
└────────────────────────────────────────────┘
```

## Example: Full Conversation Flow

```
Turn 1: User: "I want to build a todo app"
  Phase: greeting → understanding
  Goal: Created (artifact_creation)
  Required Info: component_type (unknown), requirements (unknown)

Turn 2: AI: "What features do you need?"
  Phase: understanding → understanding
  Goal: Same
  Required Info: No change

Turn 3: User: "Add, delete, mark complete with React components"
  Phase: understanding → planning
  Goal: Same
  Required Info: component_type (provided: React), requirements (provided: CRUD)

Turn 4: AI: "I'll create a React todo app component"
  Phase: planning → executing
  Goal: Same

Turn 5: AI: "<artifact type='react'>...code...</artifact>"
  Phase: executing → reviewing
  Goal: Same

Turn 6: User: "Perfect! This is exactly what I needed"
  Phase: reviewing → completed
  Goal: Marked as completed, moved to completedGoals
  Current Goal: null
```

## Legend

```
─────►  State transition
├─────  Decision branch
│       Flow continuation
┌────┐  State or process
[...]   Required information
✓       Completed/Provided
✗       Abandoned/Missing
?       Unknown status
```
