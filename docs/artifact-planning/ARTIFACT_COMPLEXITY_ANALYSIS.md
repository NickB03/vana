# Artifact Enhancement Complexity Analysis

**Date:** November 2, 2025
**Purpose:** Detailed complexity breakdown for each proposed artifact enhancement

---

## Complexity Rating Scale

| Rating | Description | Risk Level |
|--------|-------------|------------|
| 🟢 Low | Straightforward implementation, few dependencies, low risk | Minimal |
| 🟡 Medium | Moderate complexity, some dependencies, manageable risk | Low-Medium |
| 🟠 High | Complex implementation, multiple dependencies, higher risk | Medium-High |
| 🔴 Critical | Very complex, many dependencies, significant architectural changes | High |

---

## Phase 1: Foundation (Must-Have)

### 1.1 Automatic Artifact Detection

**Complexity: 🟡 Medium**

#### Technical Components
```typescript
// Core detection logic
interface ArtifactHeuristics {
  lineCountThreshold: number;      // Simple
  codeBlockDetection: RegExp;      // Simple
  htmlTagDetection: RegExp;        // Simple
  complexStructureDetection: any;  // Medium complexity
}

// Parser modifications
function shouldAutoCreateArtifact(content: string): boolean {
  // 1. Check line count (trivial)
  // 2. Detect code fences with language (simple regex)
  // 3. Detect HTML/JSX (regex + basic parsing)
  // 4. Detect tables/complex markdown (medium complexity)
  // 5. Analyze semantic context (challenging)
}
```

#### Dependencies
- ✅ No database changes required
- ✅ Existing `artifactParser.ts` infrastructure
- ⚠️ AI prompt modifications (requires testing iterations)
- ⚠️ Backward compatibility with manual XML tags

#### Implementation Breakdown

**Easy (2-3 hours):**
- Line count threshold
- Code fence detection
- Basic HTML tag detection

**Medium (3-5 hours):**
- Complex structure detection (tables, nested lists)
- Language-specific detection (JSX vs HTML vs markdown)
- False positive prevention

**Challenging (3-4 hours):**
- Semantic context analysis ("create a button" should trigger)
- Prompt engineering and testing
- Edge case handling (partial code, inline examples)

#### Risks & Challenges

**Risk 1: False Positives** 🟡 Medium Risk
```typescript
// Example: Should this create an artifact?
"Here's a quick example:
const x = 1;
const y = 2;
console.log(x + y);"

// Only 3 lines, but user might want artifact for reference
// Solution: Add context clues (words like "example", "code", "function")
```

**Risk 2: False Negatives** 🟡 Medium Risk
```typescript
// Should trigger but might not:
"Build a calculator" -> No code yet, but intent is clear
// Solution: Detect intent patterns + follow-up artifact creation
```

**Risk 3: Backward Compatibility** 🟢 Low Risk
```typescript
// Must still support manual tags
if (content.includes('<artifact')) {
  return parseManualArtifact(content);
}
return autoDetectArtifact(content);
```

#### Testing Complexity: 🟡 Medium
- Need 50+ test cases covering:
  - Various content lengths (5, 10, 15, 20, 50+ lines)
  - All artifact types (code, HTML, React, SVG, etc.)
  - Edge cases (inline code, partial snippets)
  - False positive scenarios
  - User intent patterns

#### Gotchas
1. **Multi-language support** - Different languages have different line density
2. **Streaming responses** - Detector must work incrementally
3. **Conversation context** - Previous messages might indicate artifact intent
4. **User preferences** - Some users might want manual control

#### Recommended Approach
```typescript
// Staged rollout
const detection = {
  phase1: 'explicit_patterns', // High confidence only (code blocks, HTML)
  phase2: 'line_count',        // Add length threshold
  phase3: 'semantic_analysis', // Full AI-driven detection
  phase4: 'user_learning'      // Adapt to user behavior
};
```

**Estimated Time:** 8-12 hours
**Confidence Level:** High (80%)
**ROI:** Very High - Dramatically improves UX

---

### 1.2 Version Control & History

**Complexity: 🟠 High**

#### Technical Components
```typescript
// Database layer (straightforward)
interface ArtifactVersion {
  id: string;
  message_id: string;
  version_number: number;
  content: string;
  content_hash: string;
  created_at: Date;
}

// UI layer (moderate complexity)
interface VersionSelector {
  currentVersion: number;
  totalVersions: number;
  onVersionChange: (version: number) => void;
  diffView: boolean;
}

// Diff algorithm (complex)
function computeDiff(
  oldContent: string,
  newContent: string,
  type: ArtifactType
): DiffResult {
  // Line-by-line diff for code
  // Token-level diff for text
  // AST diff for React/HTML (most complex)
}
```

#### Dependencies
- 🔴 **Critical:** New Supabase table + migration
- 🟡 **Medium:** Real-time subscription for concurrent edits
- 🟡 **Medium:** Content hashing algorithm (for deduplication)
- 🟡 **Medium:** Diff library (e.g., `diff-match-patch`, `react-diff-viewer`)

#### Implementation Breakdown

**Database Setup (3-4 hours):**
```sql
-- Migration complexity: Low
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, version_number)
);

-- Challenges:
-- 1. Cascade delete performance (many versions = slow delete)
-- 2. Storage growth (need retention policy)
-- 3. Index optimization (version queries must be fast)
```

**Hook Implementation (4-6 hours):**
```typescript
// useArtifactVersions hook
export function useArtifactVersions(messageId: string) {
  // Complexity: Medium
  // - Fetch versions (simple query)
  // - Real-time updates (moderate - RLS policies)
  // - Version creation (handle race conditions)
  // - Deduplication (hash comparison)

  const createVersion = async (content: string) => {
    const hash = await hashContent(content);
    const latest = await getLatestVersion(messageId);

    // Don't create duplicate versions
    if (latest?.content_hash === hash) {
      return latest;
    }

    return insertVersion({
      message_id: messageId,
      version_number: (latest?.version_number || 0) + 1,
      content,
      content_hash: hash
    });
  };

  return { versions, createVersion, revertToVersion };
}
```

**UI Components (5-8 hours):**

**Component 1: Version Selector** (2-3 hours)
```typescript
// Complexity: Low-Medium
// - Dropdown/slider UI (moderate CSS)
// - Keyboard navigation (arrow keys)
// - Loading states
// - Animation/transitions
```

**Component 2: Diff Viewer** (3-5 hours)
```typescript
// Complexity: High
// - Syntax highlighting (use existing highlighter)
// - Side-by-side vs unified view
// - Line numbers + change indicators
// - Performance for large files (virtual scrolling?)
// - Type-aware diffing (code vs text vs React)
```

**Integration (4-6 hours):**
```typescript
// Modify existing Artifact component
// - Add version state management
// - Update save logic to create versions
// - Handle version switching (re-render with new content)
// - Preserve scroll position between versions
// - Update parent components (ChatInterface)
```

