import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ImageIcon, Code, FileText, Gamepad2, BarChart3, Brain,
  Palette, Calculator, Music, Sparkles, Globe, BookOpen,
  Zap, Target, TrendingUp, Film, Coffee, Dumbbell,
  ShoppingCart, Calendar, MessageSquare, Heart
} from "lucide-react";

interface Suggestion {
  title: string;
  prompt: string;
  preview: {
    gradient: string;
    icon: React.ReactNode;
  };
  category: string;
}

// Expanded pool of diverse suggestions
const suggestionPool: Suggestion[] = [
  // Image Generation (5 options)
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
    title: "Create Artwork",
    prompt: "Generate a cyberpunk cityscape at sunset with flying cars",
    preview: {
      gradient: "from-pink-500 via-rose-500 to-red-500",
      icon: <Palette className="h-12 w-12" />
    },
    category: "Image Generation"
  },
  {
    title: "Fantasy Character",
    prompt: "Generate an image of a mystical elf warrior with glowing armor in an enchanted forest",
    preview: {
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      icon: <Sparkles className="h-12 w-12" />
    },
    category: "Image Generation"
  },
  {
    title: "Movie Poster",
    prompt: "Create a dramatic movie poster for a sci-fi thriller about AI taking over",
    preview: {
      gradient: "from-indigo-500 via-purple-500 to-pink-500",
      icon: <Film className="h-12 w-12" />
    },
    category: "Image Generation"
  },
  {
    title: "Product Design",
    prompt: "Generate a sleek modern smartwatch design with holographic display",
    preview: {
      gradient: "from-cyan-500 via-blue-500 to-indigo-500",
      icon: <Zap className="h-12 w-12" />
    },
    category: "Image Generation"
  },

  // Web Apps (6 options)
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
    title: "Todo List App",
    prompt: "Create an interactive todo list with categories, priorities, and deadlines",
    preview: {
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      icon: <Target className="h-12 w-12" />
    },
    category: "Development"
  },
  {
    title: "Budget Tracker",
    prompt: "Build a personal budget tracker with expense categories and spending insights",
    preview: {
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      icon: <TrendingUp className="h-12 w-12" />
    },
    category: "Development"
  },
  {
    title: "Recipe Manager",
    prompt: "Create a recipe management app with ingredients list and cooking timer",
    preview: {
      gradient: "from-amber-500 via-orange-500 to-red-500",
      icon: <Coffee className="h-12 w-12" />
    },
    category: "Development"
  },
  {
    title: "Workout Logger",
    prompt: "Build a workout tracking app with exercise library and progress charts",
    preview: {
      gradient: "from-red-500 via-pink-500 to-rose-500",
      icon: <Dumbbell className="h-12 w-12" />
    },
    category: "Development"
  },
  {
    title: "Shopping List",
    prompt: "Create a smart shopping list app with item categorization and price tracking",
    preview: {
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      icon: <ShoppingCart className="h-12 w-12" />
    },
    category: "Development"
  },

  // Data Visualization (5 options)
  {
    title: "Sales Dashboard",
    prompt: "Create an interactive sales dashboard with revenue trends and customer analytics",
    preview: {
      gradient: "from-blue-500 via-sky-500 to-cyan-500",
      icon: <BarChart3 className="h-12 w-12" />
    },
    category: "Data & Analytics"
  },
  {
    title: "Weather Viz",
    prompt: "Build an interactive weather visualization showing temperature and precipitation patterns",
    preview: {
      gradient: "from-sky-500 via-blue-500 to-indigo-500",
      icon: <Globe className="h-12 w-12" />
    },
    category: "Data & Analytics"
  },
  {
    title: "Stock Tracker",
    prompt: "Create a real-time stock market tracker with interactive price charts",
    preview: {
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      icon: <TrendingUp className="h-12 w-12" />
    },
    category: "Data & Analytics"
  },
  {
    title: "Habit Tracker",
    prompt: "Build a habit tracking dashboard with streaks visualization and progress stats",
    preview: {
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      icon: <Calendar className="h-12 w-12" />
    },
    category: "Data & Analytics"
  },
  {
    title: "Analytics Report",
    prompt: "Create a comprehensive analytics report with charts showing user engagement metrics",
    preview: {
      gradient: "from-orange-500 via-red-500 to-pink-500",
      icon: <BarChart3 className="h-12 w-12" />
    },
    category: "Data & Analytics"
  },

  // Infographics & Design (4 options)
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
    title: "Timeline Viz",
    prompt: "Create an interactive timeline infographic of space exploration milestones",
    preview: {
      gradient: "from-indigo-500 via-blue-500 to-cyan-500",
      icon: <BookOpen className="h-12 w-12" />
    },
    category: "Design"
  },
  {
    title: "Process Diagram",
    prompt: "Design a flowchart explaining how machine learning models are trained",
    preview: {
      gradient: "from-teal-500 via-emerald-500 to-green-500",
      icon: <Brain className="h-12 w-12" />
    },
    category: "Design"
  },
  {
    title: "Comparison Chart",
    prompt: "Create an infographic comparing renewable energy sources with pros and cons",
    preview: {
      gradient: "from-lime-500 via-green-500 to-emerald-500",
      icon: <FileText className="h-12 w-12" />
    },
    category: "Design"
  },

  // Games (5 options)
  {
    title: "Build a Game",
    prompt: "Build a web-based Frogger game with arrow key controls",
    preview: {
      gradient: "from-orange-500 via-amber-500 to-orange-600",
      icon: <Gamepad2 className="h-12 w-12" />
    },
    category: "Gaming"
  },
  {
    title: "Snake Game",
    prompt: "Create a classic snake game with score tracking and increasing difficulty",
    preview: {
      gradient: "from-lime-500 via-green-500 to-emerald-500",
      icon: <Gamepad2 className="h-12 w-12" />
    },
    category: "Gaming"
  },
  {
    title: "Memory Card Game",
    prompt: "Build a memory matching card game with different difficulty levels",
    preview: {
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      icon: <Brain className="h-12 w-12" />
    },
    category: "Gaming"
  },
  {
    title: "Trivia Quiz",
    prompt: "Create an interactive trivia quiz game with multiple categories and scoring",
    preview: {
      gradient: "from-yellow-500 via-amber-500 to-orange-500",
      icon: <MessageSquare className="h-12 w-12" />
    },
    category: "Gaming"
  },
  {
    title: "Tic Tac Toe",
    prompt: "Build a tic-tac-toe game with AI opponent and win detection",
    preview: {
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      icon: <Gamepad2 className="h-12 w-12" />
    },
    category: "Gaming"
  },

  // Tools & Calculators (5 options)
  {
    title: "Mortgage Calculator",
    prompt: "Build a mortgage calculator with amortization schedule and payment breakdown",
    preview: {
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      icon: <Calculator className="h-12 w-12" />
    },
    category: "Tools"
  },
  {
    title: "BMI Calculator",
    prompt: "Create a BMI calculator with health recommendations and ideal weight range",
    preview: {
      gradient: "from-red-500 via-orange-500 to-amber-500",
      icon: <Heart className="h-12 w-12" />
    },
    category: "Tools"
  },
  {
    title: "Unit Converter",
    prompt: "Build a comprehensive unit converter for length, weight, temperature, and currency",
    preview: {
      gradient: "from-cyan-500 via-blue-500 to-indigo-500",
      icon: <Calculator className="h-12 w-12" />
    },
    category: "Tools"
  },
  {
    title: "Password Generator",
    prompt: "Create a secure password generator with customizable length and character types",
    preview: {
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      icon: <Zap className="h-12 w-12" />
    },
    category: "Tools"
  },
  {
    title: "Pomodoro Timer",
    prompt: "Build a Pomodoro productivity timer with work/break intervals and statistics",
    preview: {
      gradient: "from-rose-500 via-red-500 to-orange-500",
      icon: <Calendar className="h-12 w-12" />
    },
    category: "Tools"
  },

  // Creative & Fun (4 options)
  {
    title: "Music Player",
    prompt: "Create an interactive music player interface with playlist management",
    preview: {
      gradient: "from-pink-500 via-rose-500 to-red-500",
      icon: <Music className="h-12 w-12" />
    },
    category: "Creative"
  },
  {
    title: "Color Palette",
    prompt: "Build a color palette generator with hex codes and complementary colors",
    preview: {
      gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
      icon: <Palette className="h-12 w-12" />
    },
    category: "Creative"
  },
  {
    title: "Quote Generator",
    prompt: "Create an inspirational quote generator with different categories and sharing",
    preview: {
      gradient: "from-amber-500 via-yellow-500 to-orange-500",
      icon: <Sparkles className="h-12 w-12" />
    },
    category: "Creative"
  },
  {
    title: "Typing Speed Test",
    prompt: "Build a typing speed test with WPM calculation and accuracy tracking",
    preview: {
      gradient: "from-teal-500 via-cyan-500 to-blue-500",
      icon: <Zap className="h-12 w-12" />
    },
    category: "Creative"
  }
];

