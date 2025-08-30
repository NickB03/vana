# CodeRabbit-Optimized PR Guidelines

> **🎯 Objective**: Create PRs that pass CodeRabbit review efficiently with minimal back-and-forth.

Based on analysis of your codebase patterns, commit history, and CodeRabbit configuration, these guidelines ensure smooth reviews and faster merge times.

---

## 📊 1. PR Size Guidelines

### **Optimal PR Metrics**
- **Lines of Code**: 150-400 lines (sweet spot: ~250 LOC)
- **Files Changed**: 3-8 files maximum
- **Complexity**: Single responsibility per PR
- **Review Time**: Target 15-30 minutes to review

### **Size Categories**

| Category | LOC Range | Files | Review Priority | Merge Timeline |
|----------|-----------|-------|-----------------|----------------|
| 🟢 **Small** | 1-150 | 1-3 | High | Same day |
| 🟡 **Medium** | 151-400 | 4-8 | Medium | 1-2 days |
| 🟠 **Large** | 401-800 | 9-15 | Low | 3-5 days |
| 🔴 **XL** | 800+ | 15+ | Break down | N/A |

### **File Type Limits**
```bash
# Frontend (TypeScript/React)
- Components: 5-8 files max
- Tests: Should match component count
- Types: 1-2 files max per PR

# Backend (Python)
- API endpoints: 3-5 files max
- Models: 1-3 files max
- Tests: Should match implementation count
```

---

## 🏷️ 2. Commit Message Templates

### **Standard Format**
```
type(scope): concise description (50 chars max)

- Bullet point explaining what changed
- Focus on WHY, not just WHAT
- Reference issues/tickets

Closes #123
```

### **Approved Types**
```bash
feat     # New feature (user-facing)
fix      # Bug fix (user-facing)
docs     # Documentation only
style    # Code style (no logic change)
refactor # Code refactoring (no feature change)
test     # Adding/updating tests
chore    # Build/tooling changes
security # Security improvements
perf     # Performance improvements
```

### **Scope Examples**
```bash
# Frontend
feat(ui): add dark mode toggle to settings
fix(auth): resolve token expiration handling
refactor(components): extract reusable card component

# Backend  
feat(api): add user profile endpoints
fix(db): resolve connection timeout issues
security(auth): implement rate limiting

# Testing
test(auth): add OAuth integration tests
test(ui): add accessibility tests for components
```

### **Good Examples**
```bash
✅ feat(chat): add real-time message synchronization
✅ fix(auth): resolve Google OAuth redirect loop
✅ test(api): add comprehensive endpoint validation tests
✅ security(input): implement XSS prevention for user content
```

### **Bad Examples**
```bash
❌ update stuff
❌ fix bug
❌ WIP: working on feature
❌ refactor: massive code cleanup and restructuring
```

---

## 📝 3. PR Description Templates

### **Standard Template**
```markdown
## 🎯 Summary
Brief description of what this PR accomplishes (1-2 sentences).

## 🔄 Type of Change
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 📚 Documentation update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] 🧪 Tests only

## 🧪 Testing
- [ ] Tests pass locally (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Added/updated unit tests
- [ ] Added/updated integration tests
- [ ] Manual testing completed

## 📋 Changes Made
### Modified Files
- `path/to/file1.tsx` - Brief description
- `path/to/file2.ts` - Brief description

### New Files
- `path/to/newfile.tsx` - Brief description

## 🔍 CodeRabbit Focus Areas
- [ ] Type safety validated
- [ ] Error handling implemented
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Accessibility requirements met

## 🔗 Related Issues
Closes #123
Related to #456

## 📱 Screenshots (if UI changes)
[Add screenshots or GIFs showing before/after]

## 🚀 Deployment Notes
[Any special deployment considerations]
```

