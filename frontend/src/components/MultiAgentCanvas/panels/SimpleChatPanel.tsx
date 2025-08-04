/**
 * SimpleChatPanel - Simple chat display for the Multi-Agent Canvas
 * 
 * This panel shows chat messages without including the MultiAgentCanvas
 * to avoid circular dependencies.
 */

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../styles/panel-enhancements.css';

export interface SimpleChatPanelProps {
  /** Panel ID for identification */
  panelId: string;
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Whether the panel is in fullscreen mode */
  isFullscreen: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SimpleChatPanel({
  panelId,
  isCollapsed,
  isFullscreen,
  className,
}: SimpleChatPanelProps) {
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Chat collapsed</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full flex flex-col p-4",
      isFullscreen && 'max-h-none',
      className
    )}>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chat messages will appear here</p>
            <p className="text-xs mt-2">This panel shows the conversation flow</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Panel configuration for the layout manager
export const simpleChatPanelConfig = {
  id: 'chat',
  title: 'Chat',
  component: SimpleChatPanel,
  icon: MessageSquare,
  defaultSize: 40,
  minSize: 20,
  collapsible: true,
  resizable: true,
  order: 1,
};