/**
 * Artifact Verification Checklist
 *
 * 80+ point self-review checklist for artifact quality assurance.
 * Used in system prompt to guide AI generation and ensure production-grade output.
 *
 * Based on Z.ai frontend-design skill verification patterns.
 *
 * @module artifact-rules/verification-checklist
 */

export interface ChecklistItem {
  readonly id: string;
  readonly description: string;
  readonly priority: 'critical' | 'important' | 'nice-to-have';
  readonly examples?: Readonly<{
    bad?: string;
    good: string;
  }>;
}

export interface ChecklistCategory {
  readonly name: string;
  readonly description: string;
  readonly items: readonly ChecklistItem[];
}

/**
 * Comprehensive verification checklist organized by category.
 * Each item includes priority level and optional examples.
 */
export const VERIFICATION_CHECKLIST: ChecklistCategory[] = [
  {
    name: 'Design Tokens & Visual Consistency',
    description: 'Ensure systematic use of design tokens and avoid arbitrary values',
    items: [
      {
        id: 'dt-1',
        description: 'All colors from semantic tokens (no hex/rgb hardcoded)',
        priority: 'critical',
        examples: {
          bad: 'bg-[#3b82f6]',
          good: 'bg-blue-500 or bg-primary',
        },
      },
      {
        id: 'dt-2',
        description: 'All spacing from 8px scale (0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64)',
        priority: 'critical',
        examples: {
          bad: 'padding: 13px',
          good: 'p-3 (12px) or p-4 (16px)',
        },
      },
      {
        id: 'dt-3',
        description: 'All border radius from radius scale (none, sm, md, lg, xl, 2xl, 3xl, full)',
        priority: 'important',
        examples: {
          bad: 'border-radius: 6px',
          good: 'rounded-md or rounded-lg',
        },
      },
      {
        id: 'dt-4',
        description: 'Shadows minimal and justified by hierarchy (avoid excessive drop-shadows)',
        priority: 'important',
        examples: {
          good: 'shadow-sm for cards, shadow-md for modals, shadow-lg for popovers',
        },
      },
      {
        id: 'dt-5',
        description: 'Typography hierarchy clear with 1.5+ line-height for body text',
        priority: 'critical',
        examples: {
          bad: 'leading-tight on paragraph text',
          good: 'leading-relaxed or leading-7 for readability',
        },
      },
      {
        id: 'dt-6',
        description: 'Font weights semantic (400 normal, 500 medium, 600 semibold, 700 bold)',
        priority: 'important',
        examples: {
          bad: 'font-[450]',
          good: 'font-medium or font-semibold',
        },
      },
    ],
  },

  {
    name: 'Interactive States',
    description: 'All interactive elements must handle user interaction states',
    items: [
      {
        id: 'is-1',
        description: 'Default state implemented with clear affordance',
        priority: 'critical',
        examples: {
          good: 'Buttons have visible borders or background to indicate clickability',
        },
      },
      {
        id: 'is-2',
        description: 'Hover state implemented (cursor-pointer + visual feedback)',
        priority: 'critical',
        examples: {
          good: 'hover:bg-gray-100 transition-colors',
        },
      },
      {
        id: 'is-3',
        description: 'Active/pressed state implemented',
        priority: 'important',
        examples: {
          good: 'active:scale-95 or active:bg-gray-200',
        },
      },
      {
        id: 'is-4',
        description: 'Focus state with visible indicator (ring-2 or outline)',
        priority: 'critical',
        examples: {
          good: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        },
      },
      {
        id: 'is-5',
        description: 'Disabled state implemented (opacity-50 cursor-not-allowed)',
        priority: 'important',
        examples: {
          good: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        },
      },
      {
        id: 'is-6',
        description: 'Selected/active state for toggles and navigation',
        priority: 'important',
        examples: {
          good: 'aria-selected or data-active with distinct styling',
        },
      },
      {
        id: 'is-7',
        description: 'Smooth transitions between states (150-300ms)',
        priority: 'nice-to-have',
        examples: {
          good: 'transition-all duration-200 ease-in-out',
        },
      },
    ],
  },

  {
    name: 'Application States',
    description: 'Handle all possible application states gracefully',
    items: [
      {
        id: 'as-1',
        description: 'Loading state (skeleton or spinner with accessible label)',
        priority: 'critical',
        examples: {
          good: 'Skeleton screens for data or spinner with aria-label="Loading content"',
        },
      },
      {
        id: 'as-2',
        description: 'Empty state with clear message and actionable CTA',
        priority: 'critical',
        examples: {
          good: '"No items yet" with "Create your first item" button',
        },
      },
      {
        id: 'as-3',
        description: 'Error state with recovery instructions',
        priority: 'critical',
        examples: {
          good: '"Failed to load. Try again?" with retry button',
        },
      },
      {
        id: 'as-4',
        description: 'Success state feedback (toast, checkmark, or confirmation)',
        priority: 'important',
        examples: {
          good: 'Green checkmark with "Saved successfully" message',
        },
      },
      {
        id: 'as-5',
        description: 'Partial/degraded state handling',
        priority: 'nice-to-have',
        examples: {
          good: 'Show available data with note about unavailable sections',
        },
      },
    ],
  },

  {
    name: 'Accessibility (WCAG 2.1 AA)',
    description: 'Ensure artifact is usable by all users including assistive technology',
    items: [
      {
        id: 'a11y-1',
        description: 'WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text 18px+)',
        priority: 'critical',
        examples: {
          bad: 'text-gray-400 on bg-white (2.5:1)',
          good: 'text-gray-700 on bg-white (4.6:1)',
        },
      },
      {
        id: 'a11y-2',
        description: 'Complete keyboard navigation (Tab, Enter, Space, Arrows)',
        priority: 'critical',
        examples: {
          good: 'All interactive elements reachable via Tab, activated via Enter/Space',
        },
      },
      {
        id: 'a11y-3',
        description: 'Focus indicators always visible (never outline-none without replacement)',
        priority: 'critical',
        examples: {
          bad: 'focus:outline-none with no ring replacement',
          good: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
        },
      },
      {
        id: 'a11y-4',
        description: 'Semantic HTML used (nav, main, article, button, etc.)',
        priority: 'important',
        examples: {
          bad: '<div onClick={...}>Click me</div>',
          good: '<button onClick={...}>Click me</button>',
        },
      },
      {
        id: 'a11y-5',
        description: 'ARIA labels where needed (aria-label, aria-labelledby, aria-describedby)',
        priority: 'important',
        examples: {
          good: '<button aria-label="Close dialog"><X /></button>',
        },
      },
      {
        id: 'a11y-6',
        description: 'Images have alt text (empty alt="" for decorative)',
        priority: 'critical',
        examples: {
          good: '<img alt="User profile photo" /> or <img alt="" /> for icons',
        },
      },
      {
        id: 'a11y-7',
        description: 'Form inputs have associated labels',
        priority: 'critical',
        examples: {
          good: '<label htmlFor="email">Email</label><input id="email" />',
        },
      },
      {
        id: 'a11y-8',
        description: 'Color not sole indicator (icons, labels, patterns for colorblind users)',
        priority: 'important',
        examples: {
          good: 'Error messages have red color + X icon + "Error:" prefix',
        },
      },
      {
        id: 'a11y-9',
        description: 'Skip to content link for screen readers',
        priority: 'nice-to-have',
        examples: {
          good: '<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>',
        },
      },
    ],
  },

  {
    name: 'Responsive Design',
    description: 'Ensure artifact works across all viewport sizes',
    items: [
      {
        id: 'rd-1',
        description: 'Mobile layout (375px-767px) functional and optimized',
        priority: 'critical',
        examples: {
          good: 'Single column, hamburger menu, stacked cards',
        },
      },
      {
        id: 'rd-2',
        description: 'Tablet layout (768px-1023px) optimized with breakpoints',
        priority: 'important',
        examples: {
          good: '2-column grids, expanded navigation',
        },
      },
      {
        id: 'rd-3',
        description: 'Desktop layout (1024px+) enhanced with full features',
        priority: 'important',
        examples: {
          good: '3+ column grids, sidebar navigation, hover states',
        },
      },
      {
        id: 'rd-4',
        description: 'Touch targets >= 44x44px on mobile (WCAG guideline)',
        priority: 'critical',
        examples: {
          good: 'Buttons and links have min-h-[44px] min-w-[44px] on mobile',
        },
      },
      {
        id: 'rd-5',
        description: 'Text scales appropriately (base-sm mobile, base desktop)',
        priority: 'important',
        examples: {
          good: 'text-sm md:text-base',
        },
      },
      {
        id: 'rd-6',
        description: 'No horizontal scroll on any viewport',
        priority: 'critical',
        examples: {
          good: 'max-w-full overflow-x-hidden on containers',
        },
      },
      {
        id: 'rd-7',
        description: 'Images responsive (max-w-full h-auto)',
        priority: 'critical',
        examples: {
          good: '<img className="max-w-full h-auto" />',
        },
      },
    ],
  },

  {
    name: 'Code Quality & Maintainability',
    description: 'Ensure code is clean, reusable, and follows best practices',
    items: [
      {
        id: 'cq-1',
        description: 'No hardcoded color values (hex, rgb, hsl)',
        priority: 'critical',
        examples: {
          bad: 'style={{ color: "#ff0000" }}',
          good: 'className="text-red-500"',
        },
      },
      {
        id: 'cq-2',
        description: 'Components are reusable and composable',
        priority: 'important',
        examples: {
          good: 'Extracted Button, Card, Input components with props',
        },
      },
      {
        id: 'cq-3',
        description: 'Clear naming conventions (camelCase, PascalCase, kebab-case)',
        priority: 'important',
        examples: {
          good: 'UserProfileCard, handleSubmit, primary-button',
        },
      },
      {
        id: 'cq-4',
        description: 'Sample data included (never show empty states in demos)',
        priority: 'critical',
        examples: {
          good: 'Populate lists with 3-5 realistic items',
        },
      },
      {
        id: 'cq-5',
        description: 'Proper TypeScript types (no "any" types)',
        priority: 'important',
        examples: {
          bad: 'const data: any = ...',
          good: 'const data: User[] = ...',
        },
      },
      {
        id: 'cq-6',
        description: 'No console.log statements in production code',
        priority: 'nice-to-have',
        examples: {
          good: 'Remove or comment out debugging logs',
        },
      },
      {
        id: 'cq-7',
        description: 'Consistent formatting (2-space indent, single quotes)',
        priority: 'nice-to-have',
        examples: {
          good: 'Use Prettier or ESLint formatting',
        },
      },
      {
        id: 'cq-8',
        description: 'No unused imports or variables',
        priority: 'nice-to-have',
        examples: {
          good: 'Remove unused React imports after refactoring',
        },
      },
    ],
  },

  {
    name: 'Performance & Optimization',
    description: 'Ensure artifact is performant and optimized',
    items: [
      {
        id: 'perf-1',
        description: 'Avoid unnecessary re-renders (useMemo, useCallback)',
        priority: 'important',
        examples: {
          good: 'useMemo for expensive calculations, useCallback for event handlers',
        },
      },
      {
        id: 'perf-2',
        description: 'Lazy load images (loading="lazy")',
        priority: 'nice-to-have',
        examples: {
          good: '<img loading="lazy" />',
        },
      },
      {
        id: 'perf-3',
        description: 'Debounce/throttle expensive operations (search, scroll)',
        priority: 'important',
        examples: {
          good: 'useDebouncedCallback for search input handlers',
        },
      },
      {
        id: 'perf-4',
        description: 'Avoid large bundle sizes (check npm package sizes)',
        priority: 'nice-to-have',
        examples: {
          good: 'Use lightweight alternatives (date-fns over moment.js)',
        },
      },
    ],
  },

  {
    name: 'User Experience',
    description: 'Ensure delightful and intuitive user experience',
    items: [
      {
        id: 'ux-1',
        description: 'Clear visual hierarchy (size, weight, color)',
        priority: 'critical',
        examples: {
          good: 'Headings larger/bolder, primary actions more prominent',
        },
      },
      {
        id: 'ux-2',
        description: 'Feedback for all user actions (click, submit, delete)',
        priority: 'critical',
        examples: {
          good: 'Button shows loading spinner during submission',
        },
      },
      {
        id: 'ux-3',
        description: 'Sensible defaults and pre-filled values',
        priority: 'important',
        examples: {
          good: 'Date picker defaults to today, country defaults to user locale',
        },
      },
      {
        id: 'ux-4',
        description: 'Helpful microcopy and labels',
        priority: 'important',
        examples: {
          good: '"Save draft" instead of just "Save", "Delete forever" instead of "Delete"',
        },
      },
      {
        id: 'ux-5',
        description: 'Confirmation for destructive actions',
        priority: 'critical',
        examples: {
          good: 'Modal dialog: "Are you sure you want to delete this item?"',
        },
      },
      {
        id: 'ux-6',
        description: 'Smooth animations (250ms or less for interactions)',
        priority: 'nice-to-have',
        examples: {
          good: 'transition-all duration-200',
        },
      },
      {
        id: 'ux-7',
        description: 'Logical tab order and focus flow',
        priority: 'important',
        examples: {
          good: 'Form fields in natural reading order, modal traps focus',
        },
      },
    ],
  },

  {
    name: 'Content & Copy',
    description: 'Ensure content is clear, concise, and helpful',
    items: [
      {
        id: 'content-1',
        description: 'No placeholder text (Lorem ipsum) in demos',
        priority: 'critical',
        examples: {
          good: 'Use realistic sample content relevant to domain',
        },
      },
      {
        id: 'content-2',
        description: 'Error messages actionable and specific',
        priority: 'critical',
        examples: {
          bad: '"Error occurred"',
          good: '"Email address is invalid. Please check and try again."',
        },
      },
      {
        id: 'content-3',
        description: 'Consistent tone and voice',
        priority: 'important',
        examples: {
          good: 'Formal throughout or casual throughout, not mixed',
        },
      },
      {
        id: 'content-4',
        description: 'Proper capitalization (title case for headings, sentence case for body)',
        priority: 'nice-to-have',
        examples: {
          good: '"Create New Project" (heading) vs "Enter project name" (label)',
        },
      },
    ],
  },

  {
    name: 'Security & Data Handling',
    description: 'Ensure artifact follows security best practices',
    items: [
      {
        id: 'sec-1',
        description: 'No hardcoded sensitive data (API keys, tokens, passwords)',
        priority: 'critical',
        examples: {
          good: 'Use environment variables or placeholder comments',
        },
      },
      {
        id: 'sec-2',
        description: 'Input validation and sanitization',
        priority: 'important',
        examples: {
          good: 'Validate email format, sanitize user input before rendering',
        },
      },
      {
        id: 'sec-3',
        description: 'Safe rendering (avoid dangerouslySetInnerHTML)',
        priority: 'critical',
        examples: {
          good: 'Use textContent or React children instead of innerHTML',
        },
      },
    ],
  },
];

