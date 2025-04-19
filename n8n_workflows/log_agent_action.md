# n8n workflow – log_agent_action

---
Type: workflow
Name: log_agent_action
Description: "Captures agent action result, summary, and embedded memory from response"
Trigger: Lovable prompt end point

Steps:
  - Receive Agent id, user_id, project_id, task summary, content
  - Send summary + content to Korvus /embed_text
  - Insert embeddded action to Supbase agent_action_log table
Inputs:
  - agent_id
  - user_id
  - project_id
  - action_type
  - summary
  - content
