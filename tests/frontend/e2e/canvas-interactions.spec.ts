import { test, expect, Page } from '@playwright/test'
import path from 'path'

const TEST_FILES = {
  markdown: path.join(__dirname, '../../fixtures/sample.md'),
  codeJs: path.join(__dirname, '../../fixtures/sample.js'),
  codePy: path.join(__dirname, '../../fixtures/sample.py'),
  html: path.join(__dirname, '../../fixtures/sample.html'),
  csv: path.join(__dirname, '../../fixtures/data.csv')
}

class CanvasHelper {
  constructor(private page: Page) {}

  async openCanvas() {
    await this.page.locator('[data-testid="canvas-button"]').click()
    await this.page.waitForSelector('[data-testid="canvas-panel"]')
  }

  async switchMode(mode: 'markdown' | 'code' | 'web' | 'sandbox') {
    await this.page.locator(`[role="tab"]:has-text("${mode}")`).click()
    await this.page.waitForTimeout(200) // Wait for mode switch animation
  }

  async getContent() {
    return await this.page.locator('[data-testid="canvas-content"]').textContent()
  }

  async setMarkdownContent(content: string) {
    const textarea = this.page.locator('[data-testid="markdown-editor"] textarea')
    await textarea.fill(content)
  }

  async getMarkdownPreview() {
    return this.page.locator('[data-testid="markdown-preview"]')
  }

  async setCodeContent(content: string) {
    // For Monaco editor, we need to focus and use keyboard
    const editor = this.page.locator('[data-testid="monaco-editor"]')
    await editor.click()
    await this.page.keyboard.press('Control+A')
    await this.page.keyboard.type(content)
  }

  async getCodeContent() {
    return await this.page.locator('[data-testid="monaco-editor"]').textContent()
  }

  async save() {
    await this.page.locator('[data-testid="canvas-save-button"]').click()
  }

  async close() {
    await this.page.locator('[data-testid="canvas-close-button"]').click()
  }

  async createVersion(description?: string) {
    await this.page.locator('[data-testid="create-version-button"]').click()
    
    if (description) {
      await this.page.locator('[data-testid="version-description-input"]').fill(description)
      await this.page.locator('[data-testid="save-version-button"]').click()
    }
  }

  async openVersionHistory() {
    await this.page.locator('[data-testid="version-history-button"]').click()
  }

  async selectVersion(versionId: string) {
    await this.page.locator(`[data-testid="version-${versionId}"]`).click()
  }

  async resizeCanvas(deltaX: number) {
    const handle = this.page.locator('[data-testid="resize-handle"]')
    await handle.dragTo(handle, { targetPosition: { x: deltaX, y: 0 } })
  }

  async waitForPreviewUpdate() {
    // Wait for preview to update after content changes
    await this.page.waitForTimeout(300)
  }
}

