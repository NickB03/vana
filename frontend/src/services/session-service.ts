/**
 * Enhanced Session Service for ADK
 * Handles session creation, persistence, caching, and validation
 */

import type {
  Session,
  SessionStatus,
  SessionMetadata,
  ISessionService,
  SessionError,
  ADKConfig
} from '../types/adk-service';

interface SessionCacheEntry {
  session: Session;
  expiresAt: number;
}

interface SessionPersistenceData {
  session: Session;
  savedAt: number;
}

export class SessionService implements ISessionService {
  private currentSession: Session | null = null;
  private sessionCache = new Map<string, SessionCacheEntry>();
  private readonly apiUrl: string;
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private readonly storageKey = 'vana:session';

  constructor(config: ADKConfig) {
    this.apiUrl = config.apiUrl;
    this.setupCleanupTimer();
  }

  /**
   * Get or create a session for the user
   */
  public async getOrCreateSession(userId: string = 'default_user'): Promise<Session> {
    console.log('[SessionService] Getting session for user:', userId);
    
    // Check current session first
    if (this.currentSession && this.currentSession.userId === userId && this.validateSession(this.currentSession)) {
      console.log('[SessionService] Returning current session:', this.currentSession.id);
      return this.currentSession;
    }

    // Check cache
    const cached = this.getCachedSession(userId);
    if (cached && this.validateSession(cached)) {
      console.log('[SessionService] Using cached session:', cached.id);
      this.currentSession = cached;
      return cached;
    }

    // Try to restore from storage
    const restored = await this.restoreFromStorage(userId);
    if (restored && this.validateSession(restored)) {
      console.log('[SessionService] Restored session from storage:', restored.id);
      this.currentSession = restored;
      this.cacheSession(restored);
      return restored;
    }

    // Create new session
    const session = await this.createNewSession(userId);
    this.currentSession = session;
    this.cacheSession(session);
    await this.saveToStorage(session);
    
    return session;
  }

  /**
   * Get current session if it exists and is valid
   */
  public getCurrentSession(): Session | null {
    if (!this.currentSession) return null;
    
    if (!this.validateSession(this.currentSession)) {
      this.currentSession = null;
      return null;
    }
    
    return this.currentSession;
  }

  /**
   * Refresh an existing session
   */
  public async refreshSession(session: Session): Promise<Session> {
    console.log('[SessionService] Refreshing session:', session.id);
    
    try {
      // For ADK, we might need to validate the session with backend
      const response = await fetch(`${this.apiUrl}/apps/app/sessions/${session.id}/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Update last activity
        const refreshedSession: Session = {
          ...session,
          lastActivity: new Date(),
          status: SessionStatus.ACTIVE
        };
        
        this.currentSession = refreshedSession;
        this.cacheSession(refreshedSession);
        await this.saveToStorage(refreshedSession);
        
        return refreshedSession;
      } else {
        // Session is invalid, create new one
        return await this.createNewSession(session.userId);
      }
    } catch (error) {
      console.error('[SessionService] Error refreshing session:', error);
      // Fallback to creating new session
      return await this.createNewSession(session.userId);
    }
  }

  /**
   * Clear current session and storage
   */
  public clearSession(): void {
    console.log('[SessionService] Clearing session');
    
    if (this.currentSession) {
      this.sessionCache.delete(this.currentSession.userId);
      this.removeFromStorage(this.currentSession.userId);
    }
    
    this.currentSession = null;
  }

  /**
   * Validate if a session is still valid
   */
  public validateSession(session: Session): boolean {
    if (!session || !session.id || !session.userId) {
      return false;
    }

    // Check if session has expired
    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    const lastActivityAge = now.getTime() - session.lastActivity.getTime();

    // Session expires after 24 hours or 30 minutes of inactivity
    if (sessionAge > this.sessionTimeout || lastActivityAge > this.cacheTimeout) {
      console.log('[SessionService] Session expired:', session.id);
      return false;
    }

    // Check status
    if (session.status === SessionStatus.EXPIRED || session.status === SessionStatus.ERROR) {
      return false;
    }

    return true;
  }

  /**
   * Create a new session with the ADK backend
   */
  private async createNewSession(userId: string): Promise<Session> {
    console.log('[SessionService] Creating new session for user:', userId);
    
    try {
      const url = `${this.apiUrl}/apps/app/users/${userId}/sessions`;
      const metadata: SessionMetadata = {
        clientVersion: '1.0.0',
        platform: 'web',
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[SessionService] ADK session creation failed:', response.status, errorText);
        
        // Create fallback local session
        return this.createFallbackSession(userId, metadata);
      }

      const data = await response.json();
      const session: Session = {
        id: data.id || data.session_id || data.sessionId || this.generateSessionId(),
        userId,
        status: SessionStatus.ACTIVE,
        metadata,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      console.log('[SessionService] Session created successfully:', session.id);
      return session;

    } catch (error) {
      console.error('[SessionService] Error creating session:', error);
      
      // Create fallback local session
      const metadata: SessionMetadata = {
        clientVersion: '1.0.0',
        platform: 'web'
      };
      
      return this.createFallbackSession(userId, metadata);
    }
  }

  /**
   * Create a fallback local session when backend is unavailable
   */
  private createFallbackSession(userId: string, metadata: SessionMetadata): Session {
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      status: SessionStatus.ACTIVE,
      metadata: {
        ...metadata,
        fallback: true
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };

    console.log('[SessionService] Created fallback session:', session.id);
    return session;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session from cache if valid
   */
  private getCachedSession(userId: string): Session | null {
    const cached = this.sessionCache.get(userId);
    if (!cached) return null;

    // Check if cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.sessionCache.delete(userId);
      return null;
    }

    return cached.session;
  }

  /**
   * Cache a session with expiration
   */
  private cacheSession(session: Session): void {
    this.sessionCache.set(session.userId, {
      session,
      expiresAt: Date.now() + this.cacheTimeout
    });
  }

  /**
   * Save session to local storage
   */
  private async saveToStorage(session: Session): Promise<void> {
    try {
      const data: SessionPersistenceData = {
        session,
        savedAt: Date.now()
      };
      
      const key = `${this.storageKey}:${session.userId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('[SessionService] Failed to save session to storage:', error);
    }
  }

  /**
   * Restore session from local storage
   */
  private async restoreFromStorage(userId: string): Promise<Session | null> {
    try {
      const key = `${this.storageKey}:${userId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;

      const data: SessionPersistenceData = JSON.parse(stored);
      
      // Check if stored data is too old (older than session timeout)
      const age = Date.now() - data.savedAt;
      if (age > this.sessionTimeout) {
        localStorage.removeItem(key);
        return null;
      }

      // Reconstruct session with Date objects
      const session: Session = {
        ...data.session,
        createdAt: new Date(data.session.createdAt),
        lastActivity: new Date(data.session.lastActivity)
      };

      return session;
    } catch (error) {
      console.warn('[SessionService] Failed to restore session from storage:', error);
      return null;
    }
  }

  /**
   * Remove session from storage
   */
  private removeFromStorage(userId: string): void {
    try {
      const key = `${this.storageKey}:${userId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[SessionService] Failed to remove session from storage:', error);
    }
  }

  /**
   * Setup cleanup timer to remove expired cache entries
   */
  private setupCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, cached] of this.sessionCache.entries()) {
        if (now > cached.expiresAt) {
          this.sessionCache.delete(userId);
        }
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }
}