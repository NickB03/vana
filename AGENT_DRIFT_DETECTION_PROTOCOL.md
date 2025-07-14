# Agent Drift Detection Protocol

**MANDATORY**: Complete this checklist after EVERY micro-phase.

---

## 🚨 STOP - READ THIS FIRST

You have just completed a micro-phase. Before proceeding to the next one, you MUST complete this drift detection protocol. This prevents scope creep and ensures plan adherence.

---

## ✅ DRIFT-CHECK CHECKLIST

### Step 1: Scope Verification
Answer each question honestly:

- [ ] **Did I make ONLY the changes specified in the micro-phase?**
  - Yes: Continue to Step 2
  - No: Document what extra changes were made → DRIFT DETECTED

- [ ] **Did I change fewer than 3 files?**
  - Yes: Continue 
  - No: Review if all changes were necessary → POTENTIAL DRIFT

- [ ] **Did I add fewer than 50 lines of code?**
  - Yes: Continue
  - No: Review if addition matches micro-phase scope → POTENTIAL DRIFT

- [ ] **Did I preserve all existing functionality?**
  - Yes: Continue
  - No: Identify what was changed → DRIFT DETECTED

### Step 2: Test Verification
- [ ] **Do all existing tests still pass?**
  - Yes: Continue
  - No: Fix tests or revert changes → DRIFT DETECTED

- [ ] **Did I create the exact deliverable specified?**
  - Yes: Continue
  - No: Identify what's missing or extra → DRIFT DETECTED

### Step 3: Time Verification
- [ ] **Did the micro-phase take 15-30 minutes?**
  - Yes: Good scope sizing
  - No: Consider if scope was too large → POTENTIAL DRIFT

### Step 4: Plan Alignment
- [ ] **Does my change match the micro-phase description exactly?**
  - Yes: Continue
  - No: Document differences → DRIFT DETECTED

- [ ] **Did I follow the input/task/output/test format?**
  - Yes: Continue
  - No: Review what was skipped → PROCESS VIOLATION

---

## 🚨 IF DRIFT DETECTED

### Immediate Actions:
1. **STOP** all further work
2. **REVERT** to the last known good state
3. **DOCUMENT** exactly what drifted:
   ```
   DRIFT DETECTED:
   - Micro-Phase: MP-X.Y
   - Expected: [what the plan specified]
   - Actual: [what was implemented]
   - Root Cause: [why drift occurred]
   - Impact: [what this affects]
   ```
4. **SEEK CLARIFICATION** on the plan before proceeding

### Common Drift Patterns:
- **Scope Creep**: "While I'm here, let me also..."
- **Over-Engineering**: Adding features not specified
- **Under-Planning**: Skipping specified steps
- **Gold-Plating**: Making it "better" than planned
- **Shortcut Taking**: Skipping tests or validation

---

## ✅ NO DRIFT DETECTED - PROCEED

If all checks pass:

### Documentation Requirements:
1. **Update the plan**: Check off completed micro-phase
2. **Commit changes**: With descriptive message
3. **Add notes**: Any lessons learned or issues encountered

### Commit Message Format:
```
[MP-X.Y] Brief description

- Completed: [exactly what was done]
- Tested: [what tests were run]
- Impact: [what this enables]
- Duration: [actual time taken]
```

### Before Next Micro-Phase:
- [ ] Plan checkboxes updated
- [ ] Changes committed
- [ ] Notes documented if any
- [ ] Ready for next micro-phase

---

## 📊 DRIFT TRACKING

### Session Drift Score
Track your drift incidents to improve:

- **Perfect Session**: 0 drift incidents
- **Good Session**: 1 minor drift, caught early
- **Needs Improvement**: 2+ drift incidents
- **Stop and Review**: 3+ drift incidents

### Common Causes of Drift:
1. **Unclear micro-phase specification** → Improve plan clarity
2. **Time pressure** → Break into smaller micro-phases
3. **Complex dependencies** → Add prerequisite checks
4. **Scope ambiguity** → Add more specific success criteria
5. **Over-confidence** → Add more validation steps

---

## 🎯 SUCCESS INDICATORS

You're following the plan well if:
- ✅ Each micro-phase takes 15-30 minutes
- ✅ All tests pass after each micro-phase
- ✅ Zero breaking changes
- ✅ Clear deliverables each time
- ✅ Plan checkboxes accurately reflect reality

---

**Remember**: The plan exists to ensure business success. Drift detection isn't about perfection - it's about staying aligned with business goals and avoiding expensive mistakes.