'use client';

import React from 'react';
import { Agent, AgentStatus, ThinkingState } from '@/types/agents';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  WifiOff
} from 'lucide-react';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showThinking?: boolean;
  showTooltip?: boolean;
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

interface ThinkingAnimationProps {
  thinkingState: ThinkingState;
  colors: Agent['personality']['colors'];
  size: 'sm' | 'md' | 'lg' | 'xl';
}

interface TypingAnimationProps {
  colors: Agent['personality']['colors'];
  size: 'sm' | 'md' | 'lg' | 'xl';
}

function getAvatarSize(size: AgentAvatarProps['size']) {
  switch (size) {
    case 'sm': return 'w-8 h-8';
    case 'md': return 'w-10 h-10';
    case 'lg': return 'w-12 h-12';
    case 'xl': return 'w-16 h-16';
    default: return 'w-10 h-10';
  }
}

function getFontSize(size: AgentAvatarProps['size']) {
  switch (size) {
    case 'sm': return 'text-sm';
    case 'md': return 'text-lg';
    case 'lg': return 'text-xl';
    case 'xl': return 'text-2xl';
    default: return 'text-lg';
  }
}

function getStatusIconSize(size: AgentAvatarProps['size']) {
  switch (size) {
    case 'sm': return 'w-2 h-2';
    case 'md': return 'w-3 h-3';
    case 'lg': return 'w-4 h-4';
    case 'xl': return 'w-5 h-5';
    default: return 'w-3 h-3';
  }
}

function StatusIndicator({ 
  status, 
  isTyping, 
  size = 'md',
  colors 
}: { 
  status: Agent['status'], 
  isTyping: boolean, 
  size: AgentAvatarProps['size'],
  colors: Agent['personality']['colors']
}) {
  const iconSize = getStatusIconSize(size);
  
  if (isTyping) {
    return (
      <div 
        className={cn(
          "absolute -top-1 -right-1 rounded-full flex items-center justify-center",
          size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-8 h-8' : 'w-6 h-6'
        )}
        style={{ backgroundColor: colors.primary }}
      >
        <div className="flex gap-0.5">
          <div 
            className="w-1 h-1 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="w-1 h-1 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className="w-1 h-1 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    );
  }
  
  const statusConfig: Record<AgentStatus, { icon: React.ComponentType<{className?: string}>; color: string; pulse: boolean }> = {
    active: { 
      icon: CheckCircle, 
      color: '#22c55e', 
      pulse: false 
    },
    busy: { 
      icon: Zap, 
      color: '#f59e0b', 
      pulse: true 
    },
    thinking: { 
      icon: Brain, 
      color: '#3b82f6', 
      pulse: true 
    },
    idle: { 
      icon: Clock, 
      color: '#6b7280', 
      pulse: false 
    },
    error: { 
      icon: AlertTriangle, 
      color: '#ef4444', 
      pulse: true 
    },
    offline: { 
      icon: WifiOff, 
      color: '#9ca3af', 
      pulse: false 
    },
    completed: { 
      icon: CheckCircle, 
      color: '#8b5cf6', 
      pulse: false 
    },
    processing: { 
      icon: Zap, 
      color: '#f97316', 
      pulse: true 
    },
    responding: { 
      icon: Brain, 
      color: '#06b6d4', 
      pulse: true 
    },
    collaborating: { 
      icon: CheckCircle, 
      color: '#ec4899', 
      pulse: true 
    },
    waiting: { 
      icon: Clock, 
      color: '#6366f1', 
      pulse: false 
    }
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div 
      className={cn(
        "absolute -top-1 -right-1 rounded-full p-1 border-2 border-background",
        size === 'sm' ? 'w-4 h-4 p-0.5' : size === 'xl' ? 'w-8 h-8 p-1.5' : 'w-6 h-6 p-1',
        config.pulse && 'animate-pulse'
      )}
      style={{ backgroundColor: config.color }}
    >
      <Icon className={cn(iconSize, "text-white")} />
    </div>
  );
}

function ThinkingAnimation({ thinkingState, colors, size }: ThinkingAnimationProps) {
  const progressSize = size === 'sm' ? 'w-10 h-10' : size === 'xl' ? 'w-20 h-20' : 'w-14 h-14';
  
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Progress circle */}
      <svg 
        className={cn(progressSize, "transform -rotate-90")}
        viewBox="0 0 36 36"
      >
        {/* Background circle */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={colors.background}
          strokeWidth="2"
        />
        {/* Progress circle */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray={`${thinkingState.progress}, 100`}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      
      {/* Thinking dots in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex gap-0.5">
          <div 
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ 
              backgroundColor: colors.primary,
              animationDelay: '0ms' 
            }}
          />
          <div 
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ 
              backgroundColor: colors.primary,
              animationDelay: '150ms' 
            }}
          />
          <div 
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ 
              backgroundColor: colors.primary,
              animationDelay: '300ms' 
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TypingAnimation({ colors, size }: TypingAnimationProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Pulsing ring */}
      <div 
        className={cn(
          "absolute rounded-full border-2 animate-ping",
          getAvatarSize(size)
        )}
        style={{ borderColor: colors.primary + '40' }}
      />
      
      {/* Typing indicator */}
      <div className="flex gap-1">
        <div 
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ 
            backgroundColor: colors.primary,
            animationDelay: '0ms' 
          }}
        />
        <div 
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ 
            backgroundColor: colors.primary,
            animationDelay: '150ms' 
          }}
        />
        <div 
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ 
            backgroundColor: colors.primary,
            animationDelay: '300ms' 
          }}
        />
      </div>
    </div>
  );
}

