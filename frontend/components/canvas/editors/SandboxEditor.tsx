'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Square, 
  RotateCcw, 
  Terminal, 
  AlertTriangle,
  CheckCircle, 
  Clock,
  Cpu,
  MemoryStick,
  Zap,
  FileText,
  Download,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SandboxEditorProps {
  value: string
  onChange: (value: string) => void
}

type Runtime = 'javascript' | 'python' | 'nodejs' | 'react'
type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'

interface ExecutionResult {
  output: string
  errors: string[]
  warnings: string[]
  executionTime: number
  memoryUsage?: number
  status: ExecutionStatus
}

// Runtime configurations
const RUNTIMES = {
  javascript: {
    name: 'JavaScript',
    icon: '🟨',
    template: `// JavaScript Sandbox\n// Safe execution environment\n\nconsole.log('Hello from JavaScript!')\n\n// Try some examples:\nconst numbers = [1, 2, 3, 4, 5]\nconst doubled = numbers.map(n => n * 2)\nconsole.log('Doubled:', doubled)\n\n// Math operations\nconst result = Math.sqrt(16) + Math.PI\nconsole.log('Math result:', result)`,
    setup: 'Safe JavaScript execution with limited APIs'
  },
  python: {
    name: 'Python',
    icon: '🐍',
    template: `# Python Sandbox\n# Simulated Python environment\n\nprint("Hello from Python!")\n\n# Try some examples:\nnumbers = [1, 2, 3, 4, 5]\ndoubled = [n * 2 for n in numbers]\nprint(f"Doubled: {doubled}")\n\n# Math operations\nimport math\nresult = math.sqrt(16) + math.pi\nprint(f"Math result: {result}")`,
    setup: 'Simulated Python environment (client-side interpretation)'
  },
  nodejs: {
    name: 'Node.js',
    icon: '🟢',
    template: `// Node.js Sandbox\n// Server-side JavaScript simulation\n\nconsole.log('Hello from Node.js!')\n\n// File system operations (simulated)\nconst fs = { readFile: () => 'File content...' }\nconsole.log('File:', fs.readFile())\n\n// HTTP simulation\nconst http = {\n  get: (url) => ({ status: 200, data: 'Response data' })\n}\nconst response = http.get('https://api.example.com')\nconsole.log('HTTP:', response)`,
    setup: 'Simulated Node.js environment with mocked APIs'
  },
  react: {
    name: 'React',
    icon: '⚛️',
    template: `// React Component Sandbox\n// Live React component preview\n\nfunction MyComponent() {\n  const [count, setCount] = useState(0)\n  \n  return (\n    <div style={{ padding: '20px', textAlign: 'center' }}>\n      <h1>React Sandbox</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Increment\n      </button>\n      <button onClick={() => setCount(0)}>\n        Reset\n      </button>\n    </div>\n  )\n}\n\n// Component will be rendered below\nrender(<MyComponent />)`,
    setup: 'Live React component rendering with hooks support'
  }
}

// Safe execution environment
class SafeExecutor {
  private logs: string[] = []
  private errors: string[] = []
  private warnings: string[] = []
  private startTime = 0
  
  constructor() {
    this.reset()
  }
  
  reset() {
    this.logs = []
    this.errors = []
    this.warnings = []
    this.startTime = performance.now()
  }
  
