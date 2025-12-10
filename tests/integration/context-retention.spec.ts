/**
 * End-to-end integration tests for context retention functionality
 * Tests the complete flow from frontend to backend and back
 */

import { describe, it, expect, beforeEach, afterEach } from "https://deno.land/x/deno@v1.42.1/testing/bdd.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

// Mock or real Supabase client for testing
const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:8080";
const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "test-key";
const supabase = createClient(supabaseUrl, supabaseKey);

describe("Context Retention Integration Tests", () => {
  let testSessionId: string;
  let guestSession: { sessionId: string; saveMessages: any; loadMessages: any };

  beforeEach(async () => {
    // Create a test session
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        title: "Test Context Retention",
        first_message: "Hello, I need help with context testing",
      })
      .select()
      .single();

    if (sessionError) {
      // If we can't create a real session, use a mock one
      testSessionId = crypto.randomUUID();
    } else {
      testSessionId = session.id;
    }

    // Mock guest session
    guestSession = {
      sessionId: crypto.randomUUID(),
      saveMessages: (messages: any[]) => {
        // Simulate localStorage persistence
        console.log("Saving guest messages:", messages);
      },
      loadMessages: () => {
        // Return empty array for fresh session
        return [];
      },
    };
  });

  afterEach(async () => {
    // Clean up test data
    if (testSessionId && testSessionId !== crypto.randomUUID()) {
      await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", testSessionId);

      await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", testSessionId);
    }
  });

  describe("Pronoun Resolution Tests", () => {
    it("should resolve 'it' references correctly", async () => {
      // Simulate the conversation flow
      const conversation = [
        {
          role: "user",
          content: "Create a React component for a Christmas event",
        },
        {
          role: "assistant",
          expectedToContain: ["component", "Christmas", "event"],
        },
        {
          role: "user",
          content: "Add decorations to it",
        },
        {
          role: "assistant",
          expectedToContain: ["decorations", "Christmas", "component"],
        },
      ];

      // Test the first message
      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).toBeDefined();

      // Verify the assistant understands and creates a component
      const componentResponse1 = findExpectedContent(response1, conversation[1].expectedToContain);
      expect(componentResponse1).toBeTruthy();

      // Test the pronoun reference
      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).toBeDefined();

      // Verify the assistant correctly resolves "it" to the component
      const pronounResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(pronounResponse).toBeTruthy();
    });

    it("should resolve 'there' references to events", async () => {
      const conversation = [
        {
          role: "user",
          content: "Tell me about the Garland Christmas event",
        },
        {
          role: "assistant",
          expectedToContain: ["Garland", "Christmas", "event"],
        },
        {
          role: "user",
          content: "What activities are there?",
        },
        {
          role: "assistant",
          expectedToContain: ["activities", "Garland", "Christmas"],
        },
      ];

      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).toBeDefined();

      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).toBeDefined();

      const activitiesResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(activitiesResponse).toBeTruthy();
    });

    it("should resolve 'they' references to groups", async () => {
      const conversation = [
        {
          role: "user",
          content: "I need to organize volunteers and vendors for the event",
        },
        {
          role: "assistant",
          expectedToContain: ["volunteers", "vendors", "organize"],
        },
        {
          role: "user",
          content: "How do I contact them?",
        },
        {
          role: "assistant",
          expectedToContain: ["volunteers", "vendors", "contact"],
        },
      ];

      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).toBeDefined();

      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).Defined();

      const contactResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(contactResponse).toBeTruthy();
    });
  });

  describe("Location/Event Reference Tests", () => {
    it("should maintain event context across location references", async () => {
      const conversation = [
        {
          role: "user",
          content: "Describe the Garland Community Center event",
        },
        {
          role: "assistant",
          expectedToContain: ["Garland", "Community", "Center"],
        },
        {
          role: "user",
          content: "How do I get there?",
        },
        {
          role: "assistant",
          expectedToContain: ["Garland", "Community", "Center", "directions"],
        },
      ];

      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).toBeDefined();

      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).toBeDefined();

      const directionsResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(directionsResponse).toBeTruthy();
    });

    it("should distinguish between multiple events", async () => {
      const conversation = [
        {
          role: "user",
          content: "I'm organizing both the Garland Christmas event and the New Year's party",
        },
        {
          role: "assistant",
          expectedToContain: ["Garland", "Christmas", "New Year's", "organizing"],
        },
        {
          role: "user",
          content: "Which one has more space?",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "New Year's", "space", "capacity"],
        },
      ];

      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).toBeDefined();

      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).toBeDefined();

      const spaceResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(spaceResponse).toBeTruthy();
    });
  });

  describe("Multi-turn Conversation Tests", () => {
    it("should maintain context after topic switch and return", async () => {
      const conversation = [
        {
          role: "user",
          content: "Let's talk about React components",
        },
        {
          role: "assistant",
          expectedToContain: ["React", "components"],
        },
        {
          role: "user",
          content: "Show me a button example",
        },
        {
          role: "assistant",
          expectedToContain: ["button", "React", "component"],
        },
        {
          role: "user",
          content: "Now back to the Christmas event",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "event"],
        },
        {
          role: "user",
          content: "What about parking?",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "event", "parking"],
        },
      ];

      // Send first part of conversation
      await sendMessage(testSessionId, conversation[0].content);
      await sendMessage(testSessionId, conversation[2].content);

      // Switch topic and then return
      const response5 = await sendMessage(testSessionId, conversation[4].content);
      expect(response5).toBeDefined();

      const backToChristmas = findExpectedContent(response5, conversation[5].expectedToContain);
      expect(backToChristmas).toBeTruthy();

      // Test that context is maintained
      const response7 = await sendMessage(testSessionId, conversation[6].content);
      expect(response7).Defined();

      const parkingResponse = findExpectedContent(response7, conversation[7].expectedToContain);
      expect(parkingResponse).toBeTruthy();
    });

    it("should maintain deep context chain", async () => {
      const conversation = [
        {
          role: "user",
          content: "I'm planning a Christmas event",
        },
        {
          role: "user",
          content: "It will be at Garland Community Center",
        },
        {
          role: "user",
          content: "We need Santa and hot chocolate",
        },
        {
          role: "user",
          content: "Also need ornament making stations",
        },
        {
          role: "user",
          content: "What about parking?",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "Garland", "parking"],
        },
      ];

      // Send all context messages
      for (let i = 0; i < conversation.length - 1; i++) {
        await sendMessage(testSessionId, conversation[i].content);
      }

      // Test deep reference
      const response = await sendMessage(testSessionId, conversation[4].content);
      expect(response).Defined();

      const parkingResponse = findExpectedContent(response, conversation[5].expectedToContain);
      expect(parkingResponse).toBeTruthy();
    });
  });

  describe("Mixed Artifact + Chat Tests", () => {
    it("should maintain artifact context in subsequent conversations", async () => {
      const conversation = [
        {
          role: "user",
          content: "Create a todo list for the Christmas event",
        },
        {
          role: "assistant",
          artifactType: "react",
          expectedToContain: ["todo", "list", "Christmas", "event"],
        },
        {
          role: "user",
          content: "Add more items to it",
        },
        {
          role: "assistant",
          expectedToContain: ["todo", "list", "items", "add"],
        },
      ];

      // Create artifact
      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).Defined();

      // Reference artifact
      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).Defined();

      const updatedTodo = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(updatedTodo).toBeTruthy();
    });

    it("should mix artifact creation with conversation context", async () => {
      const conversation = [
        {
          role: "user",
          content: "I need a countdown timer for the event",
        },
        {
          role: "assistant",
          artifactType: "react",
          expectedToContain: ["countdown", "timer", "event"],
        },
        {
          role: "user",
          content: "What about the decorations we discussed?",
        },
        {
          role: "assistant",
          expectedToContain: ["decorations", "countdown", "timer"],
        },
      ];

      // Create artifact first
      await sendMessage(testSessionId, conversation[0].content);

      // Then reference both artifact and conversation
      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).Defined();

      const mixedContext = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(mixedContext).toBeTruthy();
    });
  });

  describe("Guest vs Authenticated User Tests", () => {
    it("should maintain context for guest users", async () => {
      const conversation = [
        {
          role: "user",
          content: "I'm planning a Christmas event as a guest",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "event", "guest"],
        },
        {
          role: "user",
          content: "What activities should we have there?",
        },
        {
          role: "assistant",
          expectedToContain: ["activities", "Christmas", "event"],
        },
      ];

      // Simulate guest session
      let messages: any[] = [];
      const mockGuestSession = {
        sessionId: crypto.randomUUID(),
        saveMessages: (newMessages: any[]) => { messages = newMessages; },
        loadMessages: () => messages,
      };

      const response1 = await sendMessage(mockGuestSession.sessionId, conversation[0].content, true, mockGuestSession);
      expect(response1).Defined();

      const response2 = await sendMessage(mockGuestSession.sessionId, conversation[2].content, true, mockGuestSession);
      expect(response2).Defined();

      const guestResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(guestResponse).toBeTruthy();
    });

    it("should maintain context across authenticated sessions", async () => {
      // This would be harder to test without a real user session
      // but we can verify the API structure
      const initialResponse = await sendMessage(testSessionId, "I'm planning a Christmas event");
      expect(initialResponse).Defined();

      // Fetch conversation history
      const { data: history, error: fetchError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", testSessionId)
        .order("created_at", { ascending: true });

      expect(fetchError).toBeNull();
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle ambiguous references by asking for clarification", async () => {
      const conversation = [
        {
          role: "user",
          content: "I have two events: Christmas and New Year's",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "New Year's", "which"],
        },
        {
          role: "user",
          content: "Which one is better?",
        },
        {
          role: "assistant",
          expectedToContain: ["Christmas", "New Year's", "clarify", "specify"],
        },
      ];

      const response1 = await sendMessage(testSessionId, conversation[0].content);
      expect(response1).Defined();

      const response2 = await sendMessage(testSessionId, conversation[2].content);
      expect(response2).Defined();

      const clarificationResponse = findExpectedContent(response2, conversation[3].expectedToContain);
      expect(clarificationResponse).toBeTruthy();
    });

    it("should handle contradictory information updates", async () => {
      const conversation = [
        {
          role: "user",
          content: "The event is on December 25th",
        },
        {
          role: "assistant",
          expectedToContain: ["December", "25th"],
        },
        {
          role: "user",
          content: "No, I meant December 31st",
        },
        {
          role: "assistant",
          expectedToContain: ["December", "31st"],
        },
        {
          role: "user",
          content: "What about the venue for it?",
        },
        {
          role: "assistant",
          expectedToContain: ["December", "31st", "venue"],
        },
      ];

      // Send contradictory information
      await sendMessage(testSessionId, conversation[0].content);
      await sendMessage(testSessionId, conversation[2].content);

      // Test that most recent information is used
      const response3 = await sendMessage(testSessionId, conversation[4].content);
      expect(response3).Defined();

      const updatedResponse = findExpectedContent(response3, conversation[5].expectedToContain);
      expect(updatedResponse).toBeTruthy();
    });
  });

  // Helper functions
  async function sendMessage(
    sessionId: string,
    content: string,
    isGuest = false,
    guestSession?: any
  ): Promise<string> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": isGuest ? "" : `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Hello, I need help with context testing" },
            { role: "assistant", content: "I'm here to help with your context testing needs." },
            { role: "user", content },
          ],
          sessionId,
          isGuest,
          guestSession,
          includeReasoning: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.content || data.message || "";
    } catch (error) {
      console.error("Error sending message:", error);
      return "";
    }
  }

  function findExpectedContent(response: string, expectedTerms: string[]): boolean {
    if (!response) return false;

    const responseLower = response.toLowerCase();
    return expectedTerms.every(term => responseLower.includes(term.toLowerCase()));
  }
});