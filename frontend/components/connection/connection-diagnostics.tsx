"use client";

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity,
  BarChart3,
  Clock,
  Cpu,
  Database,
  Download,
  Globe,
  Layers,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle
} from 'lucide-react';
import { ConnectionMetrics, CircuitBreakerState, ConnectionDiagnostics as ConnectionDiagnosticsType } from '@/hooks/useEnhancedSSEClient';

export interface ConnectionDiagnosticsProps {
  metrics: ConnectionMetrics;
  circuitBreaker: CircuitBreakerState;
  diagnostics: ConnectionDiagnosticsType;
  connectionStatus: string;
  sessionId: string;
  retryCount: number;
  eventCount: number;
  eventQueueOverflow: boolean;
  onExportDiagnostics?: () => void;
  onResetMetrics?: () => void;
}

export function ConnectionDiagnostics({
  metrics,
  circuitBreaker,
  diagnostics,
  connectionStatus,
  sessionId,
  retryCount,
  eventCount,
  eventQueueOverflow,
  onExportDiagnostics,
  onResetMetrics
}: ConnectionDiagnosticsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatLatency = (latency: number) => {
    if (latency < 1) return `${latency.toFixed(2)}ms`;
    if (latency < 100) return `${Math.round(latency)}ms`;
    if (latency < 1000) return `${Math.round(latency)}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const getLatencyStats = () => {
    if (diagnostics.latency.length === 0) return null;
    
    const sorted = [...diagnostics.latency].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sorted.reduce((sum, l) => sum + l, 0) / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  };

  const latencyStats = getLatencyStats();

  const DiagnosticSection = ({ 
    title, 
    icon: Icon, 
    children, 
    sectionKey 
  }: { 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode; 
    sectionKey: string; 
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-sm">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-3 border-t bg-gray-50/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  const MetricCard = ({ 
    label, 
    value, 
    unit = '', 
    trend, 
    color = 'text-gray-900',
    copyable = false 
  }: { 
    label: string; 
    value: string | number; 
    unit?: string; 
    trend?: 'up' | 'down' | 'stable'; 
    color?: string;
    copyable?: boolean;
  }) => (
    <div className="flex items-center justify-between p-2 rounded bg-white border">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`font-mono text-sm ${color}`}>
          {value}{unit}
        </span>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
        {copyable && (
          <button
            onClick={() => copyToClipboard(String(value), label)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {copiedField === label ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Connection Diagnostics</h3>
        <div className="flex gap-2">
          {onResetMetrics && (
            <button
              onClick={onResetMetrics}
              className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Reset Metrics
            </button>
          )}
          {onExportDiagnostics && (
            <button
              onClick={onExportDiagnostics}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              <Download className="h-3 w-3 inline mr-1" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Overview Section */}
      <DiagnosticSection title="Connection Overview" icon={Globe} sectionKey="overview">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Status" value={connectionStatus} />
          <MetricCard label="Session ID" value={sessionId.slice(0, 8) + '...'} copyable />
          <MetricCard label="Quality" value={metrics.connectionQuality} />
          <MetricCard label="Uptime" value={formatDuration(metrics.uptime)} />
          <MetricCard label="Total Connections" value={metrics.totalConnections} />
          <MetricCard label="Reconnections" value={metrics.reconnectionCount} />
          <MetricCard label="Events Processed" value={eventCount} />
          <MetricCard label="Queue Overflow" value={eventQueueOverflow ? 'Yes' : 'No'} 
            color={eventQueueOverflow ? 'text-red-500' : 'text-green-500'} />
        </div>
      </DiagnosticSection>

      {/* Performance Metrics */}
      <DiagnosticSection title="Performance Metrics" icon={BarChart3} sectionKey="performance">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Average Latency" value={formatLatency(metrics.averageLatency)} />
            <MetricCard label="Event Processing" value={formatLatency(metrics.eventProcessingTime)} />
            <MetricCard label="Error Rate" value={(metrics.errorRate * 100).toFixed(2)} unit="%" 
              color={metrics.errorRate > 0.05 ? 'text-red-500' : 'text-green-500'} />
            <MetricCard label="Current Retry Count" value={retryCount} />
          </div>
          
          {latencyStats && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Latency Distribution</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <MetricCard label="Min" value={formatLatency(latencyStats.min)} />
                  <MetricCard label="P50" value={formatLatency(latencyStats.p50)} />
                  <MetricCard label="P95" value={formatLatency(latencyStats.p95)} />
                  <MetricCard label="P99" value={formatLatency(latencyStats.p99)} />
                  <MetricCard label="Max" value={formatLatency(latencyStats.max)} />
                  <MetricCard label="Samples" value={diagnostics.latency.length} />
                </div>
              </div>
            </>
          )}
        </div>
      </DiagnosticSection>

      {/* Circuit Breaker */}
      <DiagnosticSection title="Circuit Breaker" icon={Shield} sectionKey="circuit">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={circuitBreaker.state === 'closed' ? 'default' : 'destructive'}>
              {circuitBreaker.state.toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-600">
              {circuitBreaker.state === 'closed' && 'Protection system normal'}
              {circuitBreaker.state === 'open' && 'Blocking connections due to failures'}
              {circuitBreaker.state === 'half-open' && 'Testing connection stability'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Failure Count" value={circuitBreaker.failureCount} 
              color={circuitBreaker.failureCount > 0 ? 'text-yellow-500' : 'text-green-500'} />
            <MetricCard label="Last Failure" 
              value={circuitBreaker.lastFailureTime > 0 
                ? new Date(circuitBreaker.lastFailureTime).toLocaleTimeString() 
                : 'None'} />
          </div>
          
          {circuitBreaker.state === 'open' && circuitBreaker.nextAttemptTime > Date.now() && (
            <div className="space-y-1">
              <span className="text-xs text-gray-600">Next attempt in:</span>
              <Progress 
                value={((circuitBreaker.nextAttemptTime - circuitBreaker.lastFailureTime) - 
                        (circuitBreaker.nextAttemptTime - Date.now())) / 
                       (circuitBreaker.nextAttemptTime - circuitBreaker.lastFailureTime) * 100}
                className="h-2"
              />
              <div className="text-xs text-center">
                {Math.round((circuitBreaker.nextAttemptTime - Date.now()) / 1000)}s
              </div>
            </div>
          )}
        </div>
      </DiagnosticSection>

      {/* Network Diagnostics */}
      <DiagnosticSection title="Network Diagnostics" icon={Activity} sectionKey="network">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Network Type" value={diagnostics.networkType || 'Unknown'} />
          <MetricCard label="Bandwidth" value={diagnostics.effectiveBandwidth.toFixed(1)} unit=" Mbps" />
          <MetricCard label="Jitter" value={diagnostics.jitter.toFixed(2)} unit="ms" />
          <MetricCard label="Packets Lost" value={diagnostics.packetsLost} />
        </div>
      </DiagnosticSection>

      {/* System Information */}
      <DiagnosticSection title="System Information" icon={Cpu} sectionKey="system">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="User Agent" value={navigator.userAgent.split(' ')[0]} copyable />
          <MetricCard label="Platform" value={navigator.platform} />
          <MetricCard label="Language" value={navigator.language} />
          <MetricCard label="Online" value={navigator.onLine ? 'Yes' : 'No'} 
            color={navigator.onLine ? 'text-green-500' : 'text-red-500'} />
          <MetricCard label="Cookie Enabled" value={navigator.cookieEnabled ? 'Yes' : 'No'} />
          <MetricCard label="Concurrent Connections" 
            value={(navigator as any).hardwareConcurrency || 'Unknown'} />
        </div>
      </DiagnosticSection>
    </div>
  );
}

export default ConnectionDiagnostics;