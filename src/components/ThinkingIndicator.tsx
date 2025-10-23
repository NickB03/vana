import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  reasoning: string;
  isStreaming?: boolean;
}

interface ThinkingSection {
  title: string;
  content: string;
}

function parseThinkingSections(reasoning: string): { currentStage: string; sections: ThinkingSection[] } {
  const lines = reasoning.split('\n');
  const sections: ThinkingSection[] = [];
  let currentSection: ThinkingSection | null = null;
  let currentStage = "Processing";

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if it's a header (bold markdown or title-like)
    if (trimmed.match(/^#{1,3}\s+(.+)$/) || trimmed.match(/^\*\*(.+)\*\*$/)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const title = trimmed.replace(/^#{1,3}\s+/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = { title, content: '' };
      currentStage = title;
    } else if (currentSection && trimmed) {
      currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
    } else if (!currentSection && trimmed) {
      // If no section yet, create a default one
      currentSection = { title: "Thinking", content: trimmed };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Get the last section title as current stage
  if (sections.length > 0) {
    currentStage = sections[sections.length - 1].title;
  }

  return { currentStage, sections };
}

export function ThinkingIndicator({ reasoning, isStreaming = false }: ThinkingIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentStage, sections } = parseThinkingSections(reasoning);

  if (!reasoning) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-2 h-auto"
        >
          <Sparkles className={cn("h-4 w-4", isStreaming && "animate-pulse text-primary")} />
          <span className="text-sm font-medium">
            {isOpen ? "Show thinking" : currentStage}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 border-l-2 border-muted pl-4 space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h4 className="text-sm font-semibold italic text-foreground">
              {section.title}
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {section.content}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
