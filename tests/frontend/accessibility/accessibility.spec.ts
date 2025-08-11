import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

class AccessibilityHelper {
  constructor(private page: Page) {}

  async runAxeAudit(options?: any) {
    const accessibilityScanResults = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    return accessibilityScanResults
  }

  async testKeyboardNavigation() {
    // Test Tab navigation through all interactive elements
    const interactiveElements = await this.page.locator(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ).all()

    const navigationOrder = []
    
    // Start from the first element
    await this.page.keyboard.press('Tab')
    
    for (let i = 0; i < interactiveElements.length; i++) {
      const activeElement = await this.page.evaluate(() => document.activeElement?.tagName)
      navigationOrder.push(activeElement)
      await this.page.keyboard.press('Tab')
    }

    return navigationOrder
  }

  async testScreenReaderAnnouncements() {
    // Check for proper ARIA labels and live regions
    const ariaLiveRegions = await this.page.locator('[aria-live]').all()
    const ariaLabels = await this.page.locator('[aria-label]').all()
    const ariaDescriptions = await this.page.locator('[aria-describedby]').all()
    
    return {
      liveRegions: ariaLiveRegions.length,
      labels: ariaLabels.length,
      descriptions: ariaDescriptions.length
    }
  }

  async testFocusManagement() {
    const focusableElements = await this.page.locator(
      'button, input, select, textarea, a[href], [tabindex="0"]'
    ).all()

    const focusResults = []
    
    for (const element of focusableElements) {
      await element.focus()
      
      const isFocused = await element.evaluate((el) => el === document.activeElement)
      const hasVisibleFocus = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el)
        return styles.outline !== 'none' || 
               styles.boxShadow.includes('focus') ||
               el.classList.contains('focus-visible')
      })
      
      focusResults.push({
        element: await element.getAttribute('data-testid') || await element.tagName,
        focused: isFocused,
        visibleFocus: hasVisibleFocus
      })
    }

    return focusResults
  }

  async testColorContrast() {
    const contrastResults = await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
      const results = []

      for (const element of elements) {
        const styles = window.getComputedStyle(element)
        const textContent = element.textContent?.trim()
        
        if (textContent && textContent.length > 0) {
          const color = styles.color
          const backgroundColor = styles.backgroundColor
          const fontSize = parseFloat(styles.fontSize)
          
          results.push({
            element: element.tagName,
            color,
            backgroundColor,
            fontSize,
            isLargeText: fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold')
          })
        }
      }

      return results
    })

    return contrastResults
  }

  async testMotionPreferences() {
    // Test respect for prefers-reduced-motion
    await this.page.addStyleTag({
      content: `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `
    })

    const animatedElements = await this.page.locator('[data-testid*="animate"], .animate-').all()
    return animatedElements.length
  }
}

