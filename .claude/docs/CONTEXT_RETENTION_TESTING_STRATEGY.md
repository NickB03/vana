# Context Retention Testing Strategy

## Overview

This document outlines a comprehensive testing strategy to validate that the chat system successfully maintains conversation context across turns, specifically addressing the issue where pronouns like "there" should correctly refer to previously mentioned entities (e.g., "Garland Christmas event").

## Problem Statement

The chat system currently fails to maintain conversation context across turns, with 5 critical bugs identified:
1. GLM message formatting flattens conversation history
2. Artifact requests don't include conversation history
3. Entity extraction only recognizes code patterns, not natural language
4. No reference resolution for pronouns
5. System prompt lacks explicit context handling instructions

## Testing Strategy Goals

1. **Validate context retention** across different conversation patterns
2. **Ensure pronoun resolution** works correctly
3. **Verify entity tracking** persists across turns
4. **Test mixed conversations** (chat + artifacts)
5. **Performance validation** for context management
6. **Regression prevention** for context bugs

## Test Scenarios and Cases

### 1. Basic Pronoun Resolution Tests

#### Test Case 1.1: Simple "it" Reference
- **Input**:
  - User: "Create a React component for a Christmas event"
  - User: "Add decorations to it"
- **Expected**: AI understands "it" refers to the Christmas event component
- **Validation**: AI should respond with decorations for the Christmas event component

#### Test Case 1.2: "there" Reference (Primary Issue)
- **Input**:
  - User: "Tell me about the Garland Christmas event"
  - User: "What activities are there?"
- **Expected**: AI understands "there" refers to Garland Christmas event
- **Validation**: AI should list activities specific to the Garland Christmas event

#### Test Case 1.3: "they" Reference
- **Input**:
  - User: "I need to organize volunteers and vendors for the event"
  - User: "How do I contact them?"
- **Expected**: AI understands "they" refers to volunteers and vendors
- **Validation**: AI should provide contact methods for both groups

### 2. Location/Event Reference Tests

#### Test Case 2.1: Event Location References
- **Input**:
  - User: "Describe the Garland Community Center event"
  - User: "How do I get there?"
- **Expected**: AI provides directions to the Garland Community Center
- **Validation**: Should not ask for clarification about the location

#### Test Case 2.2: Multi-Event References
- **Input**:
  - User: "I'm organizing both the Garland Christmas event and the New Year's party"
  - User: "Which one has more space?"
- **Expected**: AI can distinguish between the two events
- **Validation**: Should ask for clarification or provide comparative information

### 3. Multi-turn Conversation Tests

#### Test Case 3.1: Topic Switch and Return
- **Input**:
  - User: "Let's talk about React components"
  - User: "Show me a button example"
  - User: "Now back to the Christmas event"
  - User: "What about parking?"
- **Expected**: AI remembers the Christmas event topic
- **Validation**: Should provide parking information for the Christmas event

#### Test Case 3.2: Deep Context Chain
- **Input**: 5+ turn conversation about a topic
- **User**: "Can you remember what we discussed 3 turns ago?"
- **Expected**: AI can reference context from 3+ turns back
- **Validation**: Should correctly identify and reference previous discussion

### 4. Mixed Artifact + Chat Tests

#### Test Case 4.1: Artifact Context References
- **Input**:
  - User: "Create a todo list for the Christmas event"
  - (Artifact generated)
  - User: "Add more items to it"
- **Expected**: AI understands "it" refers to the todo list artifact
- **Validation**: Should update the todo list with additional items

#### Test Case 4.2: Artifact + Conversation Mixing
- **Input**:
  - User: "Create a countdown timer for the event"
  - (Artifact generated)
  - User: "What about the decorations we discussed?"
- **Expected**: AI connects artifact with previous conversation
- **Validation**: Should reference both the timer and decoration discussion

### 5. Long Conversation Tests

#### Test Case 5.1: Context Compression Validation
- **Input**: 20+ turn conversation exceeding token limits
- **Expected**: Context summarization preserves important entities
- **Validation**: Key entities (event names, people, dates) should be preserved

#### Test Case 5.2: Summary Context References
- **Input**:
  - Long conversation about multiple events
  - User: "Can you summarize what we planned for the main event?"
