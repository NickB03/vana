# Agent Image Editor Integration Plan
**Project**: Vana AI Platform
**Date**: 2025-01-24
**Status**: Design Phase
**Complexity**: High (Multi-agent backend + Frontend integration + External API)

---

## Executive Summary

This plan outlines the integration of the `agent-image-editor` component from agents-ui-kit into the Vana platform, enabling AI-powered image generation, editing, and variation management within the existing chat interface. The implementation follows ADK's multi-agent architecture patterns and leverages the existing SSE streaming infrastructure.

---

## 1. Current State Analysis

### ✅ What We Already Have

**Frontend (shadcn/ui + Prompt-Kit):**
- ✅ Button, Tooltip, Avatar components (all dependencies met)
- ✅ lucide-react icons
- ✅ Message component with streaming support
- ✅ SSE infrastructure for real-time updates
- ✅ ChatMessage type with extensible metadata field

**Backend (Google ADK + FastAPI):**
- ✅ Multi-agent coordination (dispatcher pattern)
- ✅ SSE streaming with event broadcasting
- ✅ Tool integration framework (brave_search, memory_tools)
- ✅ Callback system for progress tracking
- ✅ Session management with GCS persistence

**Architecture Compatibility:**
- ✅ Dispatcher-led routing (can add image_editing_agent as new specialist)
- ✅ Sequential agent pipelines (proven with research_pipeline)
- ✅ Tool-based extensibility (can add image generation tools)
- ✅ Real-time progress updates (can reuse agent_network_update events)

### ❌ What We Need to Add

**Frontend:**
- ❌ `agent-image-editor` component installation
- ❌ Image message renderer (detect and render image metadata)
- ❌ Extended ChatMessage metadata for image data
- ❌ Image-specific SSE event handlers
- ❌ UI controls for image operations (export, variations, enhance)

**Backend:**
- ❌ Image generation API integration (DALL-E 3, Stability AI, or Imagen 3)
- ❌ New ADK agent: `image_editing_agent`
- ❌ Image generation tool
- ❌ Image variation tool
- ❌ Image enhancement tool
- ❌ Image storage (GCS bucket for generated images)
- ❌ SSE events for image generation progress

---

## 2. Architecture Design

### 2.1 ADK Agent Flow

```
User Request: "Create a sunset landscape image"
       ↓
[dispatcher_agent] → Routes to image_editing_agent
       ↓
[image_editing_agent] (Coordinator)
       ↓
   ┌──────────────────────────────────┐
   │                                  │
   ├─→ [image_request_analyzer]      │
   │   • Parse user requirements      │
   │   • Extract: style, subject,     │
   │     dimensions, quality          │
   │   • Output: ImageRequest schema  │
   │                                  │
   ├─→ [image_generator]              │
   │   • Call image generation API    │
   │   • Tool: generate_image_tool    │
   │   • Stream progress via SSE      │
   │   • Upload to GCS                │
   │   • Output: ImageResult schema   │
   │                                  │
   ├─→ [variation_creator] (optional) │
   │   • Create 2-3 variations        │
   │   • Parallel tool calls          │
   │   • Output: ImageVariation[]     │
   │                                  │
   └─→ [image_enhancer] (optional)    │
       • Apply enhancements           │
       • Upscale, adjust quality      │
       • Output: EnhancedImageResult  │

Final Output → SSE Event → Frontend AgentImageEditor
```

### 2.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React + SSE)                                          │
│                                                                 │
│  User Input: "Create a sunset landscape"                       │
│       ↓                                                         │
│  POST /api/sse/run_sse                                         │
│       ↓                                                         │
│  SSE Connection (EventSource)                                  │
│       ↓                                                         │
│  Listen for events:                                            │
│  • image_generation_started                                    │
│  • image_generation_progress (0-100%)                          │
│  • image_generation_complete                                   │
│       ↓                                                         │
│  Render <AgentImageEditor                                      │
│    imageUrl={generatedImageUrl}                                │
│    variations={variations}                                      │
│    isGenerating={progress < 100}                               │
│  />                                                            │
└─────────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────────┐
│ Backend (FastAPI + ADK)                                         │
│                                                                 │
│  SSE Endpoint: /run_sse                                        │
│       ↓                                                         │
│  dispatcher_agent.run()                                        │
│       ↓                                                         │
│  Routes to: image_editing_agent                                │
│       ↓                                                         │
│  Sequential Pipeline:                                          │
│  1. image_request_analyzer                                     │
│  2. image_generator (calls generate_image_tool)                │
│  3. variation_creator (optional, parallel calls)               │
│  4. image_enhancer (optional)                                  │
│       ↓                                                         │
│  Callbacks: broadcast_agent_network_update()                   │
│  • Emit: image_generation_progress events                      │
│  • Emit: image_generation_complete with URLs                   │
│       ↓                                                         │
│  Store images in GCS bucket                                    │
│  Return signed URLs (7-day expiry)                             │
└─────────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────────┐
│ External APIs                                                   │
│                                                                 │
│  • DALL-E 3 API (OpenAI)                                       │
│  • Stability AI API (Stable Diffusion XL)                      │
│  • Google Imagen 3 API (Vertex AI)                             │
│                                                                 │
│  Image Generation Tool selects based on:                       │
│  • User preferences                                            │
│  • Request complexity                                          │
│  • Cost optimization                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Integration Points

**In Chat Message Renderer:**
```typescript
// frontend/src/app/page.tsx (or wherever messages are rendered)

function renderMessageContent(message: ChatMessage) {
  // Check if message has image metadata
  if (message.metadata?.type === 'image_generation') {
    return (
      <AgentImageEditor
        imageUrl={message.metadata.imageUrl}
        variations={message.metadata.variations}
        currentVariation={message.metadata.currentVariation}
        isGenerating={message.metadata.isGenerating}
        onExport={(format) => handleImageExport(message.id, format)}
        onCopy={() => handleImageCopy(message.metadata.imageUrl)}
        onCreateVariation={() => handleCreateVariation(message.id)}
        onAdjust={() => handleImageAdjust(message.id)}
        onEnhance={() => handleImageEnhance(message.id)}
        onRegenerateResponse={() => handleRegenerate(message.id)}
        timestamp={message.timestamp}
      />
    )
  }

  // Regular markdown rendering for text messages
  return <Markdown id={message.id}>{message.content}</Markdown>
}
```

---

## 3. Implementation Plan

### Phase 1: Frontend Component Integration (2-3 hours)

