import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { generateTitle } from "../_shared/gemini-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { createLogger } from "../_shared/logger.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const requestId = crypto.randomUUID();
  const errors = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);
  const startTime = Date.now();
  const logger = createLogger({ requestId, functionName: 'generate-title' });

  // Declare outside try block so it's accessible in catch
  let requestBody: { message?: string } | undefined;

  try {
    logger.request(req.method, '/generate-title');

    requestBody = await req.json();
    const { message } = requestBody || {};

    logger.debug('request_received', {
      messageType: typeof message,
      messageLength: message?.length,
      hasMessage: !!message
    });

    // Input validation
    if (!message || typeof message !== "string") {
      logger.validationError('message', 'invalid_type', {
        expectedType: 'string',
        receivedType: typeof message
      });
      return errors.validation(
        "Invalid message format",
        `Expected string, got ${typeof message}: ${JSON.stringify(message)?.substring(0, 100)}`
      );
    }

    if (message.trim().length === 0) {
      logger.validationError('message', 'empty_content');
      return errors.validation("Message cannot be empty");
    }

    if (message.length > 10000) {
      logger.validationError('message', 'content_too_long', {
        length: message.length,
        maxLength: 10000
      });
      return errors.validation(
        "Message too long",
        `Length: ${message.length}, max: 10000`
      );
    }

    // Support both authenticated and guest users (similar to generate-image function)
    let user = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      // Authenticated user - verify token
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
      }
    }

    // Create logger with optional user context
    const userLogger = user ? logger.child({ userId: user.id }) : logger;
    userLogger.info('title_generation_started', {
      isGuest: !user,
      messagePreview: message.substring(0, 50)
    });

    const apiStartTime = Date.now();
    userLogger.aiCall('openrouter', 'gemini-2.5-flash-lite', {
      temperature: 0.7,
      maxTokens: 50
    });

    const title = await generateTitle(message, requestId);

    const apiDuration = Date.now() - apiStartTime;

    userLogger.info('title_generated', {
      title,
      titleLength: title.length,
      apiDurationMs: apiDuration
    });

    const totalDuration = Date.now() - startTime;
    userLogger.response(200, totalDuration, {
      titleLength: title.length
    });

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
    });
  } catch (e) {
    logger.error('title_generation_failed', e as Error, {
      hasMessage: !!requestBody?.message,
      errorName: (e as Error)?.name
    });

    const totalDuration = Date.now() - startTime;
    logger.response(500, totalDuration);

    return errors.internal(
      "An error occurred while generating the title",
      e instanceof Error ? e.message : "Unknown error"
    );
  }
});
