# Vana Frontend Sprint Quick Reference

## 📅 Sprint Timeline Overview

| Sprint | Weeks | Focus | Key Deliverables | Status |
|--------|-------|-------|------------------|--------|
| **Sprint 0** | Day 1 | Pre-Development | Environment, CSP, Testing, SSE | ✅ COMPLETE |
| **Sprint 1** | 1-2 | Foundation | Next.js setup, shadcn/ui, dark theme | Ready to Start |
| **Sprint 2** | 3-4 | Auth & State | JWT auth, Google OAuth, Zustand | 3 PRs |
| **Sprint 3** | 5-6 | Chat & SSE | Real-time chat, SSE streaming, homepage | 3 PRs |
| **Sprint 4** | 7-8 | Canvas | Monaco Editor, export, versions | 3 PRs |
| **Sprint 5** | 9-10 | Agents | Task deck, visualizations, sessions | 3 PRs |
| **Sprint 6** | 11-12 | Production | Testing, optimization, deployment | 3 PRs |

---

## 🎯 Sprint Goals & Success Criteria

### Sprint 1: Foundation ✅
```bash
✓ Next.js 15.4.6 running on port 5173
✓ Dark theme (#131314 background)
✓ All shadcn/ui components installed
✓ TypeScript strict mode enabled
✓ Zero compilation errors
```

### Sprint 2: Authentication 🔐
```bash
✓ Google OAuth login working
✓ JWT tokens auto-refresh (25 min)
✓ Protected routes redirect properly
✓ Session persistence across refreshes
✓ Auth errors handled gracefully
```

### Sprint 3: Chat & SSE 💬
```bash
✓ SSE connects to /agent_network_sse/{sessionId}
✓ Messages stream < 500ms latency
✓ Reconnection with exponential backoff
✓ Markdown renders with syntax highlighting
✓ File upload accepts .md files
```

### Sprint 4: Canvas System 📝
```bash
✓ Canvas opens in < 200ms
✓ Monaco Editor with syntax highlighting
✓ Mode switching (MD/Code/Web/Sandbox)
✓ Version history tracking
✓ Export to MD/PDF/HTML working
```

### Sprint 5: Agent Features 🤖
```bash
✓ Task deck animates at 60fps
✓ Task updates < 50ms
✓ Research sources with confidence scores
✓ Sessions persist and switch properly
✓ Inline task lists expand/collapse
```

### Sprint 6: Production Ready 🚀
```bash
✓ Unit test coverage > 80%
✓ All E2E tests passing
✓ Lighthouse scores > 90
✓ First Contentful Paint < 1.5s
✓ WCAG 2.1 AA compliant
```

---

## 🔄 PR Workflow Cheatsheet

### Create Feature Branch
```bash
git checkout -b feat/sprint-X/feature-name
```

### Create PR with CodeRabbit
```bash
gh pr create \
  --title "[Sprint X] Feature description" \
  --body "@coderabbitai review for PRD compliance" \
  --label "sprint-X"
```

### Common CodeRabbit Commands
```bash
@coderabbitai review                    # Full review
@coderabbitai review security          # Security focus
@coderabbitai check performance        # Performance analysis
@coderabbitai analyze architecture     # Architecture review
@coderabbitai suggest tests           # Test suggestions
```

### After CodeRabbit Feedback
```bash
git commit -m "fix: address CodeRabbit feedback"
git push
gh pr comment XXX --body "@coderabbitai review again"
```

---

## 📦 Key Dependencies

### Core Packages (Exact Versions!)
```json
{
  "next": "15.4.6",
  "react": "18.3.1",
  "typescript": "5.7.2",
  "@monaco-editor/react": "4.6.0",
  "zustand": "5.0.7",
  "tailwindcss": "4.0.0",
  "framer-motion": "11.11.17"
}
```

### Development Tools
```json
{
  "eslint": "9.15.0",
  "jest": "29.7.0",
  "playwright": "1.48.0",
  "percy": "1.0.4"
}
```

---

## 🚨 Critical Requirements

### Must Have in Every PR
- [ ] Proper data-testid attributes
- [ ] ARIA labels for accessibility
- [ ] Error boundaries
- [ ] Loading states
- [ ] Mobile responsive
- [ ] Dark theme consistency

### Security Checklist
- [ ] No console.log in production
- [ ] No hardcoded secrets
- [ ] XSS prevention (sanitize markdown)
- [ ] CSRF protection
- [ ] CSP headers configured

### Performance Targets
- [ ] Component bundle < 50KB
- [ ] Initial load < 3s
- [ ] First token < 500ms
- [ ] 60fps animations
- [ ] < 100ms interaction response

---

## 🏃 Quick Commands

### Development
```bash
make dev-frontend    # Start frontend (port 5173)
make dev-backend     # Start backend (port 8000)
make test           # Run tests
make lint           # Run linters
make typecheck      # Type checking
```

### Testing
```bash
npm test                           # Unit tests
npm run test:e2e                  # E2E tests
npm run test:visual               # Visual regression
npm run test:coverage             # Coverage report
```

### Sprint Progress
```bash
./scripts/sprint-progress.sh 1    # Check Sprint 1 progress
./scripts/weekly-metrics.sh       # Weekly metrics
gh pr list --label "sprint-1"     # List Sprint 1 PRs
```

---

## 📊 Sprint Velocity Tracking

### Story Points per Sprint
- Sprint 1: 18 points (Foundation)
- Sprint 2: 15 points (Auth)
- Sprint 3: 20 points (Chat/SSE)
- Sprint 4: 25 points (Canvas - Complex!)
- Sprint 5: 18 points (Agents)
- Sprint 6: 15 points (Polish)

### PR Size Guidelines
- Small: < 200 lines (1-2 points)
- Medium: 200-400 lines (3-5 points)
- Large: 400-800 lines (8 points)
- X-Large: Split it! (13+ points)

---

## 🎓 CodeRabbit Best Practices

### Get Fast Approval
1. Keep PRs small and focused
2. Write clear PR descriptions
3. Include test coverage
4. Follow PRD requirements
5. Address feedback promptly

### Common Rejection Reasons
- Missing tests
- Accessibility issues
- Performance problems
- Security vulnerabilities
- PRD non-compliance

### Quick Fixes
```bash
# Auto-fix linting
npm run lint:fix

# Auto-format code
npm run format

# Update snapshots
npm test -- -u

# Security audit fix
npm audit fix
```

---

## 🔗 Important Links

- [Full Sprint Plan](./vana-frontend-sprint-plan.md)
- [GitHub Workflow Guide](./github-coderabbit-workflow-guide.md)
- [Frontend PRD](../docs/vana-frontend-prd-final.md)
- [CodeRabbit Dashboard](https://app.coderabbit.ai)

---

## 🆘 Emergency Contacts

- **Tech Lead**: Review PR blocks
- **DevOps**: CI/CD issues
- **QA Lead**: Test failures
- **CodeRabbit Support**: False positives

---

**Quick Win Tip**: Start each day by checking CodeRabbit feedback on overnight PRs!

---

*Last Updated: 2025-08-23*