#### Risks & Challenges

**Risk 1: Storage Explosion** 🔴 Critical Risk
```typescript
// Scenario: User edits 100 times, each version = 50KB
// Storage per artifact: 5MB
// 1000 users × 10 artifacts × 5MB = 50GB

// Solutions:
// 1. Implement retention policy (keep last N versions)
// 2. Content compression (gzip before storage)
// 3. Incremental diffs (store delta, not full content)
// 4. Version GC after 30 days (configurable)

const RETENTION_POLICY = {
  always_keep: 10,           // Last 10 versions
  keep_milestones: true,     // User-marked important versions
  compress_old: 30 * 86400,  // Compress after 30 days
  delete_after: 90 * 86400   // Delete after 90 days (except milestones)
};
```

**Risk 2: Concurrent Edits** 🟠 High Risk
```typescript
// Two users/tabs edit simultaneously
// Version numbers might collide

// Solution: Use optimistic locking
interface VersionCreate {
  message_id: string;
  expected_latest_version: number; // Must match current latest
  content: string;
}

// Database constraint ensures atomicity
// If version mismatch, retry with incremented number
```

**Risk 3: Performance Degradation** 🟡 Medium Risk
```typescript
// Loading 100 versions on mount = slow
// Solution: Lazy load + pagination

const useArtifactVersions = (messageId: string) => {
  // Only fetch latest version initially
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const allVersions = await fetchVersions(messageId);
    setVersions(allVersions);
    setIsLoadingHistory(false);
  };

  // Load on demand (user clicks version selector)
  return { latestVersion, versions, loadHistory };
};
```

**Risk 4: Diff Algorithm Complexity** 🟠 High Risk
```typescript
// Different content types need different diff strategies

const diffStrategies = {
  code: 'line-by-line',           // Simple, works well
  html: 'dom-tree-diff',          // Complex, need HTML parser
  react: 'ast-diff',              // Very complex, need Babel
  svg: 'xml-diff',                // Medium, similar to HTML
  markdown: 'line-by-line',       // Simple
  mermaid: 'semantic-diff'        // Complex, need mermaid parser
};

// Recommendation: Start with line-by-line for all types
// Add type-specific diffing in Phase 2
```

#### Testing Complexity: 🟠 High
- Unit tests for version CRUD (20+ tests)
- Integration tests for concurrent edits (10+ tests)
- E2E tests for version switching (15+ tests)
- Performance tests (large files, many versions)
- Storage cleanup tests (retention policy)

#### Migration Considerations
```typescript
// Existing artifacts won't have versions
// Need backfill migration

const backfillVersions = async () => {
  // For each message with artifact:
  // 1. Extract current artifact content
  // 2. Create version 1 with that content
  // 3. Set version timestamp = message created_at

  // Estimated time: Depends on data volume
  // 10,000 artifacts × 0.1s = ~17 minutes
};
```

#### Gotchas
1. **Version 0 vs Version 1** - Decide on numbering scheme (0-indexed or 1-indexed)
2. **Deleted messages** - CASCADE DELETE removes all versions (desired behavior?)
3. **Large content** - Some artifacts can be 100KB+ (React components with lots of code)
4. **Real-time sync** - Multiple tabs open might show stale versions
5. **Undo/Redo UX** - Users expect Cmd+Z, but we're using version selector

#### Recommended Approach
```typescript
// Phased implementation
const versionControl = {
  phase1: {
    features: ['basic version storage', 'version selector UI', 'simple diff'],
    time: '12-16 hours',
    risk: 'medium'
  },
  phase2: {
    features: ['concurrent edit handling', 'compression', 'retention policy'],
    time: '8-12 hours',
    risk: 'medium-high'
  },
  phase3: {
    features: ['advanced diffing', 'milestones', 'version labels'],
    time: '6-8 hours',
    risk: 'low'
  }
};
```

**Estimated Time:** 16-24 hours
**Confidence Level:** Medium (65%)
**ROI:** Very High - Core UX improvement, enables fearless editing

---

### 1.3 Publishing & Sharing

**Complexity: 🔴 Critical**

#### Technical Components
```typescript
// Database layer
interface PublishedArtifact {
  id: string;
  share_id: string;          // Public identifier
  user_id: string;
  message_id: string;
  version_number: number;
  artifact_type: string;
  artifact_title: string;
  artifact_content: string;
  allowed_domains: string[]; // Embed restrictions
  view_count: number;
  published_at: Date;
  is_published: boolean;
}

// Public viewer (unauthenticated route)
// Security layer (XSS prevention, rate limiting)
// Embed system (iframe, script tag, or both?)
// Analytics (view tracking, referrer tracking)
```

#### Dependencies
- 🔴 **Critical:** New Supabase table + RLS policies
- 🔴 **Critical:** Public route (unauthenticated access)
- 🟠 **High:** Content sanitization (prevent malicious artifacts)
- 🟠 **High:** Rate limiting (prevent abuse)
- 🟡 **Medium:** Share ID generation (short, unique, collision-free)
- 🟡 **Medium:** Embed code generation (secure iframe)

#### Implementation Breakdown

**Database Setup (4-5 hours):**
```sql
-- Migration complexity: Medium-High
CREATE TABLE published_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  message_id UUID REFERENCES chat_messages(id),
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  allowed_domains TEXT[],
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_published_artifacts_share ON published_artifacts(share_id);
CREATE INDEX idx_published_artifacts_user ON published_artifacts(user_id);
CREATE INDEX idx_published_artifacts_published_at ON published_artifacts(published_at DESC);

-- RLS Policies (CRITICAL - must be correct)
ALTER TABLE published_artifacts ENABLE ROW LEVEL SECURITY;

-- Public read (no auth required)
CREATE POLICY "Anyone can view published artifacts"
  ON published_artifacts FOR SELECT
  USING (is_published = true);

-- Users manage their own
CREATE POLICY "Users manage their published artifacts"
  ON published_artifacts FOR ALL
  USING (auth.uid() = user_id);

-- Challenges:
-- 1. Share ID generation (must be globally unique, short, no profanity)
-- 2. Denormalized content (duplicates data, but necessary for public access)
-- 3. View count updates (need atomic increment, prevent race conditions)
```

**Share ID Generation (2-3 hours):**
```typescript
// Complexity: Medium
// Requirements:
// - Short (8-12 chars for clean URLs)
// - URL-safe (no special chars)
// - Collision-resistant
// - No profanity (filter bad words)

import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  10 // 62^10 = 839 quadrillion combinations
);

const generateShareId = async (): Promise<string> => {
  const maxAttempts = 5;

  for (let i = 0; i < maxAttempts; i++) {
    const id = nanoid();

    // Check profanity filter
    if (containsProfanity(id)) continue;

    // Check uniqueness
    const exists = await checkShareIdExists(id);
    if (!exists) return id;
  }

  throw new Error('Failed to generate unique share ID');
};

// Challenges:
// 1. Profanity detection across languages
// 2. Collision handling (retry logic)
// 3. Reserved words (admin, api, app, etc.)
```

