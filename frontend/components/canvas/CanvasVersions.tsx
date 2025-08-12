'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  History, 
  Plus, 
  Clock, 
  User, 
  Bot,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'
import type { CanvasVersion } from '@/types/canvas'

export function CanvasVersions() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { versions, createVersion, loadVersion, deleteVersion } = useCanvasStore()

  const handleCreateVersion = () => {
    const description = `Manual save point - ${new Date().toLocaleString()}`
    createVersion(description)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getAuthorIcon = (author: CanvasVersion['author']) => {
    switch (author) {
      case 'user':
        return <User className="w-3 h-3" />
      case 'agent':
        return <Bot className="w-3 h-3" />
      case 'system':
        return <Clock className="w-3 h-3" />
      default:
        return <User className="w-3 h-3" />
    }
  }

  const getAuthorColor = (author: CanvasVersion['author']) => {
    switch (author) {
      case 'user':
        return 'bg-blue-500'
      case 'agent':
        return 'bg-purple-500'
      case 'system':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-2">
      {/* Header with toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-xs"
      >
        <div className="flex items-center gap-2">
          <History className="w-3 h-3" />
          <span>Versions ({versions.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-3">
                {/* Create new version button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateVersion}
                  className="w-full text-xs"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Save Version
                </Button>

                <Separator />

                {/* Versions list */}
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No saved versions yet
                      </p>
                    ) : (
                      versions.map((version, index) => (
                        <motion.div
                          key={version.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-2 border rounded-md bg-background/50 hover:bg-background transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {/* Author indicator */}
                              <div 
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${getAuthorColor(version.author)}`}
                              >
                                {getAuthorIcon(version.author)}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                {/* Version info */}
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {version.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(version.timestamp)}
                                  </span>
                                </div>
                                
                                {/* Description */}
                                {version.description && (
                                  <p className="text-xs text-foreground truncate">
                                    {version.description}
                                  </p>
                                )}
                                
                                {/* Content preview */}
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {version.content.substring(0, 50)}...
                                </p>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => loadVersion(version.id)}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => deleteVersion(version.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {versions.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground text-center">
                      Click to restore • Delete to remove
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}