- **Expected**: Summary should include key decision points
- **Validation**: Summary should reference correctly attributed decisions

### 6. Guest vs Authenticated User Tests

#### Test Case 6.1: Guest Session Context
- **Input**: Conversation as guest user
- **Expected**: Context maintained within guest session
- **Validation**: Pronoun resolution should work in guest mode

#### Test Case 6.2: Authenticated User Context
- **Input**: Conversation as authenticated user
- **Expected**: Context persists across sessions
- **Validation**: Previous conversation context should be available

### 7. Edge Cases

#### Test Case 7.1: Ambiguous References
- **Input**:
  - User: "I have two events: Christmas and New Year's"
  - User: "Which one is better?"
- **Expected**: AI asks for clarification
- **Validation**: Should not make assumptions about which event

#### Test Case 7.2: Contradictory Information
- **Input**:
  - User: "The event is on December 25th"
  - User: "No, I meant December 31st"
  - User: "What about the venue for it?"
- **Expected**: AI uses most recent information
- **Validation**: Should reference December 31st date

#### Test Case 7.3: Code vs Natural Language Entities
- **Input**:
  - User: "I created a function called `calculateTotal`"
  - User: "Can you explain it?"
- **Expected**: AI understands "it" refers to the function
- **Validation**: Should provide explanation of the function

## Unit Tests

### 1. Context Selector Tests

**File**: `supabase/functions/_shared/context-selector.test.ts`

#### Test Cases:
1. `selectContext_shouldReturnAllMessages_whenWithinBudget`
   - Input: 3 messages, 1000 token budget
   - Expected: All messages returned, no summarization

2. `selectContext_shouldPrioritizeRecentMessages_whenOverBudget`
   - Input: 10 messages, 500 token budget, alwaysKeepRecent=5
   - Expected: Last 5 messages included, older messages ranked

3. `selectContext_shouldPrioritizeTrackedEntities`
   - Input: Messages with tracked entity "ChristmasEvent"
   - Expected: Messages mentioning entity get higher priority

4. `extractEntities_shouldExtractNaturalLanguageEntities`
   - Input: "Tell me about the Garland Christmas event"
   - Expected: "Garland", "Christmas", "event" extracted as entities

5. `extractEntities_shouldExtractCodeEntities`
   - Input: "The `calculateTotal` function handles the event logic"
   - Expected: "calculateTotal" extracted as entity

### 2. Context Ranker Tests

**File**: `supabase/functions/_shared/context-ranker.test.ts`

#### Test Cases:
1. `rankMessageImportance_shouldRecencyWeighted`
   - Input: Same message content, different positions
   - Expected: Recent messages get higher scores

2. `rankMessageImportance_shouldEntityDensityWeighted`
   - Input: Messages with tracked entities
   - Expected: Higher entity density = higher importance

3. `isQuestionOrAnswer_shouldDetectQAPairs`
   - Input: Question followed by answer
   - Expected: Both messages get question/answer bonus

4. `hasCodeBlock_shouldDetectCodeContent`
   - Input: Messages with ```code blocks```
   - Expected: Code content properly detected

5. `isDecisionPoint_shouldDetectDecisions`
   - Input: Messages with confirmation words
   - Expected: Decision points properly identified

### 3. Entity Resolution Tests

**File**: `supabase/functions/_shared/entity-resolution.test.ts` (New)

#### Test Cases:
1. `resolvePronoun_shouldResolve_it_toLastEntity`
   - Input: "Create a component", "Style it"
   - Expected: "it" resolves to component

2. `resolvePronoun_shouldResolve_there_toLocation`
   - Input: "Tell about Garland event", "What's there?"
   - Expected: "there" resolves to Garland event

3. `resolvePronoun_shouldResolve_they_toPluralEntity`
   - Input: "Organize volunteers and vendors", "Contact them"
   - Expected: "they" resolves to both groups

4. `getReferenceResolution_shouldHandleAmbiguousReferences`
   - Input: Multiple similar entities, pronoun reference
   - Expected: Should request clarification when ambiguous

### 4. GLM Message Formatting Tests

**File**: `supabase/functions/chat/handlers/formatting.test.ts` (New)

