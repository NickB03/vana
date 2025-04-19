# API Documentation

## Endpoints

### POST /run
- **Description**: Execute an AI agent task
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
- **Example**:
  ```bash
  curl -X POST "https://api.vana.com/run" \
    -H "Authorization: Bearer $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": "12345",
      "task_type": "plan",
      "prompt": "Create a deployment checklist for the Vana platform",
      "agent_id": "ben"
    }'
  ```

### GET /replay/:run_id
- **Description**: Retrieve full execution context for a specific run
- **Response**:
  ```json
  {
    "run_id": "string",
    "timestamp": "ISO 8601 string",
    "agent_used": "string",
    "prompt": "string",
    "context_used": "string",
    "response": "string",
    "status": "completed|failed",
    "error_details": "string (if failed)"
  }
  ```
- **Example**:
  ```bash
  curl "https://api.vana.com/replay/abc123" \
    -H "Authorization: Bearer $GEMINI_API_KEY"
  ```

## Authentication
- **Required Header**: `Authorization: Bearer <API_KEY>`
- **Valid Scopes**: `run:execute`, `data:read`, `system:monitor`

## Error Codes
| Code | Description | Example |
|------|-------------|---------|
| 400 | Invalid request | Missing required fields |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 503 | Service unavailable | Gemini API timeout |

## Rate Limits
- 100 requests/minute
- 5000 requests/day
- Burst capacity of 200 requests/second

## Security
- All endpoints use HTTPS
- Request body is encrypted with AES-256
- JWT validation for all authenticated requests
- Rate limiting enforced at API gateway
