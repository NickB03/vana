/**
 * Session Management Integration for Google ADK
 * Manages chat sessions, research queries, and backend state synchronization
 */

import { apiClient, ApiError } from './api-client';
import { authService } from './auth';
import { ErrorHandler } from './error-handler';
import { ADK_CONFIG, PERFORMANCE_CONFIG } from './config';
import { 
  ChatSession, 
  ResearchQuery, 
  SessionSettings, 
  CreateChatSessionRequest,
  CreateResearchQueryRequest 
} from '../types/chat';

// ===== SESSION MANAGER =====

export interface SessionState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isCreatingSession: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

export interface GoogleAdkSessionData {
  session_id: string;
  app_id: string;
  user_id: string;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export class SessionManager {
  private static instance: SessionManager;
  private listeners: Set<(state: SessionState) => void> = new Set();
  private sessionCache: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  
  private state: SessionState = {
    currentSession: null,
    sessions: [],
    isCreatingSession: false,
    isLoading: false,
    error: null,
    lastSyncTime: null,
  };

  private constructor() {
    // Load cached sessions on initialization
    this.loadCachedSessions();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // ===== STATE MANAGEMENT =====

  getState(): SessionState {
    return { ...this.state };
  }

  addListener(listener: (state: SessionState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
  }

  removeListener(listener: (state: SessionState) => void) {
    this.listeners.delete(listener);
  }

  private updateState(updates: Partial<SessionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Session state listener error:', error);
      }
    });
  }

  // ===== CACHING =====

  private loadCachedSessions() {
    try {
      if (typeof window === 'undefined') return;
      
      const cached = localStorage.getItem('vana_sessions_cache');
      if (cached) {
        const sessions = JSON.parse(cached);
        this.sessionCache = new Map(
          sessions.map((s: ChatSession) => [s.id, s])
        );
        this.updateState({ sessions });
      }
    } catch (error) {
      console.warn('Failed to load cached sessions:', error);
    }
  }

  private cacheSessions() {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = Array.from(this.sessionCache.values())
        .slice(0, PERFORMANCE_CONFIG.sessionCacheSize);
      
      localStorage.setItem('vana_sessions_cache', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to cache sessions:', error);
    }
  }

  private cacheSession(session: ChatSession) {
    this.sessionCache.set(session.id, session);
    
    // Limit cache size
    if (this.sessionCache.size > PERFORMANCE_CONFIG.sessionCacheSize) {
      const oldestKey = this.sessionCache.keys().next().value;
      this.sessionCache.delete(oldestKey);
    }
    
    this.cacheSessions();
    this.updateState({ 
      sessions: Array.from(this.sessionCache.values()),
      lastSyncTime: new Date()
    });
  }

  // ===== GOOGLE ADK INTEGRATION =====

  /**
   * Create a new session via Google ADK backend
   */
  async createSession(request: CreateChatSessionRequest): Promise<ChatSession> {
    this.updateState({ isCreatingSession: true, error: null });
    
    try {
      // Get current user
      const user = authService.getAuthState().user;
      if (!user && authService.isDevMode()) {
        authService.createDevSession();
      }

      // Create ADK session
      const adkSession = await apiClient.createAdkSession(
        ADK_CONFIG.appId,
        user?.id || ADK_CONFIG.defaultUserId
      );

      // Transform to frontend format
      const session: ChatSession = {
        id: adkSession.session_id,
        title: request.title || 'New Research Session',
        userId: user?.id || 'anonymous',
        createdAt: new Date(adkSession.created_at),
        updatedAt: new Date(adkSession.created_at),
        status: 'active',
        messageCount: 0,
        settings: {
          theme: 'system',
          autoScroll: true,
          notifications: true,
          streamingEnabled: true,
          ...request.settings
        },
        metadata: {
          userAgent: navigator.userAgent,
          lastIpAddress: '',
          researchContext: request.settings?.researchContext,
          adkSessionId: adkSession.session_id
        }
      };

      // Cache and set as current
      this.cacheSession(session);
      this.currentSessionId = session.id;
      this.updateState({ 
        currentSession: session,
        isCreatingSession: false 
      });

      return session;

    } catch (error) {
      const { error: appError } = ErrorHandler.handleApiError(error, {
        action: 'create_session',
        resource: 'google_adk_session'
      });
      
      this.updateState({ 
        isCreatingSession: false,
        error: appError.userMessage 
      });
      
      throw error;
    }
  }

  /**
   * Get or create a session
   */
  async getOrCreateSession(sessionId?: string): Promise<ChatSession> {
    if (sessionId) {
      return this.getSession(sessionId);
    }
    
    // Check for current session
    if (this.currentSessionId && this.sessionCache.has(this.currentSessionId)) {
      return this.sessionCache.get(this.currentSessionId)!;
    }
    
    // Create new session
    return this.createSession({
      title: `Research Session ${new Date().toLocaleString()}`
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    this.updateState({ isLoading: true, error: null });
    
    try {
      // Check cache first
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId)!;
        this.updateState({ 
          currentSession: cached,
          isLoading: false 
        });
        return cached;
      }

      // Fetch from backend via API client
      const response = await apiClient.getSession(sessionId);
      
      if (!response.success || !response.data) {
        throw new Error('Session not found');
      }

      const session = response.data;
      this.cacheSession(session);
      this.currentSessionId = sessionId;
      
      this.updateState({ 
        currentSession: session,
        isLoading: false 
      });

      return session;

    } catch (error) {
      const { error: appError } = ErrorHandler.handleApiError(error, {
        action: 'get_session',
        resource: 'session',
        sessionId
      });
      
      this.updateState({ 
        isLoading: false,
        error: appError.userMessage 
      });
      
      throw error;
    }
  }

