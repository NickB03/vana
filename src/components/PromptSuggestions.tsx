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
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className="group cursor-pointer overflow-hidden border-2 border-border bg-card transition-all hover:border-primary hover:shadow-xl hover:scale-[1.02]"
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            {/* Preview Thumbnail */}
            <div className={`relative aspect-video bg-gradient-to-br ${suggestion.preview.gradient} flex items-center justify-center overflow-hidden`}>
              {/* Icon overlay */}
              <div className="text-white/90 transition-transform group-hover:scale-110">
                {suggestion.preview.icon}
              </div>
              {/* Category badge */}
              <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                {suggestion.category}
              </div>
            </div>
            
            {/* Text Area */}
            <div className="p-4">
              <h3 className="font-semibold text-base mb-1">{suggestion.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{suggestion.prompt}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
