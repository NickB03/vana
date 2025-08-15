import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Agent, AgentRole, AgentMessage, AgentThread, AgentConversation, AGENT_PRESETS } from '@/types/agents';

interface AgentState {
  // Available agents
  availableAgents: Agent[];
  
  // Currently selected agent
  selectedAgent: Agent | null;
  
  // Active conversation with multiple agents
  activeConversation: AgentConversation | null;
  
  // All conversations history
  conversations: AgentConversation[];
  
  // UI state
  isAgentSelectorOpen: boolean;
  agentSelectorMode: 'dropdown' | 'sidebar';
  
  // Actions
  initializeDefaultAgents: () => void;
  selectAgent: (agentId: string) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
  
  // Agent status management
  setAgentStatus: (agentId: string, status: Agent['status']) => void;
  setAgentTyping: (agentId: string, isTyping: boolean) => void;
  updateAgentThinking: (agentId: string, thinkingState: Agent['thinkingState']) => void;
  
  // Conversation management
  createConversation: (sessionId: string, agents: Agent[]) => AgentConversation;
  addMessageToConversation: (conversationId: string, message: AgentMessage) => void;
  createThread: (conversationId: string, title: string, participantIds: string[]) => AgentThread;
  setActiveThread: (conversationId: string, threadId: string) => void;
  
  // UI state
  toggleAgentSelector: () => void;
  setAgentSelectorMode: (mode: 'dropdown' | 'sidebar') => void;
  
  // Utility functions
  getAgentById: (agentId: string) => Agent | undefined;
  getAgentsByRole: (role: AgentRole) => Agent[];
  getActiveAgents: () => Agent[];
  getAgentConversation: (sessionId: string) => AgentConversation | undefined;
}

// Create agent from preset
const createAgentFromPreset = (role: AgentRole, customId?: string): Agent => {
  const preset = AGENT_PRESETS[role];
  return {
    ...preset,
    id: customId || `agent_${role}_${Date.now()}`,
    status: 'idle',
    lastActivity: Date.now(),
    messageCount: 0,
    isTyping: false
  };
};

