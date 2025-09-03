export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline'
  | 'external_service'
  | 'internal'
  | 'connection_failed'
  | 'timeout'
  | 'parse_error'
  | 'stream_error'
  | 'network_error';

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote'
  | 'document'
  | 'suggestions'
  | 'vana'
  | 'sse'
  | 'websocket';

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = 'response' | 'log' | 'none';

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
  document: 'response',
  suggestions: 'response',
  vana: 'response',
  sse: 'response',
  websocket: 'response',
};

export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(':');

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === 'log') {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: statusCode },
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.';
  }

  switch (errorCode) {
    case 'bad_request:api':
      return "The request couldn't be processed. Please check your input and try again.";

    case 'unauthorized:auth':
      return 'You need to sign in before continuing.';
    case 'forbidden:auth':
      return 'Your account does not have access to this feature.';

    case 'rate_limit:chat':
      return 'You have exceeded your maximum number of messages for the day. Please try again later.';
    case 'not_found:chat':
      return 'The requested chat was not found. Please check the chat ID and try again.';
    case 'forbidden:chat':
      return 'This chat belongs to another user. Please check the chat ID and try again.';
    case 'unauthorized:chat':
      return 'You need to sign in to view this chat. Please sign in and try again.';
    case 'offline:chat':
      return "We're having trouble sending your message. Please check your internet connection and try again.";

    case 'not_found:document':
      return 'The requested document was not found. Please check the document ID and try again.';
    case 'forbidden:document':
      return 'This document belongs to another user. Please check the document ID and try again.';
    case 'unauthorized:document':
      return 'You need to sign in to view this document. Please sign in and try again.';
    case 'bad_request:document':
      return 'The request to create or update the document was invalid. Please check your input and try again.';
    
    case 'external_service:vana':
      return 'The Vana service is currently unavailable. Please try again later.';
    case 'internal:api':
      return 'An internal API error occurred. Please try again later.';

    // VANA-specific errors
    case 'connection_failed:vana':
      return 'Unable to connect to VANA backend. Switching to fallback AI provider.';
    case 'timeout:vana':
      return 'VANA request timed out. Please try again or switch to fallback provider.';
    case 'stream_error:vana':
      return 'VANA streaming encountered an error. Connection will be restored automatically.';
    case 'network_error:vana':
      return 'Network error occurred while communicating with VANA. Please check your connection.';
    case 'parse_error:vana':
      return 'Unable to parse response from VANA backend. Please try again.';

    // SSE-specific errors
    case 'connection_failed:sse':
      return 'Server-Sent Events connection failed. Attempting to reconnect...';
    case 'timeout:sse':
      return 'SSE connection timed out. Attempting to restore connection.';
    case 'stream_error:sse':
      return 'Streaming connection interrupted. Reconnecting automatically.';
    case 'parse_error:sse':
      return 'Unable to parse streaming data. Please refresh to restore connection.';

    // General stream errors
    case 'connection_failed:stream':
      return 'Streaming connection failed. Please refresh the page.';
    case 'timeout:stream':
      return 'Streaming request timed out. Please try again.';
    case 'stream_error:stream':
      return 'An error occurred during streaming. Please refresh to continue.';

    default:
      return 'Something went wrong. Please try again later.';
  }
}

/**
 * Specialized error class for SSE connection failures
 */
export class SSEConnectionError extends Error {
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly reconnectAttempt: number;

  constructor(
    message: string,
    options: {
      retryable?: boolean;
      retryAfter?: number;
      reconnectAttempt?: number;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'SSEConnectionError';
    this.retryable = options.retryable ?? true;
    this.retryAfter = options.retryAfter;
    this.reconnectAttempt = options.reconnectAttempt ?? 0;
    this.cause = options.cause;
  }
}

/**
 * Specialized error class for VANA backend failures
 */
export class VanaBackendError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    options: {
      retryable?: boolean;
      details?: any;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'VanaBackendError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}

/**
 * Specialized error class for stream parsing failures
 */
export class StreamParsingError extends Error {
  public readonly rawData: string;
  public readonly parseStage: 'json' | 'event' | 'message';

  constructor(
    message: string,
    rawData: string,
    parseStage: 'json' | 'event' | 'message',
    cause?: Error
  ) {
    super(message);
    this.name = 'StreamParsingError';
    this.rawData = rawData;
    this.parseStage = parseStage;
    this.cause = cause;
  }
}

/**
 * Utility function to create appropriate error from fetch response
 */
export async function createVanaErrorFromResponse(response: Response): Promise<VanaBackendError> {
  let details: any = null;
  let message = `VANA API request failed: ${response.status} ${response.statusText}`;

  try {
    details = await response.json();
    if (details.error) {
      message = details.error;
    } else if (details.message) {
      message = details.message;
    }
  } catch {
    // Ignore JSON parsing errors for error details
  }

  const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
  
  return new VanaBackendError(
    message,
    `HTTP_${response.status}`,
    response.status,
    { retryable, details }
  );
}

/**
 * Utility function to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof SSEConnectionError || error instanceof VanaBackendError) {
    return error.retryable;
  }
  
  // Network errors are generally retryable
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  return false;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, baseDelay = 1000): number {
  const maxDelay = 30000; // 30 seconds max
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case 'bad_request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit':
      return 429;
    case 'offline':
    case 'connection_failed':
      return 503;
    case 'external_service':
    case 'network_error':
      return 502;
    case 'timeout':
      return 408;
    case 'parse_error':
    case 'stream_error':
      return 422;
    case 'internal':
    default:
      return 500;
  }
}