**Public Viewer Route (6-8 hours):**
```typescript
// New route: /artifact/:shareId
// Complexity: High (unauthenticated access, security critical)

const PublishedArtifactViewer = () => {
  const { shareId } = useParams();
  const [artifact, setArtifact] = useState<PublishedArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch artifact (no auth required)
    fetchPublishedArtifact(shareId)
      .then(data => {
        // Increment view count (atomic operation)
        incrementViewCount(shareId);
        setArtifact(data);
      })
      .catch(err => setError('Artifact not found or unpublished'));
  }, [shareId]);

  // Render artifact with public-safe context
  // - No edit buttons
  // - No version history
  // - No private data exposure
  // - Add "Create your own" CTA

  return (
    <div className="public-artifact-viewer">
      <ArtifactHeader
        title={artifact.artifact_title}
        author={artifact.author_name} // Need to join user data
        publishedAt={artifact.published_at}
      />
      <Artifact
        type={artifact.artifact_type}
        content={artifact.artifact_content}
        readonly={true}
      />
      <ArtifactFooter
        viewCount={artifact.view_count}
        ctaButton={<Button>Try it yourself</Button>}
      />
    </div>
  );
};

// Challenges:
// 1. SEO optimization (meta tags, Open Graph, Twitter Cards)
// 2. Performance (no auth = can be cached aggressively)
// 3. Abuse prevention (rate limiting view count increments)
// 4. Responsive design (must work on mobile)
```

**Security Layer (5-7 hours):**
```typescript
// Complexity: Very High
// This is the MOST CRITICAL part

// Challenge 1: XSS Prevention
const sanitizeArtifactForPublic = (artifact: PublishedArtifact) => {
  // Already have artifactValidator, but need extra checks

  if (artifact.artifact_type === 'text/html') {
    // Strip <script> tags, event handlers, etc.
    // Use DOMPurify or similar
    artifact.artifact_content = sanitizeHTML(artifact.artifact_content);
  }

  if (artifact.artifact_type === 'application/vnd.ant.react') {
    // React artifacts can import external libraries
    // MUST verify against approved library list
    const libraries = extractLibraries(artifact.artifact_content);
    const unapproved = libraries.filter(lib => !isApproved(lib));

    if (unapproved.length > 0) {
      throw new Error(`Unapproved libraries: ${unapproved.join(', ')}`);
    }
  }

  return artifact;
};

// Challenge 2: Rate Limiting
const RATE_LIMITS = {
  publish: { max: 10, window: 86400 },      // 10 publishes per day
  view: { max: 1000, window: 3600 },        // 1000 views per hour per artifact
  embed: { max: 100, window: 60 }           // 100 embed loads per minute
};

// Challenge 3: Content Policy
// Need ability to:
// - Flag inappropriate content (report button)
// - Admin unpublish (moderation dashboard)
// - DMCA takedown process
// - Banned user list

// Challenge 4: Embed Security
const generateEmbedCode = (shareId: string, allowedDomains: string[]) => {
  // Option 1: iframe (more secure, but limited interactivity)
  const iframeCode = `
<iframe
  src="https://your-app.com/artifact/${shareId}/embed"
  sandbox="allow-scripts allow-same-origin"
  width="100%"
  height="600"
  style="border: 1px solid #ccc; border-radius: 8px;"
></iframe>`;

  // Option 2: Script tag (more flexible, but security risks)
  const scriptCode = `
<div id="artifact-${shareId}"></div>
<script src="https://your-app.com/embed.js"
        data-artifact="${shareId}"
        data-container="artifact-${shareId}">
</script>`;

  // Domain validation (check referrer header)
  // CORS configuration

  return { iframeCode, scriptCode };
};
```

**Publishing UI (4-6 hours):**
```typescript
// ShareModal component
// Complexity: Medium

const ArtifactShareModal = ({ artifactId, onClose }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      // Validate artifact content (security check)
      await validateArtifact(artifactId);

      // Create published artifact
      const result = await publishArtifact({
        artifactId,
        allowedDomains
      });

      setPublishedUrl(result.publicUrl);
    } catch (error) {
      toast({
        title: 'Publishing failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Artifact</DialogTitle>
        </DialogHeader>

        {!publishedUrl ? (
          <PublishForm
            onPublish={handlePublish}
            allowedDomains={allowedDomains}
            onDomainsChange={setAllowedDomains}
          />
        ) : (
          <PublishedView
            url={publishedUrl}
            embedCode={generateEmbedCode(publishedUrl)}
            onUnpublish={handleUnpublish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Challenges:
// 1. Copy-to-clipboard (works in all browsers?)
// 2. Domain validation UI (help text, validation feedback)
// 3. Preview before publish (show what public users see)
// 4. Social sharing (Twitter, Facebook, LinkedIn buttons)
```

#### Risks & Challenges

**Risk 1: Abuse & Malicious Content** 🔴 Critical Risk
```typescript
// Scenarios:
// 1. User publishes malicious JavaScript
// 2. User publishes hate speech/illegal content
// 3. User publishes copyrighted code
// 4. User embeds on malicious site to steal data

// Mitigations:
// 1. Strict content validation before publishing
// 2. Report/flag system with admin review
// 3. DMCA takedown process
// 4. Terms of Service with content policy
// 5. Automated scanning (profanity, malware patterns)
// 6. Rate limiting + email verification required
```

**Risk 2: Storage & Bandwidth Costs** 🟠 High Risk
```typescript
// Published artifacts duplicate data
// Public access = no auth = can be scraped/abused

// Mitigations:
// 1. Cloudflare CDN (cache published artifacts)
// 2. Rate limiting on public endpoints
// 3. Compression (gzip, brotli)
// 4. Lazy loading (don't serve full content immediately)
// 5. Analytics to detect abuse patterns
```

**Risk 3: SEO & Discoverability** 🟡 Medium Risk
```typescript
// Published artifacts should be findable
// But also shouldn't leak private data

// Implementation:
// 1. robots.txt configuration
// 2. sitemap.xml for published artifacts
// 3. Open Graph meta tags
// 4. Twitter Cards
// 5. Canonical URLs
// 6. Noindex for unpublished/deleted

const ArtifactMetaTags = ({ artifact }) => (
  <Helmet>
    <title>{artifact.title} - Shared Artifact</title>
    <meta name="description" content={artifact.description} />

    {/* Open Graph */}
    <meta property="og:type" content="website" />
    <meta property="og:title" content={artifact.title} />
    <meta property="og:description" content={artifact.description} />
    <meta property="og:image" content={artifact.thumbnailUrl} />

    {/* Twitter Card */}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={artifact.title} />
    <meta name="twitter:description" content={artifact.description} />
    <meta name="twitter:image" content={artifact.thumbnailUrl} />

    {/* Canonical */}
    <link rel="canonical" href={artifact.publicUrl} />
  </Helmet>
);
```

