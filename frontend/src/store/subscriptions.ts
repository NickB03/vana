'use client';

import { useUnifiedStore } from './index';
import type { UnifiedStore } from './index';
import type { SSEAgentEvent, AgentNetworkUpdate, ConnectionEvent, AgentTaskEvent } from '@/types/session';
import type { Agent } from '@/types/agents';

// Subscription manager for cross-store coordination
export class StoreSubscriptionManager {
  private subscriptions: (() => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Initialize all cross-store subscriptions
    this.setupAuthSessionSubscription();
    this.setupSessionChatSubscription();
    this.setupAgentDeckChatSubscription();
    this.setupCanvasAgentSubscription();
    this.setupUploadSessionSubscription();
    this.setupSSEEventSubscriptions();
    this.setupUIThemeSubscription();
    this.setupPerformanceMonitoring();
  }

  // Auth <-> Session coordination
  private setupAuthSessionSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => ({
        user: state.auth.user,
        isLoading: state.auth.isLoading,
        currentSession: state.session.currentSession,
      }),
      (current, previous) => {
        // When user logs out, clear sessions
        if (previous.user && !current.user) {
          console.log('🔐 User logged out, clearing sessions');
          useUnifiedStore.getState().session.clearSessions();
        }
        
        // When user logs in, restore or create session
        if (!previous.user && current.user) {
          console.log('🔐 User logged in, initializing session');
          if (!current.currentSession) {
            useUnifiedStore.getState().session.createSession('Welcome Back');
          }
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // Session <-> Chat coordination
  private setupSessionChatSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => ({
        currentSession: state.session.currentSession,
        activeConversation: state.chat.activeConversation,
        sessions: state.session.sessions.length,
      }),
      (current, previous) => {
        // When session changes, sync chat conversation
        if (current.currentSession?.id !== previous.currentSession?.id) {
          console.log('💬 Session changed, syncing chat conversation');
          
          if (current.currentSession) {
            // Check if we have a conversation for this session
            const existingConversation = useUnifiedStore.getState().chat.conversations[current.currentSession.id];
            
            if (!existingConversation) {
              // Create new conversation with default agents
              const selectedAgents = useUnifiedStore.getState().agentDeck.getSelectedAgents();
              if (selectedAgents.length > 0) {
                useUnifiedStore.getState().chat.startConversation(selectedAgents);
              }
            } else {
              // Switch to existing conversation
              useUnifiedStore.setState((state) => {
                state.chat.activeConversation = current.currentSession!.id;
              });
            }
          }
        }
        
        // When all sessions are cleared, clear all conversations
        if (previous.sessions > 0 && current.sessions === 0) {
          console.log('🗑️ All sessions cleared, clearing conversations');
          useUnifiedStore.setState((state) => {
            state.chat.conversations = {};
            state.chat.activeConversation = null;
          });
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // AgentDeck <-> Chat coordination
  private setupAgentDeckChatSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => ({
        selectedAgents: state.agentDeck.selectedAgents,
        agentStatus: state.agentDeck.agentStatus,
        activeConversation: state.chat.activeConversation,
        isProcessing: state.chat.isProcessing,
      }),
      (current, previous) => {
        // When selected agents change, update active conversation
        if (JSON.stringify(current.selectedAgents) !== JSON.stringify(previous.selectedAgents)) {
          console.log('🤖 Selected agents changed, updating conversation');
          
          const agents = useUnifiedStore.getState().agentDeck.getSelectedAgents();
          
          if (current.activeConversation) {
            // Update existing conversation participants
            useUnifiedStore.setState((state) => {
              const conversation = state.chat.conversations[current.activeConversation!];
              if (conversation) {
                conversation.participants = agents;
                conversation.lastActivity = Date.now();
              }
            });
          } else if (agents.length > 0) {
            // Start new conversation
            useUnifiedStore.getState().chat.startConversation(agents);
          }
        }
        
        // When agents status changes, update chat processing state
        const hasActiveAgent = Object.values(current.agentStatus).some(
          status => status === 'active' || status === 'thinking' || status === 'processing'
        );
        
        const hadActiveAgent = Object.values(previous.agentStatus).some(
          status => status === 'active' || status === 'thinking' || status === 'processing'
        );
        
        if (hasActiveAgent !== hadActiveAgent) {
          useUnifiedStore.setState((state) => {
            state.chat.isProcessing = hasActiveAgent;
            state.ui.showTyping = hasActiveAgent;
          });
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // Canvas <-> Agent coordination
  private setupCanvasAgentSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => ({
        selectedAgents: state.agentDeck.selectedAgents,
        collaborativeSession: state.canvas.collaborativeSession,
        agentSuggestions: state.canvas.agentSuggestions.length,
      }),
      (current, previous) => {
        // When agents are selected and canvas is active, start collaboration
        if (current.selectedAgents.length > 0 && !current.collaborativeSession) {
          const agents = useUnifiedStore.getState().agentDeck.getSelectedAgents();
          const canvasState = useUnifiedStore.getState().canvas;
          
          if (canvasState.isEditing) {
            console.log('🎨 Starting canvas collaboration with agents');
            useUnifiedStore.getState().canvas.startCollaboration(agents);
          }
        }
        
        // When collaboration ends, update agent status
        if (previous.collaborativeSession && !current.collaborativeSession) {
          console.log('🎨 Canvas collaboration ended');
          current.selectedAgents.forEach(agentId => {
            useUnifiedStore.getState().agentDeck.updateAgentStatus(agentId, 'idle');
          });
        }
        
        // When new suggestions are added, notify via UI
        if (current.agentSuggestions > previous.agentSuggestions) {
          // Could trigger a toast notification or highlight changes
          useUnifiedStore.setState((state) => {
            state.ui.showTyping = false; // Stop showing typing when suggestion is ready
          });
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // Upload <-> Session coordination
  private setupUploadSessionSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => ({
        uploads: Object.keys(state.upload.uploads).length,
        completedUploads: Object.values(state.upload.uploads).filter(u => u.status === 'completed').length,
        currentSession: state.session.currentSession,
      }),
      (current, previous) => {
        // When uploads complete, add them to current session
        if (current.completedUploads > previous.completedUploads && current.currentSession) {
          console.log('📁 File upload completed, adding to session');
          
          const completedUploads = Object.values(useUnifiedStore.getState().upload.uploads)
            .filter(u => u.status === 'completed');
          
          const newUploads = completedUploads.slice(previous.completedUploads);
          
          newUploads.forEach(upload => {
            useUnifiedStore.getState().session.addMessage({
              role: 'system',
              content: `File uploaded: ${upload.file.name}`,
              metadata: {
                attachments: [upload.id],
                uploadResult: upload.result
              }
            });
          });
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // SSE Event coordination
  private setupSSEEventSubscriptions() {
    // This would be called by the SSE client when events are received
    const handleSSEEvent = (event: SSEAgentEvent) => {
      console.log('📡 SSE Event received:', event.type);
      
      switch (event.type) {
        case 'agent_network_update':
          this.handleAgentNetworkUpdate(event.data as AgentNetworkUpdate);
          break;
          
        case 'connection':
          this.handleConnectionEvent(event.data as ConnectionEvent);
          break;
          
        case 'agent_start':
          this.handleAgentTaskEvent({ ...event.data, status: 'started' } as AgentTaskEvent);
          break;
          
        case 'agent_complete':
          this.handleAgentTaskEvent({ ...event.data, status: 'completed' } as AgentTaskEvent);
          break;
          
        case 'error':
          this.handleErrorEvent(event.data);
          break;
          
        case 'heartbeat':
          // Just acknowledge the heartbeat
          break;
      }
      
      // Update session with the event
      useUnifiedStore.getState().session.handleSSEEvent(event);
    };
    
    // Expose this handler globally for the SSE client to use
    if (typeof window !== 'undefined') {
      (window as any).__VANA_SSE_HANDLER = handleSSEEvent;
    }
  }

  // UI Theme subscription
  private setupUIThemeSubscription() {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => state.ui.theme,
      (currentTheme) => {
        console.log('🎨 Theme changed to:', currentTheme);
        
        // Apply theme to canvas code editor
        useUnifiedStore.setState((state) => {
          if (state.canvas.collaborativeSession) {
            // Update collaborative session theme
            state.ui.preferences.codeTheme = currentTheme === 'dark' ? 'dark' : 'light';
          }
        });
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // Performance monitoring subscription
  private setupPerformanceMonitoring() {
    let updateCount = 0;
    let lastResetTime = Date.now();
    
    const unsubscribe = useUnifiedStore.subscribe(
      (state, prevState) => {
        updateCount++;
        const now = Date.now();
        
        // Reset counter every second
        if (now - lastResetTime >= 1000) {
          if (updateCount > 60) { // More than 60 updates per second
            console.warn(`🚨 High update frequency: ${updateCount} updates/sec`);
          }
          updateCount = 0;
          lastResetTime = now;
        }
        
        // Check for large state changes that might impact performance
        const stateSize = JSON.stringify(state).length;
        const prevStateSize = JSON.stringify(prevState).length;
        
        if (Math.abs(stateSize - prevStateSize) > 100000) { // 100KB change
          console.warn('🚨 Large state change detected:', {
            current: `${(stateSize / 1024).toFixed(2)}KB`,
            previous: `${(prevStateSize / 1024).toFixed(2)}KB`,
            delta: `${((stateSize - prevStateSize) / 1024).toFixed(2)}KB`
          });
        }
      }
    );
    
    this.subscriptions.push(unsubscribe);
  }

  // SSE Event handlers
  private handleAgentNetworkUpdate(data: AgentNetworkUpdate) {
    console.log('🕸️ Agent network update:', data);
    
    // Update agent statuses based on network data
    data.agents.forEach(agentInfo => {
      const agent = useUnifiedStore.getState().agentDeck.getAgent(agentInfo.id);
      if (agent) {
        useUnifiedStore.getState().agentDeck.updateAgentStatus(agentInfo.id, agentInfo.status);
        
        // Update metrics
        useUnifiedStore.getState().agentDeck.updateAgentMetrics(agentInfo.id, {
          responseTime: 1000, // Would come from actual metrics
          successRate: 0.9 // Would come from actual metrics
        });
      }
    });
    
    // Update chat processing state
    useUnifiedStore.setState((state) => {
      state.chat.isProcessing = data.network_state === 'active';
      state.ui.showTyping = data.network_state === 'active';
    });
  }

  private handleConnectionEvent(data: ConnectionEvent) {
    console.log('🔌 Connection event:', data);
    
    useUnifiedStore.setState((state) => {
      if (data.status === 'connected') {
        state.session.error = null;
      } else if (data.status === 'error') {
        state.session.error = data.error_message || 'Connection error';
      }
    });
  }

  private handleAgentTaskEvent(data: AgentTaskEvent) {
    console.log('🤖 Agent task event:', data);
    
    const agent = useUnifiedStore.getState().agentDeck.getAgent(data.agent_id);
    if (agent) {
      const status = data.status === 'started' ? 'processing' : 
                   data.status === 'completed' ? 'active' : 
                   data.status === 'failed' ? 'error' : 'idle';
      
      useUnifiedStore.getState().agentDeck.updateAgentStatus(data.agent_id, status);
    }
    
    // Add task result to chat if completed
    if (data.status === 'completed' && data.result) {
      const activeConversation = useUnifiedStore.getState().chat.activeConversation;
      if (activeConversation) {
        useUnifiedStore.getState().chat.addMessage(activeConversation, {
          id: `task_${data.agent_id}_${Date.now()}`,
          role: 'assistant',
          content: `Task completed: ${data.task}`,
          timestamp: Date.now(),
          metadata: {
            agentId: data.agent_id,
            agentName: data.agent_name,
            taskResult: data.result
          }
        });
      }
    }
  }

  private handleErrorEvent(data: any) {
    console.error('❌ SSE Error event:', data);
    
    useUnifiedStore.setState((state) => {
      state.session.error = typeof data === 'string' ? data : 'An error occurred';
    });
  }

  // Cleanup method
  destroy() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    this.isInitialized = false;
    
    // Cleanup global SSE handler
    if (typeof window !== 'undefined') {
      delete (window as any).__VANA_SSE_HANDLER;
    }
  }

  // Manual trigger methods for testing
  triggerSSEEvent(event: SSEAgentEvent) {
    if (typeof window !== 'undefined' && (window as any).__VANA_SSE_HANDLER) {
      (window as any).__VANA_SSE_HANDLER(event);
    }
  }

  // Get subscription status
  getSubscriptionStatus() {
    return {
      initialized: this.isInitialized,
      subscriptionCount: this.subscriptions.length,
      hasSSEHandler: typeof window !== 'undefined' && !!(window as any).__VANA_SSE_HANDLER
    };
  }
}

// Create singleton instance
export const subscriptionManager = new StoreSubscriptionManager();

// Hook to access subscription manager
export const useStoreSubscriptions = () => {
  return {
    manager: subscriptionManager,
    status: subscriptionManager.getSubscriptionStatus(),
    triggerEvent: (event: SSEAgentEvent) => subscriptionManager.triggerSSEEvent(event)
  };
};

// Utility to manually sync stores (useful for testing or recovery)
export const syncStores = () => {
  console.log('🔄 Manual store sync triggered');
  
  const state = useUnifiedStore.getState();
  
  // Sync auth -> session
  if (!state.auth.user && state.session.sessions.length > 0) {
    state.session.clearSessions();
  }
  
  // Sync session -> chat
  if (state.session.currentSession && !state.chat.activeConversation) {
    const agents = state.agentDeck.getSelectedAgents();
    if (agents.length > 0) {
      state.chat.startConversation(agents);
    }
  }
  
  // Sync agent deck -> chat processing
  const hasActiveAgent = Object.values(state.agentDeck.agentStatus).some(
    status => status === 'active' || status === 'thinking' || status === 'processing'
  );
  
  useUnifiedStore.setState((s) => {
    s.chat.isProcessing = hasActiveAgent;
    s.ui.showTyping = hasActiveAgent;
  });
  
  console.log('✅ Store sync completed');
};

// Development helpers
export const debugSubscriptions = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🔗 Store Subscriptions Debug');
  console.log('Status:', subscriptionManager.getSubscriptionStatus());
  console.log('Current State:', useUnifiedStore.getState());
  console.groupEnd();
};

// Export for global access in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__VANA_STORE_SUBSCRIPTIONS = {
    manager: subscriptionManager,
    syncStores,
    debugSubscriptions
  };
}