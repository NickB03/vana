/**
 * Skills System v2 - Type Definitions
 *
 * Core TypeScript types for the modular skills system that enhances AI chat
 * capabilities with specialized prompt engineering, dynamic context injection,
 * and executable actions.
 *
 * ## Architecture
 *
 * Skills provide:
 * - **Prompt Templates**: Structured prompts with placeholders for dynamic context
 * - **Context Providers**: Functions that inject runtime data (e.g., search history, artifacts)
 * - **Actions**: Executable operations triggered by AI or user intent
 * - **References**: Additional documentation loaded on-demand
 *
 * ## Key Concepts
 *
 * **SkillId**: Enum-like string union for type-safe skill identification
 * **SkillContext**: Runtime context (session, conversation, artifacts) passed to providers/actions
 * **ContextProvider**: Dynamic data injection via placeholder replacement
 * **SkillAction**: Executable operation with parameters and validation
 * **ResolvedSkill**: Skill with all placeholders replaced and references loaded
 *
 * @module skills/types
 * @since 2026-01-25 (Skills System v2)
 */

/**
 * Skill identifiers for type-safe skill lookup
 *
 * @remarks
 * These IDs map to skill definitions in the registry. Each ID corresponds to
 * a specialized capability (web search, code assistance, data visualization, research).
 *
 * @example
 * ```typescript
 * const skillId: SkillId = 'web-search';
 * const skill = getSkill(skillId);
 * ```
 */
export type SkillId = 'web-search' | 'code-assistant' | 'data-viz';

/**
 * Message role in conversation history
 *
 * @remarks
 * Represents the role of a message sender in the conversation.
 * - 'user': Message from the user
 * - 'assistant': Message from the AI assistant
 *
 * @example
 * ```typescript
 * const role: MessageRole = 'user';
 * ```
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Artifact type for interactive content
 *
 * @remarks
 * Represents the type of artifact that can be created or edited.
 * - 'react': React component with JSX
 * - 'html': Static HTML page
 * - 'image': Generated image (PNG/JPEG)
 *
 * @example
 * ```typescript
 * const artifactType: ArtifactType = 'react';
 * ```
 */
export type ArtifactType = 'react' | 'html' | 'image';

/**
 * Valid skill IDs (single source of truth)
 *
 * @remarks
 * This array defines all valid skill identifiers in the system.
 * Used for runtime validation and as the source for the SkillId type.
 *
 * **IMPORTANT**: When adding new skills:
 * 1. Add the ID to this array
 * 2. The SkillId type will automatically include it
 * 3. Update detector.ts classification prompt
 * 4. Add skill definition to registry.ts
 *
 * @example
 * ```typescript
 * // Check if string is valid skill ID
 * if (VALID_SKILL_IDS.includes(input)) {
 *   const skillId = input as SkillId;
 * }
 * ```
 */
export const VALID_SKILL_IDS = ['web-search', 'code-assistant', 'data-viz'] as const;

/**
 * Runtime type guard for SkillId validation
 *
 * @remarks
 * Type-safe way to check if a value is a valid SkillId at runtime.
 * Useful for validating user input, API responses, or database values.
 *
 * @param value - Value to check (typically unknown or string)
 * @returns True if value is a valid SkillId, with type narrowing
 *
 * @example
 * ```typescript
 * function getSkill(id: unknown): Skill | null {
 *   if (!isSkillId(id)) {
 *     console.error(`Invalid skill ID: ${id}`);
 *     return null;
 *   }
 *   // TypeScript knows id is SkillId here
 *   return SKILL_REGISTRY[id];
 * }
 * ```
 */
export function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && VALID_SKILL_IDS.includes(value as SkillId);
}

/**
 * Unique symbol for branding SkillContext type
 *
 * @remarks
 * This symbol is used to create a "branded" or "nominal" type that prevents
 * direct object literal construction. Only the `createSkillContext()` factory
 * can create valid SkillContext instances because only the factory has access
 * to add this brand marker.
 *
 * **Why branded types?**
 * TypeScript uses structural typing, so any object with matching properties
 * would satisfy the SkillContext interface. This brand ensures type safety
 * by requiring the object to have been created through the factory, which
 * performs validation and sanitization.
 *
 * @see https://egghead.io/blog/using-branded-types-in-typescript
 * @internal
 */
