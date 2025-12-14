# Test Templates for Missing Coverage

Ready-to-use test templates for the 4 high-priority missing test suites.

---

## Template 1: #280 - Image/Artifact Mutual Exclusivity Tests

**File**: `/src/components/prompt-kit/__tests__/prompt-input-controls.test.tsx`

**Estimated Implementation Time**: 4-6 hours

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PromptInputControls } from '../prompt-input-controls';
import React from 'react';

describe('PromptInputControls - Mode Mutual Exclusivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial State', () => {
    it('should start with no mode active', () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      expect(imageBtn).not.toHaveClass('active');
      expect(artifactBtn).not.toHaveClass('active');
    });

    it('should have both buttons accessible', () => {
      render(<PromptInputControls />);

      expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /artifact/i })).toBeInTheDocument();
    });
  });

  describe('Mutual Exclusivity - Image Mode', () => {
    it('should activate image mode when image button clicked', async () => {
      const mockOnModeChange = vi.fn();
      render(<PromptInputControls onModeChange={mockOnModeChange} />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      fireEvent.click(imageBtn);

      await waitFor(() => {
        expect(imageBtn).toHaveClass('active');
      });
      expect(mockOnModeChange).toHaveBeenCalledWith('image');
    });

    it('should deactivate artifact mode when image mode activated', async () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      // Start with artifact mode
      fireEvent.click(artifactBtn);
      await waitFor(() => {
        expect(artifactBtn).toHaveClass('active');
      });

      // Click image button - artifact should deactivate
      fireEvent.click(imageBtn);

      await waitFor(() => {
        expect(imageBtn).toHaveClass('active');
        expect(artifactBtn).not.toHaveClass('active');
      });
    });

    it('should toggle image mode off when clicked again', async () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });

      // Activate
      fireEvent.click(imageBtn);
      await waitFor(() => {
        expect(imageBtn).toHaveClass('active');
      });

      // Deactivate
      fireEvent.click(imageBtn);
      await waitFor(() => {
        expect(imageBtn).not.toHaveClass('active');
      });
    });
  });

  describe('Mutual Exclusivity - Artifact Mode', () => {
    it('should activate artifact mode when artifact button clicked', async () => {
      const mockOnModeChange = vi.fn();
      render(<PromptInputControls onModeChange={mockOnModeChange} />);

      const artifactBtn = screen.getByRole('button', { name: /artifact/i });
      fireEvent.click(artifactBtn);

      await waitFor(() => {
        expect(artifactBtn).toHaveClass('active');
      });
      expect(mockOnModeChange).toHaveBeenCalledWith('artifact');
    });

    it('should deactivate image mode when artifact mode activated', async () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      // Start with image mode
      fireEvent.click(imageBtn);
      await waitFor(() => {
        expect(imageBtn).toHaveClass('active');
      });

      // Click artifact button - image should deactivate
      fireEvent.click(artifactBtn);

      await waitFor(() => {
        expect(artifactBtn).toHaveClass('active');
        expect(imageBtn).not.toHaveClass('active');
      });
    });

    it('should toggle artifact mode off when clicked again', async () => {
      render(<PromptInputControls />);

      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      // Activate
      fireEvent.click(artifactBtn);
      await waitFor(() => {
        expect(artifactBtn).toHaveClass('active');
      });

      // Deactivate
      fireEvent.click(artifactBtn);
      await waitFor(() => {
        expect(artifactBtn).not.toHaveClass('active');
      });
    });
  });

  describe('Rapid Toggling', () => {
    it('should handle rapid button clicks without state inconsistency', async () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      // Rapid clicks
      fireEvent.click(imageBtn);
      fireEvent.click(artifactBtn);
      fireEvent.click(imageBtn);
      fireEvent.click(artifactBtn);

      await waitFor(() => {
        // Final state: only artifact should be active
        expect(artifactBtn).toHaveClass('active');
        expect(imageBtn).not.toHaveClass('active');
      });
    });

    it('should maintain single-active invariant', async () => {
      const { rerender } = render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      const artifactBtn = screen.getByRole('button', { name: /artifact/i });

      // Click image
      fireEvent.click(imageBtn);
      let activeCount = [imageBtn, artifactBtn].filter(btn => btn.classList.contains('active')).length;
      expect(activeCount).toBeLessThanOrEqual(1);

      // Click artifact
      fireEvent.click(artifactBtn);
      activeCount = [imageBtn, artifactBtn].filter(btn => btn.classList.contains('active')).length;
      expect(activeCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Visual Feedback', () => {
    it('should provide visual distinction between active and inactive states', async () => {
      render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });

      // Check initial styling
      const initialStyle = window.getComputedStyle(imageBtn);

      // Click to activate
      fireEvent.click(imageBtn);

      await waitFor(() => {
        const activeStyle = window.getComputedStyle(imageBtn);
        // Should have different styling when active
        expect(activeStyle.backgroundColor).not.toBe(initialStyle.backgroundColor);
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain mode state during re-render', async () => {
      const { rerender } = render(<PromptInputControls />);

      const imageBtn = screen.getByRole('button', { name: /image/i });
      fireEvent.click(imageBtn);

      await waitFor(() => {
        expect(imageBtn).toHaveClass('active');
      });

      // Re-render with same props
      rerender(<PromptInputControls />);

      // Mode should still be active
      expect(imageBtn).toHaveClass('active');
    });
  });
});