**Risk 4: Unpublish Limitations** 🟡 Medium Risk
```typescript
// Claude.ai doesn't allow re-publishing after unpublish
// This is intentional (prevents abuse)

// Challenges:
// 1. User accidentally unpublishes (wants to undo)
// 2. User wants to update published artifact
// 3. Embedded artifacts break after unpublish

// Solution: Add confirmation dialog
const confirmUnpublish = () => {
  return confirm(`
    Are you sure you want to unpublish this artifact?

    - The public link will stop working
    - All embeds will break
    - You cannot republish this exact artifact
    - You can publish a new version instead
  `);
};
```

#### Testing Complexity: 🔴 Critical
- Unit tests for share ID generation (20+ tests)
- Security tests for XSS/injection (30+ tests)
- Integration tests for publishing flow (15+ tests)
- E2E tests for public viewer (20+ tests)
- Load testing for public routes (CDN, rate limits)
- Cross-browser testing (embed codes)
- Mobile testing (responsive design)

#### Legal & Compliance
```typescript
// IMPORTANT: Need legal review
const legalRequirements = {
  termsOfService: 'Content policy, copyright, liability',
  privacyPolicy: 'How published artifacts are handled',
  dmca: 'Takedown request process',
  dataRetention: 'How long published artifacts are stored',
  gdpr: 'Right to deletion (unpublish all)',
  coppa: 'Age requirements for publishing'
};
```

#### Gotchas
1. **Share ID collisions** - Rare but possible, need retry logic
2. **Orphaned publishes** - Message deleted but publish remains (by design? or cascade?)
3. **Version mismatch** - Published version 3, but message only has version 2 (data integrity)
4. **Cross-origin issues** - Embed codes must handle CORS properly
5. **View count inflation** - Bots can inflate numbers (need bot detection)
6. **Caching issues** - Unpublished artifact might be cached by CDN

#### Recommended Approach
```typescript
// Phased implementation (CRITICAL: Don't rush this)
const publishing = {
  phase1: {
    features: ['basic publishing', 'public viewer', 'share links'],
    time: '16-20 hours',
    risk: 'high',
    priority: 'security first'
  },
  phase2: {
    features: ['embed codes', 'domain restrictions', 'view analytics'],
    time: '12-16 hours',
    risk: 'medium-high',
    priority: 'abuse prevention'
  },
  phase3: {
    features: ['SEO optimization', 'social sharing', 'discovery page'],
    time: '8-12 hours',
    risk: 'medium',
    priority: 'growth features'
  }
};

// MUST HAVE before launch:
// - Content security policy
// - Rate limiting
// - Report/flag system
// - Admin moderation dashboard
// - Terms of Service
```

**Estimated Time:** 24-32 hours
**Confidence Level:** Medium-Low (50%)
**ROI:** High - Enables collaboration, but significant security investment required

**⚠️ RECOMMENDATION:** Consider launching as "Share with team only" first (authenticated sharing within organization), then expand to public sharing after security hardening.

---

## Phase 2: Enhanced Experience (Should-Have)

### 2.1 Multi-Artifact Support

**Complexity: 🟡 Medium**

#### Technical Components
```typescript
// State management
interface ArtifactContext {
  artifacts: Artifact[];        // Multiple artifacts in conversation
  activeArtifactId: string;     // Currently displayed
  setActiveArtifact: (id: string) => void;
}

// UI components
// - Artifact tabs/carousel
// - Artifact selector dropdown
// - Artifact thumbnail preview

// Chat reference parsing
// "Update the button component" -> identify which artifact
// "Show me the first artifact" -> switch to artifact[0]
```

#### Dependencies
- ✅ Existing artifact parser infrastructure
- 🟡 **Medium:** State management across components
- 🟡 **Medium:** Chat message parsing (NLP to identify artifact references)
- 🟢 **Low:** UI components (tabs, carousel)

#### Implementation Breakdown

**State Management (4-6 hours):**
```typescript
// Complexity: Medium
// Challenge: Multiple artifacts in one conversation

const useChatArtifacts = (sessionId: string) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Extract all artifacts from message history
  useEffect(() => {
    const extracted = messages.flatMap(msg =>
      extractArtifactsFromMessage(msg)
    );
    setArtifacts(extracted);

    // Auto-select most recent
    if (extracted.length > 0) {
      setActiveId(extracted[extracted.length - 1].id);
    }
  }, [messages]);

  const activeArtifact = artifacts.find(a => a.id === activeId);

  return { artifacts, activeArtifact, setActiveId };
};

// Challenges:
// 1. Artifact ordering (chronological? by type? user preference?)
// 2. Artifact IDs (need stable IDs across re-renders)
// 3. Active artifact persistence (remember user's selection)
```

**UI Components (6-8 hours):**

**Artifact Tabs** (3-4 hours)
```typescript
// Complexity: Low-Medium
const ArtifactTabs = ({ artifacts, activeId, onSelect }) => {
  return (
    <Tabs value={activeId} onValueChange={onSelect}>
      <TabsList>
        {artifacts.map(artifact => (
          <TabsTrigger value={artifact.id} key={artifact.id}>
            <ArtifactIcon type={artifact.type} />
            <span>{artifact.title}</span>
            <Badge>{artifact.version}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {artifacts.map(artifact => (
        <TabsContent value={artifact.id} key={artifact.id}>
          <Artifact {...artifact} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

// Challenges:
// 1. Many artifacts (10+) = horizontal scrolling
// 2. Tab overflow (need dropdown for extra tabs)
// 3. Mobile layout (vertical tabs? accordion?)
// 4. Tab reordering (drag-and-drop?)
```

**Artifact Carousel** (3-4 hours)
```typescript
// Alternative to tabs for mobile
// Complexity: Medium (use Embla Carousel)

const ArtifactCarousel = ({ artifacts, activeId, onSelect }) => {
  const [emblaRef] = useEmblaCarousel();

  return (
    <div ref={emblaRef} className="artifact-carousel">
      <div className="carousel-container">
        {artifacts.map(artifact => (
          <div className="carousel-slide" key={artifact.id}>
            <Artifact {...artifact} />
          </div>
        ))}
      </div>

      <CarouselControls
        current={activeIndex}
        total={artifacts.length}
        onPrevious={() => scrollPrev()}
        onNext={() => scrollNext()}
      />
    </div>
  );
};

// Challenges:
// 1. Performance with many artifacts (virtual scrolling?)
// 2. Smooth transitions (animations)
// 3. Touch gestures (swipe)
// 4. Thumbnail preview (overview mode)
```