declare const SkillContextBrand: unique symbol;

/**
 * Type alias for the brand symbol type
 *
 * @remarks
 * Exported so the factory can use it to construct branded SkillContext objects.
 * This is an implementation detail and should not be used directly by consumers.
 *
 * @internal
 */
export type SkillContextBrandType = typeof SkillContextBrand;

/**
 * Runtime context passed to context providers and actions
 *
 * @remarks
 * Provides access to session state, conversation history, and current artifacts
 * for dynamic context injection and action execution.
 *
 * **IMPORTANT: Branded Type**
 * This type is "branded" using a unique symbol to enforce factory usage.
 * Direct object literal construction will cause TypeScript errors.
 *
 * **Security Note**: All user-provided data in context should be sanitized
 * before use in database queries or external API calls.
 *
 * **Required Usage**: Use the `createSkillContext()` factory function from
 * `factories.ts` to create validated and sanitized context objects:
 *
 * @example
 * ```typescript
 * import { createSkillContext } from './factories.ts';
 *
 * // ✅ REQUIRED: Use factory for automatic validation and sanitization
 * const context = createSkillContext({
 *   sessionId: 'abc123',
 *   conversationHistory: [
 *     { role: 'user', content: 'Hello' },
 *     { role: 'assistant', content: 'Hi!' }
 *   ],
 *   requestId: 'req-456',
 *   currentArtifact: {
 *     title: 'My Chart',
 *     type: 'react',
 *     content: 'export default function...'
 *   }
 * });
 *
 * // ❌ TypeScript ERROR: Direct construction is not allowed
 * const unsafeContext: SkillContext = {
 *   sessionId: 'abc',
 *   conversationHistory: []
 * }; // Error: Property '[SkillContextBrand]' is missing
 * ```
 */
export interface SkillContext {
  /**
   * Brand marker - only factory can provide this
   * @internal
   */
  readonly [SkillContextBrand]: true;
  /**
   * Unique chat session ID for database queries
   */
  readonly sessionId: string;

  /**
   * Recent conversation turns (user + assistant messages)
   *
   * @remarks
   * Typically limited to last 5-10 turns for context relevance and token efficiency.
   */
  readonly conversationHistory: ReadonlyArray<{
    readonly role: MessageRole;
    readonly content: string;
  }>;

  /**
   * Optional request ID for logging and debugging
   */
  readonly requestId?: string;

  /**
   * Current artifact being edited (if any)
   *
   * @remarks
   * Used by code-assistant and data-viz skills to provide artifact-aware context.
   */
  readonly currentArtifact?: {
    readonly title: string;
    readonly type: ArtifactType;
    readonly content: string;
  };
}

/**
 * Dynamic context provider for placeholder replacement
 *
 * @remarks
 * Context providers inject runtime data into skill prompts via placeholders
 * like `{{recent_searches}}` or `{{current_artifact_code}}`.
 *
 * **Performance Note**: Providers are called sequentially during skill resolution.
 * Avoid slow database queries or external API calls without caching.
 *
 * @example
 * ```typescript
 * const recentSearchesProvider: ContextProvider = {
 *   id: 'recent-searches',
 *   name: 'Recent Web Searches',
 *   placeholder: '{{recent_searches}}',
 *   provider: async (context) => {
 *     const searches = await fetchRecentSearches(context.sessionId);
 *     return searches.map(s => `- ${s.query}: ${s.summary}`).join('\n');
 *   }
 * };
 * ```
 */
export interface ContextProvider {
  /**
   * Unique provider ID (kebab-case)
   */
  readonly id: string;

  /**
   * Human-readable provider name
   */
  readonly name: string;

  /**
   * Placeholder string used in skill content (e.g., '{{recent_searches}}')
   *
   * @remarks
   * Must be unique within a skill. Use double curly braces for clarity.
   */
  readonly placeholder: string;

  /**
   * Async function that generates content for placeholder replacement
   *
   * @param context - Runtime context (session, conversation, artifacts)
   * @returns Resolved string to replace placeholder (empty string if no data)
   *
   * @throws May throw errors for database/network failures (handled by resolver)
   */
  provider: (context: SkillContext) => Promise<string>;
}

