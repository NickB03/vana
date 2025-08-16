#!/usr/bin/env node

/**
 * Development Task Simulator - Real-World Hook Testing
 * 
 * This module simulates actual development tasks that would occur in the Vana project:
 * - Creating new React components
 * - Modifying existing files
 * - Adding API endpoints
 * - Updating authentication flows
 * - Canvas integration changes
 * - SSE implementation updates
 * 
 * Each task tests different aspects of the hook system with realistic scenarios.
 */

const fs = require('fs').promises;
const path = require('path');
const { ClaudeCodeToolInterceptor } = require('../integration/claude-code-tool-interceptor');

class DevelopmentTaskSimulator {
  constructor(options = {}) {
    this.options = {
      testMode: options.testMode !== false,
      useRealFiles: options.useRealFiles || false,
      logLevel: options.logLevel || 'info',
      taskTimeout: options.taskTimeout || 30000,
      ...options
    };

    this.interceptor = new ClaudeCodeToolInterceptor({
      logLevel: this.options.logLevel,
      enableInterception: true
    });

    this.taskResults = [];
    this.overallStats = {
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      errorTasks: 0,
      averageTime: 0
    };
  }

  async initialize() {
    console.log('🛠️  Initializing Development Task Simulator...');
    console.log('================================================');
    
    await this.interceptor.initialize();
    console.log('✅ Claude Code tool interception ready');
    console.log('🎯 Ready to test real development workflows\n');
  }

