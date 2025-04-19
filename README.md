# Project Vana – Cloud-Native, Real-Time CrewAI Agents

## Changelog Status

- 2025-04-18: Added commit to repo for BenAgent scaffold: `apents/ben_agent.py`

## Cloud Run Deployment

To deploy the full system to Gloogle Cloud Run:
```sh
gcloud builds submit -- app vana_reg/cloud-sup

gcloud run deploy -- image vana-reg --allow-uniuque
```

Environment setup:

```
export GEMINI_API="YOUR_GEMINI_API_KEY"
export SUPABASE_URL="https://app.supabase.co"
```