**Chat Reference Parsing (4-6 hours):**
```typescript
// Complexity: Medium-High
// Detect when user refers to specific artifact

const detectArtifactReference = (
  userMessage: string,
  artifacts: Artifact[]
): string | null => {
  // Pattern 1: Explicit reference
  if (userMessage.match(/update (the )?(first|second|third|last) artifact/i)) {
    const index = extractOrdinal(userMessage);
    return artifacts[index]?.id;
  }

  // Pattern 2: By title
  const titleMatch = artifacts.find(a =>
    userMessage.toLowerCase().includes(a.title.toLowerCase())
  );
  if (titleMatch) return titleMatch.id;

  // Pattern 3: By type
  if (userMessage.match(/button|component/i)) {
    return artifacts.find(a =>
      a.type === 'application/vnd.ant.react'
    )?.id;
  }

  // Default: most recent
  return artifacts[artifacts.length - 1]?.id;
};

// Challenges:
// 1. Ambiguous references ("update the component" - which one?)
// 2. Multiple matches (2+ artifacts with similar titles)
// 3. Intent detection (is user referring to artifact or general concept?)
// 4. Context awareness (previous message context)

// Solution: When ambiguous, ask user to clarify
const disambiguate = (matches: Artifact[]) => {
  return {
    type: 'clarification',
    message: 'Which artifact would you like to update?',
    options: matches.map(a => ({
      label: a.title,
      value: a.id
    }))
  };
};
```

#### Risks & Challenges

**Risk 1: UI Clutter** 🟡 Medium Risk
```typescript
// 10+ artifacts in one chat = overwhelming UI
// Solutions:
// 1. Collapsible artifact list (show 3, expand for more)
// 2. Search/filter artifacts
// 3. Group by type (all React components together)
// 4. Archive old artifacts (hide but don't delete)
```

**Risk 2: Performance** 🟡 Medium Risk
```typescript
// Rendering 10 artifacts simultaneously = slow
// Solutions:
// 1. Virtual scrolling (only render visible)
// 2. Lazy loading (load content on-demand)
// 3. Tab-based rendering (only render active tab)
```

**Risk 3: Context Loss** 🟢 Low Risk
```typescript
// User forgets which artifact they're editing
// Solutions:
// 1. Highlight active artifact in chat
// 2. Show artifact preview in message
// 3. Breadcrumb navigation
```

#### Testing Complexity: 🟡 Medium
- Unit tests for state management (15+ tests)
- Component tests for tabs/carousel (20+ tests)
- Integration tests for artifact switching (10+ tests)
- E2E tests for chat references (15+ tests)

#### Gotchas
1. **Artifact IDs** - Need stable IDs that persist across re-renders
2. **Memory leaks** - Multiple artifacts = more state to cleanup
3. **Tab order** - Should match message chronology or user preference?
4. **Artifact deletion** - Remove from list when message deleted
5. **Artifact updates** - When artifact edited, update in artifacts array

#### Recommended Approach
```typescript
const multiArtifact = {
  phase1: {
    features: ['artifact tabs', 'basic switching', 'active state'],
    time: '10-12 hours',
    risk: 'low'
  },
  phase2: {
    features: ['carousel mode', 'thumbnail preview', 'search'],
    time: '6-8 hours',
    risk: 'low'
  },
  phase3: {
    features: ['smart references', 'context awareness', 'disambiguation'],
    time: '8-12 hours',
    risk: 'medium'
  }
};
```

**Estimated Time:** 16-24 hours
**Confidence Level:** High (75%)
**ROI:** Medium-High - Significant UX improvement for power users

---

### 2.2 Remix/Customize Feature

**Complexity: 🟡 Medium**

#### Technical Components
```typescript
// Database changes
ALTER TABLE chat_messages ADD COLUMN forked_from_message_id UUID;
ALTER TABLE chat_messages ADD COLUMN fork_attribution TEXT;

// New hook
const useArtifactFork = () => {
  const forkArtifact = async (messageId: string) => {
    // 1. Create new session
    // 2. Copy artifact to new session
    // 3. Set fork attribution
    // 4. Navigate to new session
  };

  return { forkArtifact, isForking };
};

// UI components
// - "Customize" button
// - Fork attribution badge
// - Fork lineage viewer (show fork tree)
```

#### Dependencies
- 🟢 **Low:** Database schema changes (2 new columns)
- 🟡 **Medium:** Session creation logic (reuse existing)
- 🟡 **Medium:** Attribution display
- 🟢 **Low:** UI components

#### Implementation Breakdown

**Database Migration (1-2 hours):**
```sql
-- Complexity: Low
ALTER TABLE chat_messages
ADD COLUMN forked_from_message_id UUID REFERENCES chat_messages(id),
ADD COLUMN fork_attribution TEXT;

CREATE INDEX idx_chat_messages_forked_from
ON chat_messages(forked_from_message_id);

-- No RLS changes needed (inherits from chat_messages policies)

-- Challenge: What happens if original message is deleted?
-- Option 1: CASCADE (fork loses attribution)
-- Option 2: SET NULL (fork keeps content, loses link)
-- Recommendation: SET NULL (preserve content)
```

**Fork Logic (4-6 hours):**
```typescript
// Complexity: Medium
export const useArtifactFork = () => {
  const { createSession } = useChatSessions();
  const { createMessage } = useChatMessages();
  const navigate = useNavigate();

  const forkArtifact = async (
    originalMessageId: string,
    artifactIndex: number = 0
  ) => {
    // 1. Fetch original message + artifact
    const originalMessage = await fetchMessage(originalMessageId);
    const artifact = extractArtifacts(originalMessage.content)[artifactIndex];

    // 2. Create new session
    const newSession = await createSession({
      title: `Remix: ${artifact.title}`,
      first_message: `Remixed artifact from original session`
    });

    // 3. Create initial message with artifact
    await createMessage({
      session_id: newSession.id,
      role: 'assistant',
      content: `<artifact type="${artifact.type}" title="${artifact.title}">
${artifact.content}
</artifact>`,
      forked_from_message_id: originalMessageId,
      fork_attribution: `Remixed from ${originalMessage.user_name}'s artifact`
    });

    // 4. Navigate to new session
    navigate(`/chat/${newSession.id}`);
  };

  return { forkArtifact, isForking };
};

