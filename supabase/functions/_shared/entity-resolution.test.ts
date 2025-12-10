/**
 * Unit tests for entity resolution functionality
 * Tests pronoun resolution and reference tracking for better context retention
 */

import { describe, it, expect, beforeEach } from "https://deno.land/x/deno@v1.42.1/testing/bdd.ts";

// Mock interfaces for testing
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Entity {
  name: string;
  type: "person" | "place" | "thing" | "event" | "code";
  context: string;
}

interface Reference {
  text: string;
  start: number;
  end: number;
}

interface ResolutionResult {
  resolved: boolean;
  entity?: Entity;
  confidence: number;
  ambiguity: number;
}

class EntityResolver {
  private entities: Map<string, Entity> = new Map();
  private messages: Message[] = [];
  private entityPositions: Map<string, Reference[]> = new Map();

  addMessage(message: Message) {
    this.messages.push(message);
    this.extractEntities(message);
  }

  addEntity(entity: Entity) {
    this.entities.set(entity.name.toLowerCase(), entity);
  }

  private extractEntities(message: Message) {
    const content = message.content.toLowerCase();

    // Simple entity extraction patterns
    const patterns = [
      // Events (contains words like event, party, meeting, etc.)
      { regex: /\b(\w+(?:\s+\w+)*\s+(?:event|party|meeting|conference|gathering|celebration))\b/g, type: "event" as const },
      // Places (contains location names, venues)
      { regex: /\b(\w+(?:\s+\w+)*\s+(?:center|hall|venue|place|location|building|park|plaza))\b/g, type: "place" as const },
      // Code (camelCase, snake_case)
      { regex: /\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*|[a-z_]+[a-z0-9_]*)\b/g, type: "code" as const },
      // People names (capitalized words)
      { regex: /\b([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)\b/g, type: "person" as const },
      // Things (capitalized words not matching above)
      { regex: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/g, type: "thing" as const },
    ];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const entityName = match[1];
        const start = match.index;
        const end = start + entityName.length;

        // Store position reference
        if (!this.entityPositions.has(entityName)) {
          this.entityPositions.set(entityName, []);
        }
        this.entityPositions.get(entityName)!.push({ text: entityName, start, end });

        // Create entity if not exists
        if (!this.entities.has(entityName.toLowerCase())) {
          this.addEntity({
            name: entityName,
            type,
            context: message.content
          });
        }
      }
    }
  }

  resolveReference(reference: string, context?: string): ResolutionResult {
    const refLower = reference.toLowerCase();

    // Pronoun mapping
    const pronounMap: Record<string, string[]> = {
      "it": ["component", "function", "variable", "element", "button", "event"],
      "there": ["place", "location", "venue", "event", "building", "site"],
      "they": ["people", "volunteers", "organizers", "users", "participants", "groups"],
      "them": ["people", "volunteers", "organizers", "users", "participants", "groups"],
      "him": ["person", "man", "volunteer", "organizer", "speaker"],
      "her": ["person", "woman", "volunteer", "organizer", "speaker"],
      "his": ["person", "man", "volunteer", "organizer", "speaker"],
      "hers": ["person", "woman", "volunteer", "organizer", "speaker"],
    };

    // Direct entity match
    const directMatch = this.entities.get(refLower);
    if (directMatch) {
      return {
        resolved: true,
        entity: directMatch,
        confidence: 0.9,
        ambiguity: 0
      };
    }

    // Pronoun resolution
    const pronoun = Object.keys(pronounMap).find(p => refLower === p);
    if (pronoun) {
      const candidates = pronounMap[pronoun];
      const matches: Entity[] = [];

      for (const candidate of candidates) {
        for (const entity of this.entities.values()) {
          if (entity.type === candidate ||
              (candidate === "event" && entity.type === "thing" &&
               entity.name.toLowerCase().includes("event")) ||
              (candidate === "component" && entity.type === "thing" &&
               entity.name.toLowerCase().includes("component"))) {
            matches.push(entity);
          }
        }
      }

      if (matches.length === 1) {
        return {
          resolved: true,
          entity: matches[0],
          confidence: 0.8,
          ambiguity: 0
        };
      }

      if (matches.length > 1) {
        // Return the most recent match
        const recentMatch = this.getMostRecentEntity(matches);
        return {
          resolved: true,
          entity: recentMatch,
          confidence: 0.6,
          ambiguity: matches.length - 1
        };
      }
    }

    return {
      resolved: false,
      confidence: 0,
      ambiguity: 0
    };
  }

  private getMostRecentEntity(entities: Entity[]): Entity {
    // Simple heuristic: return the entity mentioned most recently
    const mentions = entities.map(e => {
      const count = Array.from(this.entityPositions.values())
        .flat()
        .filter(pos => pos.text.toLowerCase() === e.name.toLowerCase()).length;
      return { entity: e, mentions: count };
    });

    return mentions.reduce((max, current) =>
      current.mentions > max.mentions ? current : max
    ).entity;
  }

  getAmbiguousReferences(): Array<{ reference: string; entities: Entity[] }> {
    const pronouns = ["it", "there", "they", "them", "him", "her", "his", "hers"];
    const ambiguous: Array<{ reference: string; entities: Entity[] }> = [];

    for (const pronoun of pronouns) {
      const matches = Array.from(this.entities.values()).filter(entity => {
        return pronounMap[pronoun].includes(entity.type) ||
               (pronoun === "it" && entity.type === "code") ||
               (pronoun === "there" && entity.type === "place") ||
               (pronoun === "they" && (entity.type === "person" ||
                                       entity.type === "thing" &&
                                       entity.name.toLowerCase().includes("people")));
      });

      if (matches.length > 1) {
        ambiguous.push({ reference: pronoun, entities: matches });
      }
    }

    return ambiguous;
  }
}

