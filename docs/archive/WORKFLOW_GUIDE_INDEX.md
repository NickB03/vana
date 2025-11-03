# Development Workflow Guide - Start Here

## =Ú Complete Documentation Index

This document helps you navigate all the workflow documentation for developing with **Lovable Cloud + Claude Code (VSCode)**.

---

## =€ Quick Start (Read This First!)

### New to this workflow?

**Start with these 3 documents in order:**

1. **[ACTUAL_WORKFLOW.md](ACTUAL_WORKFLOW.md)** P **START HERE**
   - Understand how Lovable actually works
   - Learn the complete safe workflow
   - See real examples of feature development
   - **Time to read: 20 minutes**
   - **Must read before doing anything!**

2. **[COLLABORATION_WORKFLOW.md](COLLABORATION_WORKFLOW.md)**
   - How to use Claude Code + Lovable AI together
   - When to use each tool
   - Practical daily workflows
   - **Time to read: 15 minutes**
   - **Read before starting development**

3. **[PREVIEW_TESTING_GUIDE.md](PREVIEW_TESTING_GUIDE.md)**
   - How to use FREE preview testing
   - Testing checklists for different scenarios
   - Debugging failed tests
   - **Time to read: 15 minutes**
   - **Reference during testing**

**Total time: 50 minutes** to fully understand the workflow.

---

## =Ö Full Documentation Library

### Core Workflow Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[ACTUAL_WORKFLOW.md](ACTUAL_WORKFLOW.md)** | Complete workflow with Lovable branch switching | First time, then reference |
| **[COLLABORATION_WORKFLOW.md](COLLABORATION_WORKFLOW.md)** | Using Claude Code + Lovable together | Before starting development |
| **[PREVIEW_TESTING_GUIDE.md](PREVIEW_TESTING_GUIDE.md)** | Comprehensive preview testing strategy | During testing phase |
| **[SAFE_DEVELOPMENT_WORKFLOW.md](SAFE_DEVELOPMENT_WORKFLOW.md)** | Git branching safety guide | When concerned about production safety |

---

### Advanced/Optional Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[LOCAL_BACKEND_TESTING.md](LOCAL_BACKEND_TESTING.md)** | Setting up local Supabase for backend testing | If you want to test edge functions locally |
| **[HYBRID_DEVELOPMENT_WORKFLOW.md](HYBRID_DEVELOPMENT_WORKFLOW.md)** | Initial hybrid approach (superseded by ACTUAL_WORKFLOW) | Historical reference |
| **[LOVABLE_TO_SUPABASE_MIGRATION.md](LOVABLE_TO_SUPABASE_MIGRATION.md)** | Migrating away from Lovable Cloud | If you decide to self-host |
| **[LOCAL_DEV_WITH_LOVABLE_CLOUD.md](LOCAL_DEV_WITH_LOVABLE_CLOUD.md)** | Understanding Lovable Cloud architecture | For deeper understanding |

---

## <¯ Quick Reference

### Daily Workflow

```bash
# Morning
git checkout -b feature/my-feature
git push origin feature/my-feature
# Switch Lovable: Project Settings ’ Working Branch ’ feature/my-feature
npm run dev

# During Day
# - Develop (Claude Code or Lovable AI)
# - Test locally
# - Push to feature branch
# - Preview test (FREE)
# - Iterate

# Deploy
git checkout main
git merge feature/my-feature
git push origin main
# Switch Lovable to main ’ Click "Publish"
```

---

##  Getting Started

1. **Read [ACTUAL_WORKFLOW.md](ACTUAL_WORKFLOW.md)** (20 min)
2. **Read [COLLABORATION_WORKFLOW.md](COLLABORATION_WORKFLOW.md)** (15 min)
3. **Create test feature branch** (5 min)
4. **Practice workflow** (30 min)

**Total: ~1 hour to become proficient**

---

**Last updated:** 2025-10-28