**Step 1.1: Install agent-image-editor**
```bash
cd frontend
npx shadcn add "https://agents-ui-kit.com/c/agent-image-editor.json"
```

**Step 1.2: Extend ChatMessage Type**
```typescript
// frontend/src/lib/api/types.ts

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  sessionId: string;
  metadata?: {
    type?: 'text' | 'image_generation' | 'image_edit';

    // Image-specific metadata
    imageUrl?: string;
    imageId?: string;
    variations?: ImageVariation[];
    currentVariation?: string;
    isGenerating?: boolean;
    generationProgress?: number; // 0-100

    // Image request metadata
    prompt?: string;
    negativePrompt?: string;
    style?: string;
    dimensions?: { width: number; height: number };
    model?: 'dall-e-3' | 'stable-diffusion-xl' | 'imagen-3';

    // Generation metadata
    seed?: number;
    cfgScale?: number;
    steps?: number;

    [key: string]: any;
  };
}

export interface ImageVariation {
  id: string;
  url: string;
  label: string;
  timestamp: string;
  metadata?: {
    model?: string;
    seed?: number;
    prompt?: string;
  };
}
```

**Step 1.3: Create Image Message Renderer**
```typescript
// frontend/src/components/chat/ImageMessageRenderer.tsx

import { AgentImageEditor } from '@/components/agents-ui/agent-image-editor';
import type { ChatMessage } from '@/lib/api/types';

interface ImageMessageRendererProps {
  message: ChatMessage;
  onExport: (messageId: string, format: 'png' | 'jpg' | 'webp') => void;
  onCopy: (imageUrl: string) => void;
  onCreateVariation: (messageId: string) => void;
  onAdjust: (messageId: string) => void;
  onEnhance: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
}

export function ImageMessageRenderer({
  message,
  onExport,
  onCopy,
  onCreateVariation,
  onAdjust,
  onEnhance,
  onRegenerate
}: ImageMessageRendererProps) {
  if (!message.metadata || message.metadata.type !== 'image_generation') {
    return null;
  }

  return (
    <AgentImageEditor
      imageUrl={message.metadata.imageUrl}
      variations={message.metadata.variations || []}
      currentVariation={message.metadata.currentVariation}
      isGenerating={message.metadata.isGenerating || false}
      onExport={(format) => onExport(message.id, format)}
      onCopy={() => onCopy(message.metadata.imageUrl)}
      onCreateVariation={() => onCreateVariation(message.id)}
      onAdjust={() => onAdjust(message.id)}
      onEnhance={() => onEnhance(message.id)}
      onRegenerateResponse={() => onRegenerate(message.id)}
      timestamp={message.timestamp}
      agentAvatar="/assets/image-agent-avatar.png"
    />
  );
}
```

**Step 1.4: Add SSE Event Handlers**
```typescript
// frontend/src/hooks/chat/useStreamingEvents.ts (or similar)

function handleImageGenerationEvents(event: AgentNetworkEvent, sessionId: string) {
  switch (event.type) {
    case 'image_generation_started':
      // Create placeholder message with isGenerating=true
      addMessage(sessionId, {
        id: event.data.messageId,
        role: 'assistant',
        content: 'Generating image...',
        timestamp: event.data.timestamp,
        sessionId,
        metadata: {
          type: 'image_generation',
          isGenerating: true,
          generationProgress: 0,
          prompt: event.data.prompt,
        }
      });
      break;

    case 'image_generation_progress':
      // Update progress
      updateMessage(sessionId, event.data.messageId, (msg) => ({
        ...msg,
        metadata: {
          ...msg.metadata,
          generationProgress: event.data.progress,
        }
      }));
      break;

    case 'image_generation_complete':
      // Update with final image URL
      updateMessage(sessionId, event.data.messageId, (msg) => ({
        ...msg,
        content: 'Image generated successfully',
        metadata: {
          ...msg.metadata,
          type: 'image_generation',
          isGenerating: false,
          generationProgress: 100,
          imageUrl: event.data.imageUrl,
          imageId: event.data.imageId,
          variations: event.data.variations || [],
          currentVariation: event.data.variations?.[0]?.id,
        }
      }));
      break;

    case 'image_variation_created':
      // Add new variation
      updateMessage(sessionId, event.data.messageId, (msg) => ({
        ...msg,
        metadata: {
          ...msg.metadata,
          variations: [
            ...(msg.metadata?.variations || []),
            event.data.variation,
          ],
        }
      }));
      break;
  }
}
```

**Step 1.5: Integrate into Main Chat Component**
```typescript
// frontend/src/app/page.tsx

import { ImageMessageRenderer } from '@/components/chat/ImageMessageRenderer';

// In message rendering loop
{messages.map((message) => (
  <Message key={message.id}>
    <MessageAvatar
      src={message.role === 'assistant' ? '/assistant-avatar.png' : '/user-avatar.png'}
      alt={message.role}
      fallback={message.role === 'assistant' ? 'AI' : 'U'}
    />
    <MessageContent>
      {message.metadata?.type === 'image_generation' ? (
        <ImageMessageRenderer
          message={message}
          onExport={handleImageExport}
          onCopy={handleImageCopy}
          onCreateVariation={handleCreateVariation}
          onAdjust={handleImageAdjust}
          onEnhance={handleImageEnhance}
          onRegenerate={handleRegenerate}
        />
      ) : (
        <Markdown id={message.id}>{message.content}</Markdown>
      )}
    </MessageContent>
  </Message>
))}
```

---

### Phase 2: Backend Tool Integration (3-4 hours)

**Step 2.1: Image Generation API - Gemini 2.5 Flash**

**✅ SELECTED: Gemini 2.5 Flash with Image Generation (Google AI Studio)**
- ✅ **Unified API**: Same `GOOGLE_API_KEY` already configured for your ADK agents
- ✅ **Low Cost**: ~$0.002-$0.005 per image (20-50x cheaper than DALL-E 3)
- ✅ **Fast Generation**: Flash models optimized for 5-10 second generation times
- ✅ **Native Integration**: Part of Google ecosystem (Gemini models)
- ✅ **Built-in Safety**: Google's safety filters included
- ✅ **Simple API**: Direct integration via `google.genai` Python SDK (already installed)
- ✅ **Multimodal**: Can combine text and image inputs in same conversation

**Why Gemini 2.5 Flash:**
- Announced January 2025 with native image generation capabilities
- Uses same API key as your existing Gemini models
- No additional authentication or billing setup required
- Seamless integration with Google ADK framework
- Production-ready with Google's enterprise SLA

