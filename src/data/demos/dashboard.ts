import type { DemoDataMVP } from './types';

/**
 * Frogger Game Demo - Interactive game showcase
 *
 * Shows: User asks for a game → Vana creates playable Frogger
 * Timeline: ~8 seconds per cycle
 */
export const froggerDemo: DemoDataMVP = {
  id: 'frogger',
  name: 'Frogger Game',
  description: 'Build interactive games from a simple prompt',

  userMessage: 'Build me a frogger game I can play',
  assistantMessage: "I'll create a playable Frogger game with keyboard controls and collision detection.",

  reasoningChunks: [
    'Designing game mechanics...',
    'Setting up collision detection...',
    'Adding keyboard controls...',
  ],

  timeline: [
    // Phase 1: User message typing (0-800ms)
    { type: 'user-message', at: 0, duration: 800 },

    // Phase 2: Thinking starts (900ms)
    { type: 'thinking-start', at: 900 },

    // Phase 3: Reasoning chunks (1000-1600ms)
    { type: 'reasoning-chunk', content: 'Designing game mechanics...', at: 1000 },
    { type: 'reasoning-chunk', content: 'Setting up collision detection...', at: 1300 },
    { type: 'reasoning-chunk', content: 'Adding keyboard controls...', at: 1600 },

    // Phase 4: Thinking ends (1900ms)
    { type: 'thinking-end', at: 1900 },

    // Phase 5: Assistant message (2000-2800ms)
    { type: 'assistant-message', at: 2000, duration: 800 },

    // Phase 6: Artifact appears (2900ms)
    { type: 'artifact-appear', at: 2900 },

    // Phase 7: Hold for viewing (until 8000ms)
    { type: 'hold', at: 3200, until: 8000 },
  ],

  artifact: {
    type: 'react',
    title: 'Frogger Game',
    subtitle: 'React + Canvas + Tailwind',
    badge: 'Playable',
  },

  cycleDuration: 8000,
};
