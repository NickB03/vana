'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Agent, 
  AgentStatus,
  AgentAnimationConfig
} from '@/types/agents';


interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showBadge?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  onClick?: (agent: Agent) => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: 'bg-purple-500 animate-ping',
  idle: 'bg-gray-500',
  busy: 'bg-blue-500 animate-spin',
  thinking: 'bg-yellow-500 animate-pulse',
  offline: 'bg-gray-300',
  error: 'bg-red-500 animate-shake',
  completed: 'bg-green-500 animate-bounce',
  processing: 'bg-orange-500 animate-spin',
  responding: 'bg-cyan-500 animate-pulse',
  collaborating: 'bg-pink-500 animate-ping',
  waiting: 'bg-indigo-500 animate-bounce'
};

const getAnimationConfig = (status: AgentStatus): AgentAnimationConfig => {
  const configs: Record<AgentStatus, AgentAnimationConfig> = {
    active: { state: 'glow', duration: 1200, intensity: 'high', color_shift: true },
    idle: { state: 'fade', duration: 2000, intensity: 'low' },
    busy: { state: 'rotate', duration: 2000, intensity: 'high' },
    thinking: { state: 'pulse', duration: 1500, intensity: 'medium', color_shift: true },
    offline: { state: 'none', duration: 0, intensity: 'low' },
    error: { state: 'shake', duration: 500, intensity: 'high' },
    completed: { state: 'bounce', duration: 800, intensity: 'medium' },
    processing: { state: 'rotate', duration: 1800, intensity: 'medium' },
    responding: { state: 'pulse', duration: 1000, intensity: 'low' },
    collaborating: { state: 'glow', duration: 1400, intensity: 'medium', color_shift: true },
    waiting: { state: 'fade', duration: 3000, intensity: 'low' }
  };
  
  return configs[status];
};

export function AgentAvatar({ 
  agent, 
  size = 'md',
  showStatus = true,
  showBadge = true, 
  showTooltip = true,
  animated = true,
  onClick,
  className 
}: AgentAvatarProps) {
  
  const animationConfig = useMemo(() => 
    animated ? getAnimationConfig(agent.status) : { state: 'none' as const, duration: 0, intensity: 'low' as const },
    [agent.status, animated]
  );

  const avatarClasses = cn(
    SIZE_CLASSES[size],
    'relative cursor-pointer transition-all duration-300 hover:scale-105',
    // Animation classes based on status
    animated && {
      'animate-pulse': animationConfig.state === 'pulse',
      'animate-bounce': animationConfig.state === 'bounce', 
      'animate-spin': animationConfig.state === 'rotate',
      'animate-ping': agent.status === 'active',
      'animate-shake': animationConfig.state === 'shake',
      'opacity-60': animationConfig.state === 'fade'
    },
    className
  );

  const avatarContent = (
    <div 
      className={avatarClasses}
      onClick={() => onClick?.(agent)}
      style={{
        animationDuration: animated ? `${animationConfig.duration}ms` : undefined
      }}
    >
      {/* Main Avatar */}
      <Avatar className={cn(SIZE_CLASSES[size], "border-2", {
        'border-blue-400': true,
        'ring-2 ring-blue-400 ring-opacity-50': agent.status === 'busy',
        'ring-2 ring-green-400 ring-opacity-50': agent.status === 'completed',
        'ring-2 ring-purple-400 ring-opacity-50': agent.status === 'active',
        'ring-2 ring-yellow-400 ring-opacity-50': agent.status === 'thinking',
        'ring-2 ring-red-400 ring-opacity-50': agent.status === 'error'
      })}>
        <div 
          className={cn(
            "w-full h-full rounded-full flex items-center justify-center text-white font-semibold",
            'bg-blue-500',
            {
              'bg-gradient-to-br from-blue-400 to-blue-600': agent.status === 'busy',
              'bg-gradient-to-br from-green-400 to-green-600': agent.status === 'completed',
              'bg-gradient-to-br from-purple-400 to-purple-600': agent.status === 'active',
              'bg-gradient-to-br from-yellow-400 to-yellow-600': agent.status === 'thinking'
            }
          )}
        >
          {agent.avatar ? (
            <Image 
              src={agent.avatar} 
              alt={agent.name}
              width={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
              height={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className={size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'}>
              {agent.personality.emoji}
            </span>
          )}
        </div>
      </Avatar>

      {/* Status Indicator */}
      {showStatus && (
        <div 
          className={cn(
            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
            STATUS_COLORS[agent.status]
          )}
        />
      )}

      {/* Activity Badge */}
      {showBadge && !['idle', 'offline'].includes(agent.status) && (
        <div className="absolute -top-2 -right-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs px-1 py-0 animate-pulse",
              {
                'bg-yellow-100 text-yellow-800': agent.status === 'thinking',
                'bg-blue-100 text-blue-800': agent.status === 'busy',
                'bg-green-100 text-green-800': agent.status === 'completed',
                'bg-purple-100 text-purple-800': agent.status === 'active',
                'bg-orange-100 text-orange-800': agent.status === 'offline' || agent.status === 'processing',
                'bg-cyan-100 text-cyan-800': agent.status === 'responding',
                'bg-pink-100 text-pink-800': agent.status === 'collaborating',
                'bg-indigo-100 text-indigo-800': agent.status === 'waiting',
                'bg-red-100 text-red-800': agent.status === 'error',
                'bg-gray-100 text-gray-800': agent.status === 'idle'
              }
            )}
          >
            {agent.status === 'thinking' && '💭'}
            {agent.status === 'busy' && '⚙️'}
            {agent.status === 'processing' && '⚙️'}
            {agent.status === 'responding' && '💬'}
            {agent.status === 'collaborating' && '🤝'}
            {agent.status === 'waiting' && '⏳'}
            {agent.status === 'active' && '💬'}
            {agent.status === 'completed' && '✅'}
            {agent.status === 'offline' && '📴'}
            {agent.status === 'error' && '⚠️'}
          </Badge>
        </div>
      )}

      {/* Performance Glow Effect for High-Performing Agents */}
      {agent.stats.success_rate > 0.9 && (
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 animate-pulse"
          style={{ zIndex: -1 }}
        />
      )}
    </div>
  );

  if (!showTooltip) {
    return avatarContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatarContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{agent.name}</span>
              <Badge variant="outline">{agent.type}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {agent.description || `${agent.role} specialist`}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn(
                "w-2 h-2 rounded-full",
                STATUS_COLORS[agent.status].split(' ')[0] // Get just the color class
              )} />
              <span className="capitalize">{agent.status}</span>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2">
              <div>Success Rate: {Math.round(agent.stats.success_rate * 100)}%</div>
              <div>Messages: {agent.stats.messages_sent}</div>
              <div>Tasks: {agent.stats.tasks_completed}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Custom CSS animations for enhanced effects (add to globals.css)
export const agentAvatarStyles = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes glow {
  0%, 100% { 
    box-shadow: 0 0 5px rgba(168, 85, 247, 0.4);
  }
  50% { 
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.8);
  }
}

.animate-glow {
  animation: glow 1.2s ease-in-out infinite;
}
`;