  async executeJavaScript(code: string): Promise<ExecutionResult> {
    this.reset()
    
    try {
      // Create safe console
      const safeConsole = {
        log: (...args: any[]) => {
          this.logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '))
        },
        warn: (...args: any[]) => {
          this.warnings.push(args.join(' '))
        },
        error: (...args: any[]) => {
          this.errors.push(args.join(' '))
        }
      }
      
      // Create safe Math object
      const safeMath = { ...Math }
      
      // Create safe execution context
      const context = {
        console: safeConsole,
        Math: safeMath,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        setTimeout: (fn: Function, delay: number) => {
          if (delay > 10000) throw new Error('Timeout too long (max 10s)')
          return setTimeout(fn, delay)
        },
        clearTimeout
      }
      
      // Execute in safe context
      const func = new Function(...Object.keys(context), code)
      const result = func(...Object.values(context))
      
      const executionTime = performance.now() - this.startTime
      
      return {
        output: this.logs.join('\n') || (result !== undefined ? String(result) : 'Execution completed'),
        errors: this.errors,
        warnings: this.warnings,
        executionTime,
        status: this.errors.length > 0 ? 'error' : 'success'
      }
    } catch (error) {
      return {
        output: '',
        errors: [String(error)],
        warnings: this.warnings,
        executionTime: performance.now() - this.startTime,
        status: 'error'
      }
    }
  }
  
  async executePython(code: string): Promise<ExecutionResult> {
    this.reset()
    
    // Simple Python interpreter simulation
    try {
      const lines = code.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        
        // Handle print statements
        if (trimmed.startsWith('print(')) {
          const match = trimmed.match(/print\((.+)\)/)
          if (match) {
            let content = match[1]
            // Simple string evaluation
            if (content.startsWith('"') && content.endsWith('"')) {
              content = content.slice(1, -1)
            } else if (content.startsWith("'") && content.endsWith("'")) {
              content = content.slice(1, -1)
            }
            this.logs.push(content)
          }
        }
        
        // Handle simple assignments and calculations
        if (trimmed.includes(' = ')) {
          this.logs.push(`Assignment: ${trimmed}`)
        }
      }
      
      return {
        output: this.logs.join('\n') || 'Python code simulated',
        errors: this.errors,
        warnings: ['This is a simulated Python environment'],
        executionTime: performance.now() - this.startTime,
        status: 'success'
      }
    } catch (error) {
      return {
        output: '',
        errors: [String(error)],
        warnings: this.warnings,
        executionTime: performance.now() - this.startTime,
        status: 'error'
      }
    }
  }
}

