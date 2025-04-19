# Deployment Guide — Vana (Cloud Run + Supabase)

This doc describes how to deploy the Vana backend to Google Cloud Run for use with Lovable UI.

---

## Requirements

- Google Cloud project
- Supabase project (with schema applied)
- Gemini API key (Vertex AI)

----

## 1. Build & Deploy

```sh
# Build container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/vana-server

# Deploy to Cloud Run (public)
gcloud run deploy vana-server \
  --image gcr.io/YOUR_PROJECT_ID/vana-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 2. Set Environment Variables

Set these in Cloud Run > Container > Environment:

```sh
GEMINI_API=your_google_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_or_anon_key
```
--

## 3. Test Endpoint

```sh
curl https://YOUR_CLOUD_RUN_URL/healthz
```
--

## 4. Connect Lovable

Update your Lovable prompt config to point here:
- POST to /run
- Payload: see [`scripts/ui_test_payload.json`](../scripts/ui_test_payload.json)
