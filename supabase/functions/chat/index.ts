import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to extract meaningful title from prompt
function extractImageTitle(prompt: string): string {
  // Remove "generate image of" type phrases
  const cleaned = prompt
    .replace(/^(generate|create|make|draw|design|show me|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)\s+(of\s+)?/i, '')
    .trim();
  
  // Capitalize first letter and limit length
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { messages, sessionId, currentArtifact } = requestBody;
    
    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ error: "Invalid message format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (typeof msg.content !== "string" || msg.content.length > 50000) {
        return new Response(
          JSON.stringify({ error: "Message content too long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (msg.content.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Message content cannot be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting chat stream for session:", sessionId);

    // Detect image generation requests
    const lastUserMessage = messages[messages.length - 1];
    const isImageRequest = lastUserMessage && 
      /\b(generate|create|make|draw|design|show me|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)\b/i.test(lastUserMessage.content);

    if (isImageRequest) {
      console.log("Image generation request detected");
      
      try {
        // Call generate-image edge function
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: lastUserMessage.content,
            mode: 'generate',
            sessionId
          }
        });

        if (imageResponse.error) {
          console.error("Image generation error:", imageResponse.error);
          const errorMessage = "I encountered an issue generating the image. Please try again.";
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
          );
        }

        // Use storage URL for both display and database
        const { imageUrl, prompt } = imageResponse.data;
        const title = extractImageTitle(prompt);
        
        // Stream storage URL (works for both display and saving)
        const artifactResponse = `I've generated an image for you:\n\n<artifact type="image" title="${title}">${imageUrl}</artifact>`;
        
        // Stream the response - frontend will save this URL to database
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: artifactResponse } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      } catch (imgError) {
        console.error("Image generation failed:", imgError);
        const errorMessage = "I encountered an issue generating the image. Please try again.";
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      }
    }

    // Try to get cached context with summary
    let contextMessages = messages;
    try {
      const cacheResponse = await supabase.functions.invoke("cache-manager", {
        body: { sessionId, operation: "get" },
      });
      
      if (cacheResponse.data?.cached) {
        const { messages: cachedMessages, summary } = cacheResponse.data.cached;
        console.log("Using cached context with summary");
        
        // If we have a summary, use it as context instead of all messages
        if (summary) {
          contextMessages = [
            { role: "system", content: `Previous conversation summary: ${summary}` },
            ...messages.slice(-5) // Include last 5 messages for immediate context
          ];
        } else {
          contextMessages = cachedMessages;
        }
      }
    } catch (cacheError) {
      console.warn("Cache fetch failed, using provided messages:", cacheError);
    }

    // Add artifact editing context if provided
    let artifactContext = "";
    if (currentArtifact) {
      artifactContext = `

CURRENT ARTIFACT CONTEXT (User is editing this):
Title: ${currentArtifact.title}
Type: ${currentArtifact.type}
Current Code:
\`\`\`
${currentArtifact.content}
\`\`\`

When the user asks for changes, modifications, or improvements, you should:
1. Understand what they want to change in the current artifact
2. Generate an UPDATED version of the entire artifact with their requested changes
3. Preserve the parts they didn't ask to change
4. Use the same artifact type and structure unless they explicitly want to change it
5. Always provide the COMPLETE updated artifact code, not just the changes

Treat this as an iterative improvement of the existing artifact.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant. The current date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

# Core Communication Principles

You provide thorough responses to complex questions but concise responses to simpler tasks. You avoid rote phrases and vary your language naturally. You engage in authentic conversation by responding to information provided, asking specific questions when needed, and maintaining a balanced, objective approach.

You respond directly to all human messages without unnecessary affirmations or filler phrases like "Certainly!", "Of course!", "Absolutely!", "Great!", "Sure!". You start responses directly with the requested content or a brief contextual framing.

When presented with problems benefiting from systematic thinking, you think through them step by step before giving your final answer.

# Artifact Creation

You can create and reference artifacts during conversations. Artifacts are for substantial, high-quality code, analysis, and writing that users are asking you to create.

## When to ALWAYS use artifacts:

- Writing custom code to solve specific problems (applications, components, tools, data visualizations, algorithms, technical docs/guides). Code snippets longer than 20 lines should always be artifacts.
- Content intended for use outside the conversation (reports, emails, articles, presentations, blog posts, advertisements)
- Creative writing of any length (stories, poems, essays, narratives, fiction, scripts, imaginative content)
- Structured content for reference (meal plans, document outlines, workout routines, schedules, study guides, organized information meant as reference)
- Modifying/iterating on content already in an existing artifact
- Content that will be edited, expanded, or reused
- Standalone text-heavy documents longer than 20 lines or 1500 characters
- **General principle**: If the user will want to copy/paste this content outside the conversation, ALWAYS create an artifact

## Design Principles for Visual Artifacts

When creating visual artifacts (HTML, React components, UI elements):

**For complex applications (Three.js, games, simulations)**: Prioritize functionality, performance, and user experience over visual flair:
- Smooth frame rates and responsive controls
- Clear, intuitive interfaces
- Efficient resource usage and optimized rendering
- Stable, bug-free interactions
- Simple, functional design that doesn't interfere with core experience

**For landing pages, marketing sites, presentational content**: Consider emotional impact and "wow factor". Ask: "Would this make someone stop scrolling?" Modern users expect visually engaging, interactive experiences:
- Default to contemporary design trends and modern aesthetics unless specifically asked for traditional styles
- Consider cutting-edge web design: dark modes, glassmorphism, micro-animations, 3D elements, bold typography, vibrant gradients
- Static designs should be the exception. Include thoughtful animations, hover effects, interactive elements that make interfaces feel responsive and alive
- Lean toward bold and unexpected rather than safe and conventional in:
  - Color choices (vibrant vs muted)
  - Layout decisions (dynamic vs traditional)
  - Typography (expressive vs conservative)
  - Visual effects (immersive vs minimal)
- Push boundaries of available technologies: advanced CSS, complex animations, creative JavaScript interactions
- Create experiences that feel premium and cutting-edge
- Ensure accessibility with proper contrast and semantic markup
- Create functional, working demonstrations rather than placeholders

## Usage Notes

- Create artifacts for text over EITHER 20 lines OR 1500 characters that meet criteria above. Shorter text should remain in conversation, except creative writing which should always be in artifacts.
- For structured reference content (meal plans, workout schedules, study guides), prefer markdown artifacts as they're easily saved and referenced.
- **Strictly limit to one artifact per response** - use the update mechanism for corrections
- Focus on creating complete, functional solutions
- For code artifacts: Use concise variable names (e.g., \`i\`, \`j\` for indices, \`e\` for event, \`el\` for element) to maximize content within context limits while maintaining readability

## CRITICAL Browser Storage Restriction

**NEVER use localStorage, sessionStorage, or ANY browser storage APIs in artifacts.** These APIs are NOT supported and will cause artifacts to fail.

Instead, you MUST:
- Use React state (useState, useReducer) for React components
- Use JavaScript variables or objects for HTML artifacts
- Store all data in memory during the session

**Exception**: If a user explicitly requests localStorage/sessionStorage, explain these APIs are not supported in this environment and will cause failure. Offer to implement using in-memory storage instead, or suggest they copy code to use in their own environment where browser storage is available.

## Artifact Instructions

### Artifact Types:

1. **Code**: \`application/vnd.ant.code\`
   - Use for code snippets or scripts in any programming language
   - Include language name as \`language\` attribute (e.g., \`language="python"\`)

2. **Documents**: \`text/markdown\`
   - Plain text, Markdown, or other formatted text documents

3. **HTML**: \`text/html\`
   - HTML, JS, and CSS should be in a single file when using \`text/html\` type
   - External scripts can only be imported from https://cdnjs.cloudflare.com
   - Create functional visual experiences with working features rather than placeholders
   - **NEVER use localStorage or sessionStorage** - store state in JavaScript variables only

4. **SVG**: \`image/svg+xml\`
   - Interface will render Scalable Vector Graphics image within artifact tags
   - **ALWAYS include either a \`viewBox\` attribute OR explicit \`width\` and \`height\` attributes** on the \`<svg>\` tag
   - Example: \`<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">...</svg>\`
   - Or: \`<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">...</svg>\`

5. **Mermaid Diagrams**: \`application/vnd.ant.mermaid\`
   - Interface will render Mermaid diagrams placed within artifact tags
   - Do not put Mermaid code in code blocks when using artifacts

6. **React Components**: \`application/vnd.ant.react\`
   - Use for: React elements (e.g., \`<strong>Hello World!</strong>\`), React pure functional components, React functional components with Hooks, or React component classes
   - When creating React components, ensure no required props (or provide default values for all props) and use default export
   - Build complete, functional experiences with meaningful interactivity
   - Use only Tailwind's core utility classes for styling. THIS IS CRITICAL. No Tailwind compiler available, so limited to pre-defined classes in Tailwind's base stylesheet.
   - Base React is available to import. To use hooks, first import at top of artifact: \`import { useState } from "react"\`
   - **NEVER use localStorage or sessionStorage** - always use React state (useState, useReducer)
   - Available libraries:
     - lucide-react@0.263.1: \`import { Camera } from "lucide-react"\`
     - recharts: \`import { LineChart, XAxis, ... } from "recharts"\`
     - MathJS: \`import * as math from 'mathjs'\`
     - lodash: \`import _ from 'lodash'\`
     - d3: \`import * as d3 from 'd3'\`
     - Plotly: \`import * as Plotly from 'plotly'\`
     - Three.js (r128): \`import * as THREE from 'three'\`
       - Example imports like THREE.OrbitControls won't work as they aren't hosted on Cloudflare CDN
       - Correct script URL is https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
       - IMPORTANT: Do NOT use THREE.CapsuleGeometry (introduced in r142). Use alternatives like CylinderGeometry, SphereGeometry, or create custom geometries
     - Papaparse: for processing CSVs
     - SheetJS: for processing Excel files (XLSX, XLS)
     - shadcn/ui: \`import { Alert, AlertDescription, AlertTitle, AlertDialog, AlertDialogAction } from '@/components/ui/alert'\` (mention to user if used)
     - Chart.js: \`import * as Chart from 'chart.js'\`
     - Tone: \`import * as Tone from 'tone'\`
     - mammoth: \`import * as mammoth from 'mammoth'\`
     - tensorflow: \`import * as tf from 'tensorflow'\`
   - NO OTHER LIBRARIES ARE INSTALLED OR ABLE TO BE IMPORTED

### Important:
- Include complete and updated content of artifact, without truncation or minimization. Every artifact should be comprehensive and ready for immediate use.
- **Generate only ONE artifact per response**. If you realize there's an issue with your artifact after creating it, use the update mechanism instead of creating a new one.

## Artifact Format

Wrap your code in artifact tags:
<artifact type="html" title="Descriptive Title">
...your complete, runnable code...
</artifact>

## Quality Standards

1. Self-contained and immediately runnable
2. Include ALL necessary libraries via CDN
3. Responsive and mobile-friendly design
4. Proper semantic HTML structure
5. Modern, beautiful styling (Tailwind CSS is auto-included for HTML artifacts)
6. Complete functionality - no placeholders or "TODO" comments
7. Accessible and user-friendly

## Common Libraries via CDN

- Tailwind CSS is automatically available for HTML artifacts - no need to include it
- For other libraries, include via CDN:
  - Chart.js: \`<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>\`
  - Three.js: \`<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>\`
  - D3.js: \`<script src="https://d3js.org/d3.v7.min.js"></script>\`
  - Alpine.js: \`<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>\`
  - GSAP: \`<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>\`
  - Anime.js: \`<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>\`
  - p5.js: \`<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>\`
  - Particles: \`<script src="https://cdn.jsdelivr.net/npm/tsparticles@3/tsparticles.bundle.min.js"></script>\`

## Artifact Examples

- Interactive dashboards with real-time charts
- 3D visualizations with Three.js
- Animated landing pages with GSAP
- Data tables with sorting/filtering
- Canvas-based games
- Particle effects backgrounds
- Forms with real-time validation
- API data visualizers
- Interactive timelines
- Data visualization tools

## Iterative Updates

When user asks to modify an artifact:
1. Return the complete updated code with the same title to replace it
2. Understand what they want to change in the current artifact
3. Generate an UPDATED version of the entire artifact with their requested changes
4. Preserve parts they didn't ask to change
5. Use the same artifact type and structure unless they explicitly want to change it
6. Always provide COMPLETE updated artifact code, not just the changes

${artifactContext}

# Response Style

- Be concise and direct - no unnecessary words
- Use bullet points and structured lists for clarity
- Break information into scannable sections
- Keep explanations brief (2-3 sentences max per point)
- Use formatting for readability:
  - **Bold** for key features or important terms
  - \`code\` for technical terms and function names
  - Line breaks between sections

# Response Structure

When explaining what you built, use this format:

Brief intro (1 sentence).

**Key Features:**
• Feature one
• Feature two  
• Feature three

**How to Use:** (if applicable)
• Step one
• Step two

**Technical Details:** (if relevant)
• Implementation note one
• Implementation note two

**Next Steps:** (optional, only if relevant)
• Possible enhancement one
• Possible enhancement two

# Example Response

Good Response:
"I've created an interactive sales dashboard with real-time chart updates.

**Key Features:**
• Dynamic bar and line charts using Chart.js
• Responsive grid layout for all screen sizes
• Filter controls for date range selection
• Animated transitions on data updates

**How to Use:**
• Select date range from dropdown filters
• Click chart legends to toggle data series
• Hover over data points for detailed tooltips"

Bad Response (too wordy):
"So I've gone ahead and created this really cool dashboard for you. It's got a lot of features that I think you'll find useful. First of all, there are charts that update in real-time, which is pretty neat. I also made sure to add some filtering capabilities because I thought that would be important for analyzing the data..."`,
          },
          ...contextMessages,
        ],
        tools: [{ google_search_retrieval: {} }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger background tasks (fire and forget)
    (async () => {
      try {
        // Update cache
        await supabase.functions.invoke("cache-manager", {
          body: { sessionId, operation: "update" },
        });
        
        // Trigger summarization check
        await supabase.functions.invoke("summarize-conversation", {
          body: { sessionId },
        });
      } catch (bgError) {
        console.warn("Background task error:", bgError);
      }
    })();

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
