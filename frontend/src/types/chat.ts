/**
 * TypeScript interfaces for Vana frontend chat system
 * Generated from data-model.md specification
 */

// ===== ENUMS =====

export type QueryType = 
  | 'research'          // General research question
  | 'analysis'          // Data analysis request
  | 'comparison'        // Comparative analysis
  | 'summarization'     // Content summarization
  | 'fact-check'        // Fact verification
  | 'creative';         // Creative content generation

export type AgentType = 
  | 'team_leader'        // Coordinates research process
  | 'plan_generator'     // Creates research strategy  
  | 'section_planner'    // Plans report sections
  | 'section_researcher' // Researches specific sections
  | 'enhanced_search'    // Performs web searches
  | 'research_evaluator' // Evaluates research quality
  | 'escalation_checker' // Checks for escalation needs
  | 'report_writer';     // Synthesizes final report

export type ResponseStatus = 
  | 'processing'    // Agent is working
  | 'completed'     // Response finished
  | 'failed'        // Processing failed
  | 'timeout'       // Processing timed out
  | 'cancelled';    // User cancelled

export type UpdateType = 
  | 'query_received'     // Query received and queued
  | 'processing_started' // Research processing began
  | 'agent_started'      // Specific agent started
  | 'agent_completed'    // Specific agent finished
  | 'partial_result'     // Intermediate result available
  | 'quality_check'      // Quality validation step
  | 'result_generated'   // Final result ready
  | 'error_occurred'     // Error in processing
  | 'timeout_warning'    // Process taking longer than expected
  | 'user_cancelled';    // User cancelled operation

// ===== CORE ENTITIES =====

// 1. Chat Session
export interface ChatSession {
  id: string;                    // UUID v4 identifier
  title: string;                 // Generated from first query or user-provided
  userId: string;                // Foreign key to user authentication
  createdAt: Date;              // Session creation timestamp
  updatedAt: Date;              // Last activity timestamp
  status: 'active' | 'archived' | 'deleted'; // Session lifecycle state
  messageCount: number;         // Total messages in session
  settings: SessionSettings;    // User preferences for this session
  metadata: SessionMetadata;    // Additional session information
}

export interface SessionSettings {
  theme: 'light' | 'dark' | 'system';     // Theme preference
  autoScroll: boolean;                     // Auto-scroll to new messages
  notifications: boolean;                  // Enable notification sounds
  streamingEnabled: boolean;               // Enable real-time streaming
}

export interface SessionMetadata {
  userAgent: string;                       // Browser/device information
  lastIpAddress: string;                   // Security tracking
  researchContext?: string;                // Domain/topic context
  agentPreferences?: AgentConfiguration[]; // Preferred agent settings
}

export interface AgentConfiguration {
  agentType: AgentType;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  customInstructions?: string;
}

// 2. Research Query
export interface ResearchQuery {
  id: string;                    // UUID v4 identifier
  sessionId: string;             // Foreign key to chat session
  content: string;               // User's research question/prompt
  type: QueryType;               // Classification of query type
  priority: 'low' | 'medium' | 'high'; // Processing priority
  createdAt: Date;               // Query submission timestamp
  processedAt?: Date;            // Processing completion timestamp
  estimatedDuration?: number;    // Expected processing time (seconds)
  attachments: QueryAttachment[]; // Uploaded files or references
  parameters: QueryParameters;    // Processing configuration
}

export interface QueryAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;                  // Bytes
  url: string;                   // Storage URL
  metadata: Record<string, any>;
}

export interface QueryParameters {
  maxDuration: number;           // Maximum processing time (seconds)
  agentSelection: string[];      // Specific agents to use
  outputFormat: 'structured' | 'narrative' | 'bullet-points';
  detailLevel: 'brief' | 'detailed' | 'comprehensive';
  sourcesRequired: boolean;      // Whether citations needed
}

// 3. Agent Response
export interface AgentResponse {
  id: string;                    // UUID v4 identifier
  queryId: string;               // Foreign key to research query
  agentId: string;               // Agent identifier
  agentType: AgentType;          // Type of agent that responded
  content: string;               // Agent's response content
  status: ResponseStatus;        // Processing status
  confidence: number;            // Confidence score (0-1)
  sources: ResponseSource[];     // Citations and references
  createdAt: Date;               // Response creation timestamp
  processingTimeMs: number;      // Agent processing duration
  tokens: TokenUsage;            // Token consumption metrics
  metadata: AgentMetadata;       // Agent-specific information
}

export interface ResponseSource {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  relevanceScore: number;        // 0-1 relevance rating
  credibilityScore: number;      // 0-1 credibility rating
  accessedAt: Date;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;                  // USD cost estimate
}

export interface AgentMetadata {
  model: string;                 // AI model used
  temperature: number;           // Generation temperature
  maxTokens: number;            // Token limit
  customInstructions?: string;   // Agent-specific instructions
}

