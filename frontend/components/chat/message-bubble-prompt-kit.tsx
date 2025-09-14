"use client";

import React from 'react';
import { 
  Message, 
  MessageAvatar, 
  MessageContent, 
  MessageActions, 
  MessageAction 
} from '@/components/ui/message';
// Icons removed as they are not used in this component
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/api';

interface MessageBubblePromptKitProps {
  message: ChatMessage;
}

export function MessageBubblePromptKit({ message }: MessageBubblePromptKitProps) {
  // Rendering message bubble
  
  const isUser = message.role === 'user';
  const isAgent = message.isAgentResponse;
  const isResearchResult = message.isResearchResult;

  // Get appropriate avatar and styling based on message type
  const getAvatarProps = () => {
    if (isUser) {
      return {
        src: "/user-avatar.png",
        alt: "User",
        fallback: "U"
      };
    }
    
    if (isResearchResult) {
      return {
        src: "/ai-avatar.png",
        alt: "Research Complete",
        fallback: "✓"
      };
    }
    
    if (isAgent) {
      return {
        src: "/ai-avatar.png",
        alt: message.agentType ? `${message.agentType} Agent` : "AI Agent",
        fallback: "A"
      };
    }
    
    // Default assistant
    return {
      src: "/ai-avatar.png",
      alt: "AI Assistant",
      fallback: "AI"
    };
  };

  const getMessageStyling = () => {
    if (isUser) {
      return "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800";
    }
    
    if (isResearchResult) {
      return "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800";
    }
    
    if (isAgent) {
      return "bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800";
    }
    
    return "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800";
  };

  const avatarProps = getAvatarProps();

  return (
    <Message 
      className={cn(
        "w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )} 
      data-testid={isUser ? "user-message" : isAgent ? "agent-response" : "assistant-message"} 
      data-sender={message.role}
      data-message-type={isAgent ? 'agent' : isResearchResult ? 'research' : message.role}
    >
      {!isUser && (
        <MessageAvatar 
          src={avatarProps.src}
          alt={avatarProps.alt}
          fallback={avatarProps.fallback}
          className="mt-1 flex-shrink-0"
        />
      )}

      <div className={cn(
        "flex flex-col gap-2 max-w-[85%] sm:max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Agent/Message type header */}
        {(isAgent || isResearchResult) && !isUser && (
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {isResearchResult ? 'Research Complete' : 
             isAgent ? (message.agentType || 'AI Agent') : 
             'Assistant'}
          </div>
        )}
        
        <MessageContent 
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            getMessageStyling(),
            "rounded-lg p-3"
          )}
        >
          <div className="m-0 whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </MessageContent>
        
        <MessageActions className={cn(
          "text-xs",
          isUser ? "justify-end" : "justify-start"
        )}>
          <MessageAction tooltip="Message time">
            <span className="text-gray-500 dark:text-gray-400">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </MessageAction>
          {(isAgent || isResearchResult) && message.agentType && (
            <MessageAction tooltip="Agent type">
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">
                {message.agentType}
              </span>
            </MessageAction>
          )}
        </MessageActions>
      </div>

      {isUser && (
        <MessageAvatar 
          src={avatarProps.src}
          alt={avatarProps.alt}
          fallback={avatarProps.fallback}
          className="mt-1 flex-shrink-0"
        />
      )}
    </Message>
  );
}