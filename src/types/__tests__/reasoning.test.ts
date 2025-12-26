import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReasoningStepSchema,
  StructuredReasoningSchema,
  parseReasoningSteps,
  validateReasoningSteps,
  REASONING_CONFIG,
  _resetParserLogState,
  type ReasoningStep,
  type StructuredReasoning,
} from '../reasoning';

/**
 * Test Suite for Reasoning Types and Validation
 *
 * Coverage:
 * - ✅ Zod schema validation for ReasoningStep
 * - ✅ Zod schema validation for StructuredReasoning
 * - ✅ parseReasoningSteps() safe parsing with error handling
 * - ✅ validateReasoningSteps() server-side validation
 * - ✅ XSS prevention and dangerous pattern detection
 * - ✅ Length limit enforcement
 * - ✅ Configuration constants
 * - ✅ Error logging and monitoring hooks
 */

describe('REASONING_CONFIG', () => {
  it('has all required configuration constants', () => {
    expect(REASONING_CONFIG.MAX_STEPS).toBeDefined();
    expect(REASONING_CONFIG.MAX_ITEMS_PER_STEP).toBeDefined();
    expect(REASONING_CONFIG.MAX_TITLE_LENGTH).toBeDefined();
    expect(REASONING_CONFIG.MAX_ITEM_LENGTH).toBeDefined();
    expect(REASONING_CONFIG.MAX_SUMMARY_LENGTH).toBeDefined();
    expect(REASONING_CONFIG.INITIAL_VISIBLE_ITEMS).toBeDefined();
    expect(REASONING_CONFIG.ENABLE_VIRTUALIZATION_THRESHOLD).toBeDefined();
  });

  it('has reasonable numeric values', () => {
    expect(REASONING_CONFIG.MAX_STEPS).toBe(10);
    expect(REASONING_CONFIG.MAX_ITEMS_PER_STEP).toBe(20);
    expect(REASONING_CONFIG.MAX_TITLE_LENGTH).toBe(500);
    expect(REASONING_CONFIG.MAX_ITEM_LENGTH).toBe(2000);
    expect(REASONING_CONFIG.MAX_SUMMARY_LENGTH).toBe(1000);
    expect(REASONING_CONFIG.INITIAL_VISIBLE_ITEMS).toBe(5);
    expect(REASONING_CONFIG.ENABLE_VIRTUALIZATION_THRESHOLD).toBe(5);
  });
});

