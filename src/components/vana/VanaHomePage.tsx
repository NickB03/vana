'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from '@/components/ui/prompt-input'
import { Plus, Globe, MoreHorizontal, Mic, ArrowUp } from 'lucide-react'

interface VanaHomePageProps {
  onStartChat: (prompt: string) => void
  isBusy?: boolean
}

const capabilities = [
  "Content Creation",
  "Data Analysis", 
  "Code Review",
  "Project Planning",
  "Research Synthesis",
  "Problem Solving"
]

export function VanaHomePage({ onStartChat, isBusy = false }: VanaHomePageProps) {
  const [promptValue, setPromptValue] = useState('')

  // Use ref to access onStartChat without dependency
  const onStartChatRef = useRef(onStartChat)
  onStartChatRef.current = onStartChat
  
  const handlePromptSubmit = useCallback(() => {
    if (promptValue.trim()) {
      onStartChatRef.current(promptValue)
      setPromptValue('')
    }
  }, [promptValue])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    const prompt = `Help me with ${suggestion.toLowerCase()}`
    onStartChatRef.current(prompt)
  }, [])

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
        <PromptInput
          value={promptValue}
          onValueChange={setPromptValue}
          onSubmit={handlePromptSubmit}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder="What can I help you with today?"
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Add a new action">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Plus size={18} />
                  </Button>
                </PromptInputAction>

                <PromptInputAction tooltip="Search">
                  <Button variant="outline" className="rounded-full">
                    <Globe size={18} />
                    Search
                  </Button>
                </PromptInputAction>

                <PromptInputAction tooltip="More actions">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <MoreHorizontal size={18} />
                  </Button>
                </PromptInputAction>
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

                <Button
                  size="icon"
                  disabled={!promptValue.trim() || isBusy}
                  onClick={handlePromptSubmit}
                  className="size-9 rounded-full"
                >
                  <ArrowUp size={18} />
                </Button>
              </div>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
      
      {/* Compact Capability Suggestions */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted-foreground text-center mb-4">
          Or try one of these:
        </p>
        
        <div className="flex flex-wrap gap-2 justify-center">
          {capabilities.map((capability, index) => (
            <PromptSuggestion
              key={index}
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
    </div>
  )
}

export default VanaHomePage
