// Example: Kibo/Shadcn UI Integration with Pure ADK

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';

interface AgentEvent {
  type: 'thinking' | 'content' | 'tool_use' | 'error' | 'done';
  content?: string;
  toolName?: string;
  agentName?: string;
}

export function VANAChat() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<AgentEvent[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const userId = `user_${Date.now()}`;
    const response = await fetch(`/apps/vana/users/${userId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: `session_${Date.now()}` })
    });
    const session = await response.json();
    setSessionId(session.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setThinking([]);

    try {
      const response = await fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: 'vana',
          userId: 'user123',
          sessionId: sessionId,
          newMessage: {
            parts: [{ text: userMessage }],
            role: 'user'
          },
          streaming: true
        })
      });

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle different event types from ADK
              if (data.event_type === 'agent_response') {
                assistantMessage += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  } else {
                    newMessages.push({ role: 'assistant', content: assistantMessage });
                  }
                  return newMessages;
                });
              } else if (data.event_type === 'tool_use') {
                setThinking(prev => [...prev, {
                  type: 'tool_use',
                  toolName: data.tool_name,
                  content: `Using ${data.tool_name}...`
                }]);
              } else if (data.event_type === 'agent_delegation') {
                setThinking(prev => [...prev, {
                  type: 'thinking',
                  agentName: data.agent_name,
                  content: `Delegating to ${data.agent_name}...`
                }]);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
      setThinking([]);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {messages.map((msg, i) => (
            <Card key={i} className={`mb-4 p-4 ${msg.role === 'user' ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'}`}>
              <p className="text-sm font-semibold mb-1">{msg.role === 'user' ? 'You' : 'VANA'}</p>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </Card>
          ))}
          {loading && (
            <Card className="mr-auto max-w-[80%] p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Card>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask VANA anything..."
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Thinking Panel */}
      {thinking.length > 0 && (
        <div className="w-80 border-l p-4 bg-muted/50">
          <h3 className="font-semibold mb-4">Thinking Process</h3>
          <div className="space-y-2">
            {thinking.map((event, i) => (
              <Card key={i} className="p-3 text-sm">
                {event.agentName && <p className="font-medium">{event.agentName}</p>}
                {event.toolName && <p className="text-muted-foreground">Tool: {event.toolName}</p>}
                <p>{event.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Usage in your app:
// <VANAChat />