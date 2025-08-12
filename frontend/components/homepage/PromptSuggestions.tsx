'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PromptSuggestion } from '@/types'

interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[]
  onSuggestionClick: (suggestion: PromptSuggestion) => void
}

export function PromptSuggestions({ suggestions, onSuggestionClick }: PromptSuggestionsProps) {
  // Always show first 4 suggestions in 2x2 grid (Gemini style)
  const displaySuggestions = suggestions.slice(0, 4)

  return (
    <motion.div 
      className="space-y-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displaySuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div 
              className="gemini-card cursor-pointer group p-4 min-h-[100px] flex items-start gap-3"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <div className="flex-shrink-0 text-xl opacity-80">
                {suggestion.icon}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium text-[#e3e3e3] text-sm leading-snug">
                  {suggestion.title}
                </h3>
                {suggestion.description && (
                  <p className="text-xs text-[#9aa0a6] leading-relaxed line-clamp-2">
                    {suggestion.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}