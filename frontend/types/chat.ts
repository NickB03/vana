/**
 * Chat Interface Types
 * Generated from data-model.md specifications
 * 
 * These types define the complete data model for the Vana research platform
 * frontend, ensuring type safety across all chat and research components.
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * Chat Session - Represents a complete research conversation
 */
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

/**
 * Research Query - User's input question or prompt
 */
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

export type QueryType = 
  | 'research'          // General research question
  | 'analysis'          // Data analysis request
  | 'comparison'        // Comparative analysis
  | 'summarization'     // Content summarization
  | 'fact-check'        // Fact verification
  | 'creative';         // Creative content generation

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

/**
 * Agent Response - Individual responses from AI agents
 */
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

export interface AgentConfiguration {
  agentType: AgentType;
  enabled: boolean;
  priority: number;
  customSettings?: Record<string, any>;
}

/**
 * Research Result - Final compiled report
 */
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

/**
 * User Session - Authentication and preference data
 */
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

/**
 * Progress Update - Real-time status information
 */
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

// =============================================================================
// SSE EVENT TYPES (from sse-events.yaml)
// =============================================================================

/**
 * SSE Event base interface
 */
export interface SSEEvent<T = any> {
  event: string;
  data: T;
}

/**
 * Connection Events
 */
export interface ConnectionEstablishedEvent {
  connectionId: string;
  timestamp: string;
  serverVersion: string;
  supportedEvents: string[];
  heartbeatInterval: number;
}

export interface HeartbeatEvent {
  timestamp: string;
  connectionId: string;
  activeQueries: number;
  serverLoad: number;
}

export interface ConnectionErrorEvent {
  timestamp: string;
  errorType: 'authentication_failed' | 'rate_limit_exceeded' | 'server_overload' | 'protocol_error';
  message: string;
  reconnectAllowed: boolean;
  retryAfter: number;
}

/**
 * Query Processing Events
 */
export interface QueryReceivedEvent {
  queryId: string;
  timestamp: string;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
}

export interface ProcessingStartedEvent {
  queryId: string;
  timestamp: string;
  totalAgents: number;
  phase: 'planning' | 'research' | 'evaluation' | 'synthesis';
}

export interface AgentStartedEvent {
  queryId: string;
  agentId: string;
  agentType: AgentType;
  timestamp: string;
  estimatedDuration: number;
  task: string;
}

export interface AgentProgressEvent {
  queryId: string;
  agentId: string;
  progress: number;
  timestamp: string;
  currentTask: string;
  partialResults?: string;
}

export interface AgentCompletedEvent {
  queryId: string;
  agentId: string;
  timestamp: string;
  success: boolean;
  processingTimeMs: number;
  confidence: number;
  resultSummary: string;
  tokensUsed: number;
}

export interface PartialResultEvent {
  queryId: string;
  timestamp: string;
  content: string;
  section: string;
  agentId: string;
  confidence: number;
  sources: Array<{
    url: string;
    title: string;
    relevance: number;
  }>;
}

export interface QualityCheckEvent {
  queryId: string;
  timestamp: string;
  qualityScore: number;
  phase: 'completeness_check' | 'accuracy_validation' | 'source_verification' | 'coherence_review';
  findings: Array<{
    type: 'warning' | 'error' | 'improvement';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendedActions: string[];
}

export interface ResultGeneratedEvent {
  queryId: string;
  resultId: string;
  timestamp: string;
  wordCount: number;
  readingTimeMinutes: number;
  qualityScore: number;
  sectionsCount: number;
  citationsCount: number;
  summary: string;
}

export interface ProcessingCompleteEvent {
  queryId: string;
  resultId: string;
  timestamp: string;
  totalDurationMs: number;
  agentsCompleted: number;
  agentsTotal: number;
  finalQualityScore: number;
  tokensTotal: number;
  costEstimate: number;
}

/**
 * Error Events
 */
export interface ErrorOccurredEvent {
  queryId: string;
  timestamp: string;
  errorType: 'agent_error' | 'timeout_error' | 'validation_error' | 'system_error' | 'quota_exceeded';
  message: string;
  errorCode: string;
  agentId?: string;
  recoverable: boolean;
  suggestedAction: string;
  retryAfter: number;
  details: Record<string, any>;
}

export interface TimeoutWarningEvent {
  queryId: string;
  timestamp: string;
  currentDurationMs: number;
  estimatedRemainingMs: number;
  reason: string;
  agentsStillProcessing: Array<{
    agentId: string;
    agentType: string;
    currentTask: string;
  }>;
}

export interface UserCancelledEvent {
  queryId: string;
  timestamp: string;
  cancelledBy: string;
  reason?: string;
  partialResultsAvailable: boolean;
  agentsStopped: number;
  processingTimeMs: number;
}

// =============================================================================
// COMPONENT STATE TYPES
// =============================================================================

/**
 * Chat interface state management
 */
export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  activeQuery: ResearchQuery | null;
  messages: ChatMessage[];
  isProcessing: boolean;
  connectionStatus: SSEConnectionStatus;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'agent' | 'result';
  content: string;
  timestamp: Date;
  queryId?: string;
  agentId?: string;
  agentType?: AgentType;
  metadata?: Record<string, any>;
}

export type SSEConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SessionCreateRequest {
  title?: string;
  settings?: Partial<SessionSettings>;
}

export interface QuerySubmitRequest {
  sessionId: string;
  content: string;
  type?: QueryType;
  parameters?: Partial<QueryParameters>;
  attachments?: QueryAttachment[];
}

/**
 * Authentication types
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserSession | null;
  token: string | null;
  expiresAt: Date | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserSession;
  expiresIn: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic pagination response
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Form validation types
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Loading states for UI components
 */
export type LoadingState = 
  | 'idle'
  | 'loading'
  | 'success'
  | 'error';

// =============================================================================
// EVENT HANDLERS
// =============================================================================

export type SSEEventHandler<T = any> = (event: SSEEvent<T>) => void;

export interface SSEEventHandlers {
  onConnectionEstablished?: SSEEventHandler<ConnectionEstablishedEvent>;
  onHeartbeat?: SSEEventHandler<HeartbeatEvent>;
  onConnectionError?: SSEEventHandler<ConnectionErrorEvent>;
  onQueryReceived?: SSEEventHandler<QueryReceivedEvent>;
  onProcessingStarted?: SSEEventHandler<ProcessingStartedEvent>;
  onAgentStarted?: SSEEventHandler<AgentStartedEvent>;
  onAgentProgress?: SSEEventHandler<AgentProgressEvent>;
  onAgentCompleted?: SSEEventHandler<AgentCompletedEvent>;
  onPartialResult?: SSEEventHandler<PartialResultEvent>;
  onQualityCheck?: SSEEventHandler<QualityCheckEvent>;
  onResultGenerated?: SSEEventHandler<ResultGeneratedEvent>;
  onProcessingComplete?: SSEEventHandler<ProcessingCompleteEvent>;
  onErrorOccurred?: SSEEventHandler<ErrorOccurredEvent>;
  onTimeoutWarning?: SSEEventHandler<TimeoutWarningEvent>;
  onUserCancelled?: SSEEventHandler<UserCancelledEvent>;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface SSEConfig {
  url: string;
  reconnect: boolean;
  maxRetries: number;
  retryDelay: number;
  heartbeatTimeout: number;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}