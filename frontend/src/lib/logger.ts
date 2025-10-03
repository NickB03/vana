/**
 * Logging System for Vana
 * Provides structured logging with different levels and debugging capabilities
 */

import { config, isDebugMode, isDevelopment } from './env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
  userId?: number;
  sessionId?: string;
}

export interface APILogEntry extends LogEntry {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestId?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

class VanaLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private apiLogs: APILogEntry[] = [];
  private maxApiLogs = 500;

  constructor() {
    // Clear logs periodically to prevent memory leaks
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 300000); // 5 minutes
    }
  }

  private cleanup() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs / 2);
    }
    if (this.apiLogs.length > this.maxApiLogs) {
      this.apiLogs = this.apiLogs.slice(-this.maxApiLogs / 2);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    context?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      context,
    };
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Deep clone to avoid mutations, handle circular references
    let cloned;
    try {
      cloned = JSON.parse(JSON.stringify(data));
    } catch (error) {
      // Fall back to a simple string representation for circular references
      return '[Circular Reference - Cannot Sanitize]';
    }
    // Remove sensitive information
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'authorization'];
    
    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowercaseKey = key.toLowerCase();
          const isSensitive = sensitiveKeys.some(sensitive => lowercaseKey.includes(sensitive));
          
          if (isSensitive) {
            sanitized[key] = '***REDACTED***';
          } else {
            sanitized[key] = sanitize(value);
          }
        }
        return sanitized;
      }
      
      return obj;
    };

    return sanitize(cloned);
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') return true;
    
    // Log info in development
    if (level === 'info' && isDevelopment()) return true;
    
    // Log debug only if debug mode is enabled
    if (level === 'debug' && isDebugMode()) return true;
    
    return false;
  }

  private consoleLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;

    const prefix = `[Vana ${entry.level.toUpperCase()}]`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const context = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${context} ${timestamp} - ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data);
        break;
      case 'info':
        console.info(message, entry.data);
        break;
      case 'warn':
        console.warn(message, entry.data);
        break;
      case 'error':
        console.error(message, entry.data);
        break;
    }
  }

  debug(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry('debug', message, data, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  info(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry('info', message, data, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  warn(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry('warn', message, data, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  error(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry('error', message, data, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  // API-specific logging
  apiRequest(
    method: string,
    url: string,
    requestBody?: any,
    headers?: Record<string, string>,
    requestId?: string
  ) {
    const entry: APILogEntry = {
      ...this.createLogEntry('info', `API Request: ${method} ${url}`, { requestBody }, 'API'),
      method,
      url,
      requestId,
      headers: this.sanitizeData(headers),
      requestBody: this.sanitizeData(requestBody),
    };

    this.apiLogs.push(entry);
    
    if (isDebugMode()) {
      console.debug(`[Vana API] ${method} ${url}`, {
        requestId,
        headers: entry.headers,
        body: entry.requestBody,
      });
    }
  }

  apiResponse(
    method: string,
    url: string,
    status: number,
    responseBody?: any,
    duration?: number,
    requestId?: string
  ) {
    const level: LogLevel = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    const entry: APILogEntry = {
      ...this.createLogEntry(level, `API Response: ${method} ${url} - ${status}`, { responseBody }, 'API'),
      method,
      url,
      status,
      duration,
      requestId,
      responseBody: this.sanitizeData(responseBody),
    };

    this.apiLogs.push(entry);

    if (isDebugMode() || level !== 'info') {
      const message = `[Vana API] ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`;
      const logData = { requestId, responseBody: entry.responseBody };
      
      switch (level) {
        case 'error':
          console.error(message, logData);
          break;
        case 'warn':
          console.warn(message, logData);
          break;
        default:
          console.debug(message, logData);
      }
    }
  }

  // SSE-specific logging
  sseConnection(url: string, sessionId?: string, status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting') {
    this.info(`SSE ${status}: ${url}`, { sessionId }, 'SSE');
  }

  sseEvent(eventType: string, data?: any, sessionId?: string) {
    this.debug(`SSE Event: ${eventType}`, { data, sessionId }, 'SSE');
  }

  sseError(error: string, url?: string, sessionId?: string) {
    this.error(`SSE Error: ${error}`, { url, sessionId }, 'SSE');
  }

  // Authentication logging
  authEvent(event: string, userId?: number, data?: any) {
    this.info(`Auth: ${event}`, { userId, ...data }, 'AUTH');
  }

  authError(error: string, data?: any) {
    this.error(`Auth Error: ${error}`, data, 'AUTH');
  }

  // Chat logging
  chatMessage(sessionId: string, messageId: string, role: 'user' | 'assistant', preview: string) {
    this.info(`Chat Message [${role}]: ${preview.slice(0, 50)}...`, { sessionId, messageId }, 'CHAT');
  }

  chatStreamingEvent(sessionId: string, eventType: string, data?: any) {
    this.debug(`Chat Streaming [${eventType}]`, { sessionId, data }, 'CHAT');
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, context?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getApiLogs(limit?: number): APILogEntry[] {
    return limit ? this.apiLogs.slice(-limit) : this.apiLogs;
  }

  // Export logs for debugging
  exportLogs(): { logs: LogEntry[]; apiLogs: APILogEntry[]; timestamp: string } {
    return {
      logs: this.logs,
      apiLogs: this.apiLogs,
      timestamp: new Date().toISOString(),
    };
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.apiLogs = [];
    this.info('Logs cleared', undefined, 'LOGGER');
  }

  // Performance monitoring
  startTimer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`, { duration }, 'PERF');
      return duration;
    };
  }

  // Memory usage monitoring (browser only)
  logMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      this.debug('Memory Usage', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
      }, 'PERF');
    }
  }
}

// Create singleton logger instance
export const logger = new VanaLogger();

// Convenience exports
export const debugLog = logger.debug.bind(logger);
export const infoLog = logger.info.bind(logger);
export const warnLog = logger.warn.bind(logger);
export const errorLog = logger.error.bind(logger);

// API logging helpers
export const logApiRequest = logger.apiRequest.bind(logger);
export const logApiResponse = logger.apiResponse.bind(logger);

// SSE logging helpers
export const logSSEConnection = logger.sseConnection.bind(logger);
export const logSSEEvent = logger.sseEvent.bind(logger);
export const logSSEError = logger.sseError.bind(logger);

// Auth logging helpers
export const logAuthEvent = logger.authEvent.bind(logger);
export const logAuthError = logger.authError.bind(logger);

// Chat logging helpers
export const logChatMessage = logger.chatMessage.bind(logger);
export const logChatStreamingEvent = logger.chatStreamingEvent.bind(logger);

// Development helpers
export const exportLogs = logger.exportLogs.bind(logger);
export const clearLogs = logger.clearLogs.bind(logger);

// Add to window for debugging in development
if (isDevelopment() && typeof window !== 'undefined') {
  (window as any).vanaLogger = logger;
}