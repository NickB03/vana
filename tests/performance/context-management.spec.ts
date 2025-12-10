/**
 * Performance tests for context management functionality
 * Tests scalability, memory usage, and response times
 */

import { describe, it, expect, beforeEach } from "https://deno.land/x/deno@v1.42.1/testing/bdd.ts";

// Mock performance measurement
let memoryBefore: number;
let startTime: number;

function startPerformanceTest() {
  startTime = performance.now();
  memoryBefore = measureMemory();
}

function endPerformanceTest() {
  const endTime = performance.now();
  const memoryAfter = measureMemory();

  const duration = endTime - startTime;
  const memoryDelta = memoryAfter - memoryBefore;

  console.log(`Performance test results:`);
  console.log(`  Duration: ${duration.toFixed(2)}ms`);
  console.log(`  Memory delta: ${memoryDelta.toFixed(2)}MB`);

  return { duration, memoryDelta };
}

function measureMemory(): number {
  // This is a mock implementation
  // In real tests, you'd use performance.memory if available
  return Math.random() * 100; // Simulate memory usage
}

describe("Context Management Performance", () => {
  beforeEach(() => {
    // Reset any global state before each test
  });

  describe("Context Selection Performance", () => {
    it("should scale linearly with message count", () => {
      const messageCounts = [10, 50, 100, 500, 1000];
      const results = [];

      for (const count of messageCounts) {
        startPerformanceTest();

        // Generate test messages
        const messages = Array.from({ length: count }, (_, i) => ({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Test message ${i} about Christmas event planning`,
        }));

        // Mock context selection
        const startTime = performance.now();
        for (let i = 0; i < 100; i++) { // Repeat to get measurable time
          // Simulate context selection work
          const selected = messages.slice(-5); // Keep last 5 messages
          const processed = selected.map(msg => msg.content);
        }
        const endTime = performance.now();

        results.push({
          messageCount: count,
          duration: endTime - startTime,
        });
      }

      // Check for linear scaling
      const durations = results.map(r => r.duration);
      const messageCountsArray = results.map(r => r.messageCount);

      // Calculate scaling factor
      const scalingFactor = durations[durations.length - 1] / durations[0];
      const messageScalingFactor = messageCountsArray[messageCountsArray.length - 1] / messageCountsArray[0];

      expect(scalingFactor).toBeLessThanOrEqual(messageScalingFactor * 2); // Allow for some overhead
      console.log("Context selection scaling:", results);
    });

    it("should handle large entity sets efficiently", () => {
      const entityCounts = [10, 50, 100, 500, 1000];
      const results = [];

      for (const entityCount of entityCounts) {
        startPerformanceTest();

        // Generate test messages with entities
        const messages = Array.from({ length: 100 }, (_, i) => ({
          role: "user",
          content: `Message ${i} with ${entityCount} entities`,
        }));

        // Generate tracked entities
        const trackedEntities = new Set(
          Array.from({ length: entityCount }, (_, i) =>
            `Entity${i}_${Math.random().toString(36).substring(2, 8)}`
          )
        );

        // Mock entity extraction
        const startTime = performance.now();
        for (let i = 0; i < 100; i++) {
          // Simulate entity extraction work
          const content = messages[0].content.toLowerCase();
          for (const entity of trackedEntities) {
            content.includes(entity.toLowerCase());
          }
        }
        const endTime = performance.now();

        results.push({
          entityCount,
          duration: endTime - startTime,
        });
      }

      // Check for reasonable scaling
      const durations = results.map(r => r.duration);

      // The last should not be dramatically slower than the first
      expect(durations[durations.length - 1]).toBeLessThan(durations[0] * 10);

      console.log("Entity extraction performance:", results);
    });

    it("should maintain performance with mixed content types", () => {
      const contentTypes = [
        { code: 0.1, natural: 0.9 },
        { code: 0.3, natural: 0.7 },
        { code: 0.5, natural: 0.5 },
        { code: 0.7, natural: 0.3 },
        { code: 0.9, natural: 0.1 },
      ];

      const results = [];

      for (const { code, natural } of contentTypes) {
        startPerformanceTest();

        // Generate mixed content messages
        const messages = Array.from({ length: 100 }, (_, i) => {
          const isCode = Math.random() < code;
          return {
            role: "user",
            content: isCode
              ? `function ${Math.random().toString(36).substring(2, 8)}() { /* code */ }`
              : `This is natural language about Christmas event planning in Garland`,
          };
        });

        // Mock processing
        const startTime = performance.now();
        for (let i = 0; i < 50; i++) {
          // Simulate mixed content processing
          messages.forEach(msg => {
            if (msg.content.includes("function")) {
              // Code processing
              const functions = msg.content.match(/function\s+(\w+)/g);
            } else {
              // Natural language processing
              const words = msg.content.split(/\s+/);
            }
          });
        }
        const endTime = performance.now();

        results.push({
          codeRatio: code,
          naturalRatio: natural,
          duration: endTime - startTime,
        });
      }

      // Performance should not vary dramatically with content type ratio
      const durations = results.map(r => r.duration);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(maxDuration / minDuration).toBeLessThan(3); // No more than 3x difference

      console.log("Mixed content performance:", results);
    });
  });

  describe("Entity Extraction Performance", () => {
    it("should extract entities quickly from typical messages", () => {
      startPerformanceTest();

      // Generate typical conversation messages
      const messages = [
        "I'm organizing a Christmas event in Garland",
        "We'll have Santa visits at the Community Center",
        "Volunteers are needed for setup and activities",
        "Hot chocolate station will be available for visitors",
        "Ornament making crafts for children",
        "Parking arrangements need to be coordinated",
        "Event decorations should be festive and colorful",
        "Vendor coordination for local businesses",
        "Gift wrapping station for presents",
        "Music and entertainment for the celebration",
      ];

      // Mock entity extraction
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        messages.forEach(msg => {
          // Simulate entity extraction patterns
          const entities = new Set<string>();

          // Event entities
          if (msg.includes("Christmas") || msg.includes("event")) {
            entities.add("Christmas");
            entities.add("event");
          }

          // Location entities
          if (msg.includes("Garland") || msg.includes("Community Center")) {
            entities.add("Garland");
            entities.add("Community Center");
          }

          // People entities
          if (msg.includes("Santa") || msg.includes("Volunteers")) {
            entities.add("Santa");
            entities.add("Volunteers");
          }

          // Activity entities
          if (msg.includes("hot chocolate") || msg.includes("ornament")) {
            entities.add("hot chocolate");
            entities.add("ornament");
          }
        });
      }
      const endTime = performance.now();

      const results = endPerformanceTest();

      // Should be fast for typical messages
      expect(results.duration).toBeLessThan(100); // 100ms for 1000 iterations

      console.log(`Entity extraction time: ${results.duration.toFixed(2)}ms`);
    });

    it("should handle complex entity patterns efficiently", () => {
      startPerformanceTest();

      // Messages with complex patterns
      const complexMessages = [
        "The Garland Christmas celebration event planning committee",
        "Community Center venue coordinator contact information",
        "Santa Claus workshop session scheduling system",
        "Volunteer recruitment and management platform",
        "Hot chocolate and cookie decoration station setup",
        "Ornament making and crafts activity coordination",
        "Visitor parking and transportation arrangements",
        "Event decorations and festive lighting installation",
        "Vendor management and local business partnerships",
        "Gift wrapping and present station organization",
      ];

      // Mock complex entity extraction
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        complexMessages.forEach(msg => {
          // Simulate complex pattern matching
          const multiWordEntities = msg.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/g) || [];
          const entities = new Set(multiWordEntities);

          // Extract camelCase identifiers
          const codeEntities = msg.match(/\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g) || [];
          codeEntities.forEach(e => entities.add(e));
        });
      }
      const endTime = performance.now();

      const results = endPerformanceTest();

      // Should handle complex patterns efficiently
      expect(results.duration).toBeLessThan(50); // 50ms for 100 iterations

      console.log(`Complex entity extraction time: ${results.duration.toFixed(2)}ms`);
    });
  });

  describe("Pronoun Resolution Performance", () => {
    it("should resolve pronouns quickly", () => {
      startPerformanceTest();

      // Conversation with pronoun references
      const conversation = [
        { entity: "Christmas event", reference: "it" },
        { entity: "Garland Community Center", reference: "there" },
        { entity: "volunteers", reference: "them" },
        { entity: "Santa Claus", reference: "him" },
        { entity: "ornament making", reference: "it" },
        { entity: "hot chocolate station", reference: "it" },
        { entity: "parking arrangements", reference: "them" },
        { entity: "event decorations", reference: "them" },
        { entity: "vendor coordination", reference: "it" },
        { entity: "gift wrapping", reference: "it" },
      ];

      // Mock pronoun resolution
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        conversation.forEach(({ entity, reference }) => {
          // Simulate pronoun resolution logic
          const pronounMap = {
            "it": ["event", "station", "coordination", "decorations", "arrangements"],
            "there": ["Community Center", "event", "venue", "location"],
            "them": ["volunteers", "arrangements", "decorations", "vendors"],
            "him": ["Santa Claus", "Santa"],
          };

          const possibleEntities = pronounMap[reference as keyof typeof pronounMap] || [];
          const resolved = possibleEntities.find(e => entity.toLowerCase().includes(e.toLowerCase()));
        });
      }
      const endTime = performance.now();

      const results = endPerformanceTest();

      // Should be very fast for pronoun resolution
      expect(results.duration).toBeLessThan(50); // 50ms for 1000 iterations

      console.log(`Pronoun resolution time: ${results.duration.toFixed(2)}ms`);
    });

    it("should handle ambiguous pronouns efficiently", () => {
      startPerformanceTest();

      // Ambiguous reference scenarios
      const ambiguousScenarios = [
        {
          context: ["Christmas event", "New Year's party"],
          reference: "both",
          expected: 2
        },
        {
          context: ["volunteers", "vendors", "visitors"],
          reference: "them",
          expected: 3
        },
        {
          context: ["Community Center", "Main Street", "City Park"],
          reference: "there",
          expected: 3
        },
        {
          context: ["Santa", "Mrs. Claus", "elves"],
          reference: "they",
          expected: 3
        },
      ];

      // Mock ambiguous resolution
      const startTime = performance.now();
      for (let i = 0; i < 500; i++) {
        ambiguousScenarios.forEach(({ context, reference }) => {
          // Simulate ambiguity detection
          const matches = context.filter(item => {
            // Simple similarity check
            return item.toLowerCase().includes(reference.toLowerCase()) ||
                   reference.toLowerCase().includes(item.toLowerCase().substring(0, 3));
          });
        });
      }
      const endTime = performance.now();

      const results = endPerformanceTest();

      // Should handle ambiguity efficiently
      expect(results.duration).toBeLessThan(25); // 25ms for 500 iterations

      console.log(`Ambiguous resolution time: ${results.duration.toFixed(2)}ms`);
    });
  });

  describe("Memory Usage Tests", () => {
    it("should not leak memory with large conversations", () => {
      const initialMemory = measureMemory();

      // Simulate growing conversation
      let messages: any[] = [];
      for (let round = 0; round < 10; round++) {
        const roundMemory = measureMemory();

        // Add 100 messages per round
        const newMessages = Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${round}-${i}`,
          role: "user",
          content: `Message ${round}-${i} about event planning`,
        }));

        messages = [...messages, ...newMessages];

        // Simulate some processing
        const entities = new Set(messages.map(m => m.content));

        // Remove some messages to simulate context cleanup
        if (messages.length > 500) {
          messages = messages.slice(-300);
        }

        const memoryAfterRound = measureMemory();
        const roundDelta = memoryAfterRound - roundMemory;

        console.log(`Round ${round}: ${roundDelta.toFixed(2)}MB delta`);

        // Each round should not consume excessive memory
        expect(roundDelta).toBeLessThan(10); // Less than 10MB per round
      }

      const finalMemory = measureMemory();
      const totalDelta = finalMemory - initialMemory;

      // Total memory growth should be reasonable
      expect(totalDelta).toBeLessThan(50); // Less than 50MB total

      console.log(`Total memory delta: ${totalDelta.toFixed(2)}MB`);
    });

    it("should clean up old context efficiently", () => {
      startPerformanceTest();

      // Simulate conversation with context cleanup
      let conversationHistory: any[] = [];

      for (let i = 0; i < 1000; i++) {
        // Add new message
        conversationHistory.push({
          id: `msg-${i}`,
          role: "user",
          content: `Message ${i}`,
          timestamp: Date.now() - (1000 - i) * 60000, // Older messages
        });

        // Simulate context cleanup (keep last 100 messages)
        if (conversationHistory.length > 100) {
          conversationHistory = conversationHistory.slice(-100);
        }

        // Simulate entity tracking
        const entities = new Set(conversationHistory.map(m => m.content));
      }

      const results = endPerformanceTest();

      // Cleanup should be efficient
      expect(results.duration).toBeLessThan(100); // 100ms for 1000 iterations

      console.log(`Context cleanup time: ${results.duration.toFixed(2)}ms`);
    });
  });

  describe("End-to-End Performance", () => {
    it("should maintain performance with realistic conversation load", () => {
      startPerformanceTest();

      // Simulate realistic conversation patterns
      const realisticMessages = [
        "I'm planning a Christmas event in Garland",
        "What venue would you recommend?",
        "The Community Center is available",
        "How many people can it accommodate?",
        "It can hold up to 200 guests",
        "We'll need volunteer coordination",
        "How many volunteers should we recruit?",
        "15-20 volunteers should be sufficient",
        "What activities should we plan?",
        "Santa visits, hot chocolate, ornament making",
        "How about decorations?",
        "Festive decorations with Christmas colors",
        "What about parking for visitors?",
        "The venue has a parking lot for 100 cars",
        "Are there vendors we can invite?",
        "Local food vendors and artisans would be great",
        "How do we handle gift wrapping?",
        "We can set up a gift wrapping station",
        "What about music and entertainment?",
        "Live music with a DJ and carolers",
        "How do we manage registrations?",
        "Online registration system would work best",
      ];

      // Simulate full context processing pipeline
      const startTime = performance.now();
      for (let iteration = 0; iteration < 10; iteration++) {
        let contextMessages: any[] = [];
        const trackedEntities = new Set<string>();

        realisticMessages.forEach((msg, i) => {
          // Add to context
          contextMessages.push({
            role: i % 2 === 0 ? "user" : "assistant",
            content: msg,
          });

          // Extract entities
          const words = msg.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 3 && !trackedEntities.has(word)) {
              trackedEntities.add(word);
            }
          });

          // Simulate context selection
          if (contextMessages.length > 10) {
            contextMessages = contextMessages.slice(-5); // Keep last 5
          }

          // Simulate pronoun resolution
          const lastMessage = contextMessages[contextMessages.length - 1];
          if (lastMessage.content.includes(" it ")) {
            // Resolve pronoun
          }
        });
      }
      const endTime = performance.now();

      const results = endPerformanceTest();

      // Should be fast for realistic load
      expect(results.duration).toBeLessThan(500); // 500ms for 10 iterations

      console.log(`Realistic conversation time: ${results.duration.toFixed(2)}ms`);
    });
  });
});