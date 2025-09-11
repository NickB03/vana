/**
 * Zod Validation Schemas for Backend API Types
 * 
 * Comprehensive Zod schemas that EXACTLY match backend Pydantic models
 * Provides runtime validation and type coercion for API responses
 * 
 * This file contains:
 * - Zod schemas for all backend Pydantic models
 * - Validation utilities with error handling
 * - Schema composition for complex types
 * - Type inference helpers
 */

import { z } from 'zod';

// ============================================================================
// Utility Schemas
// ============================================================================

const ISODateStringSchema = z.string();
const EmailSchema = z.string().email();
const NonEmptyStringSchema = z.string().min(1);
const PositiveNumberSchema = z.number().nonnegative();
const OptionalStringSchema = z.string().nullable().optional();
const OptionalNumberSchema = z.number().nullable().optional();
const OptionalBooleanSchema = z.boolean().nullable().optional();

// ============================================================================
// Status Enum Schemas
// ============================================================================

export const ResearchStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed']);
export const SessionStatusSchema = z.enum(['active', 'paused', 'completed', 'archived']);
export const AgentStatusTypeSchema = z.enum(['active', 'idle', 'processing', 'error']);
export const TeamStatusTypeSchema = z.enum(['initializing', 'active', 'paused', 'completed', 'error']);
export const HealthStatusTypeSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export const SubscriptionTierSchema = z.enum(['free', 'pro', 'enterprise']);
export const TokenTypeSchema = z.literal('bearer');

// ============================================================================
// Core Research Model Schemas (matching app/models.py)
// ============================================================================

export const ResearchRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  session_id: OptionalStringSchema,
  user_id: OptionalStringSchema,
  preferences: z.record(z.string(), z.any()).nullable().optional(),
});

export const ResearchResponseSchema = z.object({
  session_id: NonEmptyStringSchema,
  status: z.string(),
  message: z.string(),
  progress: z.number().min(0).max(100).optional().nullable(),
  data: z.record(z.string(), z.any()).nullable().optional(),
  timestamp: ISODateStringSchema,
});

