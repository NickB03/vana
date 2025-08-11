import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Canvas } from '@/components/canvas/Canvas'
import { useCanvasStore } from '@/stores/canvasStore'
import type { CanvasType } from '@/types'

// Mock stores
vi.mock('@/stores/canvasStore')

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language }: any) => (
    <div data-testid="monaco-editor">
      <textarea
        data-testid="monaco-textarea"
        data-language={language}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}))

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-preview">{children}</div>
  )
}))

describe('Canvas Component', () => {
  let mockCanvasStore: any

  beforeEach(() => {
    mockCanvasStore = {
      isOpen: true,
      activeType: 'markdown' as CanvasType,
      content: '# Hello World',
      title: 'Test Document',
      isDirty: false,
      versions: [],
      currentVersionId: null,
      close: vi.fn(),
      setContent: vi.fn(),
      switchType: vi.fn(),
      save: vi.fn(),
      createVersion: vi.fn(),
      loadVersion: vi.fn()
    }

    vi.mocked(useCanvasStore).mockReturnValue(mockCanvasStore)
  })

  describe('rendering', () => {
    it('should not render when canvas is closed', () => {
      mockCanvasStore.isOpen = false
      render(<Canvas />)
      
      expect(screen.queryByTestId('canvas-panel')).not.toBeInTheDocument()
    })

    it('should render canvas panel when open', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('canvas-panel')).toBeInTheDocument()
      expect(screen.getByTestId('canvas-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('canvas-editor')).toBeInTheDocument()
    })

    it('should show canvas title when available', () => {
      render(<Canvas />)
      
      expect(screen.getByText('Test Document')).toBeInTheDocument()
    })

    it('should show default title when no title is set', () => {
      mockCanvasStore.title = undefined
      render(<Canvas />)
      
      expect(screen.getByText('Canvas')).toBeInTheDocument()
    })
  })

  describe('toolbar functionality', () => {
    it('should render canvas type tabs', () => {
      render(<Canvas />)
      
      expect(screen.getByRole('tab', { name: /markdown/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /code/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument()
    })

    it('should highlight active tab', () => {
      render(<Canvas />)
      
      const markdownTab = screen.getByRole('tab', { name: /markdown/i })
      expect(markdownTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch canvas type when tab clicked', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const codeTab = screen.getByRole('tab', { name: /code/i })
      await user.click(codeTab)
      
      expect(mockCanvasStore.switchType).toHaveBeenCalledWith('code')
    })

    it('should show close button', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('canvas-close-button')).toBeInTheDocument()
    })

    it('should close canvas when close button clicked', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const closeButton = screen.getByTestId('canvas-close-button')
      await user.click(closeButton)
      
      expect(mockCanvasStore.close).toHaveBeenCalled()
    })

    it('should show save button when canvas is dirty', () => {
      mockCanvasStore.isDirty = true
      render(<Canvas />)
      
      expect(screen.getByTestId('canvas-save-button')).toBeInTheDocument()
    })

    it('should not show save button when canvas is clean', () => {
      mockCanvasStore.isDirty = false
      render(<Canvas />)
      
      expect(screen.queryByTestId('canvas-save-button')).not.toBeInTheDocument()
    })

    it('should save canvas when save button clicked', async () => {
      const user = userEvent.setup()
      mockCanvasStore.isDirty = true
      render(<Canvas />)
      
      const saveButton = screen.getByTestId('canvas-save-button')
      await user.click(saveButton)
      
      expect(mockCanvasStore.save).toHaveBeenCalled()
    })
  })

  describe('version history', () => {
    beforeEach(() => {
      mockCanvasStore.versions = [
        {
          id: 'v1',
          timestamp: Date.now() - 3600000,
          content: '# Version 1',
          type: 'markdown',
          author: 'user',
          description: 'Initial version'
        },
        {
          id: 'v2',
          timestamp: Date.now() - 1800000,
          content: '# Version 2',
          type: 'markdown',
          author: 'agent',
          description: 'Agent update'
        }
      ]
    })

    it('should show version history dropdown when versions exist', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('version-history-button')).toBeInTheDocument()
      expect(screen.getByText('Version 2')).toBeInTheDocument()
    })

    it('should not show version history when no versions exist', () => {
      mockCanvasStore.versions = []
      render(<Canvas />)
      
      expect(screen.queryByTestId('version-history-button')).not.toBeInTheDocument()
    })

    it('should open version history dropdown', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const historyButton = screen.getByTestId('version-history-button')
      await user.click(historyButton)
      
      expect(screen.getByText('Initial version')).toBeInTheDocument()
      expect(screen.getByText('Agent update')).toBeInTheDocument()
    })

    it('should load version when clicked', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const historyButton = screen.getByTestId('version-history-button')
      await user.click(historyButton)
      
      const versionItem = screen.getByText('Initial version')
      await user.click(versionItem)
      
      expect(mockCanvasStore.loadVersion).toHaveBeenCalledWith('v1')
    })
  })

  describe('markdown editor mode', () => {
    it('should render markdown editor with preview', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
      expect(screen.getByTestId('markdown-preview')).toBeInTheDocument()
    })

    it('should update content when textarea changes', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const textarea = screen.getByTestId('markdown-textarea')
      await user.clear(textarea)
      await user.type(textarea, '# New Content')
      
      expect(mockCanvasStore.setContent).toHaveBeenCalledWith('# New Content')
    })

    it('should show live preview of markdown content', () => {
      render(<Canvas />)
      
      const preview = screen.getByTestId('markdown-preview')
      expect(preview).toHaveTextContent('# Hello World')
    })

    it('should handle markdown syntax highlighting', () => {
      mockCanvasStore.content = '```javascript\nconsole.log("hello")\n```'
      render(<Canvas />)
      
      expect(screen.getByTestId('code-block')).toBeInTheDocument()
    })
  })

  describe('code editor mode', () => {
    beforeEach(() => {
      mockCanvasStore.activeType = 'code'
      mockCanvasStore.content = 'console.log("hello world")'
    })

    it('should render Monaco editor for code mode', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    it('should detect language from content', () => {
      mockCanvasStore.content = 'def hello():\n    print("hello")'
      render(<Canvas />)
      
      const editor = screen.getByTestId('monaco-textarea')
      expect(editor).toHaveAttribute('data-language', 'python')
    })

    it('should update content when editor changes', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const editor = screen.getByTestId('monaco-textarea')
      await user.clear(editor)
      await user.type(editor, 'const x = 42;')
      
      expect(mockCanvasStore.setContent).toHaveBeenCalledWith('const x = 42;')
    })
  })

  describe('web preview mode', () => {
    beforeEach(() => {
      mockCanvasStore.activeType = 'web'
      mockCanvasStore.content = '<h1>Hello World</h1>'
    })

    it('should render iframe for web preview', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('web-preview-iframe')).toBeInTheDocument()
    })

    it('should inject content into iframe', () => {
      render(<Canvas />)
      
      const iframe = screen.getByTestId('web-preview-iframe')
      expect(iframe).toHaveAttribute('srcdoc', '<h1>Hello World</h1>')
    })

    it('should show edit code button', () => {
      render(<Canvas />)
      
      expect(screen.getByTestId('edit-code-button')).toBeInTheDocument()
    })

    it('should switch to code mode when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<Canvas />)
      
      const editButton = screen.getByTestId('edit-code-button')
      await user.click(editButton)
      
      expect(mockCanvasStore.switchType).toHaveBeenCalledWith('code')
    })
  })

  describe('sandbox mode', () => {
    beforeEach(() => {
      mockCanvasStore.activeType = 'sandbox'
      mockCanvasStore.content = '<div id="app">Interactive Content</div>'
    })

    it('should render sandboxed iframe', () => {
      render(<Canvas />)
      
      const iframe = screen.getByTestId('sandbox-iframe')
      expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin')
    })

    it('should be read-only mode', () => {
      render(<Canvas />)
      
      expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument()
      expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument()
    })

    it('should show disabled edit button for future feature', () => {
      render(<Canvas />)
      
      const editButton = screen.getByTestId('edit-code-button')
      expect(editButton).toBeDisabled()
    })
  })

  describe('keyboard shortcuts', () => {
    it('should save on Cmd+S', async () => {
      render(<Canvas />)
      
      fireEvent.keyDown(document, {
        key: 's',
        metaKey: true,
        preventDefault: vi.fn()
      })
      
      expect(mockCanvasStore.save).toHaveBeenCalled()
    })

    it('should close on Escape', async () => {
      render(<Canvas />)
      
      fireEvent.keyDown(document, {
        key: 'Escape',
        preventDefault: vi.fn()
      })
      
      expect(mockCanvasStore.close).toHaveBeenCalled()
    })

    it('should create version on Cmd+Shift+S', async () => {
      render(<Canvas />)
      
      fireEvent.keyDown(document, {
        key: 's',
        metaKey: true,
        shiftKey: true,
        preventDefault: vi.fn()
      })
      
      expect(mockCanvasStore.createVersion).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Canvas />)
      
      const panel = screen.getByTestId('canvas-panel')
      expect(panel).toHaveAttribute('role', 'region')
      expect(panel).toHaveAttribute('aria-label', 'Canvas Editor')
    })

    it('should support keyboard navigation in tabs', () => {
      render(<Canvas />)
      
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal')
      
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabindex')
      })
    })

    it('should announce content changes to screen readers', () => {
      render(<Canvas />)
      
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('error handling', () => {
    it('should handle save errors gracefully', async () => {
      mockCanvasStore.save.mockRejectedValue(new Error('Save failed'))
      mockCanvasStore.isDirty = true
      
      const user = userEvent.setup()
      render(<Canvas />)
      
      const saveButton = screen.getByTestId('canvas-save-button')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error-toast')).toBeInTheDocument()
      })
    })

    it('should handle type switching errors', async () => {
      mockCanvasStore.switchType.mockImplementation(() => {
        throw new Error('Type switch failed')
      })
      
      const user = userEvent.setup()
      render(<Canvas />)
      
      const codeTab = screen.getByRole('tab', { name: /code/i })
      await user.click(codeTab)
      
      // Should fall back gracefully
      expect(screen.getByTestId('canvas-panel')).toBeInTheDocument()
    })
  })
})