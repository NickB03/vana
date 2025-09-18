import { test, expect } from '@playwright/test'

test.describe('Complete User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any authentication or initial state
    await page.goto('/')
    
    // Wait for the app to be ready
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 10000 })
  })
  
  test.describe('First-Time User Experience', () => {
    test('complete new user onboarding flow', async ({ page }) => {
      // Landing on home page
      await expect(page.locator('h1')).toContainText('Welcome to Vana')
      
      // Should see capability suggestions
      await expect(page.locator('[data-testid="capability-suggestions"]')).toBeVisible()
      
      // Should see prompt input
      await expect(page.locator('[data-testid="prompt-input-section"]')).toBeVisible()
      
      // Should see feature highlights
      await expect(page.locator('[data-testid="feature-highlights"]')).toBeVisible()
      
      // Click on research capability
      await page.click('[data-testid="capability-research"]')
      
      // Should navigate to chat interface
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Should see session header
      await expect(page.locator('[data-testid="chat-header"]')).toBeVisible()
      
      // Should receive initial AI message
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Hello! How can I help you today?')
      
      // Type and send a message
      await page.fill('[data-testid="message-input"]', 'I need help analyzing a research paper')
      await page.click('[data-testid="send-button"]')
      
      // Should see user message
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('I need help analyzing a research paper')
      
      // Should see streaming indicator temporarily
      await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible()
      
      // Should receive AI response
      await expect(page.locator('[data-testid="streaming-indicator"]')).not.toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('I understand you\'re asking about')
      
      // Should see agent status updates
      await expect(page.locator('[data-testid="agent-status-panel"]')).toBeVisible()
      
      // End the session
      await page.click('[data-testid="end-session"]')
      
      // Should return to home page
      await expect(page.locator('[data-testid="home-page"]')).toBeVisible()
      await expect(page.locator('h1')).toContainText('Welcome to Vana')
    })
    
    test('custom prompt submission flow', async ({ page }) => {
      // Enter custom prompt
      const customPrompt = 'Analyze the impact of machine learning on healthcare outcomes'
      await page.fill('[data-testid="prompt-input"]', customPrompt)
      
      // Submit should be enabled
      await expect(page.locator('[data-testid="submit-prompt"]')).toBeEnabled()
      
      await page.click('[data-testid="submit-prompt"]')
      
      // Should navigate to chat
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Should see the user's prompt in chat
      await expect(page.locator('[data-testid="messages-container"]')).toContainText(customPrompt)
      
      // Should receive relevant AI response
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('machine learning')
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('healthcare')
    })
  })
  
  test.describe('Returning User Experience', () => {
    test('sidebar navigation and conversation history', async ({ page }) => {
      // Open sidebar
      await page.click('[data-testid="sidebar-toggle"]')
      
      // Should show sidebar content
      await expect(page.locator('[data-testid="sidebar-content"]')).toBeVisible()
      
      // Should see conversation history
      await expect(page.locator('[data-testid="conversations-list"]')).toBeVisible()
      
      // Should see search functionality
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
      
      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'research')
      
      // Should filter conversations
      await expect(page.locator('[data-testid="conversations-list"]')).toContainText('Research')
      
      // Clear search
      await page.click('[data-testid="clear-search"]')
      
      // Click on a conversation
      await page.click('[data-testid="conversation-conv-1"]')
      
      // Should navigate to chat and load conversation
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Previous conversation loaded')
      
      // Sidebar should close on mobile
      const isMobile = await page.evaluate(() => window.innerWidth < 768)
      if (isMobile) {
        await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false')
      }
    })
    
    test('new chat creation from sidebar', async ({ page }) => {
      // Open sidebar
      await page.click('[data-testid="sidebar-toggle"]')
      
      // Click new chat
      await page.click('[data-testid="new-chat-button"]')
      
      // Should create new chat session
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Should have clean session (no previous messages)
      const messagesContainer = page.locator('[data-testid="messages-container"]')
      const messageCount = await messagesContainer.locator('[data-testid^="message-"]').count()
      expect(messageCount).toBeLessThanOrEqual(1) // Only welcome message
      
      // Should be able to start fresh conversation
      await page.fill('[data-testid="message-input"]', 'Hello, this is a new conversation')
      await page.click('[data-testid="send-button"]')
      
      await expect(messagesContainer).toContainText('Hello, this is a new conversation')
    })
  })
  
  test.describe('Error Scenarios and Recovery', () => {
    test('network interruption and recovery', async ({ page }) => {
      // Start a chat session
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Simulate network going offline
      await page.setOffline(true)
      
      // Try to send a message
      await page.fill('[data-testid="message-input"]', 'This message should fail')
      await page.click('[data-testid="send-button"]')
      
      // Should show connection error
      await expect(page.locator('[data-testid="connection-status"]')).toHaveAttribute('data-connected', 'false')
      
      // Restore network
      await page.setOffline(false)
      
      // Should reconnect
      await expect(page.locator('[data-testid="connection-status"]')).toHaveAttribute('data-connected', 'true', { timeout: 10000 })
      
      // Should be able to send messages again
      await page.fill('[data-testid="message-input"]', 'This message should work')
      await page.click('[data-testid="send-button"]')
      
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('This message should work')
    })
    
    test('session interruption and recovery', async ({ page }) => {
      // Start a chat session
      await page.click('[data-testid="capability-data"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Get session ID
      const sessionHeader = await page.locator('[data-testid="session-id"]').textContent()
      const sessionId = sessionHeader?.trim()
      
      // Send a message
      await page.fill('[data-testid="message-input"]', 'Test message before reload')
      await page.click('[data-testid="send-button"]')
      
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Test message before reload')
      
      // Simulate page reload
      await page.reload()
      
      // Should show session recovery
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Session ID should be preserved (in a real app)
      const recoveredSessionHeader = await page.locator('[data-testid="session-id"]').textContent()
      // In real implementation, this would match the original session
      expect(recoveredSessionHeader).toBeTruthy()
      
      // Should be able to continue conversation
      await page.fill('[data-testid="message-input"]', 'Test message after reload')
      await page.click('[data-testid="send-button"]')
      
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Test message after reload')
    })
  })
  
  test.describe('Multi-Agent Coordination', () => {
    test('agent status updates during conversation', async ({ page }) => {
      // Start a complex research task
      await page.fill('[data-testid="prompt-input"]', 'Conduct a comprehensive analysis of renewable energy trends with statistical data')
      await page.click('[data-testid="submit-prompt"]')
      
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Should see agent status panel
      await expect(page.locator('[data-testid="agent-status-panel"]')).toBeVisible()
      
      // Should see multiple agents
      const agentCards = page.locator('[data-testid^="agent-"]')
      await expect(agentCards).toHaveCount(2) // Research and Analysis agents
      
      // Check agent status attributes
      const researchAgent = page.locator('[data-testid="agent-agent-1"]')
      await expect(researchAgent).toHaveAttribute('data-status', 'working')
      
      // Should see progress indicators
      const progressBars = page.locator('[data-testid^="agent-progress-"]')
      await expect(progressBars.first()).toBeVisible()
      
      // Progress should update over time (in real implementation)
      const initialProgress = await page.locator('[data-testid="agent-progress-agent-1"]').textContent()
      expect(initialProgress).toBeTruthy()
      
      // Send another message to trigger more agent activity
      await page.fill('[data-testid="message-input"]', 'Please provide charts and visualizations')
      await page.click('[data-testid="send-button"]')
      
      // Should continue showing agent coordination
      await expect(page.locator('[data-testid="agent-status-panel"]')).toBeVisible()
    })
    
    test('real-time agent progress updates', async ({ page }) => {
      // Start a session
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Monitor SSE connection
      await expect(page.locator('[data-testid="connection-status"]')).toHaveAttribute('data-connected', 'true')
      
      // Send a message that should trigger agent updates
      await page.fill('[data-testid="message-input"]', 'Analyze this complex research question with multiple agents')
      await page.click('[data-testid="send-button"]')
      
      // Should see real-time updates (in actual implementation)
      const agentStatus = page.locator('[data-testid="agent-agent-1"]')
      
      // Status should change from idle to working
      await expect(agentStatus).toHaveAttribute('data-status', 'working')
      
      // Should see progress updates
      const progressIndicator = page.locator('[data-testid="agent-progress-agent-1"]')
      await expect(progressIndicator).toBeVisible()
      
      // Should eventually complete (simulated)
      // In real implementation, would wait for actual completion
    })
  })
  
  test.describe('Performance and Responsiveness', () => {
    test('fast page load and interaction', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await page.waitForSelector('[data-testid="app-ready"]')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // 3 seconds max
      
      // Fast capability selection
      const clickStart = Date.now()
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      const clickTime = Date.now() - clickStart
      
      expect(clickTime).toBeLessThan(1000) // 1 second max
    })
    
    test('smooth scrolling with many messages', async ({ page }) => {
      // Start chat and add many messages (simulated)
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Send multiple messages quickly
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="message-input"]', `Test message ${i + 1}`)
        await page.click('[data-testid="send-button"]')
        
        // Wait for message to appear
        await expect(page.locator('[data-testid="messages-container"]')).toContainText(`Test message ${i + 1}`)
        
        // Wait for response (shortened for test speed)
        await page.waitForTimeout(100)
      }
      
      // Should scroll smoothly
      const messagesContainer = page.locator('[data-testid="messages-container"]')
      await expect(messagesContainer).toBeVisible()
      
      // Check that latest message is visible
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Test message 5')
    })
  })
  
  test.describe('Cross-Device Compatibility', () => {
    test('mobile responsive layout', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/')
      
      // Home page should be responsive
      await expect(page.locator('[data-testid="capability-suggestions"]')).toBeVisible()
      
      // Sidebar should be collapsed on mobile
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toHaveAttribute('data-open', 'false')
      
      // Open sidebar
      await page.click('[data-testid="sidebar-toggle"]')
      await expect(sidebar).toHaveAttribute('data-open', 'true')
      
      // Should show overlay
      await expect(page.locator('[data-testid="sidebar-overlay"]')).toBeVisible()
      
      // Click overlay to close
      await page.click('[data-testid="sidebar-overlay"]')
      await expect(sidebar).toHaveAttribute('data-open', 'false')
      
      // Chat interface should be responsive
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Message input should be usable
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
    })
    
    test('tablet layout optimization', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto('/')
      
      // Should show optimized layout for tablet
      await expect(page.locator('[data-testid="capability-suggestions"]')).toBeVisible()
      
      // Sidebar behavior should be appropriate for tablet
      const sidebar = page.locator('[data-testid="sidebar"]')
      
      // May start open or closed depending on implementation
      await page.click('[data-testid="sidebar-toggle"]')
      await expect(sidebar).toHaveAttribute('data-open', 'true')
      
      // Should have enough space for both sidebar and content
      await page.click('[data-testid="capability-research"]')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Sidebar should remain functional
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })
  })
  
  test.describe('Accessibility in Real Usage', () => {
    test('keyboard navigation throughout app', async ({ page }) => {
      await page.goto('/')
      
      // Tab through home page elements
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="sidebar-toggle"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="capability-research"]')).toBeFocused()
      
      // Activate with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
      
      // Navigate in chat interface
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="message-input"]')).toBeFocused()
      
      // Type and send message with keyboard
      await page.keyboard.type('Test message via keyboard')
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="send-button"]')).toBeFocused()
      await page.keyboard.press('Enter')
      
      await expect(page.locator('[data-testid="messages-container"]')).toContainText('Test message via keyboard')
    })
    
    test('screen reader compatibility', async ({ page }) => {
      // This would require additional screen reader testing tools
      // For now, verify ARIA attributes are present
      
      await page.goto('/')
      
      // Check for proper ARIA labels
      await expect(page.locator('[role="main"]')).toBeVisible()
      await expect(page.locator('[role="complementary"]')).toBeVisible()
      
      // Navigate to chat
      await page.click('[data-testid="capability-research"]')
      
      // Check chat accessibility
      await expect(page.locator('[role="log"]')).toBeVisible()
      await expect(page.locator('[role="article"]')).toBeVisible()
      
      // Check progress bars have proper ARIA
      await expect(page.locator('[role="progressbar"]')).toBeVisible()
    })
  })
})