export const SessionInfoSchema = z.object({
  session_id: NonEmptyStringSchema,
  user_id: OptionalStringSchema,
  created_at: ISODateStringSchema,
  last_active: ISODateStringSchema,
  status: z.string(),
  query: OptionalStringSchema,
  progress: PositiveNumberSchema,
  results: z.record(z.string(), z.any()).optional().nullable(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional().nullable(),
  timestamp: ISODateStringSchema,
});

// ============================================================================
// Environment and System Model Schemas
// ============================================================================

export const EnvironmentInfoSchema = z.object({
  current: z.string(),
  source: z.string(),
  migration_complete: OptionalBooleanSchema,
  phase: OptionalStringSchema,
  conflicts: z.array(z.string()).optional().nullable(),
});

export const SystemMetricsSchema = z.object({
  memory: z.record(z.string(), z.any()).optional().nullable(),
  disk: z.record(z.string(), z.any()).optional().nullable(),
  cpu_percent: OptionalNumberSchema,
  load_average: z.array(z.number()).length(3).nullable().optional(),
  error: OptionalStringSchema,
});

export const DependencyStatusSchema = z.object({
  google_api_configured: z.boolean(),
  session_storage: z.boolean(),
  cloud_logging: z.boolean(),
  project_id: z.string(),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.union([z.string(), EnvironmentInfoSchema]),
  session_storage_enabled: OptionalBooleanSchema,
  session_storage_uri: OptionalStringSchema,
  session_storage_bucket: OptionalStringSchema,
  system_metrics: SystemMetricsSchema.optional().nullable(),
  dependencies: DependencyStatusSchema.optional().nullable(),
  response_time_ms: OptionalNumberSchema,
  active_chat_tasks: OptionalNumberSchema,
  uptime_check: OptionalStringSchema,
  uptime: OptionalNumberSchema,
});

// ============================================================================
// Agent Network Model Schemas
// ============================================================================

export const AgentStatusSchema = z.object({
  agent_id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  status: z.string(),
  task: OptionalStringSchema,
  progress: PositiveNumberSchema,
  last_update: ISODateStringSchema,
});

export const TeamStatusSchema = z.object({
  session_id: NonEmptyStringSchema,
  team_status: z.string(),
  agents: z.array(AgentStatusSchema),
  progress: PositiveNumberSchema,
  current_phase: OptionalStringSchema,
  estimated_completion: ISODateStringSchema.optional().nullable(),
});

// ============================================================================
// Authentication Model Schemas (app/models.py)
// ============================================================================

export const AuthTokenSchema = z.object({
  access_token: NonEmptyStringSchema,
  token_type: z.string(),
  expires_in: z.number().positive(),
  refresh_token: OptionalStringSchema,
});

export const UserProfileSchema = z.object({
  user_id: NonEmptyStringSchema,
  username: NonEmptyStringSchema,
  email: OptionalStringSchema,
  created_at: ISODateStringSchema,
  preferences: z.record(z.string(), z.any()),
  subscription_tier: z.string(),
});

// ============================================================================
// Authentication Schema Models (app/auth/schemas.py)
// ============================================================================

export const PermissionBaseSchema = z.object({
  name: NonEmptyStringSchema,
  description: OptionalStringSchema,
  resource: NonEmptyStringSchema,
  action: NonEmptyStringSchema,
});

export const PermissionSchema = PermissionBaseSchema.extend({
  id: z.number().positive(),
  created_at: ISODateStringSchema,
});

export const RoleBaseSchema = z.object({
  name: NonEmptyStringSchema,
  description: OptionalStringSchema,
  is_active: z.boolean(),
});

export const RoleCreateSchema = RoleBaseSchema.extend({
  permission_ids: z.array(z.number().positive()).optional().nullable(),
});

export const RoleUpdateSchema = z.object({
  name: OptionalStringSchema,
  description: OptionalStringSchema,
  is_active: OptionalBooleanSchema,
  permission_ids: z.array(z.number().positive()).optional().nullable(),
});

export const RoleSchema = RoleBaseSchema.extend({
  id: z.number().positive(),
  created_at: ISODateStringSchema,
  permissions: z.array(PermissionSchema),
});

export const UserBaseSchema = z.object({
  email: EmailSchema,
  username: z.string().min(3).max(50),
  first_name: z.string().max(50).optional().nullable(),
  last_name: z.string().max(50).optional().nullable(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
});

export const UserCreateSchema = UserBaseSchema.extend({
  password: z.string().min(8),
});

export const UserUpdateSchema = z.object({
  email: EmailSchema.optional().nullable(),
  username: z.string().min(3).max(50).optional().nullable(),
  first_name: z.string().max(50).optional().nullable(),
  last_name: z.string().max(50).optional().nullable(),
  password: z.string().min(8).optional().nullable(),
  role_ids: z.array(z.number().positive()).optional().nullable(),
});

export const UserResponseSchema = UserBaseSchema.extend({
  id: z.number().positive(),
  full_name: NonEmptyStringSchema,
  is_superuser: z.boolean(),
  google_cloud_identity: OptionalStringSchema,
  last_login: ISODateStringSchema.optional().nullable(),
  created_at: ISODateStringSchema,
  updated_at: ISODateStringSchema,
  roles: z.array(RoleSchema),
});

export const UserLoginSchema = z.object({
  username: NonEmptyStringSchema, // Username or email
  password: NonEmptyStringSchema,
});

export const TokenSchema = z.object({
  access_token: NonEmptyStringSchema,
  refresh_token: NonEmptyStringSchema,
  token_type: TokenTypeSchema,
  expires_in: z.number().positive(),
});

export const TokenDataSchema = z.object({
  user_id: z.number().positive().optional().nullable(),
  username: OptionalStringSchema,
  email: OptionalStringSchema,
  scopes: z.array(z.string()),
});

export const RefreshTokenRequestSchema = z.object({
  refresh_token: NonEmptyStringSchema,
});

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export const PasswordResetSchema = z.object({
  token: NonEmptyStringSchema,
  new_password: z.string().min(8),
});

export const ChangePasswordSchema = z.object({
  current_password: NonEmptyStringSchema,
  new_password: z.string().min(8),
});

export const GoogleCloudIdentitySchema = z.object({
  id_token: NonEmptyStringSchema,
  access_token: OptionalStringSchema,
});

export const ApiKeyCreateSchema = z.object({
  name: NonEmptyStringSchema,
  scopes: z.array(z.string()),
  expires_in_days: z.number().positive().optional().nullable(),
});

export const ApiKeyResponseSchema = z.object({
  id: z.number().positive(),
  name: NonEmptyStringSchema,
  key: NonEmptyStringSchema, // Only shown once
  scopes: z.array(z.string()),
  expires_at: ISODateStringSchema.optional().nullable(),
  created_at: ISODateStringSchema,
});

export const OAuth2ErrorResponseSchema = z.object({
  error: NonEmptyStringSchema,
  error_description: OptionalStringSchema,
  error_uri: OptionalStringSchema,
});

export const OAuth2TokenRequestSchema = z.object({
  grant_type: NonEmptyStringSchema,
  username: NonEmptyStringSchema,
  password: NonEmptyStringSchema,
  scope: OptionalStringSchema,
});

export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  tokens: TokenSchema,
});

