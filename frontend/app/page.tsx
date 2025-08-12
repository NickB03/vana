'use client'

import { useRouter } from 'next/navigation'
import { GreetingHeader } from '@/components/homepage/GreetingHeader'
import { PromptSuggestions } from '@/components/homepage/PromptSuggestions'
import { ToolGrid } from '@/components/homepage/ToolGrid'
import { QuickStart } from '@/components/homepage/QuickStart'
import { SessionSidebar } from '@/components/homepage/SessionSidebar'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import { useCanvasStore } from '@/stores/canvasStore'
import type { PromptSuggestion, ToolOption } from '@/types'

// Sample prompt suggestions based on PRD
const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'ps-1',
    title: 'Help me plan a new React project',
    description: 'Get guidance on project structure, tools, and best practices',
    prompt: 'I want to start a new React project with TypeScript. Can you help me plan the architecture, choose the right tools, and set up a scalable folder structure?',
    icon: '📋',
    category: 'Development',
    tags: ['react', 'planning', 'architecture']
  },
  {
    id: 'ps-2', 
    title: 'Debug this TypeScript error',
    description: 'Get help understanding and fixing TypeScript issues',
    prompt: 'I\'m getting a TypeScript error that I don\'t understand. Can you help me debug it and explain what\'s going wrong?',
    icon: '🐛',
    category: 'Debugging',
    tags: ['typescript', 'debugging', 'errors']
  },
  {
    id: 'ps-3',
    title: 'Write unit tests for my component', 
    description: 'Generate comprehensive test suites with best practices',
    prompt: 'I have a React component that needs unit tests. Can you help me write comprehensive tests using Jest and Testing Library?',
    icon: '🧪',
    category: 'Testing',
    tags: ['testing', 'jest', 'react']
  },
  {
    id: 'ps-4',
    title: 'Optimize my app performance',
    description: 'Identify bottlenecks and implement improvements',
    prompt: 'My web application is running slowly. Can you help me identify performance bottlenecks and suggest optimizations?',
    icon: '⚡',
    category: 'Performance',
    tags: ['performance', 'optimization', 'web']
  }
]

// Tool options that open Canvas directly
const TOOL_OPTIONS: ToolOption[] = [
  {
    id: 'tool-markdown',
    name: 'Markdown Editor',
    description: 'Create and edit markdown content with live preview',
    icon: '📝',
    canvasType: 'markdown',
    shortcut: 'Cmd+M',
    category: 'Writing',
    featured: true
  },
  {
    id: 'tool-code',
    name: 'Code Editor', 
    description: 'Write and edit code with syntax highlighting',
    icon: '💻',
    canvasType: 'code',
    shortcut: 'Cmd+E',
    category: 'Development',
    featured: true
  },
  {
    id: 'tool-web',
    name: 'Web Preview',
    description: 'Preview HTML/CSS/JS in a live environment',
    icon: '🌐',
    canvasType: 'web',
    shortcut: 'Cmd+W',
    category: 'Development',
    featured: false
  },
  {
    id: 'tool-sandbox',
    name: 'Code Sandbox',
    description: 'Experiment with code in an isolated environment',
    icon: '🏖️',
    canvasType: 'sandbox',
    shortcut: 'Cmd+S',
    category: 'Development',
    featured: false
  }
]

export default function HomePage() {
  const router = useRouter()
  const { createSession } = useSessionStore()
  const { sendMessage } = useChatStore()
  const { open: openCanvas } = useCanvasStore()

  const handleSuggestionClick = async (suggestion: PromptSuggestion) => {
    // Create new session with the prompt
    const session = createSession('homepage', suggestion.prompt)
    
    // Navigate to chat page
    router.push(`/chat?session=${session.id}`)
    
    // Send the message (this will trigger streaming)
    await sendMessage(suggestion.prompt)
  }

  const handleToolClick = (tool: ToolOption) => {
    // Create session for tool usage
    const session = createSession('tool')
    
    // Open Canvas immediately with the tool type
    openCanvas(tool.canvasType)
    
    // Navigate to chat with Canvas open
    router.push(`/chat?session=${session.id}&canvas=${tool.canvasType}`)
  }

  const handleQuickStart = async (prompt: string, files?: File[]) => {
    // Create session with initial prompt
    const session = createSession('homepage', prompt)
    
    // Navigate to chat
    router.push(`/chat?session=${session.id}`)
    
    // Send message with files if provided
    await sendMessage(prompt, files)
  }

  return (
    <div className="flex h-screen bg-[#1e1f20]">
      {/* Gemini-style Sidebar */}
      <SessionSidebar />
      
      {/* Main content area - Clean like Gemini */}
      <main className="flex-1 flex flex-col">
        {/* Centered greeting only */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {/* Just the greeting - no cards, no suggestions */}
            <GreetingHeader />
          </div>
        </div>
        
        {/* Bottom input area */}
        <QuickStart onSubmit={handleQuickStart} />
      </main>
    </div>
  )
}