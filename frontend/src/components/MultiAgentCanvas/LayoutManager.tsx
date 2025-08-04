/**
 * LayoutManager - Multi-panel resizable layout system for Vana
 * 
 * Provides a flexible, responsive layout system with resizable panels
 * that can be configured for different screen sizes and use cases.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PanelGroup, 
  Panel, 
  PanelResizeHandle
} from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './styles/panel-enhancements.css';

// Layout configuration types
export interface LayoutConfig {
  id: string;
  name: string;
  panels: PanelConfig[];
  minSizes?: Record<string, number>;
  defaultSizes?: Record<string, number>;
  responsive?: {
    mobile?: Partial<LayoutConfig>;
    tablet?: Partial<LayoutConfig>;
    desktop?: Partial<LayoutConfig>;
  };
}

export interface PanelConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  collapsible?: boolean;
  resizable?: boolean;
  minSize?: number;
  defaultSize?: number;
  order?: number;
  icon?: React.ComponentType | React.ReactNode;
}

export interface LayoutManagerProps {
  /** Available layout configurations */
  layouts: LayoutConfig[];
  /** Current active layout ID */
  activeLayoutId: string;
  /** Callback when layout changes */
  onLayoutChange?: (layoutId: string) => void;
  /** Props to pass to panel components */
  panelProps?: Record<string, any>;
  /** Whether to persist layout state */
  persistLayout?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Custom CSS classes */
  className?: string;
}

// Layout state management
interface LayoutState {
  panelSizes: Record<string, number>;
  collapsedPanels: Set<string>;
  orientation: 'horizontal' | 'vertical';
  fullscreenPanel?: string;
}

// Responsive breakpoints
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

// Default resize handle styles
const RESIZE_HANDLE_STYLES = {
  horizontal: 'w-1 bg-border hover:bg-accent transition-colors cursor-col-resize',
  vertical: 'h-1 bg-border hover:bg-accent transition-colors cursor-row-resize',
} as const;