// Initialize pronoun map
const pronounMap: Record<string, string[]> = {
  "it": ["component", "function", "variable", "element", "button", "event"],
  "there": ["place", "location", "venue", "event", "building", "site"],
  "they": ["people", "volunteers", "organizers", "users", "participants", "groups"],
  "them": ["people", "volunteers", "organizers", "users", "participants", "groups"],
  "him": ["person", "man", "volunteer", "organizer", "speaker"],
  "her": ["person", "woman", "volunteer", "organizer", "speaker"],
  "his": ["person", "man", "volunteer", "organizer", "speaker"],
  "hers": ["person", "woman", "volunteer", "organizer", "speaker"],
};

describe("Entity Resolution", () => {
  let resolver: EntityResolver;

  beforeEach(() => {
    resolver = new EntityResolver();
  });

  describe("Pronoun Resolution - 'it' Reference", () => {
    it("should resolve 'it' to the most recent entity", () => {
      // Add conversation context
      resolver.addMessage({ id: "1", role: "user", content: "Create a React component for the event" });
      resolver.addMessage({ id: "2", role: "assistant", content: "I've created the EventPlanner component" });
      resolver.addMessage({ id: "3", role: "user", content: "Style it nicely" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name).toBe("EventPlanner");
      expect(result.entity?.type).toBe("code");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should resolve 'it' to an event", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Organize the Christmas event" });
      resolver.addMessage({ id: "2", role: "assistant", content: "I've planned the Christmas event" });
      resolver.addMessage({ id: "3", role: "user", content: "When is it?" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name.toLowerCase()).toContain("christmas");
      expect(result.entity?.type).toBe("thing");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should handle ambiguous 'it' references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Create a component and a function for the event" });
      resolver.addMessage({ id: "2", role: "assistant", content: "I've created both components" });
      resolver.addMessage({ id: "3", role: "user", content: "Update it" });

      const result = resolver.resolveReference("it");

      // Should resolve to most recent entity
      expect(result.resolved).toBe(true);
      expect(result.ambiguity).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("should return unresolved for unknown 'it' references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Hello" });
      resolver.addMessage({ id: "2", role: "user", content: "Tell me about it" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe("'there' Reference", () => {
    it("should resolve 'there' to a location", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The event is at Garland Community Center" });
      resolver.addMessage({ id: "2", role: "user", content: "How do I get there?" });

      const result = resolver.resolveReference("there");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name.toLowerCase()).toContain("garland");
      expect(result.entity?.type).toBe("place");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should resolve 'there' to an event", () => {
      resolver.addMessage({ id: "1", role: "user", content: "We're having the Christmas event downtown" });
      resolver.addMessage({ id: "2", role: "user", content: "What activities are there?" });

      const result = resolver.resolveReference("there");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name.toLowerCase()).toContain("christmas");
      expect(result.entity?.type).toBe("thing");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should handle ambiguous 'there' references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The event is at Community Center and the party is at the venue" });
      resolver.addMessage({ id: "2", role: "user", content: "What about there?" });

      const result = resolver.resolveReference("there");

      expect(result.resolved).toBe(true);
      expect(result.ambiguity).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe("'they'/'them' Reference", () => {
    it("should resolve 'they' to people entities", () => {
      resolver.addMessage({ id: "1", role: "user", content: "I need to organize volunteers and vendors" });
      resolver.addMessage({ id: "2", role: "user", content: "How do I contact them?" });

      const result = resolver.resolveReference("them");

      expect(result.resolved).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      const entityName = result.entity?.name.toLowerCase() ?? "";
      expect(entityName.includes("volunteer") || entityName.includes("vendor")).toBe(true);
    });

    it("should resolve 'they' to groups", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The participants and organizers will be there" });
      resolver.addMessage({ id: "2", role: "user", content: "What about they?" });

      const result = resolver.resolveReference("they");

      expect(result.resolved).toBe(true);
      expect(result.entity?.type).toBe("thing");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should handle ambiguous 'they' references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The volunteers and vendors need to coordinate" });
      resolver.addMessage({ id: "2", role: "user", content: "How do I reach them?" });

      const result = resolver.resolveReference("them");

      expect(result.resolved).toBe(true);
      expect(result.ambiguity).toBeGreaterThan(0);
    });
  });

  describe("Entity Tracking", () => {
    it("should track entities across messages", () => {
      resolver.addMessage({ id: "1", role: "user", content: "I'm organizing a Christmas event in Garland" });
      resolver.addMessage({ id: "2", role: "user", content: "The event needs decorations" });

      const entities = Array.from(resolver["entities"].values());

      expect(entities.some(e => e.name.toLowerCase().includes("christmas"))).toBe(true);
      expect(entities.some(e => e.name.toLowerCase().includes("garland"))).toBe(true);
      expect(entities.some(e => e.name.toLowerCase().includes("event"))).toBe(true);
    });

    it("should handle entity type detection", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Create calculateTotal function for budget" });
      resolver.addMessage({ id: "2", role: "user", content: "The Garland Community Center needs setup" });
      resolver.addMessage({ id: "3", role: "user", content: "Santa will visit the event" });

      const entities = Array.from(resolver["entities"].values());

      const codeEntity = entities.find(e => e.type === "code");
      const placeEntity = entities.find(e => e.type === "place");
      const personEntity = entities.find(e => e.type === "person");
      const thingEntity = entities.find(e => e.type === "thing");

      expect(codeEntity?.name).toBe("calculateTotal");
      expect(placeEntity?.name.toLowerCase()).toContain("garland");
      expect(personEntity?.name).toBe("Santa");
      expect(thingEntity?.name.toLowerCase()).toContain("event");
    });

    it("should preserve entity context", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The Christmas event is amazing" });

      const entity = Array.from(resolver["entities"].values())[0];
      expect(entity?.context).toBe("The Christmas event is amazing");
    });
  });

  describe("Ambiguity Detection", () => {
    it("should identify ambiguous references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "We have volunteers and vendors for the event" });
      resolver.addMessage({ id: "2", role: "user", content: "Contact them" });

      const ambiguous = resolver.getAmbiguousReferences();

      // Should detect that "them" could refer to multiple entities
      expect(ambiguous.length).toBeGreaterThan(0);
      expect(ambiguous[0].reference).toBe("them");
    });

    it("should handle non-ambiguous references", () => {
      resolver.addMessage({ id: "1", role: "user", content: "I need help with the Garland event" });
      resolver.addMessage({ id: "2", role: "user", content: "Tell me about it" });

      const ambiguous = resolver.getAmbiguousReferences();

      // "it" should have clear reference to Garland event
      expect(ambiguous.filter(a => a.reference === "it")).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty conversation", () => {
      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("should handle conversation with no entities", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Hello, how are you?" });
      resolver.addMessage({ id: "2", role: "user", content: "Tell me about it" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("should handle case sensitivity", () => {
      resolver.addMessage({ id: "1", role: "user", content: "The Christmas Event is great" });
      resolver.addMessage({ id: "2", role: "user", content: "Tell me about it" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name.toLowerCase()).toContain("christmas");
    });

    it("should handle partial matches", () => {
      resolver.addMessage({ id: "1", role: "user", content: "I need EventPlanner for Christmas" });
      resolver.addMessage({ id: "2", role: "user", content: "Use it for the event" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name).toBe("EventPlanner");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete conversation with context", () => {
      const conversation = [
        { id: "1", role: "user", content: "I'm organizing a Christmas event in Garland" },
        { id: "2", role: "assistant", content: "Great! The Garland Community Center would be perfect" },
        { id: "3", role: "user", content: "I'll need volunteers for setup" },
        { id: "4", role: "assistant", content: "I'll create a volunteer signup component" },
        { id: "5", role: "user", content: "Style it with Christmas colors" },
        { id: "6", role: "user", content: "Where is it and how do I contact them?" },
      ];

      conversation.forEach(msg => resolver.addMessage(msg));

      // Test pronoun resolution at different points
      const result1 = resolver.resolveReference("it", msg.id + "5");
      const result2 = resolver.resolveReference("it", msg.id + "6");
      const result3 = resolver.resolveReference("them", msg.id + "6");

      expect(result1.resolved).toBe(true);
      expect(result1.entity?.name).toBe("volunteer");

      expect(result2.resolved).toBe(true);
      expect(result2.entity?.name.toLowerCase()).toContain("garland");

      expect(result3.resolved).toBe(true);
      expect(result3.entity?.name.toLowerCase()).toContain("volunteer");
    });

    it("should maintain context across message boundaries", () => {
      resolver.addMessage({ id: "1", role: "user", content: "Create a todo list for the Christmas event" });
      resolver.addMessage({ id: "2", role: "assistant", content: "I've created the TodoList component" });

      // New conversation segment but context should persist
      resolver.addMessage({ id: "3", role: "user", content: "Add decorations to it" });

      const result = resolver.resolveReference("it");

      expect(result.resolved).toBe(true);
      expect(result.entity?.name).toBe("TodoList");
    });
  });
});