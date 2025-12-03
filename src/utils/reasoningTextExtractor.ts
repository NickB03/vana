/**
 * Reasoning Text Extractor
 *
 * Extracts clean, semantic status updates from raw LLM reasoning text.
 * Produces ticker-friendly text like "Analyzing database schema" instead of
 * verbose thinking like "Let me think about the database schema..."
 *
 * Design Goals:
 * - Zero LLM calls (pure client-side heuristics)
 * - Sub-millisecond extraction time
 * - Stable output (throttled updates, no flickering)
 * - Action-oriented language (gerunds: "Analyzing...", "Building...")
 *
 * @module reasoningTextExtractor
 */

// ============================================================================
// VERB CONJUGATION MAP
// ============================================================================
// Maps imperative/infinitive verbs to their gerund (-ing) forms.
// This transforms "I will analyze" or "Analyze the schema" into "Analyzing..."
// NOTE: No duplicates allowed - each verb key appears exactly once.

const VERB_CONJUGATIONS: Record<string, string> = {
  // Core development verbs
  analyze: "Analyzing",
  check: "Checking",
  create: "Creating",
  design: "Designing",
  review: "Reviewing",
  build: "Building",
  implement: "Implementing",
  fix: "Fixing",
  debug: "Debugging",
  test: "Testing",
  write: "Writing",
  read: "Reading",
  update: "Updating",
  modify: "Modifying",
  refactor: "Refactoring",
  optimize: "Optimizing",
  validate: "Validating",
  configure: "Configuring",
  setup: "Setting up",
  set: "Setting",

  // CRUD operations
  add: "Adding",
  remove: "Removing",
  delete: "Deleting",
  insert: "Inserting",
  fetch: "Fetching",
  load: "Loading",
  save: "Saving",
  store: "Storing",
  get: "Getting",
  put: "Putting",
  post: "Posting",

  // Processing verbs
  process: "Processing",
  generate: "Generating",
  render: "Rendering",
  compute: "Computing",
  calculate: "Calculating",
  parse: "Parsing",
  format: "Formatting",
  convert: "Converting",
  transform: "Transforming",
  map: "Mapping",
  filter: "Filtering",
  sort: "Sorting",
  search: "Searching",
  find: "Finding",
  query: "Querying",
  look: "Looking",
  scan: "Scanning",

  // Network/API verbs
  request: "Requesting",
  send: "Sending",
  receive: "Receiving",
  connect: "Connecting",
  disconnect: "Disconnecting",
  call: "Calling",
  invoke: "Invoking",

  // Security verbs
  authenticate: "Authenticating",
  authorize: "Authorizing",
  encrypt: "Encrypting",
  decrypt: "Decrypting",
  hash: "Hashing",
  sign: "Signing",
  verify: "Verifying",

  // Data verbs
  compress: "Compressing",
  decompress: "Decompressing",
  encode: "Encoding",
  decode: "Decoding",
  serialize: "Serializing",
  deserialize: "Deserializing",
  stringify: "Stringifying",
  clone: "Cloning",
  copy: "Copying",
  move: "Moving",
  rename: "Renaming",

  // DevOps verbs
  install: "Installing",
  uninstall: "Uninstalling",
  deploy: "Deploying",
  publish: "Publishing",
  release: "Releasing",
  version: "Versioning",
  migrate: "Migrating",
  upgrade: "Upgrading",
  downgrade: "Downgrading",
  patch: "Patching",

  // Code organization verbs
  merge: "Merging",
  split: "Splitting",
  combine: "Combining",
  separate: "Separating",
  integrate: "Integrating",
  import: "Importing",
  export: "Exporting",
  inject: "Injecting",
  extract: "Extracting",
  embed: "Embedding",
  wrap: "Wrapping",
  unwrap: "Unwrapping",

  // Documentation verbs
  document: "Documenting",
  comment: "Commenting",
  annotate: "Annotating",
  label: "Labeling",
  tag: "Tagging",
  describe: "Describing",
  explain: "Explaining",

  // Organization verbs
  categorize: "Categorizing",
  organize: "Organizing",
  structure: "Structuring",
  scaffold: "Scaffolding",
  bootstrap: "Bootstrapping",
  initialize: "Initializing",
  reset: "Resetting",
  clear: "Clearing",
  clean: "Cleaning",
  purge: "Purging",

  // Monitoring verbs
  trace: "Tracing",
  log: "Logging",
  monitor: "Monitoring",
  track: "Tracking",
  measure: "Measuring",
  profile: "Profiling",
  benchmark: "Benchmarking",
  audit: "Auditing",
  inspect: "Inspecting",
  examine: "Examining",

  // Analysis verbs
  evaluate: "Evaluating",
  assess: "Assessing",
  estimate: "Estimating",
  predict: "Predicting",
  recommend: "Recommending",
  suggest: "Suggesting",
  propose: "Proposing",
  consider: "Considering",
  determine: "Determining",
  decide: "Deciding",

  // Planning verbs
  plan: "Planning",
  schedule: "Scheduling",
  queue: "Queuing",
  batch: "Batching",
  chunk: "Chunking",
  paginate: "Paginating",

  // Performance verbs
  cache: "Caching",
  prefetch: "Prefetching",
  preload: "Preloading",
  stream: "Streaming",
  buffer: "Buffering",
  flush: "Flushing",
  drain: "Draining",
  throttle: "Throttling",
  debounce: "Debouncing",

  // Error handling verbs
  retry: "Retrying",
  recover: "Recovering",
  restore: "Restoring",
  backup: "Backing up",
  archive: "Archiving",
  handle: "Handling",
  catch: "Catching",
  throw: "Throwing",

  // UI verbs
  show: "Showing",
  hide: "Hiding",
  display: "Displaying",
  toggle: "Toggling",
  expand: "Expanding",
  collapse: "Collapsing",
  animate: "Animating",
  style: "Styling",
  layout: "Laying out",

  // Thinking verbs (for status display)
  think: "Thinking",
  reason: "Reasoning",
  understand: "Understanding",
  comprehend: "Comprehending",
  interpret: "Interpreting",
  infer: "Inferring",
  deduce: "Deducing",
  conclude: "Concluding",
  formulate: "Formulating",
  synthesize: "Synthesizing",
  abstract: "Abstracting",
  generalize: "Generalizing",
  specialize: "Specializing",
  apply: "Applying",
  use: "Using",
  utilize: "Utilizing",
  leverage: "Leveraging",
  employ: "Employing",
  adopt: "Adopting",
  adapt: "Adapting",
  adjust: "Adjusting",
  tune: "Tuning",
  tweak: "Tweaking",
  calibrate: "Calibrating",
  align: "Aligning",
  match: "Matching",
  compare: "Comparing",
  contrast: "Contrasting",
  differentiate: "Differentiating",
  distinguish: "Distinguishing",
  identify: "Identifying",
  recognize: "Recognizing",
  detect: "Detecting",
  discover: "Discovering",
  explore: "Exploring",
  investigate: "Investigating",
  research: "Researching",
  study: "Studying",
  learn: "Learning",
  practice: "Practicing",
  train: "Training",
  teach: "Teaching",
  guide: "Guiding",
  assist: "Assisting",
  help: "Helping",
  support: "Supporting",
  enable: "Enabling",
  empower: "Empowering",
  facilitate: "Facilitating",
  coordinate: "Coordinating",
  orchestrate: "Orchestrating",
  manage: "Managing",
  administer: "Administering",
  govern: "Governing",
  control: "Controlling",
  regulate: "Regulating",
  enforce: "Enforcing",
  ensure: "Ensuring",
  guarantee: "Guaranteeing",
  secure: "Securing",
  protect: "Protecting",
  guard: "Guarding",
  defend: "Defending",
  shield: "Shielding",
  isolate: "Isolating",
  sandbox: "Sandboxing",
  contain: "Containing",
  limit: "Limiting",
  restrict: "Restricting",
  constrain: "Constraining",
  bound: "Bounding",
  cap: "Capping",
  allocate: "Allocating",
  assign: "Assigning",
  distribute: "Distributing",
  share: "Sharing",
  divide: "Dividing",
  partition: "Partitioning",
  segment: "Segmenting",
  break: "Breaking",
  complete: "Completing",
  finish: "Finishing",
  finalize: "Finalizing",
  resolve: "Resolving",
  settle: "Settling",
  close: "Closing",
  end: "Ending",
  terminate: "Terminating",
  abort: "Aborting",
  cancel: "Canceling",
  stop: "Stopping",
  pause: "Pausing",
  resume: "Resuming",
  restart: "Restarting",
  reboot: "Rebooting",
  refresh: "Refreshing",
  reload: "Reloading",
  rerun: "Rerunning",
  repeat: "Repeating",
  iterate: "Iterating",
  loop: "Looping",
  cycle: "Cycling",
  rotate: "Rotating",
  spin: "Spinning",
  wait: "Waiting",
  await: "Awaiting",
  block: "Blocking",
  lock: "Locking",
  unlock: "Unlocking",
  acquire: "Acquiring",
  obtain: "Obtaining",
  retrieve: "Retrieving",
  access: "Accessing",
  enter: "Entering",
  exit: "Exiting",
  leave: "Leaving",
  join: "Joining",
  attach: "Attaching",
  detach: "Detaching",
  bind: "Binding",
  unbind: "Unbinding",
  link: "Linking",
  unlink: "Unlinking",
  reference: "Referencing",
  dereference: "Dereferencing",
  point: "Pointing",
  index: "Indexing",
  address: "Addressing",
  navigate: "Navigating",
  route: "Routing",
  redirect: "Redirecting",
  forward: "Forwarding",
  proxy: "Proxying",
  relay: "Relaying",
  bridge: "Bridging",
  gateway: "Gatewaying",
  tunnel: "Tunneling",
  channel: "Channeling",
  pipe: "Piping",
  fork: "Forking",
  spawn: "Spawning",
  execute: "Executing",
  run: "Running",
  launch: "Launching",
  start: "Starting",
  begin: "Beginning",
  initiate: "Initiating",
  trigger: "Triggering",
  fire: "Firing",
  emit: "Emitting",
  broadcast: "Broadcasting",
  subscribe: "Subscribing",
  listen: "Listening",
  observe: "Observing",
  watch: "Watching",
  notify: "Notifying",
  alert: "Alerting",
  warn: "Warning",
  inform: "Informing",
  report: "Reporting",
  announce: "Announcing",
  declare: "Declaring",
  define: "Defining",
  specify: "Specifying",
  clarify: "Clarifying",
  elaborate: "Elaborating",
  detail: "Detailing",
  outline: "Outlining",
  summarize: "Summarizing",
  condense: "Condensing",
  simplify: "Simplifying",
  reduce: "Reducing",
  minimize: "Minimizing",
  maximize: "Maximizing",
  increase: "Increasing",
  decrease: "Decreasing",
  grow: "Growing",
  shrink: "Shrinking",
  scale: "Scaling",
  resize: "Resizing",
  reflow: "Reflowing",
  reformat: "Reformatting",
  restyle: "Restyling",
  repaint: "Repainting",
  redraw: "Redrawing",
  rerender: "Rerendering",
  reconcile: "Reconciling",
  diff: "Diffing",
  commit: "Committing",
  rollback: "Rolling back",
  revert: "Reverting",
  undo: "Undoing",
  redo: "Redoing",
};

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

