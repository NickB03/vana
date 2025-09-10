# Data Model: Frontend Development Continuation

**Date**: 2025-09-09  
**Status**: Complete  
**Dependencies**: research.md findings

## Core Entities

### 1. Chat Session
**Purpose**: Represents a complete research conversation with metadata and state management.

**Fields**:
```typescript
interface ChatSession {
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

interface SessionSettings {
  theme: 'light' | 'dark' | 'system';     // Theme preference
  autoScroll: boolean;                     // Auto-scroll to new messages
  notifications: boolean;                  // Enable notification sounds
  streamingEnabled: boolean;               // Enable real-time streaming
}

interface SessionMetadata {
  userAgent: string;                       // Browser/device information
  lastIpAddress: string;                   // Security tracking
  researchContext?: string;                // Domain/topic context
  agentPreferences?: AgentConfiguration[]; // Preferred agent settings
}
```

**Relationships**:
- One-to-many with Research Query
- One-to-many with Agent Response  
- Many-to-one with User Session
- One-to-many with Progress Update

**Validation Rules**:
- `id` must be valid UUID v4
- `title` length: 3-100 characters
- `userId` must reference existing authenticated user
- `status` transitions: active → archived → deleted (no reversal)
- `messageCount` must be non-negative integer

**State Transitions**:
```
active → archived: User archives session or auto-archive after 30 days inactive
archived → deleted: User deletion or retention policy (365 days)
deleted: Permanent removal, cannot be reversed
```

### 2. Research Query
**Purpose**: User's input question or prompt submitted to the multi-agent research system.

**Fields**:
```typescript
interface ResearchQuery {
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

type QueryType = 
  | 'research'          // General research question
  | 'analysis'          // Data analysis request
  | 'comparison'        // Comparative analysis
  | 'summarization'     // Content summarization
  | 'fact-check'        // Fact verification
  | 'creative';         // Creative content generation

interface QueryAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;                  // Bytes
  url: string;                   // Storage URL
  metadata: Record<string, any>;
}

interface QueryParameters {
  maxDuration: number;           // Maximum processing time (seconds)
  agentSelection: string[];      // Specific agents to use
  outputFormat: 'structured' | 'narrative' | 'bullet-points';
  detailLevel: 'brief' | 'detailed' | 'comprehensive';
  sourcesRequired: boolean;      // Whether citations needed
}
```

**Relationships**:
- Many-to-one with Chat Session
- One-to-many with Agent Response
- One-to-many with Progress Update
- One-to-one with Research Result

**Validation Rules**:
- `content` length: 10-5000 characters
- `sessionId` must reference existing active session
- `type` must be valid QueryType enum value
- `attachments` max 10 files, 100MB total
- `estimatedDuration` max 300 seconds (5 minutes)

### 3. Agent Response  
**Purpose**: Individual responses from specific AI agents during the research process.

**Fields**:
```typescript
interface AgentResponse {
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

type AgentType = 
  | 'team_leader'        // Coordinates research process
  | 'plan_generator'     // Creates research strategy  
  | 'section_planner'    // Plans report sections
  | 'section_researcher' // Researches specific sections
  | 'enhanced_search'    // Performs web searches
  | 'research_evaluator' // Evaluates research quality
  | 'escalation_checker' // Checks for escalation needs
  | 'report_writer';     // Synthesizes final report

type ResponseStatus = 
  | 'processing'    // Agent is working
  | 'completed'     // Response finished
  | 'failed'        // Processing failed
  | 'timeout'       // Processing timed out
  | 'cancelled';    // User cancelled

interface ResponseSource {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  relevanceScore: number;        // 0-1 relevance rating
  credibilityScore: number;      // 0-1 credibility rating
  accessedAt: Date;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;                  // USD cost estimate
}

interface AgentMetadata {
  model: string;                 // AI model used
  temperature: number;           // Generation temperature
  maxTokens: number;            // Token limit
  customInstructions?: string;   // Agent-specific instructions
}
```

**Relationships**:
- Many-to-one with Research Query
- Many-to-one with Chat Session (through query)
- One-to-many with Progress Update

**Validation Rules**:
- `queryId` must reference existing query
- `agentId` must match registered agent
- `confidence` must be 0-1 range
- `content` max length: 50,000 characters
- `processingTimeMs` must be positive
- `sources` max 50 references per response

### 4. Research Result
**Purpose**: Final compiled report containing all agent findings and analysis.

