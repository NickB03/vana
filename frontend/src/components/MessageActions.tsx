import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Copy, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Share, 
  Download, 
  BookmarkPlus,
  MoreHorizontal,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  content: string
  messageId?: string
  onCopy?: () => void
  onRegenerate?: () => void
  onFeedback?: (type: 'positive' | 'negative', feedback?: string) => void
  onShare?: () => void
  onSave?: () => void
  className?: string
  isVisible?: boolean
}

export function MessageActions({
  content,
  messageId,
  onCopy,
  onRegenerate,
  onFeedback,
  onShare,
  onSave,
  className,
  isVisible = false
}: MessageActionsProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [copiedRecently, setCopiedRecently] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedRecently(true)
      onCopy?.()
      
      setTimeout(() => setCopiedRecently(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (type === 'positive') {
      // For positive feedback, submit immediately
      onFeedback?.(type)
      setFeedbackType(type)
      setTimeout(() => setFeedbackType(null), 2000)
    } else {
      // For negative feedback, show text input
      setFeedbackType(type)
      setShowFeedback(true)
    }
  }

  const submitFeedback = () => {
    if (feedbackType) {
      onFeedback?.(feedbackType, feedbackText)
      setShowFeedback(false)
      setFeedbackText('')
      // Keep the feedback type visible briefly
      setTimeout(() => setFeedbackType(null), 2000)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: content,
          title: 'AI Response'
        })
      } catch (error) {
        console.log('Share canceled or failed')
      }
    } else {
      // Fallback to copy
      handleCopy()
    }
    onShare?.()
  }

  const handleSave = () => {
    // Create a download link for the content
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-response-${messageId || Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onSave?.()
  }

  return (
    <div className={cn("relative", className)}>
      {/* Main action buttons */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg p-1 shadow-lg"
          >
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={cn(
                "p-2 rounded hover:bg-[var(--bg-input)] transition-colors relative",
                "min-h-[32px] min-w-[32px] flex items-center justify-center",
                copiedRecently && "text-[var(--vana-success)]"
              )}
              title="Copy message"
              aria-label="Copy message"
            >
              <AnimatePresence mode="wait">
                {copiedRecently ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Regenerate button */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-2 rounded hover:bg-[var(--bg-input)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Feedback buttons */}
            {onFeedback && (
              <>
                <button
                  onClick={() => handleFeedback('positive')}
                  className={cn(
                    "p-2 rounded hover:bg-[var(--bg-input)] transition-colors",
                    "min-h-[32px] min-w-[32px] flex items-center justify-center",
                    feedbackType === 'positive' && "text-[var(--vana-success)]"
                  )}
                  title="Good response"
                  aria-label="Mark as good response"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleFeedback('negative')}
                  className={cn(
                    "p-2 rounded hover:bg-[var(--bg-input)] transition-colors",
                    "min-h-[32px] min-w-[32px] flex items-center justify-center",
                    feedbackType === 'negative' && "text-[var(--accent-red)]"
                  )}
                  title="Needs improvement"
                  aria-label="Mark as needs improvement"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </>
            )}

            {/* More actions */}
            <button
              onClick={() => setShowMore(!showMore)}
              className="p-2 rounded hover:bg-[var(--bg-input)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* More actions menu */}
      <AnimatePresence>
        {showMore && isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg shadow-lg min-w-[120px] py-1 z-10"
          >
            {onShare && (
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-input)] transition-colors"
              >
                <Share className="w-4 h-4" />
                Share
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-input)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Save
            </button>
            
            {onSave && (
              <button
                onClick={onSave}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-input)] transition-colors"
              >
                <BookmarkPlus className="w-4 h-4" />
                Bookmark
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback input */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg shadow-lg p-3 min-w-[280px] z-20"
          >
            <h4 className="text-sm font-medium mb-2">What could be improved?</h4>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Your feedback helps improve responses..."
              className="w-full p-2 text-sm bg-[var(--bg-input)] border border-[var(--border-primary)] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={submitFeedback}
                className="px-3 py-1 text-xs bg-[var(--accent-blue)] text-white rounded hover:bg-[var(--accent-blue)]/80 transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false)
                  setFeedbackText('')
                  setFeedbackType(null)
                }}
                className="px-3 py-1 text-xs border border-[var(--border-primary)] rounded hover:bg-[var(--bg-input)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {(showMore || showFeedback) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => {
            setShowMore(false)
            setShowFeedback(false)
            setFeedbackText('')
          }}
        />
      )}
    </div>
  )
}