#### Test Cases:
1. `formatMessagesForGLM_shouldPreserveConversationHistory`
   - Input: Multi-turn conversation
   - Expected: History structure preserved for context

2. `formatMessagesForGLM_shouldIncludeReasoningSteps`
   - Input: Messages with reasoning_steps
   - Expected: Reasoning included in context

3. `formatMessagesForGLM_shouldHandleArtifactContext`
   - Input: Messages with currentArtifact
   - Expected: Artifact context properly formatted

## Integration Tests

### 1. End-to-End Context Flow Tests

**File**: `tests/integration/context-retention.spec.ts`

#### Test Cases:
1. `e2e_pronoun_resolution_should_work_in_chat`
   - Setup: Start new conversation session
   - Actions: Send pronoun reference messages
   - Expected: Correct context resolution in responses

2. `e2e_artifact_context_should_be_preserved`
   - Setup: Create artifact, then chat about it
   - Actions: Reference artifact in subsequent messages
   - Expected: Artifact context correctly referenced

3. `e2e_long_conversation_should_maintain_context`
   - Setup: 10+ turn conversation
   - Actions: Test references across turns
   - Expected: Context maintained throughout

4. `e2e_guest_vs_auth_context_should_work`
   - Setup: Test both guest and authenticated sessions
   - Actions: Same conversation pattern in both modes
   - Expected: Context works in both scenarios

### 2. API Context Tests

**File**: `tests/integration/api-context.spec.ts`

#### Test Cases:
1. `api_chat_should_include_full_context`
   - Endpoint: POST /functions/v1/chat
   - Expected: Full conversation history in request

2. `api_artifact_should_include_conversation_context`
   - Endpoint: POST /functions/v1/generate-artifact
   - Expected: Previous messages included in prompt

3. `api_context_should_be_truncated_when_over_limit`
   - Endpoint: POST /functions/v1/chat
   - Input: Messages exceeding token budget
   - Expected: Context properly truncated with important messages preserved

## Performance Tests

### 1. Context Management Performance

**File**: `tests/performance/context-management.spec.ts`

#### Test Cases:
1. `performance_context_selection_should_scale_linearly`
   - Setup: 100, 500, 1000 message conversations
   - Measurement: Time to select context
   - Expected: O(n) time complexity

2. `performance_entity_extraction_should_be_fast`
   - Setup: Messages with many entities
   - Measurement: Time to extract entities
   - Expected: < 100ms for typical conversations

3. `performance_pronoun_resolution_should_be_instant`
   - Setup: Pronoun resolution in various contexts
   - Measurement: Time to resolve references
   - Expected: < 50ms resolution time

### 2. Memory Usage Tests

**File**: `tests/performance/memory-usage.spec.ts`

#### Test Cases:
1. `memory_should_not_leak_with_long_conversations`
   - Setup: Create and destroy multiple conversation sessions
   - Measurement: Memory before/after each session
   - Expected: No memory growth between sessions

2. `memory_should_be_efficient_with_large_contexts`
   - Setup: Large context windows (1000+ messages)
   - Measurement: Memory usage during context selection
   - Expected: Memory scales linearly with context size

## Regression Tests

### 1. Critical Bug Regression Tests

**File**: `tests/regression/context-bugs.spec.ts`

#### Test Cases:
1. `regression_flattened_history_should_not_occur`
   - Input: Multi-turn conversation with nested references
   - Expected: Context structure preserved, not flattened

2. `regression_artifact_requests_should_include_history`
   - Input: Create artifact, then request related artifact
   - Expected: First artifact included in context

3. `regression_entity_extraction_should_work_naturally`
   - Input: Natural language conversation
   - Expected: Entities extracted from conversation

4. `regression_pronoun_resolution_should_work`
   - Input: Pronoun references in conversation
   - Expected: Correct resolution of pronouns

5. `regression_system_prompt_should_include_context_instructions`
   - Input: Test system prompt generation
   - Expected: Context handling instructions included

### 2. Cross-Session Context Tests

**File**: `tests/regression/cross-session-context.spec.ts`

#### Test Cases:
1. `regression_cross_session_should_maintain_important_context`
   - Setup: Conversation in session 1, continue in session 2
   - Expected: Important entities preserved across sessions