  async runAllTasks() {
    console.log('🚀 Starting Real-World Development Task Testing');
    console.log('===============================================');

    const tasks = [
      { name: 'create-auth-component', description: 'Create new authentication component', runner: this.taskCreateAuthComponent.bind(this) },
      { name: 'update-canvas-integration', description: 'Update Canvas API integration', runner: this.taskUpdateCanvasIntegration.bind(this) },
      { name: 'add-sse-endpoint', description: 'Add new SSE endpoint', runner: this.taskAddSSEEndpoint.bind(this) },
      { name: 'refactor-state-management', description: 'Refactor component state management', runner: this.taskRefactorStateManagement.bind(this) },
      { name: 'add-error-boundary', description: 'Add error boundary component', runner: this.taskAddErrorBoundary.bind(this) },
      { name: 'implement-dark-mode', description: 'Implement dark mode toggle', runner: this.taskImplementDarkMode.bind(this) },
      { name: 'add-api-validation', description: 'Add API request validation', runner: this.taskAddAPIValidation.bind(this) },
      { name: 'create-dashboard-widget', description: 'Create new dashboard widget', runner: this.taskCreateDashboardWidget.bind(this) }
    ];

    for (const task of tasks) {
      console.log(`\n📋 Task: ${task.description}`);
      console.log(`⏱️  Starting ${task.name}...`);

      try {
        const startTime = Date.now();
        const result = await this.runTaskWithTimeout(task);
        const duration = Date.now() - startTime;

        result.duration = duration;
        result.taskName = task.name;
        result.description = task.description;

        this.taskResults.push(result);
        this.updateOverallStats(result);

        const status = result.success ? '✅ COMPLETED' : result.blocked ? '🚫 BLOCKED' : '❌ ERROR';
        console.log(`   ${status} (${duration}ms)`);

        if (result.blocked && result.blockingGuidance) {
          console.log('   📋 Blocking guidance provided for agent');
        }

        if (result.error) {
          console.log(`   ⚠️  Error: ${result.error}`);
        }

      } catch (error) {
        const result = {
          success: false,
          error: error.message,
          taskName: task.name,
          description: task.description,
          duration: Date.now() - startTime
        };

        this.taskResults.push(result);
        this.updateOverallStats(result);

        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    await this.generateTaskReport();
    return this.taskResults;
  }

  async runTaskWithTimeout(task) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${task.name} timed out after ${this.options.taskTimeout}ms`));
      }, this.options.taskTimeout);

      try {
        const result = await task.runner();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // ============================================================================
  // REAL DEVELOPMENT TASKS
  // ============================================================================

  async taskCreateAuthComponent() {
    const componentPath = '/src/components/auth/LoginForm.tsx';
    
    // Simulate creating a compliant auth component
    const componentContent = `import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="login-form">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="password-input"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            data-testid="login-button"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        componentPath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: componentPath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          blockingMessage: error.fullGuidanceMessage,
          operation: 'write',
          file: componentPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskUpdateCanvasIntegration() {
    const canvasPath = '/src/components/canvas/CanvasControls.tsx';
    
    // Simulate updating canvas integration with potential issues
    const componentContent = `import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

interface CanvasControlsProps {
  onBrushSizeChange: (size: number) => void;
  onClearCanvas: () => void;
  onSaveCanvas: () => void;
  brushSize: number;
}

export default function CanvasControls({
  onBrushSizeChange,
  onClearCanvas,
  onSaveCanvas,
  brushSize
}: CanvasControlsProps) {
  const handleBrushChange = useCallback((values: number[]) => {
    onBrushSizeChange(values[0]);
  }, [onBrushSizeChange]);

  return (
    <Card className="p-4 space-y-4" data-testid="canvas-controls">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Brush Size: {brushSize}px
        </label>
        <Slider
          value={[brushSize]}
          onValueChange={handleBrushChange}
          min={1}
          max={50}
          step={1}
          className="w-full"
          data-testid="brush-size-slider"
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={onClearCanvas}
          variant="outline"
          data-testid="clear-button"
        >
          Clear
        </Button>
        <Button
          onClick={onSaveCanvas}
          data-testid="save-button"
        >
          Save Canvas
        </Button>
      </div>
    </Card>
  );
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        canvasPath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: canvasPath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          blockingMessage: error.fullGuidanceMessage,
          operation: 'write',
          file: canvasPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskAddSSEEndpoint() {
    const apiPath = '/src/pages/api/sse/canvas-updates.ts';
    
    // Simulate adding SSE endpoint
    const endpointContent = `import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection event
  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\\n\\n');

  // Set up canvas update interval
  const intervalId = setInterval(() => {
    const updateData = {
      type: 'canvas-update',
      timestamp: new Date().toISOString(),
      data: {
        activeUsers: Math.floor(Math.random() * 10) + 1,
        changes: Math.floor(Math.random() * 5)
      }
    };

    res.write(\`data: \${JSON.stringify(updateData)}\\n\\n\`);
  }, 1000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });

  req.on('error', () => {
    clearInterval(intervalId);
    res.end();
  });
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        apiPath,
        endpointContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: apiPath,
        contentSize: endpointContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          operation: 'write',
          file: apiPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskRefactorStateManagement() {
    const componentPath = '/src/components/dashboard/UserStats.tsx';
    
    // Simulate refactoring with too many useState hooks (should trigger warning)
    const componentContent = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserStats() {
  const [userCount, setUserCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [newUsers, setNewUsers] = useState(0);
  const [returningUsers, setReturningUsers] = useState(0);
  const [averageSession, setAverageSession] = useState(0);
  const [bounceRate, setBounceRate] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        setUserCount(data.userCount);
        setActiveUsers(data.activeUsers);
        setNewUsers(data.newUsers);
        setReturningUsers(data.returningUsers);
        setAverageSession(data.averageSession);
        setBounceRate(data.bounceRate);
        setConversionRate(data.conversionRate);
        setRevenue(data.revenue);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="user-stats">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userCount.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeUsers.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newUsers.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${revenue.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        componentPath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: componentPath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation,
        performanceWarnings: result.hookResult?.prdValidation?.warnings
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          operation: 'write',
          file: componentPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskAddErrorBoundary() {
    const boundaryPath = '/src/components/common/ErrorBoundary.tsx';
    
    // Simulate creating an error boundary (should pass)
    const componentContent = `import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-lg mx-auto mt-8" data-testid="error-boundary">
          <CardHeader>
            <CardTitle className="text-red-600">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              We're sorry, but something unexpected happened.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-sm">
                <summary>Error details</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} data-testid="reset-error">
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        boundaryPath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: boundaryPath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          operation: 'write',
          file: boundaryPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskImplementDarkMode() {
    const themePath = '/src/components/theme/ThemeToggle.tsx';
    
    // Simulate implementing dark mode toggle
    const componentContent = `import React from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0"
      data-testid="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        themePath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: themePath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          operation: 'write',
          file: themePath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskAddAPIValidation() {
    const validationPath = '/src/lib/api-validation.ts';
    
    // Simulate adding API validation with potential security issues
    const validationContent = `import { z } from 'zod';

// User validation schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin', 'moderator']),
  createdAt: z.string().datetime()
});

// Canvas update validation
export const canvasUpdateSchema = z.object({
  canvasId: z.string().uuid(),
  userId: z.string().uuid(),
  changes: z.array(z.object({
    type: z.enum(['stroke', 'shape', 'text', 'erase']),
    data: z.record(z.any()),
    timestamp: z.number()
  })),
  sessionId: z.string()
});

// API request validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`).join(', ');
      throw new Error(\`Validation failed: \${errorMessage}\`);
    }
    throw error;
  }
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export type User = z.infer<typeof userSchema>;
export type CanvasUpdate = z.infer<typeof canvasUpdateSchema>;`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        validationPath,
        validationContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: validationPath,
        contentSize: validationContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          operation: 'write',
          file: validationPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  async taskCreateDashboardWidget() {
    const widgetPath = '/src/components/dashboard/ActivityWidget.tsx';
    
    // Simulate creating a dashboard widget with forbidden library (should block)
    const componentContent = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from 'react-bootstrap'; // This should be blocked!

interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: Date;
  type: 'canvas' | 'auth' | 'system';
}

export default function ActivityWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities');
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) {
    return (
      <Card data-testid="activity-widget">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="activity-widget">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{activity.user}</span>
                <span className="text-sm text-gray-600 ml-2">{activity.action}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={activity.type === 'canvas' ? 'default' : 'secondary'}>
                  {activity.type}
                </Badge>
                <span className="text-xs text-gray-500">
                  {activity.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4">
          View All Activities
        </Button>
      </CardContent>
    </Card>
  );
}`;

    try {
      const result = await this.interceptor.triggerOperation(
        'Write',
        widgetPath,
        componentContent
      );

      return {
        success: result.allowed,
        blocked: !result.allowed && result.hookResult?.blocked,
        blockingGuidance: result.hookResult?.agentGuidance,
        operation: 'write',
        file: widgetPath,
        contentSize: componentContent.length,
        validationResult: result.hookResult?.prdValidation
      };

    } catch (error) {
      if (error.blocking && error.blockingError) {
        return {
          success: false,
          blocked: true,
          blockingGuidance: error.agentGuidance,
          blockingMessage: error.fullGuidanceMessage,
          operation: 'write',
          file: widgetPath,
          error: 'PRD validation blocked the operation'
        };
      }
      throw error;
    }
  }

  // ============================================================================
  // REPORTING AND ANALYSIS
  // ============================================================================

  updateOverallStats(result) {
    this.overallStats.totalTasks++;
    
    if (result.success) {
      this.overallStats.completedTasks++;
    } else if (result.blocked) {
      this.overallStats.blockedTasks++;
    } else {
      this.overallStats.errorTasks++;
    }

    // Update average time
    const totalTime = this.taskResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    this.overallStats.averageTime = Math.round(totalTime / this.overallStats.totalTasks);
  }

  async generateTaskReport() {
    console.log('\n📊 DEVELOPMENT TASK TESTING REPORT');
    console.log('==================================');
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Tasks: ${this.overallStats.totalTasks}`);
    console.log(`   ✅ Completed: ${this.overallStats.completedTasks}`);
    console.log(`   🚫 Blocked: ${this.overallStats.blockedTasks}`);
    console.log(`   ❌ Errors: ${this.overallStats.errorTasks}`);
    console.log(`   ⏱️  Average Time: ${this.overallStats.averageTime}ms`);
    
    const successRate = (this.overallStats.completedTasks / this.overallStats.totalTasks) * 100;
    const blockRate = (this.overallStats.blockedTasks / this.overallStats.totalTasks) * 100;
    
    console.log(`   📊 Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   🛡️  Block Rate: ${blockRate.toFixed(1)}%`);

    console.log(`\n📋 Task Results:`);
    this.taskResults.forEach((result, index) => {
      const status = result.success ? '✅' : result.blocked ? '🚫' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.description} (${result.duration}ms)`);
      
      if (result.blocked && result.blockingGuidance) {
        console.log(`      📋 Agent guidance provided`);
      }
      
      if (result.performanceWarnings && result.performanceWarnings.length > 0) {
        console.log(`      ⚠️  ${result.performanceWarnings.length} performance warnings`);
      }
    });

    // Generate detailed report file
    const reportPath = path.join(process.cwd(), '.claude_workspace/reports/development-task-report.json');
    const reportDir = path.dirname(reportPath);
    
    // Ensure directory exists
    await fs.mkdir(reportDir, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      overallStats: this.overallStats,
      taskResults: this.taskResults,
      summary: {
        totalTasks: this.overallStats.totalTasks,
        successRate: successRate,
        blockRate: blockRate,
        averageExecutionTime: this.overallStats.averageTime
      }
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up task simulator...');
    await this.interceptor.shutdown();
    console.log('✅ Task simulator cleanup complete');
  }
}

module.exports = { DevelopmentTaskSimulator };

// CLI usage
if (require.main === module) {
  const simulator = new DevelopmentTaskSimulator({ logLevel: 'info' });
  
  async function main() {
    try {
      await simulator.initialize();
      const results = await simulator.runAllTasks();
      
      console.log('\n🎉 Development Task Testing Complete!');
      console.log('====================================');
      
      const successCount = results.filter(r => r.success).length;
      const blockCount = results.filter(r => r.blocked).length;
      
      console.log(`✅ ${successCount} tasks completed successfully`);
      console.log(`🚫 ${blockCount} tasks blocked by PRD validation`);
      console.log(`❌ ${results.length - successCount - blockCount} tasks had errors`);
      
      if (blockCount > 0) {
        console.log('\n📋 Blocked tasks received comprehensive agent guidance');
        console.log('🔄 Loop prevention system activated for repeated attempts');
      }
      
    } catch (error) {
      console.error('❌ Task simulation failed:', error.message);
      process.exit(1);
    } finally {
      await simulator.cleanup();
    }
  }
  
  main();
}