import React from "react";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import { MobileSuggestionCarousel } from "@/components/prompt-kit/mobile-suggestion-carousel";
import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";
import type { SuggestionItem } from "@/data/suggestions";
import { CHAT_SPACING } from "@/utils/spacingConstants";
import { TOUR_STEP_IDS } from "@/components/tour";

/**
 * ChatLayout - Unified layout component for chat start screen
 *
 * Features:
 * - Consistent max-w-3xl (768px) sizing for prompt and suggestions, matching ChatInterface
 * - Responsive design (mobile-first)
 * - Uses spacing constants from design system
 * - Memoized for performance
 *
 * Usage:
 * ```tsx
 * <ChatLayout
 *   input={input}
 *   onInputChange={setInput}
 *   onSubmit={handleSubmit}
 *   suggestions={suggestions}
 *   onSuggestionClick={handleSuggestionClick}
 *   // ... other props
 * />
 * ```
 */

export interface ChatLayoutProps {
  // Input state
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;

  // Suggestions
  suggestions: SuggestionItem[];
  loadingSuggestions: boolean;
  loadingItemId?: string | null;
  onSuggestionClick: (item: SuggestionItem) => void;

  // File upload (optional)
  fileInputRef?: React.RefObject<HTMLInputElement>;
  isUploadingFile?: boolean;
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Modes
  imageMode: boolean;
  onImageModeChange: (value: boolean) => void;
  artifactMode: boolean;
  onArtifactModeChange: (value: boolean) => void;

  // Optional customization
  heading?: string;
  placeholder?: string;
  sendIcon?: "send" | "arrow";

  // Position controls (for debug panel tweaking)
  promptPosition?: number; // Desktop position (% from top)
  mobilePromptPosition?: number; // Mobile position (% from top)
}

/**
 * ChatLayout Component
 * Single source of truth for chat start screen layout
 */
export const ChatLayout = React.memo(({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  suggestions,
  loadingSuggestions,
  loadingItemId,
  onSuggestionClick,
  fileInputRef,
  isUploadingFile = false,
  onFileUpload,
  imageMode,
  onImageModeChange,
  artifactMode,
  onArtifactModeChange,
  heading = "Hi, I'm Vana.",
  placeholder = "Ask anything",
  sendIcon = "right",
  promptPosition = 50, // Default desktop position (50% from top)
  mobilePromptPosition = 58, // Default mobile position (58% from top) - accounts for Safari toolbar
}: ChatLayoutProps) => {
  return (
    <div
      data-chat-layout
      className="relative flex flex-col h-full min-h-[var(--app-height)] w-full overflow-hidden pt-safe pb-safe overscroll-none touch-pan-y"
      style={{
        '--mobile-prompt-position': `${mobilePromptPosition}%`,
        '--desktop-prompt-position': `${promptPosition}%`,
      } as React.CSSProperties}
    >
      {/* Heading - centered in the space above content */}
      <div
        data-chat-heading
        className="flex-1 flex items-center justify-center px-4"
      >
        <h1 className="bg-gradient-to-r from-indigo-200 via-white to-indigo-200 bg-clip-text text-[clamp(1.75rem,min(4vw,5vh),3rem)] font-bold text-transparent">
          {heading}
        </h1>
      </div>

      {/* Bottom content - positioned at locked percentages */}
      {/* Desktop: 63% from top, Mobile: 71% from top */}
      {/* Switches to mobile layout when viewport height < 600px OR width < 768px */}
      <div
        data-chat-content
        className="flex flex-col justify-start p-[clamp(1rem,2vh,2rem)] pb-[calc(2.75rem+env(safe-area-inset-bottom))] md:pb-[clamp(1rem,2vh,2rem)]"
      >
        {/* Mobile Suggestions - ABOVE input on mobile */}
        {/* Slower speed (0.25) for more leisurely browsing */}
        <div id={TOUR_STEP_IDS.SUGGESTIONS} className="md:hidden w-screen -mx-4 overflow-hidden mb-3">
          {loadingSuggestions ? (
            <div
              className="flex items-center justify-center px-4"
              role="status"
              aria-label="Loading suggestions"
            >
              <div className="h-10 w-full max-w-xs bg-muted/20 animate-pulse rounded-full" />
            </div>
          ) : (
            <MobileSuggestionCarousel
              items={suggestions.slice(0, 8)}
              onItemClick={onSuggestionClick}
              loadingItemId={loadingItemId}
              speed={0.25}
            />
          )}
        </div>

        {/* Prompt Input - consistent max-w-3xl sizing to match chat interface */}
        <div className="w-full max-w-3xl mx-auto mb-2 px-4">
          <PromptInput
            id={TOUR_STEP_IDS.CHAT_INPUT}
            value={input}
            onValueChange={onInputChange}
            isLoading={isLoading}
            onSubmit={onSubmit}
            className="w-full relative rounded-xl bg-black p-0 pt-1"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder={placeholder}
                className="min-h-[44px] text-base leading-[1.3] pl-4 pt-3"
                aria-label="Chat input"
              />
              <PromptInputControls
                className="mt-2 px-3 pb-2"
                imageMode={imageMode}
                onImageModeChange={onImageModeChange}
                artifactMode={artifactMode}
                onArtifactModeChange={onArtifactModeChange}
                isLoading={isLoading}
                input={input}
                onSend={onSubmit}
                showFileUpload={!!fileInputRef}
                fileInputRef={fileInputRef}
                isUploadingFile={isUploadingFile}
                onFileUpload={onFileUpload}
                sendIcon={sendIcon}
              />
            </div>
          </PromptInput>
        </div>

        {/* Desktop Suggestions - BELOW input on desktop only */}
        <div id={TOUR_STEP_IDS.SUGGESTIONS} className="hidden md:block w-full max-w-3xl mx-auto py-[clamp(0.25rem,1vh,0.5rem)]">
          {loadingSuggestions ? (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4"
              role="status"
              aria-label="Loading suggestions"
            >
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-muted/20 animate-pulse rounded-lg"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <div className="desktop-carousel overflow-hidden">
              <GalleryHoverCarousel
                heading=""
                className="py-0 bg-transparent"
                onItemClick={onSuggestionClick}
                loadingItemId={loadingItemId}
                items={suggestions}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ChatLayout.displayName = "ChatLayout";
