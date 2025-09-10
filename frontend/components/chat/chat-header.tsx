"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Settings, 
  History, 
  HelpCircle, 
  Zap,
  Brain,
  Clock
} from 'lucide-react';
import { SSEConnectionStatus } from '@/types/chat';

interface ChatHeaderProps {
  connectionStatus?: SSEConnectionStatus;
  sessionCount?: number;
  isProcessing?: boolean;
  onSettingsClick?: () => void;
  onHistoryClick?: () => void;
  onHelpClick?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ChatHeader({
  connectionStatus = 'disconnected',
  sessionCount = 0,
  isProcessing = false,
  onSettingsClick,
  onHistoryClick,
  onHelpClick,
  onConnect,
  onDisconnect
}: ChatHeaderProps) {
  const getConnectionBadge = () => {
    const variants = {
      connected: 'default' as const,
      connecting: 'secondary' as const,
      reconnecting: 'secondary' as const,
      disconnected: 'destructive' as const,
      error: 'destructive' as const,
    };

    const labels = {
      connected: 'Connected',
      connecting: 'Connecting...',
      reconnecting: 'Reconnecting...',
      disconnected: 'Disconnected',
      error: 'Connection Error',
    };

    return (
      <Badge variant={variants[connectionStatus]} className="text-xs">
        {labels[connectionStatus]}
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Connection Status Bar */}
      <Card className="mb-6 p-3 minimal-surface bg-chat-surface border-chat-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <Button
                variant="ghost"
                size="sm"
                onClick={connectionStatus === 'disconnected' ? onConnect : onDisconnect}
                className="p-1 h-auto"
              >
                {getConnectionBadge()}
              </Button>
            </div>
            
            {sessionCount > 0 && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <History className="w-3 h-3" />
                  <span>{sessionCount} sessions</span>
                </div>
              </>
            )}

            {isProcessing && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Brain className="w-3 h-3 animate-pulse" />
                  <span>AI thinking...</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={onHistoryClick}
                    className="h-8 w-8 p-0"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View chat history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={onSettingsClick}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={onHelpClick}
                    className="h-8 w-8 p-0"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help & Documentation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      {/* Main Header Content */}
      <div className="text-center space-y-6 py-8">
        {/* Avatar and Branding */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              V
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Hi, I&apos;m <span className="text-primary">Vana</span>
            </h1>
            <p className="text-text-secondary text-base md:text-lg max-w-md mx-auto">
              Your AI research assistant. I can help you explore complex topics and generate comprehensive reports.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Real-time research</span>
          </div>
          
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Brain className="w-4 h-4 text-blue-500" />
            <span>Multi-agent analysis</span>
          </div>
          
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="w-4 h-4 text-green-500" />
            <span>Comprehensive reports</span>
          </div>
        </div>

        {/* Getting Started Hint */}
        <Card className="max-w-md mx-auto p-4 bg-muted border-dashed minimal-transition">
          <p className="text-sm text-text-secondary text-center">
            💡 <strong>Getting started?</strong> Try asking me about a topic you&apos;d like to research, 
            and I&apos;ll coordinate multiple AI agents to create a detailed report for you.
          </p>
        </Card>
      </div>
    </div>
  );
}