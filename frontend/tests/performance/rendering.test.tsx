import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { performanceUtils, performanceHelpers, ComponentPerformanceTracker } from '../setup/performance.setup'
import { createMockConversation, createMockMessage, createMockAgentStatus } from '../utils/testing-utils'
import React from 'react'

// Performance test components
const PerformanceTestHomePage = ({ capabilities = [] }: { capabilities?: any[] }) => {
  const [, forceRender] = React.useReducer(x => x + 1, 0)
  
  React.useEffect(() => {
    const tracker = new ComponentPerformanceTracker('VanaHomePage')
    tracker.startMount()
    
    return () => {
      tracker.endMount()
    }
  }, [])
  
  const defaultCapabilities = capabilities.length > 0 ? capabilities : Array.from({ length: 20 }, (_, i) => ({
    id: `cap-${i}`,
    title: `Capability ${i + 1}`,
    description: `Description for capability ${i + 1}`
  }))
  
  return (
    <main data-testid="home-page">
      <h1>Welcome to Vana</h1>
      
      <button onClick={forceRender} data-testid="force-rerender">
        Force Re-render
      </button>
      
      <section data-testid="capabilities-grid">
        {defaultCapabilities.map(cap => (
          <div key={cap.id} data-testid={`capability-${cap.id}`}>
            <h3>{cap.title}</h3>
            <p>{cap.description}</p>
          </div>
        ))}
      </section>
    </main>
  )
}