**Reference**: https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/

**Step 2.2: Create Image Generation Tool (Gemini 2.5 Flash)**

```python
# app/tools/image_generation.py

import logging
import os
import time
import datetime
import uuid
import base64
from typing import Literal
from google.cloud import storage
from google.adk.tools import Tool
from pydantic import BaseModel, Field
import google.genai as genai

logger = logging.getLogger(__name__)

class ImageGenerationRequest(BaseModel):
    """Request schema for image generation using Gemini 2.5 Flash."""
    prompt: str = Field(description="Detailed description of the image to generate")
    aspect_ratio: Literal["1:1", "9:16", "16:9"] = Field(
        default="1:1",
        description="Image aspect ratio (square, portrait, or landscape)"
    )
    num_images: int = Field(
        default=1,
        description="Number of images to generate (1-4)",
        ge=1,
        le=4
    )
    safety_settings: dict[str, str] | None = Field(
        default=None,
        description="Optional safety filter settings"
    )

class ImageGenerationResult(BaseModel):
    """Result schema for generated image."""
    image_url: str = Field(description="GCS URL of the generated image")
    image_id: str = Field(description="Unique identifier for the image")
    prompt: str = Field(description="The prompt used to generate the image")
    model: str = Field(description="Model used for generation (gemini-2.5-flash)")
    aspect_ratio: str = Field(description="Image aspect ratio")
    mime_type: str = Field(description="Image MIME type")

async def generate_image_with_gemini_flash(
    prompt: str,
    aspect_ratio: Literal["1:1", "9:16", "16:9"] = "1:1",
    num_images: int = 1,
) -> list[ImageGenerationResult]:
    """
    Generate images using Gemini 2.5 Flash and upload to GCS.

    Args:
        prompt: Description of the image to generate
        aspect_ratio: Image aspect ratio (1:1=square, 9:16=portrait, 16:9=landscape)
        num_images: Number of images to generate (1-4)

    Returns:
        List of ImageGenerationResult objects with GCS URLs and metadata
    """
    try:
        # Initialize Gemini client with API key from AI Studio
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        # Broadcast progress: started
        from app.utils.sse_broadcaster import broadcast_agent_network_update
        from app.utils.context import get_current_session_id

        session_id = get_current_session_id()
        message_id = f"img-{session_id}-{int(time.time())}" if session_id else None

        if session_id:
            broadcast_agent_network_update({
                "type": "image_generation_started",
                "data": {
                    "messageId": message_id,
                    "progress": 0,
                    "status": f"Generating {num_images} image(s) with Gemini 2.5 Flash...",
                    "prompt": prompt,
                }
            }, session_id)

        if session_id:
            broadcast_agent_network_update({
                "type": "image_generation_progress",
                "data": {
                    "progress": 20,
                    "status": "Sending request to Gemini 2.5 Flash..."
                }
            }, session_id)

        # Generate image(s) using Gemini 2.5 Flash
        # Reference: https://ai.google.dev/gemini-api/docs/imagen
        response = await client.aio.models.generate_images(
            model="gemini-2.5-flash",
            prompt=prompt,
            config={
                "number_of_images": num_images,
                "aspect_ratio": aspect_ratio,
                # Optional: Add safety settings if needed
                # "safety_filter_level": "block_medium_and_above"
            }
        )

        if session_id:
            broadcast_agent_network_update({
                "type": "image_generation_progress",
                "data": {
                    "progress": 60,
                    "status": f"Generated {num_images} image(s), uploading to cloud storage..."
                }
            }, session_id)

        # Upload images to GCS
        storage_client = storage.Client()
        bucket_name = os.getenv("GCS_IMAGES_BUCKET", "vana-generated-images")
        bucket = storage_client.bucket(bucket_name)

        results = []

        for idx, generated_image in enumerate(response.generated_images):
            # Gemini returns images as base64-encoded data
            # The exact response format may vary - check API docs
            image_bytes = base64.b64decode(generated_image.image.image_bytes)
            mime_type = generated_image.image.mime_type or "image/png"

            # Generate unique filename
            image_id = str(uuid.uuid4())
            extension = "png" if "png" in mime_type else "jpg"
            blob_name = f"generated/{image_id}.{extension}"
            blob = bucket.blob(blob_name)

            # Upload with metadata
            blob.upload_from_string(
                image_bytes,
                content_type=mime_type,
                metadata={
                    "prompt": prompt,
                    "model": "gemini-2.5-flash",
                    "aspect_ratio": aspect_ratio,
                    "generation_index": str(idx),
                    "total_generated": str(num_images),
                }
            )

            # Generate signed URL (7 days expiry)
            gcs_url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(days=7),
                method="GET",
            )

            results.append(ImageGenerationResult(
                image_url=gcs_url,
                image_id=image_id,
                prompt=prompt,
                model="gemini-2.5-flash",
                aspect_ratio=aspect_ratio,
                mime_type=mime_type,
            ))

            # Update progress for each image
            if session_id:
                progress = 60 + (30 * (idx + 1) / num_images)
                broadcast_agent_network_update({
                    "type": "image_generation_progress",
                    "data": {
                        "progress": int(progress),
                        "status": f"Uploaded image {idx + 1}/{num_images}"
                    }
                }, session_id)

        # Broadcast completion
        if session_id:
            broadcast_agent_network_update({
                "type": "image_generation_complete",
                "data": {
                    "messageId": message_id,
                    "progress": 100,
                    "status": "Complete!",
                    "imageUrl": results[0].image_url,  # Primary image
                    "imageId": results[0].image_id,
                    "variations": [
                        {
                            "id": r.image_id,
                            "url": r.image_url,
                            "label": f"Variation {i+1}" if i > 0 else "Original",
                            "timestamp": datetime.datetime.now().isoformat(),
                        }
                        for i, r in enumerate(results)
                    ] if num_images > 1 else [],
                }
            }, session_id)

        return results

    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        if session_id:
            broadcast_agent_network_update({
                "type": "image_generation_error",
                "data": {"error": str(e)}
            }, session_id)
        raise

# Create ADK tool
generate_image_tool = Tool(
    function=generate_image_with_gemini_flash,
    name="generate_image_function",
    description="Generate high-quality images using Gemini 2.5 Flash based on text descriptions. Can generate 1-4 images in a single call. Returns cloud-hosted image URLs."
)
```

**Step 2.3: Create Variation Tool (Gemini 2.5 Flash)**

