import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CachedContext {
  messages: Array<{
    role: string;
    content: string;
    reasoning?: string;
  }>;
  summary?: string;
  timestamp: number;
}

class RedisCache {
  private baseUrl: string;
  private token: string;

  constructor(url: string, token: string) {
    this.baseUrl = url;
    this.token = token;
  }

  private async execute(command: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    return response.json();
  }

  async get(key: string): Promise<CachedContext | null> {
    try {
      const result = await this.execute(['GET', key]);
      return result.result ? JSON.parse(result.result) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: CachedContext, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.execute(['SET', key, JSON.stringify(value), 'EX', ttlSeconds.toString()]);
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.execute(['DEL', key]);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, operation } = await req.json();
    
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

    const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!redisUrl || !redisToken) {
      return new Response(JSON.stringify({ error: "Redis not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cache = new RedisCache(redisUrl, redisToken);
    const cacheKey = `chat:${sessionId}`;

    if (operation === "get") {
      const cached = await cache.get(cacheKey);
      return new Response(JSON.stringify({ cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "invalidate") {
      await cache.delete(cacheKey);
      console.log(`Cache invalidated for session: ${sessionId}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "update") {
      // Fetch latest messages and summary from database
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("role, content, reasoning")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("conversation_summary")
        .eq("id", sessionId)
        .single();

      const context: CachedContext = {
        messages: messages || [],
        summary: session?.conversation_summary,
        timestamp: Date.now(),
      };

      await cache.set(cacheKey, context, 3600);
      console.log(`Cache updated for session: ${sessionId}`);
      
      return new Response(JSON.stringify({ success: true, context }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid operation" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Cache manager error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