### **Feature PR Template**
```markdown
## ✨ Feature: [Feature Name]

### 🎯 User Story
As a [user type], I want [functionality] so that [benefit].

### 🛠️ Implementation
- **Frontend**: React components with TypeScript
- **Backend**: FastAPI endpoints with Pydantic models
- **Database**: PostgreSQL schema changes
- **Tests**: Jest unit tests + Playwright E2E

### 🧪 Test Plan
- [ ] Unit tests for core logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows
- [ ] Accessibility testing with @axe-core
- [ ] Cross-browser testing

### 📊 Performance Impact
- Bundle size: +X KB
- Load time: No significant impact
- Database queries: Optimized with indexing

### 🔒 Security Considerations
- Input validation implemented
- XSS prevention applied
- CSRF protection enabled
- Rate limiting considered
```

### **Bug Fix Template**
```markdown
## 🐛 Bug Fix: [Brief Description]

### 🔍 Problem
Detailed description of the bug and its impact.

### 🎯 Root Cause
Technical explanation of what caused the issue.

### 🔧 Solution
Explanation of how the fix works.

### 🧪 Verification
- [ ] Bug reproduction steps tested
- [ ] Fix verified in multiple browsers
- [ ] Regression testing completed
- [ ] Edge cases tested

### 📈 Impact
- Severity: [High/Medium/Low]
- Affected users: [Estimate]
- Performance impact: [None/Positive/Negative]
```

---

## ⚠️ 4. Common CodeRabbit Issues to Avoid

### **Security Issues** 🔒
```typescript
// ❌ AVOID: Direct user input usage
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD: Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// ❌ AVOID: Unescaped user content
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ GOOD: Sanitized content
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />
```

### **Type Safety Issues** 📝
```typescript
// ❌ AVOID: Any types
function processData(data: any): any {
  return data.someProperty;
}

// ✅ GOOD: Proper typing
interface UserData {
  id: number;
  name: string;
}

function processData(data: UserData): string {
  return data.name;
}

// ❌ AVOID: Non-null assertion without checks
const user = users.find(u => u.id === id)!;

// ✅ GOOD: Proper null checking
const user = users.find(u => u.id === id);
if (!user) {
  throw new Error('User not found');
}
```

### **Error Handling Issues** 🚨
```typescript
// ❌ AVOID: Unhandled promises
fetchUserData(userId);

// ✅ GOOD: Proper error handling
try {
  const userData = await fetchUserData(userId);
  return userData;
} catch (error) {
  console.error('Failed to fetch user data:', error);
  throw new Error('User data unavailable');
}

// ❌ AVOID: Generic error messages
throw new Error('Something went wrong');

// ✅ GOOD: Descriptive error messages
throw new ValidationError('Email format is invalid: expected format user@domain.com');
```

### **Performance Issues** ⚡
```typescript
// ❌ AVOID: Unnecessary re-renders
function UserList({ users }: { users: User[] }) {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// ✅ GOOD: Memoized components
const UserCard = React.memo(({ user }: { user: User }) => {
  return <div>{user.name}</div>;
});

// ❌ AVOID: Expensive computations in render
function Component({ data }: { data: Data[] }) {
  const expensiveResult = data.map(processExpensiveOperation);
  return <div>{expensiveResult}</div>;
}

// ✅ GOOD: Memoized computations
function Component({ data }: { data: Data[] }) {
  const expensiveResult = useMemo(
    () => data.map(processExpensiveOperation),
    [data]
  );
  return <div>{expensiveResult}</div>;
}
```

### **Code Quality Issues** 🧹
```typescript
// ❌ AVOID: Magic numbers
const timeout = 5000;
const limit = 100;

// ✅ GOOD: Named constants
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RESULTS_LIMIT = 100;

// ❌ AVOID: Deep nesting
if (user) {
  if (user.permissions) {
    if (user.permissions.includes('admin')) {
      return adminPanel;
    }
  }
}

// ✅ GOOD: Early returns
if (!user?.permissions?.includes('admin')) {
  return unauthorizedMessage;
}
return adminPanel;
```

---

## ✅ 5. Pre-PR Checklist