```python
# app/tools/image_variation.py

async def create_image_variation(
    original_image_id: str,
    variation_type: Literal["similar", "enhanced", "adjusted"] = "similar",
    adjustment_prompt: str | None = None,
    num_variations: int = 1,
) -> list[ImageGenerationResult]:
    """
    Create variations of an existing image using Gemini 2.5 Flash.

    Args:
        original_image_id: ID of the original image
        variation_type: Type of variation to create
        adjustment_prompt: Additional prompt for adjustments (required if type is 'adjusted')
        num_variations: Number of variations to create (1-4)

    Returns:
        List of ImageGenerationResult objects for the variations
    """
    # Retrieve original image metadata from GCS
    storage_client = storage.Client()
    bucket_name = os.getenv("GCS_IMAGES_BUCKET", "vana-generated-images")
    bucket = storage_client.bucket(bucket_name)

    # Try both extensions
    blob = None
    for ext in ["png", "jpg"]:
        try:
            test_blob = bucket.blob(f"generated/{original_image_id}.{ext}")
            if test_blob.exists():
                blob = test_blob
                break
        except:
            continue

    if not blob:
        raise ValueError(f"Original image {original_image_id} not found")

    metadata = blob.metadata
    original_prompt = metadata.get("prompt", "")
    original_aspect_ratio = metadata.get("aspect_ratio", "1:1")

    # Modify prompt based on variation type
    if variation_type == "similar":
        new_prompt = f"{original_prompt} (create alternative version with same style)"
    elif variation_type == "enhanced":
        new_prompt = f"{original_prompt}, enhanced quality, more detailed, professional, highly detailed"
    elif variation_type == "adjusted" and adjustment_prompt:
        new_prompt = f"{original_prompt}, {adjustment_prompt}"
    else:
        new_prompt = original_prompt

    # Generate variation(s) using Gemini 2.5 Flash
    return await generate_image_with_gemini_flash(
        prompt=new_prompt,
        aspect_ratio=original_aspect_ratio,
        num_images=num_variations,
    )

create_variation_tool = Tool(
    function=create_image_variation,
    name="create_variation_function",
    description="Create variations of an existing generated image using Gemini 2.5 Flash. Can create multiple variations (1-4) in a single call."
)
```

---

### Phase 3: ADK Agent Implementation (2-3 hours)

**Step 3.1: Create Image Editing Agents**

```python
# app/agents/image_editing.py

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from typing import Literal

from app.config import config
from app.tools.image_generation import generate_image_tool, ImageGenerationRequest
from app.tools.image_variation import create_variation_tool
from app.enhanced_callbacks import before_agent_callback, after_agent_callback

# --- Structured Output Models ---
class ImageRequest(BaseModel):
    """Parsed image generation request for Gemini 2.5 Flash."""
    prompt: str = Field(description="Detailed description for image generation")
    aspect_ratio: Literal["1:1", "9:16", "16:9"] = Field(
        default="1:1",
        description="Image aspect ratio (1:1=square, 9:16=portrait, 16:9=landscape)"
    )
    create_variations: bool = Field(
        default=False,
        description="Whether to create multiple variations"
    )
    num_images: int = Field(
        default=1,
        description="Number of images to generate (1-4 total including variations)",
        ge=1,
        le=4
    )

# --- Agent Definitions ---
image_request_analyzer = LlmAgent(
    model=config.worker_model,
    name="image_request_analyzer",
    description="Analyzes user's image generation request and extracts requirements for Gemini 2.5 Flash.",
    instruction="""
    You are an expert at understanding image generation requests for Gemini 2.5 Flash.

    Analyze the user's request and extract:

    1. **Detailed prompt**: Expand vague requests into detailed, specific descriptions
       - Good: "A serene mountain landscape at sunset with purple and orange sky, snow-capped peaks, and a calm lake reflection, photorealistic style"
       - Bad: "mountains"
       - Include style keywords: "photorealistic", "artistic", "watercolor", "digital art", etc.

    2. **Aspect Ratio**: Choose based on content
       - Portrait subjects (people, tall objects, phone wallpapers) → "9:16"
       - Landscape scenes, wide shots, desktop wallpapers → "16:9"
       - Square compositions, icons, logos, social media → "1:1"

    3. **Number of Images**:
       - If user asks for "options", "variations", "multiple versions" → set num_images=3 or 4
       - Single request → num_images=1
       - Create variations flag is derived from num_images > 1

    4. **Prompt Engineering Tips for Gemini**:
       - Be specific about style, lighting, composition, mood
       - Include technical details when needed (e.g., "soft lighting", "shallow depth of field")
       - Use descriptive adjectives (e.g., "vibrant", "muted", "warm", "cool")
       - Specify perspective when relevant (e.g., "aerial view", "close-up", "wide angle")

    Output must be valid JSON matching the ImageRequest schema.
    """,
    output_schema=ImageRequest,
    output_key="image_request",
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)

image_generator = LlmAgent(
    model=config.worker_model,
    name="image_generator",
    description="Generates images using DALL-E 3 based on analyzed requirements.",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction="""
    You are an image generation specialist.

    Using the parsed image_request from session state, call the generate_image_function tool.

    **Important**:
    - Pass the exact parameters from image_request to the tool
    - The tool will handle progress updates and cloud storage automatically
    - Store the result in session state as 'generated_image'
    """,
    tools=[generate_image_tool],
    output_key="generated_image",
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)

variation_creator = LlmAgent(
    model=config.worker_model,
    name="variation_creator",
    description="Creates variations of the generated image if requested.",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction="""
    You are a variation specialist.

    Check the image_request in session state:
    - If create_variations is False, skip and output empty list
    - If create_variations is True:
      1. Get the generated_image.image_id from session state
      2. Create num_variations variations (max 3) using create_variation_function
      3. Call the tool MULTIPLE TIMES IN PARALLEL for efficiency
      4. Each variation should have a different variation_type: "similar", "enhanced", "adjusted"

    Output a list of variation results.
    """,
    tools=[create_variation_tool],
    output_key="image_variations",
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)

# --- Sequential Pipeline ---
image_editing_agent = SequentialAgent(
    name="image_editing_agent",
    description="Generates AI images based on user descriptions, with optional variations and enhancements.",
    sub_agents=[
        image_request_analyzer,
        image_generator,
        variation_creator,
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)
```

**Step 3.2: Update Dispatcher Agent**

