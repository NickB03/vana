import { describe, it, expect, vi } from 'vitest';
import {
  ReasoningStepSchema,
  StructuredReasoningSchema,
  parseReasoningSteps,
  validateReasoningSteps,
  REASONING_CONFIG,
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
    it('rejects empty steps array', () => {
      const emptySteps = {
        steps: [],
      };

      const result = StructuredReasoningSchema.safeParse(emptySteps);
      expect(result.success).toBe(false);
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

  it('logs error to console for invalid data', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const invalidData = { invalid: 'structure' };
    parseReasoningSteps(invalidData);

    expect(consoleSpy).toHaveBeenCalled();
    const errorCalls = consoleSpy.mock.calls.filter(call =>
      call[0].includes('[ReasoningParser]')
    );
    expect(errorCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('includes raw data in error log', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const invalidData = { test: 'data' };
    parseReasoningSteps(invalidData);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ReasoningParser]'),
      expect.objectContaining({ rawData: invalidData })
    );

    consoleSpy.mockRestore();
  });

  it('includes Zod errors in log', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const invalidData = { steps: [] }; // Empty array violates min constraint
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
    it('validates array structure', () => {
      const nonArray = 'not an array';

      expect(() => {
        validateReasoningSteps(nonArray as any);
      }).toThrow('must be an array');
    });

    it('validates individual step structure', () => {
      const steps = [
        {
          phase: 'research',
          title: 'Valid step title',
          items: ['Item 1'],
        },
      ];

      // Should not throw
      validateReasoningSteps(steps);
    });
  });

  describe('XSS Prevention', () => {
    it('blocks <script> tags in title', () => {
      const xssTitle = [
        {
          phase: 'research',
          title: '<script>alert("XSS")</script>',
          items: ['Safe item'],
        },
      ];

      expect(() => {
        validateReasoningSteps(xssTitle);
      }).toThrow('potential XSS');
    });

    it('blocks <iframe> tags in title', () => {
      const iframeTitle = [
        {
          phase: 'research',
          title: 'Title with <iframe src="evil.com">',
          items: ['Safe item'],
        },
      ];

      expect(() => {
        validateReasoningSteps(iframeTitle);
      }).toThrow('potential XSS');
    });

    it('blocks javascript: protocol', () => {
      const jsProtocol = [
        {
          phase: 'research',
          title: 'javascript:alert("XSS")',
          items: ['Safe item'],
        },
      ];

      expect(() => {
        validateReasoningSteps(jsProtocol);
      }).toThrow('potential XSS');
    });

    it('blocks onerror handlers in items', () => {
      const onerrorItem = [
        {
          phase: 'research',
          title: 'Safe title here for testing',
          items: ['<img src=x onerror="malicious()">'],
        },
      ];

      expect(() => {
        validateReasoningSteps(onerrorItem);
      }).toThrow('potential XSS');
    });

    it('blocks onload handlers', () => {
      const onloadItem = [
        {
          phase: 'research',
          title: 'Safe title for onload test',
          items: ['<body onload="alert(1)">'],
        },
      ];

      expect(() => {
        validateReasoningSteps(onloadItem);
      }).toThrow('potential XSS');
    });

    it('blocks onclick handlers', () => {
      const onclickItem = [
        {
          phase: 'research',
          title: 'Safe title for onclick test',
          items: ['<div onclick="malicious()">'],
        },
      ];

      expect(() => {
        validateReasoningSteps(onclickItem);
      }).toThrow('potential XSS');
    });

    it('allows safe content', () => {
      const safeSteps = [
        {
          phase: 'research',
          title: 'Safe title with normal text',
          items: ['Safe item with normal content'],
        },
      ];

      // Should not throw
      validateReasoningSteps(safeSteps);
    });

    it('allows HTML entities', () => {
      const htmlEntities = [
        {
          phase: 'research',
          title: 'Title with &lt;safe&gt; entities',
          items: ['Item with &amp; &quot; entities'],
        },
      ];

      // Should not throw
      validateReasoningSteps(htmlEntities);
    });
  });

  describe('Length Validation', () => {
    it('enforces maximum title length', () => {
      const longTitle = [
        {
          phase: 'research',
          title: 'A'.repeat(501),
          items: ['Item 1'],
        },
      ];

      expect(() => {
        validateReasoningSteps(longTitle);
      }).toThrow('maximum length');
    });

    it('enforces maximum item length', () => {
      const longItem = [
        {
          phase: 'research',
          title: 'Step with very long item',
          items: ['A'.repeat(2001)],
        },
      ];

      expect(() => {
        validateReasoningSteps(longItem);
      }).toThrow('maximum length');
    });

    it('accepts title at exact max length', () => {
      const maxLengthTitle = [
        {
          phase: 'research',
          title: 'A'.repeat(500),
          items: ['Item 1'],
        },
      ];

      // Should not throw
      validateReasoningSteps(maxLengthTitle);
    });

    it('accepts item at exact max length', () => {
      const maxLengthItem = [
        {
          phase: 'research',
          title: 'Step with max length item',
          items: ['A'.repeat(2000)],
        },
      ];

      // Should not throw
      validateReasoningSteps(maxLengthItem);
    });
  });

  describe('Type Validation', () => {
    it('validates step phase enum', () => {
      const invalidPhase = [
        {
          phase: 'invalid_phase',
          title: 'Step with invalid phase',
          items: ['Item 1'],
        },
      ];

      expect(() => {
        validateReasoningSteps(invalidPhase);
      }).toThrow();
    });

    it('validates icon enum', () => {
      const invalidIcon = [
        {
          phase: 'research',
          title: 'Step with invalid icon',
          icon: 'invalid_icon',
          items: ['Item 1'],
        },
      ];

      expect(() => {
        validateReasoningSteps(invalidIcon);
      }).toThrow();
    });

    it('validates items array type', () => {
      const nonStringItem = [
        {
          phase: 'research',
          title: 'Step with non-string item',
          items: [123, 'Valid item'],
        },
      ];

      expect(() => {
        validateReasoningSteps(nonStringItem as any);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty strings in items', () => {
      const emptyItem = [
        {
          phase: 'research',
          title: 'Step with empty item',
          items: [''],
        },
      ];

      // Empty strings violate the Zod schema which requires min length 1
      expect(() => {
        validateReasoningSteps(emptyItem);
      }).toThrow('validation failed');
    });

    it('handles null in items array', () => {
      const nullItem = [
        {
          phase: 'research',
          title: 'Step with null item',
          items: [null as any],
        },
      ];

      expect(() => {
        validateReasoningSteps(nullItem);
      }).toThrow();
    });

    it('handles mixed valid and invalid items', () => {
      const mixedItems = [
        {
          phase: 'research',
          title: 'Step with mixed items',
          items: ['Valid item', '<script>alert(1)</script>'],
        },
      ];

      expect(() => {
        validateReasoningSteps(mixedItems);
      }).toThrow('potential XSS');
    });

    it('validates all steps in array', () => {
      const multipleSteps = [
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
      ];

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

  it('enforces required fields at compile time', () => {
    // This should cause TypeScript error if uncommented:
    // const invalidStep: ReasoningStep = {
    //   phase: 'research',
    //   // Missing required: title, items
    // };

    // Placeholder to avoid empty test
    expect(true).toBe(true);
  });
});