### **Before Creating PR**
```bash
# 🔍 Code Quality
□ Run all tests: npm run test
□ Run linting: npm run lint  
□ Run type checking: npm run typecheck
□ Check test coverage: npm run test:coverage
□ Review your own changes line by line

# 🧪 Testing
□ All existing tests pass
□ New tests added for new functionality
□ Edge cases tested
□ Error scenarios tested
□ Manual testing completed

# 📝 Documentation
□ Code comments added for complex logic
□ README updated if needed
□ API docs updated if needed
□ Migration notes added if needed

# 🔒 Security
□ No secrets in code
□ Input validation implemented
□ XSS prevention applied
□ SQL injection prevention applied
□ Authentication/authorization checked

# 🎯 Focus Areas (CodeRabbit Config)
□ Type safety validated
□ Error handling comprehensive
□ Security best practices followed
□ Performance implications considered
```

### **PR Creation**
```bash
□ Descriptive title (50 chars max)
□ Comprehensive description using template
□ Labels applied correctly
□ Reviewers assigned
□ Linked to relevant issues
□ Screenshots added for UI changes
□ Deployment notes included if needed
```

---

## 💬 6. Review Response Templates

### **Acknowledging Feedback**
```markdown
✅ **Accepted**: Great catch! Fixed in [commit hash].

🔄 **In Progress**: Working on this change, will update shortly.

❓ **Question**: Could you clarify what you mean by [specific part]?

💭 **Alternative**: I considered this approach, but chose X because [reasoning]. What do you think?

🚀 **Done**: Implemented as suggested in [file:line].
```

### **Disagreeing Respectfully**
```markdown
🤔 **Discussion**: I understand your concern about [issue]. However, I think the current approach is better because:
- Reason 1
- Reason 2
Would you be open to keeping it as-is, or would you prefer we discuss alternatives?

📚 **Context**: This follows the pattern established in [file/PR], but I'm happy to change if we want to update our approach.
```

### **Requesting Clarification**
```markdown
❓ **Need clarification**: 
- Are you suggesting [specific change]?
- Should this apply to all similar cases in the codebase?
- Would you like me to extract this to a utility function?

🎯 **Scope question**: Should I address this in this PR or create a follow-up issue?
```

---

## 🎯 7. Merge Criteria

### **Required Before Merge** ✅
```bash
□ All CodeRabbit feedback addressed
□ All CI checks passing
□ At least one approving review
□ No unresolved conflicts
□ Branch up to date with main
□ All tests passing (unit + integration)
□ No security warnings
□ Performance benchmarks within limits
```

### **Quality Gates** 🚪
- **Test Coverage**: Maintain or improve existing coverage
- **Bundle Size**: No significant increase without justification
- **TypeScript**: Zero type errors
- **Linting**: Zero violations
- **Security**: Pass security scan
- **Accessibility**: Pass axe-core checks (for UI changes)

### **Breaking Change Process** 💥
```bash
□ Breaking change labeled
□ Migration guide provided
□ Backward compatibility considered
□ Version bump planned
□ Stakeholders notified
□ Documentation updated
```

---

## 🚀 Quick Start Checklist

**Before you start coding:**
1. Read the issue/requirement thoroughly
2. Plan your changes (keep them small!)
3. Create feature branch from latest main

**While coding:**
1. Make frequent, small commits
2. Write tests as you go
3. Run checks locally often

**Before creating PR:**
1. Use the pre-PR checklist above
2. Write a clear PR description
3. Add screenshots for UI changes
4. Set appropriate labels and reviewers

**During review:**
1. Respond promptly to feedback
2. Make requested changes
3. Re-request review after changes

**Ready to merge:**
1. Ensure all checks pass
2. Squash commits if requested
3. Celebrate! 🎉

---

## 📞 Need Help?

- **CodeRabbit Issues**: Check `.coderabbit.yml` configuration
- **Test Problems**: Review existing test patterns in `/tests`
- **Type Errors**: Check `/frontend/src/types` for existing types
- **Questions**: Create an issue with `question` label

---

*Last updated: Based on codebase analysis as of August 2024*