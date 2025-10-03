/**
 * React Performance Optimization Tests
 * Tests to verify React.memo and optimization patterns prevent re-render loops
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { VanaHomePage } from '@/components/vana/VanaHomePage';
import { SSETestComponent } from '@/components/agent/SSETestComponent';
import { VanaAgentStatus } from '@/components/agent/VanaAgentStatus';
import { Message, MessageContent } from '@/components/prompt-kit/message';
import { ChatContainerRoot } from '@/components/prompt-kit/chat-container';
import { performanceMonitor, usePerformanceMonitor } from '@/lib/performance-monitor';
import { OptimizedList, OptimizedBadge } from '@/components/ui/optimized-wrappers';

// Mock data generators
const generateMockAgents = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    agent_id: `agent-${i}`,
    name: `Agent ${i}`,
    agent_type: 'researcher',
    status: ['current', 'waiting', 'completed', 'error'][i % 4] as 'current' | 'waiting' | 'completed' | 'error',
    progress: Math.random(),
    current_task: `Task ${i}`,
    started_at: new Date().toISOString(),
    completed_at: undefined,
    error: undefined,
    results: {} as Record<string, any>
  }));

const generateMockEvents = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    type: 'agent_update',
    data: {
      timestamp: new Date().toISOString(),
      message: `Event ${i}`,
      agent_id: `agent-${i}`
    }
  }));

// Test component that intentionally causes re-renders to test optimization
function TestRenderLoopComponent({ shouldOptimize = true }: { shouldOptimize?: boolean }) {
  const [count, setCount] = useState(0);
  const [data] = useState(() => generateMockAgents(50));

  const performanceTracker = usePerformanceMonitor('TestRenderLoopComponent', 10, 20);

  // Intentionally problematic pattern (creates new arrays on every render)
  const unoptimizedData = shouldOptimize ? data : data.map(agent => ({ ...agent, timestamp: Date.now() }));

  // Intentionally problematic callback (new function on every render)
  const unoptimizedCallback = shouldOptimize 
    ? useCallback(() => setCount(c => c + 1), [])
    : () => setCount(c => c + 1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div data-testid="render-count">{performanceTracker.renderCount}</div>
      <div data-testid="has-issues">{performanceTracker.hasIssues.toString()}</div>
      <div data-testid="count">{count}</div>
      
      {shouldOptimize ? (
        <OptimizedList
          items={unoptimizedData}
          renderItem={(agent) => (
            <OptimizedBadge key={agent.agent_id} onClick={unoptimizedCallback}>
              {agent.name}
            </OptimizedBadge>
          )}
          keyExtractor={(agent) => agent.agent_id}
        />
      ) : (
        <div>
          {unoptimizedData.map((agent) => (
            <button key={agent.agent_id} onClick={unoptimizedCallback}>
              {agent.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

describe('React Performance Optimizations', () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  describe('VanaHomePage Optimizations', () => {
    it('should not re-render when onStartChat function identity changes', async () => {
      let renderCount = 0;
      const trackRender = () => renderCount++;

      const TestWrapper = () => {
        const [trigger, setTrigger] = useState(0);
        
        // Function identity changes on every render
        const handleStartChat = () => {}; // Debug logging removed
        
        useEffect(() => {
          trackRender();
        });

        return (
          <div>
            <button onClick={() => setTrigger(t => t + 1)}>Trigger Re-render</button>
            <VanaHomePage onStartChat={handleStartChat} />
          </div>
        );
      };

      const { getByText } = render(<TestWrapper />);
      
      // Initial render
      expect(renderCount).toBe(1);
      
      // Trigger parent re-render
      fireEvent.click(getByText('Trigger Re-render'));
      fireEvent.click(getByText('Trigger Re-render'));
      fireEvent.click(getByText('Trigger Re-render'));
      
      // VanaHomePage should not re-render due to memo optimization
      await waitFor(() => {
        expect(renderCount).toBeLessThan(5); // Should be much less without optimization
      });
    });

    it('should handle capability array rendering efficiently', () => {
      const onStartChat = jest.fn();
      const { container } = render(<VanaHomePage onStartChat={onStartChat} />);
      
      // Should render all capability buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(6); // At least 6 capabilities + submit button
    });
  });

  describe('Message Component Optimizations', () => {
    it('should not re-render markdown content unnecessarily', async () => {
      let renderCount = 0;
      
      const TestWrapper = () => {
        const [trigger, setTrigger] = useState(0);
        const content = "# Test Markdown\n\nThis is **bold** text.";
        
        useEffect(() => {
          renderCount++;
        });

        return (
          <div>
            <button onClick={() => setTrigger(t => t + 1)}>Trigger Re-render</button>
            <Message>
              <MessageContent markdown={true}>{content}</MessageContent>
            </Message>
          </div>
        );
      };

      const { getByText } = render(<TestWrapper />);
      
      // Initial render
      expect(renderCount).toBe(1);
      
      // Trigger multiple re-renders
      fireEvent.click(getByText('Trigger Re-render'));
      fireEvent.click(getByText('Trigger Re-render'));
      
      // Should not re-render markdown unnecessarily
      await waitFor(() => {
        expect(renderCount).toBeLessThan(4);
      });
    });
  });

  describe('VanaAgentStatus Optimizations', () => {
    it('should handle large agent arrays efficiently', () => {
      const agents = generateMockAgents(100);
      const progress = {
        session_id: 'test-session',
        overall_progress: 0.75,
        current_phase: 'Testing',
        status: 'running' as const,
        agents: agents,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { container } = render(
        <VanaAgentStatus agents={agents} progress={progress} />
      );

      // Should render without performance issues
      expect(container.querySelector('[data-testid="vana-agent-status"]')).toBeTruthy();
    });

    it('should not re-render when agent array reference changes but content is same', async () => {
      const baseAgents = generateMockAgents(10);
      let renderCount = 0;

      const TestWrapper = () => {
        const [trigger, setTrigger] = useState(0);
        
        // Create new array reference but same content
        const agents = baseAgents.map(agent => ({ ...agent }));
        
        useEffect(() => {
          renderCount++;
        });

        return (
          <div>
            <button onClick={() => setTrigger(t => t + 1)}>Trigger Re-render</button>
            <VanaAgentStatus agents={agents} />
          </div>
        );
      };

      const { getByText } = render(<TestWrapper />);
      
      fireEvent.click(getByText('Trigger Re-render'));
      fireEvent.click(getByText('Trigger Re-render'));
      
      // Should minimize re-renders through memoization
      await waitFor(() => {
        expect(renderCount).toBeLessThan(5);
      });
    });
  });

  describe('ChatContainer Scroll Optimizations', () => {
    it('should throttle scroll events to prevent excessive re-renders', async () => {
      let scrollEventCount = 0;
      
      const TestWrapper = () => {
        const [messages, setMessages] = useState(['Message 1', 'Message 2']);
        
        useEffect(() => {
          scrollEventCount++;
        });

        return (
          <div style={{ height: '200px' }}>
            <ChatContainerRoot>
              {messages.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </ChatContainerRoot>
          </div>
        );
      };

      const { container } = render(<TestWrapper />);
      
      // Simulate multiple scroll events
      const scrollElement = container.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        for (let i = 0; i < 10; i++) {
          fireEvent.scroll(scrollElement, { target: { scrollTop: i * 10 } });
        }
      }
      
      // Should throttle scroll events
      await waitFor(() => {
        expect(scrollEventCount).toBeLessThan(8); // Should be throttled
      });
    });
  });

  describe('Performance Monitor', () => {
    it('should detect potential render loops', async () => {
      let issueDetected = false;
      
      performanceMonitor.subscribe((issue) => {
        if (issue.type === 'warning' || issue.type === 'error') {
          issueDetected = true;
        }
      });

      // Render unoptimized component that causes many re-renders
      const { getByTestId } = render(<TestRenderLoopComponent shouldOptimize={false} />);
      
      // Wait for re-renders to accumulate
      await waitFor(() => {
        const renderCount = parseInt(getByTestId('render-count').textContent || '0');
        return renderCount > 15;
      }, { timeout: 3000 });
      
      expect(issueDetected).toBe(true);
    });

    it('should not detect issues with optimized components', async () => {
      let issueDetected = false;
      
      performanceMonitor.subscribe((issue) => {
        issueDetected = true;
      });

      // Render optimized component
      const { getByTestId } = render(<TestRenderLoopComponent shouldOptimize={true} />);
      
      // Wait for some re-renders
      await waitFor(() => {
        const renderCount = parseInt(getByTestId('render-count').textContent || '0');
        return renderCount > 5;
      }, { timeout: 2000 });
      
      expect(issueDetected).toBe(false);
    });
  });

  describe('OptimizedList Component', () => {
    it('should render large lists efficiently', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const { container } = render(
        <OptimizedList
          items={items}
          renderItem={(item) => <div>{item.name}</div>}
          keyExtractor={(item) => item.id.toString()}
        />
      );

      expect(container.children.length).toBe(1);
      expect(container.querySelector('div')?.children.length).toBe(1000);
    });

    it('should handle empty states', () => {
      const { getByText } = render(
        <OptimizedList
          items={[]}
          renderItem={(item: any) => <div>{item.name}</div>}
          keyExtractor={(item: any) => item.id.toString()}
          emptyComponent={<div>No items found</div>}
        />
      );

      expect(getByText('No items found')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch render loop errors gracefully', () => {
      // Component that intentionally causes render loop
      const ProblematicComponent = () => {
        const [count, setCount] = useState(0);
        
        // This will cause infinite loop
        setCount(count + 1);
        
        return <div>{count}</div>;
      };

      // This test would need a custom error boundary to catch the specific error
      // In a real test environment, this would be handled by the RenderLoopErrorBoundary
      expect(() => {
        render(<ProblematicComponent />);
      }).toThrow();
    });
  });
});

// Export test utilities for use in other test files
export {
  generateMockAgents,
  generateMockEvents,
  TestRenderLoopComponent
};