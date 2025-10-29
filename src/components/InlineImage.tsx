import { useState } from "react";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import { ArtifactData } from "./Artifact";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface InlineImageProps {
  artifact: ArtifactData;
}

export function InlineImage({ artifact }: InlineImageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // If it's a base64 data URL (AI generated)
      if (artifact.content.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = artifact.content;
        link.download = `${artifact.title.replace(/\s+/g, '_')}.png`;
        link.click();
        toast.success("Image downloaded");
        return;
      }
      
      // If it's a storage bucket URL
      const response = await fetch(artifact.content);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${artifact.title.replace(/\s+/g, '_')}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download image");
    }
  };

  return (
    <div className="my-4">
      <div
        className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all duration-200 max-w-md shadow-sm hover:shadow-md"
        onClick={() => setPreviewOpen(true)}
      >
        <img
          src={artifact.content}
          alt={artifact.title}
          className="w-full h-auto bg-muted block"
          loading="eager"
          decoding="sync"
          onError={(e) => {
            console.error('Image failed to load:', artifact.content);
            e.currentTarget.style.display = 'none';
          }}
        />
        
        {/* Subtle hover darkening only */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
        
        {/* Semi-transparent download icon in top-right corner */}
        <button
          onClick={handleDownload}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-sm p-2 rounded-full"
          aria-label="Download image"
        >
          <Download className="h-4 w-4 text-white" />
        </button>
      </div>
      
      <ImagePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageData={artifact.content}
        title={artifact.title}
      />
    </div>
  );
}
