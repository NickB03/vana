/**
 * Example implementation demonstrating optimized API, SSE, and store usage
 * Shows how to integrate all performance optimizations in a real component
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { optimizedApiClient } from '@/lib/api/optimized-client';
import { useOptimizedSSE } from '@/hooks/useOptimizedSSE';
import { useOptimizedChatStore } from '@/hooks/chat/optimized-store';
import { performanceMonitor } from '@/lib/performance-monitor';
import { useQueryOptimization } from '@/lib/api/query-optimizer';
import { memoWithTracking } from '@/lib/react-performance';

interface OptimizedChatExampleProps {
  sessionId: string;
  autoConnect?: boolean;
}

/**
 * Optimized chat component with all performance enhancements
 */
const OptimizedChatExample: React.FC<OptimizedChatExampleProps> = memoWithTracking(({
  sessionId,
  autoConnect = true,
}) => {
  // Use optimized store
  const {
    sessions,
    currentSessionId,
    setCurrentSession,
    addMessage,
    updateStreamingMessage,
    cleanupOldSessions,
    optimizeMemory,
    getPerformanceMetrics,
  } = useOptimizedChatStore();

  // Use optimized SSE
  const sse = useOptimizedSSE(`/api/sse/session/${sessionId}`, {
    enabled: autoConnect,
    maxEvents: 1000,
    intelligentReconnect: true,
    connectionTimeout: 10000,
    autoReconnect: true,
    maxReconnectAttempts: 5,
  });

  // Query optimization tracking
  const { trackQuery, getOptimizations, getSummary } = useQueryOptimization();

  // Performance state
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Memoize current session to prevent unnecessary re-renders
  const currentSession = useMemo(() => {
    return sessions[sessionId] || null;
  }, [sessions, sessionId]);

  // Handle SSE events with performance tracking
  useEffect(() => {
    if (!sse.lastEvent) return;

    const event = sse.lastEvent;
    const startTime = performance.now();

    try {
      switch (event.type) {
        case 'message_chunk':
          if (event.data.messageId && event.data.chunk) {
            updateStreamingMessage(sessionId, event.data.messageId, event.data.chunk);
          }
          break;

        case 'message_complete':
          if (event.data.messageId) {
            // Message streaming completed
            console.log('Message streaming completed:', event.data.messageId);
          }
          break;

        case 'research_progress':
          // Handle research progress updates
          console.log('Research progress:', event.data.progress);
          break;

        default:
          console.log('Unhandled SSE event:', event.type, event.data);
      }

      // Track event processing performance
      const processingTime = performance.now() - startTime;
      performanceMonitor.recordRenderMetrics({
        componentName: 'OptimizedChatExample',
        renderTime: processingTime,
        renderCount: 1,
        propsChanged: ['sse.lastEvent'],
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Error processing SSE event:', error);
    }
  }, [sse.lastEvent, sessionId, updateStreamingMessage]);

  // Load session data with performance tracking
  const loadSessionData = useCallback(async () => {
    const startTime = performance.now();

    try {
      // Track API call performance
      const sessions = await optimizedApiClient.listSessions();
      const loadTime = performance.now() - startTime;

      trackQuery(
        'SELECT * FROM sessions WHERE user_id = ?',
        loadTime,
        sessions.length,
        '/api/sessions'
      );

      performanceMonitor.recordAPIMetrics({
        endpoint: '/api/sessions',
        method: 'GET',
        responseTime: loadTime,
        statusCode: 200,
        cacheHit: false, // Would be determined by the API client
        timestamp: Date.now(),
        size: JSON.stringify(sessions).length,
      });

      return sessions;
    } catch (error) {
      const loadTime = performance.now() - startTime;

      performanceMonitor.recordAPIMetrics({
        endpoint: '/api/sessions',
        method: 'GET',
        responseTime: loadTime,
        statusCode: 500,
        cacheHit: false,
        timestamp: Date.now(),
      });

      throw error;
    }
  }, [trackQuery]);

  // Send message with optimization
  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) return;

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    const timestamp = new Date().toISOString();

    // Add user message immediately (optimistic update)
    addMessage(sessionId, {
      id: messageId,
      content,
      role: 'user',
      timestamp,
      sessionId,
    });

    try {
      // Send to API with performance tracking
      const startTime = performance.now();

      // TODO: Implement startResearch in OptimizedVanaAPIClient
      // await optimizedApiClient.startResearch(sessionId, {
      //   query: content,
      //   message: content,
      // });

      const responseTime = performance.now() - startTime;

      trackQuery(
        'INSERT INTO messages (session_id, content, role) VALUES (?, ?, ?)',
        responseTime,
        1,
        `/apps/vana/users/default/sessions/${sessionId}/run`
      );

    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error (remove optimistic update, show error, etc.)
    }
  }, [sessionId, addMessage, trackQuery]);

  // Performance optimization runner
  const runOptimizations = useCallback(async () => {
    setIsOptimizing(true);

    try {
      // 1. Clean up old sessions
      cleanupOldSessions(50, 7 * 24 * 60 * 60 * 1000); // 50 sessions, 7 days

      // 2. Optimize memory
      optimizeMemory();

      // 3. Clear old cache entries
      optimizedApiClient.clearCache();

      // 4. Generate performance report
      const report = performanceMonitor.generateReport();
      const queryOptimizations = getOptimizations();
      const querySummary = getSummary();

      setPerformanceReport({
        ...report,
        queryOptimizations,
        querySummary,
        storeMetrics: getPerformanceMetrics(),
        apiMetrics: optimizedApiClient.getMetrics(),
        sseMetrics: sse.metrics,
      });

      console.log('🚀 Performance optimization completed');
      console.log('Performance Report:', report);
      console.log('Query Optimizations:', queryOptimizations);

    } catch (error) {
      console.error('Performance optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [
    cleanupOldSessions,
    optimizeMemory,
    getOptimizations,
    getSummary,
    getPerformanceMetrics,
    sse.metrics,
  ]);

  // Auto-optimize on mount and periodically
  useEffect(() => {
    // Initial load
    loadSessionData().catch(console.error);

    // Set current session
    setCurrentSession(sessionId);

    // Auto-optimize periodically
    const optimizationInterval = setInterval(() => {
      runOptimizations();
    }, 300000); // Every 5 minutes

    // Cleanup on unmount
    return () => {
      clearInterval(optimizationInterval);
    };
  }, [sessionId, loadSessionData, setCurrentSession, runOptimizations]);

  // Performance monitoring display
  const performanceDisplay = useMemo(() => {
    if (!performanceReport) return null;

    const { overview, bottlenecks, trends, queryOptimizations } = performanceReport;

    return (
      <div className="performance-display">
        <h3>Performance Metrics</h3>

        <div className="metrics-overview">
          <div>API Requests: {overview.totalRequests}</div>
          <div>Avg Response Time: {overview.averageResponseTime}ms</div>
          <div>Cache Hit Ratio: {(overview.cacheHitRatio * 100).toFixed(1)}%</div>
          <div>Error Rate: {(overview.errorRate * 100).toFixed(1)}%</div>
          <div>Memory Usage: {overview.memoryUsage}MB</div>
          <div>Render Score: {overview.renderScore}%</div>
        </div>

        {bottlenecks.length > 0 && (
          <div className="bottlenecks">
            <h4>Performance Bottlenecks</h4>
            {bottlenecks.slice(0, 3).map((bottleneck: any, index: number) => (
              <div key={index} className={`bottleneck ${bottleneck.severity}`}>
                <strong>{bottleneck.description}</strong>
                <p>{bottleneck.impact}</p>
                <p><em>Recommendation: {bottleneck.recommendation}</em></p>
              </div>
            ))}
          </div>
        )}

        {queryOptimizations.length > 0 && (
          <div className="query-optimizations">
            <h4>Query Optimizations</h4>
            {queryOptimizations.slice(0, 3).map((opt: any, index: number) => (
              <div key={index} className={`optimization ${opt.impact}`}>
                <strong>{opt.description}</strong>
                <p>{opt.implementation}</p>
                <p><em>Estimated improvement: {opt.estimatedImprovement}</em></p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [performanceReport]);

  return (
    <div className="optimized-chat-example">
      <div className="chat-header">
        <h2>Optimized Chat Session</h2>
        <div className="connection-status">
          <span className={`status ${sse.connectionState}`}>
            {sse.connectionState}
          </span>
          {sse.isConnected && (
            <span className="metrics">
              Events: {sse.events.length} |
              Reconnections: {sse.metrics.reconnections} |
              Uptime: {Math.round(sse.metrics.connectionUptime / 1000)}s |
              Latency: {Math.round(sse.metrics.averageLatency)}ms
            </span>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {currentSession?.messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="content">{message.content}</div>
            <div className="timestamp">{message.timestamp}</div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type your message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              sendMessage(e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      <div className="performance-controls">
        <button
          onClick={runOptimizations}
          disabled={isOptimizing}
          className="optimize-button"
        >
          {isOptimizing ? 'Optimizing...' : 'Run Performance Optimization'}
        </button>

        <button
          onClick={() => {
            console.log('API Metrics:', optimizedApiClient.getMetrics());
            console.log('SSE Metrics:', sse.metrics);
            console.log('Store Metrics:', getPerformanceMetrics());
            console.log('Query Summary:', getSummary());
          }}
          className="metrics-button"
        >
          Log Current Metrics
        </button>
      </div>

      {performanceDisplay}

      <style jsx>{`
        .optimized-chat-example {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .connection-status .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status.connected { background: #d4edda; color: #155724; }
        .status.connecting { background: #fff3cd; color: #856404; }
        .status.disconnected { background: #f8d7da; color: #721c24; }
        .status.error { background: #f8d7da; color: #721c24; }

        .metrics {
          font-size: 11px;
          color: #666;
          margin-left: 10px;
        }

        .chat-messages {
          height: 400px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 20px;
        }

        .message {
          margin-bottom: 15px;
          padding: 10px;
          border-radius: 4px;
        }

        .message.user {
          background: #e3f2fd;
          margin-left: 20%;
        }

        .message.assistant {
          background: #f5f5f5;
          margin-right: 20%;
        }

        .message .content {
          font-size: 14px;
          line-height: 1.4;
        }

        .message .timestamp {
          font-size: 11px;
          color: #666;
          margin-top: 5px;
        }

        .chat-input input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 14px;
        }

        .performance-controls {
          margin: 20px 0;
          display: flex;
          gap: 10px;
        }

        .optimize-button, .metrics-button {
          padding: 8px 16px;
          border: 1px solid #007bff;
          border-radius: 4px;
          background: #007bff;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }

        .optimize-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .metrics-button {
          background: #6c757d;
          border-color: #6c757d;
        }

        .performance-display {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .metrics-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .metrics-overview div {
          padding: 8px;
          background: white;
          border-radius: 4px;
          font-size: 14px;
        }

        .bottleneck, .optimization {
          margin-bottom: 15px;
          padding: 15px;
          border-radius: 4px;
          border-left: 4px solid;
        }

        .bottleneck.critical, .optimization.critical {
          border-left-color: #dc3545;
          background: #f8d7da;
        }

        .bottleneck.high, .optimization.high {
          border-left-color: #fd7e14;
          background: #fff3cd;
        }

        .bottleneck.medium, .optimization.medium {
          border-left-color: #ffc107;
          background: #fff3cd;
        }

        .bottleneck.low, .optimization.low {
          border-left-color: #28a745;
          background: #d4edda;
        }

        .bottleneck strong, .optimization strong {
          display: block;
          margin-bottom: 5px;
        }

        .bottleneck p, .optimization p {
          margin: 5px 0;
          font-size: 13px;
        }

        .bottleneck em, .optimization em {
          color: #666;
        }
      `}</style>
    </div>
  );
}, undefined, 'OptimizedChatExample');

export default OptimizedChatExample;