export const GoogleOAuthCallbackRequestSchema = z.object({
  code: NonEmptyStringSchema,
  state: NonEmptyStringSchema,
});

// ============================================================================
// Utility Model Schemas (app/utils/typing.py)
// ============================================================================

export const ChatRequestSchema = z.object({
  message: z.any(), // Content type from Google GenAI
  events: z.array(z.any()), // Event array from Google ADK
  user_id: NonEmptyStringSchema,
  session_id: NonEmptyStringSchema,
});

export const FeedbackSchema = z.object({
  score: z.number(),
  text: OptionalStringSchema,
  invocation_id: NonEmptyStringSchema,
  log_type: z.literal('feedback'),
  service_name: z.literal('vana'),
  user_id: z.string(),
});

// ============================================================================
// Phoenix Debug Endpoint Schema
// ============================================================================

export const PhoenixDebugResponseSchema = z.object({
  access_code: z.string(),
  service_info: z.object({
    pid: z.number(),
    memory_rss: z.number(),
    memory_vms: z.number(),
    cpu_percent: z.number(),
    create_time: z.number(),
    num_threads: z.number(),
  }),
  system_diagnostics: z.object({
    cpu_count: z.number(),
    boot_time: z.number(),
    disk_io: z.record(z.string(), z.any()).optional().nullable(),
    network_io: z.record(z.string(), z.any()).optional().nullable(),
  }),
  application_state: z.object({
    chat_tasks_count: z.number(),
    active_connections: z.string(),
    session_storage_uri: OptionalStringSchema,
    bucket_name: OptionalStringSchema,
    project_id: NonEmptyStringSchema,
  }),
  environment_secrets: z.object({
    google_api_configured: z.boolean(),
    cloud_logging_enabled: z.boolean(),
    node_env: z.string(),
    ci_environment: z.boolean(),
  }),
  timestamp: ISODateStringSchema,
  debug_session: NonEmptyStringSchema,
});

// ============================================================================
// Error Schemas
// ============================================================================

export const BackendValidationErrorSchema = z.object({
  field: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  code: NonEmptyStringSchema,
});

export const BackendApiErrorSchema = z.object({
  detail: NonEmptyStringSchema,
  status_code: z.number().optional(),
  error_type: OptionalStringSchema,
  field_errors: z.record(z.string(), z.array(z.string())).optional(),
  validation_errors: z.array(BackendValidationErrorSchema).optional(),
  timestamp: ISODateStringSchema.optional(),
  request_id: OptionalStringSchema,
});

// ============================================================================
// Response Wrapper Schemas
// ============================================================================

export const BackendApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    status: z.number(),
    headers: z.record(z.string(), z.string()),
    timestamp: ISODateStringSchema,
  });

export const BackendPaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().nonnegative(),
    page: z.number().positive(),
    size: z.number().positive(),
    pages: z.number().nonnegative(),
  });

// ============================================================================
// Validation Utility Functions
// ============================================================================

/**
 * Creates a safe parser that returns parsed data or null
 */
export function createSafeParser<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T | null => {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  };
}

/**
 * Creates a strict parser that throws on validation errors
 */
export function createStrictParser<T>(schema: z.ZodSchema<T>, errorPrefix = 'Validation failed') {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`${errorPrefix}: ${errors.join(', ')}`);
    }
    return result.data;
  };
}

