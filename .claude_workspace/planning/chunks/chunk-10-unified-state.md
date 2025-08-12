# Chunk 10: Unified State Management

## PRD Section: 12. State Management

### Critical Requirements

1. **Unified Store**: Single root store with multiple slices
2. **Selective Persistence**: Only persist UI preferences and session metadata
3. **Store Subscriptions**: Reactive updates across components
4. **Immer Integration**: Immutable updates with mutable syntax
5. **TypeScript Safety**: Full type safety across all store operations

### Implementation Guide

#### Core Architecture
```typescript
// stores/index.ts - Root store configuration
- Combine all store slices into unified interface
- Configure persistence with selective partializing
- Setup subscriptions for cross-store reactions
- Implement middleware for debugging and logging

// stores/types.ts - TypeScript definitions
- Define all store interfaces and types
- Action type definitions with payloads
- State shape definitions for each slice
- Cross-store dependency types

// stores/subscriptions.ts - Store reactions
- Auto-canvas opening for code blocks
- SSE connection management on session changes
- Authentication state propagation
- Performance monitoring and metrics
```

#### Store Structure
```typescript
interface VanaStore {
  auth: AuthSlice
  session: SessionSlice  
  chat: ChatSlice
  canvas: CanvasSlice
  agentDeck: AgentDeckSlice
  upload: UploadSlice
  ui: UISlice
}
```

### Real Validation Tests

1. **State Synchronization**: Update canvas → UI reflects changes immediately
2. **Persistence**: Refresh browser → UI preferences and sessions restored
3. **Subscriptions**: New message with code → Canvas suggestion appears
4. **Type Safety**: Invalid store access → TypeScript compile error
5. **Performance**: 100 state updates → No unnecessary re-renders

### THINK HARD

- How do you handle circular dependencies between store slices?
- What's the optimal strategy for managing temporary vs. persistent state?
- How do you debug complex state interactions across multiple slices?
- What performance implications does the subscription system have?
- How do you handle state migrations when store structure changes?

### Component Specifications

#### Store Provider Setup
```typescript
// app/providers/StoreProvider.tsx
interface StoreProviderProps {
  children: React.ReactNode
  initialState?: Partial<VanaStore>
}

// Features:
- Root store provider with context
- Development mode debugging tools
- Store persistence hydration
- Error boundary for store failures
- Performance monitoring hooks
```

#### Store Hooks
```typescript
// lib/hooks/useVanaStore.ts
- Typed selectors for each store slice
- Shallow comparison for performance
- Action dispatchers with type safety
- Subscription helpers for reactive updates
- Development utilities and debugging
```

#### Subscription Manager
```typescript
// stores/subscriptions.ts
interface SubscriptionConfig {
  selector: (state: VanaStore) => any
  handler: (value: any, prevValue: any) => void
  options?: { fireImmediately?: boolean }
}

// Features:
- Declarative subscription setup
- Automatic cleanup on unmount
- Conditional subscription activation
- Performance optimized comparisons
- Error handling and recovery
```

### What NOT to Do

❌ Don't put all state in one massive object (use slices)
❌ Don't persist large datasets like chat histories locally
❌ Don't create circular subscription dependencies
❌ Don't mutate state directly outside of Immer actions
❌ Don't forget to cleanup subscriptions and timers
❌ Don't ignore TypeScript errors in store definitions

### Integration Points

- **All Components**: Access state through typed selectors
- **SSE Connection**: React to session and auth state changes
- **Persistence Layer**: Selective state hydration and dehydration
- **Performance Monitoring**: Track state updates and renders

---

*Implementation Priority: High - Foundation for all features*