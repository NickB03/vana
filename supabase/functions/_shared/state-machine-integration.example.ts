/**
 * Example: Integrating Conversation State Machine into Chat Function
 *
 * This file demonstrates how to integrate the state machine into the
 * existing chat Edge Function to track conversation coherence.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createInitialState,
  updateState,
  getStateSummary,
  deserializeState,
  serializeState,
} from './state-machine.ts';
import { ConversationState } from './conversation-state.ts';

/**
 * Example: Storing and retrieving conversation state from database
 *
 * You would add a new column to chat_sessions table:
 * ALTER TABLE chat_sessions ADD COLUMN conversation_state JSONB;
 */

/**
 * Retrieves conversation state for a session
 */
async function getConversationState(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<ConversationState> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('conversation_state')
    .eq('id', sessionId)
    .single();

  if (error || !data?.conversation_state) {
    // Create initial state if none exists
    return createInitialState(sessionId);
  }

  return deserializeState(JSON.stringify(data.conversation_state));
}

/**
 * Saves conversation state to database
 */
async function saveConversationState(
  supabase: ReturnType<typeof createClient>,
  state: ConversationState,
): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      conversation_state: JSON.parse(serializeState(state)),
    })
    .eq('id', state.sessionId);

  if (error) {
    console.error('Failed to save conversation state:', error);
  }
}

/**
 * Example: Integration into chat handler
 */
export async function handleChatWithStateTracking(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userMessage: string,
): Promise<{ response: string; state: ConversationState }> {
  // 1. Get current conversation state
  const currentState = await getConversationState(supabase, sessionId);

  // 2. Update state with user message
  const userTransition = updateState(currentState, userMessage, 'user');
  const updatedState = userTransition.newState;

  // 3. Generate state summary for AI context
  const stateSummary = getStateSummary(updatedState);

  // 4. Build AI prompt with state context
  const systemPrompt = `
You are an AI assistant in a conversation with the following state:

${stateSummary}

Important context:
- Current phase: ${updatedState.phase}
${updatedState.currentGoal ? `- Current goal: ${updatedState.currentGoal.description}` : '- No active goal'}

Based on this context, provide a coherent response that:
1. Acknowledges the conversation phase
2. Addresses the current goal if active
3. Asks for missing required information if needed
4. Maintains continuity with previous turns
`;

  // 5. Call AI (simplified - actual implementation uses streaming)
  const aiResponse = await generateAIResponse(systemPrompt, userMessage);

  // 6. Update state with assistant response
  const assistantTransition = updateState(updatedState, aiResponse, 'assistant');
  const finalState = assistantTransition.newState;

  // 7. Save updated state
  await saveConversationState(supabase, finalState);

  // 8. Log milestone transitions for analytics
  if (assistantTransition.isMilestone) {
    console.log(`[STATE MACHINE] Milestone transition: ${assistantTransition.reason}`);
  }

  return {
    response: aiResponse,
    state: finalState,
  };
}

/**
 * Simplified AI response generation (placeholder)
 */
async function generateAIResponse(systemPrompt: string, userMessage: string): Promise<string> {
  // In real implementation, this would call OpenRouter or Google AI
  return 'AI response based on state context';
}

/**
 * Example: Using state machine to detect when to ask clarifying questions
 */
export function shouldAskClarifyingQuestions(state: ConversationState): boolean {
  // In understanding phase with incomplete required info
  if (state.phase === 'understanding' && state.currentGoal) {
    const missingInfo = state.currentGoal.requiredInfo.filter(
      info => info.status === 'unknown' || info.status === 'asked'
    );
    return missingInfo.length > 0;
  }
  return false;
}

/**
 * Example: Using state machine to generate contextual prompts
 */
export function generateContextualPrompt(state: ConversationState): string {
  const { phase, currentGoal } = state;

  switch (phase) {
    case 'greeting':
      return 'Greet the user warmly and ask how you can help.';

    case 'understanding':
      if (currentGoal) {
        const missingInfo = currentGoal.requiredInfo.filter(
          info => info.status !== 'provided'
        );
        if (missingInfo.length > 0) {
          return `Ask about: ${missingInfo.map(i => i.description).join(', ')}`;
        }
      }
      return 'Clarify the user\'s goal and gather requirements.';

    case 'planning':
      return 'Propose a clear plan or solution to accomplish the goal.';

    case 'executing':
      return 'Execute the plan and create the requested artifact/response.';

    case 'reviewing':
      return 'Present the completed work and ask for feedback.';

    case 'completed':
      return 'Confirm success and ask if there\'s anything else to help with.';

    case 'idle':
      return 'Re-engage the user or wait for new input.';

    default:
      return 'Respond helpfully to the user.';
  }
}

/**
 * Example: Database migration to add conversation_state column
 *
 * CREATE OR REPLACE FUNCTION add_conversation_state_column()
 * RETURNS void
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * SET search_path = public, pg_temp
 * AS $$
 * BEGIN
 *   -- Add conversation_state column if it doesn't exist
 *   IF NOT EXISTS (
 *     SELECT 1
 *     FROM information_schema.columns
 *     WHERE table_name = 'chat_sessions'
 *     AND column_name = 'conversation_state'
 *   ) THEN
 *     ALTER TABLE chat_sessions
 *     ADD COLUMN conversation_state JSONB DEFAULT NULL;
 *
 *     -- Add index for performance
 *     CREATE INDEX IF NOT EXISTS idx_chat_sessions_state_phase
 *     ON chat_sessions ((conversation_state->>'phase'));
 *
 *     COMMENT ON COLUMN chat_sessions.conversation_state IS
 *     'Tracks conversation phase, goals, and multi-turn coherence';
 *   END IF;
 * END;
 * $$;
 */

/**
 * Example: Analytics query using conversation state
 *
 * -- Count sessions by phase
 * SELECT
 *   conversation_state->>'phase' as phase,
 *   COUNT(*) as count
 * FROM chat_sessions
 * WHERE conversation_state IS NOT NULL
 * GROUP BY phase
 * ORDER BY count DESC;
 *
 * -- Find sessions with completed goals
 * SELECT
 *   id,
 *   title,
 *   jsonb_array_length(conversation_state->'completedGoals') as completed_count
 * FROM chat_sessions
 * WHERE conversation_state->'completedGoals' IS NOT NULL
 * ORDER BY completed_count DESC;
 *
 * -- Average turns per phase
 * SELECT
 *   conversation_state->>'phase' as phase,
 *   AVG((conversation_state->>'turnCount')::int) as avg_turns
 * FROM chat_sessions
 * WHERE conversation_state IS NOT NULL
 * GROUP BY phase;
 */
