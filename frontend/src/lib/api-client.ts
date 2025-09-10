/**
 * API Client for Vana Frontend
 * Handles communication with FastAPI backend at localhost:8000
 */

import { 
  ChatSession, 
  ResearchQuery, 
  AgentResponse, 
  ResearchResult,
  CreateResearchQueryRequest,
  CreateChatSessionRequest,
  ApiResponse,
  PaginatedResponse 
} from '../types/chat';

// ===== CONFIGURATION =====

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

// ===== ERROR TYPES =====

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ===== HTTP CLIENT =====

class HttpClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL.replace(/\/+$/, ''); // Remove trailing slashes
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.timeout;

    // Create timeout controller if no signal provided
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      const result = await response.json();
      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }

      throw new NetworkError(
        'Network request failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  get<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: string, data?: any, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  put<T>(endpoint: string, data?: any, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  patch<T>(endpoint: string, data?: any, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  delete<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

// ===== API CLIENT CLASS =====

export class VanaApiClient {
  private http: HttpClient;

  constructor(baseURL: string = API_BASE_URL) {
    this.http = new HttpClient(baseURL);
  }

  // ===== AUTHENTICATION =====

  setAuthToken(token: string) {
    this.http.setAuthToken(token);
  }

  clearAuth() {
    this.http.clearAuthToken();
  }

  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    return this.http.post('/auth/login', { email, password });
  }

  async logout(): Promise<void> {
    await this.http.post('/auth/logout');
    this.clearAuth();
  }

  // ===== HEALTH CHECK =====

  async healthCheck(): Promise<{ status: string; timestamp: string; version?: string }> {
    return this.http.get('/health');
  }

  // ===== CHAT SESSIONS =====

  async getSessions(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<ChatSession>> {
    return this.http.get(`/api/sessions?page=${page}&pageSize=${pageSize}`);
  }

  async getSession(sessionId: string): Promise<ApiResponse<ChatSession>> {
    return this.http.get(`/api/sessions/${sessionId}`);
  }

  async createSession(request: CreateChatSessionRequest): Promise<ApiResponse<ChatSession>> {
    return this.http.post('/api/sessions', request);
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ApiResponse<ChatSession>> {
    return this.http.patch(`/api/sessions/${sessionId}`, updates);
  }

  async archiveSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.http.patch(`/api/sessions/${sessionId}`, { status: 'archived' });
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.http.delete(`/api/sessions/${sessionId}`);
  }

  // ===== RESEARCH QUERIES =====

  async getQueries(sessionId: string): Promise<ApiResponse<ResearchQuery[]>> {
    return this.http.get(`/api/sessions/${sessionId}/queries`);
  }

  async getQuery(queryId: string): Promise<ApiResponse<ResearchQuery>> {
    return this.http.get(`/api/queries/${queryId}`);
  }

  async submitQuery(sessionId: string, request: CreateResearchQueryRequest): Promise<ApiResponse<ResearchQuery>> {
    return this.http.post(`/api/sessions/${sessionId}/queries`, request);
  }

  async cancelQuery(queryId: string): Promise<ApiResponse<void>> {
    return this.http.post(`/api/queries/${queryId}/cancel`);
  }

  // ===== SSE RESEARCH ENDPOINT =====
  
  /**
   * Initiate research via SSE endpoint
   * This is the main research endpoint that streams results via Server-Sent Events
   */
  async startResearch(
    query: string, 
    options?: {
      queryId?: string;
      type?: string;
      priority?: string;
      parameters?: Record<string, any>;
    }
  ): Promise<{ queryId: string; message: string }> {
    const payload = {
      query,
      query_id: options?.queryId || `query-${Date.now()}`,
      type: options?.type || 'research',
      priority: options?.priority || 'medium',
      ...options?.parameters
    };

    return this.http.post('/run_sse', payload);
  }

  // ===== AGENT RESPONSES =====

  async getResponses(queryId: string): Promise<ApiResponse<AgentResponse[]>> {
    return this.http.get(`/api/queries/${queryId}/responses`);
  }

  async getResponse(responseId: string): Promise<ApiResponse<AgentResponse>> {
    return this.http.get(`/api/responses/${responseId}`);
  }

  // ===== RESEARCH RESULTS =====

  async getResults(queryId: string): Promise<ApiResponse<ResearchResult[]>> {
    return this.http.get(`/api/queries/${queryId}/results`);
  }

  async getResult(resultId: string): Promise<ApiResponse<ResearchResult>> {
    return this.http.get(`/api/results/${resultId}`);
  }

  async downloadResult(resultId: string, format: 'pdf' | 'docx' | 'md' = 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.http['baseURL']}/api/results/${resultId}/download?format=${format}`, {
      headers: this.http['defaultHeaders'],
    });

    if (!response.ok) {
      throw new ApiError(`Download failed: ${response.statusText}`, response.status);
    }

    return response.blob();
  }

  // ===== FEEDBACK =====

  async submitFeedback(
    responseId: string, 
    feedback: 'positive' | 'negative', 
    comment?: string
  ): Promise<ApiResponse<void>> {
    return this.http.post(`/api/responses/${responseId}/feedback`, {
      feedback,
      comment
    });
  }

  // ===== FILE UPLOADS =====

  async uploadFile(file: File, queryId?: string): Promise<ApiResponse<{ fileId: string; url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (queryId) {
      formData.append('queryId', queryId);
    }

    const response = await fetch(`${this.http['baseURL']}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.http['defaultHeaders']['Authorization'],
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(`Upload failed: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  // ===== UTILITY METHODS =====

  async checkConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.warn('API connection check failed:', error);
      return false;
    }
  }

  /**
   * Create an AbortController for cancelling requests
   */
  createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * Get the SSE endpoint URL for connecting EventSource
   */
  getSSEUrl(): string {
    return `${this.http['baseURL']}/run_sse`;
  }
}

// ===== DEFAULT CLIENT INSTANCE =====

export const apiClient = new VanaApiClient();

// ===== CONVENIENCE HOOKS =====

/**
 * React hook for API client with automatic authentication
 */
export function useApiClient() {
  return apiClient;
}

// ===== UTILITY FUNCTIONS =====

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

export function getErrorMessage(error: any): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export default apiClient;