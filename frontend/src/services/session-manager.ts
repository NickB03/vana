/**
 * Session Manager for ADK
 * Handles creating and managing sessions with the ADK backend
 */

interface Session {
  sessionId: string;
  userId: string;
  createdAt: Date;
}

class SessionManager {
  private currentSession: Session | null = null;
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  /**
   * Get or create a session for the user
   */
  public async getOrCreateSession(userId: string = 'default_user'): Promise<Session> {
    console.log('[SessionManager] getOrCreateSession called for user:', userId);
    
    // If we have a valid session, return it
    if (this.currentSession && this.currentSession.userId === userId) {
      console.log('[SessionManager] Returning existing session:', this.currentSession.sessionId);
      return this.currentSession;
    }

    // Create a new session
    try {
      const url = `${this.apiUrl}/apps/app/users/${userId}/sessions`;
      console.log('[SessionManager] Creating session at:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[SessionManager] Failed to create ADK session:', response.status, errorText);
        console.warn('[SessionManager] Using local session instead');
        const localSession: Session = {
          sessionId: `local_session_${Date.now()}`,
          userId,
          createdAt: new Date()
        };
        this.currentSession = localSession;
        return localSession;
      }

      const data = await response.json();
      console.log('[SessionManager] Session created response:', data);
      
      // ADK returns id in the response
      const session: Session = {
        sessionId: data.id || data.session_id || data.sessionId || `session_${Date.now()}`,
        userId,
        createdAt: new Date()
      };

      console.log('[SessionManager] Session created successfully:', session.sessionId);
      this.currentSession = session;
      return session;

    } catch (error) {
      console.error('[SessionManager] Error creating session:', error);
      
      // Fallback to local session
      const localSession: Session = {
        sessionId: `local_session_${Date.now()}`,
        userId,
        createdAt: new Date()
      };
      console.log('[SessionManager] Using fallback local session:', localSession.sessionId);
      this.currentSession = localSession;
      return localSession;
    }
  }

  /**
   * Clear the current session
   */
  public clearSession(): void {
    this.currentSession = null;
  }

  /**
   * Get the current session if it exists
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();