/**
 * Parameter definition for skill actions
 *
 * @remarks
 * Defines expected parameters for action execution. Runtime validation
 * should check types and required fields before calling action.execute().
 *
 * @example
 * ```typescript
 * const param: ActionParameter = {
 *   name: 'query',
 *   type: 'string',
 *   required: true,
 *   description: 'Search query (1-500 characters)'
 * };
 * ```
 */
export interface ActionParameter {
  /**
   * Parameter name (camelCase)
   */
  readonly name: string;

  /**
   * Expected type (primitive only for simplicity)
   */
  readonly type: 'string' | 'number' | 'boolean';

  /**
   * Whether parameter is required
   */
  readonly required: boolean;

  /**
   * Optional description for validation error messages
   */
  readonly description?: string;
}


// =============================================================================
// Type Helpers for Type-Safe Action Parameters
// =============================================================================

/**
 * Maps ActionParameter type strings to TypeScript types
 *
 * @remarks
 * Used by ExtractActionParams to convert schema definitions to actual types.
 *
 * @example
 * ```typescript
 * type StringType = ParameterTypeMap['string']; // string
 * type NumberType = ParameterTypeMap['number']; // number
 * ```
 */
export type ParameterTypeMap = {
  readonly string: string;
  readonly number: number;
  readonly boolean: boolean;
};

/**
 * Extracts TypeScript types from an ActionParameter array at compile time
 *
 * @remarks
 * This utility type creates a typed object from parameter definitions, ensuring
 * that the execute() function receives properly typed parameters instead of
 * `Record<string, unknown>`.
 *
 * **How it works:**
 * 1. Iterates over each parameter in the tuple using `T[number]`
 * 2. Creates a mapped type with parameter names as keys
 * 3. Looks up the TypeScript type from ParameterTypeMap based on `type` field
 * 4. Makes optional parameters have `| undefined` using conditional types
 *
 * @typeParam T - Readonly tuple of ActionParameter definitions (use `as const`)
 *
 * @example
 * ```typescript
 * // Define parameters with `as const` for literal types
 * const params = [
 *   { name: 'query', type: 'string', required: true },
 *   { name: 'limit', type: 'number', required: false },
 * ] as const;
 *
 * // Extracts to: { query: string; limit: number | undefined }
 * type Params = ExtractActionParams<typeof params>;
 * ```
 */
export type ExtractActionParams<T extends readonly ActionParameter[]> = {
  [P in T[number] as P['name']]: P extends { type: 'string'; required: true }
    ? string
    : P extends { type: 'string'; required: false }
      ? string | undefined
      : P extends { type: 'number'; required: true }
        ? number
        : P extends { type: 'number'; required: false }
          ? number | undefined
          : P extends { type: 'boolean'; required: true }
            ? boolean
            : P extends { type: 'boolean'; required: false }
              ? boolean | undefined
              : unknown;
};

/**
 * Action execution result with typed data payload
 *
 * @remarks
 * Standardized result type for all action executions. The generic parameter
 * allows actions to specify their exact return data type.
 *
 * @typeParam TData - Type of the data payload (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Success result with typed data
 * const success: ActionResult<SearchResult[]> = {
 *   success: true,
 *   data: [{ title: 'Result', url: 'https://...' }]
 * };
 *
 * // Error result
 * const error: ActionResult = {
 *   success: false,
 *   error: 'Search failed: rate limited'
 * };
 * ```
 */
export type ActionResult<TData = unknown> = {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: string;
};


/**
 * Helper function to define type-safe skill actions with proper type inference
 *
 * @remarks
 * TypeScript's `satisfies` operator doesn't infer generic type parameters,
 * so using `satisfies SkillAction` loses type information for parameters.
 * This helper function uses type inference to preserve the parameter types.
 *
 * **Why use this instead of `satisfies SkillAction`?**
 * - `satisfies` only checks compatibility, it doesn't infer generics
 * - This function infers the exact parameter types from `as const`
 * - Provides full autocomplete and type checking in the execute function
 *
 * @typeParam TParams - Inferred from the parameters array (use `as const`)
 * @typeParam TData - Inferred from the return type of execute
 *
 * @example
 * ```typescript
 * const searchAction = defineAction({
 *   id: 'search',
 *   name: 'Search',
 *   description: 'Search the web',
 *   parameters: [
 *     { name: 'query', type: 'string', required: true },
 *     { name: 'limit', type: 'number', required: false },
 *   ] as const,  // <-- Required for type inference
 *   execute: async (params, context) => {
 *     // params.query is `string`
 *     // params.limit is `number | undefined`
 *     // params.nonexistent would be a TypeScript error!
 *     return { success: true, data: { results: [] } };
 *   },
 * });
 * ```
 */
