# Agent 3: Agent Monitoring Dashboard Implementation

## 🎯 **MISSION**
Create a comprehensive monitoring dashboard using shadcn/ui components that displays real-time agent activity, performance metrics, system health, and tool usage analytics integrated with the existing monitoring infrastructure.

## 📋 **SCOPE & DELIVERABLES**

### **Primary Deliverables:**
1. **Agent Activity Monitor** - Real-time agent status and activity tracking
2. **Performance Dashboard** - System performance metrics and analytics
3. **Health Status Panel** - System health checks and alerts
4. **Tool Usage Analytics** - Tool execution statistics and performance
5. **Responsive Layout** - Collapsible panels for mobile and desktop

### **Technical Requirements:**
- Use shadcn/ui components for consistent design
- Integrate with existing Flask monitoring APIs
- Real-time updates via WebSocket (when available)
- Responsive design with collapsible panels
- Chart visualizations for metrics
- Export functionality for reports

## 🏗️ **IMPLEMENTATION PLAN**

### **Step 1: Install shadcn/ui Components**
```bash
cd /Users/nick/Development/vana-enhanced/frontend
npx shadcn-ui@latest init
npx shadcn-ui@latest add card badge progress separator tabs
npx shadcn-ui@latest add chart tooltip popover dropdown-menu
npx shadcn-ui@latest add collapsible accordion sheet
npm install recharts lucide-react date-fns
```

### **Step 2: Create Main Dashboard Layout**
Create `frontend/src/components/dashboard/MonitoringDashboard.tsx`:
```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Monitor, Activity, BarChart3, AlertTriangle, Menu } from 'lucide-react';
import { AgentActivityPanel } from './AgentActivityPanel';
import { PerformancePanel } from './PerformancePanel';
import { HealthStatusPanel } from './HealthStatusPanel';
import { ToolAnalyticsPanel } from './ToolAnalyticsPanel';

interface MonitoringDashboardProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isCollapsed = false,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState('activity');

  const DashboardContent = () => (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">System Monitor</h2>
          {onToggle && (
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-4">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="activity" className="h-full m-0">
            <AgentActivityPanel />
          </TabsContent>
          <TabsContent value="performance" className="h-full m-0">
            <PerformancePanel />
          </TabsContent>
          <TabsContent value="health" className="h-full m-0">
            <HealthStatusPanel />
          </TabsContent>
          <TabsContent value="analytics" className="h-full m-0">
            <ToolAnalyticsPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  // Mobile: Use Sheet, Desktop: Use fixed panel
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Monitor className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-96">
          <DashboardContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={`bg-background border-l transition-all duration-300 ${
      isCollapsed ? 'w-0 overflow-hidden' : 'w-96'
    }`}>
      <DashboardContent />
    </div>
  );
};
```

### **Step 3: Create Agent Activity Panel**
Create `frontend/src/components/dashboard/AgentActivityPanel.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bot, Clock, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentActivity {
  id: string;
  agentName: string;
  status: 'active' | 'idle' | 'error' | 'completed';
  currentTask?: string;
  progress?: number;
  startTime: Date;
  lastActivity: Date;
  toolsUsed: number;
  tasksCompleted: number;
}

export const AgentActivityPanel: React.FC = () => {
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent activity data
    fetchAgentActivity();
    const interval = setInterval(fetchAgentActivity, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentActivity = async () => {
    try {
      const response = await fetch('/api/agents/activity');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bot className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Agent Activity</h3>
        <p className="text-sm text-muted-foreground">
          Real-time status of all agents
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(agent.status)}
                    <CardTitle className="text-base">{agent.agentName}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {agent.currentTask && (
                  <div>
                    <p className="text-sm font-medium">Current Task:</p>
                    <p className="text-sm text-muted-foreground">{agent.currentTask}</p>
                    {agent.progress !== undefined && (
                      <Progress value={agent.progress} className="mt-2" />
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Active: {formatDistanceToNow(agent.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>Tools: {agent.toolsUsed}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tasks: {agent.tasksCompleted}</span>
                  <span>Last: {formatDistanceToNow(agent.lastActivity)} ago</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
```

