'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Eye,
  Code,
  Palette,
  Zap,
  ExternalLink,
  Download,
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebPreviewProps {
  value: string
  onChange: (value: string) => void
}

type ViewMode = 'code' | 'preview' | 'split'
type CodeTab = 'html' | 'css' | 'js'

// Default template
const DEFAULT_TEMPLATE = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style id="preview-css">
        /* CSS will be injected here */
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello, World!</h1>
        <p>Start building your web page...</p>
        <button onclick="handleClick()">Click me!</button>
    </div>
    <script id="preview-js">
        /* JavaScript will be injected here */
    </script>
</body>
</html>`,
  css: `/* Add your CSS styles here */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 40px 20px;
}

button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
    transition: background 0.3s;
}

button:hover {
    background: #45a049;
}`,
  js: `// Add your JavaScript code here
function handleClick() {
    alert('Hello from the preview!');
    console.log('Button clicked!');
}

// DOM ready handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded!');
});`
}

// Parse the multi-format content
function parseContent(content: string) {
  if (!content.trim()) return DEFAULT_TEMPLATE
  
  // Try to parse as HTML first
  if (content.includes('<html>') || content.includes('<!DOCTYPE')) {
    return {
      html: content,
      css: '',
      js: ''
    }
  }
  
  // Try to parse as structured format
  const sections = {
    html: '',
    css: '',
    js: ''
  }
  
  const htmlMatch = content.match(/<!-- HTML -->[\s\S]*?(?=<!-- CSS -->|<!-- JS -->|$)/)
  const cssMatch = content.match(/\/\* CSS \*\/[\s\S]*?(?=<!-- HTML -->|<!-- JS -->|$)/)
  const jsMatch = content.match(/\/\/ JS[\s\S]*?(?=<!-- HTML -->|\/\* CSS \*\/|$)/)
  
  if (htmlMatch) sections.html = htmlMatch[0].replace('<!-- HTML -->', '').trim()
  if (cssMatch) sections.css = cssMatch[0].replace('/* CSS */', '').trim()
  if (jsMatch) sections.js = jsMatch[0].replace('// JS', '').trim()
  
  // If no structured format detected, treat as HTML
  if (!sections.html && !sections.css && !sections.js) {
    sections.html = content
  }
  
  return sections
}

// Build preview HTML
function buildPreviewHTML(html: string, css: string, js: string): string {
  const baseHTML = html || DEFAULT_TEMPLATE.html
  const finalCSS = css || DEFAULT_TEMPLATE.css
  const finalJS = js || DEFAULT_TEMPLATE.js
  
  // Inject CSS and JS into HTML
  let result = baseHTML
    .replace(/<style[^>]*id=['"]preview-css['"][^>]*>[\s\S]*?<\/style>/i, `<style id="preview-css">${finalCSS}</style>`)
    .replace(/<script[^>]*id=['"]preview-js['"][^>]*>[\s\S]*?<\/script>/i, `<script id="preview-js">${finalJS}</script>`)
  
  // If no placeholders found, add them
  if (!result.includes('preview-css')) {
    result = result.replace(/<\/head>/i, `  <style id="preview-css">${finalCSS}</style>\n</head>`)
  }
  if (!result.includes('preview-js')) {
    result = result.replace(/<\/body>/i, `  <script id="preview-js">${finalJS}</script>\n</body>`)
  }
  
  return result
}

export function WebPreview({ value, onChange }: WebPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [activeTab, setActiveTab] = useState<CodeTab>('html')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  const sections = parseContent(value || '')
  const previewHTML = buildPreviewHTML(sections.html, sections.css, sections.js)
  
  // Update content when sections change
  const updateContent = useCallback((newSections: typeof sections) => {
    const structured = [
      '<!-- HTML -->',
      newSections.html,
      '',
      '/* CSS */',
      newSections.css,
      '',
      '// JS',
      newSections.js
    ].join('\n')
    
    onChange(structured)
  }, [onChange])
  
  const updateSection = useCallback((section: CodeTab, content: string) => {
    const newSections = { ...sections, [section]: content }
    updateContent(newSections)
  }, [sections, updateContent])
  
  // Refresh preview
  const refreshPreview = useCallback(() => {
    setPreviewKey(prev => prev + 1)
  }, [])
  
  // Open in new window
  const openInNewWindow = useCallback(() => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(previewHTML)
      newWindow.document.close()
    }
  }, [previewHTML])
  
  // Download as HTML file
  const downloadHTML = useCallback(() => {
    const blob = new Blob([previewHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preview.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [previewHTML])

  return (
    <div className={cn(
      "flex flex-col",
      isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {/* View Mode Toggles */}
          <div className="flex items-center bg-muted rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('code')}
              className="h-7 px-2"
            >
              <Code className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="h-7 px-2"
            >
              <Code className="w-3 h-3 mr-1" />
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-7 px-2"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-4" />
          
          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            className="h-7 px-2"
            title="Refresh Preview"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={openInNewWindow}
            className="h-7 px-2"
            title="Open in New Window"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadHTML}
            className="h-7 px-2"
            title="Download HTML"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 px-2"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Code Panel */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? "w-1/2 border-r" : "w-full"
          )}>
            {/* Code Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CodeTab)} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start p-1 bg-muted/50">
                <TabsTrigger value="html" className="flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="css" className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  CSS
                </TabsTrigger>
                <TabsTrigger value="js" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  JavaScript
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="html" className="flex-1 m-0">
                <textarea
                  value={sections.html}
                  onChange={(e) => updateSection('html', e.target.value)}
                  placeholder="<!-- Enter your HTML here -->\n<div>\n    <h1>Hello World!</h1>\n</div>"
                  className="w-full h-full resize-none border-0 bg-transparent p-4 text-sm font-mono focus:outline-none leading-relaxed"
                  spellCheck="false"
                />
              </TabsContent>
              
              <TabsContent value="css" className="flex-1 m-0">
                <textarea
                  value={sections.css}
                  onChange={(e) => updateSection('css', e.target.value)}
                  placeholder="/* Enter your CSS here */\nbody {\n    font-family: Arial, sans-serif;\n}"
                  className="w-full h-full resize-none border-0 bg-transparent p-4 text-sm font-mono focus:outline-none leading-relaxed"
                  spellCheck="false"
                />
              </TabsContent>
              
              <TabsContent value="js" className="flex-1 m-0">
                <textarea
                  value={sections.js}
                  onChange={(e) => updateSection('js', e.target.value)}
                  placeholder="// Enter your JavaScript here\nconsole.log('Hello World!');"
                  className="w-full h-full resize-none border-0 bg-transparent p-4 text-sm font-mono focus:outline-none leading-relaxed"
                  spellCheck="false"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? "w-1/2" : "w-full"
          )}>
            <div className="p-2 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
                <Badge variant="outline" className="text-xs">
                  {previewHTML.length} bytes
                </Badge>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                key={previewKey}
                ref={iframeRef}
                srcDoc={previewHTML}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Web Preview"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}