export function defineAction<
  const TParams extends readonly ActionParameter[],
  TData = unknown,
>(
  action: Omit<SkillAction<TParams, TData>, 'execute'> & {
    execute: (
      params: ExtractActionParams<TParams>,
      context: SkillContext,
    ) => Promise<ActionResult<TData>>;
  },
): SkillAction<TParams, TData> {
  return action;
}

/**
 * Executable skill action triggered by AI or user intent
 *
 * @typeParam TParams - Tuple of ActionParameter definitions (use `as const` for inference)
 * @typeParam TData - Type of the data payload returned by execute()
 *
 * @remarks
 * Actions provide executable operations beyond text generation (e.g., web search,
 * code formatting, data queries). Each action is isolated and returns a structured
 * result for error handling.
 *
 * **Type Safety**: Use `defineAction()` helper with `as const` on the parameters
 * array to enable compile-time type checking between parameter definitions and
 * the execute function. This catches parameter mismatches at compile time instead
 * of runtime.
 *
 * **Security Note**: Always validate parameters before execution. Never execute
 * arbitrary code or shell commands from user input.
 *
 * @example
 * ```typescript
 * // Type-safe action with compile-time parameter validation
 * // Use defineAction() helper for proper type inference
 * const webSearchAction = defineAction({
 *   id: 'web-search',
 *   name: 'Web Search',
 *   description: 'Search the web using Tavily API',
 *   parameters: [
 *     { name: 'query', type: 'string', required: true, description: 'Search query' },
 *     { name: 'maxResults', type: 'number', required: false }
 *   ] as const,  // <-- Required for type inference
 *   execute: async (params, context) => {
 *     // params.query is typed as `string` (required)
 *     // params.maxResults is typed as `number | undefined` (optional)
 *     // params.count would cause TypeScript error! (not in parameters)
 *     const results = await tavilySearch(params.query, params.maxResults);
 *     return { success: true, data: results };
 *   }
 * });
 *
 * // Backward compatible: plain SkillAction still works (params type defaults to unknown)
 * const legacyAction: SkillAction = {
 *   id: 'legacy',
 *   name: 'Legacy Action',
 *   description: 'Uses untyped params',
 *   parameters: [{ name: 'input', type: 'string', required: true }],
 *   execute: async (params, context) => {
 *     const input = params.input as string; // Manual cast still works
 *     return { success: true };
 *   }
 * };
 * ```
 */
export interface SkillAction<
  TParams extends readonly ActionParameter[] = readonly ActionParameter[],
  TData = unknown,
> {
  /**
   * Unique action ID (kebab-case)
   */
  readonly id: string;

  /**
   * Human-readable action name
   */
  readonly name: string;

  /**
   * Description of what the action does
   */
  readonly description: string;

  /**
   * Expected parameters for action execution
   *
   * @remarks
   * Use `as const` when defining parameters to enable type inference:
   * ```typescript
   * const params = [
   *   { name: 'query', type: 'string', required: true }
   * ] as const;
   * ```
   */
  readonly parameters: TParams;

  /**
   * Async function that executes the action
   *
   * @param params - Type-safe parameter values (inferred from parameters schema)
   * @param context - Runtime context (session, conversation, artifacts)
   * @returns Result object with success flag, optional data, and optional error
   *
   * @remarks
   * - **Always** return `{ success: false, error: string }` for failures
   * - **Never** throw errors from execute() - use structured error returns
   * - **Log** execution details for debugging (use createLogger from safe-error-handler.ts)
   *
   * @example
   * ```typescript
   * // Type-safe action definition
   * const searchAction = {
   *   parameters: [
   *     { name: 'query', type: 'string', required: true },
   *     { name: 'limit', type: 'number', required: false },
   *   ] as const,
   *   execute: async (params, context) => {
   *     // params.query is typed as string
   *     // params.limit is typed as number | undefined
   *     // params.count would be a TypeScript error!
   *     return { success: true, data: results };
   *   }
   * } satisfies SkillAction;
   * ```
   */
  execute: (
    params: ExtractActionParams<TParams>,
    context: SkillContext,
  ) => Promise<ActionResult<TData>>;
}