### **Step 4: Create Performance Panel**
Create `frontend/src/components/dashboard/PerformancePanel.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Cpu, Memory, Clock } from 'lucide-react';

interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export const PerformancePanel: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceMetrics();
    const interval = setInterval(fetchPerformanceMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/performance/metrics');
      const data = await response.json();
      setMetrics(data.history || []);
      setCurrentMetrics(data.current || null);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatMetric = (value: number, unit: string) => {
    return `${value.toFixed(1)}${unit}`;
  };

  if (loading || !currentMetrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading performance data...</div>
      </div>
    );
  }

  const previousMetrics = metrics[metrics.length - 2];

  return (
    <div className="p-4 h-full flex flex-col space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <p className="text-sm text-muted-foreground">
          Real-time system performance
        </p>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-2xl font-bold">
                  {formatMetric(currentMetrics.responseTime, 'ms')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {previousMetrics && getTrendIcon(currentMetrics.responseTime, previousMetrics.responseTime)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cache Hit Rate</p>
                <p className="text-2xl font-bold">
                  {formatMetric(currentMetrics.cacheHitRate, '%')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                {previousMetrics && getTrendIcon(currentMetrics.cacheHitRate, previousMetrics.cacheHitRate)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Throughput</p>
                <p className="text-2xl font-bold">
                  {formatMetric(currentMetrics.throughput, '/s')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                {previousMetrics && getTrendIcon(currentMetrics.throughput, previousMetrics.throughput)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Memory Usage</p>
                <p className="text-2xl font-bold">
                  {formatMetric(currentMetrics.memoryUsage, '%')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Memory className="h-4 w-4 text-muted-foreground" />
                {previousMetrics && getTrendIcon(currentMetrics.memoryUsage, previousMetrics.memoryUsage)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance Chart */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">Response Time Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number) => [`${value}ms`, 'Response Time']}
              />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
```

### **Step 5: Create Health Status Panel**
Create `frontend/src/components/dashboard/HealthStatusPanel.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database, Wifi } from 'lucide-react';

interface HealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: string;
  responseTime?: number;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  score: number;
  checks: HealthCheck[];
  uptime: string;
}

export const HealthStatusPanel: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealthStatus();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComponentIcon = (component: string) => {
    if (component.toLowerCase().includes('database')) return <Database className="h-4 w-4" />;
    if (component.toLowerCase().includes('api')) return <Server className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading health status...</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p>Failed to load health status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Health</h3>
          <p className="text-sm text-muted-foreground">
            Overall health score: {health.score}/100
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Overall Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(health.overall)}
              <span className="font-medium">System Status</span>
            </div>
            <Badge className={getStatusColor(health.overall)}>
              {health.overall.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Uptime: {health.uptime}
          </p>
        </CardContent>
      </Card>
      
      {/* Component Health Checks */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">Component Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="space-y-2 p-4">
              {health.checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getComponentIcon(check.component)}
                    <div>
                      <p className="font-medium text-sm">{check.component}</p>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {check.responseTime}ms
                      </span>
                    )}
                    {getStatusIcon(check.status)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
```

## ✅ **SUCCESS CRITERIA**

1. **Comprehensive Monitoring** - Real-time agent activity, performance, and health
2. **Responsive Design** - Works on mobile and desktop with collapsible panels
3. **Real-time Updates** - Live data updates via API polling
4. **Visual Analytics** - Charts and graphs for performance metrics
5. **Integration Ready** - Compatible with existing Flask monitoring APIs
6. **Accessibility** - WCAG 2.1 AA compliant components
7. **Export Functionality** - Data export capabilities for reports

## 📝 **DELIVERABLE FILES**

1. `frontend/src/components/dashboard/MonitoringDashboard.tsx` - Main dashboard
2. `frontend/src/components/dashboard/AgentActivityPanel.tsx` - Agent activity monitor
3. `frontend/src/components/dashboard/PerformancePanel.tsx` - Performance metrics
4. `frontend/src/components/dashboard/HealthStatusPanel.tsx` - Health status
5. `frontend/src/components/dashboard/ToolAnalyticsPanel.tsx` - Tool analytics
6. Updated `frontend/package.json` - New dependencies

**Branch**: Create `feat/monitoring-dashboard`
**PR Title**: "Add Comprehensive Monitoring Dashboard with shadcn/ui"
