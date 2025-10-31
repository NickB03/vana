# Artifact Routing & Type Selection Improvements

## Problem Statement
The system was incorrectly creating SVG artifacts when users requested photo-realistic images like "movie posters" or "banners", and there was insufficient guidance on when to use each artifact type.

## Solution Overview
Implemented a comprehensive intent detection system that:
1. Analyzes user prompts to determine the most appropriate artifact type
2. Provides explicit guidance to the AI about which type to create
3. Routes image generation requests to the proper API

## Changes Made

### 1. Intent Detection Module (`supabase/functions/chat/intent-detector.ts`)

Created a new TypeScript module with pattern-based intent detection:

**Key Functions:**
- `detectIntent(prompt)` - Analyzes prompt and returns artifact type with confidence level
- `shouldGenerateImage(prompt)` - Determines if image generation API should be used
- `getArtifactGuidance(prompt)` - Provides specific instructions to AI for artifact creation

**Detection Patterns:**

#### Image Generation (API)
**High Confidence:**
- photograph, photo, picture, realistic, photorealistic
- movie poster, album cover, book cover
- portrait, landscape photo, headshot
- wallpaper/background with "realistic" or "detailed"

**Medium Confidence:**
- poster, banner, thumbnail (without "simple" or "vector" keywords)

#### SVG Artifacts
**High Confidence:**
- logo, icon, badge, emblem, symbol
- vector, svg, scalable
- simple/minimalist/flat design
- line art, outline, wireframe
- geometric shapes

#### HTML Artifacts
**High Confidence:**
- landing page, website, web page, homepage
- static site, portfolio site
- single-page or one-page sites

#### React Artifacts
**High Confidence:**
- dashboard, app, application, tool, calculator, tracker
- interactive/dynamic components
- todo, task, budget, expense, habit, fitness apps
- games, quizzes, surveys, forms

#### Mermaid Diagrams
**High Confidence:**
- flowchart, sequence diagram, class diagram
- gantt chart, timeline, roadmap
- process flow, workflow, decision tree

### 2. Chat Function Updates (`supabase/functions/chat/index.ts`)

**Line 3**: Added intent detector import
```typescript
import { shouldGenerateImage, getArtifactGuidance } from "./intent-detector.ts";
```

**Line 124**: Replaced regex with intent detection
```typescript
// BEFORE:
const isImageRequest = lastUserMessage &&
  /\b(generate|create|...)\/i.test(lastUserMessage.content);

// AFTER:
const isImageRequest = lastUserMessage && shouldGenerateImage(lastUserMessage.content);
```

**Line 196**: Added artifact guidance injection
```typescript
const artifactGuidance = lastUserMessage ? getArtifactGuidance(lastUserMessage.content) : "";
```

**Line 222**: Combined guidance with existing context
```typescript
const fullArtifactContext = (artifactContext || artifactGuidance)
  ? artifactContext + (artifactGuidance ? `\n\n${artifactGuidance}` : '')
  : '';
```

**Line 363-396**: Enhanced system prompt with explicit artifact type selection guide

### 3. System Prompt Enhancements

Added "Artifact Type Selection Guide" section with clear dos and don'ts:

```
### When to use IMAGE GENERATION (via API):
- ✅ Photo-realistic images, photographs, realistic scenes
- ✅ Complex artwork with lighting, shadows, depth
- ✅ Movie posters, album covers
- ❌ NOT for logos, icons, simple graphics

### When to use SVG artifacts:
- ✅ Logos, icons, badges, emblems
- ✅ Simple illustrations with clean lines
- ❌ NOT for photo-realistic content

[... similar for HTML, React, Mermaid]
```

## Testing Scenarios

### Image Generation (Should trigger API)
✅ "Create a dramatic movie poster for a sci-fi thriller about AI"
✅ "Generate a photo of a mountain landscape"
✅ "Design a realistic book cover with a mysterious forest"
✅ "Make a wallpaper with realistic clouds and sunset"

### SVG Artifacts (Should create SVG)
✅ "Create a simple logo for a tech company"
✅ "Design a minimalist icon for settings"
✅ "Make a flat design illustration of a rocket"
✅ "Create geometric shapes for a logo"

### HTML Artifacts (Should create HTML)
✅ "Build a landing page for a SaaS product"
✅ "Create a static portfolio website"
✅ "Make a one-page marketing site"

### React Artifacts (Should create React)
✅ "Build an interactive todo app"
✅ "Create a dashboard with charts"
✅ "Make a calculator tool"
✅ "Build a game with score tracking"

## Confidence Levels

The system assigns confidence levels:
- **High**: Clear indicators present (90%+ accuracy expected)
- **Medium**: Some indicators but ambiguous (70-90% accuracy)
- **Low**: Fallback/default behavior

## Dynamic Guidance

For each request, the AI receives specific guidance like:

```
ARTIFACT TYPE GUIDANCE:
This request should use IMAGE GENERATION (google/gemini-2.5-flash-image-preview).
- Use for: Photo-realistic images, detailed artwork, complex scenes
- Type: <artifact type="image" title="...">
- Do NOT create SVG or HTML artifacts for this request
```

This dramatically reduces ambiguity and improves accuracy.

## Benefits

1. **Accuracy**: More consistent artifact type selection
2. **User Experience**: Users get the artifact type they actually want
3. **Cost Efficiency**: Only uses image generation API when appropriate
4. **Maintainability**: Centralized intent detection logic
5. **Scalability**: Easy to add new patterns or artifact types

## Deployment Required

Both files need to be deployed to Supabase:
1. `supabase/functions/chat/index.ts`
2. `supabase/functions/chat/intent-detector.ts` (new file)

```bash
npx supabase functions deploy chat --project-ref xfwlneedhqealtktaacv
```

## Future Enhancements

1. **Machine Learning**: Train a classifier on real usage data
2. **User Feedback**: Learn from user corrections/regeneration requests
3. **Context Awareness**: Consider conversation history for better detection
4. **Multi-modal**: Support mixed-type artifacts (e.g., React with embedded images)
