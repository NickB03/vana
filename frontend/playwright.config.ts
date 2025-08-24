import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Read environment variables from .env.local file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Timeout settings */
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Viewport settings */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Action timeout */
    actionTimeout: 10 * 1000,
    
    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project to start dev server
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // Additional browser configurations
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',
        // Enable additional Chrome features
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
          ],
        },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'msedge' 
      },
      dependencies: ['setup'],
    },

    // Tablet devices
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup'],
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/__tests__/e2e/global.setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/global.teardown.ts'),

  /* Web server configuration - start dev server */
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
      },
    },
    // Optional: Start backend server for full E2E testing
    {
      command: 'cd ../app && make dev-backend',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
      },
    },
  ],

  /* Output directories */
  outputDir: 'test-results/',
  
  /* Test artifacts */
  testConfig: {
    // Custom test configuration
    maxDiffPixels: 100,
    threshold: 0.3,
  },
})