import { test, expect, Page } from '@playwright/test'
import path from 'path'

const TEST_FILES = {
  markdown: path.join(__dirname, '../../fixtures/test-document.md'),
  pdf: path.join(__dirname, '../../fixtures/test-document.pdf'),
  code: path.join(__dirname, '../../fixtures/test-code.js')
}

class VanaPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async gotoChat() {
    await this.page.goto('/chat')
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  // Homepage interactions
  async getPromptInput() {
    return this.page.locator('[placeholder*="What can I help"]')
  }

  async submitPrompt(text: string) {
    const input = await this.getPromptInput()
    await input.fill(text)
    await input.press('Enter')
  }

  async clickSuggestion(text: string) {
    await this.page.locator(`text="${text}"`).click()
  }

  async clickTool(toolName: string) {
    await this.page.locator(`[data-testid="tool-${toolName.toLowerCase()}"]`).click()
  }

  // Chat interactions
  async waitForAgentResponse() {
    await this.page.waitForSelector('[data-testid="agent-message"]')
  }

  async waitForStreamingComplete() {
    await this.page.waitForSelector('[data-testid="loading-dots"]', { state: 'detached' })
  }

  async getLastMessage() {
    const messages = this.page.locator('[data-testid="message"]')
    return messages.last()
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
  }

  // Canvas interactions
  async openCanvas() {
    await this.page.locator('[data-testid="canvas-button"]').click()
  }

  async waitForCanvasOpen() {
    await this.page.waitForSelector('[data-testid="canvas-panel"]')
  }

  async switchCanvasMode(mode: string) {
    await this.page.locator(`[role="tab"][name*="${mode}"]`).click()
  }

  async getCanvasContent() {
    return this.page.locator('[data-testid="canvas-content"]')
  }

  async editCanvasContent(content: string) {
    const editor = this.page.locator('[data-testid="canvas-editor"] textarea')
    await editor.fill(content)
  }

  async saveCanvas() {
    await this.page.locator('[data-testid="canvas-save-button"]').click()
  }

  // Session management
  async createNewSession() {
    await this.page.locator('[data-testid="new-chat-button"]').click()
  }

  async selectSession(title: string) {
    await this.page.locator(`[data-testid="session-item"]:has-text("${title}")`).click()
  }

  // Authentication
  async signInWithGoogle() {
    await this.page.locator('[data-testid="google-signin"]').click()
  }

  async waitForAuthRedirect() {
    await this.page.waitForURL('**/chat')
  }
}

