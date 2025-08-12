# Chunk 6: Canvas System (Canvas System Sections)

## 📸 UI REFERENCES

**Primary Reference**: Screenshot 12.10.13 AM.png (Claude Canvas)
- **Layout**: Split-screen design with chat on left, Canvas on right
- **Canvas Interface**:
  - Header toolbar with mode tabs (Markdown, Code, Web, Sandbox)
  - Export button and options dropdown
  - Version history access
  - Close button (X) on top-right
- **Split View**:
  - Resizable panels with drag handle
  - Canvas takes ~40% of screen width
  - Maintains responsiveness on resize
- **Document Rendering**:
  - Clean markdown preview with proper typography
  - Code syntax highlighting
  - Live web preview capability
- **Colors**:
  - Canvas background: #1A1A1A
  - Header toolbar: #2A2A2A
  - Text editor: #131314 with syntax colors
  - Border: #3A3A3A (subtle separator)

**VISUAL VALIDATION CRITERIA**:
✅ Resizable split-screen layout
✅ Mode tabs clearly visible and functional
✅ Document renders properly in all modes
✅ Export functionality easily accessible
✅ Version history sidebar option
✅ Consistent dark theme throughout
✅ Professional editing experience

## 🎨 CRITICAL: The differentiating feature - progressive Canvas that works immediately

### Extracted PRD Content (Canvas System Sections)

```
## 8. Canvas System

### 8.1 Progressive Canvas Architecture

The Canvas system works immediately on the frontend without requiring backend Canvas tools, then progressively enhances when backend support is added.

### 8.2 Canvas Store Implementation

```typescript
// stores/canvasStore.ts
interface CanvasStore {
  // State
  isOpen: boolean
  activeType: 'markdown' | 'code' | 'web' | 'sandbox'
  content: string
  versions: CanvasVersion[]
  isDirty: boolean
  currentVersionId: string | null
  
