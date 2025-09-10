"use client";

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown,
  MoreVertical,
  Clock,
  Brain,
  User,
  Zap,
  ExternalLink,
  Download,
  Share
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentType } from '../../src/types/chat';

// Define ChatMessage interface directly since it's not in the types file yet
interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'agent' | 'system' | 'result';
  timestamp: Date;
  agentType?: AgentType;
  metadata?: {
    confidence?: number;
    sources?: number;
    processingTime?: number;
  };
}

interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
  showTimestamp?: boolean;
  showAgent?: boolean;
  onCopy?: (content: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onShare?: (messageId: string) => void;
  onDownload?: (messageId: string) => void;
}

export function ChatMessage({
  message,
  isLoading = false,
  showTimestamp = true,
  showAgent = true,
  onCopy,
  onFeedback,
  onShare,
  onDownload,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isAgent = message.type === 'agent';
  const isResult = message.type === 'result';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    setFeedbackGiven(feedback);
    onFeedback?.(message.id, feedback);
  };

  const getAgentIcon = (agentType?: AgentType) => {
    const icons = {
      team_leader: '🎯',
      plan_generator: '📋',
      section_planner: '🗂️',
      section_researcher: '🔍',
      enhanced_search: '🌐',
      research_evaluator: '📊',
      escalation_checker: '⚠️',
      report_writer: '📝',
    };
    return agentType ? icons[agentType] || '🤖' : '🤖';
  };

  const getAgentColor = (agentType?: AgentType) => {
    const colors = {
      team_leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      plan_generator: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      section_planner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      section_researcher: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      enhanced_search: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      research_evaluator: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      escalation_checker: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      report_writer: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return agentType ? colors[agentType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar className={cn(
          "w-8 h-8 border-2",
          isUser ? "border-primary/20" : "border-border"
        )}>
          <AvatarFallback className={cn(
            "text-sm font-medium",
            isUser ? "bg-primary/10 text-primary" : "bg-muted text-text-secondary"
          )}>
            {isUser ? <User className="w-4 h-4" /> : 
             isSystem ? '⚙️' :
             isResult ? <Zap className="w-4 h-4" /> :
             getAgentIcon(message.agentType)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[85%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Header with sender and timestamp */}
        {(showAgent || showTimestamp) && (
          <div className={cn(
            "flex items-center gap-2 text-xs text-text-secondary",
            isUser ? "justify-end flex-row-reverse" : "justify-start"
          )}>
            {showAgent && !isUser && message.agentType && (
              <Badge variant="secondary" className={cn("text-xs px-2 py-0.5", getAgentColor(message.agentType))}>
                {getAgentIcon(message.agentType)} {message.agentType?.replace('_', ' ')}
              </Badge>
            )}
            {showTimestamp && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimestamp(message.timestamp)}</span>
              </div>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <Card
          ref={messageRef}
          className={cn(
            "relative p-4 shadow-sm minimal-transition",
            isUser 
              ? "bg-chat-bubble-user text-primary-foreground border-primary/20" 
              : isSystem
              ? "bg-muted border-dashed border-border"
              : isResult
              ? "bg-success-50 border-success-500/30 text-text-primary"
              : "bg-chat-bubble-assistant border-chat-border text-text-primary",
            "group-hover:shadow-md"
          )}
        >
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-text-secondary">
                {isAgent ? `${message.agentType?.replace('_', ' ')} is thinking...` : 'Processing...'}
              </span>
            </div>
          )}

          {/* Message content */}
          {!isLoading && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              
              {/* Metadata for agent/result messages */}
              {(isAgent || isResult) && message.metadata && (
                <div className="mt-3 pt-3 border-t border-chat-border">
                  <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                    {message.metadata.confidence && (
                      <span>Confidence: {Math.round(message.metadata.confidence * 100)}%</span>
                    )}
                    {message.metadata.sources && (
                      <span>{message.metadata.sources} sources</span>
                    )}
                    {message.metadata.processingTime && (
                      <span>{message.metadata.processingTime}ms</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isLoading && !isUser && (
            <div className={cn(
              "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-surface rounded-md p-1 border border-border"
            )}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 w-6 p-0"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? 'Copied!' : 'Copy message'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('positive')}
                      className={cn(
                        "h-6 w-6 p-0",
                        feedbackGiven === 'positive' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      )}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Helpful</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('negative')}
                      className={cn(
                        "h-6 w-6 p-0",
                        feedbackGiven === 'negative' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      )}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Not helpful</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isResult && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onShare?.(message.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Share className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share result</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload?.(message.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download report</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}