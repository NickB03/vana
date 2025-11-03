# Artifact Enhancement Implementation Plan
## Comprehensive Technical Specification & Execution Strategy

**Created:** November 2, 2025
**Status:** Pending Peer Review
**Scope:** All features except public sharing (team-only sharing included)
**Estimated Timeline:** 12-16 weeks
**Total Effort:** 120-172 hours

---

## Executive Summary

This plan outlines the complete implementation of artifact enhancements to bring our system in line with Claude.ai's capabilities while maintaining our security-first approach. We will implement features in 3 phases with continuous testing, monitoring, and iterative improvements.

**Key Features:**
1. ✅ Automatic artifact detection and triggering
2. ✅ Complete version control system with history
3. ✅ Multi-artifact support in conversations
4. ✅ Remix/customize functionality with attribution
5. ✅ AI-powered error fixing
6. ✅ Team-only artifact sharing (authenticated)
7. ⏸️ Public sharing (deferred for security hardening)

**Success Criteria:**
- 40% increase in artifact usage
- 90% user satisfaction with version control
- <200ms artifact load times
- Zero security vulnerabilities
- 95% test coverage on new features

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Foundation](#phase-1-foundation-weeks-1-4)
3. [Phase 2: Enhanced Experience](#phase-2-enhanced-experience-weeks-5-8)
4. [Phase 3: Collaboration](#phase-3-collaboration-weeks-9-12)
5. [Testing Strategy](#testing-strategy)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Migration & Rollback](#migration--rollback)
9. [Monitoring & Analytics](#monitoring--analytics)
10. [Success Metrics](#success-metrics)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Interface                           │
│  ┌───────────────────┐         ┌─────────────────────────┐ │
│  │  Message List     │         │   Artifact Canvas       │ │
│  │  - User msgs      │◄────────┤   - Active Artifact     │ │
│  │  - AI responses   │         │   - Version Selector    │ │
│  │  - Artifact refs  │         │   - Multi-Artifact Tabs │ │
│  └───────────────────┘         └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   State Management Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │useChatMessage│  │useArtifact   │  │useArtifact       │ │
│  │              │  │Versions      │  │Sharing           │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Parser & Validation Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │artifactParser│  │artifactValid │  │autoDetector      │ │
│  │              │  │              │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  chat_messages                                        │  │
│  │  - id, session_id, role, content, created_at        │  │
│  │  - forked_from_message_id (NEW)                     │  │
│  │  - fork_attribution (NEW)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  artifact_versions (NEW)                             │  │
│  │  - id, message_id, version_number, content          │  │
│  │  - content_hash, artifact_type, created_at          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  team_shared_artifacts (NEW)                         │  │
│  │  - id, share_id, user_id, message_id, version       │  │
│  │  - allowed_user_ids, view_count, created_at         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- shadcn/ui component library
- TanStack Query for state management
- Tailwind CSS for styling

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security (RLS) policies
- Real-time subscriptions
- Edge Functions (if needed)

**Libraries & Tools:**
- `diff-match-patch` - Text diffing
- `react-diff-viewer-continued` - UI diff display
- `nanoid` - Share ID generation
- `zod` - Schema validation
- `@testing-library/react` - Component testing
- `vitest` - Unit testing
- `playwright` - E2E testing

### Key Design Decisions

**1. Version Storage Strategy**
```typescript
// Decision: Store full content, not diffs
// Rationale: Simpler retrieval, faster version switching
// Trade-off: More storage, but with compression acceptable

interface ArtifactVersion {
  id: string;
  message_id: string;
  version_number: number;
  artifact_type: string;
  artifact_title: string;
  artifact_content: string;      // Full content
  content_hash: string;           // For deduplication
  created_at: Date;
}

// Retention policy: Keep last 20 versions, compress older
```

**2. Multi-Artifact State Management**
```typescript
// Decision: Context API + React Query
// Rationale: Avoid Redux complexity, leverage existing Query setup
// Trade-off: More re-renders, but manageable with memoization

const ArtifactContext = createContext<{
  artifacts: Artifact[];
  activeArtifactId: string | null;
  setActiveArtifact: (id: string) => void;
}>({
  artifacts: [],
  activeArtifactId: null,
  setActiveArtifact: () => {}
});
```

**3. Automatic Detection Algorithm**
```typescript
// Decision: Heuristic-based with progressive enhancement
// Rationale: Start simple, add ML later if needed
// Trade-off: Some false positives/negatives initially

const detectionStrategy = {
  phase1: 'rule_based',      // Line count, code fences, HTML tags
  phase2: 'pattern_based',   // Intent patterns, semantic analysis
  phase3: 'ml_based'         // Fine-tuned model (future)
};
```

**4. Sharing Model**
```typescript
// Decision: Team-only first, defer public sharing
// Rationale: Minimize security risk, validate system first
// Trade-off: Less viral growth, but safer launch

const sharingModels = {
  phase1: 'team_only',       // Authenticated users in same org
  phase2: 'link_sharing',    // Anyone with link (authenticated)
  phase3: 'public',          // Search indexed, embeddable (deferred)
};
```

---

## Phase 1: Foundation (Weeks 1-4)

### Week 1: Automatic Artifact Detection

**Goal:** Enable AI to automatically create artifacts without manual XML tags

#### 1.1 Detection Heuristics

**File:** `src/utils/artifactAutoDetector.ts`

```typescript
/**
 * Artifact Auto-Detection System
 *
 * Analyzes content to determine if it should be rendered as an artifact
 * Uses multiple heuristics: line count, structure, patterns, context
 */

import { ArtifactType } from '@/types/artifact';

interface DetectionResult {
  shouldCreateArtifact: boolean;
  confidence: number; // 0-1
  suggestedType: ArtifactType | null;
  suggestedTitle: string | null;
  reason: string;
}

interface DetectionContext {
  content: string;
  conversationHistory?: string[];
  userIntent?: string;
  previousArtifacts?: string[];
}

export class ArtifactAutoDetector {
  private readonly LINE_THRESHOLD = 15;
  private readonly CODE_FENCE_REGEX = /```(\w+)?\n([\s\S]+?)\n```/g;
  private readonly HTML_TAG_REGEX = /<(html|body|div|head|script|style)/i;
  private readonly REACT_IMPORT_REGEX = /import\s+.*\s+from\s+['"]react['"]/i;
  private readonly SVG_TAG_REGEX = /<svg[\s\S]*<\/svg>/i;
  private readonly MERMAID_REGEX = /```mermaid\n([\s\S]+?)\n```/;

  /**
   * Main detection method
   */
  detect(context: DetectionContext): DetectionResult {
    const { content } = context;

    // Check explicit artifact tags first (backward compatibility)
    if (this.hasExplicitArtifactTag(content)) {
      return {
        shouldCreateArtifact: true,
        confidence: 1.0,
        suggestedType: this.extractExplicitType(content),
        suggestedTitle: this.extractExplicitTitle(content),
        reason: 'explicit_tag'
      };
    }

    // Heuristic 1: Code blocks
    const codeBlockMatch = this.detectCodeBlock(content);
    if (codeBlockMatch) {
      return codeBlockMatch;
    }

    // Heuristic 2: HTML content
    const htmlMatch = this.detectHTML(content);
    if (htmlMatch) {
      return htmlMatch;
    }

    // Heuristic 3: SVG graphics
    const svgMatch = this.detectSVG(content);
    if (svgMatch) {
      return svgMatch;
    }

    // Heuristic 4: Mermaid diagrams
    const mermaidMatch = this.detectMermaid(content);
    if (mermaidMatch) {
      return mermaidMatch;
    }

    // Heuristic 5: React components
    const reactMatch = this.detectReactComponent(content);
    if (reactMatch) {
      return reactMatch;
    }

    // Heuristic 6: Complex markdown documents
    const markdownMatch = this.detectComplexMarkdown(content);
    if (markdownMatch) {
      return markdownMatch;
    }

    // Heuristic 7: Intent-based detection
    const intentMatch = this.detectFromIntent(context);
    if (intentMatch) {
      return intentMatch;
    }

    // No artifact detected
    return {
      shouldCreateArtifact: false,
      confidence: 0,
      suggestedType: null,
      suggestedTitle: null,
      reason: 'no_match'
    };
  }

  private detectCodeBlock(content: string): DetectionResult | null {
    const matches = [...content.matchAll(this.CODE_FENCE_REGEX)];

    if (matches.length === 0) return null;

    // Single large code block
    if (matches.length === 1) {
      const [fullMatch, language, code] = matches[0];
      const lineCount = code.split('\n').length;

      if (lineCount >= this.LINE_THRESHOLD) {
        return {
          shouldCreateArtifact: true,
          confidence: 0.9,
          suggestedType: 'application/vnd.ant.code',
          suggestedTitle: this.inferTitleFromCode(code, language),
          reason: 'large_code_block'
        };
      }
    }

    // Multiple code blocks (tutorial/guide)
    if (matches.length >= 3) {
      const totalLines = matches.reduce((sum, match) => {
        return sum + match[2].split('\n').length;
      }, 0);

      if (totalLines >= this.LINE_THRESHOLD) {
        return {
          shouldCreateArtifact: true,
          confidence: 0.8,
          suggestedType: 'text/markdown',
          suggestedTitle: 'Code Tutorial',
          reason: 'multiple_code_blocks'
        };
      }
    }

    return null;
  }

  private detectHTML(content: string): DetectionResult | null {
    // Look for HTML tags outside of code fences
    const contentWithoutCodeBlocks = content.replace(this.CODE_FENCE_REGEX, '');

    if (!this.HTML_TAG_REGEX.test(contentWithoutCodeBlocks)) {
      return null;
    }

    // Check if it's a complete HTML document
    const hasHtmlTag = /<html/i.test(contentWithoutCodeBlocks);
    const hasBodyTag = /<body/i.test(contentWithoutCodeBlocks);

    if (hasHtmlTag || hasBodyTag) {
      return {
        shouldCreateArtifact: true,
        confidence: 0.95,
        suggestedType: 'text/html',
        suggestedTitle: this.extractHTMLTitle(contentWithoutCodeBlocks) || 'HTML Page',
        reason: 'html_document'
      };
    }

    // Check for substantial HTML content (widget, component)
    const lineCount = contentWithoutCodeBlocks.split('\n').length;
    if (lineCount >= 10) {
      return {
        shouldCreateArtifact: true,
        confidence: 0.85,
        suggestedType: 'text/html',
        suggestedTitle: 'HTML Widget',
        reason: 'html_content'
      };
    }

    return null;
  }

  private detectReactComponent(content: string): DetectionResult | null {
    if (!this.REACT_IMPORT_REGEX.test(content)) {
      return null;
    }

    // Extract component name from export default or function name
    const componentName = this.extractReactComponentName(content);

    return {
      shouldCreateArtifact: true,
      confidence: 0.95,
      suggestedType: 'application/vnd.ant.react',
      suggestedTitle: componentName || 'React Component',
      reason: 'react_component'
    };
  }

  private detectSVG(content: string): DetectionResult | null {
    const match = content.match(this.SVG_TAG_REGEX);

    if (!match) return null;

    return {
      shouldCreateArtifact: true,
      confidence: 1.0,
      suggestedType: 'image/svg+xml',
      suggestedTitle: 'SVG Graphic',
      reason: 'svg_content'
    };
  }

  private detectMermaid(content: string): DetectionResult | null {
    const match = content.match(this.MERMAID_REGEX);

    if (!match) return null;

    const diagramType = this.inferMermaidType(match[1]);

    return {
      shouldCreateArtifact: true,
      confidence: 1.0,
      suggestedType: 'application/vnd.ant.mermaid',
      suggestedTitle: `${diagramType} Diagram`,
      reason: 'mermaid_diagram'
    };
  }

  private detectComplexMarkdown(content: string): DetectionResult | null {
    const lineCount = content.split('\n').length;

    if (lineCount < this.LINE_THRESHOLD) return null;

    // Check for document structure (headers, lists, tables)
    const hasHeaders = /^#{1,6}\s+/m.test(content);
    const hasLists = /^[\*\-\+]\s+/m.test(content);
    const hasTables = /\|.*\|/m.test(content);

    const structureScore = [hasHeaders, hasLists, hasTables].filter(Boolean).length;

    if (structureScore >= 2) {
      return {
        shouldCreateArtifact: true,
        confidence: 0.75,
        suggestedType: 'text/markdown',
        suggestedTitle: this.extractMarkdownTitle(content) || 'Document',
        reason: 'structured_document'
      };
    }

    return null;
  }

  private detectFromIntent(context: DetectionContext): DetectionResult | null {
    const { content, userIntent, conversationHistory } = context;

    // Keywords that indicate artifact creation intent
    const intentPatterns = [
      /create\s+(a|an)\s+(.+)/i,
      /build\s+(a|an)\s+(.+)/i,
      /make\s+(a|an)\s+(.+)/i,
      /generate\s+(.+)/i,
      /show\s+me\s+(a|an)\s+(.+)/i,
      /write\s+(a|an)\s+(.+)/i,
      /design\s+(a|an)\s+(.+)/i
    ];

    // Check user intent (previous message in conversation)
    const previousMessage = conversationHistory?.[conversationHistory.length - 1];

    if (previousMessage) {
      for (const pattern of intentPatterns) {
        if (pattern.test(previousMessage)) {
          // User asked to create something, response likely should be artifact
          const lineCount = content.split('\n').length;

          if (lineCount >= 5) {
            return {
              shouldCreateArtifact: true,
              confidence: 0.7,
              suggestedType: this.inferTypeFromIntent(previousMessage),
              suggestedTitle: this.extractSubjectFromIntent(previousMessage),
              reason: 'intent_based'
            };
          }
        }
      }
    }

    return null;
  }

  // Helper methods
  private hasExplicitArtifactTag(content: string): boolean {
    return /<artifact\s+type="/.test(content);
  }

  private extractExplicitType(content: string): ArtifactType {
    const match = content.match(/<artifact\s+type="([^"]+)"/);
    return (match?.[1] as ArtifactType) || 'application/vnd.ant.code';
  }

  private extractExplicitTitle(content: string): string {
    const match = content.match(/<artifact\s+.*title="([^"]+)"/);
    return match?.[1] || 'Untitled';
  }

  private inferTitleFromCode(code: string, language: string | undefined): string {
    // Try to extract function/class name
    const functionMatch = code.match(/function\s+(\w+)/);
    if (functionMatch) return functionMatch[1];

    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];

    const constMatch = code.match(/const\s+(\w+)\s*=/);
    if (constMatch) return constMatch[1];

    return language ? `${language} Code` : 'Code Snippet';
  }

  private extractHTMLTitle(html: string): string | null {
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match?.[1] || null;
  }

  private extractReactComponentName(content: string): string | null {
    // Try export default function ComponentName
    let match = content.match(/export\s+default\s+function\s+(\w+)/);
    if (match) return match[1];

    // Try function ComponentName
    match = content.match(/function\s+(\w+)\s*\([^)]*\)\s*{/);
    if (match && /^[A-Z]/.test(match[1])) return match[1];

    // Try const ComponentName =
    match = content.match(/const\s+(\w+)\s*=\s*\(/);
    if (match && /^[A-Z]/.test(match[1])) return match[1];

    return null;
  }

  private inferMermaidType(diagram: string): string {
    if (diagram.includes('graph')) return 'Flowchart';
    if (diagram.includes('sequenceDiagram')) return 'Sequence';
    if (diagram.includes('classDiagram')) return 'Class';
    if (diagram.includes('gantt')) return 'Gantt';
    if (diagram.includes('pie')) return 'Pie Chart';
    return 'Mermaid';
  }

  private extractMarkdownTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1] || null;
  }

  private inferTypeFromIntent(intent: string): ArtifactType {
    if (/button|component|widget/i.test(intent)) {
      return 'application/vnd.ant.react';
    }
    if (/page|website|html/i.test(intent)) {
      return 'text/html';
    }
    if (/diagram|flowchart|chart/i.test(intent)) {
      return 'application/vnd.ant.mermaid';
    }
    if (/document|guide|tutorial/i.test(intent)) {
      return 'text/markdown';
    }
    return 'application/vnd.ant.code';
  }

  private extractSubjectFromIntent(intent: string): string {
    const patterns = [
      /create\s+(?:a|an)\s+(.+)/i,
      /build\s+(?:a|an)\s+(.+)/i,
      /make\s+(?:a|an)\s+(.+)/i,
      /generate\s+(.+)/i
    ];

    for (const pattern of patterns) {
      const match = intent.match(pattern);
      if (match) {
        return this.capitalizeFirst(match[1]);
      }
    }

    return 'Artifact';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export singleton instance
export const artifactAutoDetector = new ArtifactAutoDetector();
```

#### 1.2 Integration with Parser

**File:** `src/utils/artifactParser.ts` (modification)

```typescript
import { artifactAutoDetector } from './artifactAutoDetector';

export function extractArtifacts(
  content: string,
  context?: {
    conversationHistory?: string[];
    userIntent?: string;
  }
): Artifact[] {
  const artifacts: Artifact[] = [];

  // 1. Check for explicit artifact tags (existing logic)
  const explicitArtifacts = extractExplicitArtifacts(content);
  artifacts.push(...explicitArtifacts);

  // 2. If no explicit artifacts, try auto-detection
  if (artifacts.length === 0) {
    const detection = artifactAutoDetector.detect({
      content,
      conversationHistory: context?.conversationHistory,
      userIntent: context?.userIntent
    });

    if (detection.shouldCreateArtifact && detection.confidence >= 0.7) {
      artifacts.push({
        id: generateId(),
        type: detection.suggestedType!,
        title: detection.suggestedTitle!,
        content: extractArtifactContent(content, detection),
        language: inferLanguage(detection.suggestedType!),
        autoGenerated: true,
        detectionReason: detection.reason
      });
    }
  }

  return artifacts;
}
```

#### 1.3 Testing

**File:** `src/utils/__tests__/artifactAutoDetector.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { artifactAutoDetector } from '../artifactAutoDetector';

describe('ArtifactAutoDetector', () => {
  describe('Code Block Detection', () => {
    it('should detect large code blocks', () => {
      const content = '```javascript\n' +
        'function test() {\n'.repeat(20) +
        '}\n```';

      const result = artifactAutoDetector.detect({ content });

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('application/vnd.ant.code');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should not detect small code snippets', () => {
      const content = '```javascript\nconst x = 1;\n```';

      const result = artifactAutoDetector.detect({ content });

      expect(result.shouldCreateArtifact).toBe(false);
    });
  });

  describe('HTML Detection', () => {
    it('should detect complete HTML documents', () => {
      const content = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Hello</h1>
</body>
</html>`;

      const result = artifactAutoDetector.detect({ content });

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('text/html');
      expect(result.suggestedTitle).toBe('Test Page');
    });
  });

  describe('React Component Detection', () => {
    it('should detect React components', () => {
      const content = `
import { Button } from "@/components/ui/button"

export default function MyButton() {
  return <Button>Click me</Button>
}`;

      const result = artifactAutoDetector.detect({ content });

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('application/vnd.ant.react');
      expect(result.suggestedTitle).toBe('MyButton');
    });
  });

  describe('Intent-Based Detection', () => {
    it('should detect from user intent', () => {
      const result = artifactAutoDetector.detect({
        content: 'function calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}\n\nfunction applyDiscount(total, discount) {\n  return total * (1 - discount);\n}',
        conversationHistory: [
          'Create a shopping cart calculator',
          'Sure, here are the functions:'
        ]
      });

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });
});
```

#### 1.4 Deliverables (Week 1)

- ✅ `artifactAutoDetector.ts` - Complete detection system
- ✅ Updated `artifactParser.ts` - Integration with auto-detection
- ✅ Unit tests with 95%+ coverage
- ✅ Integration tests with existing chat flow
- ✅ Documentation for detection heuristics
- ✅ Feature flag: `VITE_ENABLE_AUTO_DETECTION`

**Time Estimate:** 8-12 hours
**Risk Level:** Low-Medium

---

### Week 2-3: Version Control System

**Goal:** Complete version history for artifacts with revert capability

#### 2.1 Database Schema

**Migration:** `supabase/migrations/20251102_artifact_versions.sql`

```sql
-- Create artifact_versions table
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_message_version UNIQUE(message_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_artifact_versions_message
  ON artifact_versions(message_id);

CREATE INDEX idx_artifact_versions_created_at
  ON artifact_versions(created_at DESC);

CREATE INDEX idx_artifact_versions_hash
  ON artifact_versions(content_hash);

-- Enable RLS
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access versions of their own messages
CREATE POLICY "Users can view their own artifact versions"
  ON artifact_versions FOR SELECT
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their messages"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Function to auto-create version on artifact update
CREATE OR REPLACE FUNCTION create_artifact_version()
RETURNS TRIGGER AS $$
DECLARE
  artifact_data JSONB;
  new_version_number INTEGER;
BEGIN
  -- Extract artifact from message content
  -- This is a simplified example; actual implementation needs proper parsing
  IF NEW.content ~ '<artifact' THEN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO new_version_number
    FROM artifact_versions
    WHERE message_id = NEW.id;

    -- Insert new version (actual parsing logic needed)
    -- This will be triggered by application layer
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on message update
CREATE TRIGGER artifact_version_trigger
  AFTER INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  WHEN (NEW.content ~ '<artifact')
  EXECUTE FUNCTION create_artifact_version();

-- Function to cleanup old versions (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_artifact_versions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep last 20 versions per artifact
  WITH versions_to_keep AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY message_id
               ORDER BY version_number DESC
             ) as rn
      FROM artifact_versions
    ) t
    WHERE rn <= 20
  )
  DELETE FROM artifact_versions
  WHERE id NOT IN (SELECT id FROM versions_to_keep)
  RETURNING * INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient version queries
CREATE INDEX idx_artifact_versions_window
  ON artifact_versions(message_id, version_number DESC);

COMMENT ON TABLE artifact_versions IS
  'Stores version history for artifacts with content hashing for deduplication';
COMMENT ON COLUMN artifact_versions.content_hash IS
  'SHA-256 hash of artifact_content for detecting duplicate versions';
COMMENT ON FUNCTION cleanup_old_artifact_versions() IS
  'Retention policy: keeps last 20 versions per artifact, can be run via cron';
```

#### 2.2 Version Management Hook

**File:** `src/hooks/useArtifactVersions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sha256 } from 'js-sha256';
import type { Artifact } from '@/types/artifact';

interface ArtifactVersion {
  id: string;
  message_id: string;
  version_number: number;
  artifact_type: string;
  artifact_title: string;
  artifact_content: string;
  artifact_language: string | null;
  content_hash: string;
  created_at: string;
}

interface UseArtifactVersionsOptions {
  messageId: string;
  artifact: Artifact;
  enabled?: boolean;
}

export function useArtifactVersions({
  messageId,
  artifact,
  enabled = true
}: UseArtifactVersionsOptions) {
  const queryClient = useQueryClient();
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  // Fetch all versions for this artifact
  const {
    data: versions = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['artifact-versions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artifact_versions')
        .select('*')
        .eq('message_id', messageId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as ArtifactVersion[];
    },
    enabled: enabled && !!messageId
  });

  // Set current version to latest on mount
  useEffect(() => {
    if (versions.length > 0 && currentVersion === null) {
      setCurrentVersion(versions[0].version_number);
    }
  }, [versions, currentVersion]);

  // Create new version
  const createVersionMutation = useMutation({
    mutationFn: async (content: string) => {
      const contentHash = sha256(content);

      // Check if this content already exists (deduplication)
      const latestVersion = versions[0];
      if (latestVersion && latestVersion.content_hash === contentHash) {
        console.log('Skipping duplicate version creation');
        return latestVersion;
      }

      // Get next version number
      const nextVersion = latestVersion ? latestVersion.version_number + 1 : 1;

      const { data, error } = await supabase
        .from('artifact_versions')
        .insert({
          message_id: messageId,
          version_number: nextVersion,
          artifact_type: artifact.type,
          artifact_title: artifact.title,
          artifact_content: content,
          artifact_language: artifact.language,
          content_hash: contentHash
        })
        .select()
        .single();

      if (error) throw error;
      return data as ArtifactVersion;
    },
    onSuccess: (newVersion) => {
      // Invalidate and refetch versions
      queryClient.invalidateQueries({
        queryKey: ['artifact-versions', messageId]
      });

      // Set current version to new version
      setCurrentVersion(newVersion.version_number);
    }
  });

  // Revert to specific version
  const revertToVersion = useCallback(
    (versionNumber: number) => {
      const version = versions.find(v => v.version_number === versionNumber);
      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      setCurrentVersion(versionNumber);
      return version;
    },
    [versions]
  );

  // Get current version data
  const currentVersionData = versions.find(
    v => v.version_number === currentVersion
  );

  // Get version diff
  const getVersionDiff = useCallback(
    (fromVersion: number, toVersion: number) => {
      const from = versions.find(v => v.version_number === fromVersion);
      const to = versions.find(v => v.version_number === toVersion);

      if (!from || !to) {
        throw new Error('Version not found for diff');
      }

      // Compute diff (will be used by DiffViewer component)
      return {
        from: from.artifact_content,
        to: to.artifact_content,
        fromVersion: from.version_number,
        toVersion: to.version_number
      };
    },
    [versions]
  );

  return {
    versions,
    currentVersion,
    currentVersionData,
    isLoading,
    error,
    createVersion: createVersionMutation.mutate,
    isCreatingVersion: createVersionMutation.isPending,
    revertToVersion,
    setCurrentVersion,
    getVersionDiff,
    hasVersions: versions.length > 0,
    versionCount: versions.length
  };
}
```

#### 2.3 Version Selector UI Component

**File:** `src/components/artifact/ArtifactVersionSelector.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ArtifactVersion } from '@/hooks/useArtifactVersions';

interface ArtifactVersionSelectorProps {
  versions: ArtifactVersion[];
  currentVersion: number;
  onVersionChange: (version: number) => void;
  onViewDiff?: (fromVersion: number, toVersion: number) => void;
}

export function ArtifactVersionSelector({
  versions,
  currentVersion,
  onVersionChange,
  onViewDiff
}: ArtifactVersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (versions.length === 0) return null;

  const currentIndex = versions.findIndex(
    v => v.version_number === currentVersion
  );
  const canGoPrevious = currentIndex < versions.length - 1;
  const canGoNext = currentIndex > 0;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onVersionChange(versions[currentIndex + 1].version_number);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onVersionChange(versions[currentIndex - 1].version_number);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          title="Previous version"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              <span>v{currentVersion}</span>
              <Badge variant="secondary" className="ml-1">
                {versions.length}
              </Badge>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Version History</h4>
                <p className="text-sm text-muted-foreground">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} saved
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      onVersionChange(version.version_number);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      version.version_number === currentVersion
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              index === 0 ? 'default' : 'secondary'
                            }
                          >
                            v{version.version_number}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline">Latest</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true
                          })}
                        </p>
                      </div>

                      {index < versions.length - 1 && onViewDiff && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDiff(
                              version.version_number,
                              versions[index + 1].version_number
                            );
                          }}
                        >
                          Diff
                        </Button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          title="Next version"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

#### 2.4 Diff Viewer Component

**File:** `src/components/artifact/ArtifactDiffViewer.tsx`

```typescript
import { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';

interface ArtifactDiffViewerProps {
  oldContent: string;
  newContent: string;
  oldVersion: number;
  newVersion: number;
  artifactType: string;
  onClose: () => void;
}

export function ArtifactDiffViewer({
  oldContent,
  newContent,
  oldVersion,
  newVersion,
  artifactType,
  onClose
}: ArtifactDiffViewerProps) {
  const { theme } = useTheme();
  const [splitView, setSplitView] = useState(true);
  const [compareMethod, setCompareMethod] = useState<DiffMethod>(
    DiffMethod.WORDS
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Compare Versions</span>
            <Badge variant="outline">v{oldVersion}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">v{newVersion}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={splitView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSplitView(true)}
            >
              Split View
            </Button>
            <Button
              variant={!splitView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSplitView(false)}
            >
              Unified View
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={compareMethod === DiffMethod.CHARS ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMethod(DiffMethod.CHARS)}
              >
                Char
              </Button>
              <Button
                variant={compareMethod === DiffMethod.WORDS ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMethod(DiffMethod.WORDS)}
              >
                Word
              </Button>
              <Button
                variant={compareMethod === DiffMethod.LINES ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMethod(DiffMethod.LINES)}
              >
                Line
              </Button>
            </div>
          </div>

          {/* Diff Display */}
          <div className="border rounded-lg overflow-hidden max-h-[calc(90vh-200px)] overflow-y-auto">
            <ReactDiffViewer
              oldValue={oldContent}
              newValue={newContent}
              splitView={splitView}
              compareMethod={compareMethod}
              useDarkTheme={theme === 'dark'}
              leftTitle={`Version ${oldVersion}`}
              rightTitle={`Version ${newVersion}`}
              styles={{
                variables: {
                  light: {
                    diffViewerBackground: '#fff',
                    diffViewerColor: '#000',
                    addedBackground: '#e6ffed',
                    addedColor: '#24292e',
                    removedBackground: '#ffeef0',
                    removedColor: '#24292e',
                    wordAddedBackground: '#acf2bd',
                    wordRemovedBackground: '#fdb8c0',
                    addedGutterBackground: '#cdffd8',
                    removedGutterBackground: '#ffdce0',
                    gutterBackground: '#f6f8fa',
                    gutterBackgroundDark: '#f3f4f6',
                    highlightBackground: '#fffbdd',
                    highlightGutterBackground: '#fff5b1',
                  },
                  dark: {
                    diffViewerBackground: '#0d1117',
                    diffViewerColor: '#e6edf3',
                    addedBackground: '#033a16',
                    addedColor: '#e6edf3',
                    removedBackground: '#5a1e20',
                    removedColor: '#e6edf3',
                    wordAddedBackground: '#04660e',
                    wordRemovedBackground: '#a40e26',
                    addedGutterBackground: '#033a16',
                    removedGutterBackground: '#5a1e20',
                    gutterBackground: '#161b22',
                    gutterBackgroundDark: '#0d1117',
                    highlightBackground: '#6e40c9',
                    highlightGutterBackground: '#6e40c9',
                  },
                },
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 2.5 Integration with Artifact Component

**File:** `src/components/Artifact.tsx` (modifications)

```typescript
// Add version control integration
import { useArtifactVersions } from '@/hooks/useArtifactVersions';
import { ArtifactVersionSelector } from './artifact/ArtifactVersionSelector';
import { ArtifactDiffViewer } from './artifact/ArtifactDiffViewer';

export function Artifact({ messageId, artifact }: ArtifactProps) {
  const [showDiff, setShowDiff] = useState<{
    from: number;
    to: number;
  } | null>(null);

  const {
    versions,
    currentVersion,
    currentVersionData,
    createVersion,
    revertToVersion,
    setCurrentVersion,
    getVersionDiff
  } = useArtifactVersions({
    messageId,
    artifact,
    enabled: true
  });

  // Create version when artifact content changes
  useEffect(() => {
    if (artifact.content && !artifact.autoGenerated) {
      createVersion(artifact.content);
    }
  }, [artifact.content, artifact.autoGenerated, createVersion]);

  // Use current version content if available
  const displayContent = currentVersionData?.artifact_content || artifact.content;

  const handleViewDiff = (from: number, to: number) => {
    setShowDiff({ from, to });
  };

  return (
    <div className="artifact-container">
      {/* Version Selector */}
      {versions.length > 0 && (
        <div className="artifact-header flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{artifact.title}</h3>
            <Badge variant="outline">{artifact.type}</Badge>
          </div>

          <ArtifactVersionSelector
            versions={versions}
            currentVersion={currentVersion!}
            onVersionChange={setCurrentVersion}
            onViewDiff={handleViewDiff}
          />
        </div>
      )}

      {/* Artifact Content */}
      <ArtifactRenderer
        type={artifact.type}
        content={displayContent}
        language={artifact.language}
      />

      {/* Diff Viewer Modal */}
      {showDiff && (
        <ArtifactDiffViewer
          oldContent={getVersionDiff(showDiff.from, showDiff.to).from}
          newContent={getVersionDiff(showDiff.from, showDiff.to).to}
          oldVersion={showDiff.from}
          newVersion={showDiff.to}
          artifactType={artifact.type}
          onClose={() => setShowDiff(null)}
        />
      )}
    </div>
  );
}
```

#### 2.6 Deliverables (Week 2-3)

- ✅ Database migration with version table + RLS policies
- ✅ `useArtifactVersions` hook with full CRUD operations
- ✅ Version selector UI component
- ✅ Diff viewer component with syntax highlighting
- ✅ Integration with Artifact component
- ✅ Unit tests for version management
- ✅ E2E tests for version switching workflow
- ✅ Feature flag: `VITE_ENABLE_VERSION_CONTROL`

**Time Estimate:** 16-24 hours
**Risk Level:** Medium-High

---

### Week 4: Team-Only Artifact Sharing

**Goal:** Enable authenticated sharing within organization (no public access)

#### 4.1 Database Schema

**Migration:** `supabase/migrations/20251102_team_artifact_sharing.sql`

```sql
-- Create team_shared_artifacts table
CREATE TABLE team_shared_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message_id UUID NOT NULL REFERENCES chat_messages(id),
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  allowed_user_ids UUID[] DEFAULT '{}', -- Specific users (empty = all team members)
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_team_shared_artifacts_share_id
  ON team_shared_artifacts(share_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_team_shared_artifacts_user
  ON team_shared_artifacts(user_id);

CREATE INDEX idx_team_shared_artifacts_created_at
  ON team_shared_artifacts(created_at DESC);

-- Enable RLS
ALTER TABLE team_shared_artifacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shared artifacts if:
-- 1. They created it
-- 2. They're in allowed_user_ids (if specified)
-- 3. allowed_user_ids is empty (shared with entire team)
CREATE POLICY "Users can view team-shared artifacts"
  ON team_shared_artifacts FOR SELECT
  USING (
    is_active = TRUE AND (
      user_id = auth.uid() OR
      auth.uid() = ANY(allowed_user_ids) OR
      (allowed_user_ids = '{}' AND auth.uid() IS NOT NULL)
    )
  );

-- Policy: Users can manage their own shares
CREATE POLICY "Users manage their own shared artifacts"
  ON team_shared_artifacts FOR ALL
  USING (user_id = auth.uid());

-- Function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_share_view_count(share_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE team_shared_artifacts
  SET view_count = view_count + 1
  WHERE id = share_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique share ID
CREATE OR REPLACE FUNCTION generate_share_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  -- Try up to 10 times to generate unique ID
  FOR attempt IN 1..10 LOOP
    result := '';

    -- Generate 10-character ID
    FOR i IN 1..10 LOOP
      result := result || substring(chars, (random() * length(chars))::int + 1, 1);
    END LOOP;

    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM team_shared_artifacts WHERE share_id = result
    ) INTO exists_check;

    IF NOT exists_check THEN
      RETURN result;
    END IF;
  END LOOP;

  -- If still no unique ID, raise error
  RAISE EXCEPTION 'Failed to generate unique share ID after 10 attempts';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE team_shared_artifacts IS
  'Team-only artifact sharing (authenticated access only)';
COMMENT ON COLUMN team_shared_artifacts.allowed_user_ids IS
  'Empty array = shared with all team members. Non-empty = specific users only.';
```

#### 4.2 Sharing Hook

**File:** `src/hooks/useArtifactSharing.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Artifact } from '@/types/artifact';

interface TeamSharedArtifact {
  id: string;
  share_id: string;
  user_id: string;
  message_id: string;
  version_number: number;
  artifact_type: string;
  artifact_title: string;
  artifact_content: string;
  artifact_language: string | null;
  allowed_user_ids: string[];
  view_count: number;
  created_at: string;
  is_active: boolean;
}

export function useArtifactSharing() {
  const queryClient = useQueryClient();

  // Share artifact with team
  const shareArtifactMutation = useMutation({
    mutationFn: async ({
      messageId,
      artifact,
      versionNumber = 1,
      allowedUserIds = []
    }: {
      messageId: string;
      artifact: Artifact;
      versionNumber?: number;
      allowedUserIds?: string[];
    }) => {
      // Generate share ID via database function
      const { data: shareIdData } = await supabase.rpc('generate_share_id');

      if (!shareIdData) {
        throw new Error('Failed to generate share ID');
      }

      const { data, error } = await supabase
        .from('team_shared_artifacts')
        .insert({
          share_id: shareIdData,
          message_id: messageId,
          version_number: versionNumber,
          artifact_type: artifact.type,
          artifact_title: artifact.title,
          artifact_content: artifact.content,
          artifact_language: artifact.language,
          allowed_user_ids: allowedUserIds
        })
        .select()
        .single();

      if (error) throw error;
      return data as TeamSharedArtifact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shared-artifacts'] });
    }
  });

  // Fetch artifact by share ID
  const fetchSharedArtifactQuery = (shareId: string) => useQuery({
    queryKey: ['shared-artifact', shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_shared_artifacts')
        .select('*')
        .eq('share_id', shareId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Increment view count
      if (data) {
        await supabase.rpc('increment_share_view_count', {
          share_uuid: data.id
        });
      }

      return data as TeamSharedArtifact;
    },
    enabled: !!shareId
  });

  // Unshare (deactivate) artifact
  const unshareArtifactMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('team_shared_artifacts')
        .update({ is_active: false })
        .eq('share_id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shared-artifacts'] });
    }
  });

  // Get user's shared artifacts
  const mySharedArtifactsQuery = useQuery({
    queryKey: ['my-shared-artifacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_shared_artifacts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeamSharedArtifact[];
    }
  });

  return {
    shareArtifact: shareArtifactMutation.mutate,
    isSharing: shareArtifactMutation.isPending,
    shareError: shareArtifactMutation.error,
    fetchSharedArtifact: fetchSharedArtifactQuery,
    unshareArtifact: unshareArtifactMutation.mutate,
    isUnsharing: unshareArtifactMutation.isPending,
    mySharedArtifacts: mySharedArtifactsQuery.data || [],
    isLoadingMyShares: mySharedArtifactsQuery.isLoading
  };
}
```

#### 4.3 Share Modal Component

**File:** `src/components/artifact/ArtifactShareModal.tsx`

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Users, Link2 } from 'lucide-react';
import { useArtifactSharing } from '@/hooks/useArtifactSharing';
import type { Artifact } from '@/types/artifact';

interface ArtifactShareModalProps {
  artifact: Artifact;
  messageId: string;
  versionNumber: number;
  onClose: () => void;
}

export function ArtifactShareModal({
  artifact,
  messageId,
  versionNumber,
  onClose
}: ArtifactShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { shareArtifact, isSharing } = useArtifactSharing();

  const handleShare = async () => {
    shareArtifact(
      { messageId, artifact, versionNumber },
      {
        onSuccess: (data) => {
          const url = `${window.location.origin}/shared/${data.share_id}`;
          setShareUrl(url);
        }
      }
    );
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Artifact with Team</DialogTitle>
          <DialogDescription>
            Create a shareable link for team members to view this artifact
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Artifact Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{artifact.title}</h4>
              <Badge variant="outline">{artifact.type}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Version {versionNumber}
            </p>
          </div>

          {/* Security Notice */}
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Team-only sharing:</strong> Only authenticated team members
              can access this artifact. The link will not work for external users.
            </AlertDescription>
          </Alert>

          {!shareUrl ? (
            /* Share Button */
            <Button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full"
            >
              <Link2 className="mr-2 h-4 w-4" />
              {isSharing ? 'Creating Share Link...' : 'Create Share Link'}
            </Button>
          ) : (
            /* Share URL */
            <div className="space-y-3">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link and team access can view this artifact
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.4 Shared Artifact Viewer Page

**File:** `src/pages/SharedArtifact.tsx`

```typescript
import { useParams, Navigate } from 'react-router-dom';
import { useArtifactSharing } from '@/hooks/useArtifactSharing';
import { Artifact } from '@/components/Artifact';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SharedArtifactPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const { fetchSharedArtifact } = useArtifactSharing();

  if (!shareId) {
    return <Navigate to="/" replace />;
  }

  const { data: sharedArtifact, isLoading, error } = fetchSharedArtifact(shareId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !sharedArtifact) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Artifact Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This artifact may have been unshared or you don't have permission to view it.
        </p>
        <Button asChild>
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {sharedArtifact.artifact_title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{sharedArtifact.artifact_type}</Badge>
              <span>Version {sharedArtifact.version_number}</span>
              <span>•</span>
              <span>
                Shared {formatDistanceToNow(new Date(sharedArtifact.created_at), {
                  addSuffix: true
                })}
              </span>
              <span>•</span>
              <span>{sharedArtifact.view_count} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Artifact Display */}
      <div className="border rounded-lg overflow-hidden">
        <Artifact
          messageId={sharedArtifact.message_id}
          artifact={{
            id: sharedArtifact.id,
            type: sharedArtifact.artifact_type as any,
            title: sharedArtifact.artifact_title,
            content: sharedArtifact.artifact_content,
            language: sharedArtifact.artifact_language
          }}
          readonly
        />
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground mb-4">
          Want to create your own AI-powered artifacts?
        </p>
        <Button size="lg" asChild>
          <a href="/auth">Get Started</a>
        </Button>
      </div>
    </div>
  );
}
```

#### 4.5 Route Configuration

**File:** `src/App.tsx` (modification)

```typescript
import { SharedArtifactPage } from '@/pages/SharedArtifact';

// Add BEFORE the catch-all "*" route
<Route path="/shared/:shareId" element={<SharedArtifactPage />} />
<Route path="*" element={<NotFound />} />
```

#### 4.6 Deliverables (Week 4)

- ✅ Database migration for team sharing
- ✅ `useArtifactSharing` hook
- ✅ Share modal component
- ✅ Shared artifact viewer page
- ✅ Route configuration
- ✅ Unit tests for sharing logic
- ✅ E2E tests for share workflow
- ✅ Feature flag: `VITE_ENABLE_TEAM_SHARING`

**Time Estimate:** 16-20 hours
**Risk Level:** Medium

---

## Phase 2: Enhanced Experience (Weeks 5-8)

### Week 5-6: Multi-Artifact Support

**Goal:** Support multiple artifacts in a single conversation with easy navigation

[Detailed implementation plan continues...]

---

## Testing Strategy

### Unit Testing

**Framework:** Vitest + React Testing Library

**Coverage Requirements:**
- Minimum 90% code coverage
- 100% coverage for critical paths (version control, sharing, detection)
- All edge cases documented and tested

**Test Files:**
```
src/utils/__tests__/
  artifactAutoDetector.test.ts     (50+ tests)
  artifactParser.test.ts           (30+ tests)
  artifactValidator.test.ts        (40+ tests)

src/hooks/__tests__/
  useArtifactVersions.test.ts      (40+ tests)
  useArtifactSharing.test.ts       (30+ tests)
  useChatMessages.test.ts          (20+ tests)

src/components/__tests__/
  ArtifactVersionSelector.test.tsx (20+ tests)
  ArtifactDiffViewer.test.tsx      (15+ tests)
  ArtifactShareModal.test.tsx      (15+ tests)
```

### Integration Testing

**Focus Areas:**
- Artifact creation flow (user message → detection → artifact render)
- Version control workflow (create → edit → revert → diff)
- Sharing workflow (share → copy link → view → unshare)
- Multi-artifact interaction (create multiple → switch → update)

### E2E Testing

**Framework:** Playwright

**Critical User Journeys:**
1. Create artifact via auto-detection
2. Edit artifact and view version history
3. Share artifact with team member
4. Fork artifact to new session
5. Fix artifact error with AI

**Test Files:**
```
tests/e2e/
  artifact-detection.spec.ts
  artifact-versions.spec.ts
  artifact-sharing.spec.ts
  artifact-remix.spec.ts
  artifact-error-fixing.spec.ts
```

### Performance Testing

**Metrics:**
- Artifact load time: <200ms (p95)
- Version switching time: <100ms (p95)
- Diff calculation time: <500ms for 10KB files (p95)
- Share link generation: <300ms (p95)

### Security Testing

**Checklist:**
- [ ] RLS policies prevent unauthorized access
- [ ] XSS protection in artifact content
- [ ] SQL injection prevention
- [ ] Rate limiting on API endpoints
- [ ] CSRF protection on mutations
- [ ] Content validation before storage

---

## Success Metrics

**Usage Metrics:**
- Artifact creation rate: +40% (from 10% to 50% of conversations)
- Version control usage: 60% of artifacts have 2+ versions
- Sharing rate: 15% of artifacts are shared
- Remix rate: 5% of shared artifacts are remixed

**Performance Metrics:**
- Artifact load time: <200ms (p95)
- Zero security vulnerabilities
- 99.9% uptime

**User Satisfaction:**
- NPS score: +10 points
- Feature discovery: 80% of users aware of new features
- Support tickets: -30% artifact-related issues

---

## Rollback Plan

**Feature Flags:**
```typescript
const FEATURE_FLAGS = {
  automatic_detection: true,
  version_control: true,
  team_sharing: true,
  multi_artifact: false,
  ai_error_fixing: false,
  remix: false
};
```

**Rollback Procedure:**
1. Disable feature flag via environment variable
2. Deploy updated config (no code changes needed)
3. Monitor for error rate decrease
4. Investigate root cause
5. Fix and re-enable

**Database Rollback:**
- All migrations include `DOWN` migration
- Version data preserved during rollback
- No data loss on feature disable

---

## Implementation Timeline

**Phase 1: Weeks 1-4 (Foundation)**
- Week 1: Automatic Detection
- Week 2-3: Version Control
- Week 4: Team Sharing

**Phase 2: Weeks 5-8 (Enhanced Experience)**
- Week 5-6: Multi-Artifact Support
- Week 7: Remix/Customize
- Week 8: AI Error Fixing

**Phase 3: Weeks 9-12 (Polish & Optimization)**
- Week 9: Performance optimization
- Week 10: Security hardening
- Week 11: Analytics & monitoring
- Week 12: Documentation & handoff

**Total Timeline:** 12 weeks (can be compressed to 8-10 with parallel work)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for bringing our artifact system to parity with Claude.ai while maintaining security-first principles. By implementing in phases with continuous testing and monitoring, we minimize risk while delivering high-value features incrementally.

**Key Success Factors:**
1. Feature flags enable safe rollout
2. Comprehensive testing catches issues early
3. Version control provides safety net for users
4. Team-only sharing validates system before public launch
5. Performance monitoring ensures scalability

**Next Steps:**
1. Peer review this plan
2. Address feedback
3. Begin Week 1 implementation
4. Daily standups to track progress
5. Weekly retrospectives to adapt plan
