"use client"

import React, { useState } from "react"
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/ui/prompt-input"
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

// Simple example for quick testing
const suggestions = [
  "Explain AI to me",
  "Write a poem",
  "Help me code",
  "Plan my day",
  "Tell me a joke"
]

export function SimplePromptSuggestionExample() {
  const [input, setInput] = useState("")

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const handleSubmit = () => {
    console.log("Submitted:", input)
    alert(`You submitted: "${input}"`)
    setInput("")
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Simple Prompt Suggestions</h1>
        <p className="text-muted-foreground">
          Click a suggestion to populate the input, then submit
        </p>
      </div>

      {/* Main Input */}
      <PromptInput
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea placeholder="Type your message or click a suggestion..." />
        <PromptInputActions>
          <PromptInputAction tooltip="Send message">
            <Button size="sm" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      {/* Suggestions */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Quick Suggestions:</h3>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <PromptSuggestion
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              variant="outline"
            >
              {suggestion}
            </PromptSuggestion>
          ))}
        </div>
      </div>

      {/* Search Example */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Search with Highlighting:</h3>
        <input
          type="text"
          placeholder="Type to see highlighting..."
          className="w-full p-2 border rounded"
          onChange={(e) => {
            const searchTerm = e.target.value
            // This would filter suggestions in a real app
          }}
        />
        <div className="space-y-2">
          <PromptSuggestion
            highlight="AI"
            onClick={() => handleSuggestionClick("Explain AI to me")}
            className="w-full justify-start"
          >
            Explain AI to me
          </PromptSuggestion>
          <PromptSuggestion
            highlight="code"
            onClick={() => handleSuggestionClick("Help me code")}
            className="w-full justify-start"
          >
            Help me code
          </PromptSuggestion>
        </div>
      </div>
    </div>
  )
}

export default SimplePromptSuggestionExample