/**
 * Get total checklist item count
 */
export function getTotalChecklistItems(): number {
  return VERIFICATION_CHECKLIST.reduce(
    (total, category) => total + category.items.length,
    0
  );
}

/**
 * Format entire checklist for injection into system prompt.
 * Returns markdown-formatted checklist string.
 */
export function getChecklistForPrompt(): string {
  let output = '# Artifact Verification Checklist\n\n';
  output +=
    'Before finalizing artifact generation, verify ALL applicable items:\n\n';

  for (const category of VERIFICATION_CHECKLIST) {
    output += `## ${category.name}\n`;
    output += `${category.description}\n\n`;

    const criticalItems = category.items.filter(
      (item) => item.priority === 'critical'
    );
    const importantItems = category.items.filter(
      (item) => item.priority === 'important'
    );
    const niceToHaveItems = category.items.filter(
      (item) => item.priority === 'nice-to-have'
    );

    if (criticalItems.length > 0) {
      output += '**CRITICAL:**\n';
      for (const item of criticalItems) {
        output += `- [ ] ${item.description}\n`;
        if (item.examples) {
          if (item.examples.bad) {
            output += `  - ❌ BAD: \`${item.examples.bad}\`\n`;
          }
          output += `  - ✅ GOOD: \`${item.examples.good}\`\n`;
        }
      }
      output += '\n';
    }

    if (importantItems.length > 0) {
      output += '**IMPORTANT:**\n';
      for (const item of importantItems) {
        output += `- [ ] ${item.description}\n`;
        if (item.examples?.good) {
          output += `  - ✅ ${item.examples.good}\n`;
        }
      }
      output += '\n';
    }

    if (niceToHaveItems.length > 0) {
      output += '**NICE-TO-HAVE:**\n';
      for (const item of niceToHaveItems) {
        output += `- [ ] ${item.description}\n`;
      }
      output += '\n';
    }
  }

  const totalItems = getTotalChecklistItems();
  output += `\n---\n**Total verification points: ${totalItems}**\n`;

  return output;
}

