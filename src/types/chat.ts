/**
 * Shared types for chat functionality
 * This prevents circular dependencies between hooks
 */

import { StructuredReasoning } from "./reasoning";
import { WebSearchResults } from "./webSearch";

export interface ChatMessage {
  id: string;
  session_id?: string; // Optional for guest sessions
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  reasoning_steps?: StructuredReasoning | null;
  search_results?: WebSearchResults | null;
  artifact_ids?: string[];
  token_count?: number;
  created_at: string;
}