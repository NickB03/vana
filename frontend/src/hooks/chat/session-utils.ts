/**
 * Session management utilities
 */

import { useCallback } from 'react';
import { apiClient } from '../../lib/api/client';
import { summaryToChatSession, ChatSession } from './types';
import { useChatStore } from './store';

/**
 * Hook for session management utilities
 */
export function useSessionUtils() {
  const replaceMessagesInStore = useChatStore(state => state.replaceMessages);
  const updateSessionMetaInStore = useChatStore(state => state.updateSessionMeta);
  const hydrateSessionsInStore = useChatStore(state => state.hydrateSessions);

  /**
   * Ensures session history is loaded for a given session
   */
  const ensureSessionHistory = useCallback(
    async (sessionId: string) => {
      const state = useChatStore.getState();
      const session = state.sessions[sessionId];
      if (!session || session.historyLoaded || session.messages.length > 0) {
        return;
      }

      try {
        const detail = await apiClient.getSession(sessionId);
        const messages = (detail.messages ?? []).map(message => ({
          ...message,
          sessionId,
        }));

        replaceMessagesInStore(sessionId, messages);
        updateSessionMetaInStore(sessionId, {
          title: detail.title ?? session.title ?? null,
          status: detail.status ?? session.status,
          final_report: detail.final_report ?? session.final_report,
          current_phase: detail.current_phase ?? session.current_phase,
          overallProgress: detail.progress ?? session.overallProgress ?? null,
          user_id: detail.user_id ?? session.user_id,
          updated_at: detail.updated_at ?? session.updated_at,
          created_at: detail.created_at ?? session.created_at,
          historyLoaded: true,
        });
      } catch (err) {
        console.warn(`Failed to load history for session ${sessionId}`, err);
        updateSessionMetaInStore(sessionId, { historyLoaded: true });
      }
    },
    [replaceMessagesInStore, updateSessionMetaInStore]
  );

  /**
   * Loads sessions from the server and hydrates the store
   */
  const loadServerSessions = useCallback(
    async () => {
      try {
        if (!apiClient.isAuthenticated()) {
          return;
        }

        const summaries = await apiClient.listSessions();
        hydrateSessionsInStore(summaries.map(summaryToChatSession));
      } catch (err) {
        console.warn('Failed to load session history from API', err);
        throw err;
      }
    },
    [hydrateSessionsInStore]
  );

  return {
    ensureSessionHistory,
    loadServerSessions,
  };
}
