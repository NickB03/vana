# Contributing to Vana

Thank you for your interest in contributing to Vana AI Development Assistant! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Other unprofessional conduct

Report issues to the project maintainers through GitHub issues.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **npm** (comes with Node.js)
- **Git** for version control
- A **GitHub account**
- Basic knowledge of **React**, **TypeScript**, and **Supabase**

### First Time Contributors

Looking for a place to start? Check out:

1. [Good First Issues](https://github.com/NickB03/llm-chat-site/labels/good%20first%20issue) - Beginner-friendly tasks
2. [Help Wanted](https://github.com/NickB03/llm-chat-site/labels/help%20wanted) - Issues where we need help
3. [Documentation](https://github.com/NickB03/llm-chat-site/labels/documentation) - Improve our docs

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/llm-chat-site.git
cd llm-chat-site
```

### 2. Install Dependencies

```bash
npm install
```

**Important**: Always use `npm` (never Bun, Yarn, or pnpm) to avoid lock file conflicts.

### 3. Environment Setup

Create `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

Contact maintainers for development API keys if needed.

### 4. Start Development Server

```bash
npm run dev
```

App will be available at `http://localhost:8080`

### 5. Run Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test -- --watch
```

### 6. Build for Production

```bash
npm run build
```

---

## How to Contribute

### Types of Contributions

We welcome:

- **Bug fixes** - Fix issues and edge cases
- **New features** - Add functionality (discuss first in an issue)
- **Documentation** - Improve README, guides, API docs
- **Tests** - Increase test coverage
- **Performance** - Optimize rendering, bundle size, etc.
- **Accessibility** - Improve WCAG compliance
- **Design** - UI/UX improvements

### Reporting Bugs

Before creating a bug report:

1. **Search existing issues** to avoid duplicates
2. **Reproduce the bug** and gather details
3. **Check if it's already fixed** in the latest version

When reporting, include:

- **Clear title** describing the issue
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Browser/OS** information
- **Console errors** (if any)

**Template**:

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: Chrome 120
- OS: macOS 14.1
- Version: v1.2.0

## Screenshots
[If applicable]

## Console Errors
[Paste error messages]
```

### Suggesting Features

Before suggesting a feature:

1. **Search existing feature requests**
2. **Consider if it aligns** with project goals
3. **Think about implementation** complexity

Feature request template:

```markdown
## Feature Description
[Clear description of the feature]

## Problem It Solves
[What problem does this address?]

## Proposed Solution
[How would this work?]

## Alternatives Considered
[Other approaches you've thought about]

## Additional Context
[Screenshots, mockups, examples]
```

---

## Pull Request Process

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

**Branch Naming**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `perf/` - Performance improvements

### 2. Make Changes

Follow our [Coding Standards](#coding-standards) and:

- Make focused, atomic commits
- Write clear commit messages
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style (formatting, semicolons)
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

**Examples**:

```bash
git commit -m "feat(chat): add Chain of Thought reasoning display"
git commit -m "fix(artifacts): resolve React import validation issue"
git commit -m "docs(api): add generate-artifact endpoint documentation"
git commit -m "test(hooks): increase useChatMessages coverage to 95%"
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill out PR template:

```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #[issue-number]

## How Has This Been Tested?
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows project style guide
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

### 6. Code Review

- Maintainers will review your PR
- Address feedback promptly
- Make requested changes in new commits
- Once approved, maintainers will merge

### 7. After Merge

```bash
# Update your main branch
git checkout main
git pull origin main

# Delete feature branch
git branch -d feature/your-feature-name
```

---

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Define types** for props, state, and function parameters
- **Avoid `any`** - use specific types or `unknown`
- **Use interfaces** for object shapes

**Example**:

```typescript
// ✅ Good
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

function processMessage(message: ChatMessage): void {
  // ...
}

// ❌ Bad
function processMessage(message: any) {
  // ...
}
```

### React Components

- **Use functional components** with hooks
- **Prefer named exports** over default exports
- **Extract complex logic** to custom hooks
- **Memoize** expensive computations

**Example**:

```typescript
// ✅ Good
export function ChatMessage({ message }: { message: ChatMessage }) {
  const processedContent = useMemo(() => {
    return processMarkdown(message.content);
  }, [message.content]);

  return <div>{processedContent}</div>;
}

// ❌ Bad
export default function ChatMessage(props) {
  const processedContent = processMarkdown(props.message.content); // Runs every render
  return <div>{processedContent}</div>;
}
```

### File Organization

```
src/
├── components/      # React components
│   ├── ui/         # Shared UI components
│   └── ChatInterface.tsx
├── hooks/          # Custom hooks
├── utils/          # Utility functions
├── types/          # TypeScript types
└── pages/          # Route components
```

### Styling

- **Use Tailwind CSS** for styling
- **Follow shadcn/ui patterns** for components
- **Use CSS modules** for component-specific styles (when needed)
- **Prefer utility classes** over custom CSS

### Code Formatting

- **Use ESLint** for linting
- **Run linter** before committing: `npm run lint`
- **Fix auto-fixable issues**: `npm run lint --fix`
- **No console.log** in production code (use for debugging only)

### Comments

- **Write self-documenting code** (clear variable/function names)
- **Add comments** for complex logic
- **Use JSDoc** for functions/hooks

**Example**:

```typescript
/**
 * Streams chat messages from the AI with real-time updates
 * @param content - User's message content
 * @param options - Streaming options (callbacks, reasoning, etc.)
 * @returns Promise that resolves when streaming completes
 */
async function streamChat(
  content: string,
  options?: StreamOptions
): Promise<void> {
  // Implementation
}
```

---

## Testing Guidelines

### Test Coverage Requirements

- **Minimum**: 55% overall coverage
- **Target**: 75%+ coverage
- **Critical paths**: 90%+ coverage

### Writing Tests

Use **Vitest** for testing:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies correct styling for AI messages', () => {
    render(<ChatMessage message={mockAIMessage} />);
    const element = screen.getByRole('article');
    expect(element).toHaveClass('ai-message');
  });
});
```

### Test Types

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user flows (when applicable)

### Running Tests

```bash
# All tests
npm run test

# Specific file
npm run test -- ChatMessage.test.tsx

# Coverage
npm run test:coverage

# Watch mode
npm run test -- --watch
```

---

## Documentation

### Updating Documentation

When making changes, update:

- **README.md** - If adding major features
- **API_REFERENCE.md** - If changing API endpoints
- **HOOKS_REFERENCE.md** - If adding/modifying hooks
- **Inline comments** - For complex code
- **TypeScript types** - Keep type definitions accurate

### Documentation Style

- Use **clear, concise language**
- Include **code examples**
- Add **screenshots** for UI changes
- Keep **changelog** updated

---

## Community

### Getting Help

- **GitHub Discussions**: Ask questions and discuss ideas
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check docs first before asking

### Communication

- Be patient and respectful
- Provide context in questions
- Share knowledge with others
- Give credit where due

---

## License

By contributing to Vana, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

If you have questions about contributing:

1. Check existing [documentation](./docs/)
2. Search [GitHub Issues](https://github.com/NickB03/llm-chat-site/issues)
3. Create a new issue with "Question" label

---

**Thank you for contributing to Vana!** 🎉

Your contributions help make AI development tools more accessible and powerful for everyone.

---

**Last Updated**: 2025-11-17
