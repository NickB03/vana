# ⚠️ URGENT: Chat Function Deployment Required

## Issue Fixed
The chat function's image detection regex has been updated to recognize more image-related terms including:
- **poster**, banner, graphic, visual, wallpaper
- thumbnail, icon, logo, cover, background

**Location:** `supabase/functions/chat/index.ts:123-124`

## Why This Matters
Previously, requests like "Create a dramatic movie poster" would generate an SVG artifact instead of calling the image generation API. Now it will correctly route to the `google/gemini-2.5-flash-image-preview` model.

## Deployment Required

### Option 1: Supabase CLI (Recommended)
```bash
# Navigate to project root
cd /Users/nick/Projects/llm-chat-site

# Deploy the chat function
npx supabase functions deploy chat --project-ref xfwlneedhqealtktaacv

# Or if logged in:
supabase functions deploy chat
```

### Option 2: Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/functions
2. Navigate to the `chat` function
3. Click "Deploy new version"
4. Upload `supabase/functions/chat/index.ts`

### Option 3: Auto-deploy (if configured)
If you have GitHub Actions or auto-deployment configured, simply:
```bash
git add supabase/functions/chat/index.ts
git commit -m "fix: expand image generation detection to include poster, banner, etc"
git push
```

## What Changed
```typescript
// BEFORE (line 123-124):
const isImageRequest = lastUserMessage &&
  /\b(generate|create|make|draw|design|show me|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)\b/i.test(lastUserMessage.content);

// AFTER:
const isImageRequest = lastUserMessage &&
  /\b(generate|create|make|draw|design|show me|paint|illustrate|render)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork|poster|banner|graphic|visual|wallpaper|thumbnail|icon|logo|cover|background)\b/i.test(lastUserMessage.content);
```

## Testing After Deployment
Try these prompts to verify:
1. ✅ "Create a dramatic movie poster for a sci-fi thriller about AI"
2. ✅ "Design a banner for my website"
3. ✅ "Generate a logo for my company"
4. ✅ "Make a wallpaper with mountains"

All should trigger image generation instead of SVG artifacts.

## Current Status
⚠️ **Local file updated, but not deployed to Supabase**

The Edge Function currently deployed may be incomplete due to size limitations of the previous deployment attempt. Please redeploy to ensure full functionality.
