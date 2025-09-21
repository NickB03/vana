import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.test.ts?(x)',
      'tests/performance/**/*.test.ts?(x)',
      'tests/accessibility/**/*.test.ts?(x)',
    ],
  },
})
