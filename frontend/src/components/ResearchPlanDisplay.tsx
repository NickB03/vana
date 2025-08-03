import { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ResearchPlanDisplayProps {
  plan: string
  onStart: () => void
  onEdit: (editedPlan: string) => void
  className?: string
}

export function ResearchPlanDisplay({
  plan,
  onStart,
  onEdit,
  className
}: ResearchPlanDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState(plan)

  const handleSave = () => {
    onEdit(editedPlan)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedPlan(plan)
    setIsEditing(false)
  }

  // Extract the plan content (remove the RESEARCH PLAN: header if present)
  const planContent = plan.replace(/^RESEARCH PLAN:?\s*/i, '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full", className)}
    >
      {/* Plan Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[var(--accent-purple)]" />
        <h3 className="text-sm font-medium text-gray-300">Research Plan</h3>
      </div>

      {/* Plan Content Box */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
        {!isEditing ? (
          <div className="space-y-2">
            {planContent.split('\n').filter(line => line.trim()).map((line, index) => (
              <div key={index} className="flex items-start gap-2">
                {line.trim().startsWith('-') || line.trim().startsWith('•') ? (
                  <>
                    <span className="text-[var(--accent-blue)] mt-0.5">•</span>
                    <span className="text-sm text-gray-300 flex-1">
                      {line.replace(/^[-•]\s*/, '').trim()}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-300 w-full">{line}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <textarea
            value={editedPlan}
            onChange={(e) => setEditedPlan(e.target.value)}
            className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                     text-sm text-gray-300 resize-none
                     focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
            placeholder="Edit the research plan..."
            autoFocus
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isEditing ? (
          <>
            <Button
              onClick={onStart}
              className="flex-1 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 
                       text-white font-medium"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Research
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="flex-1 border-gray-700 hover:bg-gray-800 text-gray-300"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Plan
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleSave}
              className="flex-1 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80"
            >
              Save Changes
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 text-center mt-3">
        Review the research plan above, then click "Start Research" to proceed
      </p>
    </motion.div>
  )
}