describe('ReasoningStepSchema', () => {
  describe('Valid Steps', () => {
    it('accepts valid research step', () => {
      const validStep: ReasoningStep = {
        phase: 'research',
        title: 'Research step title here',
        icon: 'search',
        items: ['Item 1', 'Item 2'],
        timestamp: Date.now(),
      };

      const result = ReasoningStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('accepts valid analysis step', () => {
      const validStep: ReasoningStep = {
        phase: 'analysis',
        title: 'Analysis step title',
        icon: 'lightbulb',
        items: ['Analysis point 1'],
      };

      const result = ReasoningStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('accepts valid solution step', () => {
      const validStep: ReasoningStep = {
        phase: 'solution',
        title: 'Solution step title',
        icon: 'target',
        items: ['Solution item 1'],
      };

      const result = ReasoningStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('accepts valid custom step', () => {
      const validStep: ReasoningStep = {
        phase: 'custom',
        title: 'Custom step title',
        icon: 'sparkles',
        items: ['Custom item 1'],
      };

      const result = ReasoningStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);
    });

    it('accepts step without icon (optional)', () => {
      const stepWithoutIcon = {
        phase: 'research',
        title: 'Step without icon',
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(stepWithoutIcon);
      expect(result.success).toBe(true);
    });

    it('accepts step without timestamp (optional)', () => {
      const stepWithoutTimestamp = {
        phase: 'research',
        title: 'Step without timestamp',
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(stepWithoutTimestamp);
      expect(result.success).toBe(true);
    });

    it('accepts all valid icon types', () => {
      const icons: Array<'search' | 'lightbulb' | 'target' | 'sparkles'> = [
        'search',
        'lightbulb',
        'target',
        'sparkles',
      ];

      icons.forEach(icon => {
        const step = {
          phase: 'research' as const,
          title: `Step with ${icon} icon`,
          icon,
          items: ['Item'],
        };

        const result = ReasoningStepSchema.safeParse(step);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid Steps', () => {
    it('rejects invalid phase', () => {
      const invalidStep = {
        phase: 'invalid_phase',
        title: 'Invalid phase step',
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
      const emptyTitle = {
        phase: 'research',
        title: '',
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(emptyTitle);
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const longTitle = {
        phase: 'research',
        title: 'A'.repeat(501),
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(longTitle);
      expect(result.success).toBe(false);
    });

    it('rejects invalid icon', () => {
      const invalidIcon = {
        phase: 'research',
        title: 'Step with invalid icon',
        icon: 'invalid_icon',
        items: ['Item 1'],
      };

      const result = ReasoningStepSchema.safeParse(invalidIcon);
      expect(result.success).toBe(false);
    });

    it('rejects empty items array', () => {
      const emptyItems = {
        phase: 'research',
        title: 'Step with empty items',
        items: [],
      };

      const result = ReasoningStepSchema.safeParse(emptyItems);
      expect(result.success).toBe(false);
    });

    it('rejects items array exceeding max count', () => {
      const tooManyItems = {
        phase: 'research',
        title: 'Step with too many items',
        items: Array.from({ length: 21 }, (_, i) => `Item ${i + 1}`),
      };

      const result = ReasoningStepSchema.safeParse(tooManyItems);
      expect(result.success).toBe(false);
    });

    it('rejects item exceeding max length', () => {
      const longItem = {
        phase: 'research',
        title: 'Step with long item',
        items: ['A'.repeat(2001)],
      };

      const result = ReasoningStepSchema.safeParse(longItem);
      expect(result.success).toBe(false);
    });

    it('rejects non-array items', () => {
      const invalidItems = {
        phase: 'research',
        title: 'Step with invalid items type',
        items: 'not an array',
      };

      const result = ReasoningStepSchema.safeParse(invalidItems);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const missingFields = {
        phase: 'research',
        // Missing title and items
      };

      const result = ReasoningStepSchema.safeParse(missingFields);
      expect(result.success).toBe(false);
    });
  });
});

describe('StructuredReasoningSchema', () => {
  describe('Valid Reasoning', () => {
    it('accepts valid structured reasoning', () => {
      const validReasoning: StructuredReasoning = {
        steps: [
          {
            phase: 'research',
            title: 'Research step title',
            icon: 'search',
            items: ['Item 1', 'Item 2'],
          },
        ],
        summary: 'Summary text here',
      };

      const result = StructuredReasoningSchema.safeParse(validReasoning);
      expect(result.success).toBe(true);
    });

    it('accepts reasoning without summary (optional)', () => {
      const noSummary = {
        steps: [
          {
            phase: 'research',
            title: 'Step without summary',
            items: ['Item 1'],
          },
        ],
      };

      const result = StructuredReasoningSchema.safeParse(noSummary);
      expect(result.success).toBe(true);
    });

    it('accepts reasoning with multiple steps', () => {
      const multipleSteps = {
        steps: [
          {
            phase: 'research',
            title: 'Research step title',
            items: ['Item 1'],
          },
          {
            phase: 'analysis',
            title: 'Analysis step title',
            items: ['Item 2'],
          },
          {
            phase: 'solution',
            title: 'Solution step title',
            items: ['Item 3'],
          },
        ],
        summary: 'Multi-step summary',
      };

      const result = StructuredReasoningSchema.safeParse(multipleSteps);
      expect(result.success).toBe(true);
    });

    it('accepts reasoning with max steps (10)', () => {
      const maxSteps = {
        steps: Array.from({ length: 10 }, (_, i) => ({
          phase: 'research' as const,
          title: `Step ${i + 1} title text`,
          items: [`Item for step ${i + 1}`],
        })),
      };

      const result = StructuredReasoningSchema.safeParse(maxSteps);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Reasoning', () => {
    it('accepts empty steps array (for web search without reasoning)', () => {
      // Empty steps are now allowed - backend may send empty steps for searches
      // The frontend's hasDisplayableSteps check handles display logic
      const emptySteps = {
        steps: [],
      };

      const result = StructuredReasoningSchema.safeParse(emptySteps);
      expect(result.success).toBe(true);
    });

    it('rejects more than 10 steps', () => {
      const tooManySteps = {
        steps: Array.from({ length: 11 }, (_, i) => ({
          phase: 'research' as const,
          title: `Step ${i + 1} title`,
          items: [`Item ${i + 1}`],
        })),
      };

      const result = StructuredReasoningSchema.safeParse(tooManySteps);
      expect(result.success).toBe(false);
    });

    it('rejects non-array steps', () => {
      const invalidSteps = {
        steps: 'not an array',
      };

      const result = StructuredReasoningSchema.safeParse(invalidSteps);
      expect(result.success).toBe(false);
    });

    it('rejects summary exceeding max length', () => {
      const longSummary = {
        steps: [
          {
            phase: 'research' as const,
            title: 'Step with long summary',
            items: ['Item 1'],
          },
        ],
        summary: 'A'.repeat(1001),
      };

      const result = StructuredReasoningSchema.safeParse(longSummary);
      expect(result.success).toBe(false);
    });

    it('rejects reasoning with invalid step', () => {
      const invalidStep = {
        steps: [
          {
            phase: 'invalid_phase',
            title: 'Invalid step',
            items: ['Item 1'],
          },
        ],
      };

      const result = StructuredReasoningSchema.safeParse(invalidStep);
      expect(result.success).toBe(false);
    });
  });
});

describe('parseReasoningSteps', () => {
  // Reset rate-limiting state before each test to ensure consistent behavior
  beforeEach(() => {
    _resetParserLogState();
  });

  it('parses valid reasoning successfully', () => {
    const validData = {
      steps: [
        {
          phase: 'research',
          title: 'Test step title',
          items: ['Item 1'],
        },
      ],
    };

    const result = parseReasoningSteps(validData);
    expect(result).not.toBeNull();
    expect(result?.steps.length).toBe(1);
  });

  it('returns null for invalid data', () => {
    const invalidData = {
      steps: 'not an array',
    };

    const result = parseReasoningSteps(invalidData);
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    const result = parseReasoningSteps(null);
    expect(result).toBeNull();
  });

  it('returns null for undefined input', () => {
    const result = parseReasoningSteps(undefined);
    expect(result).toBeNull();
  });

  it('returns null silently for objects without steps property', () => {
    // Objects without 'steps' are silently rejected (not logged) to reduce noise
    // Note: Our early-exit check only skips logging for clearly invalid data,
    // not all objects without steps. This test verifies the function returns null.
    const invalidData = { invalid: 'structure' };
    const result = parseReasoningSteps(invalidData);

    expect(result).toBeNull();
  });

  it('logs warning to console for data with steps but invalid schema', () => {
    // Uses console.warn (not error) with rate-limiting
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const invalidData = { steps: [] }; // Empty array violates min constraint
    parseReasoningSteps(invalidData);

    expect(consoleSpy).toHaveBeenCalled();
    const warnCalls = consoleSpy.mock.calls.filter(call =>
      call[0].includes('[ReasoningParser]')
    );
    expect(warnCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('includes object keys in warning log (not raw data for brevity)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Use invalid step structure (missing required fields) instead of empty array
    const invalidData = { steps: [{ phase: 'invalid_phase' }], extra: 'field' };
    parseReasoningSteps(invalidData);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ReasoningParser]'),
      expect.objectContaining({ rawData: expect.arrayContaining(['steps', 'extra']) })
    );

    consoleSpy.mockRestore();
  });

  it('includes Zod errors in log', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Use invalid step structure (missing title and items) instead of empty array
    const invalidData = { steps: [{ phase: 'research' }] };
    parseReasoningSteps(invalidData);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        errors: expect.any(Array),
      })
    );

    consoleSpy.mockRestore();
  });

  it('handles deeply nested invalid structures', () => {
    const complexInvalid = {
      steps: [
        {
          phase: 'research',
          title: 'Valid title here',
          items: [
            'Valid item',
            123, // Invalid: not a string
            'Another valid item',
          ],
        },
      ],
    };

    const result = parseReasoningSteps(complexInvalid);
    expect(result).toBeNull();
  });
});

describe('validateReasoningSteps', () => {
  describe('Structure Validation', () => {
    it('rejects non-object input', () => {
      const nonObject = 'not an object';

      expect(() => {
        validateReasoningSteps(nonObject as any);
      }).toThrow('must be an object');
    });

    it('rejects object without steps property', () => {
      const noSteps = { summary: 'some summary' };

      expect(() => {
        validateReasoningSteps(noSteps as any);
      }).toThrow('must have steps array');
    });

    it('rejects non-array steps property', () => {
      const nonArraySteps = { steps: 'not an array' };

      expect(() => {
        validateReasoningSteps(nonArraySteps as any);
      }).toThrow('must be an array');
    });

    it('validates individual step structure', () => {
      const steps = {
        steps: [
          {
            phase: 'research',
            title: 'Valid step title',
            items: ['Item 1'],
          },
        ],
      };

      // Should not throw
      validateReasoningSteps(steps);
    });
  });

  describe('XSS Prevention', () => {
    it('blocks <script> tags in title', () => {
      const xssTitle = {
        steps: [
          {
            phase: 'research',
            title: '<script>alert("XSS")</script>',
            items: ['Safe item'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(xssTitle);
      }).toThrow('potential XSS');
    });

    it('blocks <iframe> tags in title', () => {
      const iframeTitle = {
        steps: [
          {
            phase: 'research',
            title: 'Title with <iframe src="evil.com">',
            items: ['Safe item'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(iframeTitle);
      }).toThrow('potential XSS');
    });

    it('blocks javascript: protocol', () => {
      const jsProtocol = {
        steps: [
          {
            phase: 'research',
            title: 'javascript:alert("XSS")',
            items: ['Safe item'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(jsProtocol);
      }).toThrow('potential XSS');
    });

    it('blocks onerror handlers in items', () => {
      const onerrorItem = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title here for testing',
            items: ['<img src=x onerror="malicious()">'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(onerrorItem);
      }).toThrow('potential XSS');
    });

    it('blocks onload handlers', () => {
      const onloadItem = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title for onload test',
            items: ['<body onload="alert(1)">'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(onloadItem);
      }).toThrow('potential XSS');
    });

    it('blocks onclick handlers', () => {
      const onclickItem = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title for onclick test',
            items: ['<div onclick="malicious()">'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(onclickItem);
      }).toThrow('potential XSS');
    });

    it('allows safe content', () => {
      const safeSteps = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title with normal text',
            items: ['Safe item with normal content'],
          },
        ],
      };

      // Should not throw
      validateReasoningSteps(safeSteps);
    });

    it('allows HTML entities', () => {
      const htmlEntities = {
        steps: [
          {
            phase: 'research',
            title: 'Title with &lt;safe&gt; entities',
            items: ['Item with &amp; &quot; entities'],
          },
        ],
      };

      // Should not throw
      validateReasoningSteps(htmlEntities);
    });

    // Test Group 1: Event Handler Tests (Issue #401)
    describe('Event Handlers', () => {
      it('rejects onfocus event handler in title', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: '<div onfocus=alert(1)>',
              items: ['test'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });

      it('rejects onmouseover event handler in items', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: 'Test',
              items: ['<span onmouseover=alert(1)>'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });

      it('rejects onmouseout event handler', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: '<p onmouseout=alert(1)>',
              items: ['test'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });
    });

    // Test Group 2: Protocol and Embedding Tests (Issue #401)
    describe('Protocols & Embedding', () => {
      it('rejects data:text/html protocol', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: 'Click <a href="data:text/html,<script>alert(1)</script>">here</a>',
              items: ['test'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });

      it('rejects <embed> tag', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: '<embed src="http://evil.com/xss.swf">',
              items: ['test'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });

      it('rejects <object> tag', () => {
        const xss = {
          steps: [
            {
              phase: 'research',
              title: '<object data="javascript:alert(1)">',
              items: ['test'],
            },
          ],
        };

        expect(() => validateReasoningSteps(xss)).toThrow(/XSS/i);
      });
    });

    // Test Group 3: Comprehensive Attack Vector Matrix (Issue #401)
    describe('Comprehensive Attack Vector Matrix', () => {
      it('blocks all 14 known XSS attack patterns', () => {
        const attackPatterns = [
          '<script>alert(1)</script>',
          '<iframe src="javascript:alert(1)">',
          '<a href="javascript:alert(1)">',
          '<img onerror=alert(1)>',
          '<img onload=alert(1)>',
          '<div onclick=alert(1)>',
          '<svg onload=alert(1)>',
          '<embed src="xss.swf">',
          '<object data="xss">',
          '<div onfocus=alert(1)>',
          '<span onmouseover=alert(1)>',
          '<p onmouseout=alert(1)>',
          '<a href="data:text/html,<script>alert(1)</script>">',
          '<img src=x onerror=alert(1)>',
        ];

        attackPatterns.forEach((pattern, i) => {
          const xss = {
            steps: [
              {
                phase: 'research',
                title: pattern,
                items: ['test'],
              },
            ],
          };

          expect(() => validateReasoningSteps(xss), `Pattern ${i + 1} (${pattern}) should be blocked`).toThrow(/XSS/i);
        });
      });
    });
  });

  describe('Length Validation', () => {
    it('enforces maximum title length', () => {
      const longTitle = {
        steps: [
          {
            phase: 'research',
            title: 'A'.repeat(501),
            items: ['Item 1'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(longTitle);
      }).toThrow('maximum length');
    });

    it('enforces maximum item length', () => {
      const longItem = {
        steps: [
          {
            phase: 'research',
            title: 'Step with very long item',
            items: ['A'.repeat(2001)],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(longItem);
      }).toThrow('maximum length');
    });

    it('accepts title at exact max length', () => {
      const maxLengthTitle = {
        steps: [
          {
            phase: 'research',
            title: 'A'.repeat(500),
            items: ['Item 1'],
          },
        ],
      };

      // Should not throw
      validateReasoningSteps(maxLengthTitle);
    });

    it('accepts item at exact max length', () => {
      const maxLengthItem = {
        steps: [
          {
            phase: 'research',
            title: 'Step with max length item',
            items: ['A'.repeat(2000)],
          },
        ],
      };

      // Should not throw
      validateReasoningSteps(maxLengthItem);
    });
  });

  describe('Type Validation', () => {
    it('validates step phase enum', () => {
      const invalidPhase = {
        steps: [
          {
            phase: 'invalid_phase',
            title: 'Step with invalid phase',
            items: ['Item 1'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(invalidPhase);
      }).toThrow();
    });

    it('validates icon enum', () => {
      const invalidIcon = {
        steps: [
          {
            phase: 'research',
            title: 'Step with invalid icon',
            icon: 'invalid_icon',
            items: ['Item 1'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(invalidIcon);
      }).toThrow();
    });

    it('validates items array type', () => {
      const nonStringItem = {
        steps: [
          {
            phase: 'research',
            title: 'Step with non-string item',
            items: [123, 'Valid item'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(nonStringItem as any);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty strings in items', () => {
      const emptyItem = {
        steps: [
          {
            phase: 'research',
            title: 'Step with empty item',
            items: [''],
          },
        ],
      };

      // Empty strings violate the Zod schema which requires min length 1
      expect(() => {
        validateReasoningSteps(emptyItem);
      }).toThrow('validation failed');
    });

    it('handles null in items array', () => {
      const nullItem = {
        steps: [
          {
            phase: 'research',
            title: 'Step with null item',
            items: [null as any],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(nullItem);
      }).toThrow();
    });

    it('handles mixed valid and invalid items', () => {
      const mixedItems = {
        steps: [
          {
            phase: 'research',
            title: 'Step with mixed items',
            items: ['Valid item', '<script>alert(1)</script>'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(mixedItems);
      }).toThrow('potential XSS');
    });

    it('validates all steps in array', () => {
      const multipleSteps = {
        steps: [
          {
            phase: 'research',
            title: 'First valid step',
            items: ['Item 1'],
          },
          {
            phase: 'analysis',
            title: 'Second valid step',
            items: ['Item 2'],
          },
          {
            phase: 'invalid_phase', // Invalid
            title: 'Third invalid step',
            items: ['Item 3'],
          },
        ],
      };

      expect(() => {
        validateReasoningSteps(multipleSteps as any);
      }).toThrow();
    });
  });
});

describe('Type Safety', () => {
  it('infers correct TypeScript types from schemas', () => {
    // Type inference test (compile-time check)
    const step: ReasoningStep = {
      phase: 'research',
      title: 'Type-safe step',
      items: ['Item 1'],
    };

    expect(step.phase).toBeDefined();
  });

  it('enforces required fields via Zod schema validation', () => {
    // Test that Zod catches missing required fields at runtime
    // This is more robust than compile-time checks since it validates real data
    const invalidStep = {
      phase: 'research',
      // Missing required: title, items
    };

    const result = ReasoningStepSchema.safeParse(invalidStep);

    expect(result.success).toBe(false);
    if (!result.success) {
      // Verify specific fields are flagged as missing
      const missingFields = result.error.issues.map(issue => issue.path[0]);
      expect(missingFields).toContain('title');
      expect(missingFields).toContain('items');
    }
  });

  it('rejects invalid phase values via Zod schema', () => {
    const invalidStep = {
      phase: 'invalid-phase', // Not a valid ReasoningPhase
      title: 'Test',
      items: ['Item'],
    };

    const result = ReasoningStepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });
});

describe('ReDoS Resistance', () => {
  it('resists ReDoS with massive attribute spam (above length limit)', () => {
    const start = Date.now();
    const attack = {
      steps: [{
        phase: 'research',
        title: '<img ' + 'x='.repeat(10000) + 'onerror=alert(1)>',
        items: ['test'],
      }],
    };

    // Should reject (too long) and complete quickly
    expect(() => validateReasoningSteps(attack)).toThrow();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('resists ReDoS with moderate attribute spam (under length limit)', () => {
    const start = Date.now();
    const attack = {
      steps: [{
        phase: 'research',
        title: '<img ' + 'x='.repeat(80) + 'onerror=alert(1)>',
        items: ['test'],
      }],
    };

    // Should reject (XSS pattern) and complete quickly
    expect(() => validateReasoningSteps(attack)).toThrow(/potential.*XSS/i);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('resists ReDoS with SVG onload pattern', () => {
    const start = Date.now();
    const attack = {
      steps: [{
        phase: 'analysis',
        title: 'Normal title',
        items: ['<svg ' + 'x='.repeat(80) + 'onload=alert(1)>'],
      }],
    };

    expect(() => validateReasoningSteps(attack)).toThrow();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('validates multiple steps with potential ReDoS patterns efficiently', () => {
    const start = Date.now();
    const attack = {
      steps: Array(5).fill(null).map(() => ({
        phase: 'research',
        title: '<img ' + 'x='.repeat(50) + 'onerror=alert(1)>',
        items: ['<svg ' + 'y='.repeat(50) + 'onload=alert(1)>'],
      })),
    };

    expect(() => validateReasoningSteps(attack)).toThrow();
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe('Performance Benchmarks', () => {
  // Reset rate-limiting state before each test
  beforeEach(() => {
    _resetParserLogState();
  });

  it('validates large valid step in <50ms', () => {
    const start = Date.now();
    const largeStep = {
      steps: [{
        phase: 'research',
        title: 'A'.repeat(500), // Max title length
        items: Array(20).fill(null).map(() => 'B'.repeat(1400)), // Max items & length
      }],
    };

    const result = parseReasoningSteps(largeStep);
    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].items).toHaveLength(20);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('validates maximum reasoning structure in <200ms', () => {
    const start = Date.now();
    const maxReasoning = {
      steps: Array(10).fill(null).map((_, i) => ({
        phase: 'research',
        title: `Step ${i + 1}: ${'A'.repeat(480)}`,
        items: Array(20).fill(null).map((_, j) => `Item ${j + 1}: ${'B'.repeat(1380)}`),
      })),
      summary: 'C'.repeat(1000), // Max summary length
    };

    const result = parseReasoningSteps(maxReasoning);
    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(10);
    expect(result?.summary).toBe('C'.repeat(1000));

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('scales linearly with number of steps (O(n) performance)', () => {
    const timings: number[] = [];

    for (const stepCount of [1, 3, 5, 10]) {
      const start = Date.now();
      const reasoning = {
        steps: Array(stepCount).fill(null).map((_, i) => ({
          phase: 'research',
          title: `Test step ${i + 1}`,
          items: Array(10).fill(null).map((_, j) => `Test item ${j + 1}`),
        })),
      };

      const result = parseReasoningSteps(reasoning);
      expect(result).not.toBeNull();
      expect(result?.steps).toHaveLength(stepCount);

      timings.push(Date.now() - start);
    }

    // Verify roughly linear scaling (10 steps shouldn't take >15x longer than 1 step)
    // Use Math.max to avoid division by zero if timing is 0ms
    const ratio = timings[3] / Math.max(timings[0], 1);
    expect(ratio).toBeLessThan(15); // Allow for overhead, but verify not exponential
  });
});
