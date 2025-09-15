"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  FileText, 
  BarChart3, 
  Lightbulb,
  TrendingUp,
  BookOpen,
  Zap,
  Globe
} from "lucide-react"

interface Suggestion {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: "research" | "analysis" | "creative" | "learning"
}

interface WelcomeSuggestionsProps {
  suggestions?: Suggestion[]
  onSelectSuggestion: (suggestion: string) => void
  className?: string
  maxDisplay?: number
}

const defaultSuggestions: Suggestion[] = [
  {
    id: "market-research",
    title: "Market Research",
    description: "Analyze industry trends and competitive landscape",
    icon: TrendingUp,
    category: "research"
  },
  {
    id: "document-analysis",
    title: "Document Analysis",
    description: "Extract insights from reports and papers",
    icon: FileText,
    category: "analysis"
  },
  {
    id: "data-visualization",
    title: "Data Insights",
    description: "Transform data into actionable insights",
    icon: BarChart3,
    category: "analysis"
  },
  {
    id: "creative-brainstorm",
    title: "Creative Brainstorming",
    description: "Generate innovative ideas and solutions",
    icon: Lightbulb,
    category: "creative"
  },
  {
    id: "learning-path",
    title: "Learning Guide",
    description: "Create personalized learning roadmaps",
    icon: BookOpen,
    category: "learning"
  },
  {
    id: "quick-research",
    title: "Quick Research",
    description: "Get rapid insights on any topic",
    icon: Search,
    category: "research"
  }
]

const categoryColors = {
  research: "from-blue-500 to-cyan-500",
  analysis: "from-green-500 to-emerald-500", 
  creative: "from-purple-500 to-pink-500",
  learning: "from-orange-500 to-red-500"
}

export function WelcomeSuggestions({
  suggestions = defaultSuggestions,
  onSelectSuggestion,
  className,
  maxDisplay = 6
}: WelcomeSuggestionsProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  
  const displaySuggestions = suggestions.slice(0, maxDisplay)

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onSelectSuggestion(suggestion.title)
  }

  const handleKeyDown = (e: React.KeyboardEvent, suggestion: Suggestion) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSuggestionClick(suggestion)
    }
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          What would you like to explore?
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a suggestion below or type your own question
        </p>
      </div>

      {/* Suggestions Grid */}
      <div className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        maxDisplay <= 4 && "lg:grid-cols-2 xl:grid-cols-4",
        maxDisplay <= 2 && "lg:grid-cols-2"
      )}>
        {displaySuggestions.map((suggestion, index) => {
          const Icon = suggestion.icon
          const isHovered = hoveredId === suggestion.id
          
          return (
            <Button
              key={suggestion.id}
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion)}
              onKeyDown={(e) => handleKeyDown(e, suggestion)}
              onMouseEnter={() => setHoveredId(suggestion.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "h-auto p-4 justify-start text-left",
                "transition-all duration-200 ease-out",
                "hover:shadow-lg hover:-translate-y-1",
                "focus:shadow-lg focus:-translate-y-1 focus:ring-2 focus:ring-primary/20",
                "border-border hover:border-primary/20",
                "group relative overflow-hidden",
                isHovered && "border-primary/30"
              )}
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              {/* Background Gradient on Hover */}
              <div 
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity duration-300",
                  `bg-gradient-to-br ${categoryColors[suggestion.category]}`,
                  isHovered && "opacity-5"
                )}
              />
              
              {/* Content */}
              <div className="relative flex items-start gap-3 w-full">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-colors duration-200",
                  "bg-muted group-hover:bg-primary/10",
                  isHovered && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    "text-muted-foreground group-hover:text-primary",
                    isHovered && "text-primary"
                  )} />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm mb-1 transition-colors duration-200",
                    "group-hover:text-foreground",
                    isHovered && "text-foreground"
                  )}>
                    {suggestion.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
                
                {/* Arrow Indicator */}
                <div className={cn(
                  "flex-shrink-0 opacity-0 transition-all duration-200",
                  "transform translate-x-1",
                  isHovered && "opacity-100 translate-x-0"
                )}>
                  <Zap className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Button>
          )
        })}
      </div>

      {/* Additional Action */}
      <div className="text-center mt-8">
        <Button
          variant="ghost"
          onClick={() => onSelectSuggestion("Tell me more about Vana's capabilities")}
          className="text-sm text-muted-foreground hover:text-foreground gap-2"
        >
          <Globe className="h-4 w-4" />
          Or ask me anything else...
        </Button>
      </div>
    </div>
  )
}