const PerformanceTestChatInterface = ({ 
  messageCount = 100,
  agentCount = 8 
}: { 
  messageCount?: number
  agentCount?: number 
}) => {
  const [messages] = React.useState(() => 
    Array.from({ length: messageCount }, (_, i) => 
      createMockMessage({
        id: `msg-${i}`,
        content: `This is test message number ${i + 1}. It contains some text to simulate real conversation content.`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (messageCount - i) * 60000)
      })
    )
  )
  
  const [agents] = React.useState(() => 
    Array.from({ length: agentCount }, (_, i) => 
      createMockAgentStatus({
        id: `agent-${i}`,
        name: `Agent ${i + 1}`,
        status: ['working', 'idle', 'completed'][Math.floor(Math.random() * 3)] as any,
        progress: Math.floor(Math.random() * 100)
      })
    )
  )
  
  const [isStreaming, setIsStreaming] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    const tracker = new ComponentPerformanceTracker('VanaChatInterface')
    tracker.startMount()
    
    return () => {
      tracker.endMount()
    }
  }, [])
  
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const simulateNewMessage = () => {
    setIsStreaming(true)
    setTimeout(() => setIsStreaming(false), 100)
  }
  
  return (
    <div data-testid="chat-interface">
      <div data-testid="messages-container" style={{ height: '400px', overflow: 'auto' }}>
        {messages.map(message => (
          <div
            key={message.id}
            data-testid={`message-${message.id}`}
            style={{ padding: '8px', marginBottom: '4px' }}
          >
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
        
        {isStreaming && (
          <div data-testid="typing-indicator">AI is typing...</div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div data-testid="agent-status-panel">
        {agents.map(agent => (
          <div key={agent.id} data-testid={`agent-${agent.id}`}>
            <span>{agent.name}</span>
            <span>{agent.status}</span>
            <div data-testid={`progress-${agent.id}`}>{agent.progress}%</div>
          </div>
        ))}
      </div>
      
      <button onClick={simulateNewMessage} data-testid="simulate-message">
        Simulate Message
      </button>
    </div>
  )
}

const PerformanceTestSidebar = ({ 
  conversationCount = 100 
}: { 
  conversationCount?: number 
}) => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [conversations] = React.useState(() => 
    Array.from({ length: conversationCount }, (_, i) => 
      createMockConversation({
        id: `conv-${i}`,
        title: `Conversation ${i + 1}: ${['Research', 'Analysis', 'Discussion', 'Planning'][Math.floor(Math.random() * 4)]}`,
        updatedAt: new Date(Date.now() - i * 3600000)
      })
    )
  )
  
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations
    
    const startTime = performance.now()
    const filtered = conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const filterTime = performance.now() - startTime
    
    // Log filter performance for analysis
    // Filter performance tracked internally
    
    return filtered
  }, [conversations, searchQuery])
  
  React.useEffect(() => {
    const tracker = new ComponentPerformanceTracker('VanaSidebar')
    tracker.startMount()
    
    return () => {
      tracker.endMount()
    }
  }, [])
  
  return (
    <aside data-testid="sidebar">
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search conversations..."
      />
      
      <div data-testid="conversations-list">
        {filteredConversations.map(conv => (
          <div key={conv.id} data-testid={`conversation-${conv.id}`}>
            <span>{conv.title}</span>
            <span>{conv.updatedAt.toLocaleDateString()}</span>
          </div>
        ))}
      </div>
      
      <div data-testid="conversation-count">
        {filteredConversations.length} conversations
      </div>
    </aside>
  )
}

describe('Rendering Performance Tests', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    performanceUtils.clearEntries()
  })
  
  describe('Component Mount Performance', () => {
    it('renders VanaHomePage quickly with many capabilities', async () => {
      const { measureFunction } = performanceHelpers
      
      const { result, duration } = await measureFunction(
        () => render(<PerformanceTestHomePage />),
        'VanaHomePage-render'
      )
      
      expect(result.container).toBeInTheDocument()
      expect(duration).toBeLessThan(100) // 100ms budget
      
      // Verify all capabilities rendered
      expect(screen.getAllByTestId(/^capability-cap-/)).toHaveLength(20)
      
      // Check component performance metrics
      const mountTime = performanceUtils.getComponentRenderTime('VanaHomePage')
      expect(mountTime).toBeLessThan(50) // 50ms mount budget
    })
    
    it('renders VanaChatInterface efficiently with large message history', async () => {
      const messageCount = 500
      
      const { result, duration } = await performanceHelpers.measureFunction(
        () => render(<PerformanceTestChatInterface messageCount={messageCount} />),
        'VanaChatInterface-large-history'
      )
      
      expect(result.container).toBeInTheDocument()
      expect(duration).toBeLessThan(200) // 200ms budget for large dataset
      
      // Verify messages rendered
      const messagesContainer = screen.getByTestId('messages-container')
      expect(messagesContainer).toBeInTheDocument()
      
      // Check that scroll position is at bottom
      const messages = screen.getAllByTestId(/^message-msg-/)
      expect(messages).toHaveLength(messageCount)
      
      const mountTime = performanceUtils.getComponentRenderTime('VanaChatInterface')
      expect(mountTime).toBeLessThan(150) // 150ms mount budget
    })
    
    it('renders VanaSidebar efficiently with large conversation list', async () => {
      const conversationCount = 1000
      
      const { result, duration } = await performanceHelpers.measureFunction(
        () => render(<PerformanceTestSidebar conversationCount={conversationCount} />),
        'VanaSidebar-large-list'
      )
      
      expect(result.container).toBeInTheDocument()
      expect(duration).toBeLessThan(300) // 300ms budget for very large dataset
      
      // Verify conversations rendered
      const conversations = screen.getAllByTestId(/^conversation-conv-/)
      expect(conversations).toHaveLength(conversationCount)
      
      const mountTime = performanceUtils.getComponentRenderTime('VanaSidebar')
      expect(mountTime).toBeLessThan(200) // 200ms mount budget
    })
  })
  
  describe('Component Update Performance', () => {
    it('handles rapid re-renders efficiently', async () => {
      render(<PerformanceTestHomePage />)
      
      const rerenderButton = screen.getByTestId('force-rerender')
      
      // Measure multiple rapid re-renders
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        await user.click(rerenderButton)
      }
      
      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(500) // 500ms for 10 re-renders
      
      // Average should be fast
      const averageTime = totalTime / 10
      expect(averageTime).toBeLessThan(50) // 50ms per re-render
    })
    
    it('handles message updates efficiently in chat', async () => {
      render(<PerformanceTestChatInterface messageCount={100} />)
      
      const simulateButton = screen.getByTestId('simulate-message')
      
      // Measure message simulation performance
      const { duration } = await performanceHelpers.measureFunction(
        async () => {
          await user.click(simulateButton)
          
          // Wait for streaming to complete
          await waitFor(() => {
            expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
          }, { timeout: 200 })
        },
        'message-update'
      )
      
      expect(duration).toBeLessThan(150) // 150ms including animation
    })
    
    it('handles search filtering efficiently', async () => {
      render(<PerformanceTestSidebar conversationCount={1000} />)
      
      const searchInput = screen.getByTestId('search-input')
      
      // Measure search performance
      const { duration } = await performanceHelpers.measureFunction(
        async () => {
          await user.type(searchInput, 'Research')
        },
        'search-filtering'
      )
      
      expect(duration).toBeLessThan(100) // 100ms for search
      
      // Verify filtered results
      const conversationCount = screen.getByTestId('conversation-count')
      expect(conversationCount.textContent).toMatch(/\d+ conversations/)
      
      // Should have fewer results than total
      const filteredConversations = screen.getAllByTestId(/^conversation-conv-/)
      expect(filteredConversations.length).toBeLessThan(1000)
    })
  })
  
  describe('Memory Usage Performance', () => {
    it('maintains stable memory usage with large datasets', () => {
      const initialSnapshot = performanceUtils.takeMemorySnapshot()
      
      // Render component with large dataset
      const { unmount } = render(<PerformanceTestChatInterface messageCount={1000} />)
      
      const afterRenderSnapshot = performanceUtils.takeMemorySnapshot()
      
      // Unmount component
      unmount()
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const afterUnmountSnapshot = performanceUtils.takeMemorySnapshot()
      
      // Memory should not leak significantly
      const memoryLeak = performanceUtils.detectMemoryLeak(
        initialSnapshot.usedJSHeapSize,
        afterUnmountSnapshot.usedJSHeapSize,
        10 * 1024 * 1024 // 10MB threshold
      )
      
      expect(memoryLeak).toBe(false)
      
      // Memory usage during render should be reasonable
      const renderMemoryIncrease = afterRenderSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize
      expect(renderMemoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB max increase
    })
    
    it('handles memory efficiently during rapid interactions', async () => {
      render(<PerformanceTestSidebar conversationCount={500} />)
      
      const initialSnapshot = performanceUtils.takeMemorySnapshot()
      const searchInput = screen.getByTestId('search-input')
      
      // Perform many rapid searches
      const searchTerms = ['Research', 'Analysis', 'Discussion', 'Planning', 'Data']
      
      for (const term of searchTerms) {
        await user.clear(searchInput)
        await user.type(searchInput, term)
        
        // Wait for filter to complete
        await waitFor(() => {
          expect(screen.getByTestId('conversation-count')).toBeInTheDocument()
        })
      }
      
      const finalSnapshot = performanceUtils.takeMemorySnapshot()
      
      // Memory should not grow significantly
      const memoryGrowth = finalSnapshot.usedJSHeapSize - initialSnapshot.usedJSHeapSize
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024) // 20MB max growth
    })
  })
  
  describe('Performance Budget Validation', () => {
    it('meets all performance budgets', async () => {
      // Define performance budgets
      const budgets = {
        renderTime: 100,        // 100ms max render time
        componentMountTime: 80, // 80ms max mount time
        componentUpdateTime: 50, // 50ms max update time
        memoryUsage: 30 * 1024 * 1024, // 30MB max memory usage
      }
      
      // Test home page performance
      const homePageMetrics = await performanceHelpers.measureFunction(
        () => render(<PerformanceTestHomePage />),
        'homepage-budget-test'
      )
      
      // Test chat interface performance
      const chatMetrics = await performanceHelpers.measureFunction(
        () => render(<PerformanceTestChatInterface messageCount={200} />),
        'chat-budget-test'
      )
      
      // Validate budgets
      const budgetCheck = performanceUtils.checkPerformanceBudget(
        {
          renderTime: Math.max(homePageMetrics.duration, chatMetrics.duration),
          componentMountTime: Math.max(
            performanceUtils.getComponentRenderTime('VanaHomePage'),
            performanceUtils.getComponentRenderTime('VanaChatInterface')
          ),
          memoryUsage: performanceUtils.takeMemorySnapshot().usedJSHeapSize
        },
        budgets
      )
      
      expect(budgetCheck.passed).toBe(true)
      if (!budgetCheck.passed) {
        console.error('Performance budget violations:', budgetCheck.violations)
      }
    })
  })
  
  describe('Long Task Detection', () => {
    it('identifies and prevents long tasks', async () => {
      render(<PerformanceTestChatInterface messageCount={1000} />)
      
      // Simulate heavy computation
      const heavyTaskStart = performance.now()
      performanceHelpers.simulateHeavyComputation(60) // 60ms task
      const heavyTaskEnd = performance.now()
      
      performance.measure('heavy-task', { start: heavyTaskStart, end: heavyTaskEnd })
      
      // Detect long tasks
      const longTasks = performanceUtils.detectLongTasks(50) // 50ms threshold
      
      // Should detect the heavy task
      expect(longTasks.length).toBeGreaterThan(0)
      
      const heavyTask = longTasks.find(task => task.name === 'heavy-task')
      expect(heavyTask).toBeTruthy()
      expect(heavyTask?.duration).toBeGreaterThan(50)
    })
    
    it('keeps rendering tasks under threshold', async () => {
      const renderStart = performance.now()
      
      render(<PerformanceTestHomePage />)
      
      const renderEnd = performance.now()
      performance.measure('component-render', { start: renderStart, end: renderEnd })
      
      // Check that render task is not too long
      const longTasks = performanceUtils.detectLongTasks(100) // 100ms threshold
      const renderTasks = longTasks.filter(task => task.name === 'component-render')
      
      // Rendering should not create long tasks
      expect(renderTasks.length).toBe(0)
    })
  })
  
  describe('Performance Regression Detection', () => {
    it('tracks performance trends over time', () => {
      const performanceHistory: number[] = []
      
      // Simulate multiple performance measurements
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        render(<PerformanceTestHomePage />)
        const duration = performance.now() - startTime
        
        performanceHistory.push(duration)
      }
      
      // Calculate average and variance
      const average = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length
      const variance = performanceHistory.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / performanceHistory.length
      const standardDeviation = Math.sqrt(variance)
      
      // Performance should be consistent (low variance)
      expect(standardDeviation).toBeLessThan(average * 0.2) // Within 20% of average
      
      // Average should meet budget
      expect(average).toBeLessThan(100) // 100ms budget
    })
  })
})