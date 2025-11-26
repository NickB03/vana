# Message Feedback Integration Guide

## Overview

The Message Feedback system allows users to provide thumbs up/down ratings on assistant messages, helping measure satisfaction and identify areas for improvement.

## Components Created

### 1. Database Migration
**File**: `/Users/nick/Projects/llm-chat-site/supabase/migrations/20251126100000_create_message_feedback.sql`

- Creates `message_feedback` table with RLS policies
- Supports both authenticated users and guests
- Prevents duplicate feedback (one per user per message)
- Includes analytics view `feedback_summary` for daily metrics

### 2. React Hook
**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/useMessageFeedback.ts`

```typescript
const { submitFeedback, getFeedbackForMessage, isLoading, error } = useMessageFeedback();

// Submit positive feedback
await submitFeedback({
  messageId: 'msg-123',
  sessionId: 'session-456',
  rating: 'positive'
});

// Submit negative feedback with category
await submitFeedback({
  messageId: 'msg-123',
  sessionId: 'session-456',
  rating: 'negative',
  category: 'incomplete',
  comment: 'Missing code examples'
});
```

### 3. UI Component
**File**: `/Users/nick/Projects/llm-chat-site/src/components/MessageFeedback.tsx`

Features:
- Thumbs up/down buttons (lucide-react icons)
- Immediate submission for positive feedback
- Expandable form for negative feedback with:
  - Category selection (inaccurate, unhelpful, incomplete, off_topic)
  - Optional comment textarea (500 char limit)
- Disabled state after submission
- Loading state during submission
- Shows existing feedback on component mount

## Integration with ChatInterface

### Location
Add `<MessageFeedback />` component in `ChatInterface.tsx` after assistant message content.

### Recommended Integration Point

In `/Users/nick/Projects/llm-chat-site/src/components/ChatInterface.tsx`, locate the assistant message rendering section (around line 463-516).

Add the feedback component **after** the `MessageWithArtifacts` component and **before** the action buttons:

```tsx
{isAssistant ? (
  <div className="group flex w-full flex-col gap-2">
    {hasReasoning && (
      <ReasoningErrorBoundary>
        <ReasoningDisplay
          reasoning={message.reasoning}
          reasoningSteps={message.reasoning_steps}
          isStreaming={false}
        />
      </ReasoningErrorBoundary>
    )}
    <MessageWithArtifacts
      content={message.content}
      messageId={message.id}
      sessionId={message.session_id}
      onArtifactOpen={handleArtifactOpen}
      searchResults={message.search_results}
    />

    {/* ADD MESSAGE FEEDBACK HERE */}
    <MessageFeedback
      messageId={message.id}
      sessionId={message.session_id}
    />

    {/* Compact action buttons - positioned at bottom right */}
    <div className="flex justify-end">
      <MessageActions
        className={cn(
          "flex gap-1",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100",
          isLastMessage && "opacity-100"
        )}
      >
        {/* ... action buttons ... */}
      </MessageActions>
    </div>
  </div>
) : (
  // ... user message rendering ...
)}
```

### Import Statement

Add to the imports at the top of `ChatInterface.tsx`:

```typescript
import { MessageFeedback } from "@/components/MessageFeedback";
```

## Database Schema

```sql
CREATE TABLE message_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  category TEXT CHECK (category IN ('inaccurate', 'unhelpful', 'incomplete', 'off_topic') OR category IS NULL),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_message_feedback UNIQUE (message_id, user_id)
);
```

## Analytics View

Query the `feedback_summary` view for daily metrics:

```sql
SELECT * FROM feedback_summary ORDER BY date DESC LIMIT 30;
```

Returns:
- `date` - Date of feedback
- `positive` - Count of positive ratings
- `negative` - Count of negative ratings
- `total` - Total feedback count
- `positive_percentage` - Percentage of positive feedback
- `inaccurate_count` - Count of "inaccurate" category
- `unhelpful_count` - Count of "unhelpful" category
- `incomplete_count` - Count of "incomplete" category
- `off_topic_count` - Count of "off-topic" category

## Testing

### Run Hook Tests
```bash
npm run test -- src/hooks/__tests__/useMessageFeedback.test.ts
```

### Run Component Tests
```bash
npm run test -- src/components/__tests__/MessageFeedback.test.tsx
```

## Deployment

### 1. Apply Migration
```bash
# For staging
supabase db push --project-ref <staging-ref>

# For production
supabase db push --project-ref <prod-ref>
```

### 2. Verify Table Creation
```bash
# Connect to database
supabase db connect

# Check table
\dt message_feedback

# Check view
\dv feedback_summary

# Check policies
SELECT * FROM pg_policies WHERE tablename = 'message_feedback';
```

### 3. Test in Development
```bash
npm run dev
# Navigate to http://localhost:8080
# Send a message and verify feedback buttons appear
```

## Accessibility

- Thumbs up/down buttons have proper `aria-label` attributes
- Radio buttons are properly associated with labels
- Textarea has associated label via `htmlFor`
- Focus states are visible
- Keyboard navigation supported

## Performance Considerations

- Feedback component only renders for assistant messages
- Existing feedback is fetched once on mount
- Submission is debounced via loading state
- No re-renders on parent state changes (memoized where needed)

## Future Enhancements

Potential improvements for future iterations:

1. **Admin Dashboard**: Build analytics dashboard to visualize feedback trends
2. **Email Notifications**: Notify team when negative feedback is submitted
3. **Follow-up Questions**: Ask users for more details on specific categories
4. **A/B Testing**: Test different feedback UI variations
5. **Integration with Quality Logs**: Cross-reference with response_quality_logs table

## Troubleshooting

### Issue: "already submitted feedback" error
**Solution**: User has already submitted feedback for this message. Check `unique_user_message_feedback` constraint.

### Issue: Buttons not appearing
**Solution**: Verify component is only rendered for assistant messages, not user messages.

### Issue: Guest feedback not saving
**Solution**: Check RLS policies allow NULL user_id for guest users.

### Issue: Category dropdown not showing
**Solution**: Ensure thumbs down button was clicked (only shows for negative feedback).
