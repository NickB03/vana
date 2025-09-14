/**
 * UI Component Types for Vana AI Platform
 * 
 * Comprehensive type definitions for UI components, including:
 * - Canvas and markdown rendering types
 * - Connection and network status types
 * - Progressive enhancement types
 * - Activity feed and onboarding types
 */

import { ReactNode } from 'react';

// ============================================================================
// Markdown Canvas Types
// ============================================================================

export interface MarkdownParseOptions {
  allowHtml?: boolean;
  sanitize?: boolean;
  linkify?: boolean;
  breaks?: boolean;
}

export interface MarkdownRenderer {
  parse: (content: string, options?: MarkdownParseOptions) => string;
  sanitize: (html: string) => string;
}

export interface ExportFormat {
  type: 'markdown' | 'pdf' | 'html' | 'txt' | 'docx';
  mimeType: string;
  extension: string;
  displayName: string;
}

export interface ExportOptions {
  format: ExportFormat['type'];
  includeMetadata: boolean;
  includeTimestamps?: boolean;
  includeAgentInfo?: boolean;
  compression?: 'none' | 'gzip' | 'brotli';
}

export interface ResearchSessionMetadata {
  sessionId: string;
  query?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalAgents: number;
  completedAgents: number;
  currentPhase: string;
  overallProgress: number;
  status: 'initializing' | 'running' | 'completed' | 'error' | 'cancelled';
  error?: string;
  finalReportLength?: number;
  averageAgentResponseTime?: number;
}

export interface CanvasViewMode {
  mode: 'preview' | 'raw' | 'split';
  showMetadata: boolean;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

export interface ShareOptions {
  type: 'url' | 'file' | 'email' | 'clipboard';
  includeMetadata: boolean;
  format: ExportFormat['type'];
  expiresIn?: number; // For URL sharing
}

// ============================================================================
// Network and Connection Types
// ============================================================================

export interface NetworkConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
}

export interface BrowserNetworkAPI {
  connection?: NetworkConnectionInfo & {
    addEventListener: (event: string, handler: () => void) => void;
    removeEventListener: (event: string, handler: () => void) => void;
  };
  mozConnection?: NetworkConnectionInfo;
  webkitConnection?: NetworkConnectionInfo;
}

export interface ConnectionDiagnostics {
  networkStatus: 'online' | 'offline';
  connectionType: NetworkConnectionInfo['type'];
  effectiveType: NetworkConnectionInfo['effectiveType'];
  latency: number | null;
  bandwidth: number | null;
  serverReachable: boolean;
  lastSuccessfulConnection?: Date;
  failureCount: number;
  diagnosticsTimestamp: Date;
}

export interface ConnectionRetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  resetOnSuccess: boolean;
}

export interface ConnectionHealthMetrics {
  successRate: number; // 0-1
  averageLatency: number;
  failureRate: number; // 0-1
  uptimePercentage: number; // 0-100
  lastMeasured: Date;
}

// ============================================================================
// Progressive Enhancement Types
// ============================================================================

export interface DeviceCapabilities {
  hasTouch: boolean;
  hasHover: boolean;
  prefersReducedMotion: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
  supportsLocalStorage: boolean;
  supportsIndexedDB: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  colorDepth: number;
  colorGamut: 'srgb' | 'p3' | 'rec2020' | 'unknown';
}

export interface PerformanceMetrics {
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  timing: {
    navigationStart: number;
    loadEventEnd: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  };
  navigation: {
    type: 'navigate' | 'reload' | 'back_forward' | 'prerender';
    redirectCount: number;
  };
}

export interface AdaptiveUISettings {
  enableAnimations: boolean;
  enableTransitions: boolean;
  enableParallax: boolean;
  enableSmoothScrolling: boolean;
  imageQuality: 'auto' | 'high' | 'medium' | 'low';
  lazyLoadImages: boolean;
  preloadCriticalResources: boolean;
  deferNonCriticalScripts: boolean;
  enableVirtualScrolling: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoSave: boolean;
  dataSaverMode: boolean;
}

// ============================================================================
// Activity Feed Types
// ============================================================================

export interface ActivityAgent {
  name: string;
  role: string;
  avatar?: string;
  status?: 'active' | 'idle' | 'completed' | 'error';
}

export interface ActivityProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number; // seconds
  stages?: Array<{
    name: string;
    status: 'pending' | 'current' | 'completed' | 'error';
  }>;
}

export interface ActivityMetadata {
  duration?: number; // seconds
  resourcesUsed?: string[];
  confidence?: number; // 0-1
  tags?: string[];
  links?: Array<{
    url: string;
    title: string;
    type: 'source' | 'reference' | 'related';
  }>;
}