/**
 * Reference document for additional skill context
 *
 * @remarks
 * References provide supplementary documentation loaded on-demand
 * (e.g., API docs, code examples, best practices). Keep content concise
 * to avoid token bloat.
 *
 * @example
 * ```typescript
 * const reference: SkillReference = {
 *   id: 'recharts-examples',
 *   name: 'Recharts Chart Examples',
 *   content: '# Recharts Examples\n\n## Bar Chart\n```tsx\n...\n```'
 * };
 * ```
 */
export interface SkillReference {
  /**
   * Unique reference ID (kebab-case)
   */
  readonly id: string;

  /**
   * Human-readable reference name
   */
  readonly name: string;

  /**
   * Markdown content (keep under 2000 characters for token efficiency)
   */
  readonly content: string;
}

/**
 * Complete skill definition with prompt, providers, actions, and references
 *
 * @remarks
 * Skills are registered in the SKILL_REGISTRY and resolved at runtime
 * by the resolver to inject dynamic context and load references.
 *
 * **Design Principles**:
 * - **Modularity**: Each skill is self-contained (no cross-skill dependencies)
 * - **Composability**: Skills can be combined via multi-skill routing
 * - **Testability**: All components (providers, actions) are pure functions
 *
 * @example
 * ```typescript
 * const webSearchSkill: Skill = {
 *   id: 'web-search',
 *   displayName: 'Web Search',
 *   description: 'Search the web and synthesize results',
 *   content: 'You are a web search assistant...\n\n{{recent_searches}}',
 *   contextProviders: [recentSearchesProvider],
 *   actions: [webSearchAction],
 *   references: [tavilyApiReference]
 * };
 * ```
 */
export interface Skill {
  /**
   * Unique skill identifier (must match SkillId union)
   */
  readonly id: SkillId;

  /**
   * Human-readable skill name (e.g., "Web Search", "Code Assistant")
   */
  readonly displayName: string;

  /**
   * Brief description of skill capabilities
   */
  readonly description: string;

  /**
   * Skill prompt template with placeholders (e.g., '{{recent_searches}}')
   *
   * @remarks
   * Placeholders are replaced by context providers during resolution.
   * Use Markdown formatting for readability.
   */
  readonly content: string;

  /**
   * Optional context providers for dynamic placeholder replacement
   */
  readonly contextProviders?: readonly ContextProvider[];

  /**
   * Optional actions that can be executed by the skill
   */
  readonly actions?: readonly SkillAction[];

  /**
   * Optional reference documents loaded on-demand
   */
  readonly references?: readonly SkillReference[];
}

/**
 * Resolved skill with placeholders replaced and references loaded
 *
 * @remarks
 * Created by the resolver after:
 * 1. Fetching skill from registry
 * 2. Running all context providers to replace placeholders
 * 3. Loading reference content (if any)
 *
 * This is the final form passed to the AI chat endpoint.
 *
 * @example
 * ```typescript
 * const resolved: ResolvedSkill = {
 *   skill: webSearchSkill,
 *   content: 'You are a web search assistant...\n\nRecent searches:\n- query1: result1',
 *   loadedReferences: ['tavily-api-reference']
 * };
 * ```
 */
export interface ResolvedSkill {
  /**
   * Original skill definition
   */
  readonly skill: Skill;

  /**
   * Resolved content with all placeholders replaced by provider outputs
   *
   * @remarks
   * If a context provider fails, its placeholder is replaced with an empty string
   * to prevent breaking the prompt.
   */
  readonly content: string;

  /**
   * List of reference IDs that were successfully loaded
   *
   * @remarks
   * Used for debugging and logging. Empty array if no references loaded.
   */
  readonly loadedReferences: readonly string[];
}
