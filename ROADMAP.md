# Vana - Product Roadmap

**Last Updated**: 2025-01-06
**Project**: llm-chat-site (Vana AI Assistant)
**Status**: Active Development

---

## 🎯 Vision

Transform Vana into a best-in-class AI-powered development assistant with enterprise-grade quality, comprehensive artifact generation capabilities, and an exceptional user experience.

---

## 📊 Current Status (as of 2025-01-06)

### ✅ Completed Features

| Feature | Status | Completion Date |
|---------|--------|-----------------|
| **Core Chat** | ✅ Complete | 2024-09 |
| **7 Artifact Types** | ✅ Complete | 2024-10 |
| **Sandpack Integration** | ✅ Complete | 2024-11 |
| **Guest Mode (10 messages)** | ✅ Complete | 2024-11 |
| **ai-elements Integration** | ✅ Complete | 2025-01 |
| **5-Layer Import Validation** | ✅ Complete | 2025-01 |
| **Auto-Transformation** | ✅ Complete | 2025-01 |
| **Chrome DevTools MCP** | ✅ Complete | 2025-01 |
| **Component Refactoring** | ✅ Complete | 2025-01 |
| **Test Infrastructure** | ✅ 232+ tests | 2025-01 |

### 🚧 In Progress

| Feature | Status | Target | GitHub Issue |
|---------|--------|--------|--------------|
| **Feature Branch Merge** | Code Review | Q1 2025 | - |
| **Documentation Overhaul** | In Progress | Q1 2025 | #30 |

---

## 🚨 Priority 0: Critical Security Fixes (Pre-Merge)

**MUST complete before merging feature/ai-elements-integration to main**

