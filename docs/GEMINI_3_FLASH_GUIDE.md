# Gemini 3 Flash: Comprehensive Developer Guide

> **Last Updated:** January 2026
> **Model ID:** `gemini-3-flash-preview`
> **Status:** Preview (Released December 17, 2025)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features & Capabilities](#key-features--capabilities)
3. [Model Specifications](#model-specifications)
4. [Thinking Levels](#thinking-levels)
5. [Thought Signatures](#thought-signatures)
6. [API Integration](#api-integration)
7. [SDK Usage](#sdk-usage)
8. [Function Calling & Tool Use](#function-calling--tool-use)
9. [Multimodal Processing](#multimodal-processing)
10. [Streaming](#streaming)
11. [OpenRouter Integration](#openrouter-integration)
12. [Best Practices](#best-practices)
13. [Migration from Gemini 2.x](#migration-from-gemini-2x)
14. [Troubleshooting](#troubleshooting)
15. [Pricing & Rate Limits](#pricing--rate-limits)
16. [Benchmarks & Comparisons](#benchmarks--comparisons)
17. [FAQ](#faq)
18. [Resources](#resources)

---

## Overview

Gemini 3 Flash is Google's latest frontier AI model, combining **Gemini 3 Pro-grade reasoning** with **Flash-level latency, efficiency, and cost**. Released on December 17, 2025, it's designed for:

- **Agentic workflows** requiring rapid iteration
- **Multi-turn chat** applications
- **Coding assistance** with near-real-time feedback
- **Complex reasoning tasks** at a fraction of Pro's cost

### Key Highlights

| Metric | Value |
|--------|-------|
| **Speed** | 3x faster than Gemini 2.5 Flash |
| **Cost** | 1/4 the price of Gemini 3 Pro |
| **Context Window** | 1,048,576 tokens (1M) |
| **Max Output** | 65,536 tokens |
| **Multimodal** | Text, images, video, audio, PDFs |
| **SWE-bench Score** | 78% (agentic coding) |
| **GPQA Diamond** | 90.4% (PhD-level reasoning) |

---

## Key Features & Capabilities

### 1. Frontier-Class Reasoning

- Achieves **90.4% on GPQA Diamond** (PhD-level reasoning)
- **33.7% on Humanity's Last Exam** (without tools)
- **81.2% on MMMU Pro** (multimodal understanding)
- Outperforms Gemini 2.5 Pro on many benchmarks

### 2. Agentic Coding Excellence

- **78% on SWE-bench Verified** (actually outperforms Gemini 3 Pro's 76.2%)
- Immediate 10% baseline improvement on agentic coding tasks
- Optimized for tight iteration loops and multi-step agent workflows

### 3. Advanced Visual & Spatial Reasoning

- Native multimodal architecture processes visual and text in unified embedding space
- 69.1% UI navigation accuracy (57-point gap over 2.5 Pro)
- Code execution for zooming, counting, and editing visual inputs

### 4. Speed & Efficiency

- ~218 tokens/second output speed
- Uses 30% fewer tokens than 2.5 Pro on average
- 50-70% latency reduction compared to previous generation

### 5. Supported Tools

- **Google Search** (grounding)
- **File Search**
- **Code Execution**
- **URL Context**
- **Function Calling** (custom tools)
- **Batch API**
- **Context Caching**

### 6. NOT Supported

- Google Maps grounding
- Computer Use
- Image Segmentation (use Gemini 2.5 Flash instead)

---

## Model Specifications

```yaml
Model ID: gemini-3-flash-preview
Knowledge Cutoff: January 2025
Input Context: 1,048,576 tokens (≈750,000 words / 3,000 pages)
Max Output: 65,536 tokens

Supported Inputs:
  - Text
  - Images (up to 4K resolution)
  - Video (up to 60 minutes)
  - Audio (11 languages, 96.8% accuracy)
  - PDFs

Output: Text (with optional structured JSON via schema enforcement)

Temperature: 1.0 (recommended default)
```

---

## Thinking Levels

Gemini 3 Flash introduces the `thinking_level` parameter for fine-grained control over reasoning depth:

| Level | Description | Use Case |
|-------|-------------|----------|
| **minimal** | Minimizes thinking tokens; closest to "no thinking" | High-throughput chat, simple tasks |
| **low** | Constrained thinking for simpler tasks | Instruction following, fast responses |
| **medium** | Balanced reasoning for moderate complexity | General-purpose tasks |
| **high** (default) | Maximum reasoning depth; longer first-token latency | Complex reasoning, agentic workflows |

### Code Example

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Explain quantum entanglement",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="medium"  # Options: minimal, low, medium, high
        )
    )
)
```

### Important Notes

- `minimal` does NOT guarantee thinking is off—the model may still think for complex coding tasks
- **Never use both** `thinking_level` and legacy `thinking_budget` in the same request (causes 400 error)
- If migrating from `thinking_budget=0`, use `thinking_level="minimal"`
- Even with `minimal`, thought signatures must still be handled

---

## Thought Signatures

Thought signatures are **encrypted representations of the model's internal reasoning process**. They preserve context across multi-turn conversations and are **mandatory for Gemini 3 models**.

### How They Work

```
Request: user_prompt
    ↓
Response: functionCall + thoughtSignature
    ↓
Request: user_prompt + (functionCall + thoughtSignature) + functionResponse
    ↓
Response: final_answer
```

### Validation Rules

| Scenario | Requirement |
|----------|-------------|
| **Function calling** | Strictly enforced; missing = 400 error |
| **Text/chat** | Optional but recommended for quality |
| **Image generation** | Strictly validated on all parts |
| **Parallel function calls** | Signature only on FIRST call |
| **Sequential calls** | Each step's first call needs signature |

### SDK Automatic Handling

If you use official SDKs (Python, Node, Java) with standard chat history, **thought signatures are handled automatically**:

```python
# Python - signatures managed automatically
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel("gemini-3-flash-preview")

chat = model.start_chat()
response = chat.send_message("Hello!")  # Signatures handled automatically
```

### Manual Handling (Raw API)

When using raw HTTP requests, you must preserve and return the `thoughtSignature`:

```javascript
// Response from model includes thoughtSignature
{
  "candidates": [{
    "content": {
      "parts": [{
        "functionCall": {
          "name": "get_weather",
          "args": { "location": "Paris" }
        },
        "thoughtSignature": "abc123..."  // MUST preserve this
      }]
    }
  }]
}

// Include in next request
{
  "contents": [
    { "role": "user", "parts": [{ "text": "What's the weather?" }] },
    {
      "role": "model",
      "parts": [{
        "functionCall": { "name": "get_weather", "args": { "location": "Paris" } },
        "thoughtSignature": "abc123..."  // Return the signature
      }]
    },
    {
      "role": "user",
      "parts": [{
        "functionResponse": {
          "name": "get_weather",
          "response": { "temperature": 22 }
        }
      }]
    }
  ]
}
```

### Workaround for Missing Signatures

For migrated conversations or custom function calls without valid signatures:

```json
{
  "thoughtSignature": "context_engineering_is_the_way_to_go"
}
```

This bypasses validation but may degrade reasoning quality.

---

## API Integration

### Endpoints

| Provider | Endpoint |
|----------|----------|
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview` |
| **Vertex AI** | `https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/gemini-3-flash-preview` |
| **OpenRouter** | `https://openrouter.ai/api/v1` (model: `google/gemini-3-flash-preview`) |

### Basic REST Request

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Explain machine learning in simple terms"}]
    }],
    "generationConfig": {
      "temperature": 1.0,
      "maxOutputTokens": 2048
    }
  }'
```

### Streaming Request

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Write a short story"}]
    }]
  }'
```

---

## SDK Usage

### Python

```bash
pip install google-generativeai
```

```python
import google.generativeai as genai

# Configure
genai.configure(api_key="YOUR_API_KEY")

# Initialize model
model = genai.GenerativeModel("gemini-3-flash-preview")

# Simple generation
response = model.generate_content("Explain quantum computing")
print(response.text)

# With thinking configuration
from google.genai import types

response = model.generate_content(
    "Solve this complex math problem...",
    generation_config=genai.GenerationConfig(
        temperature=1.0,
        max_output_tokens=4096
    ),
    thinking_config=types.ThinkingConfig(thinking_level="high")
)

# Multi-turn conversation
chat = model.start_chat()
response = chat.send_message("Hello! What can you do?")
response = chat.send_message("Tell me more about your coding abilities")
```

### JavaScript/Node.js

```bash
npm install @google/generative-ai
```

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// Simple generation
const result = await model.generateContent("Explain machine learning");
console.log(result.response.text());

// Streaming
const streamResult = await model.generateContentStream("Write a poem about AI");
for await (const chunk of streamResult.stream) {
  console.log(chunk.text());
}

// Multi-turn chat
const chat = model.startChat();
const msg1 = await chat.sendMessage("Hello!");
const msg2 = await chat.sendMessage("What's 2+2?");
```

### Using @google/genai (newer SDK)

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Your prompt here",
    config: {
        thinkingConfig: { thinkingLevel: "medium" }
    }
});
```

---

## Function Calling & Tool Use

### Defining Tools

```python
from google import genai
from google.genai import types

# Define function declaration
get_weather = types.FunctionDeclaration(
    name="get_weather",
    description="Get the current weather for a location",
    parameters={
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "City name, e.g., 'San Francisco'"
            },
            "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "Temperature unit"
            }
        },
        "required": ["location"]
    }
)

# Create tool configuration
tool = types.Tool(function_declarations=[get_weather])

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="What's the weather in Tokyo?",
    config=types.GenerateContentConfig(tools=[tool])
)

# Check for function call
if response.candidates[0].content.parts[0].function_call:
    fc = response.candidates[0].content.parts[0].function_call
    print(f"Function: {fc.name}, Args: {fc.args}")
```

### Function Calling Modes

| Mode | Description |
|------|-------------|
| **AUTO** (default) | Model decides whether to call functions or respond naturally |
| **ANY** | Forces function calls (optionally restrict to specific functions) |
| **NONE** | Prohibits function calling |
| **VALIDATED** | Ensures schema adherence while allowing natural language |

### Streaming Function Call Arguments (New in Gemini 3)

```javascript
const response = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: "Get weather for Paris" }] }],
    tools: [weatherTool],
    toolConfig: {
        functionCallingConfig: {
            streamFunctionCallArguments: true  // Enable argument streaming
        }
    }
});

for await (const chunk of response.stream) {
    if (chunk.functionCall?.partialArgs) {
        console.log("Partial args:", chunk.functionCall.partialArgs);
    }
}
```

### Best Practices for Function Calling

1. **Write specific descriptions** - Clear, detailed function and parameter descriptions
2. **Use strong typing** - Integers, strings, enums reduce errors
3. **Limit active tools** - 10-20 tools for optimal performance
4. **Low temperature** - Use `temperature=0` for deterministic calls
5. **Verify finish reasons** - Always check response completion status
6. **Handle errors robustly** - Implement retries and fallbacks

---

## Multimodal Processing

### Image Input

```python
import google.generativeai as genai
import PIL.Image

model = genai.GenerativeModel("gemini-3-flash-preview")

# From file
image = PIL.Image.open("image.jpg")
response = model.generate_content(["Describe this image", image])

# From URL (using File API)
file = genai.upload_file("path/to/image.png")
response = model.generate_content([file, "What's in this image?"])
```

### Media Resolution Control

The `media_resolution` parameter controls vision processing token allocation:

| Resolution | Tokens/Image | Use Case |
|------------|--------------|----------|
| **low** | 66 | Quick analysis, thumbnails |
| **medium** | 280 | Standard documents |
| **high** | 560 | Detailed images |
| **ultra_high** | 1120 | Fine text, small details |

```python
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[image_data, "Read the text in this image"],
    config=types.GenerateContentConfig(
        media_resolution="high"  # Better OCR accuracy
    )
)
```

### Video Input

```python
# Upload video
video_file = genai.upload_file("video.mp4")

# Wait for processing
while video_file.state.name == "PROCESSING":
    time.sleep(10)
    video_file = genai.get_file(video_file.name)

response = model.generate_content([video_file, "Summarize this video"])
```

**Video Token Usage:**
- Default: ~300 tokens/second
- Low resolution: ~100 tokens/second
- Audio: 32 tokens/second

### Audio Input

```python
audio_file = genai.upload_file("audio.mp3")
response = model.generate_content([
    audio_file,
    "Transcribe this audio and identify the main topics"
])
```

**Supported Languages:** 11 languages with 96.8% transcription accuracy

---

## Streaming

### Basic Streaming

```python
import google.generativeai as genai

model = genai.GenerativeModel("gemini-3-flash-preview")

response = model.generate_content(
    "Write a detailed essay about AI",
    stream=True
)

for chunk in response:
    print(chunk.text, end="", flush=True)
```

### JavaScript Streaming

```javascript
const result = await model.generateContentStream(prompt);

for await (const chunk of result.stream) {
    const text = chunk.text();
    process.stdout.write(text);
}
```

### Next.js Edge Runtime

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    });

    const { prompt } = await req.json();
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of result.stream) {
                controller.enqueue(encoder.encode(chunk.text()));
            }
            controller.close();
        }
    });

    return new Response(stream);
}
```

---

## OpenRouter Integration

### Configuration

```typescript
// Using OpenRouter with Gemini 3 Flash
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function generateResponse(prompt: string) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-site.com",  // Optional
            "X-Title": "Your App Name"  // Optional
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 1.0,
            max_tokens: 2048
        })
    });

    return response.json();
}
```

### Streaming with OpenRouter

```typescript
const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        stream: true
    })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // Parse SSE format: data: {...}
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
    for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        if (data.choices?.[0]?.delta?.content) {
            process.stdout.write(data.choices[0].delta.content);
        }
    }
}
```

### Reasoning Support

```typescript
const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: "Solve this complex problem..." }],
        reasoning: true  // Enable step-by-step reasoning
    })
});

