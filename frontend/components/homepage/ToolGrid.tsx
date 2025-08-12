'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ToolOption } from '@/types'

interface ToolGridProps {
  tools: ToolOption[]
  onToolClick: (tool: ToolOption) => void
}

export function ToolGrid({ tools, onToolClick }: ToolGridProps) {
  // Show only featured tools in 2x2 grid (Gemini style)
  const featuredTools = tools.filter(tool => tool.featured).slice(0, 4)

  return (
    <motion.div 
      className="space-y-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {featuredTools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <div 
              className="gemini-card cursor-pointer group p-4 min-h-[100px] flex items-start gap-3"
              onClick={() => onToolClick(tool)}
            >
              <div className="flex-shrink-0 text-xl opacity-80">
                {tool.icon}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#e3e3e3] text-sm leading-snug">
                    {tool.name}
                  </h3>
                  {tool.shortcut && (
                    <span className="text-xs px-1.5 py-0.5 bg-[#3a3b3c] text-[#9aa0a6] rounded font-mono">
                      {tool.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#9aa0a6] leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}