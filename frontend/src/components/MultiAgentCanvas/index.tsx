/**
 * MultiAgentCanvas - Advanced multi-panel interface for agent visualization
 * 
 * This component replaces SimplifiedThinkingPanel with a sophisticated
 * multi-panel layout system featuring resizable panels, agent network
 * visualization, and comprehensive debugging tools.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutManager, LayoutManagerUtils } from './LayoutManager';
import type { LayoutConfig } from './LayoutManager';
import { SimpleChatPanel, simpleChatPanelConfig } from './panels/SimpleChatPanel';
import { AgentNetworkPanel, agentNetworkPanelConfig } from './panels/AgentNetworkPanel';
import { InspectorPanel, inspectorPanelConfig } from './panels/InspectorPanel';
import { useSSE } from '@/contexts/SSEContext';
import { useAgentNetwork } from '@/hooks/useAgentNetwork';
import type { ThinkingStep } from '@/types/adk-events';
import { cn } from '@/lib/utils';

export interface MultiAgentCanvasProps {
  /** Traditional thinking steps for backward compatibility */
  steps?: ThinkingStep[];
  /** Whether to start expanded (backward compatibility) */
  defaultExpanded?: boolean;
  /** Props to pass to the chat interface */
  chatProps?: React.ComponentProps<typeof ChatPanel>['chatProps'];
  /** Custom CSS classes */
  className?: string;
  /** Whether to persist layout state */
  persistLayout?: boolean;
  /** Storage key for layout persistence */
  storageKey?: string;
}

// Default layout configurations
const createDefaultLayouts = (): LayoutConfig[] => [
  // Standard layout - Chat + Network + Inspector
  LayoutManagerUtils.createLayout(
    'standard',
    'Standard Layout',
    [
      simpleChatPanelConfig,
      agentNetworkPanelConfig,
      inspectorPanelConfig,
    ],
    {
      defaultSizes: {
        chat: 45,
        'agent-network': 35,
        inspector: 20,
      },
      responsive: {
        mobile: {
          panels: [
            { ...simpleChatPanelConfig, defaultSize: 60, order: 1 },
            { ...agentNetworkPanelConfig, defaultSize: 40, order: 2 },
          ],
        },
        tablet: {
          defaultSizes: {
            chat: 50,
            'agent-network': 30,
            inspector: 20,
          },
        },
      },
    }
  ),

  // Chat focus layout - Larger chat panel
  LayoutManagerUtils.createLayout(
    'chat-focus',
    'Chat Focus',
    [
      simpleChatPanelConfig,
      agentNetworkPanelConfig,
      inspectorPanelConfig,
    ],
    {
      defaultSizes: {
        chat: 65,
        'agent-network': 25,
        inspector: 10,
      },
    }
  ),

  // Debug layout - Larger inspector
  LayoutManagerUtils.createLayout(
    'debug',
    'Debug Layout',
    [
      simpleChatPanelConfig,
      agentNetworkPanelConfig,
      inspectorPanelConfig,
    ],
    {
      defaultSizes: {
        chat: 40,
        'agent-network': 25,
        inspector: 35,
      },
    }
  ),

  // Network focus layout - Larger network panel
  LayoutManagerUtils.createLayout(
    'network-focus',
    'Network Focus',
    [
      simpleChatPanelConfig,
      agentNetworkPanelConfig,
      inspectorPanelConfig,
    ],
    {
      defaultSizes: {
        chat: 35,
        'agent-network': 50,
        inspector: 15,
      },
    }
  ),
];