**Fields**:
```typescript
interface ResearchResult {
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

interface ResultContent {
  sections: ResultSection[];     // Organized content sections
  keyFindings: string[];        // Important discoveries
  recommendations: string[];     // Actionable recommendations
  limitations: string[];        // Research limitations noted
  methodology: string;          // Research approach used
}

interface ResultSection {
  id: string;
  title: string;
  content: string;
  order: number;                // Display order
  agentContributions: string[]; // Contributing agent IDs
  confidence: number;           // Section confidence (0-1)
}

interface QualityMetrics {
  overallScore: number;         // 0-1 quality rating
  completeness: number;         // How complete the research is
  accuracy: number;             // Fact-checking score
  relevance: number;           // Query relevance score
  sourceQuality: number;       // Citation quality score
  coherence: number;           // Content organization score
}

interface Citation {
  id: string;
  url: string;
  title: string;
  authors: string[];
  publishDate?: Date;
  accessDate: Date;
  excerpt: string;
  usageContext: string;        // How citation was used
}

interface ResultFormat {
  structure: 'academic' | 'business' | 'casual' | 'technical';
  includeCharts: boolean;
  includeTables: boolean;
  citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
}
```

**Relationships**:
- One-to-one with Research Query
- Many-to-many with Agent Response (through citations)
- Many-to-one with Chat Session (through query)

**Validation Rules**:
- `queryId` must reference completed query
- `summary` length: 100-1000 characters  
- `content.sections` must have at least 1 section
- `quality` scores must be 0-1 range
- `wordCount` must match actual content
- `citations` must reference valid sources

### 5. User Session
**Purpose**: Authentication and preference data for personalized user experience.

**Fields**:
```typescript
interface UserSession {
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

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;              // ISO language code
  timezone: string;              // IANA timezone
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

interface NotificationSettings {
  email: boolean;
  browser: boolean;
  sound: boolean;
  researchComplete: boolean;
  systemUpdates: boolean;
}

interface PrivacySettings {
  shareUsageData: boolean;
  personalizeExperience: boolean;
  storeSearchHistory: boolean;
  allowAnalytics: boolean;
}

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  validUntil: Date;
  queriesUsed: number;
  queriesLimit: number;
  features: string[];
}
```

**Relationships**:
- One-to-many with Chat Session
- Managed by existing FastAPI authentication system

**Validation Rules**:
- `email` must be valid email format
- `userId` must be unique
- `displayName` length: 1-50 characters
- `language` must be supported locale
- `timezone` must be valid IANA timezone

### 6. Progress Update
**Purpose**: Real-time status information about ongoing research operations.

**Fields**:
```typescript
interface ProgressUpdate {
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

type UpdateType = 
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

interface UpdateMetadata {
  estimatedCompletion?: Date;    // Expected completion time
  agentsCompleted: number;       // Number of agents finished
  agentsTotal: number;           // Total number of agents
  currentPhase: string;          // Current processing phase
  errorDetails?: ErrorInfo;      // Error information if applicable
}

interface ErrorInfo {
  code: string;                  // Error code
  details: string;               // Detailed error message
  recoverable: boolean;          // Whether error can be retried
  suggestedAction: string;       // User action recommendation
}
```

**Relationships**:
- Many-to-one with Research Query
- Many-to-one with Agent Response (optional)
- Many-to-one with Chat Session (through query)

**Validation Rules**:
- `queryId` must reference existing query
- `progress` must be 0-100 integer
- `message` max length: 500 characters
- `type` must be valid UpdateType
- `timestamp` must be chronologically ordered

## Data Relationships Overview

```
User Session (1) ←→ (∞) Chat Session (1) ←→ (∞) Research Query
                                                      ↓ (1)
Research Query (1) ←→ (∞) Agent Response      Research Result (1)
      ↓ (1)                    ↓ (1)              
Progress Update (∞)      Progress Update (∞)
```

## Storage Strategy

### PostgreSQL (Hot Data - 30 days)
- Active chat sessions
- Recent queries and responses  
- User sessions and preferences
- Progress updates for active queries
- Research results for recent queries

### Google Cloud Storage (Cold Data - 365+ days)
- Archived chat sessions
- Historical research results
- Large attachments and media files
- Backup copies of deleted sessions

### Redis Cache (Ephemeral Data)
- Active SSE connections
- Real-time progress updates
- Session tokens and auth cache
- Rate limiting counters

## Performance Considerations

### Indexing Strategy
```sql
-- Primary performance indexes
CREATE INDEX idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_research_queries_session ON research_queries(session_id, created_at DESC);
CREATE INDEX idx_agent_responses_query ON agent_responses(query_id, created_at);
CREATE INDEX idx_progress_updates_query_time ON progress_updates(query_id, timestamp DESC);

-- Full-text search indexes
CREATE INDEX idx_research_results_content ON research_results USING gin(to_tsvector('english', content));
CREATE INDEX idx_chat_sessions_title ON chat_sessions USING gin(to_tsvector('english', title));
```

### Partitioning Strategy
- Partition `progress_updates` by month (high volume, time-series data)
- Partition `agent_responses` by quarter (large content, archival pattern)
- Keep `chat_sessions` and `research_queries` unpartitioned (relatively small, frequently joined)

This data model supports the complete frontend development requirements while leveraging existing backend infrastructure and providing clear paths for scalability and performance optimization.