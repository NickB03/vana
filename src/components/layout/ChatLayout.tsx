import React from "react";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";
import type { SuggestionItem } from "@/data/suggestions";
import { CHAT_SPACING } from "@/utils/spacingConstants";

/**
 * ChatLayout - Unified layout component for chat start screen
 *
 * Features:
 * - Consistent max-w-5xl sizing for both prompt and suggestions
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
  subheading?: string;
  placeholder?: string;
  sendIcon?: "send" | "arrow";
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
  subheading = "Get started by choosing from an idea below or tell me what you want to do in chat",
  placeholder = "Ask anything",
  sendIcon = "send"
}: ChatLayoutProps) => {
  return (
    <div className="flex h-full flex-col items-center justify-between overflow-y-auto p-4 sm:p-8 pt-safe pb-safe">
      {/* Top spacer for vertical centering */}
      <div aria-hidden="true"></div>

      {/* Centered heading */}
      <div className="text-center w-full">
        <h1 className="bg-gradient-primary bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent mb-4">
          {heading}
        </h1>
        <p className="text-foreground/80 text-sm sm:text-base">
          {subheading}
        </p>
      </div>

      {/* Bottom section with prompt and suggestions */}
      <div className="w-full">
        {/* Prompt Input - max-w-5xl for consistency */}
        <div className="w-full max-w-5xl mx-auto mb-6 px-4">
          <PromptInput
            value={input}
            onValueChange={onInputChange}
            isLoading={isLoading}
            onSubmit={onSubmit}
            className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder={placeholder}
                className="min-h-[44px] text-base leading-[1.3] pl-4 pt-3"
                aria-label="Chat input"
              />
              <PromptInputControls
                className="mt-5 px-3 pb-3"
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

        {/* Suggestion Carousel - max-w-5xl to match prompt */}
        <div className="w-full max-w-5xl mx-auto pb-4">
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
            <GalleryHoverCarousel
              heading=""
              className="py-0 bg-transparent"
              onItemClick={onSuggestionClick}
              loadingItemId={loadingItemId}
              items={suggestions}
            />
          )}
        </div>
      </div>
    </div>
  );
});

ChatLayout.displayName = "ChatLayout";