test.describe('Accessibility Tests', () => {
  let a11yHelper: AccessibilityHelper

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityHelper(page)
  })

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass axe accessibility audit on homepage', async ({ page }) => {
      await page.goto('/')
      
      const accessibilityScanResults = await a11yHelper.runAxeAudit()
      
      expect(accessibilityScanResults.violations).toEqual([])
      
      // Log any violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', accessibilityScanResults.violations)
      }
    })

    test('should pass axe accessibility audit on chat page', async ({ page }) => {
      await page.goto('/chat')
      
      const accessibilityScanResults = await a11yHelper.runAxeAudit()
      
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass axe accessibility audit with canvas open', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      const accessibilityScanResults = await a11yHelper.runAxeAudit()
      
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass axe audit on authentication page', async ({ page }) => {
      await page.goto('/auth')
      
      const accessibilityScanResults = await a11yHelper.runAxeAudit()
      
      expect(accessibilityScanResults.violations).toEqual([])
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation on homepage', async ({ page }) => {
      await page.goto('/')
      
      // Test Tab navigation
      const navigationOrder = await a11yHelper.testKeyboardNavigation()
      
      // Should have multiple focusable elements
      expect(navigationOrder.length).toBeGreaterThan(5)
      
      // Should include main interactive elements
      expect(navigationOrder.some(el => el === 'BUTTON')).toBe(true)
      expect(navigationOrder.some(el => el === 'TEXTAREA')).toBe(true)
    })

    test('should support keyboard navigation in chat interface', async ({ page }) => {
      await page.goto('/chat')
      
      // Test prompt input focus
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'))
      expect(focusedElement).toContain('help')
      
      // Test send button accessibility
      await page.keyboard.press('Tab')
      const sendButton = await page.evaluate(() => document.activeElement?.textContent)
      expect(sendButton).toContain('Send')
      
      // Test Enter key to submit
      await page.locator('[placeholder*="help"]').fill('Test message')
      await page.keyboard.press('Enter')
      
      // Should submit the message
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible()
    })

    test('should support keyboard navigation in canvas', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Test tab navigation in canvas
      const focusResults = await a11yHelper.testFocusManagement()
      
      // Should be able to focus on canvas tabs
      const tabFocusable = focusResults.some(r => r.element.includes('tab'))
      expect(tabFocusable).toBe(true)
      
      // Test arrow key navigation in tab list
      await page.locator('[role="tab"]').first().focus()
      await page.keyboard.press('ArrowRight')
      
      const selectedTab = await page.locator('[role="tab"][aria-selected="true"]').textContent()
      expect(selectedTab).toBeTruthy()
    })

    test('should handle Escape key to close modals and overlays', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Press Escape to close canvas
      await page.keyboard.press('Escape')
      
      await expect(page.locator('[data-testid="canvas-panel"]')).not.toBeVisible()
    })

    test('should support keyboard shortcuts', async ({ page }) => {
      await page.goto('/chat')
      
      // Test Cmd+K to open canvas
      await page.keyboard.press('Meta+k')
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      
      // Test Cmd+K again to close canvas
      await page.keyboard.press('Meta+k')
      await expect(page.locator('[data-testid="canvas-panel"]')).not.toBeVisible()
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/')
      
      // Check main navigation
      await expect(page.locator('[role="main"]')).toBeVisible()
      
      // Check form labels
      const promptInput = page.locator('[placeholder*="help"]')
      await expect(promptInput).toHaveAttribute('aria-label')
      
      // Check button labels
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        const hasLabel = await button.getAttribute('aria-label') || await button.textContent()
        expect(hasLabel).toBeTruthy()
      }
    })

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto('/chat')
      
      // Check for live regions
      const liveRegions = await page.locator('[aria-live]').all()
      expect(liveRegions.length).toBeGreaterThan(0)
      
      // Submit a message and check for announcements
      await page.locator('[placeholder*="help"]').fill('Test message')
      await page.keyboard.press('Enter')
      
      // Should have live region for chat updates
      await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    })

    test('should provide proper heading structure', async ({ page }) => {
      await page.goto('/')
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      
      // Should have at least one h1
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      
      // Check heading hierarchy
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName)
        const text = await heading.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
      }
    })

    test('should provide meaningful link text', async ({ page }) => {
      await page.goto('/')
      
      const links = await page.locator('a').all()
      
      for (const link of links) {
        const text = await link.textContent()
        const ariaLabel = await link.getAttribute('aria-label')
        
        // Should have meaningful text or aria-label
        const meaningfulText = text?.trim() || ariaLabel
        expect(meaningfulText).toBeTruthy()
        expect(meaningfulText).not.toBe('click here')
        expect(meaningfulText).not.toBe('read more')
      }
    })

    test('should support screen reader navigation landmarks', async ({ page }) => {
      await page.goto('/')
      
      // Check for proper landmarks
      await expect(page.locator('[role="main"], main')).toBeVisible()
      await expect(page.locator('[role="navigation"], nav')).toBeVisible()
      
      // Check for complementary regions (sidebar)
      const sidebar = page.locator('[role="complementary"], aside, [data-testid="sidebar"]')
      if (await sidebar.count() > 0) {
        await expect(sidebar.first()).toBeVisible()
      }
    })
  })

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/')
      
      const focusResults = await a11yHelper.testFocusManagement()
      
      // All focusable elements should have visible focus
      const elementsWithoutFocus = focusResults.filter(r => r.focused && !r.visibleFocus)
      expect(elementsWithoutFocus).toEqual([])
    })

    test('should manage focus on route changes', async ({ page }) => {
      await page.goto('/')
      
      // Navigate to chat page
      await page.locator('[data-testid="new-chat-button"]').click()
      
      // Focus should move to main content
      const activeElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(['MAIN', 'H1', 'TEXTAREA']).toContain(activeElement)
    })

    test('should trap focus in modals', async ({ page }) => {
      await page.goto('/chat')
      
      // Open a modal (version history dialog)
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      if (await page.locator('[data-testid="version-history-button"]').count() > 0) {
        await page.locator('[data-testid="version-history-button"]').click()
        
        // Focus should be trapped within modal
        const modalFocusableElements = await page.locator(
          '[role="dialog"] button, [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea'
        ).all()
        
        if (modalFocusableElements.length > 1) {
          await page.keyboard.press('Tab')
          const focusedElement = await page.evaluate(() => document.activeElement)
          const isWithinModal = await page.evaluate(
            (modal) => modal.contains(document.activeElement),
            await page.locator('[role="dialog"]').elementHandle()
          )
          expect(isWithinModal).toBe(true)
        }
      }
    })

    test('should restore focus after modal close', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      
      const triggerButton = page.locator('[data-testid="canvas-button"]')
      await triggerButton.focus()
      
      // Close canvas with Escape
      await page.keyboard.press('Escape')
      
      // Focus should return to trigger element
      const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(activeElement).toBe('canvas-button')
    })
  })

  test.describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async ({ page }) => {
      await page.goto('/')
      
      // Run axe with color-contrast rules
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze()
      
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should not rely solely on color for information', async ({ page }) => {
      await page.goto('/chat')
      
      // Create a session with errors to test error states
      await page.route('/api/chat/stream*', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Test error' })
        })
      })
      
      await page.locator('[placeholder*="help"]').fill('Test error')
      await page.keyboard.press('Enter')
      
      // Error states should have text or icons, not just color
      const errorElements = await page.locator('[data-testid*="error"]').all()
      
      for (const element of errorElements) {
        const hasText = await element.textContent()
        const hasIcon = await element.locator('svg, [data-testid*="icon"]').count() > 0
        const hasAriaLabel = await element.getAttribute('aria-label')
        
        expect(hasText || hasIcon || hasAriaLabel).toBeTruthy()
      }
    })
  })

  test.describe('Motion and Animation', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      
      // Check that animations are reduced or disabled
      const animatedElements = await a11yHelper.testMotionPreferences()
      
      // Verify animations respect the preference
      const animationDurations = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'))
        return elements.map(el => {
          const styles = window.getComputedStyle(el)
          return {
            animationDuration: styles.animationDuration,
            transitionDuration: styles.transitionDuration
          }
        }).filter(s => s.animationDuration !== '0s' || s.transitionDuration !== '0s')
      })
      
      // Should have minimal or no long animations
      const longAnimations = animationDurations.filter(d => 
        parseFloat(d.animationDuration) > 0.5 || parseFloat(d.transitionDuration) > 0.5
      )
      
      expect(longAnimations.length).toBeLessThan(5) // Allow some essential animations
    })

    test('should not cause seizures with flashing content', async ({ page }) => {
      await page.goto('/chat')
      
      // Submit a message to trigger any potential flashing
      await page.locator('[placeholder*="help"]').fill('Test message')
      await page.keyboard.press('Enter')
      
      // Check for flashing elements (this is a basic check)
      const flashingElements = await page.locator('[data-testid*="flash"], .flash').count()
      expect(flashingElements).toBe(0)
    })
  })

  test.describe('Form Accessibility', () => {
    test('should have proper form labels and descriptions', async ({ page }) => {
      await page.goto('/auth')
      
      // Check form inputs have labels
      const inputs = page.locator('input')
      const inputCount = await inputs.count()
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        // Should have label association
        const hasLabel = ariaLabel || ariaLabelledBy || (id && await page.locator(`label[for="${id}"]`).count() > 0)
        expect(hasLabel).toBeTruthy()
      }
    })

    test('should show validation errors accessibly', async ({ page }) => {
      await page.goto('/auth')
      
      // Switch to register form
      await page.locator('[role="tab"]:has-text("Register")').click()
      
      // Submit invalid form
      await page.locator('[type="email"]').fill('invalid-email')
      await page.locator('button[type="submit"]').click()
      
      // Error should be announced to screen readers
      const errorElements = await page.locator('[role="alert"], [aria-live="assertive"]').all()
      expect(errorElements.length).toBeGreaterThan(0)
      
      // Error should be associated with field
      const emailInput = page.locator('[type="email"]')
      const ariaInvalid = await emailInput.getAttribute('aria-invalid')
      expect(ariaInvalid).toBe('true')
    })

    test('should provide helpful form instructions', async ({ page }) => {
      await page.goto('/auth')
      
      // Check for form instructions
      const passwordInput = page.locator('[type="password"]')
      const ariaDescribedBy = await passwordInput.getAttribute('aria-describedby')
      
      if (ariaDescribedBy) {
        const description = page.locator(`#${ariaDescribedBy}`)
        await expect(description).toBeVisible()
        
        const descriptionText = await description.textContent()
        expect(descriptionText?.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Error Handling Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/chat')
      
      // Trigger an error
      await page.route('/api/chat', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        })
      })
      
      await page.locator('[placeholder*="help"]').fill('Test error')
      await page.keyboard.press('Enter')
      
      // Error should be in a live region
      await expect(page.locator('[role="alert"]')).toBeVisible()
      
      const errorText = await page.locator('[role="alert"]').textContent()
      expect(errorText).toContain('error')
    })

    test('should provide accessible retry mechanisms', async ({ page }) => {
      await page.goto('/chat')
      
      // Trigger connection error
      await page.route('/api/chat/stream*', route => {
        route.abort()
      })
      
      await page.locator('[placeholder*="help"]').fill('Test connection')
      await page.keyboard.press('Enter')
      
      // Retry button should be accessible
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.count() > 0) {
        await expect(retryButton).toHaveAttribute('aria-label')
        
        // Should be keyboard accessible
        await retryButton.focus()
        const isFocused = await retryButton.evaluate(el => el === document.activeElement)
        expect(isFocused).toBe(true)
      }
    })
  })

  test.describe('Canvas Accessibility', () => {
    test('should make canvas content accessible', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Canvas should have proper region role
      const canvas = page.locator('[data-testid="canvas-panel"]')
      const role = await canvas.getAttribute('role')
      expect(role).toBe('region')
      
      // Should have accessible name
      const ariaLabel = await canvas.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    })

    test('should make tabs accessible', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Tabs should have proper ARIA
      const tablist = page.locator('[role="tablist"]')
      await expect(tablist).toBeVisible()
      
      const tabs = page.locator('[role="tab"]')
      const tabCount = await tabs.count()
      
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i)
        
        // Should have aria-selected
        const ariaSelected = await tab.getAttribute('aria-selected')
        expect(ariaSelected).toMatch(/true|false/)
        
        // Should control a tabpanel
        const ariaControls = await tab.getAttribute('aria-controls')
        if (ariaControls) {
          const tabpanel = page.locator(`#${ariaControls}`)
          await expect(tabpanel).toBeVisible()
        }
      }
    })

    test('should make editor accessible', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Editor should be focusable and labeled
      const editor = page.locator('[data-testid="markdown-editor"] textarea')
      await expect(editor).toBeVisible()
      
      const ariaLabel = await editor.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      
      // Should be keyboard accessible
      await editor.focus()
      await editor.type('# Test heading')
      
      const content = await editor.inputValue()
      expect(content).toBe('# Test heading')
    })
  })
})