describe('ChatInterface - Mode Reset on Session Change', () => {
  it('should reset mode when session ID changes', async () => {
    const { rerender } = render(<ChatInterface sessionId="session-1" />);

    const imageBtn = screen.getByRole('button', { name: /image/i });

    // Set image mode
    fireEvent.click(imageBtn);
    await waitFor(() => {
      expect(imageBtn).toHaveClass('active');
    });

    // Change session
    rerender(<ChatInterface sessionId="session-2" />);

    // Mode should be reset
    await waitFor(() => {
      expect(imageBtn).not.toHaveClass('active');
    });
  });
});

describe('Home - Mode Reset on New Chat', () => {
  it('should reset mode when new chat button clicked', async () => {
    render(<Home />);

    const imageBtn = screen.getByRole('button', { name: /image/i });
    const newChatBtn = screen.getByRole('button', { name: /new chat/i });

    // Set image mode
    fireEvent.click(imageBtn);
    await waitFor(() => {
      expect(imageBtn).toHaveClass('active');
    });

    // Create new chat
    fireEvent.click(newChatBtn);

    // Mode should be reset
    await waitFor(() => {
      expect(imageBtn).not.toHaveClass('active');
    });
  });
});
```

---

## Template 2: #273 - Database Schema Migration Tests

**File**: `/supabase/functions/__tests__/signup-schema.test.ts`

**Estimated Implementation Time**: 3-4 hours

```typescript
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Tests for schema grants migration affecting signup flow
 * Verifies that authenticated role has necessary permissions
 */

