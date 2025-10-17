/**
 * Array Safety Tests for React Error #185 Prevention
 * Tests defensive programming patterns for array operations
 */

import { render, screen } from '@testing-library/react'
import { VanaAgentStatus } from '../components/agent/VanaAgentStatus'
import VanaSidebar from '../components/vana/VanaSidebar'
import { AgentStatus, ResearchProgress } from '../lib/api/types'
import { ChatSession } from '../hooks/useChatStream'

// Mock the UI components
jest.mock('../components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('../components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}))

jest.mock('../components/ui/progress', () => ({
  Progress: ({ value }: any) => <div role="progressbar" aria-valuenow={value}></div>
}))

jest.mock('../components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <div>{children}</div>
}))

jest.mock('../components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}))

jest.mock('../components/ui/separator', () => ({
  Separator: () => <hr />
}))

jest.mock('../components/ui/sidebar', () => ({
  Sidebar: ({ children }: any) => <div>{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <h4>{children}</h4>,
  SidebarHeader: ({ children }: any) => <header>{children}</header>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, onClick }: any) => <li onClick={onClick}>{children}</li>,
}))

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}))

jest.mock('../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatRelativeTime: (date: string) => 'Just now'
}))

jest.mock('../lib/react-performance', () => ({
  memoWithTracking: (Component: any) => Component,
  useRenderTracker: () => ({ componentName: 'test', renderCount: 1, warnings: [] }),
  useStableArray: (arr: any[]) => arr
}))

