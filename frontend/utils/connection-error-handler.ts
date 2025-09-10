/**
 * Comprehensive Connection Error Handler
 * Provides intelligent error classification and recovery strategies
 */

export interface ConnectionError {
  type: ConnectionErrorType;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedAction: string;
  retryDelay: number;
  metadata?: Record<string, any>;
}

export type ConnectionErrorType = 
  | 'network_unreachable'
  | 'dns_resolution_failed'
  | 'connection_timeout'
  | 'connection_refused'
  | 'ssl_handshake_failed'
  | 'proxy_error'
  | 'rate_limited'
  | 'authentication_failed'
  | 'server_error'
  | 'client_error'
  | 'protocol_error'
  | 'mobile_network_switched'
  | 'browser_limitations'
  | 'memory_pressure'
  | 'unknown';

export interface NetworkScenario {
  name: string;
  description: string;
  indicators: string[];
  errorTypes: ConnectionErrorType[];
  recoveryStrategy: RecoveryStrategy;
}

export interface RecoveryStrategy {
  immediate: RecoveryAction[];
  shortTerm: RecoveryAction[];
  longTerm: RecoveryAction[];
}

export interface RecoveryAction {
  action: string;
  description: string;
  automated: boolean;
  delay?: number;
  maxAttempts?: number;
}

export class ConnectionErrorHandler {
  private errorHistory: ConnectionError[] = [];
  private networkScenarios: NetworkScenario[] = [];
  private diagnostics: Map<string, any> = new Map();

  constructor() {
    this.initializeNetworkScenarios();
    this.setupNetworkMonitoring();
  }

  /**
   * Analyze and classify connection errors
   */
  analyzeError(error: any, context?: any): ConnectionError {
    const errorType = this.classifyError(error, context);
    const severity = this.determineSeverity(errorType, context);
    const recoverable = this.isRecoverable(errorType, context);
    
    const connectionError: ConnectionError = {
      type: errorType,
      code: this.generateErrorCode(errorType, error),
      message: this.generateUserFriendlyMessage(errorType, error),
      severity,
      recoverable,
      suggestedAction: this.getSuggestedAction(errorType, context),
      retryDelay: this.calculateRetryDelay(errorType, severity, context),
      metadata: {
        originalError: error,
        context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        onlineStatus: navigator.onLine,
        connectionType: this.getConnectionType(),
        previousErrors: this.getRecentErrors()
      }
    };

    // Store error for pattern analysis
    this.errorHistory.push(connectionError);
    this.maintainErrorHistory();

    return connectionError;
  }

  /**
   * Classify error type based on error details and context
   */
  private classifyError(error: any, context?: any): ConnectionErrorType {
    // EventSource specific errors
    if (error instanceof Event) {
      const eventSource = error.target as EventSource;
      
      if (eventSource.readyState === EventSource.CLOSED) {
        return 'connection_refused';
      }
      
      if (eventSource.readyState === EventSource.CONNECTING) {
        return 'connection_timeout';
      }
    }

    // Network status based classification
    if (!navigator.onLine) {
      return 'network_unreachable';
    }

    // HTTP error classification
    if (typeof error === 'object' && error.status) {
      const status = error.status;
      
      if (status === 401 || status === 403) {
        return 'authentication_failed';
      }
      
      if (status === 429) {
        return 'rate_limited';
      }
      
      if (status >= 400 && status < 500) {
        return 'client_error';
      }
      
      if (status >= 500) {
        return 'server_error';
      }
    }

    // Error message based classification
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('network') || errorMessage.includes('unreachable')) {
      return 'network_unreachable';
    }
    
    if (errorMessage.includes('dns') || errorMessage.includes('name resolution')) {
      return 'dns_resolution_failed';
    }
    
    if (errorMessage.includes('timeout')) {
      return 'connection_timeout';
    }
    
    if (errorMessage.includes('refused') || errorMessage.includes('rejected')) {
      return 'connection_refused';
    }
    
    if (errorMessage.includes('ssl') || errorMessage.includes('tls') || errorMessage.includes('certificate')) {
      return 'ssl_handshake_failed';
    }
    
    if (errorMessage.includes('proxy')) {
      return 'proxy_error';
    }
    
    if (errorMessage.includes('protocol')) {
      return 'protocol_error';
    }

    // Context-based classification
    if (context?.connectionType === 'cellular' && context?.previousConnectionType !== 'cellular') {
      return 'mobile_network_switched';
    }

    // Browser limitations
    if (errorMessage.includes('quota') || errorMessage.includes('memory')) {
      return 'memory_pressure';
    }