// 4. Research Result
export interface ResearchResult {
  id: string;                    // UUID v4 identifier
  queryId: string;               // Foreign key to research query
  title: string;                 // Generated result title
  summary: string;               // Executive summary
  content: ResultContent;        // Structured result content
  status: 'draft' | 'completed' | 'failed'; // Result status
  quality: QualityMetrics;       // Quality assessment
  citations: Citation[];         // All sources used
  generatedAt: Date;             // Result generation timestamp
  wordCount: number;             // Total word count
  readingTimeMinutes: number;    // Estimated reading time
  format: ResultFormat;          // Output format configuration
}

export interface ResultContent {
  sections: ResultSection[];     // Organized content sections
  keyFindings: string[];        // Important discoveries
  recommendations: string[];     // Actionable recommendations
  limitations: string[];        // Research limitations noted
  methodology: string;          // Research approach used
}

export interface ResultSection {
  id: string;
  title: string;
  content: string;
  order: number;                // Display order
  agentContributions: string[]; // Contributing agent IDs
  confidence: number;           // Section confidence (0-1)
}

export interface QualityMetrics {
  overallScore: number;         // 0-1 quality rating
  completeness: number;         // How complete the research is
  accuracy: number;             // Fact-checking score
  relevance: number;           // Query relevance score
  sourceQuality: number;       // Citation quality score
  coherence: number;           // Content organization score
}

export interface Citation {
  id: string;
  url: string;
  title: string;
  authors: string[];
  publishDate?: Date;
  accessDate: Date;
  excerpt: string;
  usageContext: string;        // How citation was used
}

export interface ResultFormat {
  structure: 'academic' | 'business' | 'casual' | 'technical';
  includeCharts: boolean;
  includeTables: boolean;
  citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
}

// 5. User Session
export interface UserSession {
  id: string;                    // UUID v4 identifier
  userId: string;                // External user identifier
  email: string;                 // User email address
  displayName: string;           // User display name
  avatar?: string;               // Profile image URL
  preferences: UserPreferences;  // User settings
  subscription: SubscriptionInfo; // Account subscription
  createdAt: Date;               // Account creation
  lastLoginAt: Date;             // Last login timestamp
  loginCount: number;            // Total login count
  status: 'active' | 'suspended' | 'deleted'; // Account status
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;              // ISO language code
  timezone: string;              // IANA timezone
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  sound: boolean;
  researchComplete: boolean;
  systemUpdates: boolean;
}

export interface PrivacySettings {
  shareUsageData: boolean;
  personalizeExperience: boolean;
  storeSearchHistory: boolean;
  allowAnalytics: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  validUntil: Date;
  queriesUsed: number;
  queriesLimit: number;
  features: string[];
}

// 6. Progress Update
export interface ProgressUpdate {
  id: string;                    // UUID v4 identifier
  queryId: string;               // Foreign key to research query
  agentId?: string;              // Optional agent identifier
  type: UpdateType;              // Type of progress update
  message: string;               // Human-readable status message
  progress: number;              // Completion percentage (0-100)
  timestamp: Date;               // Update timestamp
  metadata: UpdateMetadata;      // Additional update information
  severity: 'info' | 'warning' | 'error'; // Message importance
}

export interface UpdateMetadata {
  estimatedCompletion?: Date;    // Expected completion time
  agentsCompleted: number;       // Number of agents finished
  agentsTotal: number;           // Total number of agents
  currentPhase: string;          // Current processing phase
  errorDetails?: ErrorInfo;      // Error information if applicable
}

export interface ErrorInfo {
  code: string;                  // Error code
  details: string;               // Detailed error message
  recoverable: boolean;          // Whether error can be retried
  suggestedAction: string;       // User action recommendation
}

// ===== VALIDATION TYPES =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// ===== HELPER TYPES =====

export type ChatSessionStatus = ChatSession['status'];
export type ResearchResultStatus = ResearchResult['status'];
export type UserSessionStatus = UserSession['status'];

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

// ===== FORM TYPES =====

export interface CreateChatSessionRequest {
  title?: string;
  settings?: Partial<SessionSettings>;
  metadata?: Partial<SessionMetadata>;
}

export interface CreateResearchQueryRequest {
  content: string;
  type: QueryType;
  priority?: 'low' | 'medium' | 'high';
  attachments?: File[];
  parameters?: Partial<QueryParameters>;
}

export interface UpdateUserPreferencesRequest {
  preferences: Partial<UserPreferences>;
}

// ===== STATE MANAGEMENT TYPES =====

export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  currentQuery: ResearchQuery | null;
  queries: ResearchQuery[];
  responses: AgentResponse[];
  results: ResearchResult[];
  progressUpdates: ProgressUpdate[];
  isLoading: boolean;
  error: string | null;
}

export interface UserState {
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ===== CONNECTION TYPES =====

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  connectionId: string | null;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  error: string | null;
}

export interface SSEConnectionConfig {
  url: string;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatTimeout: number;
  headers?: Record<string, string>;
}

// Export default types for convenience
export type {
  // Core entities
  ChatSession as Session,
  ResearchQuery as Query,
  AgentResponse as AgentResp,
  ResearchResult as Result,
  ProgressUpdate as Update,
  // Common utility types
  ApiResponse as ApiResp,
  ValidationResult as Validation,
  PaginatedResponse as Paginated,
};