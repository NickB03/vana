/**
 * Title Transformer
 *
 * Shared utility for transforming raw reasoning titles into action-oriented
 * gerund forms (e.g., "I will analyze" -> "Analyzing").
 *
 * Ported from frontend `reasoningTextExtractor.ts` for backend use.
 */

// ============================================================================
// VERB CONJUGATION MAP
// ============================================================================
// Maps imperative/infinitive verbs to their gerund (-ing) forms.
export const VERB_CONJUGATIONS: Record<string, string> = {
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

    // GLM-specific verbs
    craft: "Crafting",
    devise: "Devising",
    construct: "Constructing",
    formulate: "Formulating",
    prepare: "Preparing",
    assemble: "Assembling",

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
// NON-TRANSFORMABLE VERBS
// ============================================================================
// Verbs that shouldn't be converted to gerunds (meta/thinking verbs)
export const NON_TRANSFORMABLE_VERBS = new Set([
    "think",
    "see",
    "look",
    "know",
    "understand",
    "consider",
    "wonder",
    "figure",
    "try",
    "start",
]);

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Auto-generate gerund (-ing) form for verbs not in the map
 */
export function autoGerund(verb: string): string {
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
 * Transform text to gerund form
 * "I will analyze the schema" → "Analyzing the schema"
 * "Let me check the database" → "Checking the database"
 * "Check the validation logic" → "Checking the validation logic"
 */
export function transformToGerund(text: string): string {
    let result = text;

    // Pattern 1: "I/We will/am/are/should/need to [verb]"
    // Handle "am/are" carefully - the verb following is already in -ing or base form
    result = result.replace(
        /^(I|We)\s+(will|should|shall|need to|have to|want to|going to|gonna)\s+(\w+)/i,
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
 * Strip common prefixes like "Building:" or "Step 1:"
 */
export function stripTitlePrefix(text: string): string {
    return text
        .replace(/^[A-Za-z]+:\s*/, "") // "Building: ..." → "..."
        .replace(/^Step\s+\d+[:.]\s*/i, "") // "Step 1: ..." → "..."
        .replace(/^Phase\s+\d+[:.]\s*/i, "") // "Phase 1: ..." → "..."
        .replace(/^Section\s+\d+[:.]\s*/i, "") // "Section 1: ..." → "..."
        .replace(/^\d+[.)]\s*/, "") // "1. ..." → "..."
        .replace(/^[-*•]\s*/, ""); // "- ..." → "..."
}