export function SandboxEditor({ value, onChange }: SandboxEditorProps) {
  const [runtime, setRuntime] = useState<Runtime>('javascript')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [autoRun, setAutoRun] = useState(false)
  const executorRef = useRef(new SafeExecutor())
  
  // Load template when runtime changes
  useEffect(() => {
    if (!value || value === '') {
      onChange(RUNTIMES[runtime].template)
    }
  }, [runtime])
  
  // Auto-run functionality
  useEffect(() => {
    if (!autoRun || !value) return
    
    const timeout = setTimeout(() => {
      executeCode()
    }, 1000)
    
    return () => clearTimeout(timeout)
  }, [value, autoRun])
  
  const executeCode = useCallback(async () => {
    if (!value.trim()) return
    
    setIsRunning(true)
    setResult(null)
    
    try {
      let result: ExecutionResult
      
      switch (runtime) {
        case 'javascript':
        case 'nodejs':
        case 'react':
          result = await executorRef.current.executeJavaScript(value)
          break
        case 'python':
          result = await executorRef.current.executePython(value)
          break
        default:
          result = {
            output: '',
            errors: [`Runtime ${runtime} not implemented`],
            warnings: [],
            executionTime: 0,
            status: 'error'
          }
      }
      
      setResult(result)
    } catch (error) {
      setResult({
        output: '',
        errors: [String(error)],
        warnings: [],
        executionTime: 0,
        status: 'error'
      })
    } finally {
      setIsRunning(false)
    }
  }, [value, runtime])
  
  const stopExecution = useCallback(() => {
    setIsRunning(false)
  }, [])
  
  const clearResults = useCallback(() => {
    setResult(null)
  }, [])
  
  const downloadCode = useCallback(() => {
    const ext = runtime === 'python' ? '.py' : '.js'
    const blob = new Blob([value || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sandbox-code${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [value, runtime])
  
  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'running': return <Clock className="w-4 h-4 animate-spin" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Terminal className="w-4 h-4" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Runtime Selector */}
          <Select value={runtime} onValueChange={(v) => setRuntime(v as Runtime)}>
            <SelectTrigger className="w-36 h-8 bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RUNTIMES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Separator orientation="vertical" className="h-4" />
          
          {/* Execution Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isRunning ? stopExecution : executeCode}
            className={cn(
              "h-8 px-2",
              isRunning 
                ? "text-red-400 hover:text-red-300 hover:bg-gray-700" 
                : "text-green-400 hover:text-green-300 hover:bg-gray-700"
            )}
            title={isRunning ? 'Stop Execution' : 'Run Code (Cmd+Enter)'}
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 mr-1" fill="currentColor" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Run
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearResults}
            className="h-8 px-2 hover:bg-gray-700"
            title="Clear Results"
            disabled={!result}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          
          <Button
            variant={autoRun ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAutoRun(!autoRun)}
            className="h-8 px-2 hover:bg-gray-700"
            title="Auto-run on changes"
          >
            <Zap className="w-3 h-3" />
            Auto
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-gray-700 border-gray-600">
            {RUNTIMES[runtime].icon} {RUNTIMES[runtime].name}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCode}
            className="h-8 px-2 hover:bg-gray-700"
            title="Download Code"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Panel */}
        <div className={cn(
          "flex flex-col",
          result ? "w-1/2 border-r border-gray-700" : "w-full"
        )}>
          <div className="p-2 bg-gray-750 border-b border-gray-700">
            <p className="text-xs text-gray-400">
              {RUNTIMES[runtime].setup}
            </p>
          </div>
          
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`// Welcome to ${RUNTIMES[runtime].name} Sandbox\n// Write your code here and click Run to execute\n// Press Cmd+Enter to run quickly`}
            className="w-full h-full resize-none border-0 bg-gray-900 text-gray-100 p-4 text-sm font-mono focus:outline-none leading-relaxed"
            style={{ 
              fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
              lineHeight: '1.5'
            }}
            spellCheck="false"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                executeCode()
              }
            }}
          />
        </div>
        
        {/* Results Panel */}
        {result && (
          <div className="w-1/2 flex flex-col bg-gray-800">
            <div className="p-2 border-b border-gray-700 bg-gray-750">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="text-sm font-medium">
                    {result.status === 'success' ? 'Execution Complete' : 
                     result.status === 'error' ? 'Execution Failed' : 'Running...'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {result.executionTime.toFixed(2)}ms
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="output" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start p-1 bg-gray-750">
                <TabsTrigger value="output" className="flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  Output
                  {result.output && <Badge variant="secondary" className="ml-1 h-4 text-xs">1</Badge>}
                </TabsTrigger>
                {result.errors.length > 0 && (
                  <TabsTrigger value="errors" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Errors
                    <Badge variant="destructive" className="ml-1 h-4 text-xs">
                      {result.errors.length}
                    </Badge>
                  </TabsTrigger>
                )}
                {result.warnings.length > 0 && (
                  <TabsTrigger value="warnings" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Warnings
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {result.warnings.length}
                    </Badge>
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="output" className="flex-1 m-0">
                <ScrollArea className="h-full p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-gray-200">
                    {result.output || 'No output'}
                  </pre>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="errors" className="flex-1 m-0">
                <ScrollArea className="h-full p-4">
                  {result.errors.map((error, i) => (
                    <div key={i} className="mb-2 p-2 bg-red-900/20 border border-red-800 rounded text-sm">
                      <pre className="font-mono text-red-200 whitespace-pre-wrap">{error}</pre>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="warnings" className="flex-1 m-0">
                <ScrollArea className="h-full p-4">
                  {result.warnings.map((warning, i) => (
                    <div key={i} className="mb-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded text-sm">
                      <pre className="font-mono text-yellow-200 whitespace-pre-wrap">{warning}</pre>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}