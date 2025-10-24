'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, usePromptInput } from '@/components/prompt-kit/prompt-input'
import { FileUpload, FileUploadTrigger } from '@/components/ui/file-upload'
import { Plus, Mic, ArrowUp } from 'lucide-react'
import { memoWithTracking, useStableCallback, useStableArray } from '@/lib/react-performance'
import { RateLimitNoticeCompact } from '@/components/RateLimitNotice'

interface VanaHomePageProps {
  onStartChat: (prompt: string) => void
  isBusy?: boolean
  autoFocus?: boolean
}

const capabilities = [
  "Content Creation",
  "Data Analysis",
  "Code Review",
  "Project Planning",
  "Research Synthesis",
  "Problem Solving"
]

// Inner component that uses the PromptInput context to handle auto-focus
function PromptInputContent({ autoFocus, handleFilesAdded, submitButtonProps }: {
  autoFocus: boolean
  handleFilesAdded: (files: File[]) => void
  submitButtonProps: any
}) {
  const { focusInput } = usePromptInput()

  // Auto-focus the textarea when autoFocus prop is true
  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        focusInput()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [autoFocus, focusInput])

  return (
    <div className="flex flex-col">
      <PromptInputTextarea
        placeholder="What can I help you with today?"
        className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
      />

      <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
        <div className="flex items-center gap-2">
          <FileUpload onFilesAdded={handleFilesAdded} accept="*">
            <FileUploadTrigger>
              <PromptInputAction tooltip="Upload files">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full"
                >
                  <Plus size={18} />
                </Button>
              </PromptInputAction>
            </FileUploadTrigger>
          </FileUpload>
        </div>
        <div className="flex items-center gap-2">
          <PromptInputAction tooltip="Voice input">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
            >
              <Mic size={18} />
            </Button>
          </PromptInputAction>

          <Button {...submitButtonProps}>
            <ArrowUp size={18} />
          </Button>
        </div>
      </PromptInputActions>
    </div>
  )
}

function VanaHomePage({ onStartChat, isBusy = false, autoFocus = false }: VanaHomePageProps) {
  const [promptValue, setPromptValue] = useState('')

  // Stabilize the capabilities array to prevent re-renders
  const stableCapabilities = useStableArray(capabilities)

  // Use stable callback to prevent re-renders from function identity changes
  const handlePromptSubmit = useStableCallback(() => {
    if (promptValue.trim()) {
      onStartChat(promptValue)
      setPromptValue('')
    }
  }, [promptValue, onStartChat])

  const handleSuggestionClick = useStableCallback((suggestion: string) => {
    const prompt = `Help me with ${suggestion.toLowerCase()}`
    setPromptValue(prompt)
  }, [])

  const handleFilesAdded = useStableCallback((files: File[]) => {
    // For now, just log the files - in a real implementation, you'd upload them
    console.log('Files added:', files)
    // You could append file names to the prompt or handle upload logic here
    const fileNames = files.map(f => f.name).join(', ')
    setPromptValue(prev => prev ? `${prev}\n\nFiles: ${fileNames}` : `Files: ${fileNames}`)
  }, [])

  // Memoize input props to prevent PromptInput re-renders
  const promptInputProps = useMemo(() => ({
    value: promptValue,
    onValueChange: setPromptValue,
    onSubmit: handlePromptSubmit,
    className: "border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
  }), [promptValue, handlePromptSubmit])

  // Memoize button props
  const submitButtonProps = useMemo(() => ({
    size: "icon" as const,
    disabled: !promptValue.trim() || isBusy,
    onClick: handlePromptSubmit,
    className: "size-9 rounded-full"
  }), [promptValue, isBusy, handlePromptSubmit])

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto" data-testid="vana-home-page">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">V</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Hi, I'm Vana
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your AI assistant platform powered by multiple specialized agents.
            I can help you with a wide range of tasks through intelligent coordination.
          </p>
        </div>
      </div>

      {/* Main Prompt Input */}
      <div className="w-full max-w-2xl mb-8">
        <PromptInput {...promptInputProps}>
          <PromptInputContent
            autoFocus={autoFocus}
            handleFilesAdded={handleFilesAdded}
            submitButtonProps={submitButtonProps}
          />
        </PromptInput>
      </div>

      {/* Compact Capability Suggestions */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted-foreground text-center mb-4">
          Or try one of these:
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {stableCapabilities.map((capability) => (
            <PromptSuggestion
              key={capability} // Use capability as key instead of index for better React reconciliation
              size="sm"
              variant="outline"
              onClick={() => handleSuggestionClick(capability)}
              className="text-sm"
            >
              {capability}
            </PromptSuggestion>
          ))}
        </div>
      </div>

      {/* Phase 3.3: Rate Limit Notice for Portfolio Demo */}
      <div className="w-full max-w-2xl mt-6">
        <RateLimitNoticeCompact />
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedVanaHomePage = memoWithTracking(
  VanaHomePage,
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if onStartChat function identity, isBusy, or autoFocus changes
    return prevProps.onStartChat === nextProps.onStartChat &&
           prevProps.isBusy === nextProps.isBusy &&
           prevProps.autoFocus === nextProps.autoFocus;
  },
  'VanaHomePage'
);

export { MemoizedVanaHomePage as VanaHomePage };
export default MemoizedVanaHomePage;
