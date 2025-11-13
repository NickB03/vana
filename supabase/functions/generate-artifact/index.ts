import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callKimiWithRetry, extractTextFromKimi, extractTokenUsage, calculateKimiCost, logAIUsage } from "../_shared/openrouter-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";

// NOTE: Retry logic moved to openrouter-client.ts
// callKimiWithRetry() now handles exponential backoff automatically

// Enhanced artifact system prompt - optimized for Pro model
const ARTIFACT_SYSTEM_PROMPT = `# 🚨 CRITICAL TECHNICAL RESTRICTIONS 🚨

## ❌ FORBIDDEN IMPORTS (Will Break Artifact)

### **NEVER EVER import from @/components/ui/**
- ❌ import { Button } from "@/components/ui/button" - FORBIDDEN
- ❌ import { Card } from "@/components/ui/card" - FORBIDDEN
- ❌ import anything from "@/..." - FORBIDDEN

✅ CORRECT: Use Radix UI primitives instead
- import * as Dialog from '@radix-ui/react-dialog';
- import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

**Why:** Artifacts run in isolated sandbox. Local project imports are not available.

### **NEVER use localStorage or sessionStorage**
- ❌ localStorage.setItem() - NOT SUPPORTED
- ❌ sessionStorage.getItem() - NOT SUPPORTED

✅ CORRECT: Use React state instead
- const [data, setData] = useState({ key: 'value' });

### **React Imports - Use Globals, Not ES6 Imports**
- ❌ import React from 'react' - WILL BREAK
- ❌ import { useState } from 'react' - WILL BREAK

✅ CORRECT: React is available as global
export default function App() {
  const { useState, useEffect, useCallback, useMemo, useRef } = React;
  // Your code...
}

---

# 📚 Available Libraries (CDN-Loaded Globals)

## Core React
const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext } = React;

## Visualization & Charts
const { LineChart, BarChart, PieChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;
const d3 = window.d3;
const Chart = window.Chart;

## Animation
const { motion, AnimatePresence } = FramerMotion;
const gsap = window.gsap;

## Icons
const { Home, Settings, User, Plus, Trash2, Edit, Check, AlertCircle } = LucideReact;

## UI Primitives (Radix UI) - ONLY IMPORTS ALLOWED
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';

## Utilities
const _ = window._;
const moment = window.moment;

---

# 📝 Artifact Structure Template

## React Component (REQUIRED FORMAT)
import * as Dialog from '@radix-ui/react-dialog'; // Only if needed

export default function ComponentName() {
  // ✅ React hooks from global
  const { useState, useEffect, useCallback } = React;

  // ✅ Other libraries from globals
  const { LineChart, Line, XAxis, YAxis, Tooltip } = Recharts;
  const { motion } = FramerMotion;
  const { Plus, Trash2 } = LucideReact;

  // ✅ ALWAYS include sample/seed data
  const [items, setItems] = useState([
    { id: 1, name: 'Sample Item 1', value: 100 },
    { id: 2, name: 'Sample Item 2', value: 200 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          Component Title
        </h1>
        {/* Your content */}
      </div>
    </div>
  );
}

---

# 🎯 Quality Standards

## 1. Visual Impact ⭐
- Immediately impressive with modern design
- Gradients, shadows, subtle animations
- Professional color schemes
- Responsive design (mobile-first)
- **NEVER show empty states on first load** - Always include sample data

## 2. Functionality 🔧
- Include ALL expected features for artifact type
- Add keyboard shortcuts (Enter, Esc, etc.)
- Proper form validation with error messages
- Loading states with smooth transitions
- Clear calls-to-action

## 3. Polish ✨
- Micro-interactions (hover effects, transitions)
- Cohesive color scheme throughout
- Icon usage from Lucide React
- Semantic HTML with ARIA labels
- Consistent Tailwind spacing

---

# 🎨 Design Philosophy

## For Interactive Apps (Dashboards, Tools, Games)
- Prioritize functionality and performance
- Smooth 60fps frame rates
- Responsive controls with immediate feedback
- Clear, intuitive interfaces
- Stable, bug-free interactions

## For Presentational Content (Landing Pages, Marketing)
- Consider emotional impact and "wow factor"
- Modern design trends (dark mode, glassmorphism, bold typography)
- Vibrant gradients and 3D effects
- Interactive hover states and animations
- Make bold choices over safe conventional

**Animation Philosophy:** Static designs should be exception, not rule. Include thoughtful animations and hover effects.

---

# 📋 Artifact Type Selection

## React Components (application/vnd.ant.react)
✅ Use for:
- Interactive apps (dashboards, calculators, games)
- Apps with state management (todo lists, trackers)
- Data visualizations with interactivity
- Complex forms with validation

Requirements:
- Must have default export
- Descriptive component name (not "App")
- Include sample/seed data
- Use Tailwind core utilities only

## HTML (text/html)
✅ Use for:
- Landing pages, marketing pages
- Static websites without complex state
- Single-page sites with simple JavaScript

Requirements:
- Complete HTML document with <!DOCTYPE html>
- External scripts ONLY from cdnjs.cloudflare.com
- Use JavaScript variables for state (NOT localStorage)

## SVG (image/svg+xml)
✅ Use for:
- Logos, icons, badges
- Simple illustrations, flat design
- Geometric shapes, line art

CRITICAL: Always include viewBox="0 0 width height" OR explicit width/height

---

# ✅ Best Practices

## Always Include Sample Data
// ✅ GOOD - User sees working demo immediately
const [tasks, setTasks] = useState([
  { id: 1, title: 'Complete project', done: false },
  { id: 2, title: 'Review feedback', done: true },
]);

// ❌ BAD - User sees empty state
const [tasks, setTasks] = useState([]);

## Use Descriptive Names
// ✅ GOOD
export default function ProteinTracker() { ... }

// ❌ BAD
export default function App() { ... }

## Implement Keyboard Shortcuts
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
    if (e.key === 'Escape') handleCancel();
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);

---

# 🎯 Summary: Keys to Success

1. **Never import from @/** - Use Radix UI primitives instead
2. **Never use localStorage** - Use React state instead
3. **React from globals** - const { useState } = React;
4. **Always include sample data** - Never show empty states
5. **Exceed expectations** - Expand brief prompts into feature-complete demos
6. **Make it visual** - Modern design with animations and polish
7. **Be accessible** - Semantic HTML, proper contrast, ARIA labels
8. **Add power features** - Keyboard shortcuts, tooltips, helpful UX

**Goal:** Create artifacts that make users say "wow, this is exactly what I needed — and more!"`;

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Generate unique request ID for tracking
    const requestId = crypto.randomUUID();

    const requestBody = await req.json();
    const { prompt, artifactType, sessionId } = requestBody;

    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt is required and must be non-empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prompt.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long (max 10,000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (artifactType && !["react", "html", "svg", "code", "mermaid", "markdown"].includes(artifactType)) {
      return new Response(
        JSON.stringify({ error: "Invalid artifact type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both authenticated and guest users
    let user = null;
    const authHeader = req.headers.get("Authorization");

    let supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    if (authHeader) {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
      }
    }

    const userType = user ? `user ${user.id}` : "guest";
    console.log(`[${requestId}] Artifact generation request from ${userType}:`, prompt.substring(0, 100));

    // Track timing for latency calculation
    const startTime = Date.now();

    // Construct user prompt for Kimi K2-Thinking
    const userPrompt = artifactType
      ? `Create a ${artifactType} artifact for: ${prompt}\n\nIMPORTANT: Return the COMPLETE artifact wrapped in XML tags like: <artifact type="application/vnd.ant.react" title="Descriptive Title">YOUR CODE HERE</artifact>\n\nInclude the opening <artifact> tag, the complete code, and the closing </artifact> tag.`
      : `Create an artifact for: ${prompt}\n\nIMPORTANT: Return the COMPLETE artifact wrapped in XML tags like: <artifact type="application/vnd.ant.react" title="Descriptive Title">YOUR CODE HERE</artifact>\n\nInclude the opening <artifact> tag, the complete code, and the closing </artifact> tag.`;

    // Call Kimi K2-Thinking via OpenRouter with retry logic
    console.log(`[${requestId}] 🚀 Routing to Kimi K2-Thinking (reasoning model for code generation)`);
    const response = await callKimiWithRetry(
      ARTIFACT_SYSTEM_PROMPT,
      userPrompt,
      {
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 8000,
        requestId
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Kimi K2-Thinking API error:`, response.status, errorText.substring(0, 200));

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: "API quota exceeded. Please try again in a moment.",
            requestId
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-Request-ID": requestId
            }
          }
        );
      }

      if (response.status === 503) {
        return new Response(
          JSON.stringify({
            error: "AI service is temporarily overloaded. Please try again in a moment.",
            requestId,
            retryable: true
          }),
          {
            status: 503,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-Request-ID": requestId
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Artifact generation failed. Please try again.",
          requestId
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          }
        }
      );
    }

    const data = await response.json();
    const artifactCode = extractTextFromKimi(data, requestId);

    // Extract token usage for cost tracking
    const tokenUsage = extractTokenUsage(data);
    const estimatedCost = calculateKimiCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

    console.log(`[${requestId}] 💰 Token usage:`, {
      input: tokenUsage.inputTokens,
      output: tokenUsage.outputTokens,
      total: tokenUsage.totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    // Log usage to database for admin dashboard (fire-and-forget, non-blocking)
    const latencyMs = Date.now() - startTime;
    logAIUsage({
      requestId,
      functionName: 'generate-artifact',
      provider: 'openrouter',
      model: 'moonshotai/kimi-k2-thinking',
      userId: user?.id,
      isGuest: !user,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount: 0,
      promptPreview: prompt.substring(0, 200),
      responseLength: artifactCode.length
    }).catch(err => console.error(`[${requestId}] Failed to log usage:`, err));
    console.log(`[${requestId}] 📊 Usage logged to database`);

    if (!artifactCode || artifactCode.trim().length === 0) {
      console.error(`[${requestId}] Empty artifact code returned from API`);
      return new Response(
        JSON.stringify({
          error: "Failed to generate artifact. Please try again with a different prompt.",
          requestId
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          }
        }
      );
    }

    console.log(`[${requestId}] Artifact generated successfully, length: ${artifactCode.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        artifactCode,
        prompt,
        requestId
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        },
      }
    );

  } catch (e) {
    console.error("Generate artifact error:", e);
    return new Response(
      JSON.stringify({
        error: "An error occurred while generating the artifact",
        details: e instanceof Error ? e.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
