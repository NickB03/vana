# GitHub & CodeRabbit Workflow Integration Guide

**Version:** 1.0  
**Date:** 2025-08-23  
**Purpose:** Operational guide for PR-driven development with CodeRabbit quality assurance

---

## Table of Contents
1. [Overview](#overview)
2. [Initial Setup](#initial-setup)
3. [PR Workflow Patterns](#pr-workflow-patterns)
4. [CodeRabbit Commands Reference](#coderabbit-commands-reference)
5. [Sprint-Specific Workflows](#sprint-specific-workflows)
6. [Automation Scripts](#automation-scripts)
7. [Quality Gates](#quality-gates)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides practical workflows for integrating GitHub pull requests with CodeRabbit automated reviews throughout the Vana Frontend development sprints.

### Core Principles
- Every feature is a pull request
- CodeRabbit reviews before human review
- Automated quality gates prevent bad merges
- Continuous feedback loop with CodeRabbit

---

## Initial Setup

### 1. Repository Configuration

```yaml
# .github/CODEOWNERS
# Frontend code owners for automatic review assignment
*.ts @frontend-team
*.tsx @frontend-team
*.css @design-team
/app/ @tech-lead
/tests/ @qa-team
```

### 2. Branch Protection Rules

```yaml
# GitHub Settings > Branches > main
Required status checks:
  - CodeRabbit Review
  - Build and Test
  - Type Check
  - Lint
  - Coverage (80%)
  
Required reviews:
  - 1 approval required
  - Dismiss stale reviews
  - Require review from CODEOWNERS
```

### 3. CodeRabbit Configuration

```yaml
# .coderabbit.yml
version: 1.0
rules:
  - name: "PRD Compliance"
    description: "Ensure code follows Vana Frontend PRD specifications"
    checks:
      - technology_stack:
          next_version: "15.4.6"
          react_version: "18.3.1"
          typescript_strict: true
      - accessibility:
          wcag_level: "AA"
          contrast_ratio: 4.5
      - performance:
          bundle_size_limit: "500KB"
          component_size_limit: "50KB"
          
  - name: "Security Standards"
    checks:
      - no_console_logs: true
      - no_hardcoded_secrets: true
      - xss_prevention: true
      - csrf_protection: true
      
  - name: "Testing Requirements"
    checks:
      - unit_test_coverage: 80
      - e2e_test_required: true
      - snapshot_tests: true
```

### 4. PR Template

```markdown
<!-- .github/pull_request_template.md -->
## Description
Brief description of what this PR does

## Sprint & Story
- Sprint: [1-6]
- Story: [VANA-XXX]
- Points: [1, 2, 3, 5, 8]

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation
- [ ] ♻️ Refactoring
- [ ] 🎨 UI/UX improvement

## PRD Compliance Checklist
- [ ] Uses correct package versions per PRD
- [ ] Follows dark theme design (#131314)
- [ ] Implements accessibility (WCAG 2.1 AA)
- [ ] Includes error handling
- [ ] Has loading states
- [ ] Mobile responsive

## Testing
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Visual regression tests pass
- [ ] Manual testing completed
- [ ] Tested on mobile devices

## Screenshots/Videos
<!-- Add screenshots for UI changes -->

## CodeRabbit Review Request
@coderabbitai please review for:
- [ ] Security vulnerabilities
- [ ] Performance issues
- [ ] Code quality
- [ ] PRD compliance
- [ ] Test coverage

## Dependencies
<!-- List any PRs that must be merged first -->

## Deployment Notes
<!-- Any special deployment considerations -->
```

---

## PR Workflow Patterns

### Pattern 1: Feature Development

```bash
# 1. Create feature branch
git checkout -b feat/sprint-1/project-init

# 2. Develop feature with commits
git add .
git commit -m "feat: initialize Next.js 15 project with TypeScript"

# 3. Push and create PR
git push origin feat/sprint-1/project-init

# 4. Create PR via GitHub CLI with CodeRabbit review
gh pr create \
  --title "feat: Initialize Next.js 15 project foundation" \
  --body "@coderabbitai review this PR for PRD compliance and security" \
  --base main \
  --head feat/sprint-1/project-init \
  --assignee @me \
  --label "sprint-1,foundation"
```

### Pattern 2: Iterative Development with CodeRabbit Feedback

```bash
# 1. Create initial PR as draft
gh pr create --draft \
  --title "WIP: Canvas system implementation" \
  --body "@coderabbitai analyze the architecture approach"

# 2. Get early feedback from CodeRabbit
gh pr comment 123 --body "@coderabbitai suggest performance optimizations for Monaco Editor"

# 3. Implement suggestions and push updates
git commit -m "perf: implement CodeRabbit's Monaco optimization suggestions"
git push

# 4. Request specific analysis
gh pr comment 123 --body "@coderabbitai check for memory leaks in Canvas component"

# 5. Mark ready for review
gh pr ready 123
```

### Pattern 3: Bug Fix with Root Cause Analysis

```bash
# 1. Create bug fix branch
git checkout -b fix/sse-reconnection-issue

# 2. Ask CodeRabbit for analysis
gh pr create \
  --title "fix: SSE reconnection failing after timeout" \
  --body "@coderabbitai analyze the root cause of SSE disconnections and suggest fixes"

# 3. Implement fix based on analysis
git commit -m "fix: implement exponential backoff for SSE reconnection"

# 4. Verify fix
gh pr comment 124 --body "@coderabbitai verify this fixes the reconnection issue and check for edge cases"
```

---

## CodeRabbit Commands Reference

### General Review Commands
```bash
# Full review
@coderabbitai review

# Specific aspect review
@coderabbitai review security
@coderabbitai review performance
@coderabbitai review accessibility

# Re-review after changes
@coderabbitai review again
```

### Analysis Commands
```bash
# Architecture analysis
@coderabbitai analyze architecture

# Dependency analysis
@coderabbitai check dependencies

# Bundle size analysis
@coderabbitai analyze bundle size

# Memory leak detection
@coderabbitai check for memory leaks
```

### Code Quality Commands
```bash
# Code smell detection
@coderabbitai find code smells

# Duplicate code detection
@coderabbitai find duplicates

# Complexity analysis
@coderabbitai analyze complexity

# Best practices check
@coderabbitai check best practices
```

### Testing Commands
```bash
# Test coverage analysis
@coderabbitai analyze test coverage

# Suggest missing tests
@coderabbitai suggest tests

# Edge case identification
@coderabbitai identify edge cases
```

### Documentation Commands
```bash
# Documentation review
@coderabbitai review documentation

# Generate documentation
@coderabbitai generate docs

# API documentation check
@coderabbitai check api docs
```

---

## Sprint-Specific Workflows

### Sprint 1: Foundation Setup

```bash
# PR #1: Project initialization
gh pr create --title "feat: Initialize Next.js 15 project" \
  --body "$(cat <<EOF
## Sprint 1: Foundation Setup

This PR establishes the project foundation per PRD requirements.

### Includes:
- Next.js 15.4.6 with App Router
- TypeScript 5.7.2 strict mode
- Tailwind CSS 4.0.0
- shadcn/ui integration

@coderabbitai please verify:
1. Package versions match PRD exactly
2. TypeScript strict mode is enabled
3. No unnecessary dependencies
4. Project structure follows Next.js best practices
EOF
)"

# After CodeRabbit review, address feedback
git commit -m "fix: address CodeRabbit package version feedback"
git push

# Request re-review
gh pr comment 1 --body "@coderabbitai please review the updated package versions"
```

### Sprint 2: Authentication

```bash
# PR #5: Auth implementation
gh pr create --title "feat: JWT authentication with Google OAuth" \
  --body "$(cat <<EOF
## Sprint 2: Authentication System

Implements JWT-based authentication per PRD specifications.

### Security Considerations:
- JWT tokens in memory only
- Refresh tokens in httpOnly cookies
- CSRF protection enabled
- XSS prevention measures

@coderabbitai critical security review needed:
1. Token storage security
2. CSRF protection completeness
3. XSS vulnerability scan
4. OAuth flow security
EOF
)"
```

### Sprint 3: Chat & SSE

```bash
# PR #7: SSE Implementation
gh pr create --title "feat: Server-Sent Events integration" \
  --body "$(cat <<EOF
## Sprint 3: Real-time Communication

Implements SSE for real-time chat streaming.

### Performance Requirements:
- First token < 500ms
- Reconnection with exponential backoff
- Memory leak prevention
- 60fps UI updates

@coderabbitai please analyze:
1. Memory leak potential in EventSource
2. Reconnection reliability
3. Error handling completeness
4. Performance under load
EOF
)"
```

### Sprint 4: Canvas System

```bash
# PR #10: Canvas Architecture
gh pr create --title "feat: Progressive Canvas system with Monaco Editor" \
  --body "$(cat <<EOF
## Sprint 4: Canvas Implementation

Implements Claude Artifacts-style Canvas system.

### Complex Integration:
- Monaco Editor with CSP configuration
- Progressive enhancement approach
- Version history system
- Export functionality

@coderabbitai comprehensive review needed:
1. CSP configuration for Monaco
2. Memory management in editor
3. Version history optimization
4. Export security
5. Performance with large files
EOF
)"
```

---

## Automation Scripts

### 1. Sprint PR Creator

```javascript
// scripts/create-sprint-pr.js
const { execSync } = require('child_process');

function createSprintPR(sprint, feature, description) {
  const branch = `feat/sprint-${sprint}/${feature}`;
  const title = `[Sprint ${sprint}] ${description}`;
  
  // Create and checkout branch
  execSync(`git checkout -b ${branch}`);
  
  // Create PR with CodeRabbit review
  const body = `
## Sprint ${sprint} Deliverable

### Description
${description}

### PRD Compliance
This PR implements requirements from Sprint ${sprint} of the PRD.

### CodeRabbit Review Request
@coderabbitai please review for:
- PRD compliance (Sprint ${sprint} requirements)
- Security vulnerabilities
- Performance optimizations
- Test coverage
- Code quality

### Testing
- [ ] Unit tests added
- [ ] E2E tests added
- [ ] Manual testing complete
  `;
  
  execSync(`gh pr create --title "${title}" --body "${body}"`);
}

// Usage
createSprintPR(1, 'project-init', 'Initialize Next.js 15 project foundation');
```

### 2. CodeRabbit Feedback Processor

```javascript
// scripts/process-coderabbit-feedback.js
async function processCodeRabbitFeedback(prNumber) {
  // Get PR comments
  const comments = await getCodeRabbitComments(prNumber);
  
  // Parse feedback
  const issues = parseCodeRabbitIssues(comments);
  
  // Create tasks for each issue
  issues.forEach(issue => {
    if (issue.severity === 'critical') {
      console.log(`🔴 CRITICAL: ${issue.description}`);
      createGitHubIssue(issue);
    } else if (issue.severity === 'warning') {
      console.log(`🟡 WARNING: ${issue.description}`);
    }
  });
  
  // Generate fix commits
  if (issues.some(i => i.autoFixable)) {
    generateFixCommits(issues.filter(i => i.autoFixable));
  }
}
```

### 3. Sprint Progress Tracker

```bash
#!/bin/bash
# scripts/sprint-progress.sh

SPRINT=$1

echo "Sprint $SPRINT Progress Report"
echo "=============================="

# Count PRs by status
OPEN=$(gh pr list --label "sprint-$SPRINT" --state open --json number --jq 'length')
MERGED=$(gh pr list --label "sprint-$SPRINT" --state merged --json number --jq 'length')
CLOSED=$(gh pr list --label "sprint-$SPRINT" --state closed --json number --jq 'length')

echo "Open PRs: $OPEN"
echo "Merged PRs: $MERGED"
echo "Closed PRs: $CLOSED"

# Get CodeRabbit approval rate
APPROVED=$(gh pr list --label "sprint-$SPRINT,coderabbit-approved" --json number --jq 'length')
TOTAL=$((OPEN + MERGED + CLOSED))
APPROVAL_RATE=$((APPROVED * 100 / TOTAL))

echo "CodeRabbit Approval Rate: $APPROVAL_RATE%"

# List pending reviews
echo -e "\nPending CodeRabbit Reviews:"
gh pr list --label "sprint-$SPRINT" --state open --json number,title,author \
  --jq '.[] | "PR #\(.number): \(.title) by @\(.author.login)"'
```

---

## Quality Gates

### Pre-Merge Checklist

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  coderabbit-check:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for CodeRabbit Review
        uses: actions/github-script@v6
        with:
          script: |
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number
            });
            
            const coderabbitApproval = comments.data.some(
              comment => comment.user.login === 'coderabbitai' &&
                        comment.body.includes('✅ Approved')
            );
            
            if (!coderabbitApproval) {
              core.setFailed('CodeRabbit approval required');
            }
      
      - name: Check Test Coverage
        run: |
          npm test -- --coverage
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
            echo "Test coverage below 80%"
            exit 1
          fi
      
      - name: Performance Check
        run: |
          npm run build
          npm run lighthouse
          
      - name: Security Scan
        run: |
          npm audit --audit-level=moderate
          npm run security-scan
```

### Sprint Completion Criteria

```markdown
## Sprint Completion Checklist

### Code Quality
- [ ] All PRs merged to main
- [ ] CodeRabbit approval on all PRs
- [ ] Zero critical security issues
- [ ] Test coverage > 80%

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Inline code comments added
- [ ] Sprint retrospective documented

### Performance
- [ ] Lighthouse scores > 90
- [ ] Bundle size within limits
- [ ] No memory leaks detected
- [ ] Load time < 3s

### Deployment
- [ ] Staging environment updated
- [ ] E2E tests pass on staging
- [ ] Production deployment plan ready
- [ ] Rollback plan documented
```

---

## Troubleshooting

### Common CodeRabbit Issues

#### Issue: CodeRabbit not responding
```bash
# Manually trigger review
gh pr comment 123 --body "@coderabbitai review"

# Check CodeRabbit status
curl https://api.coderabbit.ai/status
```

#### Issue: False positive security warning
```bash
# Add exception with explanation
gh pr comment 123 --body "@coderabbitai ignore security warning XYZ - false positive because [explanation]"
```

#### Issue: CodeRabbit suggesting outdated patterns
```bash
# Update CodeRabbit configuration
echo "coderabbit_version: latest" >> .coderabbit.yml
gh pr comment 123 --body "@coderabbitai reload configuration"
```

### PR Workflow Issues

#### Issue: Merge conflicts with main
```bash
# Update branch with main
git checkout main
git pull origin main
git checkout feat/your-branch
git rebase main
git push --force-with-lease

# Request new review
gh pr comment 123 --body "@coderabbitai review after rebase"
```

#### Issue: Large PR needs splitting
```bash
# Create stacked PRs
git checkout -b feat/part-1
git cherry-pick commit1 commit2
gh pr create --base main

git checkout -b feat/part-2
git cherry-pick commit3 commit4
gh pr create --base feat/part-1
```

---

## Best Practices

### 1. PR Size Guidelines
- Ideal: 200-400 lines changed
- Maximum: 800 lines changed
- If larger, split into logical parts

### 2. Commit Message Format
```
type(scope): description

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- perf: Performance improvement
- test: Test addition
- chore: Maintenance
```

### 3. Review Response Time
- CodeRabbit: < 5 minutes
- Human review: < 24 hours
- Author response: < 12 hours

### 4. Documentation Updates
- Update docs in same PR as code
- Include examples for new features
- Update tests for changed behavior

---

## Metrics and Reporting

### Weekly Metrics
```bash
# Generate weekly report
./scripts/weekly-metrics.sh

# Metrics tracked:
- PRs opened/merged/closed
- Average PR size
- CodeRabbit approval rate
- Average review time
- Test coverage trend
- Bug escape rate
```

### Sprint Metrics
```bash
# Generate sprint report
./scripts/sprint-report.sh 1

# Metrics tracked:
- Sprint velocity
- Story completion rate
- CodeRabbit findings
- Technical debt added/removed
- Performance improvements
```

---

## Conclusion

This workflow guide ensures consistent, high-quality PR processes throughout the Vana Frontend development. CodeRabbit serves as the first line of defense for code quality, security, and PRD compliance, while the structured PR patterns ensure efficient development cycles.

---

**Document Control**
- Version: 1.0
- Created: 2025-08-23
- Status: Active
- Review: After each sprint