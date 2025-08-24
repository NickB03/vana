import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Global setup that runs before all tests
 * This is where we can perform setup tasks like:
 * - Starting additional services
 * - Creating test databases
 * - Setting up authentication states
 * - Warming up the application
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')

  // Ensure output directories exist
  const outputDirs = [
    'test-results',
    'playwright-report', 
    'coverage',
    '.claude_workspace/reports/screenshots',
  ]

  outputDirs.forEach(dir => {
    const fullPath = path.resolve(dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      console.log(`📁 Created directory: ${dir}`)
    }
  })

  // Warm up the application by visiting it once
  if (config.webServer) {
    console.log('🔥 Warming up the application...')
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Wait for the dev server to be ready
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      
      // Wait for React to hydrate
      await page.waitForSelector('[data-testid="app-ready"], main, #__next', {
        timeout: 10000,
      }).catch(() => {
        // Fallback: just wait a bit for the app to be ready
        console.log('⚠️  App ready selector not found, using timeout fallback')
      })

      console.log('✅ Application warmed up successfully')
    } catch (error) {
      console.warn('⚠️  Failed to warm up application:', error.message)
    } finally {
      await context.close()
      await browser.close()
    }
  }

  // Set up authentication state if needed
  // This is where you'd create authenticated user sessions
  await setupAuthenticationStates()

  console.log('✅ Playwright global setup completed')
}

/**
 * Set up authentication states for different user types
 * This creates browser contexts with pre-authenticated sessions
 */
async function setupAuthenticationStates() {
  const browser = await chromium.launch()
  
  try {
    // Create an authenticated user state
    const userContext = await browser.newContext()
    const userPage = await userContext.newPage()
    
    // Navigate to login page and authenticate
    await userPage.goto('http://localhost:5173/auth/login')
    
    // Mock authentication or perform actual login
    // For testing, we'll inject a mock auth state
    await userPage.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-user-token')
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      }))
    })

    // Save the authentication state
    await userContext.storageState({ 
      path: 'playwright/.auth/user.json' 
    })
    
    await userContext.close()

    // Create an admin user state
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    
    await adminPage.goto('http://localhost:5173/auth/login')
    
    await adminPage.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-admin-token')
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-admin-1',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'admin'
      }))
    })

    await adminContext.storageState({ 
      path: 'playwright/.auth/admin.json' 
    })
    
    await adminContext.close()

    console.log('🔐 Authentication states created')
  } catch (error) {
    console.warn('⚠️  Failed to create authentication states:', error.message)
  } finally {
    await browser.close()
  }
}

export default globalSetup