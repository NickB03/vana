/**
 * Unit tests for context-ranker.ts
 * Tests message importance ranking, entity detection, and scoring
 */

import { describe, it, expect, beforeEach } from "https://deno.land/x/deno@v1.42.1/testing/bdd.ts";
import {
  rankMessageImportance,
  calculateEntityDensity,
  calculateRecencyScore,
  hasCodeBlock,
  isDecisionPoint,
  isQuestionOrAnswer,
  type ImportanceFactors,
  type RankedMessage,
} from "./context-ranker.ts";

describe("Context Ranker", () => {
  let messages: Array<{ id: string; content: string; role?: string }>;

  beforeEach(() => {
    messages = [
      {
        id: "msg-1",
        content: "Hello, I need help planning an event",
        role: "user"
      },
      {
        id: "msg-2",
        content: "I'd be happy to help you plan your event! What type of event are you organizing?",
        role: "assistant"
      },
      {
        id: "msg-3",
        content: "I'm organizing a Christmas event in Garland",
        role: "user"
      },
      {
        id: "msg-4",
        content: "A Christmas event in Garland sounds wonderful! What activities are you planning?",
        role: "assistant"
      },
      {
        id: "msg-5",
        content: "We'll have Santa visits, hot chocolate, and ornament making",
        role: "user"
      },
    ];
  });

  describe("rankMessageImportance", () => {
    it("should rank messages with correct importance scores", () => {
      const trackedEntities = new Set(["Christmas", "Garland", "event"]);
      const ranked = rankMessageImportance(messages, trackedEntities);

      expect(ranked).toHaveLength(messages.length);

      // All scores should be between 0 and 1
      ranked.forEach(r => {
        expect(r.importance).toBeGreaterThanOrEqual(0);
        expect(r.importance).toBeLessThanOrEqual(1);
        expect(r.factors).toBeDefined();
      });

      // More recent messages should generally have higher scores
      const lastMessageScore = ranked[ranked.length - 1].importance;
      const firstMessageScore = ranked[0].importance;
      expect(lastMessageScore).toBeGreaterThanOrEqual(firstMessageScore);
    });

    it("should give higher scores to messages with tracked entities", () => {
      const trackedEntities = new Set(["Christmas", "Garland"]);
      const ranked = rankMessageImportance(messages, trackedEntities);

      // Messages mentioning Christmas and Garland should have higher scores
      const christmasGarlandScores = ranked
        .filter(r => r.content.includes("Christmas") || r.content.includes("Garland"))
        .map(r => r.importance);

      const otherScores = ranked
        .filter(r => !r.content.includes("Christmas") && !r.content.includes("Garland"))
        .map(r => r.importance);

      if (christmasGarlandScores.length > 0 && otherScores.length > 0) {
        const avgEntityScore = christmasGarlandScores.reduce((a, b) => a + b, 0) / christmasGarlandScores.length;
        const avgOtherScore = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
        expect(avgEntityScore).toBeGreaterThan(avgOtherScore);
      }
    });

    it("should apply recency decay correctly", () => {
      const trackedEntities = new Set();
      const ranked = rankMessageImportance(messages, trackedEntities);

      // The last message should have the highest recency score
      expect(ranked[ranked.length - 1].factors.recency).toBeCloseTo(1, 1);

      // The first message should have the lowest recency score
      expect(ranked[0].factors.recency).toBeLessThan(ranked[ranked.length - 1].factors.recency);
    });

    it("should handle empty tracked entities", () => {
      const trackedEntities = new Set();
      const ranked = rankMessageImportance(messages, trackedEntities);

      expect(ranked).toHaveLength(messages.length);

      // All entity density scores should be 0
      ranked.forEach(r => {
        expect(r.factors.entityDensity).toBe(0);
      });
    });

    it("should handle empty messages array", () => {
      const trackedEntities = new Set(["Christmas"]);
      const ranked = rankMessageImportance([], trackedEntities);

      expect(ranked).toHaveLength(0);
    });

    it("should handle messages with no content", () => {
      const emptyMessages = [
        { id: "msg-1", content: "" },
        { id: "msg-2", content: "Some content" },
      ];
      const trackedEntities = new Set();
      const ranked = rankMessageImportance(emptyMessages, trackedEntities);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].factors.entityDensity).toBe(0);
      expect(ranked[1].factors.entityDensity).toBe(0);
    });
  });

  describe("calculateEntityDensity", () => {
    it("should calculate entity density correctly", () => {
      const trackedEntities = new Set(["Christmas", "Garland", "event"]);
      const content = "I'm organizing a Christmas event in Garland this year";

      const density = calculateEntityDensity(content, trackedEntities);

      // 3 out of 3 entities mentioned
      expect(density).toBe(1);
    });

    it("should handle partial entity matches", () => {
      const trackedEntities = new Set(["Christmas", "event"]);
      const content = "The Christmas celebration is a wonderful event";

      const density = calculateEntityDensity(content, trackedEntities);

      // 2 out of 2 entities mentioned
      expect(density).toBe(1);
    });

    it("should handle case-insensitive matching", () => {
      const trackedEntities = new Set(["christmas", "garland"]); // lowercase
      const content = "Christmas in Garland is amazing"; // capitalized

      const density = calculateEntityDensity(content, trackedEntities);

      expect(density).toBe(1);
    });

    it("should return 0 when no entities are tracked", () => {
      const trackedEntities = new Set();
      const content = "Christmas event in Garland";

      const density = calculateEntityDensity(content, trackedEntities);

      expect(density).toBe(0);
    });

    it("should return 0 when no entities are mentioned", () => {
      const trackedEntities = new Set(["Christmas", "Garland"]);
      const content = "I'm planning something fun";

      const density = calculateEntityDensity(content, trackedEntities);

      expect(density).toBe(0);
    });
  });

  describe("calculateRecencyScore", () => {
    it("should give highest score to most recent message", () => {
      const totalMessages = 10;
      const recentScore = calculateRecencyScore(totalMessages - 1, totalMessages);
      const oldScore = calculateRecencyScore(0, totalMessages);

      expect(recentScore).toBeGreaterThan(oldScore);
      expect(recentScore).toBeCloseTo(1, 1);
      expect(oldScore).toBeCloseTo(0, 1);
    });

    it("should apply exponential decay", () => {
      const totalMessages = 100;
      const scores = [];

      for (let i = 0; i < totalMessages; i++) {
        scores.push(calculateRecencyScore(i, totalMessages));
      }

      // Scores should decrease monotonically
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }

      // Most recent should be close to 1
      expect(scores[scores.length - 1]).toBeCloseTo(1, 1);

      // Oldest should be close to 0
      expect(scores[0]).toBeCloseTo(0, 1);
    });

    it("should handle single message", () => {
      const score = calculateRecencyScore(0, 1);
      expect(score).toBeCloseTo(1, 1);
    });

    it("should handle edge cases", () => {
      // Index equal to total messages (shouldn't happen but test anyway)
      const score1 = calculateRecencyScore(10, 10);
      expect(score1).toBeCloseTo(0, 1);

      // Index 0 with 0 messages (edge case)
      const score2 = calculateRecencyScore(0, 0);
      expect(score2).toBe(0);
    });
  });

  describe("hasCodeBlock", () => {
    it("should detect markdown code blocks", () => {
      expect(hasCodeBlock("Here's code:\n```javascript\nconst x = 1;\n```")).toBe(true);
      expect(hasCodeBlock("```\nconsole.log('hello');\n```")).toBe(true);
      expect(hasCodeBlock("No code here")).toBe(false);
      expect(hasCodeBlock("Just some text with backticks `not a code block`")).toBe(false);
    });

    it("should handle multiple code blocks", () => {
      const content = [
        "First block:",
        "```js",
        "const a = 1;",
        "```",
        "",
        "Second block:",
        "```python",
        'print("hello")',
        "```",
      ].join("\n");
      expect(hasCodeBlock(content)).toBe(true);
    });

    it("should handle empty code blocks", () => {
      expect(hasCodeBlock("```\n```")).toBe(true);
    });

    it("should handle no code blocks", () => {
      expect(hasCodeBlock("Regular text here")).toBe(false);
    });
  });

  describe("isDecisionPoint", () => {
    it("should detect decision confirmations", () => {
      expect(isDecisionPoint("Yes, let's go with that")).toBe(true);
      expect(isDecisionPoint("No, I disagree")).toBe(true);
      expect(isDecisionPoint("Confirmed, we'll proceed")).toBe(true);
      expect(isDecisionPoint("Agreed, that sounds good")).toBe(true);
    });

    it("should detect programming decisions", () => {
      expect(isDecisionPoint("I'll use React for this project")).toBe(true);
      expect(isDecisionPoint("Going with TypeScript instead")).toBe(true);
      expect(isDecisionPoint("Decided to use the API approach")).toBe(true);
    });

    it("should handle mixed case", () => {
      expect(isDecisionPoint("YES, let's do it")).toBe(true);
      expect(isDecisionPoint("no, that won't work")).toBe(true);
    });

    it("should not detect regular questions as decisions", () => {
      expect(isDecisionPoint("What should we do?")).toBe(false);
      expect(isDecisionPoint("How do we proceed?")).toBe(false);
      expect(isDecisionPoint("Can you help me?")).toBe(false);
    });

    it("should not detect statements as decisions", () => {
      expect(isDecisionPoint("That's interesting")).toBe(false);
      expect(isDecisionPoint("I need help")).toBe(false);
      expect(isDecisionPoint("This is complicated")).toBe(false);
    });
  });

  describe("isQuestionOrAnswer", () => {
    it("should detect questions", () => {
      expect(isQuestionOrAnswer("How do I do this?")).toBe(true);
      expect(isQuestionOrAnswer("What's the plan?")).toBe(true);
      expect(isQuestionOrAnswer("Can you help?")).toBe(true);
    });

    it("should detect answers following questions", () => {
      expect(isQuestionOrAnswer("Here's how to do it", "How do I do this?")).toBe(true);
      expect(isQuestionOrAnswer("The plan is simple", "What's the plan?")).toBe(true);
      expect(isQuestionOrAnswer("I can definitely help", "Can you help?")).toBe(true);
    });

    it("should not detect statements", () => {
      expect(isQuestionOrAnswer("This is a statement")).toBe(false);
      expect(isQuestionOrAnswer("I know the answer")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isQuestionOrAnswer("")).toBe(false);
      expect(isQuestionOrAnswer("?", "previous")).toBe(true);
      expect(isQuestionOrAnswer("No question here", "also no question")).toBe(false);
    });
  });

  describe("ImportanceFactors", () => {
    it("should have all required factors", () => {
      const factors: ImportanceFactors = {
        recency: 0.5,
        entityDensity: 0.3,
        questionAnswer: 0.2,
        codeContent: 0.1,
        decisionPoint: 0.1,
      };

      expect(factors).toHaveProperty('recency');
      expect(factors).toHaveProperty('entityDensity');
      expect(factors).toHaveProperty('questionAnswer');
      expect(factors).toHaveProperty('codeContent');
      expect(factors).toHaveProperty('decisionPoint');

      // All factors should be between 0 and 1
      Object.values(factors).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("RankedMessage", () => {
    it("should have all required properties", () => {
      const ranked: RankedMessage = {
        id: "msg-1",
        importance: 0.75,
        factors: {
          recency: 0.9,
          entityDensity: 0.5,
          questionAnswer: 0.2,
          codeContent: 0.1,
          decisionPoint: 0.0,
        },
      };

      expect(ranked).toHaveProperty('id');
      expect(ranked).toHaveProperty('importance');
      expect(ranked).toHaveProperty('factors');
      expect(typeof ranked.importance).toBe('number');
      expect(ranked.importance).toBeGreaterThanOrEqual(0);
      expect(ranked.importance).toBeLessThanOrEqual(1);
    });
  });
});