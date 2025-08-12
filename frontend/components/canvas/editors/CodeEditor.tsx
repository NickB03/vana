'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Copy, 
  Download, 
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check,
  Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

// Language configurations
const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'html', name: 'HTML', ext: '.html' },
  { id: 'css', name: 'CSS', ext: '.css' },
  { id: 'json', name: 'JSON', ext: '.json' },
  { id: 'markdown', name: 'Markdown', ext: '.md' },
  { id: 'sql', name: 'SQL', ext: '.sql' },
  { id: 'bash', name: 'Bash', ext: '.sh' },
  { id: 'yaml', name: 'YAML', ext: '.yml' },
]

// Simple syntax highlighting patterns
const SYNTAX_PATTERNS = {
  javascript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export)\b/g, className: 'text-blue-500' },
    { pattern: /\/\/.*$/gm, className: 'text-gray-500 italic' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'text-gray-500 italic' },
    { pattern: /['"`].*?['"`]/g, className: 'text-green-600' },
    { pattern: /\b\d+\b/g, className: 'text-orange-500' },
  ],
  python: [
    { pattern: /\b(def|class|import|from|if|elif|else|for|while|return|try|except|with|as)\b/g, className: 'text-blue-500' },
    { pattern: /#.*$/gm, className: 'text-gray-500 italic' },
    { pattern: /['"`].*?['"`]/g, className: 'text-green-600' },
    { pattern: /\b\d+\b/g, className: 'text-orange-500' },
  ],
  html: [
    { pattern: /<\/?[a-zA-Z][\s\S]*?>/g, className: 'text-blue-500' },
    { pattern: /<!--[\s\S]*?-->/g, className: 'text-gray-500 italic' },
  ],
  css: [
    { pattern: /[.#]?[a-zA-Z-]+(?=\s*{)/g, className: 'text-blue-500' },
    { pattern: /[a-zA-Z-]+(?=\s*:)/g, className: 'text-purple-500' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'text-gray-500 italic' },
  ],
}

// Detect language from content
function detectLanguage(content: string): string {
  if (content.includes('def ') || content.includes('import ') && content.includes('from ')) return 'python'
  if (content.includes('function ') || content.includes('const ') || content.includes('let ')) return 'javascript'
  if (content.includes('<html>') || content.includes('<!DOCTYPE')) return 'html'
  if (content.includes('{') && content.includes(':') && content.includes(';')) return 'css'
  return 'javascript' // default
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const [language, setLanguage] = useState('javascript')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [output, setOutput] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-detect language based on content
  useEffect(() => {
    if (value) {
      const detected = detectLanguage(value)
      setLanguage(detected)
    }
  }, [value])

  // Format/beautify code
  const formatCode = useCallback(() => {
    if (!value) return
    
    try {
      let formatted = value
      
      // Basic formatting for different languages
      if (language === 'json') {
        formatted = JSON.stringify(JSON.parse(value), null, 2)
      } else {
        // Basic indentation fixing
        const lines = value.split('\n')
        let indent = 0
        formatted = lines.map(line => {
          const trimmed = line.trim()
          if (trimmed.includes('}') || trimmed.includes(']') || trimmed.includes('</')) {
            indent = Math.max(0, indent - 1)
          }
          const indented = '  '.repeat(indent) + trimmed
          if (trimmed.includes('{') || trimmed.includes('[') || trimmed.includes('<') && !trimmed.includes('</')) {
            indent++
          }
          return indented
        }).join('\n')
      }
      
      onChange(formatted)
    } catch (error) {
      console.log('Format failed:', error)
    }
  }, [value, language, onChange])

  // Copy to clipboard
  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log('Copy failed:', error)
    }
  }, [value])

  // Download code as file
  const downloadCode = useCallback(() => {
    const selectedLang = LANGUAGES.find(l => l.id === language)
    const filename = `code${selectedLang?.ext || '.txt'}`
    
    const blob = new Blob([value || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [value, language])

  // Simple code execution (for safe languages)
  const runCode = useCallback(() => {
    if (language === 'javascript') {
      try {
        // Capture console.log
        const logs: string[] = []
        const originalLog = console.log
        console.log = (...args) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '))
        }
        
        // Create a safe evaluation function
        const result = new Function(value || '')()
        console.log = originalLog
        
        const output = logs.length > 0 ? logs.join('\n') : (result !== undefined ? String(result) : 'Code executed successfully')
        setOutput(output)
        setShowOutput(true)
      } catch (error) {
        setOutput(`Error: ${error}`)
        setShowOutput(true)
      }
    }
  }, [value, language])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = (
        value.substring(0, start) +
        '  ' +
        value.substring(end)
      )
      
      onChange(newValue)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode()
    }
  }, [value, onChange, runCode])

  return (
    <div className={cn(
      "flex flex-col bg-gray-900 text-gray-100",
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32 h-8 bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Separator orientation="vertical" className="h-4" />
          
          {/* Action Buttons */}
          {language === 'javascript' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={runCode}
              className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-gray-700"
              title="Run Code (Cmd+Enter)"
            >
              <Play className="w-3 h-3 mr-1" />
              Run
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatCode}
            className="h-8 px-2 hover:bg-gray-700"
            title="Format Code"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="h-8 px-2 hover:bg-gray-700"
            title="Copy Code"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCode}
            className="h-8 px-2 hover:bg-gray-700"
            title="Download File"
          >
            <Download className="w-3 h-3" />
          </Button>
          
          {showOutput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOutput(!showOutput)}
              className="h-8 px-2 hover:bg-gray-700"
              title="Toggle Output"
            >
              <Terminal className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-gray-700 border-gray-600">
            {(value?.length || 0)} chars
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 px-2 hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Panel */}
        <div className={cn(
          "flex flex-col",
          showOutput ? "w-2/3 border-r border-gray-700" : "w-full"
        )}>
          <textarea
            ref={textareaRef}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`// Start coding in ${language}...\n// Press Cmd+Enter to run (JavaScript only)\n// Use Tab for indentation`}
            className="w-full h-full resize-none border-0 bg-gray-900 text-gray-100 p-4 text-sm font-mono focus:outline-none leading-relaxed"
            style={{ 
              fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
              lineHeight: '1.5'
            }}
            spellCheck="false"
          />
        </div>
        
        {/* Output Panel */}
        {showOutput && (
          <div className="w-1/3 flex flex-col bg-gray-800">
            <div className="p-2 border-b border-gray-700 bg-gray-750">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Output</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOutput('')}
                  className="h-6 px-2 text-gray-400 hover:text-gray-200"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-200">
                {output || 'No output yet...'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}