/**
 * Filter checklist by priority level
 */
export function getChecklistByPriority(
  priority: 'critical' | 'important' | 'nice-to-have'
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  for (const category of VERIFICATION_CHECKLIST) {
    const filteredItems = category.items.filter(
      (item) => item.priority === priority
    );
    items.push(...filteredItems);
  }

  return items;
}

/**
 * Get checklist items for specific category
 */
export function getChecklistByCategory(categoryName: string): ChecklistItem[] {
  if (!categoryName || typeof categoryName !== 'string') {
    console.warn('[verification-checklist] getChecklistByCategory called with invalid categoryName:', categoryName);
    return [];
  }

  const category = VERIFICATION_CHECKLIST.find((c) => c.name === categoryName);

  if (!category) {
    console.warn(
      `[verification-checklist] Category "${categoryName}" not found. ` +
      `Available categories: ${VERIFICATION_CHECKLIST.map(c => c.name).join(', ')}`
    );
    return [];
  }

  return category.items;
}

/**
 * Get critical-only checklist summary for quick reference
 */
export function getCriticalChecklistSummary(): string {
  const criticalItems = getChecklistByPriority('critical');
  let output = '# Critical Verification Points\n\n';
  output += 'These items MUST be verified before artifact delivery:\n\n';

  for (const item of criticalItems) {
    output += `- [ ] ${item.description}\n`;
  }

  output += `\n**Total critical points: ${criticalItems.length}**\n`;

  return output;
}

/**
 * Get category names for navigation/organization
 */
export function getCategoryNames(): string[] {
  return VERIFICATION_CHECKLIST.map((category) => category.name);
}

/**
 * Statistics about checklist composition
 */
export function getChecklistStats() {
  const critical = getChecklistByPriority('critical').length;
  const important = getChecklistByPriority('important').length;
  const niceToHave = getChecklistByPriority('nice-to-have').length;

  return {
    total: critical + important + niceToHave,
    critical,
    important,
    niceToHave,
    categories: VERIFICATION_CHECKLIST.length,
  };
}
