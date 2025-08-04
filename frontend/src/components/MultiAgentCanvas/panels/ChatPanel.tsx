/**
 * ChatPanel - Main chat interface for the Multi-Agent Canvas
 * 
 * This panel integrates the existing ChatInterface component and handles
 * chat interactions within the multi-panel layout system.
 */

import React, { useMemo } from 'react';
import { MessageSquare, Bot, User } from 'lucide-react';
import { ChatInterface } from '@/components/ChatInterface';
import { cn } from '@/lib/utils';
import '../styles/panel-enhancements.css';

export interface ChatPanelProps {
  /** Panel ID for identification */
  panelId: string;
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Whether the panel is in fullscreen mode */
  isFullscreen: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Chat interface props to pass through */
  chatProps?: React.ComponentProps<typeof ChatInterface>;
}

export function ChatPanel({
  panelId,
  isCollapsed,
  isFullscreen,
  className,
  chatProps = {},
}: ChatPanelProps) {
  // Memoize the panel content to prevent unnecessary re-renders
  const panelContent = useMemo(() => {
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
      <div className="h-full flex flex-col">
        <ChatInterface
          {...chatProps}
          className={cn(
            'flex-1 h-full',
            isFullscreen && 'max-h-none',
            chatProps.className
          )}
        />
      </div>
    );
  }, [isCollapsed, isFullscreen, chatProps]);

  return (
    <div 
      className={cn(
        'multi-agent-panel h-full w-full flex flex-col',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      data-panel-id={panelId}
    >
      {panelContent}
    </div>
  );
}

// Export icon component for use in layout configuration
export const ChatPanelIcon = () => <MessageSquare className="w-4 h-4" />;

// Export default panel configuration
export const chatPanelConfig = {
  id: 'chat',
  title: 'Chat',
  component: ChatPanel,
  icon: ChatPanelIcon,
  collapsible: true,
  resizable: true,
  minSize: 20,
  defaultSize: 50,
  order: 1,
} as const;