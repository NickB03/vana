'use client'

import { Button } from '@/components/ui/button'
import { PromptSuggestion } from '@/components/chat/prompt-suggestion'

interface VanaHomePageProps {
  onStartChat?: (prompt: string) => void
}

const capabilities = [
  {
    title: "Content Creation",
    description: "Generate articles, creative writing, and marketing content",
    prompt: "Help me create engaging content for my project"
  },
  {
    title: "Data Analysis", 
    description: "Analyze business data and generate insights",
    prompt: "I need help analyzing data and finding patterns"
  },
  {
    title: "Code Review",
    description: "Review code quality and suggest improvements", 
    prompt: "Please review my code and suggest improvements"
  },
  {
    title: "Project Planning",
    description: "Create roadmaps and strategic plans",
    prompt: "Help me plan and organize my project roadmap"
  },
  {
    title: "Research Synthesis",
    description: "Gather and synthesize information from multiple sources",
    prompt: "I need comprehensive research on a specific topic"
  },
  {
    title: "Problem Solving",
    description: "Break down complex problems and find solutions",
    prompt: "Help me solve a complex problem step by step"
  }
]

export function VanaHomePage({ onStartChat }: VanaHomePageProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8" data-testid="vana-home-page">
      {/* Welcome Section */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">V</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Hi, I'm Vana
          </h1>
          <p className="text-lg text-muted-foreground">
            Your AI assistant platform powered by multiple specialized agents. 
            I can help you with a wide range of tasks through intelligent coordination.
          </p>
        </div>
      </div>
      
      {/* Capability Suggestions */}
      <div className="w-full max-w-4xl">
        <h2 className="text-2xl font-semibold text-center mb-8">How can I help you today?</h2>
        
        <PromptSuggestion.Grid columns={3} className="mb-8">
          {capabilities.map((capability, index) => (
            <PromptSuggestion
              key={index}
              variant="outline"
              onClick={() => onStartChat?.(capability.prompt)}
              className="h-auto p-6 text-left flex flex-col items-start space-y-2 border-2 border-dashed hover:border-solid hover:shadow-md transition-all duration-200"
            >
              <h3 className="font-semibold text-card-foreground">{capability.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{capability.description}</p>
              <div className="w-full pt-2">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Get Started →
                </Button>
              </div>
            </PromptSuggestion>
          ))}
        </PromptSuggestion.Grid>
        
        {/* Quick Start Section */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Or start with a custom prompt
          </p>
          <Button 
            size="lg"
            onClick={() => onStartChat?.("Hello Vana, I'd like to start a conversation.")}
            data-testid="start-chat-button"
          >
            Start New Conversation
          </Button>
        </div>
      </div>
    </div>
  )
}

export default VanaHomePage