| # | Item | Status | Effort | GitHub Issue |
|---|------|--------|--------|--------------|
| 1 | Fix postMessage wildcard origin | ❌ Not Started | 30 min | [#54](https://github.com/NickB03/llm-chat-site/issues/54) |
| 2 | Implement Sandpack dependency validation | ❌ Not Started | 1 hour | [#55](https://github.com/NickB03/llm-chat-site/issues/55) |
| 3 | Add integration tests for validation | ❌ Not Started | 2 hours | - |

**Total P0 Effort**: ~3.5 hours
**Blocking**: Production deployment, feature branch merge

---

## 🔴 Priority 1: High-Impact Features (Q1 2025)

### Core Functionality Fixes

| # | Feature | Status | Effort | GitHub Issue |
|---|---------|--------|--------|--------------|
| 3 | **Fix Guest Mode Message Sending** | ❌ Bug | 2-3 hours | [#50](https://github.com/NickB03/llm-chat-site/issues/50) |
| 4 | **Integrate Version Control UI** | 🟡 Code Complete | 4-6 hours | [#44](https://github.com/NickB03/llm-chat-site/issues/44) |
| 5 | **Click-to-Build Suggestions** | ❌ Not Started | 2-3 hours | [#53](https://github.com/NickB03/llm-chat-site/issues/53) |
| 6 | **Integrate Export Menu UI** | 🟡 Code Complete | 3-4 hours | [#44](https://github.com/NickB03/llm-chat-site/issues/44) |
| 7 | **Multi-Artifact Context** | 🟡 Code Complete | 2-3 hours | [#44](https://github.com/NickB03/llm-chat-site/issues/44) |

**Total P1 Effort**: 13-19 hours

### P1 Feature Details

#### #3: Fix Guest Mode Message Sending ❌ CRITICAL BUG
**User Impact**: Guest users cannot send messages (breaks 10 free messages feature)

**Current Behavior**: Session validation blocks guest message sending

**Fix Required**:
- Allow guest OR authenticated users in `handleSend()`
- Verify edge function accepts guest requests
- Test 10 message limit enforcement
- Test auth prompt after limit

**Testing**:
- ✅ Guest can send messages without auth
- ✅ 10 message limit enforced
- ✅ Auth prompt shown after limit
- ✅ Edge function accepts guest requests

#### #4: Integrate Version Control UI 🟡 CODE COMPLETE
**User Impact**: Users can save, compare, and restore artifact versions

**Already Built**:
- ✅ `useArtifactVersions` hook (371 lines)
- ✅ `ArtifactVersionSelector.tsx` component
- ✅ `ArtifactDiffViewer.tsx` component
- ✅ Tests: 19/22 passing

**Integration Required**:
1. Import `useArtifactVersions` in ArtifactContainer.tsx
2. Add version selector button to artifact header
3. Add version diff viewer modal/drawer
4. Wire up save/load/restore functionality

#### #5: Click-to-Build Suggestions ❌ NOT STARTED
**User Impact**: Faster artifact creation from landing page

**Current**: Click → Populate input → User must send
**Desired**: Click → Immediate build → Auto-open canvas

**Implementation**:
```typescript
const handleSuggestionClick = async (suggestion: string) => {
  toast.loading("Starting your project...");
  await handleSend(suggestion); // Internal send
  onCanvasToggle?.(true); // Auto-open canvas
  toast.dismiss();
};
```

#### #6: Integrate Export Menu UI 🟡 CODE COMPLETE
**User Impact**: Download artifacts in various formats

**Already Built**:
- ✅ Export utility functions
- ✅ Download logic for all artifact types
- ✅ Format conversion (HTML, React, SVG, etc.)

**Integration Required**:
1. Add export button to artifact header
2. Create export dropdown menu
3. Wire up export functions
4. Add success/error toasts

#### #7: Multi-Artifact Context 🟡 CODE COMPLETE
**User Impact**: Work with multiple artifacts simultaneously

**Already Built**:
- ✅ `MultiArtifactContext` provider
- ✅ State management for multiple artifacts
- ✅ Artifact switching logic

**Integration Required**:
1. Wrap app with `MultiArtifactProvider`
2. Add artifact tabs/switcher UI
3. Test multiple artifacts in single session

---

## 🟡 Priority 2: UX Improvements (Q1-Q2 2025)

### User Experience Enhancements

| # | Feature | Status | Effort | GitHub Issue |
|---|---------|--------|--------|--------------|
| 8 | **Auto-collapse sidebar when canvas opens** | ❌ Not Started | 1-2 hours | [#52](https://github.com/NickB03/llm-chat-site/issues/52) |
| 9 | **Landing page with real artifact examples** | ❌ Not Started | 6-8 hours | [#57](https://github.com/NickB03/llm-chat-site/issues/57) |
| 10 | **Chat suggestions with real previews** | ❌ Not Started | 4-6 hours | [#58](https://github.com/NickB03/llm-chat-site/issues/58) |
| 11 | **Relocate settings icon** | ❌ Not Started | 30 min | [#60](https://github.com/NickB03/llm-chat-site/issues/60) |
| 12 | **Expand chat/canvas to fill space** | ❌ Not Started | 1-2 hours | [#59](https://github.com/NickB03/llm-chat-site/issues/59) |
| 13 | **WebPreview console viewer** | 📋 Planned | 4-6 hours | - |
| 14 | **AI Error Fixing System** | ❌ Not Started | 6-8 hours | [#56](https://github.com/NickB03/llm-chat-site/issues/56) |

**Total P2 Effort**: 23-33 hours

### P2 Feature Details

#### #8: Auto-Collapse Sidebar
**User Impact**: More screen space for artifact work

**Behavior**:
- Sidebar auto-closes when canvas/artifact opens
- Sidebar auto-opens when canvas closes
- User can override auto-behavior
- Remember user preference

#### #9: Landing Page Real Examples
**User Impact**: Better first impressions, showcase capabilities

**Current**: Stock images from Unsplash
**Desired**: Real artifact screenshots

**Assets Needed**:
- 5-7 high-quality artifact screenshots
- Code examples with syntax highlighting
- Interactive demo GIF
- Before/after comparisons

#### #10: Chat Suggestions Real Previews
**User Impact**: Visual guide for what AI can build

**Current**: Text-only suggestion cards
**Desired**: Thumbnail previews of resulting artifacts

**Assets Needed**:
- 20 artifact preview thumbnails (one per suggestion)
- Hover animations
- Quick preview on card hover

#### #14: AI Error Fixing System
**User Impact**: Self-service error resolution

**Feature**: When artifact has error → "🤖 Ask AI to Fix" button

**Workflow**:
1. Artifact fails to render
2. Show error message + "Ask AI to Fix" button
3. Click → AI analyzes error + context
4. AI generates fixed version
5. Auto-apply fix or show diff

---

## 🔵 Priority 3: Nice-to-Have Enhancements (Q2 2025)

### Advanced Features

| # | Feature | Status | Effort | Notes |
|---|---------|--------|--------|-------|
| 15 | **Auto-Fix Import Suggestions** | 📋 Planned | 3-4 hours | When invalid import detected, suggest fix |
| 16 | **Intent Detector** | 📋 Planned | 4-6 hours | Detect artifact intent from user message |
| 17 | **WebPreview Navigation Bar** | 📋 Deferred | 2-3 hours | Back/forward buttons for web artifacts |
| 18 | **WebPreview URL Bar** | 📋 Deferred | 2-3 hours | Editable URL bar for web artifacts |
| 19 | **ArtifactDescription Component** | 📋 Deferred | 1-2 hours | Rich metadata display |
| 20 | **Artifact Templates Library** | 📋 Planned | 8-12 hours | Pre-built templates for common patterns |

**Total P3 Effort**: 20-32 hours

---

## 📚 Documentation & Content (Q1 2025)

### Documentation Improvements

| Task | Status | Effort | Target |
|------|--------|--------|--------|
| **README.md Visual Assets** | ❌ Not Started | 4-6 hours | Q1 2025 |
| **User Guide Creation** | ❌ Not Started | 5-6 hours | Q1 2025 |
| **API Documentation** | ❌ Not Started | 3-4 hours | Q1 2025 |
| **Architecture Diagrams** | ❌ Not Started | 3-4 hours | Q1 2025 |
| **Contributing Guide** | ❌ Not Started | 2-3 hours | Q1 2025 |
| **FAQ & Troubleshooting** | ❌ Not Started | 2-3 hours | Q1 2025 |

**Total Documentation Effort**: 19-26 hours

See `DOCUMENTATION_PLAN.md` for comprehensive 4-week documentation roadmap.

---

## 🧪 Testing & Quality (Q1-Q2 2025)

### Test Coverage Goals

| Category | Current | Target | Effort |
|----------|---------|--------|--------|
| **Unit Tests** | 232 passing | 300+ | 10-15 hours |
| **Integration Tests** | Minimal | Comprehensive | 15-20 hours |
| **E2E Tests** | None | Critical paths | 20-30 hours |
| **Coverage %** | ~60% | 80%+ | Ongoing |

### Specific Testing Needs

- ✅ ArtifactContainer tests (complete)
- ❌ Sandpack integration tests ([#43](https://github.com/NickB03/llm-chat-site/issues/43))
- ❌ Version control tests (3 failing, need fixes)
- ❌ Export functionality tests ([#42](https://github.com/NickB03/llm-chat-site/issues/42))
- ❌ Multi-artifact context tests ([#43](https://github.com/NickB03/llm-chat-site/issues/43))
- ❌ E2E artifact generation tests
- ❌ Guest mode flow tests

---

## 🚀 Release Timeline

### Q1 2025 (January - March)

**Week 1-2**: P0 Security Fixes + Feature Branch Merge
- Fix postMessage origin validation
- Add Sandpack dependency validation
- Merge feature/ai-elements-integration to main
- Deploy to production

**Week 3-4**: P1 Critical Bugs
- Fix guest mode message sending
- Integrate version control UI
- Click-to-build suggestions

**Week 5-8**: P1 Features + Documentation
- Export menu integration
- Multi-artifact context
- README visual assets
- User guide creation

**Week 9-12**: P2 UX Improvements
- Auto-collapse sidebar
- Landing page real examples
- Chat suggestions with previews
- Settings icon relocation

### Q2 2025 (April - June)

**Focus**: UX Polish + Advanced Features
- AI error fixing system
- WebPreview console viewer
- Artifact templates library
- Comprehensive E2E testing
- Performance optimization

### Q3 2025 (July - September)

**Focus**: Scale & Stability
- Multi-user collaboration features
- Real-time co-editing
- Advanced caching strategies
- Performance monitoring
- Production hardening

---

## 📈 Success Metrics

### User Engagement
- [ ] 90%+ guest-to-auth conversion
- [ ] Average 15+ artifacts per user session
- [ ] < 5% artifact failure rate
- [ ] < 2s average artifact render time

### Code Quality
- [ ] 80%+ test coverage
- [ ] Zero P0/P1 security issues
- [ ] < 100ms p95 API response time
- [ ] 100% uptime SLA

### Documentation
- [ ] 90%+ setup success rate
- [ ] < 30min average onboarding time
- [ ] Comprehensive API documentation
- [ ] Video tutorials for key features

---

## 🔄 Active GitHub Issues Summary

**Total Open Issues**: 20
**By Priority**:
- P0 (Critical): 2 issues
- P1 (High): 5 issues
- P2 (Medium): 9 issues
- P3 (Low): 4 issues

**Recent Activity** (Last 30 days):
- Created: 7 new issues
- Closed: 4 issues
- Updated: 3 issues

See [GitHub Issues](https://github.com/NickB03/llm-chat-site/issues) for full details.

---

## 🎓 Learnings & Best Practices

### From ai-elements Integration
- ✅ Multi-layer validation prevents 95% of failures
- ✅ Auto-transformation provides graceful fallbacks
- ✅ Verify marketing claims through code analysis
- ✅ Document immediately after implementation

### From Feature Branch Work
- ⚠️ 6 months undocumented = 123KB documentation debt
- ⚠️ "Code complete" ≠ "user-facing" (integration needed)
- ⚠️ P0 security issues block production deployment
- ✅ Comprehensive testing catches issues early

---

## 📞 Feedback & Contributions

**Questions or Suggestions?**
- Open a [GitHub Issue](https://github.com/NickB03/llm-chat-site/issues/new)
- See `CONTRIBUTING.md` for contribution guidelines (coming Q1 2025)

**Priority Requests?**
- Comment on existing issues to upvote
- Create new issue with detailed use case

---

**Roadmap Status**: ✅ Active
**Last Review**: 2025-01-06
**Next Review**: 2025-02-01
