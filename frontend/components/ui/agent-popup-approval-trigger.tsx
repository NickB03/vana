/**
 * Agent Popup Approval Trigger System
 * 
 * Manages the user approval workflow for showing agent status popups.
 * Integrates with the research chat interface to show popups after user consent.
 * 
 * Features:
 * - User consent management for popup display
 * - Integration with research session state
 * - Smooth approval workflow with animations
 * - Persistent user preferences
 * - Mobile-optimized interaction patterns
 */

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AgentStatusPopup, useAgentPopupState, type PopupConfig } from './agent-status-popup';
import { 
  Users,
  Eye,
  EyeOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  X,
  Pin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentStatus } from '@/lib/research-sse-service';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ApprovalState {
  isApproved: boolean;
  rememberChoice: boolean;
  showPreferences: boolean;
  autoShow: boolean;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  size: 'compact' | 'standard' | 'expanded';
}

export interface AgentPopupApprovalProps {
  agents: AgentStatus[];
  isResearchActive: boolean;
  onApprovalChange?: (approved: boolean) => void;
  className?: string;
}

// ============================================================================
// Local Storage Utilities
// ============================================================================

const STORAGE_KEY = 'agent-popup-preferences';

const getStoredPreferences = (): Partial<ApprovalState> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const storePreferences = (preferences: Partial<ApprovalState>) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    console.warn('Failed to store popup preferences');
  }
};

// ============================================================================
// Approval Banner Component
// ============================================================================

interface ApprovalBannerProps {
  onApprove: () => void;
  onDeny: () => void;
  onShowPreferences: () => void;
  agentCount: number;
  activeCount: number;
}

