import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGeminiFlashWithRetry, extractTextFromGeminiFlash, type OpenRouterMessage } from "../_shared/openrouter-client.ts";
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

  try {
    logger.request(req.method, '/generate-title');

    const requestBody = await req.json();
    const { message } = requestBody;

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.warn('authentication_failed', { reason: 'missing_auth_header' });
      return errors.unauthorized("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('authentication_failed', { reason: 'invalid_token' });
      return errors.unauthorized("Invalid or expired authentication token");
    }

    // Create child logger with user context
    const userLogger = logger.child({ userId: user.id });
    userLogger.info('title_generation_started', {
      messagePreview: message.substring(0, 50)
    });

    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content: "You are a title generator. Generate a short, concise title (max 6 words) for the conversation based on the user's first message. Return ONLY the title, nothing else."
      },
      {
        role: "user",
        content: message
      }
    ];

    const apiStartTime = Date.now();
    userLogger.aiCall('openrouter', 'gemini-flash', {
      messageCount: messages.length,
      temperature: 0.7,
      maxTokens: 50
    });

    const response = await callGeminiFlashWithRetry(messages, {
      temperature: 0.7,
      max_tokens: 50,
      requestId
    });

    const apiDuration = Date.now() - apiStartTime;

    if (!response.ok) {
      userLogger.externalApi('openrouter', '/chat/completions', response.status, apiDuration, {
        success: false
      });
      return await errors.apiError(response, "OpenRouter title generation");
    }

    const data = await response.json();
    const title = extractTextFromGeminiFlash(data).trim() || "New Chat";

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
      errorName: e?.name
    });

    const totalDuration = Date.now() - startTime;
    logger.response(500, totalDuration);

    return errors.internal(
      "An error occurred while generating the title",
      e instanceof Error ? e.message : "Unknown error"
    );
  }
});
