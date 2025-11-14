import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if user is admin (adjust this check based on your admin setup)
    const isAdmin = user.email === 'nick@vana.bot' ||
                    user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const metric = url.searchParams.get("metric") || "overview";
    const days = parseInt(url.searchParams.get("days") || "30");

    let data;

    switch (metric) {
      case "overview": {
        // Get summary statistics
        const { data: overview } = await supabase.rpc("get_usage_overview", {
          p_days: days
        });
        data = overview;
        break;
      }

      case "daily": {
        // Daily summary from view
        const { data: daily } = await supabase
          .from("ai_usage_daily_summary")
          .select("*")
          .gte("day", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order("day", { ascending: false });
        data = daily;
        break;
      }

      case "hourly": {
        // Hourly data for real-time monitoring
        const { data: hourly } = await supabase
          .from("ai_usage_hourly_summary")
          .select("*")
          .order("hour", { ascending: false })
          .limit(168); // Last 7 days
        data = hourly;
        break;
      }

      case "costs": {
        // Cost breakdown by function
        const { data: costs } = await supabase
          .from("ai_cost_by_function")
          .select("*")
          .order("total_cost", { ascending: false });
        data = costs;
        break;
      }

      case "errors": {
        // Error analysis
        const { data: errors } = await supabase
          .from("ai_error_analysis")
          .select("*")
          .order("hour", { ascending: false })
          .limit(100);
        data = errors;
        break;
      }

      case "performance": {
        // Performance trends
        const { data: perf } = await supabase
          .from("ai_performance_trends")
          .select("*")
          .order("hour", { ascending: false })
          .limit(168);
        data = perf;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid metric" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Admin analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