test.describe('Critical User Flows', () => {
  let vanaPage: VanaPage

  test.beforeEach(async ({ page }) => {
    vanaPage = new VanaPage(page)
    await vanaPage.goto()
    await vanaPage.waitForPageLoad()
  })

  test.describe('Homepage to Chat Flow', () => {
    test('should navigate from homepage to chat with prompt', async ({ page }) => {
      // Start on homepage
      await expect(page.locator('h1:has-text("Hi, I\'m Vana")')).toBeVisible()
      
      // Submit a prompt
      await vanaPage.submitPrompt('Write a simple React component')
      
      // Should navigate to chat
      await expect(page).toHaveURL(/\/chat/)
      
      // Should see the user message
      await expect(page.locator('[data-testid="user-message"]:has-text("Write a simple React component")')).toBeVisible()
      
      // Should get agent response
      await vanaPage.waitForAgentResponse()
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible()
      
      // Should complete streaming
      await vanaPage.waitForStreamingComplete()
    })

    test('should open canvas automatically for appropriate responses', async ({ page }) => {
      // Submit code generation request
      await vanaPage.submitPrompt('Create a React button component with TypeScript')
      
      // Wait for agent to respond
      await vanaPage.waitForAgentResponse()
      await vanaPage.waitForStreamingComplete()
      
      // Canvas should open automatically with code
      await vanaPage.waitForCanvasOpen()
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      
      // Should be in code mode
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Code")')).toBeVisible()
      
      // Should contain code content
      const canvasContent = await vanaPage.getCanvasContent()
      await expect(canvasContent).toContainText('React')
    })

    test('should use suggestion cards', async ({ page }) => {
      // Click on a suggestion card
      await vanaPage.clickSuggestion('Plan a project')
      
      // Should navigate to chat with suggestion text
      await expect(page).toHaveURL(/\/chat/)
      await expect(page.locator('[data-testid="user-message"]:has-text("Plan a project")')).toBeVisible()
      
      // Should get agent response
      await vanaPage.waitForAgentResponse()
    })
  })

  test.describe('Tool-Triggered Sessions', () => {
    test('should start with canvas tool', async ({ page }) => {
      // Click canvas tool on homepage
      await vanaPage.clickTool('Canvas')
      
      // Should navigate to chat
      await expect(page).toHaveURL(/\/chat/)
      
      // Canvas should open immediately
      await vanaPage.waitForCanvasOpen()
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      
      // Should be in markdown mode by default
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Markdown")')).toBeVisible()
    })

    test('should start with code editor tool', async ({ page }) => {
      await vanaPage.clickTool('Code')
      
      await expect(page).toHaveURL(/\/chat/)
      await vanaPage.waitForCanvasOpen()
      
      // Should be in code mode
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Code")')).toBeVisible()
    })
  })

  test.describe('Canvas Interactions', () => {
    test.beforeEach(async () => {
      await vanaPage.gotoChat()
    })

    test('should manually open canvas', async ({ page }) => {
      // Submit a simple prompt
      await vanaPage.submitPrompt('Hello')
      await vanaPage.waitForAgentResponse()
      
      // Manually open canvas
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
    })

    test('should switch between canvas modes', async ({ page }) => {
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      // Start in markdown mode
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Markdown")')).toBeVisible()
      
      // Switch to code mode
      await vanaPage.switchCanvasMode('Code')
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Code")')).toBeVisible()
      
      // Switch to web preview
      await vanaPage.switchCanvasMode('Preview')
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Preview")')).toBeVisible()
    })

    test('should edit and save canvas content', async ({ page }) => {
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      // Edit content
      const testContent = '# My Test Document\n\nThis is a test.'
      await vanaPage.editCanvasContent(testContent)
      
      // Should show dirty indicator and save button
      await expect(page.locator('[data-testid="canvas-save-button"]')).toBeVisible()
      
      // Save content
      await vanaPage.saveCanvas()
      
      // Save button should disappear
      await expect(page.locator('[data-testid="canvas-save-button"]')).not.toBeVisible()
      
      // Content should be preserved
      await expect(vanaPage.getCanvasContent()).toContainText('My Test Document')
    })

    test('should handle canvas resizing', async ({ page }) => {
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      const resizeHandle = page.locator('[data-testid="resize-handle"]')
      const canvasPanel = page.locator('[data-testid="canvas-panel"]')
      
      // Get initial width
      const initialBox = await canvasPanel.boundingBox()
      expect(initialBox).toBeTruthy()
      
      // Drag resize handle
      await resizeHandle.dragTo(resizeHandle, { targetPosition: { x: -100, y: 0 } })
      
      // Width should change
      const newBox = await canvasPanel.boundingBox()
      expect(newBox).toBeTruthy()
      expect(newBox!.width).not.toBe(initialBox!.width)
    })
  })

  test.describe('File Upload Workflows', () => {
    test.beforeEach(async () => {
      await vanaPage.gotoChat()
    })

    test('should upload and auto-open markdown file in canvas', async ({ page }) => {
      // Upload markdown file
      await vanaPage.uploadFile(TEST_FILES.markdown)
      
      // Should auto-open in canvas
      await vanaPage.waitForCanvasOpen()
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      
      // Should be in markdown mode
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Markdown")')).toBeVisible()
      
      // Should contain file content
      const canvasContent = await vanaPage.getCanvasContent()
      await expect(canvasContent).toContainText('#') // Markdown header
    })

    test('should upload multiple files with preview', async ({ page }) => {
      // Upload multiple files
      await page.locator('input[type="file"]').setInputFiles([
        TEST_FILES.markdown,
        TEST_FILES.pdf
      ])
      
      // Should show file previews
      await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(2)
      await expect(page.locator('text="test-document.md"')).toBeVisible()
      await expect(page.locator('text="test-document.pdf"')).toBeVisible()
      
      // Should be able to remove files
      await page.locator('[data-testid="remove-file-0"]').click()
      await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(1)
    })

    test('should handle file upload errors gracefully', async ({ page }) => {
      // Try to upload oversized file (mock)
      await page.route('**/upload', (route) => {
        route.fulfill({
          status: 413,
          body: JSON.stringify({ error: 'File too large' })
        })
      })
      
      await vanaPage.uploadFile(TEST_FILES.pdf)
      
      // Should show error message
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible()
      await expect(page.locator('text="File too large"')).toBeVisible()
    })
  })

  test.describe('Agent Task Management', () => {
    test.beforeEach(async () => {
      await vanaPage.gotoChat()
    })

    test('should show agent task deck for complex requests', async ({ page }) => {
      // Submit complex request that triggers multi-agent workflow
      await vanaPage.submitPrompt('Create a full-stack web application with authentication and database')
      
      // Should show agent task deck
      await expect(page.locator('[data-testid="agent-task-deck"]')).toBeVisible()
      
      // Should show multiple task cards
      await expect(page.locator('[data-testid="task-card"]')).toHaveCount.greaterThan(1)
      
      // Should show task progress
      const taskCards = page.locator('[data-testid="task-card"]')
      for (let i = 0; i < await taskCards.count(); i++) {
        const card = taskCards.nth(i)
        await expect(card.locator('[data-testid="task-status"]')).toBeVisible()
        await expect(card.locator('[data-testid="agent-name"]')).toBeVisible()
      }
    })

    test('should show inline task list when deck is closed', async ({ page }) => {
      await vanaPage.submitPrompt('Analyze this data and create visualizations')
      
      // Close task deck if open
      const deckCloseButton = page.locator('[data-testid="agent-task-deck"] [data-testid="close-button"]')
      if (await deckCloseButton.isVisible()) {
        await deckCloseButton.click()
      }
      
      // Should show inline task list in chat
      await expect(page.locator('[data-testid="inline-task-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="task-item"]')).toHaveCount.greaterThan(0)
    })

    test('should animate completed tasks', async ({ page }) => {
      await vanaPage.submitPrompt('Write and test a function')
      
      // Wait for tasks to appear and complete
      await expect(page.locator('[data-testid="task-card"]')).toBeVisible()
      
      // Wait for task completion animation
      await page.waitForSelector('[data-testid="task-card"][data-status="complete"]')
      
      // Should have completion animation class
      const completedTask = page.locator('[data-testid="task-card"][data-status="complete"]').first()
      await expect(completedTask).toHaveClass(/animate-shuffle/)
    })
  })

  test.describe('Session Management', () => {
    test.beforeEach(async () => {
      await vanaPage.gotoChat()
    })

    test('should create and switch between sessions', async ({ page }) => {
      // Create first session
      await vanaPage.submitPrompt('First session message')
      await vanaPage.waitForAgentResponse()
      
      // Create new session
      await vanaPage.createNewSession()
      
      // Should be in new empty session
      await expect(page.locator('[data-testid="message"]')).toHaveCount(0)
      
      // Add message to new session
      await vanaPage.submitPrompt('Second session message')
      
      // Should see session in sidebar
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(2)
      
      // Switch back to first session
      await vanaPage.selectSession('First session message')
      
      // Should see original message
      await expect(page.locator('text="First session message"')).toBeVisible()
    })

    test('should filter homepage sessions in sidebar', async ({ page }) => {
      // Create session from homepage
      await vanaPage.goto()
      await vanaPage.submitPrompt('Homepage session')
      await vanaPage.waitForAgentResponse()
      
      // Create session from tool
      await vanaPage.goto()
      await vanaPage.clickTool('Canvas')
      await vanaPage.waitForCanvasOpen()
      
      // Check sidebar only shows homepage session
      const sidebarSessions = page.locator('[data-testid="sidebar"] [data-testid="session-item"]')
      await expect(sidebarSessions).toHaveCount(1)
      await expect(sidebarSessions).toContainText('Homepage session')
    })

    test('should persist sessions across page reloads', async ({ page }) => {
      await vanaPage.submitPrompt('Persistent session test')
      await vanaPage.waitForAgentResponse()
      
      const sessionTitle = await page.locator('[data-testid="session-title"]').textContent()
      
      // Reload page
      await page.reload()
      await vanaPage.waitForPageLoad()
      
      // Session should still be available
      await expect(page.locator(`[data-testid="session-item"]:has-text("${sessionTitle}")`)).toBeVisible()
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test.beforeEach(async () => {
      await vanaPage.gotoChat()
    })

    test('should handle SSE connection errors', async ({ page }) => {
      // Mock SSE connection failure
      await page.route('**/chat/stream*', (route) => {
        route.abort('failed')
      })
      
      await vanaPage.submitPrompt('Test connection error')
      
      // Should show error state
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Retry should work
      await page.unroute('**/chat/stream*')
      await page.locator('[data-testid="retry-button"]').click()
      
      await vanaPage.waitForAgentResponse()
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chat', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await vanaPage.submitPrompt('Test API error')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('text="Internal server error"')).toBeVisible()
    })

    test('should recover from canvas save errors', async ({ page }) => {
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      // Mock save error
      await page.route('**/api/canvas/save', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Save failed' })
        })
      })
      
      await vanaPage.editCanvasContent('# Test content')
      await vanaPage.saveCanvas()
      
      // Should show error toast
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible()
      
      // Content should remain dirty
      await expect(page.locator('[data-testid="canvas-save-button"]')).toBeVisible()
    })
  })

  test.describe('Performance Validation', () => {
    test('should load homepage within performance targets', async ({ page }) => {
      const startTime = Date.now()
      
      await vanaPage.goto()
      await vanaPage.waitForPageLoad()
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Check core web vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const fcp = entries.find(entry => entry.name === 'first-contentful-paint')
            const lcp = entries.find(entry => entry.entryType === 'largest-contentful-paint')
            
            resolve({
              fcp: fcp?.startTime,
              lcp: lcp?.startTime
            })
          }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
        })
      })
      
      if (vitals.fcp) {
        expect(vitals.fcp).toBeLessThan(1500) // FCP < 1.5s
      }
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(2500) // LCP < 2.5s
      }
    })

    test('should handle rapid user interactions without lag', async ({ page }) => {
      await vanaPage.openCanvas()
      await vanaPage.waitForCanvasOpen()
      
      // Rapid typing test
      const content = 'a'.repeat(1000)
      const startTime = Date.now()
      
      await vanaPage.editCanvasContent(content)
      
      const typingTime = Date.now() - startTime
      
      // Should handle rapid input within reasonable time
      expect(typingTime).toBeLessThan(1000)
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
    })

    test('should maintain performance with large conversations', async ({ page }) => {
      // Create a session with many messages
      for (let i = 0; i < 10; i++) {
        await vanaPage.submitPrompt(`Message ${i + 1}`)
        await vanaPage.waitForAgentResponse()
      }
      
      // Should still be responsive
      const responseStart = Date.now()
      await vanaPage.submitPrompt('Final message')
      await vanaPage.waitForAgentResponse()
      const responseTime = Date.now() - responseStart
      
      // Should respond within reasonable time even with many messages
      expect(responseTime).toBeLessThan(5000)
    })
  })
})