/**
 * Validates API response with comprehensive error handling
 */
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint?: string
): T {
  // First check if it's an API error
  const errorResult = BackendApiErrorSchema.safeParse(data);
  if (errorResult.success) {
    throw new Error(`API Error${endpoint ? ` from ${endpoint}` : ''}: ${errorResult.data.detail}`);
  }

  // Then validate the expected schema
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid response${endpoint ? ` from ${endpoint}` : ''}: ${errors.join(', ')}`);
  }

  return result.data;
}

/**
 * Creates a type-safe API response validator
 */
export function createApiValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown, endpoint?: string): T => {
    return validateApiResponse(data, schema, endpoint);
  };
}

// ============================================================================
// Pre-built Validators for Common Use Cases
// ============================================================================

export const validateHealthResponse = createApiValidator(HealthResponseSchema);
export const validateResearchResponse = createApiValidator(ResearchResponseSchema);
export const validateUserResponse = createApiValidator(UserResponseSchema);
export const validateAuthResponse = createApiValidator(AuthResponseSchema);
export const validateTokenResponse = createApiValidator(TokenSchema);
export const validateAgentStatus = createApiValidator(AgentStatusSchema);
export const validateTeamStatus = createApiValidator(TeamStatusSchema);
export const validateSessionInfo = createApiValidator(SessionInfoSchema);
export const validatePhoenixDebug = createApiValidator(PhoenixDebugResponseSchema);

// ============================================================================
// Schema Collections for Easy Import
// ============================================================================

export const CoreSchemas = {
  ResearchRequest: ResearchRequestSchema,
  ResearchResponse: ResearchResponseSchema,
  SessionInfo: SessionInfoSchema,
  ErrorResponse: ErrorResponseSchema,
} as const;

export const AuthSchemas = {
  UserProfile: UserProfileSchema,
  UserResponse: UserResponseSchema,
  AuthToken: AuthTokenSchema,
  Token: TokenSchema,
  UserLogin: UserLoginSchema,
  AuthResponse: AuthResponseSchema,
} as const;

export const SystemSchemas = {
  HealthResponse: HealthResponseSchema,
  SystemMetrics: SystemMetricsSchema,
  DependencyStatus: DependencyStatusSchema,
  EnvironmentInfo: EnvironmentInfoSchema,
} as const;

export const AgentSchemas = {
  AgentStatus: AgentStatusSchema,
  TeamStatus: TeamStatusSchema,
} as const;

export const ErrorSchemas = {
  ErrorResponse: ErrorResponseSchema,
  BackendApiError: BackendApiErrorSchema,
  BackendValidationError: BackendValidationErrorSchema,
} as const;

export const AllSchemas = {
  ...CoreSchemas,
  ...AuthSchemas,
  ...SystemSchemas,
  ...AgentSchemas,
  ...ErrorSchemas,
  PhoenixDebug: PhoenixDebugResponseSchema,
  Feedback: FeedbackSchema,
  ChatRequest: ChatRequestSchema,
} as const;

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type InferSchemaType<T extends z.ZodType> = z.infer<T>;

// Export commonly used inferred types
export type ValidatedHealthResponse = InferSchemaType<typeof HealthResponseSchema>;
export type ValidatedUserResponse = InferSchemaType<typeof UserResponseSchema>;
export type ValidatedAuthResponse = InferSchemaType<typeof AuthResponseSchema>;
export type ValidatedResearchResponse = InferSchemaType<typeof ResearchResponseSchema>;
export type ValidatedAgentStatus = InferSchemaType<typeof AgentStatusSchema>;
export type ValidatedTeamStatus = InferSchemaType<typeof TeamStatusSchema>;

// ============================================================================
// Default Export
// ============================================================================

export default {
  schemas: AllSchemas,
  validators: {
    validateHealthResponse,
    validateResearchResponse,
    validateUserResponse,
    validateAuthResponse,
    validateTokenResponse,
    validateAgentStatus,
    validateTeamStatus,
    validateSessionInfo,
    validatePhoenixDebug,
  },
  utils: {
    createSafeParser,
    createStrictParser,
    validateApiResponse,
    createApiValidator,
  },
} as const;