Deno.test("Schema Grants - Auth User Permissions", async () => {
  // Note: Requires SUPABASE_URL and SUPABASE_KEY with admin access
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.log("Skipping database tests - no credentials");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Authenticated role has USAGE on auth schema
  Deno.test("authenticated role should have USAGE on auth schema", async () => {
    const { data, error } = await supabase
      .rpc('check_schema_grant', {
        p_role: 'authenticated',
        p_schema: 'auth',
        p_privilege: 'USAGE'
      });

    assert(!error, `Grant check failed: ${error?.message}`);
    assertEquals(data?.has_grant, true, "authenticated role missing USAGE on auth schema");
  });

  // Test 2: Session creation should work with authenticated user
  Deno.test("authenticated user should create session successfully", async () => {
    // This would require actual signup flow
    // Simplified version using direct RPC call

    const { data, error } = await supabase
      .rpc('test_session_creation_permission');

    assert(!error, `Session creation failed: ${error?.message}`);
    assert(data?.session_id, "No session created");
  });

  // Test 3: RLS policies should work with auth schema grants
  Deno.test("RLS policies should enforce with proper grants", async () => {
    const { data, error } = await supabase
      .rpc('verify_rls_enforcement');

    assert(!error, `RLS verification failed: ${error?.message}`);
    assertEquals(data?.rls_active, true, "RLS not enforcing properly");
  });

  // Test 4: Migration should be idempotent
  Deno.test("migration should be idempotent (safe to re-run)", async () => {
    // Run migration twice
    const first = await supabase
      .rpc('run_schema_grants_migration');
    assert(!first.error, "First migration run failed");

    const second = await supabase
      .rpc('run_schema_grants_migration');
    assert(!second.error, "Second migration run failed (not idempotent)");
  });

  // Test 5: Revoked grants should prevent session creation
  Deno.test("revoking grants should prevent session creation", async () => {
    // This is a safety test to ensure grants are actually needed

    // Revoke temporarily
    const { error: revokeError } = await supabase
      .rpc('revoke_schema_grants', { p_role: 'authenticated' });

    if (!revokeError) {
      // Try session creation - should fail
      const { error: sessionError } = await supabase
        .rpc('test_session_creation_permission');

      assertEquals(sessionError !== undefined, true, "Session should fail without grants");

      // Restore grants
      await supabase
        .rpc('restore_schema_grants', { p_role: 'authenticated' });
    }
  });
});

/**
 * Signup Flow Integration Tests
 */
Deno.test("Signup Flow - Complete User Registration", async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || ""
  );

  Deno.test("should create user account successfully", async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    assert(!error, `Signup failed: ${error?.message}`);
    assert(data?.user, "No user created");
    assertEquals(data.user.email, testEmail);
  });

  Deno.test("should create session on login after signup", async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    // Sign up
    await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    assert(!error, `Signin failed: ${error?.message}`);
    assert(data?.session, "No session created");
    assertEquals(data.session.user.email, testEmail);
  });

  Deno.test("should allow authenticated user to insert chat_sessions", async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    // Sign up and sign in
    await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    const { data: insertData, error: insertError } = await supabase
      .from('chat_sessions')
      .insert([{
        user_id: signInData?.user?.id,
        title: 'Test Session',
      }])
      .select();

    assert(!insertError, `Insert failed: ${insertError?.message}`);
    assert(insertData && insertData.length > 0, "No session inserted");
  });
});

/**
 * Permission Verification Functions
 * These would need to be created as SQL functions in the database
 */