2. `regression_session_switch_should_not_lose_context`
   - Setup: Switch between multiple sessions
   - Expected: Each session maintains its own context

## Test Data Requirements

### 1. Test Conversations

**File**: `tests/test-data/context-test-conversations.json`

#### Sample Conversations:
1. **Pronoun Resolution Tests**
   ```json
   {
     "name": "Garland Christmas Event",
     "messages": [
       {"role": "user", "content": "Tell me about the Garland Christmas event"},
       {"role": "assistant", "content": "The Garland Christmas event is held annually..."},
       {"role": "user", "content": "What activities are there?"},
       {"role": "assistant", "expected": "The Garland Christmas event includes activities like..."}
     ]
   }
   ```

2. **Artifact Context Tests**
   ```json
   {
     "name": "Todo List Artifact",
     "messages": [
       {"role": "user", "content": "Create a todo list for the Christmas event"},
       {"role": "assistant", "content": "<artifact>todo list content</artifact>"},
       {"role": "user", "content": "Add more items to it"},
       {"role": "assistant", "expected": "Updated todo list with additional items"}
     ]
   }
   ```

### 2. Test Entities

**File**: `tests/test-data/tracked-entities.json`

#### Entity Sets:
1. **Event Entities**: ["Garland Christmas", "Community Center", "New Year's Party"]
2. **Code Entities**: ["calculateTotal", "EventPlanner", "ChristmasTimer"]
3. **Natural Language Entities**: ["decorations", "volunteers", "vendors", "parking"]

## Test Implementation Plan

### Phase 1: Unit Tests (Week 1)
1. Implement context selector tests
2. Implement context ranker tests
3. Create entity resolution tests
4. Add GLM formatting tests

### Phase 2: Integration Tests (Week 2)
1. End-to-end context flow tests
2. API context validation tests
3. Cross-browser testing
4. Guest vs authenticated user tests

### Phase 3: Performance Tests (Week 3)
1. Context management performance benchmarks
2. Memory usage analysis
3. Load testing with concurrent users
4. Token budget optimization tests

### Phase 4: Regression Tests (Week 4)
1. Critical bug regression tests
2. Cross-session context tests
3. Long-term stability tests
4. Automated regression suite

### Phase 5: Continuous Monitoring (Ongoing)
1. Add context tests to CI/CD pipeline
2. Automated test reporting
3. Performance regression detection
4. Context quality metrics dashboard

## Metrics for Success

### 1. Functional Metrics
- **Pronoun Resolution Rate**: > 95% correct pronoun resolution
- **Entity Tracking Accuracy**: > 90% correct entity extraction
- **Context Preservation**: > 98% of important contexts maintained
- **Artifact Context Integration**: 100% of artifact requests include conversation history

### 2. Performance Metrics
- **Context Selection Time**: < 100ms for typical conversations
- **Entity Extraction Time**: < 50ms for typical messages
- **Memory Usage**: Linear scaling with conversation size
- **Response Time**: No significant degradation due to context management

### 3. Quality Metrics
- **Test Coverage**: > 90% line coverage for context-related code
- **Bug Detection**: All critical context bugs fixed
- **Regression Prevention**: Zero regressions in context functionality
- **User Satisfaction**: Measured through user feedback and usage patterns

## Test Automation Recommendations

### 1. Automated Test Execution
- Run unit tests on every commit
- Run integration tests on every PR
- Run performance tests nightly
- Run regression tests before production deployment

### 2. Continuous Monitoring
- Monitor context resolution success rate
- Track performance metrics over time
- Alert on significant context failures
- Regular test result analysis

### 3. Test Data Management
- Maintain diverse test conversation datasets
- Update test data based on real usage patterns
- Regular review and cleanup of unused test cases
- Version control for test data

## Conclusion

This comprehensive testing strategy ensures that the context retention fixes are thoroughly validated across all usage scenarios. By focusing on the specific issue of pronoun resolution while also testing broader context management, we can ensure a robust and reliable chat system that maintains conversation context effectively.

The strategy combines unit testing for individual components, integration testing for end-to-end flows, performance testing for scalability, and regression testing for long-term reliability. This multi-layered approach provides confidence that the context retention fixes work correctly and will continue to work as the system evolves.