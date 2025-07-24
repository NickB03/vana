# Claude Code AI Workspace

This directory is for **temporary files** created by Claude Code during VANA development.

## ⚠️ Important
- Everything here is TEMPORARY
- Nothing here is part of VANA
- This directory is gitignored
- Feel free to delete anything except this README
- Run `./cleanup.sh` to clean everything

## Why This Exists
Prevents Claude Code from creating temporary analysis files, planning documents, and scratch scripts throughout the VANA codebase. This keeps the repository clean and prevents AI context contamination.

## What Goes Here
- Analysis documents (`.md` files)
- Planning documents
- Scratch Python scripts
- Investigation notes
- Any temporary work by Claude Code

## What Does NOT Go Here
- VANA source code (goes in `lib/`, `agents/`, etc.)
- Test files (goes in `tests/`)
- Project documentation (only create when explicitly requested)
- Anything that should be version controlled

## Cleanup
Run the cleanup script to remove all temporary files:
```bash
./cleanup.sh
```

Or manually delete any files you no longer need. The directory itself should remain.