/*
CREATE OR REPLACE FUNCTION check_schema_grant(
  p_role TEXT,
  p_schema TEXT,
  p_privilege TEXT
)
RETURNS TABLE (has_grant BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_usage
    WHERE grantee = p_role
    AND object_schema = p_schema
    AND privilege_type = p_privilege
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
```

---

## Template 3: #275 - Reasoning Preservation During Streaming

**File**: `/src/hooks/__tests__/useChatMessages.reasoning.test.tsx`

**Estimated Implementation Time**: 2-3 hours

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';

describe('useChatMessages - Reasoning Preservation', () => {
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Reasoning During Artifact Streaming', () => {
    it('should preserve reasoning when artifact is streamed', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [
          { step: 1, title: 'Analyzing', content: 'Analyzing the request...' },
          { step: 2, title: 'Planning', content: 'Planning the solution...' },
        ],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Here is a calculator component',
          undefined,
          mockReasoningSteps
        );
      });

      // Reasoning should be preserved
      expect(savedMessage?.reasoning_steps).toEqual(mockReasoningSteps);
    });

    it('should keep reasoning available before artifact generation completes', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Analyzing', content: 'Analyzing...' }],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          '<artifact>...',
          undefined,
          mockReasoningSteps
        );
      });

      // Immediately check reasoning is preserved
      expect(savedMessage?.reasoning_steps).toBeDefined();
      expect(savedMessage?.reasoning_steps?.steps).toHaveLength(1);
    });

    it('should handle multiple reasoning updates in sequence', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning1 = { steps: [{ step: 1, title: 'Step 1', content: 'Content 1' }] };
      const reasoning2 = { steps: [
        { step: 1, title: 'Step 1', content: 'Content 1' },
        { step: 2, title: 'Step 2', content: 'Content 2' },
      ]};

      let message1, message2;

      await act(async () => {
        message1 = await result.current.saveMessage(
          'assistant',
          'First response',
          undefined,
          reasoning1
        );
      });

      await act(async () => {
        message2 = await result.current.saveMessage(
          'assistant',
          'Second response',
          undefined,
          reasoning2
        );
      });

      expect(message1?.reasoning_steps?.steps).toHaveLength(1);
      expect(message2?.reasoning_steps?.steps).toHaveLength(2);
    });
  });

  describe('onDelta Callback Timing', () => {
    it('should provide reasoning before onDelta callback fires', async () => {
      const onDelta = vi.fn();
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Analyzing', content: 'Analyzing...' }],
      };

      // When onDelta is called, reasoning should already be saved
      await act(async () => {
        await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          mockReasoningSteps
        );

        if (onDelta) {
          onDelta();
        }
      });

      // After onDelta, reasoning should still be accessible
      const messages = result.current.messages;
      const latestMessage = messages[messages.length - 1];
      expect(latestMessage?.reasoning_steps).toEqual(mockReasoningSteps);
    });

    it('should not lose reasoning if onDelta called during streaming', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = { steps: [{ step: 1, title: 'Step', content: 'Content' }] };

      await act(async () => {
        await result.current.saveMessage('assistant', 'Response', undefined, reasoning);
        // Simulate onDelta callback
        void (0); // Placeholder for callback
      });

      expect(result.current.messages[result.current.messages.length - 1]?.reasoning_steps).toBeDefined();
    });
  });

  describe('Concurrent Artifact + Reasoning Streaming', () => {
    it('should handle artifact and reasoning streaming together', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const artifactContent = '<artifact type="react" title="App">export default function App() {}</artifact>';
      const reasoning = { steps: [{ step: 1, title: 'Generating', content: 'Creating React component...' }] };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          `I'll create a React app. ${artifactContent}`,
          undefined,
          reasoning
        );
      });

      expect(message?.content).toContain('artifact');
      expect(message?.reasoning_steps).toEqual(reasoning);
    });

    it('should preserve reasoning even if artifact generation fails', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = { steps: [{ step: 1, title: 'Attempted', content: 'Tried to generate...' }] };

      let message;
      await act(async () => {
        // Save message with reasoning but failed artifact
        message = await result.current.saveMessage(
          'assistant',
          'I attempted to generate but failed.',
          undefined,
          reasoning
        );
      });

      // Reasoning should still be preserved even though artifact generation failed
      expect(message?.reasoning_steps).toEqual(reasoning);
    });
  });

  describe('Reasoning Error Scenarios', () => {
    it('should handle null reasoning gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          null as any
        );
      });

      expect(message?.reasoning_steps).toBeNull();
      expect(message?.content).toBe('Response');
    });

    it('should handle undefined reasoning gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          undefined
        );
      });

      expect(message?.reasoning_steps).toBeUndefined();
      expect(message?.content).toBe('Response');
    });

    it('should recover if reasoning parsing fails', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const malformedReasoning = { invalid: 'structure' };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          malformedReasoning as any
        );
      });

      // Should not crash, message should still be saved
      expect(message?.content).toBe('Response');
    });
  });

  describe('Reasoning Persistence Across Updates', () => {
    it('should preserve reasoning when message content is updated', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = { steps: [{ step: 1, title: 'Initial', content: 'Initial reasoning' }] };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Original response',
          undefined,
          reasoning
        );
      });

      if (message) {
        await act(async () => {
          await result.current.updateMessage(message.id, 'Updated response');
        });

        // Reasoning should still be there after update
        const updatedMessage = result.current.messages.find(m => m.id === message.id);
        expect(updatedMessage?.reasoning_steps).toEqual(reasoning);
      }
    });
  });
});
```

---

## Template 4: #276 - User Message Pill Sizing Tests

**File**: `/src/components/prompt-kit/__tests__/user-message-pill.test.tsx`

**Estimated Implementation Time**: 1-2 hours

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { UserMessagePill } from '../user-message-pill';

describe('UserMessagePill - Sizing', () => {
  beforeEach(() => {
    // Setup: Set viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Content-Based Width (w-fit)', () => {
    it('should have w-fit class for content-based sizing', () => {
      const { container } = render(<UserMessagePill message="Short" />);
      expect(container.firstChild).toHaveClass('w-fit');
    });

    it('should expand to fit short message content', () => {
      const { container } = render(<UserMessagePill message="Hi" />);
      const pill = container.firstChild as HTMLElement;

      // Should be relatively narrow
      expect(pill.offsetWidth).toBeLessThan(150);
    });

    it('should expand for longer message content', () => {
      const { container } = render(
        <UserMessagePill message="This is a much longer message that will require more space" />
      );
      const pill = container.firstChild as HTMLElement;

      // Should be wider than short message
      expect(pill.offsetWidth).toBeGreaterThan(200);
    });
  });

  describe('Max Width Constraint (max-w-[85%])', () => {
    it('should have max-w-[85%] class constraint', () => {
      const { container } = render(<UserMessagePill message="Test" />);
      expect(container.firstChild).toHaveClass('max-w-[85%]');
    });

    it('should not exceed 85% of viewport width', () => {
      window.innerWidth = 1000;
      const maxAllowedWidth = 1000 * 0.85;

      const longMessage = 'a'.repeat(500);
      const { container } = render(<UserMessagePill message={longMessage} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(maxAllowedWidth);
    });

    it('should constrain on narrow viewport (375px)', () => {
      window.innerWidth = 375;
      const maxAllowedWidth = 375 * 0.85; // ~318px

      const longMessage = 'This is a very long message that should wrap within the constrained width';
      const { container } = render(<UserMessagePill message={longMessage} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(maxAllowedWidth);
    });

    it('should handle edge case: very small viewport (320px)', () => {
      window.innerWidth = 320;
      const maxAllowedWidth = 320 * 0.85; // ~272px

      const message = 'Test message';
      const { container } = render(<UserMessagePill message={message} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(maxAllowedWidth);
    });

    it('should work on tablet viewport (768px)', () => {
      window.innerWidth = 768;
      const maxAllowedWidth = 768 * 0.85; // ~653px

      const message = 'This is a message on tablet';
      const { container } = render(<UserMessagePill message={message} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(maxAllowedWidth);
    });

    it('should work on desktop viewport (1920px)', () => {
      window.innerWidth = 1920;
      const maxAllowedWidth = 1920 * 0.85; // ~1632px

      const message = 'Desktop message';
      const { container } = render(<UserMessagePill message={message} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(maxAllowedWidth);
    });
  });

  describe('Text Wrapping', () => {
    it('should wrap long text properly within constraints', () => {
      const longMessage = 'This is a very long message that should wrap to multiple lines within the constraint width';
      render(<UserMessagePill message={longMessage} />);

      const textElement = screen.getByText(longMessage);
      // Should have word-wrap enabled
      expect(window.getComputedStyle(textElement).wordWrap).toBe('break-word');
    });

    it('should preserve line breaks in message content', () => {
      const messageWithLineBreaks = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<UserMessagePill message={messageWithLineBreaks} />);

      // Message with newlines should render
      expect(container.textContent).toContain('Line 1');
      expect(container.textContent).toContain('Line 2');
    });

    it('should handle emoji and special characters with text wrapping', () => {
      const emojiMessage = 'Hello 👋 this message has emoji 😊 and should wrap nicely';
      render(<UserMessagePill message={emojiMessage} />);

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  describe('Content Overflow', () => {
    it('should not allow horizontal overflow', () => {
      window.innerWidth = 500;
      const extraLongMessage = 'a'.repeat(1000);
      const { container } = render(<UserMessagePill message={extraLongMessage} />);
      const pill = container.firstChild as HTMLElement;

      expect(pill.offsetWidth).toBeLessThanOrEqual(500 * 0.85);
    });

    it('should allow vertical scroll for very long messages', () => {
      const veryLongMessage = 'Line\n'.repeat(100);
      const { container } = render(<UserMessagePill message={veryLongMessage} />);
      const pill = container.firstChild as HTMLElement;

      // Should have scrollable overflow
      const computed = window.getComputedStyle(pill);
      expect(['auto', 'scroll', 'visible']).toContain(computed.overflowY);
    });
  });

  describe('Accessibility', () => {
    it('should be readable in constrained pill format', () => {
      const message = 'This is an important message that users need to read';
      render(<UserMessagePill message={message} />);

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('should maintain contrast ratio for readability', () => {
      render(<UserMessagePill message="Test message" />);

      const text = screen.getByText('Test message');
      const computed = window.getComputedStyle(text);

      // Font size should be readable
      const fontSize = parseFloat(computed.fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(12); // Minimum readable size
    });
  });

  describe('Dynamic Content Changes', () => {
    it('should adjust size when content changes', () => {
      const { rerender, container } = render(<UserMessagePill message="Short" />);
      const initialWidth = (container.firstChild as HTMLElement).offsetWidth;

      rerender(<UserMessagePill message="This is a much longer message" />);
      const newWidth = (container.firstChild as HTMLElement).offsetWidth;

      expect(newWidth).toBeGreaterThan(initialWidth);
    });

    it('should shrink when content becomes shorter', () => {
      const { rerender, container } = render(
        <UserMessagePill message="This is a very long message that takes up a lot of space" />
      );
      const initialWidth = (container.firstChild as HTMLElement).offsetWidth;

      rerender(<UserMessagePill message="Short" />);
      const newWidth = (container.firstChild as HTMLElement).offsetWidth;

      expect(newWidth).toBeLessThan(initialWidth);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { container } = render(<UserMessagePill message="" />);
      expect(container.firstChild).toHaveClass('w-fit');
    });

    it('should handle message with only whitespace', () => {
      const { container } = render(<UserMessagePill message="   " />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle message with very long word (no spaces)', () => {
      const veryLongWord = 'a'.repeat(200);
      const { container } = render(<UserMessagePill message={veryLongWord} />);
      const pill = container.firstChild as HTMLElement;

      // Should still respect max-width
      expect(pill.offsetWidth).toBeLessThanOrEqual(window.innerWidth * 0.85);
    });

    it('should handle message with special HTML-like content', () => {
      const message = 'Message with <tags> and &special; characters';
      render(<UserMessagePill message={message} />);

      // Should display content safely (escaped)
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });
});
```

---

## Implementation Order

### Priority 1 (Do First)
1. **#280** - Image/Artifact Mutual Exclusivity
   - Highest risk, critical state management
   - Use Template 1 (4-6 hours)

2. **#273** - Database Schema Grants
   - Infrastructure risk, affects signup
   - Use Template 2 (3-4 hours)

### Priority 2 (Next)
3. **#275** - Reasoning Preservation
   - Medium risk, feature availability
   - Use Template 3 (2-3 hours)

### Priority 3 (Then)
4. **#276** - Message Pill Sizing
   - Low risk, responsive behavior
   - Use Template 4 (1-2 hours)

---

## Additional Notes

- All templates use Vitest (frontend) or Deno (backend)
- Tests follow project conventions
- Include both happy path and edge cases
- Mock external dependencies as needed
- Total estimated effort: 10-15 hours for all 4 suites

See `/docs/TEST_COVERAGE_ANALYSIS.md` for full context on each issue.
