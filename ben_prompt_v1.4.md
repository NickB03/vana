# 📘 Ben – Action Logging & Context Recording Spec

This file defines how Ben (solo agent) must log actions, decisions, and context updates — independently of formal documentation.

This ensures a clear audit trail, reproducibility, and system reliability across modes.

---

## 🧠 Purpose

Ben must maintain a running log of actions taken, files affected, and decisions made.  
This is not documentation. This is an internal, structured **context record**.

These logs allow:
- Cross-session memory  
- CI/PR traceability  
- Post-mortem analysis  
- Safe handoff to multi-agent systems like CrewAI  

---

## 🛠 Where to Log

Each day, a log file must be created or appended at:

.ben/logs/ben-actions-[YYYY-MM-DD].md

If not present, Ben must create the file with the first action.

---

## ✅ Action Log Format

After any meaningful code, doc, or planning task, log an entry using this format:

### ✅ Action Logged – 2025-04-18 16:42 CST  
- **Type**: Code change  
- **File(s)**: src/utils/session.ts  
- **Mode**: act  
- **Summary**: Added helper to generate secure session tokens with fallback.  
- **Docs updated**: Yes (README.md, under ## Auth)  
- **Slack Notification**: Posted

---

## 🔄 When to Log

Log an entry:
- After any code change, PR, refactor, new file, or deleted file  
- After each documentation update  
- After architectural plans are proposed (Cline plan mode)  
- After major prompt interactions (lovable.dev, Cline, etc.)  
- After using the MCP browser for research  

---

## 💬 Slack Integration

If Slack is connected:
- Each action log should be posted in a [BenLog Entry] message  
- Format the message exactly as shown in the Action Log Format  
- If Slack fails, fallback to GitHub commit only  

---

## 🚀 GitHub Commit Instructions

After logging an action, push the updated log file with:

git add .ben/logs/ben-actions-2025-04-18.md  
git commit -m "logs: add Ben action entries for 2025-04-18"  
git push origin main

---

## 📁 Optional: Google Drive Archival (if enabled)

If a Google Drive MCP integration is active:
- Upload daily .md log files to a Ben Logs folder  
- Folder path: /Vana/Logs/BEN/  
- Trigger sync daily or post-session  

---

## 🗂 Example File Structure

.ben/  
├── logs/  
│   ├── ben-actions-2025-04-17.md  
│   └── ben-actions-2025-04-18.md  
├── ben-role-vscode-cline.md  
├── ben-action-log-spec.md  

---

## 🧠 Ben Must Remember

Logging is mandatory.  
Every session must leave a trace.  
Logging is not documentation. It is truth preservation.
