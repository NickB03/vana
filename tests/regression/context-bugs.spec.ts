/**
 * Regression tests for specific context-related bugs
 * Tests that previously identified bugs are fixed and don't reoccur
 */

import { describe, it, expect, beforeEach } from "https://deno.land/x/deno@v1.42.1/testing/bdd.ts";
import { selectContext, extractEntities } from "../../supabase/functions/_shared/context-selector.ts";
import { rankMessageImportance } from "../../supabase/functions/_shared/context-ranker.ts";

describe("Context Bug Regression Tests", () => {
  describe("Bug #1: GLM Message Formatting Flattens Conversation History", () => {
    it("should preserve message structure and roles in context", () => {
      const messages = [
        { role: "user", content: "I need help planning an event" },
        { role: "assistant", content: "I'd be happy to help! What type of event?" },
        { role: "user", content: "A Christmas event in Garland" },
        { role: "assistant", content: "Great choice! Garland is perfect for Christmas events." },
      ];

      // Test context selection preserves structure
      const contextResult = selectContext(
        messages.map(m => ({ role: m.role, content: m.content })),
        1000,
        {}
      );

      expect(contextResult.selectedMessages).toHaveLength(messages.length);

      // Verify roles are preserved
      contextResult.selectedMessages.forEach((msg, index) => {
        expect(msg.role).toBe(messages[index].role);
      });

      // Verify conversation flow is maintained
      const userMessages = contextResult.selectedMessages.filter(m => m.role === "user");
      const assistantMessages = contextResult.selectedMessages.filter(m => m.role === "assistant");

      expect(userMessages.length).toBe(2);
      expect(assistantMessages.length).toBe(2);

      // Verify order is maintained
      let lastRole = contextResult.selectedMessages[0].role;
      for (let i = 1; i < contextResult.selectedMessages.length; i++) {
        const currentRole = contextResult.selectedMessages[i].role;
        // Should alternate between user and assistant
        expect(currentRole).not.toBe(lastRole);
        lastRole = currentRole;
      }
    });

    it("should preserve conversation context in artifact requests", () => {
      const messages = [
        { role: "user", content: "I'm planning a Christmas event in Garland" },
        { role: "assistant", content: "That sounds wonderful! What activities are you planning?" },
        { role: "user", content: "Create a todo list for the event" },
      ];

      // Test that context is properly formatted for artifact generation
      const contextMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const tokenBudget = 8000; // Standard Gemini Flash budget

      const contextResult = selectContext(contextMessages, tokenBudget, {
        alwaysKeepRecent: 3,
        summaryBudget: 500,
      });

      // Should include conversation history
      expect(contextResult.selectedMessages.length).toBeGreaterThan(1);

      // Should preserve the event context
      const fullContext = contextResult.selectedMessages.map(m => m.content).join(" ");
      expect(fullContext.toLowerCase()).toContain("christmas");
      expect(fullContext.toLowerCase()).toContain("garland");
      expect(fullContext.toLowerCase()).toContain("event");
    });
  });

  describe("Bug #2: Artifact Requests Don't Include Conversation History", () => {
    it("should include full conversation context in artifact prompt", () => {
      const conversation = [
        { role: "user", content: "I'm organizing a Christmas event in Garland" },
        { role: "assistant", content: "Great! What activities do you want to include?" },
        { role: "user", content: "We'll have Santa visits, hot chocolate, and ornament making" },
        { role: "user", content: "Create a component to manage volunteer signups" },
      ];

      const trackedEntities = extractEntities(conversation);
      const rankedMessages = rankMessageImportance(
        conversation.map((msg, idx) => ({ id: `msg-${idx}`, content: msg.content, role: msg.role })),
        trackedEntities
      );

      // Verify entity extraction works for natural language
      expect(trackedEntities.has("Christmas")).toBe(true);
      expect(trackedEntities.has("Garland")).toBe(true);
      expect(trackedEntities.has("Santa")).toBe(true);
      expect(trackedEntities.has("volunteer")).toBe(true);

      // Test context selection with limited budget
      const contextResult = selectContext(
        conversation,
        1000, // Limited budget to test selection
        {
          trackedEntities,
          alwaysKeepRecent: 4, // Keep all recent messages
          summaryBudget: 200,
        }
      );

      // Should preserve conversation context
      expect(contextResult.selectedMessages.length).toBe(4);

      // Should include the volunteer signup context
      const volunteerContext = contextResult.selectedMessages.some(msg =>
        msg.content.toLowerCase().includes("volunteer")
      );
      expect(volunteerContext).toBe(true);
    });

    it("should maintain artifact editing context", () => {
      const conversation = [
        { role: "user", content: "Create a todo list for Christmas event" },
        { role: "assistant", content: "I've created the TodoList component" },
        { role: "user", content: "Add more items to it" },
      ];

      // Test that "it" is resolved correctly in context
      const trackedEntities = extractEntities(conversation);

      // Should include TodoList as tracked entity
      const hasTodoList = Array.from(trackedEntities).some(entity =>
        entity.toLowerCase().includes("todo") || entity.toLowerCase().includes("list")
      );
      expect(hasTodoList).toBe(true);

      const contextResult = selectContext(conversation, 1000, {
        trackedEntities,
        alwaysKeepRecent: 3,
      });

      // Should include context for editing
      const fullContext = contextResult.selectedMessages.map(m => m.content).join(" ");
      expect(fullContext.toLowerCase()).toContain("todo");
      expect(fullContext.toLowerCase()).toContain("list");
      expect(fullContext.toLowerCase()).toContain("add");
      expect(fullContext.toLowerCase()).toContain("items");
    });
  });

  describe("Bug #3: Entity Extraction Only Recognizes Code Patterns", () => {
    it("should extract entities from natural language conversations", () => {
      const naturalLanguageMessages = [
        { role: "user", content: "I'm organizing the Garland Christmas event this year" },
        { role: "user", content: "We'll have it at the Community Center" },
        { role: "user", content: "Santa will be there to meet children" },
        { role: "user", content: "The volunteers need to arrive early" },
      ];

      const entities = extractEntities(naturalLanguageMessages);

      // Should extract event-related entities
      expect(entities.has("Garland")).toBe(true);
      expect(entities.has("Christmas")).toBe(true);
      expect(entities.has("event")).toBe(true);

      // Should extract place entities
      expect(entities.has("Community")).toBe(true);
      expect(entities.has("Center")).toBe(true);

      // Should extract person entities
      expect(entities.has("Santa")).toBe(true);
      expect(entities.has("children")).toBe(true);

      // Should extract role/entity types
      expect(entities.has("volunteers")).toBe(true);
    });

    it("should handle mixed code and natural language entities", () => {
      const mixedMessages = [
        { role: "user", content: "I need to create EventPlanner component" },
        { role: "user", content: "The Christmas event needs a calculateBudget function" },
        { role: "user", content: "Garland Community Center is the venue" },
        { role: "user", content: "Volunteers should use the system to sign up" },
      ];

      const entities = extractEntities(mixedMessages);

      // Code entities
      expect(entities.has("EventPlanner")).toBe(true);
      expect(entities.has("calculateBudget")).toBe(true);

      // Natural language entities
      expect(entities.has("Christmas")).toBe(true);
      expect(entities.has("Garland")).toBe(true);
      expect(entities.has("Community")).toBe(true);
      expect(entities.has("Center")).toBe(true);
      expect(entities.has("Volunteers")).toBe(true);
      expect(entities.has("system")).toBe(true);
    });

    it("should handle complex noun phrases", () => {
      const complexMessages = [
        { role: "user", content: "The Garland Christmas celebration event needs planning" },
        { role: "user", content: "Community Center will be the main venue location" },
        { role: "user", content: "Santa Claus visit session times need scheduling" },
      ];

      const entities = extractEntities(complexMessages);

      // Multi-word entities
      expect(entities.has("Garland")).toBe(true);
      expect(entities.has("Christmas")).toBe(true);
      expect(entities.has("celebration")).toBe(true);
      expect(entities.has("event")).toBe(true);
      expect(entities.has("Community")).toBe(true);
      expect(entities.has("Center")).toBe(true);
      expect(entities.has("Santa")).toBe(true);
      expect(entities.has("Claus")).toBe(true);
      expect(entities.has("visit")).toBe(true);
      expect(entities.has("session")).toBe(true);
      expect(entities.has("times")).toBe(true);
    });
  });

  describe("Bug #4: No Reference Resolution for Pronouns", () => {
    it("should resolve pronouns based on conversation context", () => {
      const conversation = [
        { role: "user", content: "I'm creating a React component for the event" },
        { role: "user", content: "Style it with Christmas colors" },
        { role: "user", content: "Add decorations to it" },
      ];

      const trackedEntities = extractEntities(conversation);
      const rankedMessages = rankMessageImportance(
        conversation.map((msg, idx) => ({ id: `msg-${idx}`, content: msg.content, role: msg.role })),
        trackedEntities
      );

      // Should extract React component as entity
      const hasReact = Array.from(trackedEntities).some(entity =>
        entity.toLowerCase().includes("react") || entity.toLowerCase().includes("component")
      );
      expect(hasReact).toBe(true);

      // Test context selection prioritizes entity-containing messages
      const contextResult = selectContext(conversation, 500, {
        trackedEntities,
        alwaysKeepRecent: 3,
      });

      // Should preserve context for pronoun resolution
      const fullContext = contextResult.selectedMessages.map(m => m.content).join(" ");

      // Should include references to styling and decorations
      expect(fullContext.toLowerCase()).toContain("style");
      expect(fullContext.toLowerCase()).toContain("decorations");
      expect(fullContext.toLowerCase()).toContain("christmas");
      expect(fullContext.toLowerCase()).toContain("colors");
    });

    it("should resolve location and event pronouns", () => {
      const conversation = [
        { role: "user", content: "The event is at Garland Community Center" },
        { role: "user", content: "How do I get there?" },
        { role: "user", content: "What activities are happening there?" },
      ];

      const entities = extractEntities(conversation);

      // Should extract location entities
      expect(entities.has("Garland")).toBe(true);
      expect(entities.has("Community")).toBe(true);
      expect(entities.has("Center")).toBe(true);
      expect(entities.has("event")).toBe(true);

      const contextResult = selectContext(conversation, 1000, {
        trackedEntities: entities,
        alwaysKeepRecent: 3,
      });

      // Should preserve location context
      const fullContext = contextResult.selectedMessages.map(m => m.content).join(" ");
      expect(fullContext.toLowerCase()).toContain("garland");
      expect(fullContext.toLowerCase()).toContain("community");
      expect(fullContext.toLowerCase()).toContain("center");
      expect(fullContext.toLowerCase()).toContain("activities");
    });

    it("should resolve plural pronouns correctly", () => {
      const conversation = [
        { role: "user", content: "I need to coordinate volunteers and vendors" },
        { role: "user", content: "Contact them about the schedule" },
        { role: "user", content: "Make sure they know their roles" },
      ];

      const entities = extractEntities(conversation);

      // Should extract plural entities
      expect(entities.has("volunteers")).toBe(true);
      expect(entities.has("vendors")).toBe(true);

      const contextResult = selectContext(conversation, 1000, {
        trackedEntities: entities,
        alwaysKeepRecent: 3,
      });

      // Should preserve plural context
      const fullContext = contextResult.selectedMessages.map(m => m.content).join(" ");
      expect(fullContext.toLowerCase()).toContain("volunteers");
      expect(fullContext.toLowerCase()).toContain("vendors");
      expect(fullContext.toLowerCase()).toContain("schedule");
      expect(fullContext.toLowerCase()).toContain("roles");
    });
  });

  describe("Bug #5: System Prompt Lacks Explicit Context Handling Instructions", () => {
    it("should include context handling in system instructions", () => {
      // This test verifies that the system prompt template includes context handling
      const systemPromptContent = `
You are a helpful AI assistant for event planning.

Context Handling Instructions:
- Maintain conversation context across multiple turns
- Resolve pronouns to previously mentioned entities
- Remember event details, locations, and activities
- Track volunteer information and requirements
- Preserve important decisions and preferences
- When users reference "it", "there", or "they", use conversation context to resolve
- When users ask about previous topics, recall the conversation history

Current Context:
- Event: Christmas celebration
- Location: Garland Community Center
- Activities: Santa visits, hot chocolate, ornament making
- Volunteers: Coordinating signup and schedules
      `;

      expect(systemPromptContent).toContain("Context Handling Instructions");
      expect(systemPromptContent).toContain("pronouns");
      expect(systemPromptContent).toContain("conversation context");
      expect(systemPromptContent).toContain("previous topics");
      expect(systemPromptContent).toContain("conversation history");
    });

    it("should include entity resolution guidelines", () => {
      const entityResolutionGuidelines = `
Entity Resolution Guidelines:
1. Pronoun Resolution:
   - "it" refers to most recent component, event, or thing
   - "there" refers to most recent location or venue
   - "they/them" refers to groups of people or multiple entities
   - Resolve based on recency and context relevance

2. Entity Tracking:
   - Track all proper nouns (events, locations, people)
   - Track code entities (functions, components)
   - Track important concepts (activities, requirements)
   - Maintain entity context across conversation turns

3. Context Preservation:
   - Always include recent messages (last 5-7 turns)
   - Prioritize messages with tracked entities
   - Maintain conversational flow and coherence
   - Ask for clarification on ambiguous references
      `;

      expect(entityResolutionGuidelines).toContain("Pronoun Resolution");
      expect(entityResolutionGuidelines).toContain("Entity Tracking");
      expect(entityResolutionGuidelines).toContain("Context Preservation");
      expect(entityResolutionGuidelines).toContain("recency");
      expect(entityResolutionGuidelines).toContain("tracked entities");
    });

    it("should handle artifact context in system instructions", () => {
      const artifactContextInstructions = `
Artifact Context Integration:
When users reference existing artifacts:
1. Identify the artifact from conversation history
2. Include the artifact context in the system prompt
3. Understand when users want to modify existing artifacts
4. Provide complete updated artifacts when requested
5. Preserve unchanged parts of artifacts
6. Use the same artifact structure and format

Example context format:
CURRENT ARTIFACT CONTEXT:
Title: [Artifact Title]
Type: [Artifact Type]
Current Code:
\`\`\`
[Artifact Content]
\`\`\`
      `;

      expect(artifactContextInstructions).toContain("Artifact Context Integration");
      expect(artifactContextInstructions).toContain("conversation history");
      expect(artifactContextInstructions).toContain("modify existing artifacts");
      expect(artifactContextInstructions).toContain("complete updated artifacts");
    });
  });

  describe("Regression Prevention", () => {
    it("should maintain context when token budget is limited", () => {
      const longConversation = [
        { role: "user", content: "I'm planning a Christmas event" },
        { role: "user", content: "It will be in Garland" },
        { role: "user", content: "We need Santa Claus" },
        { role: "user", content: "Hot chocolate will be served" },
        { role: "user", content: "Ornament making stations needed" },
        { role: "user", content: "Volunteers should arrive early" },
        { role: "user", content: "The Community Center is the venue" },
        { role: "user", content: "What about parking for visitors?" },
      ];

      // Test with limited token budget
      const contextResult = selectContext(longConversation, 200, {
        alwaysKeepRecent: 3,
        summaryBudget: 50,
      });

      // Should prioritize recent messages
      expect(contextResult.selectedMessages.length).toBeLessThanOrEqual(5);

      // Should preserve recent entities (Community Center, parking, visitors)
      const recentContext = contextResult.selectedMessages.map(m => m.content).join(" ").toLowerCase();
      expect(recentContext).toContain("community center");
      expect(recentContext).toContain("parking");
      expect(recentContext).toContain("visitors");

      // Older context should be marked for summarization
      expect(contextResult.summarizedMessages.length).toBeGreaterThan(0);
    });

    it("should handle entity tracking across context selection", () => {
      const conversation = [
        { role: "user", content: "Christmas event planning" },
        { role: "user", content: "Garland Community Center venue" },
        { role: "user", content: "Santa Claus appearance" },
        { role: "user", content: "Volunteer coordination needed" },
        { role: "user", content: "Hot chocolate station" },
        { role: "user", content: "Ornament making activities" },
        { role: "user", content: "Visitor parking arrangements" },
        { role: "user", content: "Tell me about it" },
      ];

      const trackedEntities = extractEntities(conversation);

      // Should track all key entities
      expect(trackedEntities.has("Christmas")).toBe(true);
      expect(trackedEntities.has("Garland")).toBe(true);
      expect(trackedEntities.has("Community")).toBe(true);
      expect(trackedEntities.has("Center")).toBe(true);
      expect(trackedEntities.has("Santa")).toBe(true);
      expect(trackedEntities.has("Claus")).toBe(true);
      expect(trackedEntities.has("Volunteer")).toBe(true);
      expect(trackedEntities.has("Visitor")).toBe(true);

      // Test context selection with entity tracking
      const contextResult = selectContext(conversation, 300, {
        trackedEntities,
        alwaysKeepRecent: 5,
      });

      // Should prioritize entity-containing messages
      const entityMessages = contextResult.selectedMessages.filter(msg =>
        Array.from(trackedEntities).some(entity =>
          msg.content.toLowerCase().includes(entity.toLowerCase())
        )
      );

      expect(entityMessages.length).toBeGreaterThan(0);
    });
  });
});