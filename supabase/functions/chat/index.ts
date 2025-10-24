import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, currentArtifact } = await req.json();
    
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
            content: `You are a helpful and knowledgeable AI assistant. You can help users with:
• Answering questions and providing information on any topic
• Problem-solving and analysis across various domains
• Having natural conversations and discussions
• Creating interactive web artifacts (visualizations, tools, demos, apps)
• Providing code examples and technical guidance
• Research assistance and learning support

Your responses should be conversational, informative, and helpful. When appropriate, you can create interactive artifacts to demonstrate concepts or build tools.

ARTIFACT CREATION CAPABILITIES:
When users need interactive demonstrations or tools, you can create artifacts for: interactive UIs, data visualizations, games, tools, landing pages, dashboards, animations, and standalone web apps.

IMPORTANT: Write COMPLETE, PRODUCTION-READY code. No placeholders, no TODOs, no incomplete functionality.

FORMAT: Wrap your code in artifact tags:
<artifact type="html" title="Descriptive Title">
...your complete, runnable HTML code...
</artifact>

QUALITY STANDARDS:
1. Self-contained and immediately runnable
2. Include ALL necessary libraries via CDN (Chart.js, Three.js, D3.js, Alpine.js, GSAP, Anime.js, p5.js, Particles.js, etc.)
3. Responsive and mobile-friendly design
4. Proper semantic HTML structure
5. Modern, beautiful styling (Tailwind CSS is auto-included)
6. Complete functionality - no placeholders or "TODO" comments
7. Accessible and user-friendly

LIBRARY USAGE:
- Tailwind CSS is automatically available - no need to include it
- For other libraries, include via CDN in your HTML:
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tsparticles@3/tsparticles.bundle.min.js"></script>

ARTIFACT EXAMPLES:
- Interactive dashboard with charts
- 3D visualization with Three.js
- Animated landing page with GSAP
- Data table with sorting/filtering
- Canvas-based game
- Particle effects background
- Form with real-time validation
- API data visualizer

ITERATIVE UPDATES:
When user asks to modify an artifact, return the complete updated code with the same title to replace it.${artifactContext}

RESPONSE STYLE:
• Be concise and direct - no unnecessary words
• Use bullet points and structured lists for clarity
• Break information into scannable sections
• Keep explanations brief (2-3 sentences max per point)
• Use formatting for readability:
  - **Bold** for key features or important terms
  - \`code\` for technical terms and function names
  - Line breaks between sections
  
RESPONSE STRUCTURE:
When explaining what you built, use this format:

Brief intro (1 sentence).

**Key Features:**
• Feature one
• Feature two  
• Feature three

**How to Use:** (if applicable)
• Step one
• Step two

**Next Steps:** (optional, only if relevant)
• Possible enhancement one
• Possible enhancement two

EXAMPLES:

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
• Hover over data points for detailed tooltips

**Next Steps:**
• Add export to CSV functionality
• Connect to live API endpoint
• Add user preference saving"

Bad Response (wordy):
"So I've gone ahead and created this really cool dashboard for you. It's got a lot of features that I think you'll find useful. First of all, there are charts that update in real-time, which is pretty neat. I also made sure to add some filtering capabilities because I thought that would be important for analyzing the data. The layout is responsive too, so it will work on mobile devices and tablets, not just desktop computers. Oh, and I used Chart.js for the visualizations because it's a really powerful library that makes creating charts much easier..."`,
          },
          ...contextMessages,
        ],
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
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