const data = await response.json();
// Access reasoning via data.choices[0].message.reasoning_details
```

---

## Best Practices

### 1. Prompt Design

```python
# ❌ Poor: Vague, no structure
response = model.generate_content("help me with code")

# ✅ Good: Clear, specific, structured
response = model.generate_content("""
You are a Python expert. Review this code for:
1. Security vulnerabilities
2. Performance issues
3. Best practice violations

Code:
```python
def process_user(data):
    return eval(data['command'])
```

Provide fixes with explanations.
""")
```

### 2. Temperature Settings

**Always use `temperature=1.0`** (the default) for Gemini 3 models. Lower temperatures can cause:
- Response looping
- Performance degradation on complex tasks

### 3. Thinking Level Selection

| Task Type | Recommended Level |
|-----------|-------------------|
| Simple Q&A, chat | `minimal` |
| Summarization, translation | `low` |
| Analysis, general coding | `medium` |
| Complex reasoning, agentic tasks | `high` |

### 4. Production Checklist

- [ ] **Error handling** - Implement retries with exponential backoff
- [ ] **Caching** - Use context caching for 90% cost reduction
- [ ] **Monitoring** - Track latency, cost, error rate
- [ ] **Rate limiting** - Handle 429 errors gracefully
- [ ] **Fallbacks** - Route to backup models when needed
- [ ] **Batching** - Use Batch API for 50% savings on async work

### 5. Hybrid Routing Strategy

```python
def route_to_model(query: str, complexity: str):
    if complexity == "simple":
        return "gemini-3-flash-preview"  # Fast, cheap
    elif complexity == "complex":
        return "gemini-3-pro-preview"    # Maximum reasoning
    else:
        return "gemini-3-flash-preview"  # Default to Flash
