/**
 * PromptInputControls - Shared component for chat input action buttons
 *
 * Consolidates duplicated button logic from ChatInterface and Home components.
 * Provides a flexible interface for image mode, create/canvas, and send actions.
 *
 * Features:
 * - Image mode toggle (ImagePlus button)
 * - Create/Canvas toggle (WandSparkles button)
 * - File upload button (optional)
 * - Send button with loading state
 * - Tooltip support for all actions
 * - TypeScript type safety
 *
 * @example
 * ```tsx
 * <PromptInputControls
 *   imageMode={imageMode}
 *   onImageModeChange={setImageMode}
 *   isCanvasOpen={isCanvasOpen}
 *   currentArtifact={currentArtifact}
 *   onCreateClick={handleCreateClick}
 *   isLoading={isLoading}
 *   input={input}
 *   onSend={handleSend}
 *   showFileUpload={true}
 *   fileInputRef={fileInputRef}
 *   isUploadingFile={isUploadingFile}
 *   onFileUpload={handleFileUpload}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, WandSparkles, ImagePlus, ArrowUp, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptInputAction } from "@/components/prompt-kit/prompt-input";
import React from "react";
import { TOUR_STEP_IDS } from "@/components/tour";

export interface PromptInputControlsProps {
  // Image mode control
  imageMode?: boolean;
  onImageModeChange?: (enabled: boolean) => void;

  // Artifact mode control
  artifactMode?: boolean;
  onArtifactModeChange?: (enabled: boolean) => void;

  // Canvas/Create control (legacy - kept for backward compatibility)
  isCanvasOpen?: boolean;
  currentArtifact?: unknown; // Can be null/undefined or an artifact object
  onCreateClick?: () => void;

  // Send button control
  isLoading?: boolean;
  isStreaming?: boolean;
  input?: string;
  onSend?: () => void;
  onStop?: () => void; // Stream cancellation callback

  // File upload control (optional - only shown when provided)
  showFileUpload?: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  isUploadingFile?: boolean;
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Customization
  sendIcon?: "arrow" | "send"; // Different send icons for different contexts
  className?: string;
}

/**
 * Shared control buttons for prompt input
 * Consolidates ImagePlus, WandSparkles, and Send button logic
 */
export function PromptInputControls({
  imageMode = false,
  onImageModeChange,
  artifactMode = false,
  onArtifactModeChange,
  isCanvasOpen = false,
  currentArtifact,
  onCreateClick,
  isLoading = false,
  isStreaming = false,
  input = "",
  onSend,
  onStop,
  showFileUpload = false,
  fileInputRef,
  isUploadingFile = false,
  onFileUpload,
  sendIcon = "arrow",
  className,
}: PromptInputControlsProps) {
  const isButtonLoading = isLoading || isStreaming;
  const SendIcon = sendIcon === "arrow" ? ArrowUp : Send;

  return (
    <div className={cn("flex w-full items-center justify-between gap-2", className)}>
      {/* Left side actions */}
      <div className="flex items-center gap-2">
        {/* File upload button - only shown when enabled */}
        {showFileUpload && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={() => fileInputRef?.current?.click()}
                  disabled={isUploadingFile}
                >
                  {isUploadingFile ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Plus size={18} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload file</TooltipContent>
            </Tooltip>

            {fileInputRef && (
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileUpload}
                accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.svg,.csv,.json,.xlsx,.js,.ts,.tsx,.jsx,.py,.html,.css,.mp3,.wav,.m4a,.ogg"
              />
            )}
          </>
        )}

        {/* Image mode toggle */}
        {onImageModeChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id={TOUR_STEP_IDS.IMAGE_MODE}
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 rounded-full transition-all duration-200",
                  imageMode
                    ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-400/60 hover:bg-blue-600 hover:ring-blue-500/70"
                    : "hover:bg-accent"
                )}
                onClick={() => {
                  console.log("ImagePlus clicked, current imageMode:", imageMode);
                  if (!imageMode) {
                    onArtifactModeChange?.(false);
                  }
                  onImageModeChange(!imageMode);
                  console.log("ImagePlus toggled to:", !imageMode);
                }}
              >
                <ImagePlus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {imageMode ? "Image mode enabled" : "Enable image mode"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Artifact mode toggle */}
        {(onArtifactModeChange || onCreateClick) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id={TOUR_STEP_IDS.ARTIFACT_MODE}
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 rounded-full transition-all duration-200",
                  onArtifactModeChange
                    ? artifactMode
                      ? "bg-purple-500 text-white shadow-lg ring-2 ring-purple-400/60 hover:bg-purple-600 hover:ring-purple-500/70"
                      : "hover:bg-accent"
                    : isCanvasOpen && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={() => {
                  if (onArtifactModeChange) {
                    console.log("WandSparkles clicked, current artifactMode:", artifactMode);
                    if (!artifactMode) {
                      onImageModeChange?.(false);
                    }
                    onArtifactModeChange(!artifactMode);
                    console.log("WandSparkles toggled to:", !artifactMode);
                  } else if (onCreateClick) {
                    onCreateClick();
                  }
                }}
                disabled={onCreateClick && !onArtifactModeChange && !currentArtifact && isCanvasOpen}
              >
                <WandSparkles size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {onArtifactModeChange
                ? (artifactMode ? "Artifact mode enabled" : "Enable artifact mode")
                : (!currentArtifact
                  ? "Create"
                  : isCanvasOpen
                    ? "Close canvas"
                    : "Open canvas")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Right side - Send/Stop button */}
      {isStreaming && onStop ? (
        // Stop button during streaming - neutral styling to match action buttons
        <PromptInputAction tooltip="Stop generating">
          <Button
            type="button"
            size="icon"
            className="size-9 rounded-full bg-muted/80 hover:bg-muted border border-border/50 transition-all duration-200"
            onClick={onStop}
            data-testid="stop-button"
          >
            <Square size={18} className="text-muted-foreground" />
          </Button>
        </PromptInputAction>
      ) : (
        // Send button when not streaming
        <PromptInputAction tooltip="Send message">
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isButtonLoading}
            className="size-9 rounded-full hover:brightness-115 hover:-translate-y-1 transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))',
              boxShadow: '0 4px 14px hsl(var(--accent-primary) / 0.4)',
            }}
            onClick={onSend}
            data-testid="send-button"
          >
            {isLoading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendIcon size={18} className="text-white" />
            )}
          </Button>
        </PromptInputAction>
      )}
    </div>
  );
}