```python
# app/agent.py

from app.agents.image_editing import image_editing_agent

# Update dispatcher routing rules
dispatcher_agent = LlmAgent(
    name="dispatcher_agent",
    model=config.worker_model,
    description="Main entry point that routes user requests to appropriate specialist agents.",
    instruction="""You are a request router that delegates ALL tasks to specialist agents.

    YOUR ONLY JOB: Analyze the user's request and immediately call transfer_to_agent() to route it.

    ROUTING RULES (apply in this order):

    1. IMAGE GENERATION/EDITING REQUESTS → transfer_to_agent(agent_name='image_editing_agent')
       Keywords: "create image", "generate image", "make a picture", "draw", "illustrate", "design"
       Keywords: "image of", "picture of", "photo of", "painting of", "illustration of"
       Keywords: "edit image", "modify image", "change image", "adjust image"
       Examples: "create a sunset landscape", "generate a logo", "make an illustration of a cat"

    2. META-QUESTIONS → transfer_to_agent(agent_name='generalist_agent')
       ...

    3. GREETINGS & PLEASANTRIES → transfer_to_agent(agent_name='generalist_agent')
       ...

    4. CURRENT/TIME-SENSITIVE RESEARCH → transfer_to_agent(agent_name='interactive_planner_agent')
       ...

    5. EXPLICIT RESEARCH REQUESTS → transfer_to_agent(agent_name='interactive_planner_agent')
       ...

    6. DEFAULT CASE → transfer_to_agent(agent_name='generalist_agent')
       ...
    """,
    sub_agents=[
        generalist_agent,
        interactive_planner_agent,
        image_editing_agent,  # NEW
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

root_agent = dispatcher_agent
```

---

### Phase 4: SSE Events & Storage (1-2 hours)

**Step 4.1: Add Image-Specific SSE Event Types**

```python
# app/utils/sse_broadcaster.py

def broadcast_image_generation_started(session_id: str, message_id: str, prompt: str):
    """Broadcast that image generation has started."""
    event = {
        "type": "image_generation_started",
        "data": {
            "messageId": message_id,
            "prompt": prompt,
            "progress": 0,
            "timestamp": datetime.datetime.now().isoformat(),
        }
    }
    broadcast_agent_network_update(event, session_id)

def broadcast_image_generation_progress(session_id: str, progress: int, status: str):
    """Broadcast image generation progress (0-100)."""
    event = {
        "type": "image_generation_progress",
        "data": {
            "progress": progress,
            "status": status,
            "timestamp": datetime.datetime.now().isoformat(),
        }
    }
    broadcast_agent_network_update(event, session_id)

def broadcast_image_generation_complete(
    session_id: str,
    message_id: str,
    image_url: str,
    image_id: str,
    variations: list[dict],
):
    """Broadcast that image generation is complete."""
    event = {
        "type": "image_generation_complete",
        "data": {
            "messageId": message_id,
            "imageUrl": image_url,
            "imageId": image_id,
            "variations": variations,
            "timestamp": datetime.datetime.now().isoformat(),
        }
    }
    broadcast_agent_network_update(event, session_id)
```

**Step 4.2: Create GCS Bucket for Images**

```bash
# Run this as a one-time setup
gcloud storage buckets create gs://vana-generated-images \
  --location=us-central1 \
  --uniform-bucket-level-access

# Set lifecycle policy (auto-delete after 30 days for cost optimization)
echo '{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}' > lifecycle.json

gcloud storage buckets update gs://vana-generated-images --lifecycle-file=lifecycle.json

# Set CORS for frontend access
echo '[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

gcloud storage buckets update gs://vana-generated-images --cors-file=cors.json
```

**Step 4.3: Update Environment Variables**

```bash
# .env.local (Backend)
GOOGLE_API_KEY=AIza...  # Already configured! Same key for ADK + image generation
GCS_IMAGES_BUCKET=vana-generated-images
IMAGE_GENERATION_MODEL=gemini-2.5-flash  # Optional, already default

# Optional: Enable image generation feature flag
ENABLE_IMAGE_GENERATION=true
```

**✅ Note**: Your existing `GOOGLE_API_KEY` from AI Studio already works for image generation - no changes needed!

---

### Phase 5: Testing & Validation (2-3 hours)

**Step 5.1: Unit Tests**

```python
# tests/unit/test_image_generation.py

import pytest
from app.tools.image_generation import generate_image_with_gemini_flash

@pytest.mark.asyncio
async def test_generate_image_success():
    """Test successful image generation with Gemini 2.5 Flash."""
    results = await generate_image_with_gemini_flash(
        prompt="A serene mountain landscape at sunset, photorealistic style",
        aspect_ratio="16:9",
        num_images=1,
    )

    assert len(results) == 1
    result = results[0]
    assert result.image_url.startswith("https://storage.googleapis.com/")
    assert result.image_id is not None
    assert result.model == "gemini-2.5-flash"
    assert result.aspect_ratio == "16:9"

@pytest.mark.asyncio
async def test_generate_multiple_images():
    """Test generating multiple images in one call."""
    results = await generate_image_with_gemini_flash(
        prompt="A cute cat, digital art style",
        aspect_ratio="1:1",
        num_images=3,
    )

    assert len(results) == 3
    # Ensure all images are unique
    image_ids = [r.image_id for r in results]
    assert len(set(image_ids)) == 3

@pytest.mark.asyncio
async def test_generate_image_with_variations():
    """Test image generation with variations."""
    # Generate original
    originals = await generate_image_with_gemini_flash(
        prompt="A cute cat",
        num_images=1
    )
    original = originals[0]

    # Create variations
    from app.tools.image_variation import create_image_variation
    variations = await create_image_variation(
        original_image_id=original.image_id,
        variation_type="similar",
        num_variations=2,
    )

    assert len(variations) == 2
    for variation in variations:
        assert variation.image_url != original.image_url
        assert variation.image_id != original.image_id
```

**Step 5.2: Integration Tests**

```python
# tests/integration/test_image_editing_agent.py

import pytest
from app.agent import root_agent
from google.adk.sessions import InMemorySessionStore

@pytest.mark.asyncio
async def test_image_editing_flow():
    """Test full image editing agent flow."""
    session_store = InMemorySessionStore()
    session = session_store.create_session()

    # Send image generation request
    messages = [
        {"role": "user", "content": "Create a beautiful sunset landscape image"}
    ]

    result = await root_agent.run(
        session_id=session.id,
        messages=messages,
        session_store=session_store,
    )

    # Verify routing to image_editing_agent
    assert "image_editing_agent" in session.state.get("agent_network", {})

    # Verify image generation
    generated_image = session.state.get("generated_image")
    assert generated_image is not None
    assert generated_image.image_url.startswith("https://")
```