```

### 6. Media Processing Tips

| Media Type | Recommendation |
|------------|----------------|
| **Images** | Use `media_resolution_high` for text/details |
| **PDFs** | Use `media_resolution_medium` (changed from 2.5) |
| **Video (general)** | Use `media_resolution_low` |
| **Video (text-heavy)** | Use `media_resolution_high` |

---

## Migration from Gemini 2.x

### Key Changes

| Aspect | Gemini 2.5 | Gemini 3 Flash |
|--------|------------|----------------|
| Thinking control | `thinking_budget` (tokens) | `thinking_level` (enum) |
| Thought signatures | Optional | **Mandatory** for function calls |
| Temperature | Lower often better | Use default 1.0 |
| PDF token usage | Lower | Higher (improved OCR) |
| Video token usage | Higher | Lower |
| Image segmentation | Supported | **NOT supported** |

### Migration Checklist

1. **Replace `thinking_budget` with `thinking_level`**
   ```python
   # Before (2.5)
   thinking_budget=0

   # After (3.0)
   thinking_level="minimal"
   ```

2. **Update temperature settings**
   ```python
   # Before: Often used lower temps
   temperature=0.3

   # After: Use default
   temperature=1.0  # or omit entirely
   ```

3. **Handle thought signatures**
   - If using SDKs with chat history: No changes needed
   - If using raw API: Implement signature preservation

4. **Test PDF processing**
   - Token usage changed; test with `media_resolution_high`

5. **Image segmentation workaround**
   - Use Gemini 2.5 Flash for segmentation tasks

---

## Troubleshooting

### Error: "Function call is missing a thought_signature"

**Cause:** Gemini 3 requires thought signatures for all function calls.

**Solutions:**
1. **Use official SDKs** with chat history (automatic handling)
2. **Preserve signatures** in raw API requests
3. **Use dummy signature** as workaround:
   ```json
   "thoughtSignature": "context_engineering_is_the_way_to_go"
   ```

### Error: 400 - Cannot use both thinking_level and thinking_budget

**Cause:** Mixing old and new parameters.

**Solution:** Use only `thinking_level`:
```python
# ❌ Wrong
thinking_budget=1000, thinking_level="high"