describe('Array Safety Tests', () => {
  describe('VanaAgentStatus Component', () => {
    const createMockAgent = (overrides: Partial<AgentStatus> = {}): AgentStatus => ({
      agent_id: 'test-agent-1',
      name: 'Test Agent',
      agent_type: 'researcher',
      status: 'current',
      progress: 0.5,
      current_task: 'Testing',
      started_at: new Date().toISOString(),
      completed_at: undefined,
      error: undefined,
      results: {},
      ...overrides
    })

    it('should handle null agents array safely', () => {
      render(<VanaAgentStatus agents={null} />)
      expect(screen.getByText('No agents active')).toBeInTheDocument()
    })

    it('should handle undefined agents array safely', () => {
      render(<VanaAgentStatus />)
      expect(screen.getByText('No agents active')).toBeInTheDocument()
    })

    it('should handle empty agents array safely', () => {
      render(<VanaAgentStatus agents={[]} />)
      expect(screen.getByText('No agents active')).toBeInTheDocument()
    })

    it('should filter out invalid agent objects', () => {
      const agents = [
        createMockAgent(),
        null,
        undefined,
        { invalid: 'object' },
        createMockAgent({ agent_id: 'test-agent-2', name: 'Test Agent 2' })
      ] as any[]

      render(<VanaAgentStatus agents={agents} />)
      
      // Should only render valid agents
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument()
    })

    it('should handle agents with malformed results safely', () => {
      const agentWithBadResults = createMockAgent({
        results: {
          validKey: 'valid value',
          nullKey: null,
          undefinedKey: undefined,
          objectKey: { nested: 'object' }
        }
      })

      render(<VanaAgentStatus agents={[agentWithBadResults]} />)
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
    })

    it('should handle agents missing required fields', () => {
      const incompleteAgent = {
        agent_id: 'incomplete',
        name: 'Incomplete Agent',
        agent_type: 'test',
        status: 'current',
        progress: 0.5
        // Missing some optional fields
      } as AgentStatus

      render(<VanaAgentStatus agents={[incompleteAgent]} />)
      expect(screen.getByText('Incomplete Agent')).toBeInTheDocument()
    })

    it('should handle progress calculation safely', () => {
      const agentWithInvalidProgress = createMockAgent({
        progress: NaN
      })

      render(<VanaAgentStatus agents={[agentWithInvalidProgress]} />)
      expect(screen.getByText('Test Agent')).toBeInTheDocument()
    })
  })

  describe('VanaSidebar Component', () => {
    const createMockSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
      id: 'test-session-1',
      title: 'Test Session',
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-session-1',
          role: 'user',
          content: 'Hello world',
          timestamp: new Date().toISOString()
        }
      ],
      agents: [],
      progress: null,
      isStreaming: false,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      final_report: null,
      status: 'active',
      historyLoaded: true,
      ...overrides
    })

    const mockProps = {
      activeSessionId: null,
      onSelectSession: jest.fn(),
      onCreateSession: jest.fn().mockReturnValue('new-session-id')
    }

    it('should handle null sessions array safely', () => {
      render(<VanaSidebar {...mockProps} sessions={null} />)
      expect(screen.getByText('Start a conversation to see it listed here.')).toBeInTheDocument()
    })

    it('should handle undefined sessions array safely', () => {
      render(<VanaSidebar {...mockProps} />)
      expect(screen.getByText('Start a conversation to see it listed here.')).toBeInTheDocument()
    })

    it('should handle empty sessions array safely', () => {
      render(<VanaSidebar {...mockProps} sessions={[]} />)
      expect(screen.getByText('Start a conversation to see it listed here.')).toBeInTheDocument()
    })

    it('should filter out invalid session objects', () => {
      const sessions = [
        createMockSession(),
        null,
        undefined,
        { invalid: 'object' },
        createMockSession({ id: 'test-session-2', title: 'Test Session 2' })
      ] as any[]

      render(<VanaSidebar {...mockProps} sessions={sessions} />)
      
      // Should only render valid sessions
      expect(screen.getByText('Test Session')).toBeInTheDocument()
      expect(screen.getByText('Test Session 2')).toBeInTheDocument()
    })

    it('should handle sessions with malformed messages array', () => {
      const sessionWithBadMessages = createMockSession({
        messages: null as any,
        title: 'Session with Bad Messages'  // Explicit title for identification
      })

      render(<VanaSidebar {...mockProps} sessions={[sessionWithBadMessages]} />)
      expect(screen.getByText('Session with Bad Messages')).toBeInTheDocument()
    })

    it('should handle sessions with invalid message objects', () => {
      const sessionWithInvalidMessages = createMockSession({
        messages: [
          null,
          undefined,
          { invalid: 'message' },
          {
            id: 'msg-valid',
            sessionId: 'test-session-1',
            role: 'user',
            content: 'Valid message',
            timestamp: new Date().toISOString()
          }
        ] as any[]
      })

      render(<VanaSidebar {...mockProps} sessions={[sessionWithInvalidMessages]} />)
      expect(screen.getByText('Valid message')).toBeInTheDocument()
    })

    it('should handle sessions with invalid dates safely', () => {
      const sessionWithBadDate = createMockSession({
        created_at: 'invalid-date',
        updated_at: undefined
      })

      render(<VanaSidebar {...mockProps} sessions={[sessionWithBadDate]} />)
      expect(screen.getByText('Test Session')).toBeInTheDocument()
    })

    it('should handle sessions missing required fields', () => {
      const incompleteSession = {
        id: 'incomplete',
        title: 'Incomplete Session'
        // Missing other fields
      } as ChatSession

      render(<VanaSidebar {...mockProps} sessions={[incompleteSession]} />)
      expect(screen.getByText('Incomplete Session')).toBeInTheDocument()
    })

    it('should handle empty or missing content in messages', () => {
      const sessionWithEmptyMessages = createMockSession({
        messages: [
          { id: 'msg-1', sessionId: 'test-session-1', role: 'user', content: '', timestamp: new Date().toISOString() },
          { id: 'msg-2', sessionId: 'test-session-1', role: 'user', content: '', timestamp: new Date().toISOString() },
          { id: 'msg-3', sessionId: 'test-session-1', role: 'user', content: '', timestamp: new Date().toISOString() }
        ]
      })

      render(<VanaSidebar {...mockProps} sessions={[sessionWithEmptyMessages]} />)
      expect(screen.getByText('Test Session')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Boundaries', () => {
    const createMockSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
      id: 'test-session-1',
      title: 'Test Session',
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-session-1',
          role: 'user',
          content: 'Hello world',
          timestamp: new Date().toISOString()
        }
      ],
      agents: [],
      progress: null,
      isStreaming: false,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      final_report: null,
      status: 'active',
      historyLoaded: true,
      ...overrides
    })
    it('should not crash when encountering circular references', () => {
      const circularObject: any = { name: 'circular' }
      circularObject.self = circularObject

      const agentWithCircular = {
        agent_id: 'circular-test',
        name: 'Circular Test',
        agent_type: 'test',
        status: 'current',
        progress: 0.5,
        current_task: undefined,
        started_at: new Date().toISOString(),
        completed_at: undefined,
        error: undefined,
        results: circularObject
      } as AgentStatus

      // Should render without throwing
      const { container } = render(<VanaAgentStatus agents={[agentWithCircular]} />)
      expect(container).toBeInTheDocument()
      expect(screen.getByText('Circular Test')).toBeInTheDocument()
    })

    it('should handle extremely large arrays gracefully', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        agent_id: `agent-${i}`,
        name: `Agent ${i}`,
        agent_type: 'test',
        status: 'completed',
        progress: 1,
        current_task: undefined,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error: undefined,
        results: {}
      })) as AgentStatus[]

      expect(() => {
        render(<VanaAgentStatus agents={largeArray} />)
      }).not.toThrow()
    })

    it('should handle memory pressure scenarios', () => {
      const memoryIntensiveSession = createMockSession({
        title: 'Memory Intensive Session',
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          sessionId: 'test-session-1',
          role: 'user',
          content: `Message ${i} with lots of content `.repeat(100),
          timestamp: new Date().toISOString()
        }))
      })

      // Should render without throwing
      const { container } = render(<VanaSidebar 
        sessions={[memoryIntensiveSession]}
        activeSessionId={null}
        onSelectSession={jest.fn()}
        onCreateSession={jest.fn()}
      />)
      expect(container).toBeInTheDocument()
      expect(screen.getByText('Memory Intensive Session')).toBeInTheDocument()
    })
  })
})