    return 'unknown';
  }

  /**
   * Determine error severity based on type and context
   */
  private determineSeverity(type: ConnectionErrorType, context?: any): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors that prevent any connection
    const criticalTypes: ConnectionErrorType[] = [
      'authentication_failed',
      'ssl_handshake_failed',
      'memory_pressure'
    ];
    
    // High severity errors that significantly impact functionality
    const highTypes: ConnectionErrorType[] = [
      'network_unreachable',
      'dns_resolution_failed',
      'server_error'
    ];
    
    // Medium severity errors that can usually be recovered from
    const mediumTypes: ConnectionErrorType[] = [
      'connection_timeout',
      'connection_refused',
      'rate_limited',
      'proxy_error'
    ];

    if (criticalTypes.includes(type)) return 'critical';
    if (highTypes.includes(type)) return 'high';
    if (mediumTypes.includes(type)) return 'medium';
    
    return 'low';
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(type: ConnectionErrorType, context?: any): boolean {
    const nonRecoverableTypes: ConnectionErrorType[] = [
      'authentication_failed',
      'ssl_handshake_failed',
      'client_error',
      'memory_pressure'
    ];

    if (nonRecoverableTypes.includes(type)) {
      return false;
    }

    // Consider error frequency
    const recentSimilarErrors = this.getRecentErrors()
      .filter(e => e.type === type)
      .length;
    
    if (recentSimilarErrors > 10) {
      return false; // Too many similar errors
    }

    return true;
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserFriendlyMessage(type: ConnectionErrorType, error: any): string {
    const messages: Record<ConnectionErrorType, string> = {
      network_unreachable: 'Unable to reach the server. Please check your internet connection.',
      dns_resolution_failed: 'Cannot resolve server address. Check your DNS settings or try again later.',
      connection_timeout: 'Connection is taking too long. The server may be busy or your connection may be slow.',
      connection_refused: 'Server is not accepting connections. Please try again later.',
      ssl_handshake_failed: 'Secure connection failed. Check your system time and security settings.',
      proxy_error: 'Proxy server error. Check your proxy settings or try connecting directly.',
      rate_limited: 'Too many requests. Please wait before trying again.',
      authentication_failed: 'Authentication failed. Please refresh the page and log in again.',
      server_error: 'Server error occurred. The issue is being resolved, please try again later.',
      client_error: 'Request error. Please refresh the page and try again.',
      protocol_error: 'Communication protocol error. Please refresh the page.',
      mobile_network_switched: 'Network connection changed. Reconnecting...',
      browser_limitations: 'Browser limitation encountered. Try refreshing the page.',
      memory_pressure: 'Low memory detected. Close some tabs or applications and refresh.',
      unknown: 'Connection error occurred. Please try again.'
    };

    return messages[type] || messages.unknown;
  }

  /**
   * Get suggested recovery actions
   */
  private getSuggestedAction(type: ConnectionErrorType, context?: any): string {
    const actions: Record<ConnectionErrorType, string> = {
      network_unreachable: 'Check internet connection and try again',
      dns_resolution_failed: 'Try switching to a different DNS server or mobile data',
      connection_timeout: 'Wait a moment and retry, or check connection speed',
      connection_refused: 'Server may be down, try again in a few minutes',
      ssl_handshake_failed: 'Update browser, check system clock, or disable VPN',
      proxy_error: 'Check proxy settings or disable proxy temporarily',
      rate_limited: 'Wait 30 seconds before retrying',
      authentication_failed: 'Refresh page and log in again',
      server_error: 'Wait a few minutes and try again',
      client_error: 'Refresh the page and retry',
      protocol_error: 'Refresh the page to reset connection',
      mobile_network_switched: 'Connection will be restored automatically',
      browser_limitations: 'Close unnecessary tabs and refresh page',
      memory_pressure: 'Close some applications and refresh',
      unknown: 'Refresh page or try again later'
    };

    return actions[type] || actions.unknown;
  }

  /**
   * Calculate appropriate retry delay based on error type and severity
   */
  private calculateRetryDelay(type: ConnectionErrorType, severity: string, context?: any): number {
    // Base delays in milliseconds
    const baseDelays: Record<ConnectionErrorType, number> = {
      network_unreachable: 5000,
      dns_resolution_failed: 10000,
      connection_timeout: 3000,
      connection_refused: 5000,
      ssl_handshake_failed: 30000,
      proxy_error: 10000,
      rate_limited: 30000,
      authentication_failed: 0, // Don't auto-retry
      server_error: 10000,
      client_error: 0, // Don't auto-retry
      protocol_error: 2000,
      mobile_network_switched: 1000,
      browser_limitations: 5000,
      memory_pressure: 0, // Don't auto-retry
      unknown: 5000
    };

    let delay = baseDelays[type] || 5000;

    // Adjust based on severity
    const severityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 2.0,
      critical: 5.0
    };

    delay *= severityMultipliers[severity as keyof typeof severityMultipliers] || 1.0;

    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    
    return Math.floor(delay + jitter);
  }

  /**
   * Generate unique error codes for tracking
   */
  private generateErrorCode(type: ConnectionErrorType, error: any): string {
    const typeCode = type.toUpperCase().replace('_', '');
    const timestamp = Date.now().toString().slice(-6);
    const errorHash = error?.message ? 
      error.message.split('').reduce((a, b) => (a + b.charCodeAt(0)) % 1000, 0).toString() : '000';
    
    return `${typeCode}-${timestamp}-${errorHash}`;
  }

  /**
   * Get connection type information
   */
  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get recent error patterns
   */
  private getRecentErrors(minutes: number = 10): ConnectionError[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errorHistory.filter(error => 
      (error.metadata?.timestamp || 0) > cutoff
    );
  }

  /**
   * Maintain error history size
   */
  private maintainErrorHistory(maxSize: number = 100): void {
    if (this.errorHistory.length > maxSize) {
      this.errorHistory = this.errorHistory.slice(-maxSize);
    }
  }

  /**
   * Initialize network scenarios for pattern recognition
   */
  private initializeNetworkScenarios(): void {
    this.networkScenarios = [
      {
        name: 'Temporary Network Outage',
        description: 'Brief loss of internet connectivity',
        indicators: ['network_unreachable', 'dns_resolution_failed'],
        errorTypes: ['network_unreachable', 'dns_resolution_failed'],
        recoveryStrategy: {
          immediate: [
            { action: 'wait', description: 'Wait for network restoration', automated: true, delay: 5000 }
          ],
          shortTerm: [
            { action: 'retry_connection', description: 'Attempt reconnection', automated: true, maxAttempts: 3 }
          ],
          longTerm: [
            { action: 'suggest_network_check', description: 'Suggest network diagnostics', automated: false }
          ]
        }
      },
      {
        name: 'Server Overload',
        description: 'Server experiencing high load',
        indicators: ['connection_timeout', 'connection_refused', 'rate_limited'],
        errorTypes: ['connection_timeout', 'connection_refused', 'rate_limited'],
        recoveryStrategy: {
          immediate: [
            { action: 'exponential_backoff', description: 'Increase retry delays', automated: true }
          ],
          shortTerm: [
            { action: 'reduce_request_frequency', description: 'Lower connection frequency', automated: true }
          ],
          longTerm: [
            { action: 'circuit_breaker', description: 'Activate protection mode', automated: true }
          ]
        }
      },
      {
        name: 'Mobile Network Transition',
        description: 'Switching between WiFi and cellular',
        indicators: ['mobile_network_switched', 'connection_timeout'],
        errorTypes: ['mobile_network_switched', 'connection_timeout'],
        recoveryStrategy: {
          immediate: [
            { action: 'quick_reconnect', description: 'Fast reconnection attempt', automated: true, delay: 1000 }
          ],
          shortTerm: [
            { action: 'adaptive_timeout', description: 'Adjust connection timeouts', automated: true }
          ],
          longTerm: [
            { action: 'mobile_optimization', description: 'Optimize for mobile networks', automated: true }
          ]
        }
      },
      {
        name: 'Authentication Issues',
        description: 'Authentication or authorization problems',
        indicators: ['authentication_failed'],
        errorTypes: ['authentication_failed'],
        recoveryStrategy: {
          immediate: [
            { action: 'token_refresh', description: 'Attempt token refresh', automated: true, maxAttempts: 1 }
          ],
          shortTerm: [
            { action: 'user_notification', description: 'Notify user to re-login', automated: false }
          ],
          longTerm: [
            { action: 'session_recovery', description: 'Implement session recovery', automated: false }
          ]
        }
      }
    ];
  }

  /**
   * Setup network monitoring for proactive error detection
   */
  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.diagnostics.set('network_restored', Date.now());
    });

    window.addEventListener('offline', () => {
      this.diagnostics.set('network_lost', Date.now());
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', () => {
        this.diagnostics.set('connection_changed', {
          type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          timestamp: Date.now()
        });
      });
    }

    // Monitor page visibility for background/foreground transitions
    document.addEventListener('visibilitychange', () => {
      this.diagnostics.set('visibility_changed', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Get error statistics and patterns
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    averageRetryDelay: number;
    mostCommonError: string;
    errorRate: number;
  } {
    const recentErrors = this.getRecentErrors(60); // Last hour
    
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let totalRetryDelay = 0;

    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      totalRetryDelay += error.retryDelay;
    });

    const mostCommonError = Object.entries(errorsByType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      averageRetryDelay: recentErrors.length > 0 ? totalRetryDelay / recentErrors.length : 0,
      mostCommonError,
      errorRate: recentErrors.length / 60 // Errors per minute
    };
  }

  /**
   * Detect if current errors match known scenarios
   */
  detectScenario(): NetworkScenario | null {
    const recentErrors = this.getRecentErrors(5); // Last 5 minutes
    const errorTypes = new Set(recentErrors.map(e => e.type));

    return this.networkScenarios.find(scenario =>
      scenario.errorTypes.some(type => errorTypes.has(type))
    ) || null;
  }

  /**
   * Clear error history (useful for testing or privacy)
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.diagnostics.clear();
  }
}

export default ConnectionErrorHandler;