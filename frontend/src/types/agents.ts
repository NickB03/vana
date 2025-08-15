export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  avatar: string;
  personality: AgentPersonality;
  status: AgentStatus;
  capabilities: string[];
  description: string;
  lastActivity?: number;
  messageCount: number;
  isTyping: boolean;
  thinkingState?: ThinkingState;
}

export type AgentRole = 
  | 'coordinator'
  | 'analyst' 
  | 'researcher'
  | 'coder'
  | 'reviewer'
  | 'optimizer'
  | 'tester'
  | 'documenter'
  | 'monitor'
  | 'specialist'
  | 'architect'
  | 'creative'
  | 'problem-solver';

export type AgentStatus = 
  | 'active'
  | 'idle' 
  | 'busy'
  | 'thinking'
  | 'offline'
  | 'error'
  | 'completed';

export interface AgentPersonality {
  style: PersonalityStyle;
  tone: PersonalityTone;
  formality: PersonalityFormality;
  expertise: PersonalityExpertise;
  responsePattern: ResponsePattern;
  colors: AgentColors;
  emoji: string;
}

export type PersonalityStyle = 
  | 'analytical'
  | 'creative'
  | 'methodical'
  | 'innovative'
  | 'collaborative'
  | 'direct'
  | 'supportive'
  | 'technical';

export type PersonalityTone = 
  | 'professional'
  | 'friendly'
  | 'casual'
  | 'enthusiastic'
  | 'thoughtful'
  | 'concise'
  | 'detailed'
  | 'encouraging';

export type PersonalityFormality = 
  | 'formal'
  | 'semi-formal'
  | 'casual'
  | 'relaxed';

export type PersonalityExpertise = 
  | 'beginner-friendly'
  | 'intermediate'
  | 'expert'
  | 'academic'
  | 'practical'
  | 'theoretical';

export interface ResponsePattern {
  structure: 'bullet-points' | 'paragraphs' | 'step-by-step' | 'conversational' | 'code-first';
  length: 'concise' | 'moderate' | 'detailed' | 'comprehensive';
  examples: boolean;
  questions: boolean;
  suggestions: boolean;
}

export interface AgentColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

export interface ThinkingState {
  phase: 'analyzing' | 'processing' | 'generating' | 'reviewing' | 'finalizing';
  progress: number; // 0-100
  currentTask?: string;
  timeElapsed: number;
}

export interface AgentMessage extends Omit<import('./session').ChatMessage, 'role'> {
  agentId: string;
  agentRole: AgentRole;
  personality: AgentPersonality;
  threadId?: string;
  replyToId?: string;
  confidence?: number;
  processingTime?: number;
}

