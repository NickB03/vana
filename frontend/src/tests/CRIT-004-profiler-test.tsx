/**
 * CRIT-004 - SSE Re-render Profiler Test
 *
 * This test verifies that the useSSE hook fixes prevent infinite re-renders
 * and maintain stable SSE connections.
 *
 * Run with React DevTools Profiler:
 * 1. npm run dev
 * 2. Open browser with React DevTools
 * 3. Navigate to this test component
 * 4. Start Profiler recording
 * 5. Send a message to trigger SSE
 * 6. Verify max 2-3 renders per message
 */

import React, { Profiler, ProfilerOnRenderCallback, useRef, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

interface ProfileMetrics {
  renderCount: number;
  totalRenderTime: number;
  renders: Array<{
    id: string;
    phase: 'mount' | 'update' | 'nested-update';
    actualDuration: number;
    baseDuration: number;
    startTime: number;
  }>;
}

export function SSERenderProfilerTest() {
  const [sessionId] = useState(() => `test-${Date.now()}`);
  const [url] = useState(`/api/run_sse/${sessionId}`);
  const metricsRef = useRef<ProfileMetrics>({
    renderCount: 0,
    totalRenderTime: 0,
    renders: []
  });

  const onRenderCallback: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime
  ) => {
    metricsRef.current.renderCount++;
    metricsRef.current.totalRenderTime += actualDuration;
    metricsRef.current.renders.push({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime
    });

    console.log('[Profiler] useSSE render:', {
      renderCount: metricsRef.current.renderCount,
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      totalTime: `${metricsRef.current.totalRenderTime.toFixed(2)}ms`
    });

    // ALERT if excessive re-renders detected
    if (metricsRef.current.renderCount > 5) {
      console.error('❌ EXCESSIVE RE-RENDERS DETECTED:', metricsRef.current.renderCount);
      console.error('Expected: max 2-3 renders per state change');
      console.error('Actual:', metricsRef.current.renderCount);
    }
  };

  const {
    connectionState,
    lastEvent,
    events,
    error,
    isConnected,
    connect,
    disconnect,
    clearEvents
  } = useSSE(url, {
    enabled: true,
    autoReconnect: true,
    maxReconnectAttempts: 3
  });

  const resetMetrics = () => {
    metricsRef.current = {
      renderCount: 0,
      totalRenderTime: 0,
      renders: []
    };
    console.log('✅ Metrics reset');
  };

  const checkStability = () => {
    const metrics = metricsRef.current;
    const eventCount = events.length;
    const expectedMaxRenders = eventCount * 3; // Max 3 renders per event

    console.log('\n📊 STABILITY CHECK:');
    console.log('Events received:', eventCount);
    console.log('Total renders:', metrics.renderCount);
    console.log('Expected max renders:', expectedMaxRenders);
    console.log('Average render time:',
      eventCount > 0 ? `${(metrics.totalRenderTime / metrics.renderCount).toFixed(2)}ms` : 'N/A'
    );

    if (metrics.renderCount <= expectedMaxRenders) {
      console.log('✅ PASS: Render count within acceptable range');
    } else {
      console.error('❌ FAIL: Excessive re-renders detected');
    }

    console.log('\nDetailed render log:');
    metrics.renders.forEach((render, idx) => {
      console.log(`  ${idx + 1}. ${render.phase} - ${render.actualDuration.toFixed(2)}ms`);
    });
  };

  return (
    <Profiler id="useSSE-hook" onRender={onRenderCallback}>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">CRIT-004: SSE Re-render Profiler Test</h1>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <h2 className="font-semibold mb-2">Connection Status</h2>
          <div className="space-y-2">
            <p><strong>State:</strong> <span className={`font-mono ${
              isConnected ? 'text-green-600' : 'text-gray-500'
            }`}>{connectionState}</span></p>
            <p><strong>Events received:</strong> {events.length}</p>
            <p><strong>Renders:</strong> <span className={`font-mono ${
              metricsRef.current.renderCount > 5 ? 'text-red-600' : 'text-green-600'
            }`}>{metricsRef.current.renderCount}</span></p>
            <p><strong>Total render time:</strong> {metricsRef.current.totalRenderTime.toFixed(2)}ms</p>
            {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
          </div>
        </div>

        <div className="space-x-2 mb-4">
          <button
            onClick={connect}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            Disconnect
          </button>
          <button
            onClick={clearEvents}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Clear Events
          </button>
          <button
            onClick={resetMetrics}
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            Reset Metrics
          </button>
          <button
            onClick={checkStability}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Check Stability
          </button>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Recent Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.slice(-10).reverse().map((event, idx) => (
              <div key={idx} className="p-2 bg-white dark:bg-gray-700 rounded text-sm">
                <p><strong>Type:</strong> {event.type}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {JSON.stringify(event.data).substring(0, 100)}...
                </p>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-500">No events received yet</p>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">Success Criteria (from audit):</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>✓ useSSE hook renders only once per state change</li>
            <li>✓ connect/disconnect callbacks have stable references</li>
            <li>✓ SSE connections remain stable without reconnection loops</li>
            <li>✓ React DevTools shows no excessive re-renders</li>
            <li>✓ Max 2-3 renders per message</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open React DevTools in browser</li>
            <li>Go to Profiler tab</li>
            <li>Click "Start Profiling"</li>
            <li>Click "Connect" button above</li>
            <li>Send test messages to trigger SSE events</li>
            <li>Click "Stop Profiling" in DevTools</li>
            <li>Click "Check Stability" button above</li>
            <li>Verify render count is &lt;= 3x event count</li>
          </ol>
        </div>
      </div>
    </Profiler>
  );
}

export default SSERenderProfilerTest;
