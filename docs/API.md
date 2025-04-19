# API Documentation

## Endpoints

### POST /run
- **Description**: Triggers an agent task via n8n workfflow orchestration.
- **Request Body**:
   ```json
    {
      "user_id": "string",
      "task_type": "plan|execute|diagnose",
      "prompt": "string",
      "agent_id": "string (optional)"
    }
    ```
- **Response**:
    ```json
    {
      "run_id": "string",
      "status": "processing|completed|failed",
      "output": "string",
      "error": "string (if failed)"
    }
    ```
- **Notes**:
    - Forwards payload to n8n – routes to the selected agent
    - Agent retrieves memory via Korvus `/search`
    - Final prompt is assembled and passed to Gemini (Vertex AI)
    - Result is embedded and logged to Supabase + Korvus `/embed`

## GET /replay/:run_id
- **Description**:
    Retrieves historical execution context from Supabase + memory cache.
- **Response**:
   ```json
    {
      "run_id": "string",
      "timestamp": "ISO0",
      "agent_used": "string",
      "prompt": "string",
      "context_used": "string",
      "response": "string",
      "status": "completed|failed",
      "error_details": "string (if failed)"
    }
    ```

## Authentication
- **Required Header**: `Authorization: Bearer <API_KEY>`
- **Valid Scopes**:
    - `run:execute`
    - `data:read`
    - `system:monitor`

## Security
- All endpoints use HTTPS
- Request body is encrypted with AES-256
- JWT validation for all authenticated requests
- Rate limiting enforced at API Gateway