  /**
   * Update session settings
   */
  async updateSession(
    sessionId: string, 
    updates: Partial<ChatSession>
  ): Promise<ChatSession> {
    try {
      const cached = this.sessionCache.get(sessionId);
      if (!cached) {
        throw new Error('Session not found in cache');
      }

      // Update cached session
      const updatedSession: ChatSession = {
        ...cached,
        ...updates,
        updatedAt: new Date()
      };

      this.cacheSession(updatedSession);

      if (this.currentSessionId === sessionId) {
        this.updateState({ currentSession: updatedSession });
      }

      return updatedSession;

    } catch (error) {
      const { error: appError } = ErrorHandler.handleApiError(error, {
        action: 'update_session',
        resource: 'session',
        sessionId
      });
      
      this.updateState({ error: appError.userMessage });
      throw error;
    }
  }

  /**
   * Set current session
   */
  setCurrentSession(sessionId: string | null) {
    this.currentSessionId = sessionId;
    const currentSession = sessionId ? this.sessionCache.get(sessionId) || null : null;
    this.updateState({ currentSession });
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | null {
    return this.state.currentSession;
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.sessionCache.clear();
    try {
      localStorage.removeItem('vana_sessions_cache');
    } catch (error) {
      console.warn('Failed to clear session cache:', error);
    }
    this.updateState({ 
      sessions: [],
      currentSession: null,
      lastSyncTime: null 
    });
  }

  // ===== RESEARCH QUERY MANAGEMENT =====

  /**
   * Submit research query to Google ADK backend
   */
  async submitResearchQuery(
    sessionId: string, 
    request: CreateResearchQueryRequest
  ): Promise<{ queryId: string; sessionId: string; message: string }> {
    try {
      // Ensure session exists
      await this.getSession(sessionId);

      // Start research via API client
      const result = await apiClient.startAdkResearch(
        request.content,
        sessionId,
        {
          type: request.type || 'research',
          priority: request.priority || 'medium',
          maxDuration: request.parameters?.maxDuration,
          outputFormat: request.parameters?.outputFormat
        }
      );

      // Update session message count
      const session = this.sessionCache.get(sessionId);
      if (session) {
        await this.updateSession(sessionId, {
          messageCount: session.messageCount + 1,
          metadata: {
            ...session.metadata,
            lastQuery: request.content,
            lastQueryTime: new Date()
          }
        });
      }

      return {
        queryId: `query-${Date.now()}`,
        sessionId: result.session_id,
        message: result.message
      };

    } catch (error) {
      const { error: appError } = ErrorHandler.handleApiError(error, {
        action: 'submit_query',
        resource: 'research_query',
        sessionId
      });
      
      throw new ApiError(
        appError.userMessage,
        500,
        'QUERY_SUBMISSION_FAILED',
        appError.details
      );
    }
  }

  // ===== SESSION LIFECYCLE =====

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, { status: 'archived' });
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessionCache.delete(sessionId);
    this.cacheSessions();
    
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
      this.updateState({ currentSession: null });
    }
    
    this.updateState({ 
      sessions: Array.from(this.sessionCache.values())
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    archived: number;
    currentSessionId: string | null;
  } {
    const sessions = Array.from(this.sessionCache.values());
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      archived: sessions.filter(s => s.status === 'archived').length,
      currentSessionId: this.currentSessionId
    };
  }
}

// ===== SINGLETON INSTANCE =====

export const sessionManager = SessionManager.getInstance();

// ===== REACT HOOK =====

import { useEffect, useState } from 'react';

export function useSessionManager() {
  const [state, setState] = useState<SessionState>(() => sessionManager.getState());

  useEffect(() => {
    sessionManager.addListener(setState);
    return () => sessionManager.removeListener(setState);
  }, []);

  return {
    ...state,
    
    // Methods
    createSession: sessionManager.createSession.bind(sessionManager),
    getSession: sessionManager.getSession.bind(sessionManager),
    getOrCreateSession: sessionManager.getOrCreateSession.bind(sessionManager),
    updateSession: sessionManager.updateSession.bind(sessionManager),
    setCurrentSession: sessionManager.setCurrentSession.bind(sessionManager),
    submitResearchQuery: sessionManager.submitResearchQuery.bind(sessionManager),
    archiveSession: sessionManager.archiveSession.bind(sessionManager),
    deleteSession: sessionManager.deleteSession.bind(sessionManager),
    clearCache: sessionManager.clearCache.bind(sessionManager),
    
    // Utilities
    stats: sessionManager.getSessionStats.bind(sessionManager),
    getCurrentSession: sessionManager.getCurrentSession.bind(sessionManager),
  };
}

/**
 * Hook for managing a specific session
 */
export function useSession(sessionId?: string) {
  const manager = useSessionManager();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      manager.getSession(sessionId)
        .then(setSession)
        .catch(error => {
          console.error('Failed to load session:', error);
          setSession(null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [sessionId, manager]);

  return {
    session,
    isLoading,
    updateSession: (updates: Partial<ChatSession>) => 
      sessionId ? manager.updateSession(sessionId, updates) : Promise.reject(new Error('No session ID')),
    submitQuery: (request: CreateResearchQueryRequest) =>
      sessionId ? manager.submitResearchQuery(sessionId, request) : Promise.reject(new Error('No session ID')),
  };
}

export default sessionManager;