# ✅ Correct
thinking_level="high"
```

### Error: 429 - Quota Exceeded

**Cause:** Rate limit reached.

**Solutions:**
1. Implement exponential backoff
2. Use Batch API for non-urgent requests
3. Upgrade to paid tier
4. Use context caching to reduce token usage

### Response Quality Degradation

**Possible Causes:**
- Temperature set below 1.0
- Thinking level too low for task complexity
- Missing thought signatures in multi-turn

**Solutions:**
- Use `temperature=1.0`
- Increase thinking level
- Ensure signature preservation

### Slow First Token Latency

**Cause:** High thinking level requires more reasoning time.

**Solutions:**
- Use lower thinking level for latency-sensitive tasks
- Use streaming for perceived speed improvement
- Consider `minimal` for chat applications

---

## Pricing & Rate Limits

### Pricing (As of December 2025)

| Tier | Input | Output | Notes |
|------|-------|--------|-------|
| **Standard** | $0.50/1M tokens | $3.00/1M tokens | Default pricing |
| **Audio Input** | $1.00/1M tokens | — | For audio processing |
| **Context Caching** | — | — | 90% reduction for cached tokens |
| **Batch API** | — | — | 50% reduction |

### Comparison to Pro

| Model | Input | Output (≤200k) | Output (>200k) |
|-------|-------|----------------|----------------|
| Gemini 3 Flash | $0.50/1M | $3.00/1M | $3.00/1M |
| Gemini 3 Pro | $2.00/1M | $12.00/1M | $18.00/1M |

**Flash is 4x cheaper on input, 4-6x cheaper on output**

### Rate Limits

| Tier | RPM | TPM | RPD |
|------|-----|-----|-----|
| **Free** | ~2-15 | ~250K | ~20-1000 |
| **Paid Tier 1** | Higher | Higher | Higher |

**Note:** Free tier limits were reduced in December 2025. Check [Google AI Studio](https://aistudio.google.com) for current limits.

### OpenRouter Pricing

- Input: $0.50/1M tokens
- Output: $3.00/1M tokens
- Pay-per-use, no subscription required

---

## Benchmarks & Comparisons

### vs Other Models (December 2025)

| Benchmark | Gemini 3 Flash | Gemini 3 Pro | GPT-4o | Claude Sonnet 4.5 |
|-----------|----------------|--------------|--------|-------------------|
| **GPQA Diamond** | 90.4% | 91.9% | 88% | 88% |
| **SWE-bench** | 78% | 76.2% | 80% | ~80% |
| **MMMU Pro** | 81.2% | ~82% | — | — |
| **Humanity's Last Exam** | 33.7% | — | — | — |

### Key Advantages

- **3x faster** than Gemini 2.5 Flash
- **1/4 cost** of Gemini 3 Pro
- **1/3 cost** of GPT-4o
- **1/6 cost** of Claude Sonnet 4.5
- **4x higher rate limits** than GPT-4o (2000 vs 500 RPM)

### Real-World Performance

- **Resemble AI:** 4x faster multimodal analysis vs 2.5 Pro
- **Box Inc:** 15% accuracy improvement for document extraction
- **JetBrains:** Quality close to Pro with significantly lower latency

---

## FAQ

### Q: What's the difference between Gemini 3 Flash and Pro?

**Flash** is optimized for speed and cost while maintaining strong reasoning. **Pro** offers deeper reasoning for the most complex tasks. Flash actually **outperforms Pro on SWE-bench** (78% vs 76.2%).

### Q: Can I disable thinking entirely?

No. Even with `thinking_level="minimal"`, the model may think for complex tasks. This is by design to maintain quality. Thought signatures are still required.

### Q: Is there a free tier?

Yes, but with limited quotas (significantly reduced in December 2025). Check Google AI Studio for current limits.

### Q: How do I handle thought signatures?

Use official SDKs with chat history—signatures are automatic. For raw API, preserve the `thoughtSignature` field and return it in subsequent requests.

### Q: Should I use Flash or 2.5 Flash?

Use **Gemini 3 Flash** for most cases (faster, better reasoning). Use **2.5 Flash** only for:
- Image segmentation tasks
- Codebases not yet updated for thought signatures

### Q: What temperature should I use?

Use the **default of 1.0**. Lower temperatures can cause performance issues with Gemini 3 models.

### Q: How do I reduce costs?

1. **Context caching** for repeated content (90% savings)
2. **Batch API** for async work (50% savings)
3. **Appropriate thinking level** for task complexity
4. **Hybrid routing** (Flash for simple, Pro for complex)

### Q: Why am I getting 429 errors?

Rate limits, especially on free tier. Solutions:
- Implement exponential backoff
- Upgrade to paid tier
- Use Batch API for non-urgent requests

### Q: Can I use it through OpenRouter?

Yes! Model ID: `google/gemini-3-flash-preview`. Same pricing as direct API.

---

## Resources

### Official Documentation

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Thought Signatures Guide](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Vertex AI Gemini 3 Flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)

### Tools & Platforms

- [Google AI Studio](https://aistudio.google.com)
- [Vertex AI Console](https://console.cloud.google.com/vertex-ai)
- [OpenRouter](https://openrouter.ai/google/gemini-3-flash-preview)
- [Gemini CLI](https://geminicli.com)

### SDKs

- [Python SDK](https://pypi.org/project/google-generativeai/)
- [JavaScript SDK](https://www.npmjs.com/package/@google/generative-ai)
- [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)

### Announcements

- [Introducing Gemini 3 Flash](https://blog.google/products/gemini/gemini-3-flash/)
- [Build with Gemini 3 Flash](https://blog.google/technology/developers/build-with-gemini-3-flash/)
- [Google DeepMind: Gemini Flash](https://deepmind.google/models/gemini/flash/)

---

*This guide is maintained as part of the Vana project documentation. For project-specific usage patterns, see the main [CLAUDE.md](../CLAUDE.md).*
