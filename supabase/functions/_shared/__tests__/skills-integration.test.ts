import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';

Deno.test({
  name: 'Skills Integration - web-search skill activates for search query',
  async fn() {
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseKey) {
      console.log('⚠️ SUPABASE_ANON_KEY not set - skipping integration test');
      return;
    }

    // Arrange: Mock chat request with search query
    const messages = [
      { role: 'user', content: 'What are the latest React 19 features?' }
    ];

    // Act: Call chat endpoint (assumes local Supabase running)
    const response = await fetch('http://localhost:54321/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        messages,
        sessionId: 'test-session-skills-integration'
      }),
    });

    assertEquals(response.ok, true, 'Chat endpoint should respond successfully');

    // Read streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }
    }

    // Assert: Skill detection should have occurred
    // Note: This is a basic smoke test - more detailed assertions require
    // inspecting logs or adding test-only endpoints
    console.log('[Integration Test] Chat response received:', fullResponse.substring(0, 200));
    assertEquals(fullResponse.length > 0, true, 'Should receive response content');
  }
});

Deno.test({
  name: 'Skills Integration - feature flag disables skills system',
  async fn() {
    // This test verifies SKILLS_ENABLED=false works correctly
    // For now, this is a placeholder - full implementation requires
    // test-specific environment variable control

    console.log('[Integration Test] Feature flag test - TODO: implement with env var control');
    // TODO: Implement when we have test environment variable control
  }
});

Deno.test({
  name: 'Skills Integration - skill detection error does not block chat',
  async fn() {
    // This test verifies graceful degradation when skill system fails
    // For now, this is a placeholder

    console.log('[Integration Test] Graceful degradation test - TODO: implement');
    // TODO: Implement by simulating API failures
  }
});
