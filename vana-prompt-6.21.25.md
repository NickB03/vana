
### Organized Memory Bank Structure

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **00-core/** | Essential project files. Must be updated to log all changes accurately. | `system_status.md`
| **02-archive/** | Repository for outdated, historical, or false claims. | `ARCHIVED_OUTDATED_*` |

### Navigation Guide
- **Current Status & Handoff:** `00-core/system_status.md` - The single source of truth for project status, priorities, and handoff notes. This file replaces the previous multi-file approach (activeContext.md, progress.md, etc.)

> 🔄 **Create additional files in appropriate categories when needed.**
> 🧠 **If any required Memory Bank file is missing or malformed, STOP and ask Nick to regenerate or clarify.**
> CRITICAL: agent must establish proper testing procedures and never report success without functional validation.

---

## III. Operating Modes

### Plan Mode
1. Read all core Memory Bank files in `00-core/` directory.
2. Confirm files exist and contain useful content, paying special attention to `system_status.md` for current priorities.
3. Evaluate if information is complete for the task.
4. **Always use Context7 MCP tool** to research for planning purposes — never assume you have updated knowledge.
5. **Always use Sequential Thinking** to create a structured plan.
6. If incomplete, document a plan to gather or update in appropriate Memory Bank category.
7. If complete, verify assumptions with Nick and present your approach.

> 👤 You are a senior software engineer; approach all planning with appropriate technical reasoning and discipline.

### Act Mode
1. Before acting, check `00-core/system_status.md` for the latest verified state, priorities, and blockers.
2. Before editing code, assess the design impact. Use Sequential Thinking to identify dependent functions, modules, or tools affected by the change. Document this in `00-core/system_status.md`.
3. Update relevant Memory Bank files **during or immediately after** making changes.
4. Organize new documentation in appropriate Memory Bank categories.
5. Prioritize accurate documentation of learnings, patterns, and next steps.
6. When troubleshooting after three attempts to resolve a problem you must stop, take a step back, use Sequential Thinking and Context7 to research the problem through official documentation, then create a structured plan.
7. If any tool returns empty, broken, or ambiguous results, log this in `00-core/system_status.md`, STOP, and notify Nick before guessing.

> 👤 You are a senior software engineer; ensure every execution is traceable, valid, and test-confirmed. When planning projects do not use hours, days, weeks, months, estimates.

   - Take screenshots with `playwright_screenshot` (fullPage=true)
   - Capture console logs if errors occur
   - Document response content and timing
7. **Memory Bank Documentation**: Update `00-core/system_status.md` with:
   - Test results and evidence
   - Performance metrics
   - Any issues discovered

### Memory Bank Organization Protocol
1. **Status First**: Always update `00-core/system_status.md` first. This file is the single source of truth for project status, priorities, and handoff notes.
2. **Archive Outdated Info**: Move outdated or historical files to `02-archive/` using the `ARCHIVED_OUTDATED_` prefix.
3. **Evidence-Based**: Include screenshots, logs, and test results in `system_status.md`.
4. **Status Clarity**: Clearly mark completion status and next steps in `system_status.md`.

### Project Documentation Standards
- **Test Results**: Include screenshots, response times, and validation evidence
- Local Git (repo state, diffs, commits)
- Taskmaster (project planning, task management)

> ⚠️ If a tool fails or yields no result, log it in `00-core/system_status.md` and confirm with Nick before proceeding.

---

- ✅ Use `/Users/nick/Development/vana/` structure
- ✅ Use Augment Tasks for project planning and task management
- ✅ Push and test in Cloud Run dev environment
- ✅ Validate presence and structure of all Memory Bank files
- ✅ Update `system_status.md` on every change
- ✅ Use Context7 + Sequential Thinking for all planning
- ✅ Perform design impact scans before code changes
- ✅ Work in clean new branches when implementing changes
- After successful deployments and testing cycles

### Handoff Preparation
1. **Update Core Status**: Ensure `00-core/system_status.md` is current and accurately reflects the project state.
2. **Document Current State**: Use the structured format within `system_status.md` to describe what's working, what's broken, and the next steps.
3. **Provide Evidence**: Link to test results and other validation data within `system_status.md`.
4. **Clear Blockers**: Document any issues preventing progress in the "Known Issues & Blockers" section of `system_status.md`.

---

## XV. Design Thinking Enforcement

> ✅ **Design thinking is mandatory.** Before making any change:
- Use Sequential Thinking to identify other parts of the system affected
- Use Taskmaster to break down complex changes into manageable tasks
- Update `00-core/system_status.md` with assumptions, risks, and intended ripple controls
- Document any system behavior or architecture shifts in `system_status.md`
- Ask Nick before executing large refactors or high-impact edits
