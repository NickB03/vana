import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  created_at: string;
}

export function useChatMessages(sessionId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  const fetchMessages = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      }));
      
      setMessages(typedData);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const saveMessage = async (
    role: "user" | "assistant",
    content: string,
    reasoning?: string
  ) => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role,
          content,
          reasoning,
        })
        .select()
        .single();

      if (error) throw error;

      const typedMessage: ChatMessage = {
        ...data,
        role: data.role as "user" | "assistant"
      };

      setMessages((prev) => [...prev, typedMessage]);
      return typedMessage;
    } catch (error: any) {
      console.error("Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });
    }
  };

  const streamChat = async (
    userMessage: string,
    onDelta: (chunk: string) => void,
    onDone: () => void
  ) => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      // Save user message
      await saveMessage("user", userMessage);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messages
              .concat([{ role: "user", content: userMessage } as ChatMessage])
              .map((m) => ({ role: m.role, content: m.content })),
            sessionId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as
              | string
              | undefined;
            if (content) {
              fullResponse += content;
              onDelta(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      await saveMessage("assistant", fullResponse);
      onDone();
    } catch (error: any) {
      console.error("Stream error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
      onDone();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    streamChat,
    saveMessage,
  };
}
