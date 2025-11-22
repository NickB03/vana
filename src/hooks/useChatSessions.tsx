import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatSession {
  id: string;
  title: string;
  first_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (firstMessage: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to start a chat",
          variant: "destructive",
        });
        return null;
      }

      // Create session with temporary title
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: "New Chat...",
          first_message: firstMessage,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Generate title in background
      generateTitle(session.id, firstMessage);

      setSessions((prev) => [session, ...prev]);
      return session.id;
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create chat session",
        variant: "destructive",
      });
      return null;
    }
  };

  const generateTitle = async (sessionId: string, message: string) => {
    try {
      console.log("[generateTitle] Calling with message:", typeof message, message?.substring(0, 100));

      const { data, error } = await supabase.functions.invoke("generate-title", {
        body: { message },
      });

      if (error) {
        console.error("[generateTitle] Error from Edge Function:", error);
        throw error;
      }

      const title = data.title;

      // Update session with generated title
      const { error: updateError } = await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      // Update local state
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
    } catch (error: any) {
      console.error("Error generating title:", error);
      // Silently fail - keep temporary title
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({
        title: "Session deleted",
        description: "Chat session has been removed",
      });
    } catch (error: any) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  return {
    sessions,
    isLoading,
    createSession,
    deleteSession,
    refreshSessions: fetchSessions,
  };
}