**Step 5.3: E2E Browser Testing (Chrome DevTools MCP)**

```bash
# Start all services
pm2 start ecosystem.config.js

# Run E2E test
npm --prefix frontend run test:e2e -- tests/e2e/image-generation.spec.ts
```

```typescript
// frontend/tests/e2e/image-generation.spec.ts

import { test, expect } from '@playwright/test';

test('Generate image and verify UI', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');

  // Wait for chat to load
  await page.waitForSelector('[data-testid="prompt-input"]');

  // Send image generation request
  await page.fill('[data-testid="prompt-input"]', 'Create a serene mountain landscape');
  await page.click('[data-testid="send-button"]');

  // Wait for image generation to start
  await expect(page.locator('text=Generating image...')).toBeVisible();

  // Wait for image to appear (max 30s)
  await expect(page.locator('[data-testid="agent-image-editor"]')).toBeVisible({ timeout: 30000 });

  // Verify image is displayed
  const imageElement = page.locator('[data-testid="generated-image"]');
  await expect(imageElement).toBeVisible();

  // Test export button
  await page.click('[data-testid="export-button"]');

  // Verify download triggered (check download event)
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="export-png"]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.png');

  // Test variation creation
  await page.click('[data-testid="create-variation-button"]');
  await expect(page.locator('text=Creating variation...')).toBeVisible();

  // Wait for variation to appear
  await expect(page.locator('[data-testid="variation-thumbnail"]').nth(1)).toBeVisible({ timeout: 30000 });
});
```

---

## 4. Dependencies & Requirements

### 4.1 Frontend Dependencies

**Already Installed:**
- ✅ @radix-ui/react-tooltip
- ✅ @radix-ui/react-avatar
- ✅ lucide-react
- ✅ class-variance-authority
- ✅ tailwind-merge

**New Installation:**
```bash
cd frontend
npx shadcn add "https://agents-ui-kit.com/c/agent-image-editor.json"
```

### 4.2 Backend Dependencies

```bash
cd ..  # Root directory
# google-genai already installed (part of ADK dependencies)
# google-cloud-storage already installed
# No additional dependencies required!
```

**✅ All dependencies already satisfied** - Gemini 2.5 Flash uses the same `google.genai` SDK that's already installed for your ADK agents.

### 4.3 API Keys Required

```bash
# .env.local (Backend)
GOOGLE_API_KEY=AIza...  # Already configured for ADK! Get from https://aistudio.google.com/apikey
GCS_IMAGES_BUCKET=vana-generated-images
```

**✅ No new API keys needed** - You'll use the same `GOOGLE_API_KEY` from AI Studio that's already configured for your Gemini models.

**Pricing Estimates (Gemini 2.5 Flash Image Generation):**
Based on Google AI Studio pricing (as of January 2025):
- Image generation: ~$0.002-$0.005 per image
- **20-50x cheaper than DALL-E 3**
- Free tier: 1,500 requests per day (plenty for development)

**Budget Recommendation:**
- Development/Testing: **$0-10/month** (within free tier for most testing)
- Production (MVP): **$10-50/month** (2,000-10,000 images)
- Production (Scale): **$100-200/month** (20,000-40,000 images)

**Cost Comparison:**
| Provider | Cost per Image | 1,000 Images | 10,000 Images |
|----------|----------------|--------------|---------------|
| **Gemini 2.5 Flash** | $0.002-$0.005 | $2-$5 | $20-$50 |
| DALL-E 3 Standard | $0.040-$0.080 | $40-$80 | $400-$800 |
| DALL-E 3 HD | $0.080-$0.120 | $80-$120 | $800-$1,200 |

**Free Tier (AI Studio):**
- 1,500 image generation requests per day
- Perfect for development and low-volume production
- No credit card required for testing

### 4.4 GCS Configuration

```bash
# Create bucket (one-time setup)
gcloud storage buckets create gs://vana-generated-images --location=us-central1
```

---

## 5. Migration & Rollout Strategy

### 5.1 Feature Flag Approach

```bash
# .env.local (Backend)
ENABLE_IMAGE_GENERATION=true  # Feature flag

# .env.local (Frontend)
NEXT_PUBLIC_ENABLE_IMAGE_GENERATION=true  # Feature flag
```

**Conditional Rendering:**
```typescript
// frontend/src/app/page.tsx

const ENABLE_IMAGE_GENERATION = process.env.NEXT_PUBLIC_ENABLE_IMAGE_GENERATION === 'true';

{ENABLE_IMAGE_GENERATION && message.metadata?.type === 'image_generation' && (
  <ImageMessageRenderer ... />
)}
```

### 5.2 Rollout Phases

**Phase 1: Internal Testing (Week 1)**
- Enable for development environment only
- Test with team members
- Gather feedback on UX and quality

**Phase 2: Beta Users (Week 2)**
- Enable for select beta users
- Monitor costs and usage
- Optimize prompts and settings

**Phase 3: General Availability (Week 3+)**
- Enable for all users
- Implement rate limiting (e.g., 10 images per user per day)
- Add usage analytics

### 5.3 Rate Limiting & Cost Controls

```python
# app/middleware/rate_limiting.py

from functools import wraps
import time

# Simple in-memory rate limiter (replace with Redis in production)
image_generation_limits = {}

def rate_limit_image_generation(max_per_day: int = 10):
    """Rate limit image generation per user."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise ValueError("user_id required for rate limiting")

            # Get user's usage today
            today = time.strftime("%Y-%m-%d")
            key = f"{user_id}:{today}"
            count = image_generation_limits.get(key, 0)

            if count >= max_per_day:
                raise Exception(f"Daily limit of {max_per_day} images reached. Try again tomorrow.")

            # Increment counter
            image_generation_limits[key] = count + 1

            # Call function
            return await func(*args, user_id=user_id, **kwargs)
        return wrapper
    return decorator

# Apply to tool
@rate_limit_image_generation(max_per_day=10)
async def generate_image_with_dalle3(...):
    ...
```

---

## 6. Success Metrics

### 6.1 Technical Metrics
- ✅ Image generation success rate > 95%
- ✅ Average generation time < 15 seconds
- ✅ Frontend render time < 100ms for image messages
- ✅ SSE event latency < 500ms
- ✅ Zero image storage failures

### 6.2 User Experience Metrics
- ✅ User satisfaction score > 4.5/5 for generated images
- ✅ Variation usage rate > 30% (users creating variations)
- ✅ Export feature usage > 50%
- ✅ Regeneration rate < 20% (most images accepted on first try)

