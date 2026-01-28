# Contributing to Vana

Thank you for your interest in contributing to Vana! We welcome contributions from the community and are grateful for any help you can provide.

## Code of Conduct

We follow standard open-source community practices. Please be respectful, inclusive, and constructive in all interactions. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community and project

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v20+ | LTS recommended |
| npm | v10+ | Comes with Node.js |
| Deno | v1.40+ | For Edge Functions development |
| Supabase CLI | v1.x | For local development |
| Docker | Latest | Required for Supabase local development |

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/[your-username]/vana-chat.git
cd vana-chat

# Install dependencies
npm install

# Start local Supabase (requires Docker)
supabase start

# Start the development server
npm run dev
```

The development server runs on **port 8080** by default.

## Development Workflow

### Fork and Branch

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from `main`:

```bash
git checkout -b feat/your-feature-name
```

### Branch Naming Convention

Use the following prefixes for your branches:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring |
| `test/` | Test additions or modifications |
| `chore/` | Maintenance tasks |

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Ensure all tests pass
4. Commit your changes following our commit conventions

## Commit Conventions

We use conventional commits for clear and consistent commit history.

### Format

```
<type>: <description>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure (no feature change) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat: add dark mode toggle to settings
fix: resolve rate limiting race condition
docs: update API documentation for artifact endpoints
refactor: extract validation logic to shared utilities
test: add integration tests for chat streaming
chore: update dependencies to latest versions
```

## Pull Request Process

### Before Submitting

Ensure your PR meets these requirements:

- [ ] All tests pass: `npm run test`
- [ ] Coverage is maintained: `npm run test:coverage` (minimum 55% threshold)
- [ ] No TypeScript errors: `npm run build`
- [ ] No hardcoded model names (use `MODELS.*` from `_shared/config.ts`)

### Submitting Your PR

1. Push your branch to your fork
2. Open a Pull Request against the `main` branch
3. Fill out the PR template with:
   - Description of changes
   - Related issue numbers
   - Testing performed
4. Wait for review and address any feedback

### Review Process

- PRs require at least one approval before merging
- CI/CD must pass all checks
- Address review comments promptly
- Keep PRs focused and reasonably sized

## Code Style

### TypeScript

- Use TypeScript with strict mode enabled
- Follow existing patterns in the codebase
- Prefer explicit types over `any`
- Use meaningful variable and function names

### Formatting

- Use existing ESLint and Prettier configurations
- Run linting before committing
- Keep files focused and reasonably sized

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test -- path/to/file.test.ts
```

### Writing Tests

- Write tests for all new features
- Update tests when modifying existing functionality
- Use descriptive test names
- Follow existing test patterns in `__tests__/` directories

## Questions?

If you have questions about contributing, feel free to:

- Open a GitHub Discussion
- Check existing issues for similar topics

Thank you for contributing to Vana!