test.describe('Canvas Interactions', () => {
  let canvas: CanvasHelper

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasHelper(page)
    await page.goto('/chat')
  })

  test.describe('Canvas Opening and Closing', () => {
    test('should open canvas manually', async ({ page }) => {
      await canvas.openCanvas()
      
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      await expect(page.locator('[role="tablist"]')).toBeVisible()
    })

    test('should close canvas with close button', async ({ page }) => {
      await canvas.openCanvas()
      await canvas.close()
      
      await expect(page.locator('[data-testid="canvas-panel"]')).not.toBeVisible()
    })

    test('should close canvas with Escape key', async ({ page }) => {
      await canvas.openCanvas()
      await page.keyboard.press('Escape')
      
      await expect(page.locator('[data-testid="canvas-panel"]')).not.toBeVisible()
    })

    test('should prompt to save when closing dirty canvas', async ({ page }) => {
      await canvas.openCanvas()
      await canvas.setMarkdownContent('# Modified content')
      
      // Mock the confirm dialog
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Save changes?')
        dialog.accept()
      })
      
      await canvas.close()
      
      // Should have attempted to save
      await expect(page.locator('[data-testid="saving-indicator"]')).toBeVisible()
    })
  })

  test.describe('Markdown Mode', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
      await canvas.switchMode('markdown')
    })

    test('should render markdown editor with live preview', async ({ page }) => {
      await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible()
      await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible()
    })

    test('should update preview in real-time', async ({ page }) => {
      const content = '# Hello World\n\nThis is **bold** text.'
      await canvas.setMarkdownContent(content)
      await canvas.waitForPreviewUpdate()
      
      const preview = await canvas.getMarkdownPreview()
      await expect(preview.locator('h1')).toHaveText('Hello World')
      await expect(preview.locator('strong')).toHaveText('bold')
    })

    test('should handle complex markdown syntax', async ({ page }) => {
      const content = `
# Main Title

## Subtitle

- List item 1
- List item 2

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

> This is a blockquote

[Link text](https://example.com)

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`
      
      await canvas.setMarkdownContent(content)
      await canvas.waitForPreviewUpdate()
      
      const preview = await canvas.getMarkdownPreview()
      await expect(preview.locator('h1')).toContainText('Main Title')
      await expect(preview.locator('h2')).toContainText('Subtitle')
      await expect(preview.locator('ul li')).toHaveCount(2)
      await expect(preview.locator('pre code')).toBeVisible()
      await expect(preview.locator('blockquote')).toBeVisible()
      await expect(preview.locator('a')).toHaveAttribute('href', 'https://example.com')
      await expect(preview.locator('table')).toBeVisible()
    })

    test('should support markdown shortcuts', async ({ page }) => {
      const textarea = page.locator('[data-testid="markdown-editor"] textarea')
      await textarea.focus()
      
      // Test bold shortcut
      await page.keyboard.press('Control+b')
      await page.keyboard.type('bold text')
      await page.keyboard.press('Control+b')
      
      const content = await textarea.inputValue()
      expect(content).toContain('**bold text**')
    })

    test('should handle large markdown documents', async ({ page }) => {
      // Generate large content
      const sections = Array.from({ length: 100 }, (_, i) => 
        `## Section ${i + 1}\n\nContent for section ${i + 1} with some **bold** text and a [link](https://example.com).`
      ).join('\n\n')
      
      await canvas.setMarkdownContent(sections)
      await canvas.waitForPreviewUpdate()
      
      // Should handle large content without performance issues
      const preview = await canvas.getMarkdownPreview()
      await expect(preview.locator('h2')).toHaveCount(100)
      
      // Should be able to scroll
      await preview.scrollIntoViewIfNeeded()
    })
  })

  test.describe('Code Mode', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
      await canvas.switchMode('code')
    })

    test('should render Monaco editor', async ({ page }) => {
      await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible()
    })

    test('should detect language from content', async ({ page }) => {
      // Test JavaScript detection
      await canvas.setCodeContent('function hello() { return "world"; }')
      await expect(page.locator('[data-language="javascript"]')).toBeVisible()
      
      // Test Python detection
      await canvas.setCodeContent('def hello():\n    return "world"')
      await expect(page.locator('[data-language="python"]')).toBeVisible()
      
      // Test HTML detection
      await canvas.setCodeContent('<html><body><h1>Hello</h1></body></html>')
      await expect(page.locator('[data-language="html"]')).toBeVisible()
    })

    test('should provide code completion', async ({ page }) => {
      const editor = page.locator('[data-testid="monaco-editor"]')
      await editor.click()
      
      // Type partial code
      await page.keyboard.type('console.')
      
      // Should show completion popup
      await expect(page.locator('.monaco-editor .suggest-widget')).toBeVisible()
      
      // Should have completion items
      await expect(page.locator('.monaco-list-row')).toHaveCount.greaterThan(0)
    })

    test('should support code formatting', async ({ page }) => {
      const unformattedCode = 'function hello(){console.log("world");}'
      await canvas.setCodeContent(unformattedCode)
      
      // Trigger format command
      await page.keyboard.press('Shift+Alt+F')
      
      // Should format the code
      const formattedContent = await canvas.getCodeContent()
      expect(formattedContent).toContain('function hello() {')
      expect(formattedContent).toContain('    console.log("world");')
    })

    test('should handle syntax errors gracefully', async ({ page }) => {
      const invalidCode = 'function hello( { return "missing parenthesis" }'
      await canvas.setCodeContent(invalidCode)
      
      // Should show syntax error indicators
      await expect(page.locator('.monaco-editor .squiggly-error')).toBeVisible()
    })

    test('should support multiple programming languages', async ({ page }) => {
      const testCases = [
        {
          language: 'javascript',
          code: 'const result = array.map(item => item * 2);'
        },
        {
          language: 'python', 
          code: 'result = [item * 2 for item in array]'
        },
        {
          language: 'typescript',
          code: 'const result: number[] = array.map((item: number) => item * 2);'
        },
        {
          language: 'html',
          code: '<div class="container"><h1>Hello World</h1></div>'
        },
        {
          language: 'css',
          code: '.container { margin: 0 auto; max-width: 1200px; }'
        }
      ]
      
      for (const testCase of testCases) {
        await canvas.setCodeContent(testCase.code)
        await page.waitForTimeout(500) // Wait for language detection
        
        await expect(page.locator(`[data-language="${testCase.language}"]`)).toBeVisible()
      }
    })
  })

  test.describe('Web Preview Mode', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
      await canvas.switchMode('web')
    })

    test('should render HTML content in iframe', async ({ page }) => {
      const htmlContent = '<h1>Hello World</h1><p>This is a test.</p>'
      
      // Switch to code mode to input HTML
      await canvas.switchMode('code')
      await canvas.setCodeContent(htmlContent)
      
      // Switch back to web preview
      await canvas.switchMode('web')
      
      const iframe = page.locator('[data-testid="web-preview-iframe"]')
      await expect(iframe).toBeVisible()
      
      // Check iframe content
      await expect(iframe).toHaveAttribute('srcdoc', htmlContent)
    })

    test('should handle interactive HTML content', async ({ page }) => {
      const interactiveHTML = `
        <button id="testBtn" onclick="this.textContent='Clicked!'">Click me</button>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            console.log('Preview loaded');
          });
        </script>
      `
      
      await canvas.switchMode('code')
      await canvas.setCodeContent(interactiveHTML)
      await canvas.switchMode('web')
      
      const iframe = page.locator('[data-testid="web-preview-iframe"]')
      
      // Interact with content inside iframe
      const button = iframe.contentFrame().locator('#testBtn')
      await button.click()
      await expect(button).toHaveText('Clicked!')
    })

    test('should update preview when content changes', async ({ page }) => {
      await canvas.switchMode('code')
      await canvas.setCodeContent('<h1>Initial</h1>')
      await canvas.switchMode('web')
      
      let iframe = page.locator('[data-testid="web-preview-iframe"]')
      await expect(iframe.contentFrame().locator('h1')).toHaveText('Initial')
      
      // Update content
      await canvas.switchMode('code')
      await canvas.setCodeContent('<h1>Updated</h1>')
      await canvas.switchMode('web')
      
      await expect(iframe.contentFrame().locator('h1')).toHaveText('Updated')
    })

    test('should provide edit code button', async ({ page }) => {
      await expect(page.locator('[data-testid="edit-code-button"]')).toBeVisible()
      
      await page.locator('[data-testid="edit-code-button"]').click()
      
      // Should switch to code mode
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Code")')).toBeVisible()
    })
  })

  test.describe('Sandbox Mode', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
      // Simulate agent triggering sandbox mode
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('canvas-open', {
          detail: {
            type: 'sandbox',
            content: '<div id="app">Interactive Demo</div><script>console.log("Sandbox loaded")</script>'
          }
        }))
      })
    })

    test('should render content in sandboxed iframe', async ({ page }) => {
      const iframe = page.locator('[data-testid="sandbox-iframe"]')
      await expect(iframe).toBeVisible()
      await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin')
    })

    test('should be read-only mode', async ({ page }) => {
      // Should not have editable elements
      await expect(page.locator('[data-testid="monaco-editor"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="markdown-editor"]')).not.toBeVisible()
      
      // Edit button should be disabled
      await expect(page.locator('[data-testid="edit-code-button"]')).toBeDisabled()
    })

    test('should handle complex interactive content', async ({ page }) => {
      const complexContent = `
        <div id="app">
          <h1>Interactive Demo</h1>
          <button id="btn">Click Count: 0</button>
          <input id="input" placeholder="Type here">
          <div id="output"></div>
        </div>
        <script>
          let count = 0;
          document.getElementById('btn').onclick = function() {
            count++;
            this.textContent = 'Click Count: ' + count;
          };
          
          document.getElementById('input').oninput = function() {
            document.getElementById('output').textContent = 'You typed: ' + this.value;
          };
        </script>
      `
      
      await page.evaluate((content) => {
        window.dispatchEvent(new CustomEvent('canvas-update', {
          detail: { content }
        }))
      }, complexContent)
      
      const iframe = page.locator('[data-testid="sandbox-iframe"]')
      const button = iframe.contentFrame().locator('#btn')
      const input = iframe.contentFrame().locator('#input')
      const output = iframe.contentFrame().locator('#output')
      
      // Test button interaction
      await button.click()
      await expect(button).toHaveText('Click Count: 1')
      
      // Test input interaction
      await input.fill('Hello World')
      await expect(output).toHaveText('You typed: Hello World')
    })
  })

  test.describe('Canvas Type Switching', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
    })

    test('should switch between markdown and code modes', async ({ page }) => {
      // Start in markdown
      await canvas.setMarkdownContent('# Hello World')
      
      // Switch to code
      await canvas.switchMode('code')
      await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible()
      
      // Content should be converted
      const codeContent = await canvas.getCodeContent()
      expect(codeContent).toContain('# Hello World')
      
      // Switch back to markdown
      await canvas.switchMode('markdown')
      await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible()
    })

    test('should convert content between formats', async ({ page }) => {
      // Start with code
      await canvas.switchMode('code')
      await canvas.setCodeContent('function hello() { return "world"; }')
      
      // Switch to markdown - should wrap in code block
      await canvas.switchMode('markdown')
      const markdownContent = await canvas.getContent()
      expect(markdownContent).toContain('```javascript')
      expect(markdownContent).toContain('function hello()')
      
      // Switch to web preview - should render as HTML
      await canvas.switchMode('web')
      const iframe = page.locator('[data-testid="web-preview-iframe"]')
      await expect(iframe.contentFrame().locator('pre')).toBeVisible()
    })

    test('should preserve content when switching fails', async ({ page }) => {
      await canvas.setMarkdownContent('# Important Content')
      
      // Mock conversion error
      await page.route('**/api/convert-content', (route) => {
        route.fulfill({ status: 500, body: 'Conversion failed' })
      })
      
      await canvas.switchMode('code')
      
      // Should show error but preserve original content
      await expect(page.locator('[data-testid="conversion-error"]')).toBeVisible()
      
      // Switch back to markdown - content should be preserved
      await canvas.switchMode('markdown')
      const content = await canvas.getContent()
      expect(content).toContain('Important Content')
    })
  })

  test.describe('Version Management', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
      await canvas.setMarkdownContent('# Version 1')
      await canvas.save()
    })

    test('should create manual version', async ({ page }) => {
      await canvas.createVersion('Initial version')
      
      await expect(page.locator('[data-testid="version-created-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="version-history-button"]')).toBeVisible()
    })

    test('should show version history', async ({ page }) => {
      await canvas.createVersion('Version 1')
      
      await canvas.setMarkdownContent('# Version 2')
      await canvas.createVersion('Version 2')
      
      await canvas.openVersionHistory()
      
      await expect(page.locator('[data-testid="version-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="version-item"]')).toHaveCount(2)
    })

    test('should load previous version', async ({ page }) => {
      await canvas.createVersion('Version 1')
      const version1Id = await page.locator('[data-testid="version-item"]').first().getAttribute('data-version-id')
      
      await canvas.setMarkdownContent('# Version 2')
      await canvas.createVersion('Version 2')
      
      // Load version 1
      await canvas.openVersionHistory()
      await canvas.selectVersion(version1Id!)
      
      const content = await canvas.getContent()
      expect(content).toContain('Version 1')
    })

    test('should show version diff', async ({ page }) => {
      await canvas.createVersion('Version 1')
      
      await canvas.setMarkdownContent('# Version 2\n\nAdded content')
      await canvas.createVersion('Version 2')
      
      await canvas.openVersionHistory()
      await page.locator('[data-testid="compare-versions-button"]').click()
      
      await expect(page.locator('[data-testid="diff-view"]')).toBeVisible()
      await expect(page.locator('.diff-added')).toContainText('Added content')
    })

    test('should limit version history', async ({ page }) => {
      // Create 60 versions (beyond the 50 limit)
      for (let i = 1; i <= 60; i++) {
        await canvas.setMarkdownContent(`# Version ${i}`)
        await canvas.createVersion(`Version ${i}`)
      }
      
      await canvas.openVersionHistory()
      const versionItems = page.locator('[data-testid="version-item"]')
      
      // Should only show 50 versions
      await expect(versionItems).toHaveCount(50)
      
      // Should show most recent versions
      await expect(versionItems.first()).toContainText('Version 60')
    })
  })

  test.describe('Canvas Resizing', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
    })

    test('should resize canvas panel', async ({ page }) => {
      const canvasPanel = page.locator('[data-testid="canvas-panel"]')
      const initialBox = await canvasPanel.boundingBox()
      
      // Drag resize handle
      await canvas.resizeCanvas(-100)
      
      const newBox = await canvasPanel.boundingBox()
      expect(newBox!.width).toBeLessThan(initialBox!.width)
    })

    test('should respect minimum and maximum sizes', async ({ page }) => {
      // Try to resize below minimum
      await canvas.resizeCanvas(-1000)
      
      const canvasPanel = page.locator('[data-testid="canvas-panel"]')
      const box = await canvasPanel.boundingBox()
      
      // Should not go below 30% of viewport
      const viewportSize = page.viewportSize()!
      expect(box!.width).toBeGreaterThan(viewportSize.width * 0.25)
      
      // Try to resize above maximum
      await canvas.resizeCanvas(1000)
      
      const newBox = await canvasPanel.boundingBox()
      
      // Should not exceed 70% of viewport
      expect(newBox!.width).toBeLessThan(viewportSize.width * 0.75)
    })

    test('should persist resize preferences', async ({ page }) => {
      await canvas.resizeCanvas(-200)
      
      const canvasPanel = page.locator('[data-testid="canvas-panel"]')
      const resizedWidth = (await canvasPanel.boundingBox())!.width
      
      // Close and reopen canvas
      await canvas.close()
      await canvas.openCanvas()
      
      const newWidth = (await canvasPanel.boundingBox())!.width
      
      // Should maintain the same width (within tolerance)
      expect(Math.abs(newWidth - resizedWidth)).toBeLessThan(10)
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
    })

    test('should save with Cmd+S', async ({ page }) => {
      await canvas.setMarkdownContent('# Test content')
      
      await page.keyboard.press('Meta+s')
      
      await expect(page.locator('[data-testid="save-success-toast"]')).toBeVisible()
    })

    test('should create version with Cmd+Shift+S', async ({ page }) => {
      await canvas.setMarkdownContent('# Test content')
      
      await page.keyboard.press('Meta+Shift+s')
      
      await expect(page.locator('[data-testid="create-version-dialog"]')).toBeVisible()
    })

    test('should toggle canvas with Cmd+K', async ({ page }) => {
      await canvas.close()
      
      await page.keyboard.press('Meta+k')
      
      await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
      
      await page.keyboard.press('Meta+k')
      
      await expect(page.locator('[data-testid="canvas-panel"]')).not.toBeVisible()
    })

    test('should switch modes with number keys', async ({ page }) => {
      // 1 for markdown
      await page.keyboard.press('1')
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Markdown")')).toBeVisible()
      
      // 2 for code
      await page.keyboard.press('2')
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Code")')).toBeVisible()
      
      // 3 for web preview
      await page.keyboard.press('3')
      await expect(page.locator('[role="tab"][aria-selected="true"]:has-text("Preview")')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test.beforeEach(async () => {
      await canvas.openCanvas()
    })

    test('should handle save errors', async ({ page }) => {
      await page.route('**/api/canvas/save', (route) => {
        route.fulfill({ status: 500, body: 'Save failed' })
      })
      
      await canvas.setMarkdownContent('# Test content')
      await canvas.save()
      
      await expect(page.locator('[data-testid="save-error-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="canvas-save-button"]')).toBeVisible() // Should remain dirty
    })

    test('should handle version creation errors', async ({ page }) => {
      await page.route('**/api/canvas/versions', (route) => {
        route.fulfill({ status: 500, body: 'Version creation failed' })
      })
      
      await canvas.createVersion('Test version')
      
      await expect(page.locator('[data-testid="version-error-toast"]')).toBeVisible()
    })

    test('should recover from content loss', async ({ page }) => {
      await canvas.setMarkdownContent('# Important content')
      
      // Simulate content loss
      await page.evaluate(() => {
        const editor = document.querySelector('[data-testid="markdown-editor"] textarea') as HTMLTextAreaElement
        if (editor) editor.value = ''
      })
      
      // Should detect content loss and offer recovery
      await expect(page.locator('[data-testid="content-recovery-dialog"]')).toBeVisible()
      
      await page.locator('[data-testid="recover-content-button"]').click()
      
      const recoveredContent = await canvas.getContent()
      expect(recoveredContent).toContain('Important content')
    })
  })
})