/**
 * Patterns that indicate code content (should show "Writing code...")
 * These are checked against the raw text to detect when the LLM is outputting code
 *
 * IMPORTANT: Avoid patterns that match common prose. Words like "this", "new", "if"
 * appear frequently in natural language and should not trigger code detection.
 */
const CODE_PATTERNS: RegExp[] = [
  /[{}[\]]/, // Brackets/braces (but NOT < > which appear in prose)
  // Code keywords - only truly code-specific ones, NOT words used in prose
  // Excluded: new, this, if, else, for, while, case, break, return (common in prose)
  // Excluded: interface, module, type (appear in "user interface", "authentication module", "data type")
  /\b(const|let|var|function|class|import|export|async|await|switch|continue|try|catch|finally|throw|super|extends|implements|static|public|private|protected|readonly|abstract|virtual|override|enum|namespace|declare|typeof|instanceof|keyof|infer)\b/,
  /=>/, // Arrow functions
  /\(\s*\)/, // Empty parens
  /;\s*$/, // Semicolon at end
  /<\/[a-z]+>/i, // Closing HTML/JSX tags
  /<\w+\s*\/>/, // Self-closing JSX tags like <Component />
  /^\s*\/\//, // Line comments
  /^\s*\/\*/, // Block comments
  /^\s*#(?![\s]|$)/, // Hash comments (Python, shell) - but not markdown headers
  /\w+\s*=\s*["'`{([]/, // Variable assignments
  /\.\w+\(/, // Method calls
  /\[\d+\]/, // Array indexing
  /::\w+/, // Scope resolution (C++, Rust)
  /->/, // Arrow operators (C, PHP)
  /@\w+\(/, // Decorators/annotations with parens
  /\$\w+/, // Variable sigils (PHP, shell)
  /`[^`]*\$\{/, // Template literal interpolation
];

/**
 * Filler phrases that indicate thinking-out-loud rather than status updates
 * These should be filtered out to show only actionable status text
 */
const FILLER_PHRASES: string[] = [
  "let me",
  "let's",
  "i will",
  "i'll",
  "i need",
  "i should",
  "i want",
  "i have",
  "i am",
  "i'm",
  "we",
  "we'll",
  "we're",
  "we need",
  "we should",
  "this",
  "that",
  "okay",
  "ok",
  "so",
  "here",
  "now",
  "first",
  "next",
  "then",
  "after",
  "before",
  "finally",
  "starting",
  "alright",
  "well",
  "basically",
  "actually",
  "just",
  "simply",
  "really",
  "very",
  "quite",
  "rather",
  "maybe",
  "perhaps",
  "probably",
  "possibly",
  "likely",
  "certainly",
  "definitely",
  "obviously",
  "clearly",
  "apparently",
  "seems",
  "looks",
  "appears",
  "might",
  "could",
  "would",
  "should",
  "must",
  "shall",
  "can",
  "may",
  "going to",
  "gonna",
  "gotta",
  "wanna",
  "need to",
  "have to",
  "got to",
  "want to",
  "trying to",
  "about to",
  "used to",
  "supposed to",
];

/**
 * Patterns that indicate instructions NOT to do something
 * These are typically internal notes, not status updates
 */
const NEGATIVE_PATTERNS: RegExp[] = [
  /^(no|do not|don't|must not|mustn't|avoid|never|shouldn't|cannot|can't|won't|wouldn't)\s+/i,
  /<!DOCTYPE|<html|<head|<body|<script/i, // HTML document structure
  /^(note|warning|caution|important|todo|fixme|hack|bug|issue):/i, // Comment markers
];

/**
 * State verbs that describe rather than act
 * "The component is rendering" vs "Rendering the component"
 */
const STATE_VERB_PATTERN =
  /\s(is|are|was|were|has|have|had|will be|would be|could be|should be|might be|may be)\s/i;

/**
 * Action verbs that indicate doing something
 * These override state verb detection
 */
const ACTION_VERB_PATTERN =
  /(checking|analyzing|creating|designing|reviewing|generating|writing|building|implementing|processing|computing|calculating|parsing|formatting|converting|transforming|mapping|filtering|sorting|searching|finding|querying|testing|debugging|fixing|optimizing|validating|configuring|setting|adding|removing|deleting|updating|modifying|refactoring|deploying|installing|migrating)/i;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for text extraction behavior
 */
export interface ExtractionConfig {
  /** Minimum character length for a valid status text */
  minLength: number;
  /** Minimum word count for a valid status text */
  minWordCount: number;
  /** Minimum milliseconds between status updates */
  throttleMs: number;
  /** Maximum character length (truncate with ellipsis) */
  maxLength: number;
}

/**
 * Default configuration values
 * These are tuned based on typical LLM reasoning patterns
 */
export const DEFAULT_CONFIG: ExtractionConfig = {
  minLength: 15, // "Analyzing X" = 11 chars minimum
  minWordCount: 3, // At least "Verb Object Modifier" (e.g. "Analyzing the schema")
  throttleMs: 1500, // 1.5 seconds between updates
  maxLength: 70, // Fits in typical pill UI
};

/**
 * State maintained between extraction calls
 * Enables throttling, phase tracking, and fallback to previous good text
 */
export interface ExtractionState {
  /** Last successfully extracted text */
  lastText: string;
  /** Timestamp of last update */
  lastUpdateTime: number;
  /** Current thinking phase (for phase-based ticker) */
  currentPhase?: ThinkingPhase;
}

/**
 * Create initial extraction state
 */
export function createExtractionState(): ExtractionState {
  return {
    lastText: "Thinking...",
    lastUpdateTime: 0,
    currentPhase: 'starting',
  };
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if text looks like code
 */
export function looksLikeCode(text: string): boolean {
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if text starts with a filler phrase
 * Handles filler phrases followed by space, comma, or other punctuation
 */
export function startsWithFiller(text: string): boolean {
  const lower = text.toLowerCase();
  return FILLER_PHRASES.some(
    (phrase) =>
      lower.startsWith(phrase + " ") ||
      lower.startsWith(phrase + ",") ||
      lower.startsWith(phrase + ".") ||
      lower === phrase
  );
}

/**
 * Check if text is a negative instruction
 */
export function isNegativeInstruction(text: string): boolean {
  return NEGATIVE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if text is a state sentence (describes rather than acts)
 */
export function isStateSentence(text: string): boolean {
  // Has state verb AND doesn't have action verb AND doesn't end with ?
  return (
    STATE_VERB_PATTERN.test(text) &&
    !ACTION_VERB_PATTERN.test(text) &&
    !text.endsWith("?")
  );
}

/**
 * Check if text looks like JSON or structured data
 */
export function looksLikeData(text: string): boolean {
  return (
    text.includes('":') || // JSON key-value
    text.includes("':'") || // Python dict
    /^\s*[{[\]]/.test(text) || // Starts with bracket
    /[{[\]]\s*$/.test(text) || // Ends with bracket
    /,\s*[}\]]/.test(text) // Trailing comma before closing bracket
  );
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Non-action verbs that shouldn't be transformed to gerunds
 * "Let me think" should stay as filler, not become "Thinking"
 */
const NON_TRANSFORMABLE_VERBS = new Set([
  "think",
  "see",
  "look",
  "know",
  "understand",
  "consider",
  "wonder",
  "figure",
  "try", // "Let me try" is too vague
  "start", // "Let me start" is too vague
]);

/**
 * Transform verb forms to gerund (-ing form)
 *
 * Patterns handled:
 * - "I will analyze" → "Analyzing"
 * - "We are checking" → "Checking"
 * - "Analyze the schema" → "Analyzing the schema"
 * - "Let me analyze" → "Analyzing" (strips filler)
 *
 * Note: Non-action verbs like "think", "see" are NOT transformed
 * so that phrases like "Let me think" remain as filler phrases.
 */
export function transformToGerund(text: string): string {
  let result = text;

  // Pattern 1: "I/We will/am/are/should/need to [verb]"
  // Handle "am/are" carefully - the verb following is already in -ing or base form
  result = result.replace(
    /^(I|We)\s+(will|should|need to|have to|want to|going to|gonna)\s+(\w+)/i,
    (match, _pronoun, _modal, verb) => {
      const lower = verb.toLowerCase();
      // Don't transform non-action verbs
      if (NON_TRANSFORMABLE_VERBS.has(lower)) {
        return match;
      }
      if (VERB_CONJUGATIONS[lower]) {
        return VERB_CONJUGATIONS[lower];
      }
      // Auto-generate -ing form for unknown verbs
      return autoGerund(lower);
    }
  );

  // Pattern 1b: "I am/We are [verb]ing" - just extract the gerund
  result = result.replace(
    /^(I|We)\s+(am|are)\s+(\w+ing)/i,
    (match, _pronoun, _modal, gerund) => {
      const lower = gerund.toLowerCase();
      // Don't transform non-action verbs (e.g., "I am thinking")
      if (NON_TRANSFORMABLE_VERBS.has(lower.replace(/ing$/, ""))) {
        return match;
      }
      // Capitalize the gerund
      return gerund.charAt(0).toUpperCase() + gerund.slice(1);
    }
  );

  // Pattern 1c: "I am/We are [verb]" where verb is not already -ing
  result = result.replace(
    /^(I|We)\s+(am|are)\s+(\w+)(?!ing)/i,
    (match, _pronoun, _modal, verb) => {
      const lower = verb.toLowerCase();
      // Skip if already ends with 'ing'
      if (lower.endsWith("ing")) {
        return verb.charAt(0).toUpperCase() + verb.slice(1);
      }
      // Don't transform non-action verbs
      if (NON_TRANSFORMABLE_VERBS.has(lower)) {
        return match;
      }
      if (VERB_CONJUGATIONS[lower]) {
        return VERB_CONJUGATIONS[lower];
      }
      return match; // Keep original if no transformation available
    }
  );

  // Pattern 2: "Let me/Let's [verb]" → "[Verb]ing"
  result = result.replace(
    /^(Let me|Let's|Lemme)\s+(\w+)/i,
    (match, _prefix, verb) => {
      const lower = verb.toLowerCase();
      // Don't transform non-action verbs (e.g., "Let me think")
      if (NON_TRANSFORMABLE_VERBS.has(lower)) {
        return match;
      }
      if (VERB_CONJUGATIONS[lower]) {
        return VERB_CONJUGATIONS[lower];
      }
      return autoGerund(lower);
    }
  );

  // Pattern 3: "[Verb] the/a/an [noun]" at start (imperative form)
  result = result.replace(
    /^([A-Z][a-z]+)\s+(the|a|an|this|that|these|those|my|your|our|their|its)\s+/,
    (match, verb, article) => {
      const lower = verb.toLowerCase();
      if (VERB_CONJUGATIONS[lower]) {
        return `${VERB_CONJUGATIONS[lower]} ${article} `;
      }
      return match;
    }
  );

  return result;
}

/**
 * Auto-generate gerund (-ing) form for verbs not in the map
 */
function autoGerund(verb: string): string {
  const lower = verb.toLowerCase();
  // Already ends with -ing
  if (lower.endsWith("ing")) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  // Words ending in 'e' (not 'ee'): remove 'e', add 'ing'
  if (lower.endsWith("e") && !lower.endsWith("ee")) {
    return lower.charAt(0).toUpperCase() + lower.slice(1, -1) + "ing";
  }
  // Short words ending in consonant-vowel-consonant: double final consonant
  if (/[aeiou][^aeiouwxy]$/.test(lower) && lower.length <= 4) {
    return (
      lower.charAt(0).toUpperCase() + lower.slice(1) + lower.slice(-1) + "ing"
    );
  }
  // Default: just add 'ing'
  return lower.charAt(0).toUpperCase() + lower.slice(1) + "ing";
}

/**
 * Strip common prefixes like "Building:" or "Step 1:"
 */
export function stripPrefix(text: string): string {
  return text
    .replace(/^[A-Za-z]+:\s*/, "") // "Building: ..." → "..."
    .replace(/^Step\s+\d+[:.]\s*/i, "") // "Step 1: ..." → "..."
    .replace(/^Phase\s+\d+[:.]\s*/i, "") // "Phase 1: ..." → "..."
    .replace(/^\d+[.)]\s*/, ""); // "1. ..." → "..."
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + "...";
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Result of validating a candidate text
 */
export interface ValidationResult {
  valid: boolean;
  cleaned: string;
  reason?: string;
}

/**
 * Non-action verbs that shouldn't be considered "action phrases"
 * even when preceded by "I am", "Let me", etc.
 * These are thinking/meta verbs rather than concrete development actions.
 */
const NON_ACTION_VERBS = new Set([
  "think",
  "thinking",
  "see",
  "seeing",
  "look",
  "looking",
  "know",
  "knowing",
  "understand",
  "understanding",
  "consider",
  "considering",
  "wonder",
  "wondering",
  "figure",
  "figuring", // "figure out" is too vague
]);

/**
 * Check if text is an action phrase that should be transformed, not filtered
 * "I am checking" → should become "Checking", not be rejected as filler
 * "Let me think" → should be rejected as filler (think is non-action)
 */
function isActionPhrase(text: string): boolean {
  // Extract the verb from the phrase
  let verbMatch: RegExpMatchArray | null = null;

  // "I am/We are [verb]ing" - these are action phrases, not fillers
  verbMatch = text.match(/^(I|We)\s+(am|are)\s+(\w+ing)\b/i);
  if (verbMatch) {
    const verb = verbMatch[3].toLowerCase();
    return !NON_ACTION_VERBS.has(verb);
  }

  // "I will/We will [verb]" - future action phrases
  verbMatch = text.match(/^(I|We)\s+(will|should|need to|have to)\s+(\w+)\b/i);
  if (verbMatch) {
    const verb = verbMatch[3].toLowerCase();
    return !NON_ACTION_VERBS.has(verb);
  }

  // "Let me/Let's [verb]" - action initiators (but not "let me think")
  verbMatch = text.match(/^(Let me|Let's|Lemme)\s+(\w+)\b/i);
  if (verbMatch) {
    const verb = verbMatch[2].toLowerCase();
    return !NON_ACTION_VERBS.has(verb);
  }

  return false;
}

/**
 * Clean and validate a candidate text for display
 */
export function validateCandidate(
  text: string,
  config: ExtractionConfig = DEFAULT_CONFIG
): ValidationResult {
  const trimmed = text.trim();

  // === EARLY CHECKS ON ORIGINAL TEXT (before cleaning) ===
  // These patterns are detected on the raw input

  if (/^\d+[.)]\s/.test(trimmed)) {
    // Numbered list: "1. ..." or "1) ..."
    return { valid: false, cleaned: trimmed, reason: "numbered_list" };
  }

  if (/^["']/.test(trimmed)) {
    // Quoted text: starts with quote
    return { valid: false, cleaned: trimmed, reason: "quoted" };
  }

  // === CLEANING ===
  // Strip prefixes and bullet points
  let cleaned = stripPrefix(trimmed);
  cleaned = cleaned.replace(/^[-*•]\s*/, "");

  // === EARLY TRANSFORMATION ===
  // Apply verb transformation BEFORE validation
  // This converts "I am checking" → "Checking" before filler checks
  const transformed = transformToGerund(cleaned);

  // === LENGTH CHECKS (on transformed text) ===
  if (transformed.length < config.minLength) {
    return { valid: false, cleaned: transformed, reason: "too_short" };
  }

  const wordCount = transformed.split(/\s+/).length;
  if (wordCount < config.minWordCount) {
    return { valid: false, cleaned: transformed, reason: "too_few_words" };
  }

  // Must start with capital letter (check transformed)
  if (!/^[A-Z]/.test(transformed)) {
    return { valid: false, cleaned: transformed, reason: "no_capital" };
  }

  // === CONTENT FILTERS (on transformed text) ===
  // Action phrases like "I am checking" are transformed to "Checking", so they pass
  // Only reject fillers that weren't transformed
  if (startsWithFiller(transformed) && !isActionPhrase(cleaned)) {
    return { valid: false, cleaned: transformed, reason: "filler_phrase" };
  }

  if (isNegativeInstruction(transformed)) {
    return { valid: false, cleaned: transformed, reason: "negative_instruction" };
  }

  // Format checks
  if (transformed.endsWith(":")) {
    return { valid: false, cleaned: transformed, reason: "ends_with_colon" };
  }

  // Check for code AFTER other filters (so we can give more specific reasons)
  if (looksLikeCode(transformed)) {
    return { valid: false, cleaned: transformed, reason: "looks_like_code" };
  }

  if (isStateSentence(transformed)) {
    return { valid: false, cleaned: transformed, reason: "state_sentence" };
  }

  if (looksLikeData(transformed)) {
    return { valid: false, cleaned: transformed, reason: "looks_like_data" };
  }

  if (/^[-*•]\s/.test(text) && transformed.length < 40) {
    return { valid: false, cleaned: transformed, reason: "short_bullet" };
  }

  // === VALID! Final cleanup ===
  // Strip trailing sentence punctuation for cleaner status display
  let final = transformed.replace(/[.!?]+$/, "");

  // Truncate if too long
  final = truncate(final, config.maxLength);

  return { valid: true, cleaned: final };
}

// ============================================================================
// PHASE-BASED TICKER SYSTEM (3-6 meaningful updates)
// ============================================================================
// Instead of extracting raw text (which causes flashing), we detect phases
// and show pre-defined semantic messages like Claude's extended thinking.

/** Phases of reasoning that the model goes through */
type ThinkingPhase =
  | 'starting'
  | 'analyzing'
  | 'planning'
  | 'implementing'
  | 'styling'
  | 'finalizing';

/** Configuration for each thinking phase */
interface PhaseConfig {
  keywords: string[];
  displayMessage: string;
  minChars: number;
}

/** Phase detection configuration - order matters for sequential progression */
const PHASE_CONFIG: Record<ThinkingPhase, PhaseConfig> = {
  starting: {
    keywords: [],
    displayMessage: 'Thinking...',
    minChars: 0,
  },
  analyzing: {
    keywords: ['understand', 'request', 'user wants', 'looking for', 'asking', 'need to', 'requires'],
    displayMessage: 'Analyzing the request...',
    minChars: 50,
  },
  planning: {
    keywords: ['structure', 'approach', 'design', 'plan', 'architecture', 'component', 'layout', 'organize'],
    displayMessage: 'Planning the implementation...',
    minChars: 200,
  },
  implementing: {
    keywords: ['implement', 'create', 'build', 'code', 'function', 'component', 'return', 'export', 'import'],
    displayMessage: 'Building the solution...',
    minChars: 400,
  },
  styling: {
    keywords: ['style', 'css', 'tailwind', 'color', 'layout', 'responsive', 'flex', 'grid', 'padding', 'margin'],
    displayMessage: 'Applying styling...',
    minChars: 600,
  },
  finalizing: {
    keywords: ['final', 'complete', 'finish', 'done', 'ready', 'result', 'output'],
    displayMessage: 'Finalizing the solution...',
    minChars: 800,
  },
};

/** Order of phases for sequential detection */
const PHASE_ORDER: ThinkingPhase[] = ['starting', 'analyzing', 'planning', 'implementing', 'styling', 'finalizing'];

/**
 * Detect which phase of thinking based on accumulated text
 * Phases progress forward only - no going back
 */
function detectPhase(text: string, currentPhase: ThinkingPhase): ThinkingPhase {
  const lowerText = text.toLowerCase();
  const textLength = text.length;
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  // Only check phases AFTER current (forward progression only)
  for (let i = currentIndex + 1; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i];
    const config = PHASE_CONFIG[phase];

    if (textLength < config.minChars) continue;
    if (config.keywords.some(kw => lowerText.includes(kw))) {
      return phase;
    }
  }

  return currentPhase;
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Result of extracting status text
 */
export interface ExtractionResult {
  /** The extracted status text to display */
  text: string;
  /** Whether the text was updated from the previous state */
  updated: boolean;
  /** Updated state for next call */
  state: ExtractionState;
}

/**
 * Extract the best status text from raw reasoning
 *
 * UPDATED: Now uses phase-based detection to show 3-6 meaningful updates
 * instead of rapidly changing raw text extraction.
 *
 * @param rawText - Raw reasoning text from LLM
 * @param state - Previous extraction state
 * @param config - Configuration options
 * @returns Extraction result with text and updated state
 */
export function extractStatusText(
  rawText: string,
  state: ExtractionState,
  config: ExtractionConfig = DEFAULT_CONFIG
): ExtractionResult {
  const now = Date.now();
  const text = rawText.trim();

  // Extract current phase from state (use 'starting' as default)
  const currentPhase = state.currentPhase || 'starting';

  // Detect phase transition
  const newPhase = detectPhase(text, currentPhase);
  const phaseChanged = newPhase !== currentPhase;
  const phaseMessage = PHASE_CONFIG[newPhase].displayMessage;

  // If phase changed, update immediately
  if (phaseChanged) {
    const newState: ExtractionState = {
      lastText: phaseMessage,
      lastUpdateTime: now,
      currentPhase: newPhase,
    };
    return { text: phaseMessage, updated: true, state: newState };
  }

  // Check throttling
  const timeSinceLastUpdate = now - state.lastUpdateTime;
  const isInitialState = state.lastText === "Thinking..." || state.lastText === "Processing...";

  if (!isInitialState && timeSinceLastUpdate < config.throttleMs) {
    return { text: state.lastText, updated: false, state };
  }

  // Special case: if we see code patterns, show "Writing code..." as part of implementing phase
  const lines = text.split("\n");
  const recentLines = lines.slice(-3);
  const recentText = recentLines.join("\n");

  if (looksLikeCode(recentText) && (isInitialState || timeSinceLastUpdate > 2000)) {
    const newState: ExtractionState = {
      lastText: "Writing code...",
      lastUpdateTime: now,
      currentPhase: 'implementing',
    };
    return { text: "Writing code...", updated: true, state: newState };
  }

  // No phase transition - return current phase message (stable, no flashing)
  return {
    text: phaseMessage,
    updated: state.lastText !== phaseMessage,
    state: {
      ...state,
      lastText: phaseMessage,
      currentPhase: newPhase,
    },
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Quick check if text should trigger "Writing code..." status
 * Useful for early detection without full extraction
 */
export function isCodeContent(text: string): boolean {
  const lines = text.split("\n").slice(-5);
  return lines.some((line) => looksLikeCode(line.trim()));
}

/**
 * Get the verb conjugation map for testing/debugging
 */
export function getVerbConjugations(): Readonly<Record<string, string>> {
  return VERB_CONJUGATIONS;
}

/**
 * Get all filler phrases for testing/debugging
 */
export function getFillerPhrases(): readonly string[] {
  return FILLER_PHRASES;
}