function AgentTooltip({ agent, children }: { agent: Agent, children: React.ReactNode }) {
  const formatLastActivity = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{agent.avatar}</span>
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
              </div>
            </div>
            
            <p className="text-sm">{agent.description}</p>
            
            <div className="flex items-center justify-between text-xs">
              <span>Messages: {agent.messageCount}</span>
              <span>Last: {formatLastActivity(agent.lastActivity)}</span>
            </div>
            
            {agent.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map(cap => (
                  <Badge key={cap} variant="outline" className="text-xs h-4 px-1">
                    {cap.replace(/-/g, ' ')}
                  </Badge>
                ))}
                {agent.capabilities.length > 3 && (
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    +{agent.capabilities.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {agent.thinkingState && (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="capitalize">{agent.thinkingState.phase}</span>
                  <span>{agent.thinkingState.progress}%</span>
                </div>
                {agent.thinkingState.currentTask && (
                  <p className="text-muted-foreground truncate">{agent.thinkingState.currentTask}</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AgentAvatar({
  agent,
  size = 'md',
  showStatus = true,
  showThinking = true,
  showTooltip = true,
  showName = false,
  className,
  onClick
}: AgentAvatarProps) {
  const { personality } = agent;
  const avatarSize = getAvatarSize(size);
  const fontSize = getFontSize(size);
  
  const avatarContent = (
    <div 
      className={cn(
        "relative inline-flex flex-col items-center gap-2",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar 
          className={cn(
            avatarSize,
            "border-2 transition-all duration-200",
            onClick && "hover:scale-105"
          )}
          style={{ 
            backgroundColor: personality.colors.background,
            borderColor: personality.colors.primary + '40'
          }}
        >
          <div 
            className={cn(
              "w-full h-full flex items-center justify-center font-medium",
              fontSize
            )}
            style={{ color: personality.colors.primary }}
          >
            {agent.avatar}
          </div>
        </Avatar>
        
        {/* Status indicator */}
        {showStatus && (
          <StatusIndicator 
            status={agent.status} 
            isTyping={agent.isTyping}
            size={size}
            colors={personality.colors}
          />
        )}
        
        {/* Thinking animation overlay */}
        {showThinking && agent.thinkingState && (
          <ThinkingAnimation 
            thinkingState={agent.thinkingState}
            colors={personality.colors}
            size={size}
          />
        )}
        
        {/* Typing animation overlay */}
        {agent.isTyping && !agent.thinkingState && (
          <TypingAnimation 
            colors={personality.colors}
            size={size}
          />
        )}
      </div>
      
      {/* Agent name */}
      {showName && (
        <div className="text-center">
          <p className="text-sm font-medium truncate max-w-20">{agent.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
        </div>
      )}
    </div>
  );
  
  if (showTooltip) {
    return (
      <AgentTooltip agent={agent}>
        {avatarContent}
      </AgentTooltip>
    );
  }
  
  return avatarContent;
}