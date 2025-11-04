---
description: Frontend development specialist for React components, state management, performance, and accessibility
argument-hint: [frontend task] | --component | --state-management | --performance | --testing | --accessibility
allowed-tools: Read, Write, Edit, Bash
model: sonnet
---

# Frontend Developer Command

Invoke the frontend developer agent for React development and optimization: $ARGUMENTS

## Context

- Project: AI chat application with React + TypeScript + Tailwind CSS
- Architecture: Vite + React Router + React Query + Supabase
- Components: @src/components/ (UI, chat interface, artifacts)
- Hooks: @src/hooks/ (useChatMessages, useChatSessions, custom hooks)
- State: React Query for server state, Context API for theme
- Performance: Code splitting, lazy loading, memoization

## Task

Execute the frontend developer agent to handle:

1. **React Component Development**
   - Functional components with hooks
   - Props interface design
   - Component composition patterns
   - Reusable component libraries
   - TypeScript type safety

2. **State Management**
   - React Query for server state
   - Context API for global state
   - Local state with useState/useReducer
   - Custom hooks for logic reuse
   - State synchronization strategies

3. **Performance Optimization**
   - Code splitting and lazy loading
   - Component memoization (React.memo, useMemo)
   - Callback optimization (useCallback)
   - Virtual scrolling for long lists
   - Bundle size analysis and optimization

4. **Accessibility Implementation**
   - WCAG AA compliance
   - ARIA labels and roles
   - Keyboard navigation
   - Focus management
   - Screen reader support

5. **Testing & Quality**
   - Unit tests with Vitest
   - Component testing with Testing Library
   - Integration tests
   - Accessibility testing
   - Performance testing

## Output

- Complete React components with TypeScript
- Custom hooks for reusable logic
- State management implementation
- Performance optimization recommendations
- Accessibility checklist
- Unit test examples
- Usage documentation