/**
 * Fisher-Yates shuffle for proper randomization
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Randomly select N suggestions ensuring category diversity
 * Algorithm ensures we don't show too many from the same category
 */
function selectRandomSuggestions(pool: Suggestion[], count: number): Suggestion[] {
  // Properly shuffle the pool using Fisher-Yates
  const shuffled = shuffle(pool);

  const selected: Suggestion[] = [];
  const categoryCount: Record<string, number> = {};

  // First pass: select one from each major category
  const categories = ["Image Generation", "Development", "Data & Analytics", "Gaming"];
  for (const category of categories) {
    const fromCategory = shuffled.find(s => s.category === category && !selected.includes(s));
    if (fromCategory && selected.length < count) {
      selected.push(fromCategory);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  }

  // Second pass: fill remaining slots, limiting 2 per category
  for (const suggestion of shuffled) {
    if (selected.length >= count) break;

    const catCount = categoryCount[suggestion.category] || 0;
    if (!selected.includes(suggestion) && catCount < 2) {
      selected.push(suggestion);
      categoryCount[suggestion.category] = catCount + 1;
    }
  }

  // Final pass: if we still need more, add any remaining
  for (const suggestion of shuffled) {
    if (selected.length >= count) break;
    if (!selected.includes(suggestion)) {
      selected.push(suggestion);
    }
  }

  return selected;
}

interface PromptSuggestionsProps {
  onSuggestionClick: (prompt: string) => void;
}

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  // Memoize the random selection so it stays consistent during renders
  // but changes on component mount (page refresh or navigation back to homepage)
  const suggestions = useMemo(() => selectRandomSuggestions(suggestionPool, 4), []);

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