function ApprovalBanner({ 
  onApprove, 
  onDeny, 
  onShowPreferences, 
  agentCount, 
  activeCount 
}: ApprovalBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
    >
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Show Agent Status
                </h3>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Zap className="h-3 w-3" />
                  {agentCount} Agents
                </Badge>
                {activeCount > 0 && (
                  <Badge variant="default" className="gap-1 text-xs">
                    <Eye className="h-3 w-3 animate-pulse" />
                    {activeCount} Active
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3 leading-relaxed">
                Would you like to see real-time status updates from your research agents? 
                The popup will show progress, current tasks, and completion status.
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={onApprove}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Show Status
                </Button>
                
                <Button
                  onClick={onDeny}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <EyeOff className="h-3 w-3" />
                  Not Now
                </Button>
                
                <Button
                  onClick={onShowPreferences}
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <Settings className="h-3 w-3" />
                  Options
                </Button>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Preferences Panel Component
// ============================================================================

interface PreferencesPanelProps {
  preferences: ApprovalState;
  onChange: (preferences: Partial<ApprovalState>) => void;
  onApply: () => void;
  onCancel: () => void;
}

function PreferencesPanel({ 
  preferences, 
  onChange, 
  onApply, 
  onCancel 
}: PreferencesPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-background border shadow-lg">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Popup Preferences</h3>
          </div>
          
          {/* Auto-show preference */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-show"
              checked={preferences.autoShow}
              onCheckedChange={(checked) => onChange({ autoShow: checked as boolean })}
            />
            <label 
              htmlFor="auto-show" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Always show agent status automatically
            </label>
          </div>
          
          {/* Remember choice */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={preferences.rememberChoice}
              onCheckedChange={(checked) => onChange({ rememberChoice: checked as boolean })}
            />
            <label 
              htmlFor="remember" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember my choice for future sessions
            </label>
          </div>
          
          {/* Size preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Popup Size</label>
            <div className="flex gap-2">
              {(['compact', 'standard', 'expanded'] as const).map((size) => (
                <Button
                  key={size}
                  variant={preferences.size === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ size })}
                  className="capitalize text-xs"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Position preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Position</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'top-left', label: 'Top Left' },
                { key: 'top-right', label: 'Top Right' },
                { key: 'bottom-left', label: 'Bottom Left' },
                { key: 'bottom-right', label: 'Bottom Right' }
              ] as const).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={preferences.position === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ position: key })}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              onClick={onApply}
              size="sm"
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Apply & Show
            </Button>
            
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
          
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>
              Agent status popups help you monitor research progress in real-time. 
              They can be moved, pinned, and customized to fit your workflow.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Main Approval Trigger Component
// ============================================================================

export function AgentPopupApprovalTrigger({
  agents,
  isResearchActive,
  onApprovalChange,
  className
}: AgentPopupApprovalProps) {
  const [approvalState, setApprovalState] = useState<ApprovalState>(() => {
    const stored = getStoredPreferences();
    return {
      isApproved: false,
      rememberChoice: stored.rememberChoice || false,
      showPreferences: false,
      autoShow: stored.autoShow || false,
      position: stored.position || 'bottom-right',
      size: stored.size || 'standard',
      ...stored
    };
  });

  const [showBanner, setShowBanner] = useState(false);
  const [hasShownForSession, setHasShownForSession] = useState(false);
  
  const popupState = useAgentPopupState({
    size: approvalState.size,
    variant: 'floating',
    draggable: true,
    pinnable: true,
    collapsible: true,
    autoHide: !approvalState.isApproved, // Only auto-hide if not explicitly approved
    autoHideDelay: 15000
  });

  // Check if we should show the banner
  useEffect(() => {
    if (isResearchActive && agents.length > 0 && !hasShownForSession) {
      // Auto-show if user has set this preference
      if (approvalState.autoShow && approvalState.rememberChoice) {
        handleApprove();
      } else {
        // Show approval banner
        setTimeout(() => setShowBanner(true), 1000); // Slight delay for better UX
      }
      setHasShownForSession(true);
    } else if (!isResearchActive) {
      // Reset for next session
      setHasShownForSession(false);
      setShowBanner(false);
      popupState.actions.hide();
    }
  }, [isResearchActive, agents.length, hasShownForSession, approvalState.autoShow, approvalState.rememberChoice]);

  const handleApprove = useCallback(() => {
    const newState = { ...approvalState, isApproved: true };
    setApprovalState(newState);
    setShowBanner(false);
    popupState.actions.show();
    onApprovalChange?.(true);
    
    // Store preferences if remember is enabled
    if (newState.rememberChoice) {
      storePreferences({
        autoShow: newState.autoShow,
        rememberChoice: true,
        position: newState.position,
        size: newState.size
      });
    }
  }, [approvalState, popupState.actions, onApprovalChange]);

  const handleDeny = useCallback(() => {
    setApprovalState(prev => ({ ...prev, isApproved: false }));
    setShowBanner(false);
    onApprovalChange?.(false);
    
    // Store denial if remember is enabled
    if (approvalState.rememberChoice) {
      storePreferences({
        autoShow: false,
        rememberChoice: true
      });
    }
  }, [approvalState.rememberChoice, onApprovalChange]);

  const handleShowPreferences = useCallback(() => {
    setApprovalState(prev => ({ ...prev, showPreferences: true }));
  }, []);

  const handlePreferencesChange = useCallback((changes: Partial<ApprovalState>) => {
    setApprovalState(prev => ({ ...prev, ...changes }));
  }, []);

  const handlePreferencesApply = useCallback(() => {
    handleApprove();
    setApprovalState(prev => ({ ...prev, showPreferences: false }));
  }, [handleApprove]);

  const handlePreferencesCancel = useCallback(() => {
    setApprovalState(prev => ({ ...prev, showPreferences: false }));
  }, []);

  const activeAgents = agents.filter(agent => agent.status === 'current');
  
  const popupConfig: PopupConfig = {
    size: approvalState.size,
    variant: 'floating',
    draggable: true,
    pinnable: true,
    collapsible: true,
    autoHide: !approvalState.isApproved,
    autoHideDelay: 15000
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Approval Banner */}
      <AnimatePresence>
        {showBanner && !approvalState.showPreferences && (
          <ApprovalBanner
            onApprove={handleApprove}
            onDeny={handleDeny}
            onShowPreferences={handleShowPreferences}
            agentCount={agents.length}
            activeCount={activeAgents.length}
          />
        )}
      </AnimatePresence>
      
      {/* Preferences Panel */}
      <AnimatePresence>
        {approvalState.showPreferences && (
          <PreferencesPanel
            preferences={approvalState}
            onChange={handlePreferencesChange}
            onApply={handlePreferencesApply}
            onCancel={handlePreferencesCancel}
          />
        )}
      </AnimatePresence>
      
      {/* Agent Status Popup */}
      <AgentStatusPopup
        agents={agents}
        isVisible={popupState.state.isVisible}
        onClose={popupState.actions.hide}
        onMinimize={popupState.actions.minimize}
        onPin={popupState.actions.togglePin}
        config={popupConfig}
      />
    </div>
  );
}

// ============================================================================
// Quick Status Trigger (Alternative compact version)
// ============================================================================

interface QuickStatusTriggerProps {
  agents: AgentStatus[];
  compact?: boolean;
  className?: string;
}

export function QuickStatusTrigger({ 
  agents, 
  compact = false, 
  className 
}: QuickStatusTriggerProps) {
  const [showPopup, setShowPopup] = useState(false);
  
  const activeCount = agents.filter(a => a.status === 'current').length;
  const completedCount = agents.filter(a => a.status === 'completed').length;
  
  if (agents.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={() => setShowPopup(!showPopup)}
        variant="outline"
        size={compact ? "sm" : "default"}
        className={cn(
          "gap-2",
          activeCount > 0 && "border-primary/50 bg-primary/5",
          compact && "text-xs h-7"
        )}
      >
        <Users className={cn("h-4 w-4", compact && "h-3 w-3")} />
        <span>{agents.length} Agents</span>
        {activeCount > 0 && (
          <Badge variant="default" className="gap-1 text-2xs h-4 px-1.5">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
            {activeCount}
          </Badge>
        )}
      </Button>
      
      <AgentStatusPopup
        agents={agents}
        isVisible={showPopup}
        onClose={() => setShowPopup(false)}
        config={{
          size: compact ? 'compact' : 'standard',
          variant: 'floating',
          draggable: true,
          collapsible: true
        }}
      />
    </div>
  );
}

export default AgentPopupApprovalTrigger;