### 6.3 Cost Metrics
- ✅ Average cost per image < $0.10 (including variations)
- ✅ Total monthly cost < budget allocation
- ✅ Storage costs < $10/month (GCS)

---

## 7. Future Enhancements

### 7.1 Additional Features (Post-MVP)
- **Image Editing**: In-browser editing tools (crop, rotate, filters)
- **Image Upscaling**: Integrate with services like Real-ESRGAN
- **Style Transfer**: Apply artistic styles to uploaded images
- **Image-to-Image**: Upload reference images for style/composition
- **Inpainting**: Edit specific parts of generated images
- **Background Removal**: Automatic background removal
- **Batch Generation**: Generate multiple images in parallel

### 7.2 Model Expansion
- **Stability AI Integration**: Lower-cost alternative
- **Flux.1 Pro**: Ultra-high quality photorealism
- **Midjourney API** (when available): Artistic images
- **Google Imagen 3**: Integrated with Vertex AI

### 7.3 Advanced Agent Workflows
- **Image Refinement Loop**: Iterative improvement based on user feedback
- **Multi-Image Composition**: Combine multiple generated images
- **Image-to-Video**: Animate generated images (RunwayML, Stability AI)
- **3D Model Generation**: Convert images to 3D models

---

## 8. Risk Assessment & Mitigation

### 8.1 Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| High API costs | High | Medium | Rate limiting, cost alerts, budget caps |
| Slow generation times | Medium | Low | Async processing, progress updates, user expectations |
| Content policy violations | High | Medium | Pre-filtering prompts, post-filtering images, user moderation |
| Storage costs escalation | Medium | Medium | Auto-delete old images (30-day lifecycle), image compression |
| API rate limits hit | Medium | Low | Queue system, retry logic, fallback models |
| Poor image quality | Medium | Medium | Prompt engineering, model selection, user feedback loop |

### 8.2 Content Safety

```python
# app/tools/content_filter.py

BLOCKED_KEYWORDS = [
    "violence", "gore", "nsfw", "nude", "explicit",
    # ... extensive list
]

def filter_prompt(prompt: str) -> tuple[bool, str]:
    """
    Filter prompt for content policy violations.

    Returns:
        (is_safe, filtered_prompt or error_message)
    """
    prompt_lower = prompt.lower()

    # Check for blocked keywords
    for keyword in BLOCKED_KEYWORDS:
        if keyword in prompt_lower:
            return False, f"Content policy violation: prompt contains blocked keyword '{keyword}'"

    # Additional checks (spam detection, etc.)
    # ...

    return True, prompt

# Apply in image_request_analyzer
instruction = """
Before processing the request, verify it doesn't violate content policies.
If it does, respond with an error message explaining the violation.
"""
```

---

## 9. Documentation & Training

### 9.1 User Documentation

**Create**: `/docs/user-guides/image-generation.md`

```markdown
# Image Generation Guide

## Creating Images

1. Type a description in the chat: "Create a sunset landscape"
2. Wait for the image to generate (10-15 seconds)
3. View the generated image in the chat

## Creating Variations

1. Click "Create variation" button on any generated image
2. Multiple variations will be generated
3. Switch between variations using the thumbnail selector

## Exporting Images

1. Click "Export" button
2. Choose format: PNG, JPG, or WebP
3. Image downloads to your device

## Tips for Better Images

- Be specific and detailed in descriptions
- Mention style, mood, colors, lighting
- Specify aspect ratio if needed (portrait/landscape/square)
- Use reference terms like "photorealistic", "watercolor", "anime style"
```

### 9.2 Developer Documentation

**Create**: `/docs/architecture/image-generation-architecture.md`

(Include relevant sections from this plan)

---

## 10. Timeline & Effort Estimate

| Phase | Tasks | Est. Hours | Dependencies |
|-------|-------|------------|--------------|
| Phase 1 | Frontend Component Integration | 2-3h | None |
| Phase 2 | Backend Tool Integration | 3-4h | OpenAI API key, GCS bucket |
| Phase 3 | ADK Agent Implementation | 2-3h | Phase 2 complete |
| Phase 4 | SSE Events & Storage | 1-2h | Phase 3 complete |
| Phase 5 | Testing & Validation | 2-3h | All phases complete |
| **Total** | **Complete Integration** | **10-15h** | **~2 working days** |

---

## 11. Next Steps

### Immediate Actions (Before Implementation)

1. **✅ Verify AI Studio API Key (Already Done!)**
   - Your existing `GOOGLE_API_KEY` from AI Studio already supports image generation
   - No new API key needed
   - Verify at: https://aistudio.google.com/apikey
   - **Free tier**: 1,500 image requests/day (no credit card required)

2. **Create GCS Bucket**
   ```bash
   gcloud storage buckets create gs://vana-generated-images --location=us-central1
   ```

3. **Review and Approve Plan**
   - ✅ API Choice: Gemini 2.5 Flash (confirmed)
   - Review architecture design
   - Set rate limits (recommend: 10-20 images/day per user)
   - Define free vs premium tiers (optional)

### Implementation Order

1. ✅ Phase 2 (Backend Tools) - Get image generation working first
2. ✅ Phase 3 (ADK Agents) - Integrate into agent system
3. ✅ Phase 4 (SSE & Storage) - Add real-time updates
4. ✅ Phase 1 (Frontend) - Build UI last (can iterate quickly)
5. ✅ Phase 5 (Testing) - Validate end-to-end

---

## Questions & Decisions Needed

### Technical Decisions

1. **✅ API Choice**: Gemini 2.5 Flash (CONFIRMED)
   - Ultra-low cost ($0.002-$0.005 per image)
   - Uses existing `GOOGLE_API_KEY`
   - 1,500 free requests/day
   - No changes needed!

2. **Rate Limiting**: How many images per user per day?
   - **Recommendation for Free Tier**: 10-20 images/day
   - **Recommendation for Premium Tier**: Unlimited (or 100/day with soft cap)
   - **For Development**: No limit (within 1,500/day free tier)

3. **Image Storage**: How long to keep images?
   - **Recommendation**: 30-day auto-delete via GCS lifecycle policy
   - Users can download images locally
   - Consider: Premium users get 90-day retention

4. **Variations**: Auto-create variations or on-demand only?
   - **Recommendation**: On-demand only (when user clicks "Create variation" button)
   - Saves costs and reduces latency
   - Can generate 2-4 variations in a single batch call when requested

