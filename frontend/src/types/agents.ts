export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  type: AgentRole; // Alias for role for backward compatibility
  avatar: string;
  personality: AgentPersonality;
  status: AgentStatus;
  capabilities: string[];
  description: string;
  lastActivity?: number;
  messageCount: number;
  isTyping: boolean;
  thinkingState?: ThinkingState;
  stats: AgentStats;
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
  | 'completed'
  | 'processing'
  | 'responding'
  | 'collaborating'
  | 'waiting';

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
  | 'relaxed'
  | 'academic'
  | 'professional';

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
    type: "coordinator",
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
    description: "Orchestrates multi-agent workflows and coordinates team efforts",
    stats: {
      success_rate: 0.85,
      average_response_time: 1200,
      tasks_completed: 45,
      messages_sent: 180,
      collaborations: 12
    }
  },
  analyst: {
    name: "Sam Analyst",
    role: "analyst",
    type: "analyst",
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
    description: "Analyzes data patterns and provides strategic insights",
    stats: {
      success_rate: 0.92,
      average_response_time: 1800,
      tasks_completed: 38,
      messages_sent: 152,
      collaborations: 8
    }
  },
  researcher: {
    name: "Riley Research",
    role: "researcher",
    type: "researcher",
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
    description: "Conducts thorough research and gathers comprehensive information",
    stats: {
      success_rate: 0.89,
      average_response_time: 2400,
      tasks_completed: 32,
      messages_sent: 128,
      collaborations: 15
    }
  },
  coder: {
    name: "Code Master",
    role: "coder",
    type: "coder",
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
    description: "Writes, reviews, and optimizes code across multiple languages",
    stats: {
      success_rate: 0.94,
      average_response_time: 1600,
      tasks_completed: 67,
      messages_sent: 201,
      collaborations: 22
    }
  },
  reviewer: {
    name: "Quinn Reviewer",
    role: "reviewer",
    type: "reviewer",
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
    description: "Ensures quality, compliance, and best practices",
    stats: {
      success_rate: 0.91,
      average_response_time: 1400,
      tasks_completed: 55,
      messages_sent: 165,
      collaborations: 18
    }
  },
  optimizer: {
    name: "Max Optimizer",
    role: "optimizer",
    type: "optimizer",
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
    description: "Optimizes performance, efficiency, and resource utilization",
    stats: {
      success_rate: 0.88,
      average_response_time: 1100,
      tasks_completed: 42,
      messages_sent: 134,
      collaborations: 10
    }
  },
  tester: {
    name: "Test Expert",
    role: "tester",
    type: "tester",
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
    description: "Creates comprehensive test strategies and automated testing solutions",
    stats: {
      success_rate: 0.95,
      average_response_time: 1300,
      tasks_completed: 62,
      messages_sent: 186,
      collaborations: 14
    }
  },
  documenter: {
    name: "Doc Writer",
    role: "documenter",
    type: "documenter",
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
    description: "Creates clear, comprehensive documentation and user guides",
    stats: {
      success_rate: 0.87,
      average_response_time: 1700,
      tasks_completed: 29,
      messages_sent: 98,
      collaborations: 6
    }
  },
  monitor: {
    name: "Monitor Bot",
    role: "monitor",
    type: "monitor",
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
    description: "Monitors system health, performance, and provides alerts",
    stats: {
      success_rate: 0.96,
      average_response_time: 800,
      tasks_completed: 78,
      messages_sent: 245,
      collaborations: 4
    }
  },
  specialist: {
    name: "Expert Pro",
    role: "specialist",
    type: "specialist",
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
    description: "Provides specialized expertise in specific domains",
    stats: {
      success_rate: 0.93,
      average_response_time: 1500,
      tasks_completed: 35,
      messages_sent: 140,
      collaborations: 20
    }
  },
  architect: {
    name: "System Architect",
    role: "architect",
    type: "architect",
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
    description: "Designs robust system architectures and technical solutions",
    stats: {
      success_rate: 0.90,
      average_response_time: 2200,
      tasks_completed: 28,
      messages_sent: 112,
      collaborations: 16
    }
  },
  creative: {
    name: "Creative Spark",
    role: "creative",
    type: "creative",
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
    description: "Generates creative solutions and innovative approaches",
    stats: {
      success_rate: 0.84,
      average_response_time: 1900,
      tasks_completed: 41,
      messages_sent: 157,
      collaborations: 25
    }
  },
  "problem-solver": {
    name: "Solution Finder",
    role: "problem-solver",
    type: "problem-solver",
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
    description: "Identifies problems and develops practical solutions",
    stats: {
      success_rate: 0.86,
      average_response_time: 1600,
      tasks_completed: 39,
      messages_sent: 144,
      collaborations: 13
    }
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
  success_rate: number; // 0-1 range
  average_response_time: number; // milliseconds
  tasks_completed: number;
  messages_sent: number;
  collaborations: number;
}

// Animation and UI-related types
export type AnimationState = 'fade' | 'pulse' | 'rotate' | 'bounce' | 'glow' | 'shake' | 'none';

export interface AgentAnimationConfig {
  state: AnimationState;
  duration: number; // milliseconds
  intensity: 'low' | 'medium' | 'high';
  color_shift?: boolean;
}

// Network and system-level types
export interface AgentNetwork {
  id: string;
  name: string;
  agents: Agent[];
  connections: AgentConnection[];
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  status: 'active' | 'inactive' | 'error';
  created_at: number;
  updated_at: number;
}

export interface AgentConnection {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  connection_type: 'collaboration' | 'dependency' | 'communication';
  strength: number; // 0-1 range
  last_interaction: number;
}