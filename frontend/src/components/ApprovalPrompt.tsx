import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Edit3, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ApprovalPromptProps {
  isVisible: boolean
  message: string
  onApprove: () => void
  onReject: () => void
  onModify: (feedback: string) => void
  className?: string
}

export function ApprovalPrompt({
  isVisible,
  message,
  onApprove,
  onReject,
  onModify,
  className
}: ApprovalPromptProps) {
  const [showModifyInput, setShowModifyInput] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleApprove = () => {
    onApprove()
    setShowModifyInput(false)
    setFeedback('')
  }

  const handleReject = () => {
    onReject()
    setShowModifyInput(false)
    setFeedback('')
  }

  const handleModify = () => {
    if (feedback.trim()) {
      onModify(feedback)
      setShowModifyInput(false)
      setFeedback('')
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
            "bg-black/90 backdrop-blur-xl border border-[var(--border-primary)]",
            "rounded-2xl shadow-2xl shadow-purple-500/20",
            "max-w-2xl w-full mx-4",
            className
          )}
        >
          {/* Header with pulsing indicator */}
          <div className="flex items-center gap-3 p-4 pb-2">
            <div className="relative">
              <Sparkles className="w-6 h-6 text-[var(--accent-purple)]" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="w-6 h-6 text-[var(--accent-purple)] opacity-50" />
              </div>
            </div>
            <h3 className="text-lg font-medium gradient-text-animated">
              Agent Needs Your Input
            </h3>
          </div>

          {/* Message */}
          <div className="px-4 pb-3">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>

          {/* Action buttons */}
          <div className="p-4 pt-2 border-t border-[var(--border-primary)]">
            {!showModifyInput ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Run
                </Button>
                
                <Button
                  onClick={() => setShowModifyInput(true)}
                  variant="outline"
                  className="flex-1 border-[var(--border-primary)] hover:bg-[var(--bg-element)]"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Suggest Changes
                </Button>
                
                <Button
                  onClick={handleReject}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what changes you'd like..."
                  className="w-full px-3 py-2 bg-[var(--bg-element)] border border-[var(--border-primary)] 
                           rounded-lg text-sm text-white placeholder-gray-500 resize-none
                           focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleModify}
                    disabled={!feedback.trim()}
                    className="flex-1 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
                  >
                    Submit Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setShowModifyInput(false)
                      setFeedback('')
                    }}
                    variant="outline"
                    className="border-[var(--border-primary)]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick approval shortcuts */}
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 text-center">
              Quick responses: Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">Y</kbd> to approve, 
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs ml-1">N</kbd> to reject, 
              or <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs ml-1">M</kbd> to modify
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}