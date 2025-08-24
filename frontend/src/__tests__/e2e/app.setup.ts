import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/auth/login')

  // Mock the authentication process
  await page.evaluate(() => {
    localStorage.setItem('auth-token', 'mock-test-token')
    localStorage.setItem('user-data', JSON.stringify({
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    }))
  })

  // Verify authentication worked
  await page.goto('/')
  
  // Wait for authenticated state to be loaded
  await page.waitForLoadState('networkidle')

  // End of authentication steps
  await page.context().storageState({ path: authFile })
})