import { Button } from "@/components/ui/button";
import { Code, FileCode, Image, GitBranch, FileText, Braces, Gamepad2, LayoutDashboard, Calculator, Timer, ListTodo, Maximize2 } from "lucide-react";
import { ArtifactData } from "./Artifact";
import { cn } from "@/lib/utils";

interface ArtifactCardProps {
  artifact: ArtifactData;
  onOpen: () => void;
  className?: string;
}

// Get icon based on artifact type and title keywords
const getArtifactIcon = (type: string, title: string) => {
  const titleLower = title.toLowerCase();

  // Check title for specific app types first
  if (titleLower.includes('game') || titleLower.includes('arcade') || titleLower.includes('snake') || titleLower.includes('tetris') || titleLower.includes('pong')) {
    return Gamepad2;
  }
  if (titleLower.includes('dashboard') || titleLower.includes('analytics')) {
    return LayoutDashboard;
  }
  if (titleLower.includes('calculator') || titleLower.includes('converter')) {
    return Calculator;
  }
  if (titleLower.includes('timer') || titleLower.includes('countdown') || titleLower.includes('stopwatch') || titleLower.includes('clock')) {
    return Timer;
  }
  if (titleLower.includes('todo') || titleLower.includes('task') || titleLower.includes('checklist')) {
    return ListTodo;
  }

  // Fall back to type-based icons
  switch (type) {
    case 'code':
      return Code;
    case 'html':
      return Braces;
    case 'react':
      return FileCode;
    case 'svg':
      return Image;
    case 'mermaid':
      return GitBranch;
    case 'markdown':
      return FileText;
    case 'image':
      return Image;
    default:
      return FileCode;
  }
};

// Get type label for display - uses title for granular categorization
const getTypeLabel = (type: string, title: string) => {
  const titleLower = title.toLowerCase();

  // For react artifacts, detect specific app types from title
  if (type === 'react') {
    if (titleLower.includes('game') || titleLower.includes('arcade') || titleLower.includes('snake') || titleLower.includes('tetris') || titleLower.includes('pong') || titleLower.includes('memory') || titleLower.includes('puzzle') || titleLower.includes('quiz')) {
      return 'Game';
    }
    if (titleLower.includes('dashboard') || titleLower.includes('analytics') || titleLower.includes('metrics') || titleLower.includes('stats')) {
      return 'Dashboard';
    }
    if (titleLower.includes('calculator') || titleLower.includes('converter') || titleLower.includes('generator') || titleLower.includes('tool')) {
      return 'Tool';
    }
    if (titleLower.includes('timer') || titleLower.includes('countdown') || titleLower.includes('stopwatch') || titleLower.includes('clock') || titleLower.includes('pomodoro')) {
      return 'Timer';
    }
    if (titleLower.includes('todo') || titleLower.includes('task') || titleLower.includes('checklist') || titleLower.includes('tracker') || titleLower.includes('planner')) {
      return 'Tracker';
    }
    if (titleLower.includes('form') || titleLower.includes('survey') || titleLower.includes('input')) {
      return 'Form';
    }
    if (titleLower.includes('chart') || titleLower.includes('graph') || titleLower.includes('visualization')) {
      return 'Visualization';
    }
    if (titleLower.includes('editor') || titleLower.includes('builder') || titleLower.includes('creator')) {
      return 'Editor';
    }
    if (titleLower.includes('gallery') || titleLower.includes('carousel') || titleLower.includes('slider')) {
      return 'Gallery';
    }
    if (titleLower.includes('player') || titleLower.includes('audio') || titleLower.includes('video') || titleLower.includes('music')) {
      return 'Player';
    }
    // Default for react
    return 'Interactive';
  }

  // Standard type labels for non-react artifacts
  switch (type) {
    case 'code':
      return 'Code';
    case 'html':
      return 'HTML';
    case 'svg':
      return 'Vector';
    case 'mermaid':
      return 'Diagram';
    case 'markdown':
      return 'Document';
    case 'image':
      return 'Image';
    default:
      return 'Code';
  }
};

export function ArtifactCard({ artifact, onOpen, className }: ArtifactCardProps) {
  const IconComponent = getArtifactIcon(artifact.type, artifact.title);
  const typeLabel = getTypeLabel(artifact.type, artifact.title);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl",
        "bg-muted/50 border border-border/50",
        "hover:bg-muted/70 hover:border-border",
        "transition-all duration-200",
        className
      )}
    >
      {/* Icon badge - larger visual element like Claude's design */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-sm">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Title and type */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">
          {artifact.title}
        </h4>
        <p className="text-xs text-muted-foreground">
          Code · {typeLabel}
        </p>
      </div>

      {/* Open button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpen}
        className="shrink-0 gap-1.5 rounded-full px-4 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Open
      </Button>
    </div>
  );
}
