import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the home page', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check if the page title is correct
    await expect(page).toHaveTitle(/Vana/)

    // Check if main content is visible
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('should have navigation elements', async ({ page }) => {
    // Check for navigation or header
    const nav = page.locator('nav, header, [role="navigation"]')
    await expect(nav).toBeVisible()
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('main')).toBeVisible()

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('main')).toBeVisible()

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('should handle navigation', async ({ page }) => {
    // Test navigation to different routes if they exist
    const links = page.locator('a[href^="/"]')
    const linkCount = await links.count()

    if (linkCount > 0) {
      // Click the first internal link
      const firstLink = links.first()
      await firstLink.click()
      
      // Wait for navigation
      await page.waitForLoadState('networkidle')
      
      // Verify we navigated somewhere
      const currentUrl = page.url()
      expect(currentUrl).not.toBe('http://localhost:5173/')
    }
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page')
    
    // Should show some kind of error or 404 content
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    // The page should still be functional
    await expect(page.locator('html')).toBeVisible()
  })
})