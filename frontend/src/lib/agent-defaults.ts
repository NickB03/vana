import { AgentPersonality } from '@/types/agents';

/**
 * Default personality configuration for user messages
 */
export const DEFAULT_USER_PERSONALITY: AgentPersonality = {
  style: 'collaborative',
  tone: 'professional',
  formality: 'semi-formal',
  expertise: 'intermediate',
  responsePattern: {
    structure: 'conversational',
    length: 'moderate',
    examples: true,
    questions: true,
    suggestions: false
  },
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#60a5fa',
    background: '#eff6ff',
    text: '#1e40af',
    border: '#3b82f6'
  },
  emoji: '👤'
};

/**
 * Default personality configuration for assistant messages
 */
export const DEFAULT_ASSISTANT_PERSONALITY: AgentPersonality = {
  style: 'collaborative',
  tone: 'professional',
  formality: 'semi-formal',
  expertise: 'intermediate',
  responsePattern: {
    structure: 'conversational',
    length: 'moderate',
    examples: true,
    questions: true,
    suggestions: false
  },
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#60a5fa',
    background: '#eff6ff',
    text: '#1e40af',
    border: '#3b82f6'
  },
  emoji: '🤖'
};

/**
 * Get the default personality configuration based on message role
 */
export const getDefaultPersonality = (role: 'user' | 'assistant' | 'system'): AgentPersonality => {
  return role === 'user' ? DEFAULT_USER_PERSONALITY : DEFAULT_ASSISTANT_PERSONALITY;
};