// Challenges:
// 1. User name privacy (show username or "Anonymous"?)
// 2. Nested forks (fork of a fork of a fork)
// 3. License/copyright (user agreement needed)
// 4. Fork count tracking (popular artifacts)
```

**UI Components (3-5 hours):**

**Customize Button** (1-2 hours)
```typescript
// Complexity: Low
const ArtifactCustomizeButton = ({ messageId, artifactIndex }) => {
  const { forkArtifact, isForking } = useArtifactFork();

  return (
    <Button
      variant="outline"
      onClick={() => forkArtifact(messageId, artifactIndex)}
      disabled={isForking}
    >
      <ForkIcon className="mr-2" />
      Customize
    </Button>
  );
};
```

**Attribution Badge** (2-3 hours)
```typescript
// Complexity: Medium
const ArtifactAttributionBadge = ({ message }) => {
  const [originalArtifact, setOriginalArtifact] = useState(null);

  useEffect(() => {
    if (message.forked_from_message_id) {
      fetchMessage(message.forked_from_message_id)
        .then(setOriginalArtifact);
    }
  }, [message.forked_from_message_id]);

  if (!originalArtifact) return null;

  return (
    <Alert className="mb-4">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Remixed Artifact</AlertTitle>
      <AlertDescription>
        This artifact was customized from{' '}
        <Link to={`/chat/${originalArtifact.session_id}`}>
          {message.fork_attribution}
        </Link>
      </AlertDescription>
    </Alert>
  );
};

// Challenges:
// 1. Deleted originals (link goes to 404)
// 2. Private originals (user can't access)
// 3. Nested attribution (show full lineage?)
```

#### Risks & Challenges

**Risk 1: Copyright & Licensing** 🟠 High Risk
```typescript
// User remixes another user's code
// Who owns the derivative work?

// Solutions:
// 1. Terms of Service: All published artifacts licensed under MIT/CC BY
// 2. License selector on publish (MIT, Apache, CC BY, etc.)
// 3. Require attribution in forked artifacts
// 4. DMCA process for disputes

const LICENSE_OPTIONS = [
  { value: 'MIT', label: 'MIT License (permissive)' },
  { value: 'Apache-2.0', label: 'Apache 2.0 (permissive, patent grant)' },
  { value: 'CC-BY-4.0', label: 'Creative Commons Attribution' },
  { value: 'CC-BY-NC-4.0', label: 'Creative Commons Non-Commercial' }
];
```

**Risk 2: Broken Links** 🟡 Medium Risk
```typescript
// Original message deleted, but forks remain
// Fork attribution link goes to 404

// Solutions:
// 1. Soft delete (mark deleted, but preserve for attribution)
// 2. Cache original author name in fork_attribution
// 3. Show "Original artifact no longer available"
```

**Risk 3: Fork Spam** 🟢 Low Risk
```typescript
// Users create many forks of same artifact
// Clutter in session list

// Solutions:
// 1. Rate limit forks (5 per day per user)
// 2. Deduplicate forks (detect identical content)
// 3. Archive old forks
```

#### Testing Complexity: 🟡 Medium
- Unit tests for fork logic (15+ tests)
- Integration tests for session creation (10+ tests)
- E2E tests for fork workflow (10+ tests)
- Tests for deleted originals (5+ tests)

#### Gotchas
1. **Session context** - Forked message might reference other messages in original session
2. **Artifact dependencies** - React component imports from other artifacts
3. **Fork depth limit** - Prevent infinite fork chains (max 10 deep?)
4. **Performance** - Fetching original message on every fork render
5. **Privacy** - Show original author's name (with permission?)

#### Recommended Approach
```typescript
const remix = {
  phase1: {
    features: ['basic fork', 'new session creation', 'attribution badge'],
    time: '8-10 hours',
    risk: 'low'
  },
  phase2: {
    features: ['lineage viewer', 'license selector', 'fork analytics'],
    time: '6-8 hours',
    risk: 'medium'
  }
};
```

**Estimated Time:** 12-16 hours
**Confidence Level:** High (75%)
**ROI:** Medium - Nice collaborative feature, not critical

---

### 2.3 AI Error Fixing ("Try Fixing with Claude")

**Complexity: 🟢 Low-Medium**

#### Technical Components
```typescript
// Error detection
const detectArtifactError = (
  artifact: Artifact,
  error: Error
): ArtifactError => {
  return {
    type: categorizeError(error),
    message: error.message,
    stack: error.stack,
    line: extractLineNumber(error),
    code: extractCodeSnippet(artifact.content, lineNumber)
  };
};

// Auto-fix prompt generation
const generateFixPrompt = (
  artifact: Artifact,
  error: ArtifactError
): string => {
  return `Fix this ${artifact.type} artifact error:

Error: ${error.message}
Line ${error.line}: ${error.code}

Current full code:
\`\`\`${artifact.language}
${artifact.content}
\`\`\`

Please provide corrected code.`;
};

// Streaming fix
const streamArtifactFix = async (
  messageId: string,
  fixPrompt: string
) => {
  // Use existing chat streaming
  // Apply fix to artifact in real-time
};
```

#### Dependencies
- ✅ Existing error boundary infrastructure
- ✅ Existing streaming chat infrastructure
- 🟢 **Low:** Error categorization logic
- 🟢 **Low:** Prompt template for fixes
- 🟢 **Low:** UI button component

#### Implementation Breakdown

**Error Detection (2-3 hours):**
```typescript
// Complexity: Low (already have error boundary)
// Enhancement: Better error categorization

interface ArtifactError {
  type: 'syntax' | 'runtime' | 'import' | 'network' | 'unknown';
  message: string;
  stack?: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
}

const categorizeError = (error: Error): ArtifactError['type'] => {
  if (error.message.includes('Unexpected token')) return 'syntax';
  if (error.message.includes('is not defined')) return 'runtime';
  if (error.message.includes('Cannot find module')) return 'import';
  if (error.message.includes('NetworkError')) return 'network';
  return 'unknown';
};

// Extract useful context
const extractErrorContext = (
  content: string,
  lineNumber: number
): string => {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - 3);
  const end = Math.min(lines.length, lineNumber + 3);

  return lines.slice(start, end).join('\n');
};
```

**Fix Prompt Generation (2-3 hours):**
```typescript
// Complexity: Low
// Create smart prompts based on error type

const FIX_TEMPLATES = {
  syntax: `The following ${artifact.type} has a syntax error:

Error: ${error.message}
${error.line ? `Line ${error.line}: ${error.code}` : ''}

Full code:
\`\`\`${language}
${artifact.content}
\`\`\`

Please fix the syntax error and provide the corrected code.`,

  runtime: `The following ${artifact.type} has a runtime error:

Error: ${error.message}
${error.stack}

Code:
\`\`\`${language}
${artifact.content}
\`\`\`

Please analyze and fix the runtime error. Provide the corrected code.`,

  import: `The following ${artifact.type} has an import error:

Error: ${error.message}

Code:
\`\`\`${language}
${artifact.content}
\`\`\`

Please fix the import statement. Ensure all libraries are:
1. Available in approved libraries
2. Imported correctly
3. Used properly`,

  unknown: `The following ${artifact.type} has an error:

Error: ${error.message}

Code:
\`\`\`${language}
${artifact.content}
\`\`\`

Please analyze and fix the error. Provide corrected code.`
};

