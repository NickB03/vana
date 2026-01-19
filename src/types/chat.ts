/**
 * Shared types for chat functionality
 * This prevents circular dependencies between hooks
 */

import { StructuredReasoning } from "./reasoning";
import { WebSearchResults } from "./webSearch";

/** Artifact data stored with message for guest users (no DB persistence) */
export interface StoredArtifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  session_id?: string; // Optional for guest sessions
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  reasoning_steps?: StructuredReasoning | null;
  search_results?: WebSearchResults | null;
  artifact_ids?: string[] | null;
  /** Full artifact data for guest users (stored in localStorage, not DB) */
  artifacts?: StoredArtifact[] | null;
  token_count?: number;
  created_at: string;
}