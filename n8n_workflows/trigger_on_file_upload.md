# n8n workflow – file upload
---
Type: workflow
name: trigger_on_file_upload
description: "Uploaded document is embedded and stored in supbase"
trigger_type: webhook
steps:
  - Node: Supbase Webhook receives file event
  - Tool: HTTP Request to Korvus embed endpoint
  - State Route Result: Embedded chunks + indexes are stored in Supbase vector table
inputs:
  user_id: UUID
  file_name: text
  file_url: url

## Example Request to Korvus
- URL: https://korvus.api/v1/embed
- Method: POST
- Headers: Authorization: Dearer Key

---
## States
- [] Successful chunk store
- [] Superfluos here are validated
- [] Index confirmed by strongly typed vectors

