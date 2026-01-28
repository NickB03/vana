import type { DemoDataMVP } from './types';

/**
 * Dashboard Demo - Analytics dashboard showcase
 *
 * Shows: User asks for a dashboard → Vana creates interactive analytics dashboard
 * Timeline: ~8 seconds per cycle
 */
export const dashboardDemo: DemoDataMVP = {
  id: 'dashboard',
  name: 'Analytics Dashboard',
  description: 'Build interactive data dashboards with charts and metrics',

  userMessage: 'Create an analytics dashboard with revenue metrics and charts',
  assistantMessage: "I'll build an interactive analytics dashboard with real-time metrics and visualizations.",

  reasoningChunks: [
    'Designing dashboard layout...',
    'Setting up metric cards...',
    'Creating chart components...',
  ],

  timeline: [
    // Phase 1: User message typing (0-1000ms)
    { type: 'user-message', at: 0, duration: 1000 },

    // Phase 2: Thinking starts (1100ms)
    { type: 'thinking-start', at: 1100 },

    // Phase 3: Reasoning chunks (1200-1800ms)
    { type: 'reasoning-chunk', content: 'Designing dashboard layout...', at: 1200 },
    { type: 'reasoning-chunk', content: 'Setting up metric cards...', at: 1500 },
    { type: 'reasoning-chunk', content: 'Creating chart components...', at: 1800 },

    // Phase 4: Thinking ends (2100ms)
    { type: 'thinking-end', at: 2100 },

    // Phase 5: Assistant message (2200-3000ms)
    { type: 'assistant-message', at: 2200, duration: 800 },

    // Phase 6: Artifact appears (3100ms)
    { type: 'artifact-appear', at: 3100 },

    // Phase 7: Hold for viewing (until 8000ms)
    { type: 'hold', at: 3400, until: 8000 },
  ],

  artifact: {
    type: 'react',
    title: 'Analytics Dashboard',
    subtitle: 'React + Charts + Tailwind',
    badge: 'Interactive',
  },

  cycleDuration: 8000,
};
