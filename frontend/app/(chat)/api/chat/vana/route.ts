import { auth } from '@/app/(auth)/auth';
import { getChatById, saveChat, saveMessages } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

interface VanaRequest {
  id: string;
  message: ChatMessage;
  selectedVisibilityType: VisibilityType;
  vanaOptions?: {
    agents?: string[];
    model?: string;
    enableProgress?: boolean;
  };
}

interface VanaResponse {
  task_id: string;
  message_id: string;
  status: 'started' | 'error';
  stream_url: string;
}

/**
 * POST /api/chat/vana
 * Initialize a chat session with Vana backend
 */
export async function POST(request: Request) {
  try {
    const requestBody: VanaRequest = await request.json();
    const { id, message, selectedVisibilityType, vanaOptions = {} } = requestBody;

    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if chat exists, create if not
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    // Save user message to database
    await saveMessages({
      messages: [{
        chatId: id,
        id: message.id,
        role: 'user',
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      }],
    });

    // Forward request to Vana backend
    const vanaBaseUrl = process.env.VANA_BASE_URL || 'http://localhost:8000';
    
    try {
      const vanaResponse = await fetch(`${vanaBaseUrl}/chat/${id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id,
          'X-Session-ID': id,
        },
        body: JSON.stringify({
          message: message.parts.find(part => part.type === 'text')?.text || '',
          message_id: message.id,
          model: vanaOptions.model || 'gemini-pro',
          agents: vanaOptions.agents || [],
          enable_progress: vanaOptions.enableProgress ?? true,
          metadata: {
            role: message.role,
            created_at: new Date().toISOString(),
            user_id: session.user.id,
            chat_id: id,
          },
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!vanaResponse.ok) {
        const errorText = await vanaResponse.text();
        console.error('Vana backend error:', errorText);
        return new ChatSDKError('external_service:vana').toResponse();
      }

      const vanaData = await vanaResponse.json();
      
      const response: VanaResponse = {
        task_id: vanaData.task_id,
        message_id: message.id,
        status: 'started',
        stream_url: `/api/chat/vana/${id}/stream?task_id=${vanaData.task_id}`,
      };

      return Response.json(response, { status: 200 });

    } catch (error) {
      console.error('Failed to communicate with Vana backend:', error);
      
      // Fallback: Return error but allow client to retry with Vercel AI
      return Response.json({
        error: 'vana_unavailable',
        message: 'Vana backend is currently unavailable',
        fallback_to_vercel: true,
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Vana API error:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('internal:api').toResponse();
  }
}

/**
 * GET /api/chat/vana/status
 * Check Vana backend availability
 */
export async function GET(request: Request) {
  const vanaBaseUrl = process.env.VANA_BASE_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${vanaBaseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return Response.json({
      available: response.ok,
      status: response.status,
      url: vanaBaseUrl,
    });

  } catch (error) {
    return Response.json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      url: vanaBaseUrl,
    });
  }
}