export interface AgentThread {
  id: string;
  title: string;
  participants: string[]; // agent IDs
  messages: AgentMessage[];
  status: 'active' | 'archived' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface AgentConversation {
  id: string;
  sessionId: string;
  participants: Agent[];
  threads: AgentThread[];
  activeThread?: string;
  lastActivity: number;
}

// Predefined agent configurations
export const AGENT_PRESETS: Record<AgentRole, Omit<Agent, 'id' | 'status' | 'lastActivity' | 'messageCount' | 'isTyping'>> = {
  coordinator: {
    name: "Alex Coordinator",
    role: "coordinator",
    avatar: "👥",
    personality: {
      style: "collaborative",
      tone: "professional",
      formality: "semi-formal",
      expertise: "intermediate",
      responsePattern: {
        structure: "bullet-points",
        length: "moderate",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#3b82f6",
        secondary: "#1e40af",
        accent: "#60a5fa",
        background: "#eff6ff",
        text: "#1e40af",
        border: "#3b82f6"
      },
      emoji: "👥"
    },
    capabilities: ["task-management", "team-coordination", "planning", "delegation"],
    description: "Orchestrates multi-agent workflows and coordinates team efforts"
  },
  analyst: {
    name: "Sam Analyst",
    role: "analyst",
    avatar: "📊",
    personality: {
      style: "analytical",
      tone: "thoughtful",
      formality: "formal",
      expertise: "expert",
      responsePattern: {
        structure: "step-by-step",
        length: "detailed",
        examples: true,
        questions: false,
        suggestions: true
      },
      colors: {
        primary: "#10b981",
        secondary: "#047857",
        accent: "#34d399",
        background: "#ecfdf5",
        text: "#047857",
        border: "#10b981"
      },
      emoji: "📊"
    },
    capabilities: ["data-analysis", "pattern-recognition", "insights", "visualization"],
    description: "Analyzes data patterns and provides strategic insights"
  },
  researcher: {
    name: "Riley Research",
    role: "researcher",
    avatar: "🔍",
    personality: {
      style: "methodical",
      tone: "detailed",
      formality: "academic",
      expertise: "expert",
      responsePattern: {
        structure: "paragraphs",
        length: "comprehensive",
        examples: true,
        questions: true,
        suggestions: false
      },
      colors: {
        primary: "#8b5cf6",
        secondary: "#7c3aed",
        accent: "#a78bfa",
        background: "#f5f3ff",
        text: "#7c3aed",
        border: "#8b5cf6"
      },
      emoji: "🔍"
    },
    capabilities: ["information-gathering", "fact-checking", "literature-review", "source-validation"],
    description: "Conducts thorough research and gathers comprehensive information"
  },
  coder: {
    name: "Code Master",
    role: "coder",
    avatar: "💻",
    personality: {
      style: "technical",
      tone: "concise",
      formality: "casual",
      expertise: "expert",
      responsePattern: {
        structure: "code-first",
        length: "moderate",
        examples: true,
        questions: false,
        suggestions: true
      },
      colors: {
        primary: "#f59e0b",
        secondary: "#d97706",
        accent: "#fbbf24",
        background: "#fffbeb",
        text: "#d97706",
        border: "#f59e0b"
      },
      emoji: "💻"
    },
    capabilities: ["programming", "debugging", "code-review", "architecture", "optimization"],
    description: "Writes, reviews, and optimizes code across multiple languages"
  },
  reviewer: {
    name: "Quinn Reviewer",
    role: "reviewer",
    avatar: "✅",
    personality: {
      style: "methodical",
      tone: "professional",
      formality: "semi-formal",
      expertise: "expert",
      responsePattern: {
        structure: "bullet-points",
        length: "detailed",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#ef4444",
        secondary: "#dc2626",
        accent: "#f87171",
        background: "#fef2f2",
        text: "#dc2626",
        border: "#ef4444"
      },
      emoji: "✅"
    },
    capabilities: ["quality-assurance", "code-review", "testing", "compliance", "documentation-review"],
    description: "Ensures quality, compliance, and best practices"
  },
  optimizer: {
    name: "Max Optimizer",
    role: "optimizer",
    avatar: "⚡",
    personality: {
      style: "innovative",
      tone: "enthusiastic",
      formality: "casual",
      expertise: "expert",
      responsePattern: {
        structure: "step-by-step",
        length: "moderate",
        examples: true,
        questions: false,
        suggestions: true
      },
      colors: {
        primary: "#06b6d4",
        secondary: "#0891b2",
        accent: "#22d3ee",
        background: "#ecfeff",
        text: "#0891b2",
        border: "#06b6d4"
      },
      emoji: "⚡"
    },
    capabilities: ["performance-optimization", "efficiency", "resource-management", "scaling"],
    description: "Optimizes performance, efficiency, and resource utilization"
  },
  tester: {
    name: "Test Expert",
    role: "tester",
    avatar: "🧪",
    personality: {
      style: "methodical",
      tone: "detailed",
      formality: "professional",
      expertise: "expert",
      responsePattern: {
        structure: "step-by-step",
        length: "detailed",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#84cc16",
        secondary: "#65a30d",
        accent: "#a3e635",
        background: "#f7fee7",
        text: "#65a30d",
        border: "#84cc16"
      },
      emoji: "🧪"
    },
    capabilities: ["testing", "automation", "quality-assurance", "test-planning", "debugging"],
    description: "Creates comprehensive test strategies and automated testing solutions"
  },
  documenter: {
    name: "Doc Writer",
    role: "documenter",
    avatar: "📝",
    personality: {
      style: "supportive",
      tone: "friendly",
      formality: "semi-formal",
      expertise: "beginner-friendly",
      responsePattern: {
        structure: "paragraphs",
        length: "comprehensive",
        examples: true,
        questions: false,
        suggestions: false
      },
      colors: {
        primary: "#6366f1",
        secondary: "#4f46e5",
        accent: "#818cf8",
        background: "#eef2ff",
        text: "#4f46e5",
        border: "#6366f1"
      },
      emoji: "📝"
    },
    capabilities: ["documentation", "technical-writing", "tutorials", "guides", "api-docs"],
    description: "Creates clear, comprehensive documentation and user guides"
  },
  monitor: {
    name: "Monitor Bot",
    role: "monitor",
    avatar: "📡",
    personality: {
      style: "direct",
      tone: "concise",
      formality: "formal",
      expertise: "practical",
      responsePattern: {
        structure: "bullet-points",
        length: "concise",
        examples: false,
        questions: false,
        suggestions: true
      },
      colors: {
        primary: "#64748b",
        secondary: "#475569",
        accent: "#94a3b8",
        background: "#f8fafc",
        text: "#475569",
        border: "#64748b"
      },
      emoji: "📡"
    },
    capabilities: ["monitoring", "alerts", "metrics", "health-checks", "logging"],
    description: "Monitors system health, performance, and provides alerts"
  },
  specialist: {
    name: "Expert Pro",
    role: "specialist",
    avatar: "🎯",
    personality: {
      style: "technical",
      tone: "professional",
      formality: "formal",
      expertise: "expert",
      responsePattern: {
        structure: "paragraphs",
        length: "detailed",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#be185d",
        secondary: "#9d174d",
        accent: "#ec4899",
        background: "#fdf2f8",
        text: "#9d174d",
        border: "#be185d"
      },
      emoji: "🎯"
    },
    capabilities: ["domain-expertise", "specialized-knowledge", "consultation", "advisory"],
    description: "Provides specialized expertise in specific domains"
  },
  architect: {
    name: "System Architect",
    role: "architect",
    avatar: "🏗️",
    personality: {
      style: "methodical",
      tone: "thoughtful",
      formality: "formal",
      expertise: "expert",
      responsePattern: {
        structure: "step-by-step",
        length: "comprehensive",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#0f766e",
        secondary: "#0d9488",
        accent: "#14b8a6",
        background: "#f0fdfa",
        text: "#0d9488",
        border: "#0f766e"
      },
      emoji: "🏗️"
    },
    capabilities: ["system-design", "architecture", "scalability", "integration", "planning"],
    description: "Designs robust system architectures and technical solutions"
  },
  creative: {
    name: "Creative Spark",
    role: "creative",
    avatar: "🎨",
    personality: {
      style: "creative",
      tone: "enthusiastic",
      formality: "casual",
      expertise: "intermediate",
      responsePattern: {
        structure: "conversational",
        length: "moderate",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#f97316",
        secondary: "#ea580c",
        accent: "#fb923c",
        background: "#fff7ed",
        text: "#ea580c",
        border: "#f97316"
      },
      emoji: "🎨"
    },
    capabilities: ["creative-thinking", "brainstorming", "ideation", "design", "innovation"],
    description: "Generates creative solutions and innovative approaches"
  },
  "problem-solver": {
    name: "Solution Finder",
    role: "problem-solver",
    avatar: "🧩",
    personality: {
      style: "innovative",
      tone: "encouraging",
      formality: "casual",
      expertise: "practical",
      responsePattern: {
        structure: "step-by-step",
        length: "moderate",
        examples: true,
        questions: true,
        suggestions: true
      },
      colors: {
        primary: "#7c2d12",
        secondary: "#a16207",
        accent: "#fbbf24",
        background: "#fefce8",
        text: "#a16207",
        border: "#7c2d12"
      },
      emoji: "🧩"
    },
    capabilities: ["problem-solving", "troubleshooting", "root-cause-analysis", "solutions"],
    description: "Identifies problems and develops practical solutions"
  }
};

// Event interfaces for SSE communication
export interface AgentStatusEvent {
  type: 'agent_status_update';
  data: {
    agent_id: string;
    status: AgentStatus;
    activity?: string;
    progress?: number;
  };
}

export interface AgentThinkingEvent {
  type: 'agent_thinking';
  data: {
    agent_id: string;
    thought: string;
    stage: string;
  };
}

export interface AgentCollaborationEvent {
  type: 'agent_collaboration';
  data: {
    initiator_id: string;
    collaborator_id: string;
    action: string;
    context?: string;
  };
}

// Additional types for agent system
export type AgentType = AgentRole;

export interface AgentSelection {
  primary_agent: string | null;
  available_agents: string[];
  collaboration_mode: boolean;
}

export interface AgentTask {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agent_id: string;
  created_at: number;
  updated_at: number;
  metadata?: Record<string, unknown>;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  icon: string;
}

export interface CapabilityShowcase {
  featured_capability: string;
  demonstration?: {
    title: string;
    description: string;
    example: string;
  };
}

export interface AgentStats {
  success_rate: number;
  average_response_time: number;
  tasks_completed: number;
  messages_sent: number;
  collaborations: number;
}