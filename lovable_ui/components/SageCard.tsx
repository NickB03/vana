import React from "react";
import Markdown from "react-markdown";
import { MemoryTag } from "./MemoryTag";
import { PromptDebug } from "./PromptDebug";

interface Props {
  prompt: string;
  response: string;
  context: string;
  agent: string;
  summary: string;
  userId: string;
  projectId: string;
  actionType: string;
  timestamp: string;
  fullPrompt?: string;
}

export const SageCard = ({
  prompt,
  response,
  context,
  agent,
  summary,
  userId,
  projectId,
  actionType,
  timestamp,
  fullPrompt
}: Props) => {
  return (
    <div className=\"bg-white shadow-md rounded-2xl p-6 space-y-4\">
      <div className=\"text-sm text-muted-foreground flex justify-between\">
        <span><strong>{agent}</strong> – {summary}</span>
        <span>{timestamp}</span>
      </div>
      <div className=\"text-sm text-muted-foreground\">
        <span>User: {userId}</span> — <span>Project: {projectId}</span> ∔ <span>Action: {actionType}</span>
      </div>