export function MultiAgentCanvas({
  steps = [],
  defaultExpanded = false,
  chatProps,
  className,
  persistLayout = true,
  storageKey = 'vana-multi-agent-canvas',
}: MultiAgentCanvasProps) {
  console.log('[MultiAgentCanvas] Rendering with props:', { 
    steps, 
    defaultExpanded, 
    persistLayout, 
    storageKey 
  });
  // Layout state
  const [layouts] = useState<LayoutConfig[]>(createDefaultLayouts);
  const [activeLayoutId, setActiveLayoutId] = useState<string>('standard');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedAgent, setSelectedAgent] = useState<string>();

  // Agent network integration
  const { 
    networkState, 
    recentUpdates: networkUpdates,
    isActive: hasNetworkActivity,
    stats: networkStats,
    isLoading: isNetworkLoading
  } = useAgentNetwork({
    maxUpdates: 100,
    fetchInitialState: true,
  });

  // SSE integration
  const { connection } = useSSE();

  // Detect mobile/tablet for responsive behavior
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-expand when there's activity
  useEffect(() => {
    if (networkUpdates.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [networkUpdates.length, isExpanded]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layoutId: string) => {
    setActiveLayoutId(layoutId);
  }, []);

  // Panel props
  const panelProps = useMemo(() => ({
    // Chat panel props
    chatProps,
    
    // Agent network panel props
    networkState,
    networkUpdates,
    
    // Inspector panel props
    selectedAgent,
    agentMetrics: networkState?.agents,
    inspectorUpdates: networkUpdates,
  }), [chatProps, networkState, networkUpdates, selectedAgent]);

  // Activity indicator
  const hasActivity = useMemo(() => {
    return hasNetworkActivity || networkUpdates.length > 0;
  }, [hasNetworkActivity, networkUpdates.length]);

  // Collapsed state component
  const CollapsedState = React.memo(() => (
    <motion.div
      key="collapsed"
      initial={isMobile ? { y: 20 } : { x: 300 }}
      animate={isMobile ? { y: 0 } : { x: 0 }}
      exit={isMobile ? { y: 20 } : { x: 300 }}
      className={cn(
        "fixed right-0 top-0 h-full",
        "md:w-16",
        isMobile && "w-full bottom-0 top-auto h-auto"
      )}
    >
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-lg border-l-2 border-purple-500",
          "hover:from-purple-800/90 hover:to-blue-800/90 transition-all",
          "w-full h-full flex items-center justify-center",
          "md:flex-col md:gap-4 md:py-8",
          "md:h-full h-16 flex-row gap-4 px-4"
        )}
        aria-label="Open Multi-Agent Canvas"
      >
        {isMobile ? (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
            />
            <span className="text-sm font-medium text-white">Multi-Agent Canvas</span>
            {hasActivity && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-500">
                  {networkState?.active_agents.length || 0} active
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
            />
            <div className="flex flex-col items-center gap-2">
              <span 
                className="text-sm font-bold text-white tracking-wider"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                AGENT CANVAS
              </span>
              {hasActivity && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-500">
                    {networkState?.active_agents.length || 0}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </button>
    </motion.div>
  ));

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full z-[100]",
      className
    )}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={cn(
              "fixed right-0 top-0 h-full",
              isMobile ? "w-full" : "w-[80vw] max-w-[1200px] min-w-[600px]",
              "bg-background/95 backdrop-blur-lg",
              "border-l border-border shadow-2xl"
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 left-4 z-10 p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Close Multi-Agent Canvas"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.div>
            </button>

            {/* Layout Manager */}
            <LayoutManager
              layouts={layouts}
              activeLayoutId={activeLayoutId}
              onLayoutChange={handleLayoutChange}
              panelProps={panelProps}
              persistLayout={persistLayout}
              storageKey={storageKey}
              className="h-full pt-12"
            />

            {/* Connection Status Indicator */}
            {connection.readyState !== 'OPEN' && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                {connection.readyState === 'CONNECTING' ? 'Connecting...' : 'Disconnected'}
              </div>
            )}
          </motion.div>
        ) : (
          <CollapsedState />
        )}
      </AnimatePresence>
    </div>
  );
}

// Export utility components and types for external use
export { LayoutManager, LayoutManagerUtils } from './LayoutManager';
export { SimpleChatPanel } from './panels/SimpleChatPanel';
export { AgentNetworkPanel } from './panels/AgentNetworkPanel';
export { InspectorPanel } from './panels/InspectorPanel';
export type { LayoutConfig, PanelConfig } from './LayoutManager';

// Backward compatibility export - components can import this as SimplifiedThinkingPanel
export { MultiAgentCanvas as SimplifiedThinkingPanel };

// Default export
export default MultiAgentCanvas;