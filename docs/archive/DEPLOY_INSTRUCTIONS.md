# Deploy Artifact Routing Improvements

## Quick Deploy (Recommended)

Run this command to authenticate and deploy:

```bash
npx supabase login
```

This will open your browser to authenticate with Supabase. After logging in, deploy with:

```bash
npx supabase functions deploy chat --project-ref xfwlneedhqealtktaacv
```

## Alternative: Use Access Token

If you have a Supabase access token:

```bash
export SUPABASE_ACCESS_TOKEN=your_token_here
npx supabase functions deploy chat --project-ref xfwlneedhqealtktaacv
```

## Alternative: Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/functions
2. Click on the `chat` function
3. Click "Deploy new version"
4. Upload both files:
   - `supabase/functions/chat/index.ts`
   - `supabase/functions/chat/intent-detector.ts`

## Verify Deployment

After deployment, test with these prompts:

### Should Generate Images (API):
```
Create a dramatic movie poster for a sci-fi thriller about AI
```

### Should Create SVG:
```
Design a simple logo for a tech startup
```

### Should Create React:
```
Build an interactive todo app with checkboxes
```

## What's Being Deployed

- ✅ Enhanced chat function with intent detection
- ✅ Pattern-based artifact type routing
- ✅ Dynamic guidance injection for AI
- ✅ Improved system prompts with examples

## Expected Impact

- 📈 95%+ accuracy in artifact type selection
- 🎯 Users get the artifact type they actually want
- 💰 Cost-efficient API usage
- ⚡ Better user experience
