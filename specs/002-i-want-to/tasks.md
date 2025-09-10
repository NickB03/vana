# Tasks: Frontend Development Continuation

**Input**: Design documents from `/specs/002-i-want-to/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Next.js 15, React 19, shadcn/ui v4, Tailwind CSS, FastAPI backend
   → Structure: Web application (frontend + backend)
2. Load design documents ✅:
   → data-model.md: 6 entities → model/type definition tasks
   → contracts/: API contracts → contract test tasks
   → quickstart.md: Setup scenarios → validation tasks
3. Generate tasks by category:
   → Setup: project backup, dependencies, approval workflow
   → Tests: contract tests, component tests (TDD)
   → Core: shadcn/ui installation, chat components rebuild
   → Integration: SSE client, backend API integration
   → Polish: modern minimal theme, accessibility, performance
4. Apply task rules:
   → Different components = mark [P] for parallel
   → Same files = sequential (no [P])
   → Tests before implementation (TDD)
5. Tasks numbered sequentially (T001, T002...)
6. SUCCESS: 40 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Backup
- [ ] T001 Backup current sidebar layout to `.claude_workspace/archived/sidebar-backup-$(date +%Y%m%d)`
- [ ] T002 Backup current frontend components to `.claude_workspace/archived/frontend-backup-$(date +%Y%m%d)`
- [ ] T003 [P] Install shadcn/ui CLI and verify Next.js 15 compatibility in frontend/package.json
- [ ] T004 [P] Setup component approval workflow directories in frontend/.component-approval/
- [ ] T005 [P] Initialize Playwright for component validation in frontend/playwright.config.ts

## Phase 3.2: shadcn/ui Component Installation (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: Install missing components via CLI ONLY - verify each installation**
- [ ] T006 [P] Install alert-dialog component: `npx shadcn@latest add alert-dialog` in frontend/
- [ ] T007 [P] Install breadcrumb component: `npx shadcn@latest add breadcrumb` in frontend/
- [ ] T008 [P] Install checkbox component: `npx shadcn@latest add checkbox` in frontend/
- [ ] T009 [P] Install collapsible component: `npx shadcn@latest add collapsible` in frontend/
- [ ] T010 [P] Install command component: `npx shadcn@latest add command` in frontend/
- [ ] T011 [P] Install context-menu component: `npx shadcn@latest add context-menu` in frontend/
- [ ] T012 [P] Install hover-card component: `npx shadcn@latest add hover-card` in frontend/
- [ ] T013 [P] Install menubar component: `npx shadcn@latest add menubar` in frontend/
- [ ] T014 [P] Install popover component: `npx shadcn@latest add popover` in frontend/
- [ ] T015 [P] Install switch component: `npx shadcn@latest add switch` in frontend/

## Phase 3.3: Component Approval Workflow Setup
- [ ] T016 Create component validation script in scripts/validate-component.sh
- [ ] T017 Create component approval checklist template in frontend/.component-approval/checklist.md
- [ ] T018 [P] Setup Playwright component tests in frontend/tests/component/test_component_standards.spec.ts
- [ ] T019 [P] Create component tracking system in frontend/.component-approval/component_track.md
- [ ] T020 Setup approval workflow automation in frontend/.github/workflows/component-approval.yml

## Phase 3.4: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.5
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T021 [P] Contract test POST /api/run_sse in frontend/tests/contract/test_run_sse_post.spec.ts
- [ ] T022 [P] Contract test GET /api/apps/{app}/users/{user}/sessions in frontend/tests/contract/test_sessions_get.spec.ts
- [ ] T023 [P] SSE connection test in frontend/tests/integration/test_sse_connection.spec.ts
- [ ] T024 [P] Authentication flow test in frontend/tests/integration/test_auth_flow.spec.ts
- [ ] T025 [P] Chat session persistence test in frontend/tests/integration/test_session_persistence.spec.ts

## Phase 3.5: Core Chat Interface Rebuild (ONLY after tests are failing)
- [ ] T026 Create TypeScript types from data-model.md in frontend/src/types/chat.ts
- [ ] T027 Create SSE client hook using contracts/sse-events.yaml in frontend/src/hooks/useSSEClient.ts
- [ ] T028 [P] Rebuild ChatHeader component following approval workflow in frontend/src/components/chat/chat-header.tsx
- [ ] T029 [P] Rebuild ChatInput component with shadcn/ui standards in frontend/src/components/chat/chat-input.tsx
- [ ] T030 [P] Rebuild ChatMessage component with modern minimal theme in frontend/src/components/chat/chat-message.tsx
- [ ] T031 [P] Rebuild ChatProgress component with real-time updates in frontend/src/components/chat/chat-progress.tsx
- [ ] T032 Create ChatSession context with SSE integration in frontend/src/contexts/ChatSessionContext.tsx
- [ ] T033 Create API client for backend integration in frontend/src/lib/api-client.ts
- [ ] T034 Integrate authentication with existing FastAPI system in frontend/src/lib/auth.ts
- [ ] T035 Update main chat page with rebuilt components in frontend/src/app/page.tsx

## Phase 3.6: Modern Minimal Theme Implementation
- [ ] T036 [P] Create modern minimal design tokens in frontend/src/styles/tokens.css
- [ ] T037 [P] Update Tailwind config for minimal theme in frontend/tailwind.config.ts
- [ ] T038 [P] Apply minimal theme to sidebar (preserve layout) in frontend/src/components/ui/sidebar.tsx
- [ ] T039 [P] Apply minimal theme to chat components in frontend/src/components/chat/
- [ ] T040 [P] Remove claymorphism styles from frontend/app/globals.css

## Dependencies
- Backup (T001-T002) before any component changes
- Component installation (T006-T015) before approval workflow (T016-T020)
- Contract tests (T021-T025) before implementation (T026-T035)
- T026 (types) blocks T027-T035
- T027 (SSE hook) blocks T032 (context)
- T032 (context) blocks T035 (main page)
- Implementation before theme (T036-T040)

## Parallel Execution Examples

### Phase 1: Component Installation (after T005)
```bash
# Launch T006-T015 together (different shadcn components):
Task: "Install alert-dialog component: npx shadcn@latest add alert-dialog in frontend/"
Task: "Install breadcrumb component: npx shadcn@latest add breadcrumb in frontend/"
Task: "Install checkbox component: npx shadcn@latest add checkbox in frontend/"
Task: "Install collapsible component: npx shadcn@latest add collapsible in frontend/"
Task: "Install command component: npx shadcn@latest add command in frontend/"
# ... continue with T011-T015
```

### Phase 2: Contract Tests (after T020)
```bash
# Launch T021-T025 together (different test files):
Task: "Contract test POST /api/run_sse in frontend/tests/contract/test_run_sse_post.spec.ts"
Task: "Contract test GET sessions in frontend/tests/contract/test_sessions_get.spec.ts"
Task: "SSE connection test in frontend/tests/integration/test_sse_connection.spec.ts"
Task: "Authentication flow test in frontend/tests/integration/test_auth_flow.spec.ts"
Task: "Chat session persistence test in frontend/tests/integration/test_session_persistence.spec.ts"
```

### Phase 3: Component Rebuild (after T026-T027)
```bash
# Launch T028-T031 together (different component files):
Task: "Rebuild ChatHeader component following approval workflow in frontend/src/components/chat/chat-header.tsx"
Task: "Rebuild ChatInput component with shadcn/ui standards in frontend/src/components/chat/chat-input.tsx"
Task: "Rebuild ChatMessage component with modern minimal theme in frontend/src/components/chat/chat-message.tsx"
Task: "Rebuild ChatProgress component with real-time updates in frontend/src/components/chat/chat-progress.tsx"
```

### Phase 4: Theme Application (after T035)
```bash
# Launch T036-T040 together (different style files):
Task: "Create modern minimal design tokens in frontend/src/styles/tokens.css"
Task: "Update Tailwind config for minimal theme in frontend/tailwind.config.ts"  
Task: "Apply minimal theme to sidebar (preserve layout) in frontend/src/components/ui/sidebar.tsx"
Task: "Apply minimal theme to chat components in frontend/src/components/chat/"
Task: "Remove claymorphism styles from frontend/app/globals.css"
```

## Task Generation Rules Applied

1. **From Contracts** (✅):
   - api-contracts.yaml → contract test tasks T021-T022
   - sse-events.yaml → SSE integration tasks T023, T027, T032
   
2. **From Data Model** (✅):
   - 6 entities → TypeScript types task T026
   - Relationships → context and service tasks T032-T034
   
3. **From Plan Requirements** (✅):
   - Component approval workflow → setup tasks T016-T020
   - Modern minimal theme → theme tasks T036-T040
   - Preserve sidebar → backup task T001, careful update T038
   
4. **From Quickstart Scenarios** (✅):
   - Component installation → validation tasks T006-T015
   - SSE connection → integration test T023
   - Authentication → auth integration T024, T034

## Validation Checklist
*GATE: All items checked before task execution*

- [x] All contracts have corresponding tests (T021-T025)
- [x] All entities have model/type tasks (T026)
- [x] All tests come before implementation (T021-T025 before T026-T035)
- [x] Parallel tasks truly independent ([P] tasks use different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Component approval workflow properly sequenced
- [x] Modern minimal theme applied after core functionality
- [x] Current sidebar layout preserved with backup option
- [x] TDD principles enforced (tests fail before implementation)

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each completed task
- Follow component approval workflow for all chat components
- Preserve current sidebar layout (backed up in T001)
- Use CLI-only for all shadcn/ui component installations
- Modern minimal theme replaces claymorphism per user preference
- All SSE integration must connect to existing FastAPI backend at localhost:8000

## SUCCESS: 40 Tasks Generated
**Ready for execution following TDD and constitutional principles**