import { useState } from "react";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import { ArtifactData } from "./Artifact";
import { Maximize2 } from "lucide-react";

interface InlineImageProps {
  artifact: ArtifactData;
  onEditInCanvas: (artifact: ArtifactData) => void;
}

export function InlineImage({ artifact, onEditInCanvas }: InlineImageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleEditInCanvas = () => {
    setPreviewOpen(false);
    onEditInCanvas(artifact);
  };

  return (
    <>
      <div 
        className="relative group cursor-pointer my-4 rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all duration-200 max-w-md shadow-sm hover:shadow-md"
        onClick={() => setPreviewOpen(true)}
      >
        <img 
          src={artifact.content} 
          alt={artifact.title}
          className="w-full h-auto bg-muted"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
            <Maximize2 className="h-4 w-4" />
            Click to expand
          </div>
        </div>
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm border border-border">
          {artifact.title}
        </div>
      </div>
      
      <ImagePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageData={artifact.content}
        title={artifact.title}
        onEditInCanvas={handleEditInCanvas}
      />
    </>
  );
}