export function LayoutManager({
  layouts,
  activeLayoutId,
  onLayoutChange,
  panelProps = {},
  persistLayout = true,
  storageKey = 'vana-layout-state',
  className,
}: LayoutManagerProps) {
  // Find active layout
  const activeLayout = layouts.find(layout => layout.id === activeLayoutId);
  
  if (!activeLayout) {
    throw new Error(`Layout with id "${activeLayoutId}" not found`);
  }

  // Responsive state
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Layout state
  const [layoutState, setLayoutState] = useState<LayoutState>(() => {
    if (persistLayout && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse saved layout state:', error);
        }
      }
    }
    
    return {
      panelSizes: activeLayout.defaultSizes || {},
      collapsedPanels: new Set(),
      orientation: screenSize === 'mobile' ? 'vertical' : 'horizontal',
    };
  });

  // Get responsive layout configuration
  const responsiveLayout = useMemo(() => {
    const responsive = activeLayout.responsive;
    if (!responsive) return activeLayout;

    switch (screenSize) {
      case 'mobile':
        return { ...activeLayout, ...responsive.mobile };
      case 'tablet':
        return { ...activeLayout, ...responsive.tablet };
      default:
        return { ...activeLayout, ...responsive.desktop };
    }
  }, [activeLayout, screenSize]);

  // Update screen size on resize
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.tablet) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Update orientation based on screen size
  useEffect(() => {
    setLayoutState(prev => ({
      ...prev,
      orientation: screenSize === 'mobile' ? 'vertical' : 'horizontal',
    }));
  }, [screenSize]);

  // Persist layout state
  useEffect(() => {
    if (persistLayout && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(layoutState));
    }
  }, [layoutState, persistLayout, storageKey]);

  // Panel resize handler
  const handlePanelResize = useCallback((panelId: string, size: number) => {
    setLayoutState(prev => ({
      ...prev,
      panelSizes: {
        ...prev.panelSizes,
        [panelId]: size,
      },
    }));
  }, []);

  // Toggle panel collapse
  const togglePanelCollapse = useCallback((panelId: string) => {
    setLayoutState(prev => {
      const newCollapsed = new Set(prev.collapsedPanels);
      if (newCollapsed.has(panelId)) {
        newCollapsed.delete(panelId);
      } else {
        newCollapsed.add(panelId);
      }
      
      return {
        ...prev,
        collapsedPanels: newCollapsed,
      };
    });
  }, []);

  // Toggle fullscreen panel
  const toggleFullscreen = useCallback((panelId?: string) => {
    setLayoutState(prev => ({
      ...prev,
      fullscreenPanel: prev.fullscreenPanel === panelId ? undefined : panelId,
    }));
  }, []);

  // Reset layout to defaults
  const resetLayout = useCallback(() => {
    setLayoutState({
      panelSizes: activeLayout.defaultSizes || {},
      collapsedPanels: new Set(),
      orientation: screenSize === 'mobile' ? 'vertical' : 'horizontal',
    });
  }, [activeLayout.defaultSizes, screenSize]);

  // Get panel size (accounting for collapsed state)
  const getPanelSize = useCallback((panel: PanelConfig) => {
    if (layoutState.collapsedPanels.has(panel.id)) {
      return 0;
    }
    
    if (layoutState.fullscreenPanel === panel.id) {
      return 100;
    }
    
    if (layoutState.fullscreenPanel && layoutState.fullscreenPanel !== panel.id) {
      return 0;
    }
    
    return layoutState.panelSizes[panel.id] || panel.defaultSize || 33.33;
  }, [layoutState]);

  // Sort panels by order
  const sortedPanels = useMemo(() => {
    return [...responsiveLayout.panels].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [responsiveLayout.panels]);

  // Enhanced Panel header component
  const PanelHeader = React.memo(({ panel }: { panel: PanelConfig }) => (
    <div className="panel-header flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          {React.isValidElement(panel.icon) 
            ? panel.icon 
            : typeof panel.icon === 'function' 
              ? React.createElement(panel.icon) 
              : panel.icon
          }
        </div>
        <div>
          <h3 className="panel-title text-sm font-semibold">{panel.title}</h3>
          <div className="text-xs text-muted-foreground/80">
            {layoutState.collapsedPanels.has(panel.id) ? 'Collapsed' : 'Active'}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {panel.collapsible && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => togglePanelCollapse(panel.id)}
            className="p-2 hover:bg-accent/60 rounded-lg transition-all duration-200 group"
            title={`${layoutState.collapsedPanels.has(panel.id) ? 'Expand' : 'Collapse'} panel`}
          >
            <motion.div
              animate={{ 
                rotate: layoutState.collapsedPanels.has(panel.id) ? 180 : 0 
              }}
              transition={{ duration: 0.3 }}
            >
              {layoutState.orientation === 'horizontal' ? (
                <ChevronLeft className="w-4 h-4 group-hover:text-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 group-hover:text-foreground" />
              )}
            </motion.div>
          </motion.button>
        )}
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toggleFullscreen(panel.id)}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 group",
            layoutState.fullscreenPanel === panel.id
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "hover:bg-accent/60"
          )}
          title={layoutState.fullscreenPanel === panel.id ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {layoutState.fullscreenPanel === panel.id ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4 group-hover:text-foreground" />
          )}
        </motion.button>
      </div>
    </div>
  ));

  // Enhanced Resize handle component
  const ResizeHandle = React.memo(({ direction }: { direction: 'horizontal' | 'vertical' }) => (
    <PanelResizeHandle className={cn(
      'resize-handle-enhanced flex items-center justify-center group relative transition-all duration-200',
      direction === 'horizontal' 
        ? 'w-2 cursor-col-resize hover:w-3' 
        : 'h-2 cursor-row-resize hover:h-3'
    )}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-border/30 to-accent/20"
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Visual indicator */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {direction === 'horizontal' ? (
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-3 bg-muted-foreground/60 rounded-full" />
            <div className="w-0.5 h-3 bg-muted-foreground/60 rounded-full" />
          </div>
        ) : (
          <div className="flex gap-0.5">
            <div className="h-0.5 w-3 bg-muted-foreground/60 rounded-full" />
            <div className="h-0.5 w-3 bg-muted-foreground/60 rounded-full" />
          </div>
        )}
      </motion.div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-primary/10 rounded"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </PanelResizeHandle>
  ));

  return (
    <div className={cn('h-full w-full flex flex-col', className)}>
      {/* Enhanced Layout Controls */}
      <div className="panel-header flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-muted/20 to-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <div>
              <span className="text-sm font-semibold text-foreground">
                {responsiveLayout.name}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Monitor className="w-3 h-3" />
                <span className="capitalize">{screenSize}</span>
                {layoutState.fullscreenPanel && (
                  <>
                    <div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
                    <span>Fullscreen</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {layouts.length > 1 && (
            <select
              value={activeLayoutId}
              onChange={(e) => onLayoutChange?.(e.target.value)}
              className="text-sm bg-background/80 border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {layouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetLayout}
            className="p-2 hover:bg-accent/60 rounded-lg transition-all duration-200 group"
            title="Reset layout to defaults"
          >
            <RotateCcw className="w-4 h-4 group-hover:text-foreground" />
          </motion.button>

          {layoutState.fullscreenPanel && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFullscreen()}
              className="p-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-all duration-200"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Panel Container */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup
          direction={layoutState.orientation}
          className="h-full w-full"
        >
          {sortedPanels.map((panel, index) => {
            const isCollapsed = layoutState.collapsedPanels.has(panel.id);
            const isFullscreen = layoutState.fullscreenPanel === panel.id;
            const isHidden = layoutState.fullscreenPanel && 
                           layoutState.fullscreenPanel !== panel.id;
            
            return (
              <React.Fragment key={panel.id}>
                <AnimatePresence mode="wait">
                  {!isHidden && (
                    <Panel
                      id={panel.id}
                      order={panel.order || index}
                      minSize={isCollapsed ? 0 : (panel.minSize || 10)}
                      defaultSize={getPanelSize(panel)}
                      collapsible={panel.collapsible}
                      onResize={(size) => handlePanelResize(panel.id, size)}
                      className={cn(
                        'multi-agent-panel flex flex-col',
                        isCollapsed && 'min-w-0 min-h-0 overflow-hidden',
                        isFullscreen && 'z-50 shadow-2xl'
                      )}
                    >
                      <motion.div
                        initial={isCollapsed ? { opacity: 0 } : { opacity: 1 }}
                        animate={isCollapsed ? { opacity: 0 } : { opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                      >
                        <PanelHeader panel={panel} />
                        
                        <div className="flex-1 overflow-hidden">
                          <panel.component
                            {...panelProps}
                            panelId={panel.id}
                            isCollapsed={isCollapsed}
                            isFullscreen={isFullscreen}
                          />
                        </div>
                      </motion.div>
                    </Panel>
                  )}
                </AnimatePresence>
                
                {/* Resize handle between panels */}
                {index < sortedPanels.length - 1 && !isHidden && (
                  <ResizeHandle direction={layoutState.orientation} />
                )}
              </React.Fragment>
            );
          })}
        </PanelGroup>
      </div>
    </div>
  );
}

// Export utility functions for layout management
export const LayoutManagerUtils = {
  /**
   * Create a basic layout configuration
   */
  createLayout: (
    id: string,
    name: string,
    panels: PanelConfig[],
    options?: Partial<LayoutConfig>
  ): LayoutConfig => ({
    id,
    name,
    panels,
    ...options,
  }),

  /**
   * Create a panel configuration
   */
  createPanel: (
    id: string,
    title: string,
    component: React.ComponentType<any>,
    options?: Partial<PanelConfig>
  ): PanelConfig => ({
    id,
    title,
    component,
    collapsible: true,
    resizable: true,
    defaultSize: 33.33,
    ...options,
  }),

  /**
   * Get saved layout state from localStorage
   */
  getSavedLayoutState: (storageKey: string = 'vana-layout-state'): LayoutState | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to parse saved layout state:', error);
      return null;
    }
  },

  /**
   * Clear saved layout state
   */
  clearSavedLayoutState: (storageKey: string = 'vana-layout-state'): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  },
};