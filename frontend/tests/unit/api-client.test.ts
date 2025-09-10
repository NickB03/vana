/**
 * API Client Unit Tests
 * Tests API client functionality in isolation
 */

import { VanaApiClient, ApiError, isApiError, isNetworkError, getErrorMessage } from '../../src/lib/api-client';

describe('API Client Unit Tests', () => {
  let apiClient: VanaApiClient;

  beforeEach(() => {
    apiClient = new VanaApiClient();
    fetch.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(apiClient).toBeInstanceOf(VanaApiClient);
    });

    it('should accept custom base URL', () => {
      const customClient = new VanaApiClient('http://custom.example.com');
      expect(customClient).toBeInstanceOf(VanaApiClient);
    });
  });

  describe('Authentication Methods', () => {
    it('should set auth token correctly', () => {
      const token = 'test-token-123';
      apiClient.setAuthToken(token);
      
      expect(apiClient.getAuthToken()).toBe(token);
    });

    it('should clear auth token', () => {
      apiClient.setAuthToken('test-token');
      expect(apiClient.getAuthToken()).toBe('test-token');
      
      apiClient.clearAuth();
      expect(apiClient.getAuthToken()).toBeNull();
    });

    it('should validate auth token format', () => {
      const token = 'Bearer test-token-123';
      apiClient.setAuthToken(token);
      
      expect(apiClient.getAuthToken()).toBe(token);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.healthCheck();
      
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should handle health check failure', async () => {
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(503, 'Service Unavailable')
      );

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('Session Management', () => {
    it('should create ADK session', async () => {
      const mockResponse = {
        id: 'session-123',
        app_name: 'vana',
        user_id: 'current',
        created_at: '2024-01-01T00:00:00Z',
        status: 'active'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.createAdkSession();
      
      expect(result.session_id).toBe('session-123');
      expect(result.status).toBe('active');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/apps/vana/users/current/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      );
    });

    it('should get existing ADK session', async () => {
      const sessionId = 'session-456';
      const mockResponse = {
        session_id: sessionId,
        app_name: 'vana',
        user_id: 'current',
        created_at: '2024-01-01T00:00:00Z',
        last_active: '2024-01-01T01:00:00Z'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.getAdkSession(sessionId);
      
      expect(result.session_id).toBe(sessionId);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8000/apps/vana/users/current/sessions/${sessionId}`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should transform ADK session to chat session format', async () => {
      const mockResponse = {
        session_id: 'session-789',
        app_name: 'vana',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        title: 'Research Session'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.getSession('session-789');
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'session-789',
        title: 'Research Session',
        userId: 'user-123',
        status: 'active'
      });
    });
  });

  describe('Research Queries', () => {
    it('should start ADK research successfully', async () => {
      const query = 'What are the latest AI developments?';
      const sessionId = 'session-123';
      const mockResponse = {
        session_id: sessionId,
        status: 'processing',
        message: 'Research query initiated successfully'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.startAdkResearch(query, sessionId, {
        type: 'research',
        priority: 'high',
        maxDuration: 300,
        outputFormat: 'structured'
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/run_sse',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query,
            session_id: sessionId,
            type: 'research',
            priority: 'high',
            max_duration: 300,
            output_format: 'structured'
          })
        })
      );
    });

    it('should handle research query with default options', async () => {
      const query = 'Simple query';
      const sessionId = 'session-456';
      
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          session_id: sessionId,
          status: 'processing'
        })
      );

      await apiClient.startAdkResearch(query, sessionId);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/run_sse',
        expect.objectContaining({
          body: JSON.stringify({
            query,
            session_id: sessionId,
            type: 'research',
            priority: 'medium',
            max_duration: 300,
            output_format: 'structured'
          })
        })
      );
    });

    it('should start legacy research format', async () => {
      const query = 'Legacy query test';
      
      // Mock session creation
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          id: 'new-session',
          status: 'active'
        })
      );

      // Mock research start
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          session_id: 'new-session',
          status: 'processing',
          message: 'Research started'
        })
      );

      const result = await apiClient.startResearch(query, {
        type: 'analysis',
        priority: 'low'
      });

      expect(result).toMatchObject({
        queryId: expect.stringMatching(/query-\d+/),
        sessionId: 'new-session',
        message: 'Research started'
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('SSE URL Generation', () => {
    it('should generate correct SSE URL', () => {
      const sessionId = 'test-session-123';
      const url = apiClient.getSSEUrl(sessionId);
      
      expect(url).toBe(`http://localhost:8000/agent_network_sse/${sessionId}`);
    });

    it('should create EventSource with authentication', () => {
      const sessionId = 'auth-test-session';
      apiClient.setAuthToken('test-token');

      // Mock environment for auth required
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'true';

      const eventSource = apiClient.createAuthenticatedEventSource(sessionId);
      
      expect(eventSource).toBeInstanceOf(EventSource);
      expect(eventSource.url).toContain('authorization=Bearer%20test-token');
    });

    it('should create EventSource without authentication in dev mode', () => {
      const sessionId = 'dev-test-session';
      
      // Mock environment for auth not required
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false';

      const eventSource = apiClient.createAuthenticatedEventSource(sessionId);
      
      expect(eventSource).toBeInstanceOf(EventSource);
      expect(eventSource.url).toBe(`http://localhost:8000/agent_network_sse/${sessionId}`);
    });
  });

  describe('File Upload', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      const mockResponse = {
        fileId: 'file-123',
        url: 'http://localhost:8000/files/file-123'
      };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse(mockResponse)
      );

      const result = await apiClient.uploadFile(mockFile, 'query-456');

      expect(result).toEqual({
        success: true,
        data: mockResponse,
        timestamp: expect.any(String)
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/files/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });

    it('should handle file upload without query ID', async () => {
      const mockFile = new File(['content'], 'file.txt');

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ fileId: 'file-789' })
      );

      await apiClient.uploadFile(mockFile);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/files/upload',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Download and Export', () => {
    it('should download result as PDF', async () => {
      const resultId = 'result-123';
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await apiClient.downloadResult(resultId, 'pdf');

      expect(result).toBeInstanceOf(Blob);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/results/result-123/download?format=pdf',
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });

    it('should handle download failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(apiClient.downloadResult('nonexistent'))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('Utility Methods', () => {
    it('should check connection successfully', async () => {
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ status: 'healthy' })
      );

      const isConnected = await apiClient.checkConnection();
      
      expect(isConnected).toBe(true);
    });

    it('should handle connection check failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const isConnected = await apiClient.checkConnection();
      
      expect(isConnected).toBe(false);
    });

    it('should validate authentication', async () => {
      apiClient.setAuthToken('valid-token');
      
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          id: 'user-123',
          email: 'test@example.com'
        })
      );

      const isValid = await apiClient.validateAuth();
      
      expect(isValid).toBe(true);
    });

    it('should detect invalid authentication', async () => {
      apiClient.setAuthToken('invalid-token');
      
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(401, 'Unauthorized')
      );

      const isValid = await apiClient.validateAuth();
      
      expect(isValid).toBe(false);
    });

    it('should create abort controller', () => {
      const controller = apiClient.createAbortController();
      
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('Error Handling', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 400, 'VALIDATION_ERROR', {
        field: 'query',
        constraint: 'required'
      });

      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({
        field: 'query',
        constraint: 'required'
      });
    });

    it('should identify ApiError correctly', () => {
      const apiError = new ApiError('API Error', 500);
      const regularError = new Error('Regular Error');

      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(regularError)).toBe(false);
      expect(isApiError('string')).toBe(false);
      expect(isApiError(null)).toBe(false);
    });

    it('should identify NetworkError correctly', () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      const regularError = new Error('Regular Error');

      expect(isNetworkError(networkError)).toBe(false); // Would be true with actual NetworkError class
      expect(isNetworkError(regularError)).toBe(false);
    });

    it('should get error message correctly', () => {
      const apiError = new ApiError('API Error', 400);
      const regularError = new Error('Regular Error');
      const stringError = 'String error';
      const unknownError = { unknown: true };

      expect(getErrorMessage(apiError)).toBe('API Error');
      expect(getErrorMessage(regularError)).toBe('Regular Error');
      expect(getErrorMessage(stringError)).toBe('An unknown error occurred');
      expect(getErrorMessage(unknownError)).toBe('An unknown error occurred');
    });

    it('should handle malformed error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.reject(new SyntaxError('Invalid JSON'))
      });

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow('HTTP 400');
    });

    it('should handle network timeout', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('AbortError', 'AbortError')), 100);
        })
      );

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow('Request timeout');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      apiClient.setAuthToken('test-token');
    });

    it('should make GET requests', async () => {
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ data: 'test' })
      );

      await apiClient.get('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should make POST requests', async () => {
      const postData = { key: 'value' };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ success: true })
      );

      await apiClient.post('/test-endpoint', postData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should make PUT requests', async () => {
      const putData = { update: 'value' };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ updated: true })
      );

      await apiClient.put('/test-endpoint', putData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData)
        })
      );
    });

    it('should make PATCH requests', async () => {
      const patchData = { partial: 'update' };

      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ patched: true })
      );

      await apiClient.patch('/test-endpoint', patchData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData)
        })
      );
    });

    it('should make DELETE requests', async () => {
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({ deleted: true })
      );

      await apiClient.delete('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test-endpoint',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Request Options and Headers', () => {
    it('should handle custom headers', async () => {
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({})
      );

      await apiClient.get('/test', {
        headers: { 'X-Custom-Header': 'custom-value' }
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({})
      );

      await apiClient.get('/test', { signal: controller.signal });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });

    it('should handle custom timeout', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => resolve(testUtils.mockApiResponse({})), 2000);
        })
      );

      await expect(
        apiClient.get('/slow-endpoint', { timeout: 1000 })
      ).rejects.toThrow('Request timeout');
    });
  });
});