5. **Batch Generation**: Generate multiple images in initial request?
   - **Recommendation**: Default to 1 image, offer "Generate 3 options" button
   - Gemini can generate up to 4 images in a single API call

### Budget Decisions

1. **✅ Development Budget**: ZERO COST
   - Free tier: 1,500 requests/day
   - No credit card required
   - Perfect for testing and development

2. **Monthly Production Budget**: What's acceptable?
   - **Recommendation**: Start with $20-50/month (within free tier or minimal overage)
   - Monitor usage with Cloud Monitoring
   - Set budget alerts at $25, $50, $100

3. **Monetization Strategy** (Optional):
   - Free tier: 10 images/day (costs you $0-2/month per user)
   - Premium tier: Unlimited images ($5-10/month subscription)
   - Very profitable with Gemini's low costs!

### UX Decisions

1. **Default Aspect Ratio**: Square, portrait, or landscape?
   - **Recommendation**: Let `image_request_analyzer` choose based on prompt
   - User can override with explicit requests
   - Default fallback: 1:1 (square) for general use

2. **Number of Variations**: How many to offer?
   - **Recommendation**: Single image by default, "Generate 3 options" button
   - Batch call generates all 3 in one request (efficient)
   - User can create additional variations later

3. **Image Format**: PNG vs JPG vs WebP?
   - **Recommendation**: Gemini returns PNG by default (lossless)
   - Offer WebP export for smaller file sizes
   - Let user choose format on export

---

## Appendix

### A. Alternative Image Generation APIs

| API | Pros | Cons | Cost | Status |
|-----|------|------|------|--------|
| **Gemini 2.5 Flash** ✅ | Ultra-cheap, unified API key, Google ecosystem, fast | New (Jan 2025), less fine control | $0.002-$0.005 per image | **SELECTED** |
| **DALL-E 3** | Best quality, simple API, safety filters | Expensive, no fine control, separate API key | $0.04-$0.12 per image | Alternative |
| **Stability AI** | Cheap, flexible, multiple models | Needs prompt engineering, separate API | $0.004-$0.01 per image | Alternative |
| **Imagen 3** | Google ecosystem, high quality | Requires Vertex AI setup, complex billing | Variable (GCP pricing) | Alternative |
| **Flux.1 Pro** | Excellent photorealism, fast | New, less proven, expensive | ~$0.05 per image | Alternative |
| **Midjourney** | Best artistic quality | No official API yet, waitlist | TBD | Not Available |

**Why Gemini 2.5 Flash is the best choice for Vana:**
1. **Zero Additional Setup**: Uses your existing `GOOGLE_API_KEY` from AI Studio
2. **Cost Efficiency**: 20-50x cheaper than DALL-E 3
3. **Free Tier**: 1,500 requests/day for development
4. **Google Ecosystem**: Native integration with your ADK agents and GCS storage
5. **Production Ready**: Announced January 2025 with enterprise SLA

### B. Prompt Engineering Best Practices (Gemini 2.5 Flash)

```python
# Good prompts for Gemini 2.5 Flash are:

# 1. Specific and detailed with style keywords
good_prompt = "A serene mountain landscape at golden hour, with snow-capped peaks reflecting in a calm alpine lake, warm orange and purple sunset sky, pine trees in foreground, photorealistic style, high detail"

# 2. Include style/mood/atmosphere with artistic descriptors
good_prompt = "A cozy coffee shop interior, warm lighting, wooden furniture, soft jazz atmosphere, watercolor illustration style, muted colors, artistic composition"

# 3. Specify technical details and perspective
good_prompt = "Professional headshot photo of a businesswoman, natural lighting, blurred office background, shallow depth of field, sharp focus, 35mm lens perspective"

# 4. Use descriptive adjectives for better results
good_prompt = "A vibrant cyberpunk cityscape at night, neon lights, futuristic architecture, rainy streets with reflections, dramatic lighting, cinematic composition, digital art style"

# 5. Specify composition and framing
good_prompt = "A cat sitting on a windowsill, close-up portrait, soft natural lighting from window, blurred background, warm tones, professional pet photography style"

# Bad prompts are:
bad_prompt = "mountain"  # Too vague
bad_prompt = "make it good"  # No useful information
bad_prompt = "cat dog tree house car"  # Incoherent, too many subjects
bad_prompt = "image"  # Completely useless

# Gemini-specific tips:
# - Use "photorealistic style" for realistic images
# - Use "digital art style" for artistic/illustrative images
# - Include lighting details: "soft lighting", "dramatic lighting", "golden hour"
# - Specify perspective: "aerial view", "eye level", "close-up", "wide angle"
# - Add composition keywords: "centered", "rule of thirds", "symmetrical"
```

### C. Cost Optimization Strategies (Gemini 2.5 Flash)

**With Gemini 2.5 Flash, costs are already 20-50x lower, but here are additional strategies:**

1. **Leverage Free Tier**: 1,500 requests/day free on AI Studio - perfect for most development and low-volume production
2. **Lazy Variation Generation**: Only create variations when user clicks button (not automatically)
3. **Batch Multiple Images**: Gemini can generate 1-4 images in a single API call - use this for variations instead of separate requests
4. **Rate Limiting**: Prevent abuse (recommend 10-20 images per user per day for free users)
5. **Cache Common Requests**: Store and reuse images for identical prompts (with user consent and cache expiration)
6. **GCS Lifecycle Rules**: Auto-delete images after 30 days to reduce storage costs
7. **Compress Images**: Use WebP format for smaller file sizes when quality isn't critical
8. **Monitor Usage**: Track generation counts and costs with Cloud Monitoring alerts
9. **Tiered Access**: Offer free tier (10 images/day), premium tier (unlimited) for monetization
10. **Smart Caching**: Cache generated images in CDN for faster serving and reduced GCS costs

**Expected Monthly Costs:**
- **Free Tier Only**: $0/month (within 1,500/day limit)
- **Light Usage** (100 images/day): $6-15/month
- **Medium Usage** (500 images/day): $30-75/month
- **Heavy Usage** (2,000 images/day): $120-300/month

**Compared to DALL-E 3:**
- Same usage with DALL-E 3 would cost: $2,400-$7,200/month
- **Savings: 95%+**

---

**End of Plan**

*This plan provides a complete roadmap for integrating the agent-image-editor component into your Vana platform. All technical requirements, dependencies, and implementation details are specified. Ready for implementation once API keys and budget are confirmed.*
