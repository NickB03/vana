import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, FileCode, Image, Maximize2 } from "lucide-react";
import { ArtifactData } from "./Artifact";
import { cn } from "@/lib/utils";
import { CARD_STATES } from "@/utils/interactionConstants";

interface ArtifactCardProps {
  artifact: ArtifactData;
  onOpen: () => void;
  className?: string;
}

const getArtifactIcon = (type: string) => {
  switch (type) {
    case 'code':
      return <Code className="h-4 w-4" />;
    case 'html':
    case 'react':
      return <FileCode className="h-4 w-4" />;
    case 'image':
      return <Image className="h-4 w-4" />;
    default:
      return <FileCode className="h-4 w-4" />;
  }
};

const getArtifactLabel = (type: string) => {
  switch (type) {
    case 'code':
      return 'Code';
    case 'html':
      return 'HTML';
    case 'react':
      return 'React Component';
    case 'svg':
      return 'SVG';
    case 'mermaid':
      return 'Diagram';
    case 'markdown':
      return 'Markdown';
    case 'image':
      return 'Image';
    default:
      return 'Artifact';
  }
};

export function ArtifactCard({ artifact, onOpen, className }: ArtifactCardProps) {
  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border bg-card",
      "hover:border-primary/40",
      "hover:shadow-xl hover:shadow-primary/10",
      "transition-all duration-300 ease-out",
      "hover:scale-[1.02]",
      CARD_STATES.interactive,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
              {getArtifactIcon(artifact.type)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium">{artifact.title}</CardTitle>
              <CardDescription className="text-xs">
                {getArtifactLabel(artifact.type)}
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onOpen}
            className="gap-1.5 transition-all group-hover:bg-primary group-hover:text-primary-foreground shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Open
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
