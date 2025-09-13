"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Bot, Users, Search, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Activity Feed Types
export interface ActivityItem {
  id: string
  type: 'plan' | 'agent' | 'phase' | 'result'
  title: string
  description: string
  timestamp: Date
  status: 'pending' | 'current' | 'completed'
  agent?: {
    name: string
    avatar?: string
    role: string
  }
  metadata?: Record<string, unknown>
}

export interface ActivityFeedProps {
  activities: ActivityItem[]
  onConfirm?: (activityId: string) => void
  onCancel?: (activityId: string) => void
  className?: string
}

// Activity Item Component
function ActivityItemComponent({ activity, onConfirm, onCancel }: { 
  activity: ActivityItem
  onConfirm?: (activityId: string) => void
  onCancel?: (activityId: string) => void
}) {
  const getStatusIcon = () => {
    switch (activity.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'current':
        return <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = () => {
    switch (activity.status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case 'current':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <Card className={cn(
      "mb-3 transition-all duration-200",
      activity.status === 'current' && "ring-2 ring-blue-200 border-blue-300"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar or Icon */}
          {activity.agent ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.agent.avatar} />
              <AvatarFallback className="text-xs bg-blue-100">
                {activity.agent.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              {getStatusIcon()}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{activity.title}</h4>
              {getStatusBadge()}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activity.description}
            </p>

            {activity.agent && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>{activity.agent.name} • {activity.agent.role}</span>
              </div>
            )}

            {/* Research Plan Confirmation */}
            {activity.type === 'plan' && activity.status === 'current' && (
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onConfirm?.(activity.id)}
                  className="gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  Looks good, proceed
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onCancel?.(activity.id)}
                >
                  Modify plan
                </Button>
              </div>
            )}

            <div className="text-xs text-gray-400">
              {activity.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Activity Feed Component
export function ActivityFeed({ activities, onConfirm, onCancel, className }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">No research activities yet</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-0 max-h-96 overflow-y-auto", className)}>
      {activities.map((activity) => (
        <ActivityItemComponent
          key={activity.id}
          activity={activity}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ))}
    </div>
  )
}

export default ActivityFeed