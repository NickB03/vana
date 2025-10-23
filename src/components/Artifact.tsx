import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";

export type ArtifactType = "code" | "markdown" | "html";

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
}

interface ArtifactProps {
  artifact: ArtifactData;
  onClose?: () => void;
}

export const Artifact = ({ artifact, onClose }: ArtifactProps) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    toast.success("Copied to clipboard");
  };

  const renderPreview = () => {
    if (artifact.type === "code" || artifact.type === "html") {
      // Create a complete HTML document for preview
      const previewContent = artifact.content.includes("<!DOCTYPE") 
        ? artifact.content 
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
${artifact.content}
</body>
</html>`;

      return (
        <iframe
          srcDoc={previewContent}
          className="w-full h-full border-0 bg-background"
          title={artifact.title}
          sandbox="allow-scripts allow-same-origin"
        />
      );
    }

    if (artifact.type === "markdown") {
      return (
        <div className="w-full h-full overflow-auto p-4 bg-background">
          <Markdown>{artifact.content}</Markdown>
        </div>
      );
    }

    return null;
  };

  const renderCode = () => {
    return (
      <div className="w-full h-full overflow-auto bg-muted">
        <pre className="p-4 text-sm font-mono">
          <code className="text-foreground whitespace-pre-wrap break-words">{artifact.content}</code>
        </pre>
      </div>
    );
  };

  return (
    <Card className={`flex flex-col overflow-hidden transition-all ${
      isMaximized ? "fixed inset-4 z-50" : "h-full"
    }`}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 bg-muted/50">
        <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleCopy}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex">
          {renderPreview()}
        </TabsContent>
        <TabsContent value="code" className="flex-1 m-0 p-0 data-[state=active]:flex">
          {renderCode()}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
