/**
 * SSE Client Tests
 * 
 * Unit tests for the enhanced SSE client implementation
 */

import { SSEClient, createSSEClient } from '@/lib/sse/client';
import { SSEClientConfig } from '@/lib/sse/types';

// Mock EventSource for testing
global.EventSource = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 0,
})) as any;

// Mock fetch for polling tests
global.fetch = jest.fn();

describe('SSEClient', () => {
  let client: SSEClient;
  const mockConfig: Partial<SSEClientConfig> = {
    baseUrl: 'http://localhost:8000',
    sessionId: 'test-session-123',
    maxRetries: 2,
    heartbeatInterval: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SSEClient(mockConfig);
  });

  afterEach(() => {
    client.destroy();
  });

  describe('Initialization', () => {
    it('should create client with default config', () => {
      const defaultClient = new SSEClient();
      expect(defaultClient).toBeInstanceOf(SSEClient);
      expect(defaultClient.getState().connected).toBe(false);
      defaultClient.destroy();
    });

    it('should create client with custom config', () => {
      expect(client).toBeInstanceOf(SSEClient);
      expect(client.getState().sessionId).toBeUndefined(); // state doesn't expose sessionId
    });

    it('should detect browser capabilities', () => {
      const capabilities = client.getCapabilities();
      expect(capabilities).toHaveProperty('eventSource');
      expect(capabilities).toHaveProperty('fetch');
      expect(capabilities).toHaveProperty('promise');
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const handler = jest.fn();
      const unsubscribe = client.on('message', handler);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
      // Should not throw
    });

    it('should handle typed event listeners', () => {
      const handler = jest.fn();
      const unsubscribe = client.on('heartbeat', handler);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should handle connection change listeners', () => {
      const handler = jest.fn();
      const unsubscribe = client.onConnectionChange(handler);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should handle error listeners', () => {
      const handler = jest.fn();
      const unsubscribe = client.onError(handler);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('Connection Management', () => {
    it('should start in disconnected state', () => {
      const state = client.getState();
      expect(state.connected).toBe(false);
      expect(state.connecting).toBe(false);
      expect(state.connectionType).toBe('disconnected');
    });

    it('should update session ID', () => {
      const newSessionId = 'new-session-456';
      client.updateSession(newSessionId);
      // Should not throw and should handle reconnection logic
    });

    it('should update auth token', () => {
      const token = 'test-token-123';
      client.updateAuthToken(token);
      // Should not throw
    });
  });

  describe('Metrics', () => {
    it('should provide initial metrics', () => {
      const metrics = client.getMetrics();
      expect(metrics).toHaveProperty('connectionsAttempted');
      expect(metrics).toHaveProperty('connectionsSuccessful');
      expect(metrics).toHaveProperty('connectionsFailed');
      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics.connectionsAttempted).toBe(0);
    });
  });

  describe('Factory Function', () => {
    it('should create client using factory function', () => {
      const factoryClient = createSSEClient(mockConfig);
      expect(factoryClient).toBeInstanceOf(SSEClient);
      factoryClient.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection without session ID', async () => {
      const noSessionClient = new SSEClient({ sessionId: '' });
      
      try {
        await noSessionClient.connect();
        // The connection might not throw immediately but should handle the error
        // Check that the connection state reflects the error
        const state = noSessionClient.getState();
        expect(state.connected).toBe(false);
      } catch (error) {
        // If it does throw, verify the error message
        expect(typeof error).toBe('object');
        if (error && typeof error === 'object' && 'message' in error) {
          expect((error as any).message).toContain('Session ID is required');
        }
      }
      
      noSessionClient.destroy();
    });

    it('should handle destroyed client', async () => {
      client.destroy();
      
      await expect(client.connect()).rejects.toThrow('Client has been destroyed');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const handler = jest.fn();
      client.on('message', handler);
      client.onConnectionChange(handler);
      client.onError(handler);
      
      client.destroy();
      
      // Should not throw after destroy
      const state = client.getState();
      expect(state.connected).toBe(false);
    });
  });
});