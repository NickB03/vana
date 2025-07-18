import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Brain, Zap, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  icon: string;
  summary: string;
  detail?: string;
  timing?: number;
  status?: 'active' | 'complete' | 'pending';
}

interface ThinkingPanelProps {
  steps: ThinkingStep[];
  isThinking: boolean;
  className?: string;
}

export function ThinkingPanel({ steps, isThinking, className }: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

  // Don't show if no steps
  if (steps.length === 0 && !isThinking) return null;

  return (
    <div className={cn("border border-[var(--border-primary)] rounded-lg p-3 mb-4 bg-[var(--bg-input)]", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium hover:bg-[var(--sidebar-hover-bg)] p-2 rounded transition-colors"
        data-testid="thinking-toggle"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[var(--accent-blue)]" />
          <span className="text-[var(--text-primary)]">
            {isThinking ? "VANA is thinking..." : `VANA's thought process (${steps.length} steps)`}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
      </button>

      {isExpanded && (
        <div 
          className="mt-3 space-y-2 px-2"
          data-testid="thinking-panel"
        >
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 text-sm",
                step.status === 'active' && "animate-pulse"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : step.status === 'active' ? (
                  <Zap className="h-4 w-4 text-yellow-500" />
                ) : step.status === 'pending' ? (
                  <Clock className="h-4 w-4 text-gray-400" />
                ) : (
                  <span className="text-lg">{step.icon}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="font-medium text-[var(--text-primary)]">
                  {step.summary}
                </div>
                {step.detail && (
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {step.detail}
                  </div>
                )}
              </div>

              {step.timing && (
                <div className="flex-shrink-0 text-xs text-[var(--text-secondary)]">
                  {step.timing}ms
                </div>
              )}
            </div>
          ))}

          {isThinking && steps.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--accent-blue)]"></div>
              <span>Analyzing your request...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Example thinking flow for demonstration
export const exampleThinking: ThinkingStep[] = [
  { 
    icon: "🎯", 
    summary: "Analyzing request", 
    timing: 120,
    status: 'complete'
  },
  { 
    icon: "🔀", 
    summary: "Routing to Security Specialist", 
    detail: "Request requires security expertise",
    timing: 45,
    status: 'complete'
  },
  { 
    icon: "🔍", 
    summary: "Performing security scan", 
    detail: "Checking for vulnerabilities and best practices",
    timing: 890,
    status: 'complete'
  },
  { 
    icon: "📊", 
    summary: "Aggregating results", 
    timing: 230,
    status: 'complete'
  },
  { 
    icon: "✅", 
    summary: "Preparing response", 
    timing: 110,
    status: 'complete'
  }
];