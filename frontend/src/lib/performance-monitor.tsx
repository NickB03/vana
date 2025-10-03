/**
 * Performance Monitoring Utilities for React Error #185 Detection
 * Detects and reports infinite re-render loops and performance issues
 */

import React, { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  memoryUsage?: number;
  lastRenderTime: number;
  warningThreshold: number;
  errorThreshold: number;
}

interface RenderIssue {
  componentName: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  renderCount: number;
  timestamp: number;
  stackTrace?: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private issues: RenderIssue[] = [];
  private listeners: ((issue: RenderIssue) => void)[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  trackRender(componentName: string, warningThreshold = 15, errorThreshold = 30): void {
    if (process.env.NODE_ENV === 'production') {
      return; // Only track in development
    }

    const now = performance.now();
    const existing = this.metrics.get(componentName);

    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = now;
      
      // Check for potential infinite loops
      if (existing.renderCount > errorThreshold) {
        this.reportIssue({
          componentName,
          type: 'critical',
          message: `Critical: Potential infinite re-render loop detected! ${existing.renderCount} renders`,
          renderCount: existing.renderCount,
          timestamp: now,
          stackTrace: new Error().stack
        });
      } else if (existing.renderCount > warningThreshold) {
        this.reportIssue({
          componentName,
          type: 'warning',
          message: `Warning: High render count detected: ${existing.renderCount} renders`,
          renderCount: existing.renderCount,
          timestamp: now
        });
      }
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        averageRenderTime: 0,
        lastRenderTime: now,
        warningThreshold,
        errorThreshold
      });
    }
  }

  public reportIssue(issue: RenderIssue): void {
    this.issues.push(issue);
    
    // Keep only last 100 issues
    if (this.issues.length > 100) {
      this.issues = this.issues.slice(-100);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(issue));

    // Log to console with appropriate level
    switch (issue.type) {
      case 'warning':
        console.warn(`🔄 React Performance Warning: ${issue.message}`, {
          component: issue.componentName,
          renderCount: issue.renderCount,
          timestamp: new Date(issue.timestamp).toISOString()
        });
        break;
      case 'error':
        console.error(`🚨 React Performance Error: ${issue.message}`, {
          component: issue.componentName,
          renderCount: issue.renderCount,
          timestamp: new Date(issue.timestamp).toISOString()
        });
        break;
      case 'critical':
        console.error(`💥 CRITICAL React Performance Issue: ${issue.message}`, {
          component: issue.componentName,
          renderCount: issue.renderCount,
          timestamp: new Date(issue.timestamp).toISOString(),
          stackTrace: issue.stackTrace
        });
        break;
    }
  }

  subscribe(listener: (issue: RenderIssue) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getIssues(): RenderIssue[] {
    return [...this.issues];
  }

  reset(): void {
    this.metrics.clear();
    this.issues = [];
  }

  resetComponent(componentName: string): void {
    this.metrics.delete(componentName);
    this.issues = this.issues.filter(issue => issue.componentName !== componentName);
  }
}

/**
 * Hook to track component render performance and detect React Error #185
 */
export function usePerformanceMonitor(
  componentName: string,
  warningThreshold = 15,
  errorThreshold = 30
): {
  renderCount: number;
  hasIssues: boolean;
  reset: () => void;
} {
  const monitor = PerformanceMonitor.getInstance();
  const [renderCount, setRenderCount] = useState(0);
  const [hasIssues, setHasIssues] = useState(false);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    setRenderCount(renderCountRef.current);
    monitor.trackRender(componentName, warningThreshold, errorThreshold);
  });

  useEffect(() => {
    const unsubscribe = monitor.subscribe((issue) => {
      if (issue.componentName === componentName) {
        setHasIssues(true);
      }
    });

    return unsubscribe;
  }, [componentName, monitor]);

  const reset = useRef(() => {
    renderCountRef.current = 0;
    setRenderCount(0);
    setHasIssues(false);
    monitor.resetComponent(componentName);
  });

  return {
    renderCount,
    hasIssues,
    reset: reset.current
  };
}

/**
 * React component to display performance monitoring dashboard
 */
export function PerformanceMonitorDashboard({ 
  visible = false 
}: { 
  visible?: boolean 
}): JSX.Element | null {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [issues, setIssues] = useState<RenderIssue[]>([]);

  useEffect(() => {
    if (!visible) return;

    const monitor = PerformanceMonitor.getInstance();
    
    const updateData = () => {
      setMetrics(monitor.getMetrics());
      setIssues(monitor.getIssues());
    };

    updateData();
    const interval = setInterval(updateData, 1000);

    const unsubscribe = monitor.subscribe((issue) => {
      setIssues(monitor.getIssues());
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [visible]);

  if (!visible || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '300px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '0 0 0 10px',
      zIndex: 10000,
      fontSize: '12px',
      overflow: 'auto'
    }}>
      <h3>⚡ Performance Monitor</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Component Renders:</strong>
        {metrics.length === 0 ? (
          <div>No components tracked</div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.componentName} style={{
              padding: '2px 0',
              color: metric.renderCount > metric.errorThreshold ? '#ff6b6b' :
                     metric.renderCount > metric.warningThreshold ? '#ffa500' : '#4ecdc4'
            }}>
              {metric.componentName}: {metric.renderCount} renders
            </div>
          ))
        )}
      </div>

      <div>
        <strong>Recent Issues:</strong>
        {issues.length === 0 ? (
          <div style={{ color: '#4ecdc4' }}>✅ No performance issues detected</div>
        ) : (
          issues.slice(-5).map((issue, index) => (
            <div key={index} style={{
              padding: '2px 0',
              color: issue.type === 'critical' ? '#ff6b6b' :
                     issue.type === 'error' ? '#ff8c42' : '#ffa500'
            }}>
              {issue.type.toUpperCase()}: {issue.componentName} - {issue.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Export singleton instance for direct access
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Development-only performance warning for React Error #185
 */
export function warnAboutPotentialLoop(componentName: string, renderCount: number): void {
  if (process.env.NODE_ENV === 'production') return;
  
  if (renderCount > 20) {
    console.warn(
      `🔄 Potential React Error #185 detected in ${componentName}!\n` +
      `Render count: ${renderCount}\n` +
      `This might indicate:\n` +
      `1. Objects/arrays created in render without memoization\n` +
      `2. Unstable callback functions causing child re-renders\n` +
      `3. State updates triggering infinite loops\n` +
      `4. Dependencies in useEffect/useMemo changing every render\n\n` +
      `Consider using React.memo, useMemo, useCallback, or stable dependencies.`
    );
  }
}

/**
 * Error boundary component that catches React Error #185
 */
export class RenderLoopErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; errorInfo: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is the specific React Error #185
    if (error.message.includes('Maximum update depth exceeded') || 
        error.message.includes('Too many re-renders')) {
      return { 
        hasError: true, 
        errorInfo: 'React Error #185: Infinite re-render loop detected' 
      };
    }
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 React Render Loop Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    performanceMonitor.reportIssue({
      componentName: 'ErrorBoundary',
      type: 'critical',
      message: `Error Boundary caught: ${error.message}`,
      renderCount: 0,
      timestamp: Date.now(),
      stackTrace: error.stack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          <h2>🚨 React Render Loop Detected</h2>
          <p>{this.state.errorInfo}</p>
          <p>Check the console for detailed information about the performance issue.</p>
          <button onClick={() => this.setState({ hasError: false, errorInfo: '' })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}