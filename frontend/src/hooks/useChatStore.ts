/**
 * useChatStore Hook - Mock implementation for testing
 */

export interface ChatStoreState {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: number;
    parentId?: string;
    feedback?: string;
  }>;
  isGenerating: boolean;
  thoughtProcess?: string[];
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  regenerateMessage: (messageId: string) => void;
  addFeedback: (messageId: string, feedback: string | null) => void;
  setEditMode: (messageId: string, enabled: boolean) => void;
}

export const useChatStore = (): ChatStoreState => {
  return {
    messages: [],
    isGenerating: false,
    thoughtProcess: [],
    editMessage: () => {},
    deleteMessage: () => {},
    regenerateMessage: () => {},
    addFeedback: () => {},
    setEditMode: () => {},
  };
};