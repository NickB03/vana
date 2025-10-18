import { Card } from "@/components/ui/card";
import { Lightbulb, Code, BookOpen, Sparkles } from "lucide-react";

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  prompt: string;
}

const suggestions: Suggestion[] = [
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Creative Ideas",
    prompt: "Help me brainstorm creative ideas for a weekend project",
  },
  {
    icon: <Code className="h-5 w-5" />,
    title: "Code Helper",
    prompt: "Explain how React hooks work with practical examples",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Learn Something",
    prompt: "Teach me about quantum computing in simple terms",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Problem Solving",
    prompt: "Help me solve a complex problem step by step",
  },
];

interface PromptSuggestionsProps {
  onSuggestionClick: (prompt: string) => void;
}

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div className="mx-auto w-full max-w-4xl p-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent">
          How can I help you today?
        </h1>
        <p className="text-muted-foreground">
          Choose a suggestion below or start typing your own question
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className="group cursor-pointer border-2 border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-gradient-primary p-2 text-white transition-transform group-hover:scale-110">
                {suggestion.icon}
              </div>
              <h3 className="font-semibold">{suggestion.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.prompt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