// Default agents to initialize with
const DEFAULT_AGENT_ROLES: AgentRole[] = [
  'coordinator',
  'analyst', 
  'researcher',
  'coder',
  'reviewer'
];

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Initial state
      availableAgents: [],
      selectedAgent: null,
      activeConversation: null,
      conversations: [],
      isAgentSelectorOpen: false,
      agentSelectorMode: 'dropdown',

      // Initialize default agents
      initializeDefaultAgents: () => {
        const defaultAgents = DEFAULT_AGENT_ROLES.map(role => 
          createAgentFromPreset(role)
        );
        
        set(state => ({
          availableAgents: [...state.availableAgents, ...defaultAgents],
          selectedAgent: state.selectedAgent || defaultAgents[0]
        }));
      },

      // Agent selection
      selectAgent: (agentId: string) => {
        const agent = get().getAgentById(agentId);
        if (agent) {
          set({ selectedAgent: agent });
        }
      },

      // Agent management
      addAgent: (agent: Agent) => {
        set(state => ({
          availableAgents: [...state.availableAgents, agent]
        }));
      },

      updateAgent: (agentId: string, updates: Partial<Agent>) => {
        set(state => ({
          availableAgents: state.availableAgents.map(agent =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          ),
          selectedAgent: state.selectedAgent?.id === agentId 
            ? { ...state.selectedAgent, ...updates }
            : state.selectedAgent
        }));
      },

      removeAgent: (agentId: string) => {
        set(state => ({
          availableAgents: state.availableAgents.filter(agent => agent.id !== agentId),
          selectedAgent: state.selectedAgent?.id === agentId ? null : state.selectedAgent
        }));
      },

      // Agent status management
      setAgentStatus: (agentId: string, status: Agent['status']) => {
        get().updateAgent(agentId, { 
          status, 
          lastActivity: Date.now() 
        });
      },

      setAgentTyping: (agentId: string, isTyping: boolean) => {
        get().updateAgent(agentId, { 
          isTyping,
          status: isTyping ? 'thinking' : 'active',
          lastActivity: Date.now()
        });
      },

      updateAgentThinking: (agentId: string, thinkingState: Agent['thinkingState']) => {
        get().updateAgent(agentId, { 
          thinkingState,
          status: thinkingState ? 'thinking' : 'active',
          lastActivity: Date.now()
        });
      },

      // Conversation management
      createConversation: (sessionId: string, agents: Agent[]) => {
        const conversation: AgentConversation = {
          id: `conv_${sessionId}_${Date.now()}`,
          sessionId,
          participants: agents,
          threads: [],
          lastActivity: Date.now()
        };

        // Create initial thread
        const initialThread: AgentThread = {
          id: `thread_${Date.now()}`,
          title: 'Main Conversation',
          participants: agents.map(a => a.id),
          messages: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        conversation.threads.push(initialThread);
        conversation.activeThread = initialThread.id;

        set(state => ({
          conversations: [...state.conversations, conversation],
          activeConversation: conversation
        }));

        return conversation;
      },

      addMessageToConversation: (conversationId: string, message: AgentMessage) => {
        set(state => {
          const conversations = state.conversations.map(conv => {
            if (conv.id === conversationId) {
              const threads = conv.threads.map(thread => {
                if (thread.id === (message.threadId || conv.activeThread)) {
                  return {
                    ...thread,
                    messages: [...thread.messages, message],
                    updatedAt: Date.now()
                  };
                }
                return thread;
              });

              return {
                ...conv,
                threads,
                lastActivity: Date.now()
              };
            }
            return conv;
          });

          return {
            conversations,
            activeConversation: state.activeConversation?.id === conversationId 
              ? conversations.find(c => c.id === conversationId) || state.activeConversation
              : state.activeConversation
          };
        });

        // Update agent message count and last activity
        const agent = get().getAgentById(message.agentId);
        if (agent) {
          get().updateAgent(message.agentId, {
            messageCount: agent.messageCount + 1,
            lastActivity: Date.now(),
            isTyping: false,
            status: 'active'
          });
        }
      },

      createThread: (conversationId: string, title: string, participantIds: string[]) => {
        const thread: AgentThread = {
          id: `thread_${Date.now()}`,
          title,
          participants: participantIds,
          messages: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        set(state => ({
          conversations: state.conversations.map(conv => 
            conv.id === conversationId
              ? { ...conv, threads: [...conv.threads, thread] }
              : conv
          )
        }));

        return thread;
      },

      setActiveThread: (conversationId: string, threadId: string) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, activeThread: threadId }
              : conv
          ),
          activeConversation: state.activeConversation?.id === conversationId
            ? { ...state.activeConversation, activeThread: threadId }
            : state.activeConversation
        }));
      },

      // UI state management
      toggleAgentSelector: () => {
        set(state => ({ isAgentSelectorOpen: !state.isAgentSelectorOpen }));
      },

      setAgentSelectorMode: (mode: 'dropdown' | 'sidebar') => {
        set({ agentSelectorMode: mode });
      },

      // Utility functions
      getAgentById: (agentId: string) => {
        return get().availableAgents.find(agent => agent.id === agentId);
      },

      getAgentsByRole: (role: AgentRole) => {
        return get().availableAgents.filter(agent => agent.role === role);
      },

      getActiveAgents: () => {
        return get().availableAgents.filter(agent => 
          ['active', 'thinking', 'busy'].includes(agent.status)
        );
      },

      getAgentConversation: (sessionId: string) => {
        return get().conversations.find(conv => conv.sessionId === sessionId);
      }
    }),
    {
      name: 'agent-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not UI state
      partialize: (state) => ({
        availableAgents: state.availableAgents,
        conversations: state.conversations,
        selectedAgent: state.selectedAgent
      })
    }
  )
);