const generateFixPrompt = (
  artifact: Artifact,
  error: ArtifactError
): string => {
  const template = FIX_TEMPLATES[error.type];

  return template
    .replace('${artifact.type}', artifact.type)
    .replace('${error.message}', error.message)
    .replace('${error.line}', error.line?.toString() || '')
    .replace('${error.code}', error.code || '')
    .replace('${error.stack}', error.stack || '')
    .replace('${language}', artifact.language || 'javascript')
    .replace('${artifact.content}', artifact.content);
};
```

**UI Integration (3-4 hours):**
```typescript
// Complexity: Low-Medium

const ArtifactErrorBoundary = ({ children, artifact, messageId }) => {
  const [error, setError] = useState<ArtifactError | null>(null);
  const { sendMessage } = useChatMessages();
  const [isFixing, setIsFixing] = useState(false);

  const handleError = (error: Error) => {
    const categorized = categorizeError(error);
    setError(categorized);
  };

  const handleFixWithAI = async () => {
    setIsFixing(true);

    const fixPrompt = generateFixPrompt(artifact, error);

    // Send as user message + auto-stream response
    await sendMessage({
      content: `[Auto-fix request]\n\n${fixPrompt}`,
      auto_apply: true // Flag to auto-update artifact
    });

    setIsFixing(false);
    setError(null); // Clear error (will re-throw if fix fails)
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <ArtifactErrorFallback
          error={error}
          onRetry={() => setError(null)}
          onFixWithAI={handleFixWithAI}
          isFixing={isFixing}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
};

const ArtifactErrorFallback = ({ error, onRetry, onFixWithAI, isFixing }) => {
  return (
    <div className="artifact-error">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h3 className="text-lg font-semibold mt-4">
        Artifact Error ({error.type})
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        {error.message}
      </p>

      {error.line && (
        <pre className="mt-4 p-4 bg-muted rounded">
          Line {error.line}: {error.code}
        </pre>
      )}

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={onRetry}>
          <RefreshIcon className="mr-2" />
          Retry
        </Button>

        <Button
          onClick={onFixWithAI}
          disabled={isFixing}
        >
          <SparklesIcon className="mr-2" />
          {isFixing ? 'Fixing...' : 'Try Fixing with Claude'}
        </Button>
      </div>

      {error.suggestion && (
        <Alert className="mt-4">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Suggestion</AlertTitle>
          <AlertDescription>{error.suggestion}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
```

**Auto-Apply Fix (2-3 hours):**
```typescript
// Complexity: Medium
// Challenge: Apply fix without manual copy-paste

const useChatMessages = (sessionId: string) => {
  // ... existing code ...

  const sendMessage = async ({
    content,
    auto_apply = false
  }) => {
    const response = await streamMessage(content);

    if (auto_apply) {
      // Extract artifact from response
      const fixedArtifact = extractArtifacts(response)[0];

      if (fixedArtifact) {
        // Update original message's artifact
        await updateArtifact(originalMessageId, fixedArtifact);

        toast({
          title: 'Artifact Fixed',
          description: 'The error has been resolved'
        });
      }
    }

    return response;
  };

  return { sendMessage, /* ... */ };
};

// Challenge: Identify which artifact to update
// Solution: Pass artifact ID in auto-fix request
```

#### Risks & Challenges

**Risk 1: Fix Doesn't Work** 🟡 Medium Risk
```typescript
// AI generates fix, but error persists
// Solutions:
// 1. Catch new error, show both old and new
// 2. Offer "Revert" button
// 3. Try again with more context
// 4. Show diff between original and fix

const handleFixFailure = (originalError, newError) => {
  return {
    type: 'fix_failed',
    original: originalError,
    attempted: newError,
    actions: ['revert', 'try_again', 'manual_edit']
  };
};
```

**Risk 2: Infinite Loop** 🟢 Low Risk
```typescript
// User clicks "Fix" repeatedly, generating many requests
// Solutions:
// 1. Disable button while fixing
// 2. Rate limit (max 3 fix attempts per artifact)
// 3. Add cooldown (10 seconds between fixes)

const FIX_RATE_LIMIT = {
  max_attempts: 3,
  cooldown: 10000 // 10 seconds
};
```

**Risk 3: Context Loss** 🟢 Low Risk
```typescript
// Fix might change artifact meaning/functionality
// Solutions:
// 1. Show diff before applying
// 2. Require user confirmation
// 3. Create new version (don't overwrite)

const confirmFix = (original, fixed) => {
  return (
    <Dialog>
      <DialogTitle>Review Fix</DialogTitle>
      <DiffViewer
        original={original}
        fixed={fixed}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onApply}>
          Apply Fix
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
```

#### Testing Complexity: 🟡 Medium
- Unit tests for error categorization (15+ tests)
- Unit tests for prompt generation (10+ tests)
- Integration tests for auto-apply (10+ tests)
- E2E tests for fix workflow (15+ tests)
- Test various error types (syntax, runtime, import, etc.)

#### Gotchas
1. **Error detection timing** - Errors might occur after delay (async)
2. **Multiple errors** - Artifact has 2+ errors, which to fix first?
3. **User edits** - User manually edits while AI is fixing (race condition)
4. **Fix introduces new error** - Need rollback capability
5. **Token usage** - Repeated fixes consume tokens quickly

#### Recommended Approach
```typescript
const errorFixing = {
  phase1: {
    features: ['error detection', 'fix button', 'basic prompts'],
    time: '6-8 hours',
    risk: 'low'
  },
  phase2: {
    features: ['auto-apply', 'version creation', 'diff view'],
    time: '4-6 hours',
    risk: 'medium'
  },
  phase3: {
    features: ['smart suggestions', 'multi-error handling', 'analytics'],
    time: '2-4 hours',
    risk: 'low'
  }
};
```

**Estimated Time:** 8-12 hours
**Confidence Level:** High (80%)
**ROI:** Medium - Nice UX improvement, reduces frustration

---

## Phase 3: Advanced Features (Nice-to-Have)

### 3.1 File Upload to Artifacts

**Complexity: 🟡 Medium**

**Estimated Time:** 12-16 hours
**Confidence Level:** Medium (70%)
**ROI:** Low-Medium - Limited use cases, but useful for certain workflows

**Key Challenges:**
- File parsing (PDF extraction, image OCR, code file parsing)
- Large file handling (10MB+ PDFs)
- Security (malware scanning, content validation)
- Storage costs (files stored in Supabase storage)

**Implementation Notes:**
- Leverage existing file upload infrastructure
- Add parsers for PDF (pdf-parse), images (Tesseract OCR), code files
- Stream file content to AI for artifact generation
- Store files in Supabase storage with references

---

### 3.2 Artifact Analytics

**Complexity: 🟡 Medium**

**Estimated Time:** 8-12 hours
**Confidence Level:** High (80%)
**ROI:** Low - Nice-to-have metrics, not critical

**Key Challenges:**
- Database design (time-series data, indexing)
- Privacy (anonymize viewer IPs, GDPR compliance)
- Performance (bulk insert analytics events)
- Visualization (charts, graphs, trends)

**Implementation Notes:**
```sql
CREATE TABLE artifact_analytics (
  id UUID PRIMARY KEY,
  artifact_id UUID REFERENCES published_artifacts(id),
  event_type TEXT, -- 'view', 'fork', 'embed_load'
  viewer_id UUID, -- Nullable for anonymous
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP
);

-- Aggregate queries
SELECT
  artifact_id,
  COUNT(*) FILTER (WHERE event_type = 'view') as views,
  COUNT(*) FILTER (WHERE event_type = 'fork') as forks,
  COUNT(*) FILTER (WHERE event_type = 'embed_load') as embeds
FROM artifact_analytics
GROUP BY artifact_id;
```

---

### 3.3 Artifact Templates Gallery

**Complexity: 🟠 High**

**Estimated Time:** 16-24 hours
**Confidence Level:** Medium (65%)
**ROI:** Medium - Good for discoverability and user engagement

**Key Challenges:**
- Curation (which templates to feature?)
- Search & filtering (by type, category, popularity)
- Template versioning (update templates over time)
- User-submitted templates (moderation required)
- SEO optimization (discoverable via search engines)

**Implementation Notes:**
```typescript
// Database schema
interface Template {
  id: string;
  title: string;
  description: string;
  type: ArtifactType;
  category: string; // 'UI Components', 'Data Viz', 'Games', etc.
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail_url: string;
  artifact_content: string;
  use_count: number;
  featured: boolean;
  created_at: Date;
}

// UI components
// - Template gallery (grid view with thumbnails)
// - Category filter (sidebar navigation)
// - Search (Algolia or similar)
// - Template preview (modal with live artifact)
// - "Use Template" button (creates new session)
```

---

## Summary: Complexity Matrix

| Feature | Complexity | Time | Confidence | ROI | Risk | Priority |
|---------|-----------|------|-----------|-----|------|----------|
| **Phase 1** |
| Automatic Detection | 🟡 Medium | 8-12h | 80% | ⭐⭐⭐⭐⭐ | 🟡 Medium | **HIGHEST** |
| Version Control | 🟠 High | 16-24h | 65% | ⭐⭐⭐⭐⭐ | 🟠 High | **HIGH** |
| Publishing & Sharing | 🔴 Critical | 24-32h | 50% | ⭐⭐⭐⭐ | 🔴 Critical | **HIGH** |
| **Phase 2** |
| Multi-Artifact | 🟡 Medium | 16-24h | 75% | ⭐⭐⭐⭐ | 🟡 Medium | MEDIUM |
| Remix/Customize | 🟡 Medium | 12-16h | 75% | ⭐⭐⭐ | 🟡 Medium | MEDIUM |
| AI Error Fixing | 🟢 Low-Med | 8-12h | 80% | ⭐⭐⭐ | 🟢 Low | MEDIUM |
| **Phase 3** |
| File Upload | 🟡 Medium | 12-16h | 70% | ⭐⭐ | 🟡 Medium | LOW |
| Analytics | 🟡 Medium | 8-12h | 80% | ⭐⭐ | 🟢 Low | LOW |
| Templates Gallery | 🟠 High | 16-24h | 65% | ⭐⭐⭐ | 🟡 Medium | LOW |

---

## Recommended Implementation Order

### Week 1-2: Foundation Phase
1. **Automatic Detection** (8-12h) - Immediate UX win, low risk
2. **Version Control** (16-24h) - Core feature, enables fearless editing

### Week 3-4: Publishing (with caution)
3. **Publishing & Sharing** (24-32h) - High value, but security-critical
   - Consider launching "Team-only sharing" first
   - Defer public publishing until security hardened

### Week 5-6: Enhanced Experience
4. **Multi-Artifact** (16-24h) - Power user feature
5. **AI Error Fixing** (8-12h) - Quick win, reduces friction
6. **Remix/Customize** (12-16h) - Collaborative feature

### Week 7+: Advanced Features (as needed)
7. **Analytics** (8-12h) - Metrics for growth
8. **File Upload** (12-16h) - Niche use case
9. **Templates Gallery** (16-24h) - Discovery & engagement

---

## Risk Mitigation Strategies

### For High-Risk Features (Publishing, Version Control)

**1. Feature Flags**
```typescript
const FEATURE_FLAGS = {
  automatic_detection: true,
  version_control: true,
  publishing: false,           // Launch to beta users first
  public_publishing: false,    // Launch team-only first
  multi_artifact: false,
  remix: false,
  ai_error_fixing: true
};
```

**2. Gradual Rollout**
- Week 1: Internal testing (team only)
- Week 2: Beta users (opt-in)
- Week 3: 10% of users (A/B test)
- Week 4: 50% of users
- Week 5: 100% rollout

**3. Monitoring & Alerts**
```typescript
// Track key metrics
const METRICS = {
  artifact_creation_rate: 'artifacts created per session',
  version_control_usage: 'versions created per artifact',
  publishing_rate: 'artifacts published per day',
  error_rate: 'artifact errors per 100 renders',
  fix_success_rate: 'successful AI fixes per attempt'
};

// Alert on anomalies
if (error_rate > 5%) {
  alert('High artifact error rate detected');
}

if (publishing_rate > 100) {
  alert('Potential publishing abuse');
}
```

**4. Circuit Breakers**
```typescript
// Disable features if errors spike
const CIRCUIT_BREAKER_THRESHOLDS = {
  publishing: { error_rate: 10%, timeout: 5000 },
  version_control: { error_rate: 15%, timeout: 3000 },
  ai_error_fixing: { error_rate: 25%, timeout: 2000 }
};

// Auto-disable feature if threshold exceeded
if (feature_error_rate > threshold) {
  disableFeature(feature_name);
  notifyTeam('Circuit breaker triggered for ' + feature_name);
}
```

---

## Conclusion

This complexity analysis reveals:

**Easiest Wins:**
- 🟢 Automatic Detection - Medium complexity, very high ROI
- 🟢 AI Error Fixing - Low-medium complexity, good ROI

**Strategic Investments:**
- 🟡 Version Control - High complexity but essential for quality UX
- 🟡 Multi-Artifact - Medium complexity, significant workflow improvement

**Proceed with Caution:**
- 🔴 Publishing & Sharing - Critical complexity, high security risk
  - Recommend team-only launch first
  - Delay public publishing until security hardened

**Key Takeaway:** Start with automatic detection + version control (Phase 1), which provides massive UX improvements with manageable risk. Publishing can be added incrementally, starting with authenticated team sharing before expanding to public.