  // Actions
  open: (type: CanvasType, content?: string) => void
  close: () => void
  setContent: (content: string) => void
  switchType: (newType: CanvasType) => void
  save: () => Promise<void>
  createVersion: (description?: string) => void
  loadVersion: (versionId: string) => void
  convertContent: (fromType: CanvasType, toType: CanvasType) => string
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    immer((set, get) => ({
      isOpen: false,
      activeType: 'markdown',
      content: '',
      versions: [],
      isDirty: false,
      currentVersionId: null,
      
      open: (type, content = '') => {
        set(state => {
          state.isOpen = true
          state.activeType = type
          state.content = content
          state.isDirty = false
        })
      },
      
      setContent: (content) => {
        set(state => {
          state.content = content
          state.isDirty = true
        })
      },
      
      switchType: (newType) => {
        const currentContent = get().content
        const currentType = get().activeType
        const converted = get().convertContent(currentType, newType, currentContent)
        
        set(state => {
          state.activeType = newType
          state.content = converted
        })
      },
      
      convertContent: (fromType, toType, content) => {
        // Markdown to Code: Extract code blocks
        if (fromType === 'markdown' && toType === 'code') {
          const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
          return codeMatch ? codeMatch[1] : content
        }
        
        // Code to Markdown: Wrap in code block
        if (fromType === 'code' && toType === 'markdown') {
          return `\`\`\`javascript\n${content}\n\`\`\``
        }
        
        // Markdown to Web: Convert to HTML
        if (fromType === 'markdown' && toType === 'web') {
          // Use react-markdown's renderer
          return markdownToHtml(content)
        }
        
        return content
      },
      
      createVersion: (description) => {
        const version: CanvasVersion = {
          id: generateId(),
          timestamp: Date.now(),
          content: get().content,
          type: get().activeType,
          author: 'user',
          description: description || 'Manual save'
        }
        
        set(state => {
          state.versions.push(version)
          state.currentVersionId = version.id
          state.isDirty = false
        })
        
        // Persist to localStorage until backend ready
        localStorage.setItem(
          `canvas_versions_${sessionStore.getState().currentSessionId}`,
          JSON.stringify(get().versions)
        )
      }
    })),
    {
      name: 'canvas-storage',
      partialize: (state) => ({
        activeType: state.activeType,
        versions: state.versions.slice(-10) // Keep last 10 versions
      })
    }
  )
)
```

### 8.3 Canvas Components

#### Main Canvas Container
```tsx
// components/canvas/CanvasSystem.tsx
export const CanvasSystem = () => {
  const { isOpen } = useCanvasStore()
  
  if (!isOpen) return null
  
  return (
    <ResizablePanel 
      defaultSize={40} 
      minSize={30} 
      maxSize={70}
      className="border-l bg-background"
    >
      <div className="flex flex-col h-full">
        <CanvasToolbar />
        <CanvasEditor />
        <CanvasStatusBar />
      </div>
    </ResizablePanel>
  )
}
```

#### Canvas Toolbar with Mode Switching
```tsx
// components/canvas/CanvasToolbar.tsx
export const CanvasToolbar = () => {
  const { activeType, switchType, versions, isDirty, save, close } = useCanvasStore()
  
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2">
        <Tabs value={activeType} onValueChange={switchType}>
          <TabsList>
            <TabsTrigger value="markdown">
              <FileText className="h-4 w-4 mr-1" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code className="h-4 w-4 mr-1" />
              Code
            </TabsTrigger>
            <TabsTrigger value="web">
              <Globe className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="sandbox">
              <Play className="h-4 w-4 mr-1" />
              Sandbox
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {versions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <History className="h-4 w-4 mr-1" />
                v{versions.length}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {versions.slice(-5).reverse().map(v => (
                <DropdownMenuItem 
                  key={v.id} 
                  onClick={() => loadVersion(v.id)}
                >
                  {formatRelativeTime(v.timestamp)} - {v.description}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {isDirty && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Unsaved
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={save}
          disabled={!isDirty}
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

#### Mode-Specific Editors

```tsx
// components/canvas/editors/MarkdownEditor.tsx
export const MarkdownEditor = () => {
  const { content, setContent } = useCanvasStore()
  
  return (
    <div className="grid grid-cols-2 h-full">
      <div className="border-r">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-full resize-none font-mono text-sm p-4"
          placeholder="Start writing markdown..."
        />
      </div>
      <ScrollArea className="p-4">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          className="prose prose-invert max-w-none"
        >
          {content}
        </ReactMarkdown>
      </ScrollArea>
    </div>
  )
}

// components/canvas/editors/CodeEditor.tsx
export const CodeEditor = () => {
  const { content, setContent } = useCanvasStore()
  const [language, setLanguage] = useState('javascript')
  
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={content}
      onChange={(value) => setContent(value || '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true
      }}
    />
  )
}
```

### Architecture - Progressive Enhancement Strategy:
```typescript
// Canvas works immediately on frontend
Frontend Canvas → Local Storage → User Editing
                        ↓
                  Backend Ready?
                   /          \
                 No            Yes
                 ↓              ↓
           Continue Local   Sync with Backend
```

### Critical Gap Resolution - Canvas Backend Gap:
```
**Problem**: Backend lacks Canvas-specific tools and endpoints

**Resolution**: Progressive enhancement approach
1. Frontend Canvas works immediately with local storage
2. Agent suggestions open Canvas via SSE events
3. When backend Canvas tools are added, seamless integration

**Implementation**:
```typescript
// Frontend handles Canvas independently
const canvasManager = {
  async save(content: string) {
    // Try backend first
    try {
      await apiClient.saveCanvas(content)
    } catch {
      // Fallback to local storage
      localStorage.setItem('canvas_backup', content)
    }
  }
}
```
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **PROGRESSIVE ENHANCEMENT**: Must work without backend dependency
2. **FOUR MODES**: Markdown, Code, Web Preview, Sandbox - all functional
3. **REAL-TIME CONVERSION**: Seamless switching between modes with content conversion
4. **VERSION HISTORY**: Local versioning with timestamps and descriptions
5. **MONACO EDITOR**: VS Code-quality editing experience for code mode
6. **RESPONSIVE PANELS**: Resizable interface that works on all screen sizes
7. **AUTO-SAVE**: Automatic saving with dirty state indicators

### 🟡 CRITICAL GUARDRAILS
- Canvas must open in under 200ms
- Mode switching preserves content integrity
- Version history limited to 10 entries for performance
- Local storage as primary persistence
- CSP compatible with Monaco Editor
- Mobile-responsive design

### 🟢 SUCCESS CRITERIA
- Canvas opens instantly from any trigger
- All four modes work perfectly
- Content conversion is accurate
- Version history is reliable
- Performance targets are met

## Step-by-Step Implementation Guide

### Phase 1: Canvas Store & Types (45 minutes)

1. **Canvas Types and Interfaces**
   ```typescript
   // lib/canvas/types.ts
   export type CanvasType = 'markdown' | 'code' | 'web' | 'sandbox'
   
   export interface CanvasVersion {
     id: string
     timestamp: number
     content: string
     type: CanvasType
     author: 'user' | 'agent'
     description: string
     metadata?: {
       language?: string
       size: number
       lineCount: number
     }
   }
   
   export interface CanvasState {
     isOpen: boolean
     activeType: CanvasType
     content: string
     title?: string
     language?: string
     versions: CanvasVersion[]
     isDirty: boolean
     currentVersionId: string | null
     lastSaved?: number
     
     // UI state
     showVersionHistory: boolean
     sidebarCollapsed: boolean
     previewMode: boolean
   }
   
   export interface ConversionOptions {
     preserveFormatting?: boolean
     extractCodeBlocks?: boolean
     inferLanguage?: boolean
     addWrapper?: boolean
   }
   ```

2. **Complete Canvas Store**
   ```typescript
   // stores/canvasStore.ts
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'
   import { immer } from 'zustand/middleware/immer'
   import { CanvasState, CanvasType, CanvasVersion, ConversionOptions } from '@/lib/canvas/types'
   import { convertContent, detectLanguage, generateId } from '@/lib/canvas/utils'
   import { useSessionStore } from './sessionStore'
   
   interface CanvasActions {
     // Core actions
     open: (type: CanvasType, content?: string, title?: string) => void
     close: () => void
     setContent: (content: string) => void
     setTitle: (title: string) => void
     setLanguage: (language: string) => void
     
     // Mode switching
     switchType: (newType: CanvasType, options?: ConversionOptions) => void
     
     // Version management
     createVersion: (description?: string) => string
     loadVersion: (versionId: string) => void
     deleteVersion: (versionId: string) => void
     getVersionHistory: () => CanvasVersion[]
     
     // Persistence
     save: (description?: string) => Promise<void>
     autoSave: () => void
     loadFromStorage: (sessionId: string) => void
     
     // UI state
     toggleVersionHistory: () => void
     toggleSidebar: () => void
     setPreviewMode: (enabled: boolean) => void
     
     // Content operations
     insertAtCursor: (text: string) => void
     replaceSelection: (text: string) => void
     formatContent: () => void
     
     // Utilities
     getContentStats: () => { lines: number; characters: number; words: number }
     exportContent: (format: 'txt' | 'md' | 'html') => string
     importContent: (content: string, type?: CanvasType) => void
   }
   
   export type CanvasStore = CanvasState & CanvasActions
   
   export const useCanvasStore = create<CanvasStore>()(
     persist(
       immer((set, get) => ({
         // Initial state
         isOpen: false,
         activeType: 'markdown',
         content: '',
         title: undefined,
         language: 'javascript',
         versions: [],
         isDirty: false,
         currentVersionId: null,
         lastSaved: undefined,
         showVersionHistory: false,
         sidebarCollapsed: false,
         previewMode: false,
   
         // Core actions
         open: (type, content = '', title) => {
           set(state => {
             state.isOpen = true
             state.activeType = type
             state.content = content
             state.title = title
             state.isDirty = false
             state.previewMode = false
             
             // Auto-detect language for code mode
             if (type === 'code' && content) {
               state.language = detectLanguage(content)
             }
           })
         },
   
         close: () => {
           const state = get()
           
           // Auto-save if dirty
           if (state.isDirty) {
             state.autoSave()
           }
           
           set(state => {
             state.isOpen = false
             state.content = ''
             state.title = undefined
             state.isDirty = false
             state.currentVersionId = null
             state.showVersionHistory = false
           })
         },
   
         setContent: (content) => {
           set(state => {
             state.content = content
             state.isDirty = true
             
             // Auto-detect language for code mode
             if (state.activeType === 'code') {
               state.language = detectLanguage(content)
             }
           })
         },
   
         setTitle: (title) => {
           set(state => {
             state.title = title
             state.isDirty = true
           })
         },
   
         setLanguage: (language) => {
           set(state => {
             state.language = language
             state.isDirty = true
           })
         },
   
         // Mode switching with content conversion
         switchType: (newType, options = {}) => {
           const state = get()
           const currentContent = state.content
           const currentType = state.activeType
           
           if (currentType === newType) return
           
           const converted = convertContent(currentType, newType, currentContent, options)
           
           set(state => {
             state.activeType = newType
             state.content = converted
             state.isDirty = true
             
             // Update language for code mode
             if (newType === 'code') {
               state.language = options.inferLanguage !== false 
                 ? detectLanguage(converted)
                 : state.language
             }
           })
         },
   
         // Version management
         createVersion: (description) => {
           const state = get()
           const version: CanvasVersion = {
             id: generateId(),
             timestamp: Date.now(),
             content: state.content,
             type: state.activeType,
             author: 'user',
             description: description || `${state.activeType} version`,
             metadata: {
               language: state.language,
               size: state.content.length,
               lineCount: state.content.split('\n').length
             }
           }
           
           set(state => {
             // Keep only last 10 versions
             if (state.versions.length >= 10) {
               state.versions = state.versions.slice(-9)
             }
             
             state.versions.push(version)
             state.currentVersionId = version.id
             state.isDirty = false
             state.lastSaved = Date.now()
           })
   
           // Persist to localStorage
           get().saveToStorage()
           
           return version.id
         },
   
         loadVersion: (versionId) => {
           const state = get()
           const version = state.versions.find(v => v.id === versionId)
           
           if (version) {
             set(state => {
               state.content = version.content
               state.activeType = version.type
               state.language = version.metadata?.language || 'javascript'
               state.currentVersionId = versionId
               state.isDirty = false
             })
           }
         },
   
         deleteVersion: (versionId) => {
           set(state => {
             state.versions = state.versions.filter(v => v.id !== versionId)
             if (state.currentVersionId === versionId) {
               state.currentVersionId = null
             }
           })
           
           get().saveToStorage()
         },
   
         getVersionHistory: () => {
           return get().versions.sort((a, b) => b.timestamp - a.timestamp)
         },
   
         // Persistence
         save: async (description) => {
           const state = get()
           
           try {
             // Try backend save first (when available)
             if (window.navigator.onLine) {
               await saveToBackend(state)
             }
           } catch (error) {
             console.warn('Backend save failed, using local storage:', error)
           }
           
           // Always save locally as backup
           get().createVersion(description)
         },
   
         autoSave: () => {
           const state = get()
           if (state.isDirty) {
             get().saveToStorage()
           }
         },
   
         // UI state
         toggleVersionHistory: () => {
           set(state => {
             state.showVersionHistory = !state.showVersionHistory
           })
         },
   
         toggleSidebar: () => {
           set(state => {
             state.sidebarCollapsed = !state.sidebarCollapsed
           })
         },
   
         setPreviewMode: (enabled) => {
           set(state => {
             state.previewMode = enabled
           })
         },
   
         // Content operations
         insertAtCursor: (text) => {
           // This would be implemented with Monaco Editor API
           const state = get()
           set(state => {
             state.content += text // Simplified
             state.isDirty = true
           })
         },
   
         replaceSelection: (text) => {
           // This would be implemented with Monaco Editor API
           const state = get()
           set(state => {
             state.content = text // Simplified
             state.isDirty = true
           })
         },
   
         formatContent: () => {
           const state = get()
           
           // Format based on current type
           switch (state.activeType) {
             case 'code':
               // Use Monaco's format document command
               break
             case 'markdown':
               // Apply markdown formatting
               break
           }
         },
   
         // Utilities
         getContentStats: () => {
           const content = get().content
           return {
             lines: content.split('\n').length,
             characters: content.length,
             words: content.split(/\s+/).filter(w => w.length > 0).length
           }
         },
   
         exportContent: (format) => {
           const state = get()
           
           switch (format) {
             case 'txt':
               return state.content
             case 'md':
               return state.activeType === 'markdown' 
                 ? state.content 
                 : convertContent(state.activeType, 'markdown', state.content)
             case 'html':
               return convertContent(state.activeType, 'web', state.content)
             default:
               return state.content
           }
         },
   
         importContent: (content, type) => {
           set(state => {
             state.content = content
             state.isDirty = true
             
             if (type) {
               state.activeType = type
             }
             
             if (state.activeType === 'code') {
               state.language = detectLanguage(content)
             }
           })
         },
   
         // Storage helpers
         saveToStorage: () => {
           const state = get()
           const sessionId = useSessionStore.getState().currentSessionId
           
           if (sessionId) {
             const storageKey = `canvas_${sessionId}`
             const data = {
               activeType: state.activeType,
               content: state.content,
               title: state.title,
               language: state.language,
               versions: state.versions,
               currentVersionId: state.currentVersionId,
               lastSaved: Date.now()
             }
             
             localStorage.setItem(storageKey, JSON.stringify(data))
           }
         },
   
         loadFromStorage: (sessionId) => {
           const storageKey = `canvas_${sessionId}`
           const stored = localStorage.getItem(storageKey)
           
           if (stored) {
             try {
               const data = JSON.parse(stored)
               set(state => {
                 state.activeType = data.activeType || 'markdown'
                 state.content = data.content || ''
                 state.title = data.title
                 state.language = data.language || 'javascript'
                 state.versions = data.versions || []
                 state.currentVersionId = data.currentVersionId
                 state.lastSaved = data.lastSaved
                 state.isDirty = false
               })
             } catch (error) {
               console.error('Failed to load Canvas from storage:', error)
             }
           }
         }
       })),
       {
         name: 'canvas-storage',
         partialize: (state) => ({
           // Only persist UI preferences
           showVersionHistory: state.showVersionHistory,
           sidebarCollapsed: state.sidebarCollapsed,
           previewMode: state.previewMode
         })
       }
     )
   )
   
   // Helper function for backend saving
   async function saveToBackend(state: CanvasState): Promise<void> {
     // Implementation when backend Canvas API is available
     throw new Error('Backend save not implemented yet')
   }
   ```

### Phase 2: Content Conversion Utilities (30 minutes)

3. **Content Conversion System**
   ```typescript
   // lib/canvas/utils.ts
   import { CanvasType, ConversionOptions } from './types'
   
   export function convertContent(
     fromType: CanvasType,
     toType: CanvasType,
     content: string,
     options: ConversionOptions = {}
   ): string {
     if (fromType === toType) return content
   
     switch (`${fromType}->${toType}`) {
       case 'markdown->code':
         return extractCodeFromMarkdown(content, options)
       
       case 'code->markdown':
         return wrapCodeInMarkdown(content, options)
       
       case 'markdown->web':
         return convertMarkdownToHtml(content, options)
       
       case 'code->web':
         return convertCodeToHtml(content, options)
       
       case 'web->markdown':
         return convertHtmlToMarkdown(content, options)
       
       case 'markdown->sandbox':
         return createSandboxFromMarkdown(content, options)
       
       case 'code->sandbox':
         return createSandboxFromCode(content, options)
       
       default:
         return content
     }
   }
   
   function extractCodeFromMarkdown(content: string, options: ConversionOptions): string {
     if (options.extractCodeBlocks) {
       const codeBlocks = content.match(/```[\w]*\n([\s\S]*?)```/g)
       if (codeBlocks) {
         return codeBlocks
           .map(block => block.replace(/```[\w]*\n/, '').replace(/```$/, ''))
           .join('\n\n')
       }
     }
   
     // Extract first code block
     const match = content.match(/```[\w]*\n([\s\S]*?)```/)
     return match ? match[1].trim() : content
   }
   
   function wrapCodeInMarkdown(content: string, options: ConversionOptions): string {
     const language = options.inferLanguage !== false ? detectLanguage(content) : 'javascript'
     
     if (options.addWrapper) {
       return `# Code\n\n\`\`\`${language}\n${content}\n\`\`\``
     }
     
     return `\`\`\`${language}\n${content}\n\`\`\``
   }
   
   function convertMarkdownToHtml(content: string, options: ConversionOptions): string {
     // Use a lightweight markdown parser or react-markdown
     return `<!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <title>Canvas Preview</title>
     <style>
       body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
       pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
       code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
       blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; }
     </style>
   </head>
   <body>
     ${markdownToHtml(content)}
   </body>
   </html>`
   }
   
   function convertCodeToHtml(content: string, options: ConversionOptions): string {
     const language = options.inferLanguage !== false ? detectLanguage(content) : 'javascript'
     
     return `<!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <title>Code Preview</title>
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-dark.min.css">
     <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-core.min.js"></script>
     <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/plugins/autoloader/prism-autoloader.min.js"></script>
   </head>
   <body>
     <pre><code class="language-${language}">${escapeHtml(content)}</code></pre>
   </body>
   </html>`
   }
   
   function convertHtmlToMarkdown(content: string, options: ConversionOptions): string {
     // Basic HTML to Markdown conversion
     return content
       .replace(/<h1>(.*?)<\/h1>/g, '# $1')
       .replace(/<h2>(.*?)<\/h2>/g, '## $1')
       .replace(/<h3>(.*?)<\/h3>/g, '### $1')
       .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
       .replace(/<em>(.*?)<\/em>/g, '*$1*')
       .replace(/<code>(.*?)<\/code>/g, '`$1`')
       .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```')
       .replace(/<[^>]*>/g, '')
   }
   
   function createSandboxFromMarkdown(content: string, options: ConversionOptions): string {
     // Extract code blocks and create a runnable sandbox
     const codeBlocks = content.match(/```[\w]*\n([\s\S]*?)```/g)
     
     if (codeBlocks) {
       const jsCode = codeBlocks
         .filter(block => block.includes('javascript') || block.includes('js'))
         .map(block => block.replace(/```[\w]*\n/, '').replace(/```$/, ''))
         .join('\n\n')
       
       return createSandboxTemplate(jsCode)
     }
     
     return createSandboxTemplate('')
   }
   
   function createSandboxFromCode(content: string, options: ConversionOptions): string {
     return createSandboxTemplate(content)
   }
   
   function createSandboxTemplate(code: string): string {
     return `<!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <title>Canvas Sandbox</title>
     <style>
       body { margin: 0; padding: 20px; font-family: monospace; }
       #output { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 4px; }
     </style>
   </head>
   <body>
     <div id="output"></div>
     <script>
       const output = document.getElementById('output');
       const originalLog = console.log;
       console.log = (...args) => {
         output.innerHTML += args.join(' ') + '<br>';
         originalLog(...args);
       };
       
       try {
         ${code}
       } catch (error) {
         output.innerHTML += '<span style="color: red;">Error: ' + error.message + '</span>';
       }
     </script>
   </body>
   </html>`
   }
   
   export function detectLanguage(content: string): string {
     // Simple language detection based on content
     if (content.includes('function') && content.includes('{')) return 'javascript'
     if (content.includes('def ') && content.includes(':')) return 'python'
     if (content.includes('#include') || content.includes('int main')) return 'cpp'
     if (content.includes('public class') || content.includes('System.out')) return 'java'
     if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html'
     if (content.includes('{') && content.includes('display:')) return 'css'
     if (content.includes('import React') || content.includes('jsx')) return 'typescript'
     
     return 'javascript'
   }
   
   export function generateId(): string {
     return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
   }
   
   function escapeHtml(text: string): string {
     const div = document.createElement('div')
     div.textContent = text
     return div.innerHTML
   }
   
   function markdownToHtml(markdown: string): string {
     // Basic markdown to HTML conversion
     return markdown
       .replace(/^# (.*$)/gim, '<h1>$1</h1>')
       .replace(/^## (.*$)/gim, '<h2>$1</h2>')
       .replace(/^### (.*$)/gim, '<h3>$1</h3>')
       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
       .replace(/\*(.*?)\*/g, '<em>$1</em>')
       .replace(/`(.*?)`/g, '<code>$1</code>')
       .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
       .replace(/\n/g, '<br>')
   }
   ```

### Phase 3: Canvas UI Components (90 minutes)

4. **Install Required Dependencies**
   ```bash
   npm install @monaco-editor/react
   npm install react-markdown remark-gfm
   npm install dompurify @types/dompurify
   ```

5. **Main Canvas System Component**
   ```typescript
   // components/canvas/CanvasSystem.tsx
   import { useEffect } from 'react'
   import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { useSessionStore } from '@/stores/sessionStore'
   import { CanvasToolbar } from './CanvasToolbar'
   import { CanvasEditor } from './CanvasEditor'
   import { CanvasStatusBar } from './CanvasStatusBar'
   import { VersionHistory } from './VersionHistory'
   
   export const CanvasSystem = () => {
     const { isOpen, showVersionHistory, loadFromStorage } = useCanvasStore()
     const { currentSessionId } = useSessionStore()
   
     // Load Canvas content when session changes
     useEffect(() => {
       if (currentSessionId) {
         loadFromStorage(currentSessionId)
       }
     }, [currentSessionId, loadFromStorage])
   
     if (!isOpen) return null
   
     return (
       <ResizablePanelGroup direction="horizontal" className="border-l bg-background">
         <ResizablePanel 
           defaultSize={showVersionHistory ? 70 : 100}
           minSize={50}
           className="flex flex-col"
         >
           <CanvasToolbar />
           <CanvasEditor />
           <CanvasStatusBar />
         </ResizablePanel>
         
         {showVersionHistory && (
           <>
             <ResizableHandle />
             <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
               <VersionHistory />
             </ResizablePanel>
           </>
         )}
       </ResizablePanelGroup>
     )
   }
   ```

6. **Canvas Toolbar Component**
   ```typescript
   // components/canvas/CanvasToolbar.tsx
   import { Button } from '@/components/ui/button'
   import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
   import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
   import { Badge } from '@/components/ui/badge'
   import { 
     FileText, Code, Globe, Play, History, Save, X, 
     Download, Upload, Settings, Eye, EyeOff 
   } from 'lucide-react'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { formatRelativeTime } from '@/lib/utils/format'
   
   export const CanvasToolbar = () => {
     const {
       activeType,
       switchType,
       versions,
       isDirty,
       save,
       close,
       showVersionHistory,
       toggleVersionHistory,
       previewMode,
       setPreviewMode,
       getVersionHistory,
       title,
       setTitle
     } = useCanvasStore()
   
     const handleSave = async () => {
       try {
         await save('Manual save')
       } catch (error) {
         console.error('Save failed:', error)
       }
     }
   
     const handleExport = (format: 'txt' | 'md' | 'html') => {
       const content = useCanvasStore.getState().exportContent(format)
       const blob = new Blob([content], { type: 'text/plain' })
       const url = URL.createObjectURL(blob)
       const a = document.createElement('a')
       a.href = url
       a.download = `canvas.${format}`
       a.click()
       URL.revokeObjectURL(url)
     }
   
     const versionHistory = getVersionHistory()
   
     return (
       <div className="flex items-center justify-between p-3 border-b bg-muted/20">
         {/* Left side - Mode tabs and controls */}
         <div className="flex items-center gap-3">
           <Tabs value={activeType} onValueChange={switchType}>
             <TabsList className="h-8">
               <TabsTrigger value="markdown" className="text-xs h-7">
                 <FileText className="h-3 w-3 mr-1" />
                 Markdown
               </TabsTrigger>
               <TabsTrigger value="code" className="text-xs h-7">
                 <Code className="h-3 w-3 mr-1" />
                 Code
               </TabsTrigger>
               <TabsTrigger value="web" className="text-xs h-7">
                 <Globe className="h-3 w-3 mr-1" />
                 Preview
               </TabsTrigger>
               <TabsTrigger value="sandbox" className="text-xs h-7">
                 <Play className="h-3 w-3 mr-1" />
                 Sandbox
               </TabsTrigger>
             </TabsList>
           </Tabs>
   
           {/* Version History */}
           {versionHistory.length > 0 && (
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="h-7 text-xs">
                   <History className="h-3 w-3 mr-1" />
                   v{versionHistory.length}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 {versionHistory.slice(0, 5).map(version => (
                   <DropdownMenuItem 
                     key={version.id} 
                     onClick={() => useCanvasStore.getState().loadVersion(version.id)}
                   >
                     <div className="flex flex-col items-start">
                       <div className="text-sm font-medium">
                         {version.description}
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {formatRelativeTime(version.timestamp)} • {version.type}
                       </div>
                     </div>
                   </DropdownMenuItem>
                 ))}
                 {versionHistory.length > 5 && (
                   <DropdownMenuItem onClick={toggleVersionHistory}>
                     View all versions...
                   </DropdownMenuItem>
                 )}
               </DropdownMenuContent>
             </DropdownMenu>
           )}
   
           {/* Preview Mode Toggle */}
           {(activeType === 'markdown' || activeType === 'web') && (
             <Button
               variant="ghost"
               size="sm"
               className="h-7"
               onClick={() => setPreviewMode(!previewMode)}
             >
               {previewMode ? (
                 <EyeOff className="h-3 w-3" />
               ) : (
                 <Eye className="h-3 w-3" />
               )}
             </Button>
           )}
         </div>
   
         {/* Center - Title */}
         {title && (
           <div className="flex-1 text-center">
             <span className="text-sm font-medium truncate max-w-[200px]">
               {title}
             </span>
           </div>
         )}
   
         {/* Right side - Actions */}
         <div className="flex items-center gap-2">
           {/* Dirty indicator */}
           {isDirty && (
             <Badge variant="outline" className="text-xs h-6">
               <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-1" />
               Unsaved
             </Badge>
           )}
   
           {/* Export menu */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="sm" className="h-7">
                 <Download className="h-3 w-3" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent>
               <DropdownMenuItem onClick={() => handleExport('txt')}>
                 Export as Text
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleExport('md')}>
                 Export as Markdown
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => handleExport('html')}>
                 Export as HTML
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
   
           {/* Save button */}
           <Button 
             variant="ghost" 
             size="sm" 
             className="h-7"
             onClick={handleSave}
             disabled={!isDirty}
           >
             <Save className="h-3 w-3" />
           </Button>
   
           {/* Version history toggle */}
           <Button
             variant="ghost"
             size="sm"
             className="h-7"
             onClick={toggleVersionHistory}
           >
             <History className="h-3 w-3" />
           </Button>
   
           {/* Close button */}
           <Button 
             variant="ghost" 
             size="sm" 
             className="h-7"
             onClick={close}
           >
             <X className="h-3 w-3" />
           </Button>
         </div>
       </div>
     )
   }
   ```

### Phase 4: Mode-Specific Editors (60 minutes)

7. **Canvas Editor Container**
   ```typescript
   // components/canvas/CanvasEditor.tsx
   import { useCanvasStore } from '@/stores/canvasStore'
   import { MarkdownEditor } from './editors/MarkdownEditor'
   import { CodeEditor } from './editors/CodeEditor'
   import { WebPreview } from './editors/WebPreview'
   import { SandboxEditor } from './editors/SandboxEditor'
   
   export const CanvasEditor = () => {
     const { activeType } = useCanvasStore()
   
     const renderEditor = () => {
       switch (activeType) {
         case 'markdown':
           return <MarkdownEditor />
         case 'code':
           return <CodeEditor />
         case 'web':
           return <WebPreview />
         case 'sandbox':
           return <SandboxEditor />
         default:
           return <MarkdownEditor />
       }
     }
   
     return (
       <div className="flex-1 min-h-0">
         {renderEditor()}
       </div>
     )
   }
   ```

8. **Markdown Editor with Live Preview**
   ```typescript
   // components/canvas/editors/MarkdownEditor.tsx
   import { useRef, useEffect } from 'react'
   import { Textarea } from '@/components/ui/textarea'
   import { ScrollArea } from '@/components/ui/scroll-area'
   import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
   import ReactMarkdown from 'react-markdown'
   import remarkGfm from 'remark-gfm'
   import { useCanvasStore } from '@/stores/canvasStore'
   
   export const MarkdownEditor = () => {
     const { content, setContent, previewMode } = useCanvasStore()
     const textareaRef = useRef<HTMLTextAreaElement>(null)
   
     // Auto-save periodically
     useEffect(() => {
       const interval = setInterval(() => {
         useCanvasStore.getState().autoSave()
       }, 30000) // Auto-save every 30 seconds
   
       return () => clearInterval(interval)
     }, [])
   
     if (previewMode) {
       return (
         <ScrollArea className="h-full p-6">
           <div className="max-w-4xl mx-auto">
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               className="prose prose-invert max-w-none"
             >
               {content || '*No content yet...*'}
             </ReactMarkdown>
           </div>
         </ScrollArea>
       )
     }
   
     return (
       <ResizablePanelGroup direction="horizontal">
         <ResizablePanel defaultSize={50} minSize={30}>
           <div className="h-full flex flex-col">
             <Textarea
               ref={textareaRef}
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Start writing markdown..."
               className="flex-1 resize-none border-0 font-mono text-sm p-4 focus-visible:ring-0"
             />
           </div>
         </ResizablePanel>
         
         <ResizableHandle />
         
         <ResizablePanel defaultSize={50} minSize={30}>
           <ScrollArea className="h-full p-4 bg-muted/20">
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               className="prose prose-invert max-w-none"
             >
               {content || '*Start typing to see preview...*'}
             </ReactMarkdown>
           </ScrollArea>
         </ResizablePanel>
       </ResizablePanelGroup>
     )
   }
   ```

9. **Monaco Code Editor**
   ```typescript
   // components/canvas/editors/CodeEditor.tsx
   import { useRef, useEffect } from 'react'
   import Editor from '@monaco-editor/react'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { detectLanguage } from '@/lib/canvas/utils'
   
   export const CodeEditor = () => {
     const { content, setContent, language, setLanguage } = useCanvasStore()
     const editorRef = useRef<any>(null)
   
     const handleEditorDidMount = (editor: any, monaco: any) => {
       editorRef.current = editor
       
       // Configure Monaco
       monaco.editor.defineTheme('vana-dark', {
         base: 'vs-dark',
         inherit: true,
         rules: [],
         colors: {
           'editor.background': '#131314',
           'editor.foreground': '#E3E3E3',
           'editorLineNumber.foreground': '#6B7280',
           'editor.selectionBackground': '#3B82F6',
           'editor.inactiveSelectionBackground': '#3B82F620'
         }
       })
       
       monaco.editor.setTheme('vana-dark')
       
       // Add custom commands
       editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
         useCanvasStore.getState().save('Quick save')
       })
     }
   
     const handleEditorChange = (value: string | undefined) => {
       const newContent = value || ''
       setContent(newContent)
       
       // Auto-detect language if content changes significantly
       if (newContent.length > 50) {
         const detectedLang = detectLanguage(newContent)
         if (detectedLang !== language) {
           setLanguage(detectedLang)
         }
       }
     }
   
     // Auto-save periodically
     useEffect(() => {
       const interval = setInterval(() => {
         useCanvasStore.getState().autoSave()
       }, 30000)
   
       return () => clearInterval(interval)
     }, [])
   
     return (
       <div className="h-full">
         <Editor
           height="100%"
           language={language}
           value={content}
           onChange={handleEditorChange}
           onMount={handleEditorDidMount}
           theme="vana-dark"
           options={{
             minimap: { enabled: false },
             fontSize: 14,
             fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
             lineHeight: 1.6,
             wordWrap: 'on',
             automaticLayout: true,
             scrollBeyondLastLine: false,
             renderLineHighlight: 'all',
             selectOnLineNumbers: true,
             matchBrackets: 'always',
             autoIndent: 'full',
             formatOnPaste: true,
             formatOnType: true,
             suggestOnTriggerCharacters: true,
             quickSuggestions: true,
             parameterHints: { enabled: true },
             folding: true,
             foldingHighlight: true,
             unfoldOnClickAfterEndOfLine: true,
             showUnused: true,
             bracketPairColorization: { enabled: true }
           }}
         />
       </div>
     )
   }
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY Canvas component:

1. **Progressive Enhancement**: Does this work without backend dependencies?
2. **Performance**: Will this handle large documents smoothly?
3. **Data Persistence**: Is the versioning system reliable?
4. **Mode Switching**: Does content conversion preserve integrity?
5. **Mobile Experience**: Is this usable on small screens?
6. **Accessibility**: Can this be used with screen readers?
7. **Error Recovery**: What happens when saves fail?

### Extended Reasoning Prompts:
- "What happens if localStorage is full?"
- "How does this handle very large documents (1MB+)?"
- "What if Monaco Editor fails to load?"
- "How does this perform with rapid mode switching?"
- "What happens when the browser crashes?"

## EXACT shadcn/ui Components for Chunk 6

### Required Components:
```bash
resizable    # Canvas panels and layout
tabs         # Mode switching
button       # Actions and controls
dropdown-menu # Version history and options
badge        # Status indicators
textarea     # Markdown editor
scroll-area  # Content scrolling
```

### New Components to Install:
```bash
npx shadcn-ui@latest add resizable
npx shadcn-ui@latest add dropdown-menu
```

### External Dependencies:
```bash
npm install @monaco-editor/react
npm install react-markdown remark-gfm
```

## Real Validation Tests

### Test 1: Progressive Enhancement Test
```bash
# Test Canvas without backend
# Open Canvas in all four modes
# Create content and switch modes
# Verify content conversion works
# Check local storage persistence
```

### Test 2: Performance Test
```bash
# Test with large documents
# Create 10,000+ line markdown file
# Switch between modes rapidly
# Measure rendering performance
# Check memory usage
```

### Test 3: Version History Test
```bash
# Create multiple versions
# Load different versions
# Check content integrity
# Verify localStorage limits
```

### Test 4: Monaco Editor Test
```bash
# Test code editing features
# Syntax highlighting
# Auto-completion
# Keyboard shortcuts
# Theme consistency
```

### Test 5: Mobile Responsiveness Test
```bash
# Test on mobile devices
# Check touch interactions
# Verify scrolling behavior
# Test mode switching on mobile
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** backend dependencies for basic functionality
2. **NO** blocking UI during mode switching
3. **NO** losing content during conversions
4. **NO** missing CSP compliance for Monaco
5. **NO** unlimited version history
6. **NO** synchronous localStorage operations
7. **NO** missing mobile optimizations
8. **NO** non-accessible keyboard shortcuts
9. **NO** hardcoded language detection
10. **NO** missing error boundaries

### 🚫 COMMON MISTAKES:
- Not implementing proper content conversion
- Missing auto-save functionality
- Poor mobile experience
- Not handling Monaco Editor loading failures
- Missing keyboard shortcuts
- Not preserving content on mode switches
- Poor version history UX

### 🚫 ANTI-PATTERNS:
- Making Canvas dependent on backend
- Not implementing progressive enhancement
- Missing proper error handling
- Creating non-responsive layouts
- Not handling large documents
- Missing accessibility features

## Success Completion Criteria

✅ **Canvas System is complete when:**
1. All four modes work perfectly
2. Content conversion is accurate
3. Version history is reliable
4. Performance targets are met
5. Mobile experience is excellent
6. Monaco Editor integrates seamlessly
7. Progressive enhancement works
8. Auto-save is implemented
9. Error handling covers all scenarios
10. Accessibility is fully implemented

---

**Remember**: The Canvas System is Vana's differentiating feature. It must work flawlessly from day one, with or without backend support. Every mode switch, every save, every conversion must be perfect. This is what sets Vana apart from other AI platforms.