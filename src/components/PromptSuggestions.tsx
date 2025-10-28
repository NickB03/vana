import React from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, Code, FileText, Gamepad2 } from "lucide-react";

interface Suggestion {
  title: string;
  prompt: string;
  preview: {
    gradient: string;
    icon: React.ReactNode;
  };
  category: string;
}

const suggestions: Suggestion[] = [
  {
    title: "Generate an Image",
    prompt: "Generate an image of Pikachu in a banana costume",
    preview: {
      gradient: "from-purple-500 via-pink-500 to-purple-600",
      icon: <ImageIcon className="h-12 w-12" />
    },
    category: "Image Generation"
  },
  {
    title: "Build a Web App",
    prompt: "Build a protein tracker web app",
    preview: {
      gradient: "from-blue-500 via-cyan-500 to-blue-600",
      icon: <Code className="h-12 w-12" />
    },
    category: "Development"
  },
  {
    title: "Create an Infographic",
    prompt: "Build an infographic explaining AI Networking",
    preview: {
      gradient: "from-green-500 via-emerald-500 to-green-600",
      icon: <FileText className="h-12 w-12" />
    },
    category: "Design"
  },
  {
    title: "Build a Game",
    prompt: "Build a web-based Frogger game with arrow key controls",
    preview: {
      gradient: "from-orange-500 via-amber-500 to-orange-600",
      icon: <Gamepad2 className="h-12 w-12" />
    },
    category: "Gaming"
  }
];

interface PromptSuggestionsProps {
  onSuggestionClick: (prompt: string) => void;
}

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-4 gap-2">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className="group cursor-pointer overflow-hidden border border-border bg-card transition-all hover:border-primary hover:shadow-lg hover:scale-105"
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            {/* Preview Thumbnail */}
            <div className={`relative aspect-[5/2] bg-gradient-to-br ${suggestion.preview.gradient} flex items-center justify-center overflow-hidden`}>
              {/* Icon overlay */}
              <div className="text-white/90 transition-transform group-hover:scale-110">
                {React.cloneElement(suggestion.preview.icon as React.ReactElement, { className: "h-5 w-5" })}
              </div>
            </div>
            
            {/* Text Area */}
            <div className="p-2">
              <h3 className="font-semibold text-[10px] mb-0.5 line-clamp-1">{suggestion.title}</h3>
              <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">{suggestion.prompt}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