export interface ActivityItem {
  id: string;
  type: 'plan' | 'agent' | 'synthesis' | 'error' | 'completion' | 'user_action';
  title: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'current' | 'completed' | 'error' | 'cancelled';
  agent?: ActivityAgent;
  progress?: ActivityProgress;
  metadata?: ActivityMetadata;
  children?: ActivityItem[]; // For nested activities
  parentId?: string;
  errorDetails?: {
    message: string;
    code?: string;
    recoverable: boolean;
    suggestedActions?: string[];
  };
}

export interface ActivityFeedConfig {
  showTimestamps: boolean;
  showAgentAvatars: boolean;
  showProgress: boolean;
  showMetadata: boolean;
  groupByAgent: boolean;
  autoScroll: boolean;
  maxItems: number;
  refreshInterval: number; // milliseconds
}

// ============================================================================
// Onboarding Types
// ============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'error' | 'skipped';
  agent?: ActivityAgent;
  progress?: number; // 0-100
  estimatedDuration?: number; // seconds
  dependencies?: string[]; // Other step IDs
  optional?: boolean;
  canSkip?: boolean;
  errorMessage?: string;
  completedAt?: Date;
  metadata?: {
    complexity: 'low' | 'medium' | 'high';
    userAction?: 'wait' | 'review' | 'confirm' | 'input';
    helpText?: string;
    externalLinks?: Array<{
      url: string;
      title: string;
      description: string;
    }>;
  };
}

export interface OnboardingFlowConfig {
  showProgress: boolean;
  allowSkipping: boolean;
  showEstimatedTime: boolean;
  showAgentInfo: boolean;
  autoAdvance: boolean;
  pauseOnError: boolean;
  showStepNumbers: boolean;
  compactMode: boolean;
}

export interface OnboardingCallbacks {
  onStepComplete?: (stepId: string, data?: unknown) => void;
  onStepError?: (stepId: string, error: Error) => void;
  onStepSkip?: (stepId: string, reason?: string) => void;
  onFlowComplete?: (results: Record<string, unknown>) => void;
  onFlowCancel?: (currentStepId: string) => void;
}

// ============================================================================
// Layout and Responsive Types
// ============================================================================

export interface BreakpointConfig {
  xs: number; // 0px
  sm: number; // 640px
  md: number; // 768px
  lg: number; // 1024px
  xl: number; // 1280px
  '2xl': number; // 1536px
}

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export interface LayoutConfig {
  sidebar: {
    width: ResponsiveValue<number>;
    collapsible: boolean;
    defaultCollapsed: ResponsiveValue<boolean>;
  };
  header: {
    height: number;
    sticky: boolean;
    showBreadcrumbs: boolean;
  };
  footer: {
    height: number;
    sticky: boolean;
    showMetrics: boolean;
  };
  spacing: {
    container: ResponsiveValue<number>;
    section: ResponsiveValue<number>;
    component: ResponsiveValue<number>;
  };
}

// ============================================================================
// Animation and Transition Types
// ============================================================================

export interface AnimationConfig {
  duration: {
    fast: number; // 150ms
    normal: number; // 300ms
    slow: number; // 500ms
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
    elastic: string;
  };
  presets: {
    fadeIn: string;
    slideIn: string;
    scaleIn: string;
    slideUp: string;
    slideDown: string;
  };
}

export interface TransitionState {
  isEntering: boolean;
  isExiting: boolean;
  hasEntered: boolean;
  hasExited: boolean;
  duration: number;
  easing: string;
}

// ============================================================================
// Error Boundary Types
// ============================================================================

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
  userId?: string;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  destructive?: boolean;
}

export interface ErrorBoundaryConfig {
  fallbackComponent?: React.ComponentType<{
    error: Error;
    errorInfo: ErrorInfo;
    resetError: () => void;
    recoveryActions?: ErrorRecoveryAction[];
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableReporting?: boolean;
  reportingEndpoint?: string;
  maxRetries?: number;
  retryDelay?: number;
}

// ============================================================================
// Common UI Props
// ============================================================================

export interface BaseUIProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface LoadingProps extends BaseUIProps {
  loading?: boolean;
  loadingText?: string;
  loadingComponent?: ReactNode;
  skeleton?: boolean;
  skeletonHeight?: number;
  skeletonLines?: number;
}

export interface AsyncStateProps {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: string | Error;
  retry?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Re-export commonly used types
  NetworkConnectionInfo as ConnectionInfo,
  DeviceCapabilities as Capabilities,
  AdaptiveUISettings as UISettings,
  ActivityItem as Activity,
  OnboardingStep as Step,
  ErrorBoundaryState as ErrorState,
};