/**
 * Research Status Integration Component
 * 
 * Seamlessly integrates the agent status popup system with the existing
 * research chat interface without disrupting the current layout or flow.
 * 
 * Features:
 * - Non-invasive integration with existing chat components
 * - Smart detection of research state changes
 * - Follows existing prompt-kit design patterns
 * - Maintains chat interface performance
 * - Mobile-optimized positioning
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AgentPopupApprovalTrigger, QuickStatusTrigger } from './agent-popup-approval-trigger';
import { featureFlags } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';
import { AgentStatus, ResearchSessionState } from '@/lib/research-sse-service';

// ============================================================================
// Integration Types
// ============================================================================

export interface ResearchStatusIntegrationProps {
  sessionState: ResearchSessionState | null;
  isResearchActive: boolean;
  className?: string;
  mode?: 'full' | 'compact' | 'minimal';
  position?: 'top' | 'bottom' | 'inline';
  autoShow?: boolean;
}

// ============================================================================
// Research State Monitor Hook
// ============================================================================

interface UseResearchStateMonitorResult {
  shouldShowApproval: boolean;
  shouldShowQuickTrigger: boolean;
  hasActiveAgents: boolean;
  agentCountChanged: boolean;
}

const useResearchStateMonitor = (
  sessionState: ResearchSessionState | null,
  isResearchActive: boolean
): UseResearchStateMonitorResult => {
  const [prevAgentCount, setPrevAgentCount] = useState(0);
  const [hasShownApproval, setHasShownApproval] = useState(false);
  
  const currentAgentCount = sessionState?.agents?.length || 0;
  const hasActiveAgents = sessionState?.agents?.some(agent => agent.status === 'current') || false;
  
  // Track agent count changes
  const agentCountChanged = currentAgentCount !== prevAgentCount;
  
  useEffect(() => {
    if (agentCountChanged) {
      setPrevAgentCount(currentAgentCount);
    }
  }, [currentAgentCount, agentCountChanged]);
  
  // Reset approval state when research stops
  useEffect(() => {
    if (!isResearchActive) {
      setHasShownApproval(false);
    }
  }, [isResearchActive]);
  
  // Determine when to show approval trigger
  const shouldShowApproval = 
    isResearchActive && 
    currentAgentCount > 0 && 
    !hasShownApproval && 
    hasActiveAgents;
  
  // Show quick trigger when we have agents but approval not needed
  const shouldShowQuickTrigger = 
    isResearchActive && 
    currentAgentCount > 0 && 
    hasShownApproval;
  
  return {
    shouldShowApproval,
    shouldShowQuickTrigger,
    hasActiveAgents,
    agentCountChanged
  };
};

// ============================================================================
// Integration Position Calculator
// ============================================================================

const useIntegrationPosition = (
  position: ResearchStatusIntegrationProps['position'],
  containerRef: React.RefObject<HTMLElement>
) => {
  const [calculatedPosition, setCalculatedPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});
  
  const calculatePosition = useCallback(() => {
    if (!containerRef.current || position === 'inline') return {};
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    switch (position) {
      case 'top':
        return {
          top: Math.max(16, containerRect.top - 80),
          left: Math.max(16, containerRect.left),
          right: Math.max(16, viewportWidth - containerRect.right)
        };
      case 'bottom':
        return {
          bottom: Math.max(16, viewportHeight - containerRect.bottom - 80),
          left: Math.max(16, containerRect.left),
          right: Math.max(16, viewportWidth - containerRect.right)
        };
      default:
        return {};
    }
  }, [position, containerRef]);
  
  useEffect(() => {
    const newPosition = calculatePosition();
    setCalculatedPosition(newPosition);
    
    const handleResize = () => {
      const newPosition = calculatePosition();
      setCalculatedPosition(newPosition);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [calculatePosition]);
  
  return calculatedPosition;
};

// ============================================================================
// Main Integration Component
// ============================================================================

export function ResearchStatusIntegration({
  sessionState,
  isResearchActive,
  className,
  mode = 'full',
  position = 'inline',
  autoShow = false
}: ResearchStatusIntegrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userApproved, setUserApproved] = useState(false);
  
  const calculatedPosition = useIntegrationPosition(position, containerRef);
  
  const {
    shouldShowApproval,
    shouldShowQuickTrigger,
    hasActiveAgents,
    agentCountChanged
  } = useResearchStateMonitor(sessionState, isResearchActive);
  
  const agents = sessionState?.agents || [];
  
  // Handle approval state changes
  const handleApprovalChange = useCallback((approved: boolean) => {
    setUserApproved(approved);
  }, []);
  
  // Don't render anything if feature is disabled or no agents
  if (!featureFlags.useAgentStatusPopup || agents.length === 0) {
    return null;
  }
  
  // Inline positioning (integrated within chat flow)
  if (position === 'inline') {
    return (
      <div 
        ref={containerRef}
        className={cn(
          "w-full space-y-3",
          // Responsive spacing
          "px-3 sm:px-4",
          // Animation classes
          "fade-in-up",
          className
        )}
      >
        {/* Full approval workflow */}
        {mode === 'full' && shouldShowApproval && (
          <AgentPopupApprovalTrigger
            agents={agents}
            isResearchActive={isResearchActive}
            onApprovalChange={handleApprovalChange}
            className="w-full"
          />
        )}
        
        {/* Compact trigger for ongoing research */}
        {(mode === 'compact' || mode === 'minimal' || shouldShowQuickTrigger) && (
          <div className="flex justify-end">
            <QuickStatusTrigger
              agents={agents}
              compact={mode === 'minimal'}
              className={cn(
                // Responsive sizing
                "transition-all duration-200",
                hasActiveAgents && "animate-pulse"
              )}
            />
          </div>
        )}
      </div>
    );
  }
  
  // Floating positioning (overlaid on chat interface)
  return (
    <>
      {/* Inline container for positioning reference */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
      
      {/* Floating overlay */}
      <div
        className={cn(
          "fixed z-40 pointer-events-none",
          className
        )}
        style={calculatedPosition}
      >
        <div className="pointer-events-auto">
          {/* Full approval workflow */}
          {mode === 'full' && shouldShowApproval && (
            <AgentPopupApprovalTrigger
              agents={agents}
              isResearchActive={isResearchActive}
              onApprovalChange={handleApprovalChange}
            />
          )}
          
          {/* Compact trigger for ongoing research */}
          {(mode === 'compact' || mode === 'minimal' || shouldShowQuickTrigger) && (
            <QuickStatusTrigger
              agents={agents}
              compact={mode === 'minimal'}
              className={cn(
                "transition-all duration-200",
                hasActiveAgents && "animate-pulse"
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Chat Interface Integration Hook
// ============================================================================

interface UseChatIntegrationProps {
  sessionState: ResearchSessionState | null;
  isResearchActive: boolean;
  enabled?: boolean;
}

export const useChatIntegration = ({
  sessionState,
  isResearchActive,
  enabled = true
}: UseChatIntegrationProps) => {
  const [integrationState, setIntegrationState] = useState({
    showApproval: false,
    showQuickTrigger: false,
    userInteracted: false
  });
  
  const agents = sessionState?.agents || [];
  const hasActiveAgents = agents.some(agent => agent.status === 'current');
  
  // Update integration state based on research progress
  useEffect(() => {
    if (!enabled || !isResearchActive) {
      setIntegrationState({
        showApproval: false,
        showQuickTrigger: false,
        userInteracted: false
      });
      return;
    }
    
    // Show approval when we have active agents and user hasn't interacted
    if (hasActiveAgents && !integrationState.userInteracted) {
      setIntegrationState(prev => ({
        ...prev,
        showApproval: true,
        showQuickTrigger: false
      }));
    }
    // Show quick trigger after user has interacted
    else if (hasActiveAgents && integrationState.userInteracted) {
      setIntegrationState(prev => ({
        ...prev,
        showApproval: false,
        showQuickTrigger: true
      }));
    }
  }, [enabled, isResearchActive, hasActiveAgents, integrationState.userInteracted]);
  
  const handleUserInteraction = useCallback(() => {
    setIntegrationState(prev => ({
      ...prev,
      userInteracted: true
    }));
  }, []);
  
  return {
    integrationState,
    handleUserInteraction,
    agents,
    hasActiveAgents
  };
};

// ============================================================================
// Prompt-Kit Compatible Integration
// ============================================================================

interface PromptKitIntegrationProps {
  sessionState: ResearchSessionState | null;
  isResearchActive: boolean;
  className?: string;
}

export function PromptKitIntegration({
  sessionState,
  isResearchActive,
  className
}: PromptKitIntegrationProps) {
  const {
    integrationState,
    handleUserInteraction,
    agents
  } = useChatIntegration({
    sessionState,
    isResearchActive,
    enabled: featureFlags.usePromptKitInterface
  });
  
  if (!featureFlags.usePromptKitInterface || agents.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      // Prompt-kit styling consistency
      "w-full max-w-4xl mx-auto px-3 sm:px-4",
      // Spacing that matches prompt-kit patterns
      "mt-3 mb-2",
      className
    )}>
      {integrationState.showApproval && (
        <AgentPopupApprovalTrigger
          agents={agents}
          isResearchActive={isResearchActive}
          onApprovalChange={handleUserInteraction}
          className="approval-banner-pulse"
        />
      )}
      
      {integrationState.showQuickTrigger && (
        <div className="flex justify-end">
          <QuickStatusTrigger
            agents={agents}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}

export default ResearchStatusIntegration;