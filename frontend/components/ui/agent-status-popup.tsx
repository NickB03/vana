/**
 * Agent Status Popup System
 * 
 * Smart popup system that appears after user approval to show research agent status.
 * Features intelligent positioning, smooth animations, and mobile-optimized interactions.
 * 
 * Key Features:
 * - Smart positioning with collision detection
 * - Smooth enter/exit animations using Framer Motion
 * - Mobile-first responsive design
 * - Non-intrusive overlay that doesn't block chat interaction
 * - Integration with existing agent status components
 * - Follows prompt-kit design patterns
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AgentStatusCard, AgentStatusMiniCard } from '@/components/ui/agent-status-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Move,
  Pin,
  PinOff,
  Settings,
  Users,
  Activity,
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentStatus } from '@/lib/research-sse-service';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PopupPosition {
  x: number;
  y: number;
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface PopupConfig {
  position?: PopupPosition;
  size?: 'compact' | 'standard' | 'expanded';
  variant?: 'floating' | 'docked' | 'overlay';
  draggable?: boolean;
  pinnable?: boolean;
  collapsible?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export interface AgentStatusPopupProps {
  agents: AgentStatus[];
  isVisible: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onPin?: (pinned: boolean) => void;
  config?: PopupConfig;
  triggerElement?: HTMLElement | null;
  className?: string;
}

// ============================================================================
// Smart Positioning System
// ============================================================================

interface ViewportBounds {
  width: number;
  height: number;
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const useSmartPositioning = (
  triggerElement: HTMLElement | null,
  popupSize: { width: number; height: number },
  isVisible: boolean
) => {
  const [position, setPosition] = useState<PopupPosition>({ x: 0, y: 0, anchor: 'center' });
  const [collision, setCollision] = useState<string[]>([]);

  const calculateOptimalPosition = useCallback(() => {
    if (!triggerElement || !isVisible) return;

    const viewport: ViewportBounds = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const triggerRect = triggerElement.getBoundingClientRect();
    const padding = 16; // Safe distance from viewport edges
    
    // Priority order: bottom-right, bottom-left, top-right, top-left, center
    const positions = [
      // Bottom right
      {
        x: triggerRect.right + 8,
        y: triggerRect.bottom + 8,
        anchor: 'top-left' as const,
        priority: 1
      },
      // Bottom left  
      {
        x: triggerRect.left - popupSize.width - 8,
        y: triggerRect.bottom + 8,
        anchor: 'top-right' as const,
        priority: 2
      },
      // Top right
      {
        x: triggerRect.right + 8,
        y: triggerRect.top - popupSize.height - 8,
        anchor: 'bottom-left' as const,
        priority: 3
      },
      // Top left
      {
        x: triggerRect.left - popupSize.width - 8,
        y: triggerRect.top - popupSize.height - 8,
        anchor: 'bottom-right' as const,
        priority: 4
      },
      // Center fallback
      {
        x: (viewport.width - popupSize.width) / 2,
        y: (viewport.height - popupSize.height) / 2,
        anchor: 'center' as const,
        priority: 5
      }
    ];

    // Find first position without collision
    for (const pos of positions) {
      const collisions: string[] = [];
      
      if (pos.x < padding) collisions.push('left');
      if (pos.x + popupSize.width > viewport.width - padding) collisions.push('right');
      if (pos.y < padding) collisions.push('top');
      if (pos.y + popupSize.height > viewport.height - padding) collisions.push('bottom');
      
      if (collisions.length === 0) {
        setPosition({ x: pos.x, y: pos.y, anchor: pos.anchor });
        setCollision([]);
        return;
      }
      
      // If this is center position (last resort), use it with adjustments
      if (pos.anchor === 'center') {
        const adjustedX = Math.max(padding, Math.min(pos.x, viewport.width - popupSize.width - padding));
        const adjustedY = Math.max(padding, Math.min(pos.y, viewport.height - popupSize.height - padding));
        
        setPosition({ x: adjustedX, y: adjustedY, anchor: 'center' });
        setCollision(collisions);
        return;
      }
    }
  }, [triggerElement, popupSize, isVisible]);

  useEffect(() => {
    if (isVisible) {
      calculateOptimalPosition();
      
      const handleResize = () => calculateOptimalPosition();
      const handleScroll = () => calculateOptimalPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isVisible, calculateOptimalPosition]);

  return { position, collision };
};

// ============================================================================
// Popup State Management Hook
// ============================================================================

interface PopupState {
  isVisible: boolean;
  isMinimized: boolean;
  isPinned: boolean;
  isCollapsed: boolean;
  size: 'compact' | 'standard' | 'expanded';
  variant: 'floating' | 'docked' | 'overlay';
}

export const useAgentPopupState = (initialConfig?: PopupConfig) => {
  const [state, setState] = useState<PopupState>({
    isVisible: false,
    isMinimized: false,
    isPinned: false,
    isCollapsed: false,
    size: initialConfig?.size || 'standard',
    variant: initialConfig?.variant || 'floating'
  });

  const show = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }));
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const togglePin = useCallback(() => {
    setState(prev => ({ ...prev, isPinned: !prev.isPinned }));
  }, []);

  const toggleCollapse = useCallback(() => {
    setState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  const setSize = useCallback((size: PopupState['size']) => {
    setState(prev => ({ ...prev, size }));
  }, []);

  const setVariant = useCallback((variant: PopupState['variant']) => {
    setState(prev => ({ ...prev, variant }));
  }, []);

  return {
    state,
    actions: {
      show,
      hide,
      minimize,
      togglePin,
      toggleCollapse,
      setSize,
      setVariant
    }
  };
};

// ============================================================================
// Main Agent Status Popup Component
// ============================================================================

export function AgentStatusPopup({
  agents,
  isVisible,
  onClose,
  onMinimize,
  onPin,
  config = {},
  triggerElement,
  className
}: AgentStatusPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, top: 0, right: 0, bottom: 0 });

  // Determine popup dimensions based on size
  const getPopupDimensions = () => {
    const size = config.size || 'standard';
    switch (size) {
      case 'compact':
        return { width: 320, height: isCollapsed ? 60 : 400 };
      case 'expanded':
        return { width: 480, height: isCollapsed ? 60 : 600 };
      default:
        return { width: 400, height: isCollapsed ? 60 : 500 };
    }
  };

  const popupSize = getPopupDimensions();
  const { position, collision } = useSmartPositioning(triggerElement, popupSize, isVisible);

  // Update drag constraints when viewport changes
  useEffect(() => {
    const updateConstraints = () => {
      const padding = 16;
      setDragConstraints({
        left: padding - popupSize.width / 2,
        top: padding - popupSize.height / 2,
        right: window.innerWidth - popupSize.width / 2 - padding,
        bottom: window.innerHeight - popupSize.height / 2 - padding
      });
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [popupSize]);

  // Auto-hide functionality
  useEffect(() => {
    if (config.autoHide && isVisible && !isPinned && !isDragging) {
      const timer = setTimeout(() => {
        onClose();
      }, config.autoHideDelay || 10000);

      return () => clearTimeout(timer);
    }
  }, [config.autoHide, config.autoHideDelay, isVisible, isPinned, isDragging, onClose]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  }, [isMinimized, onMinimize]);

  const handlePin = useCallback(() => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    onPin?.(newPinned);
  }, [isPinned, onPin]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
  }, []);

  // Filter agents by status for organization
  const activeAgents = agents.filter(agent => agent.status === 'current');
  const completedAgents = agents.filter(agent => agent.status === 'completed');
  const errorAgents = agents.filter(agent => agent.status === 'error');
  const waitingAgents = agents.filter(agent => agent.status === 'waiting');

  // Animation variants
  const popupVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: position.anchor === 'center' ? 0 : (position.anchor?.includes('top') ? -20 : 20)
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        duration: 0.3,
        bounce: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: position.anchor === 'center' ? 0 : (position.anchor?.includes('top') ? -20 : 20),
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    }
  };

  if (!isVisible) return null;

  const PopupContent = () => (
    <motion.div
      ref={popupRef}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={popupVariants}
      drag={config.draggable}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        // Base styles
        'fixed z-50 bg-background/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl',
        'ring-1 ring-black/5 dark:ring-white/10',
        
        // Variant-specific styles
        config.variant === 'floating' && 'shadow-2xl',
        config.variant === 'docked' && 'rounded-none border-l-0',
        config.variant === 'overlay' && 'bg-background/80',
        
        // Size-specific styles
        config.size === 'compact' && 'text-sm',
        config.size === 'expanded' && 'text-base',
        
        // State styles
        isDragging && 'cursor-grabbing shadow-3xl scale-105',
        isPinned && 'ring-primary/20 shadow-primary/10',
        isMinimized && 'overflow-hidden',
        
        // Collision adjustments
        collision.includes('left') && 'rounded-l-none border-l-0',
        collision.includes('right') && 'rounded-r-none border-r-0',
        collision.includes('top') && 'rounded-t-none border-t-0',
        collision.includes('bottom') && 'rounded-b-none border-b-0',
        
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: popupSize.width,
        maxHeight: popupSize.height
      }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-3 border-b border-border',
        config.draggable && 'cursor-grab active:cursor-grabbing'
      )}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Agent Status</span>
          </div>
          
          {activeAgents.length > 0 && (
            <Badge variant="default" className="gap-1 text-xs">
              <Activity className="h-3 w-3 animate-pulse" />
              {activeAgents.length} Active
            </Badge>
          )}
          
          {config.autoHide && !isPinned && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Zap className="h-3 w-3" />
              Auto-hide
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {config.collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0"
              aria-label={isCollapsed ? "Expand popup" : "Collapse popup"}
            >
              {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
          )}
          
          {config.pinnable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePin}
              className={cn("h-6 w-6 p-0", isPinned && "text-primary")}
              aria-label={isPinned ? "Unpin popup" : "Pin popup"}
            >
              {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
            </Button>
          )}
          
          {onMinimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="h-6 w-6 p-0"
              aria-label={isMinimized ? "Restore popup" : "Minimize popup"}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Close popup"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto agent-scroll-area">
              {/* Active Agents */}
              {activeAgents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-primary uppercase tracking-wide">
                    Active ({activeAgents.length})
                  </h4>
                  <div className="space-y-2">
                    {activeAgents.map((agent) => (
                      <AgentStatusCard
                        key={`${agent.agent_type}-${agent.agent_id}`}
                        agent={agent}
                        isActive={true}
                        compact={config.size === 'compact'}
                        showConnectionHealth={false}
                        className="fade-in-up"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Error Agents */}
              {errorAgents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-destructive uppercase tracking-wide">
                    Errors ({errorAgents.length})
                  </h4>
                  <div className="space-y-2">
                    {errorAgents.map((agent) => (
                      <AgentStatusCard
                        key={`${agent.agent_type}-${agent.agent_id}`}
                        agent={agent}
                        compact={config.size === 'compact'}
                        showConnectionHealth={false}
                        className="fade-in-up"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Completed Agents (Mini cards for space efficiency) */}
              {completedAgents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                    Completed ({completedAgents.length})
                  </h4>
                  <div className="space-y-1">
                    {completedAgents.map((agent) => (
                      <AgentStatusMiniCard
                        key={`${agent.agent_type}-${agent.agent_id}`}
                        agent={agent}
                        className="fade-in-up"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Waiting Agents */}
              {waitingAgents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Waiting ({waitingAgents.length})
                  </h4>
                  <div className="space-y-1">
                    {waitingAgents.map((agent) => (
                      <AgentStatusMiniCard
                        key={`${agent.agent_type}-${agent.agent_id}`}
                        agent={agent}
                        className="fade-in-up"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {agents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">No agents active</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Drag Handle (when draggable) */}
      {config.draggable && !isCollapsed && (
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      )}
    </motion.div>
  );

  // Render in portal for proper z-index stacking
  return createPortal(
    <AnimatePresence mode="wait">
      {isVisible && <PopupContent />}
    </AnimatePresence>,
    document.body
  );
}

// ============================================================================
// Popup Trigger Component
// ============================================================================

interface PopupTriggerProps {
  children: React.ReactNode;
  popup: React.ReactNode;
  trigger?: 'click' | 'hover' | 'manual';
  delay?: number;
  className?: string;
}

export function PopupTrigger({ 
  children, 
  popup, 
  trigger = 'click', 
  delay = 0,
  className 
}: PopupTriggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setTriggerElement(triggerRef.current);
  }, []);

  const showPopup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay]);

  const hidePopup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  const handleClick = useCallback(() => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  }, [trigger, isVisible]);

  const handleMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      showPopup();
    }
  }, [trigger, showPopup]);

  const handleMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      hidePopup();
    }
  }, [trigger, hidePopup]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("inline-block", className)}
      >
        {children}
      </div>
      
      {React.cloneElement(popup as React.ReactElement, {
        isVisible,
        onClose: hidePopup,
        triggerElement
      })}
    </>
  );
}

export default AgentStatusPopup;