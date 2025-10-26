import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: string;
  title: string;
}

export function ImagePreviewDialog({ 
  open, 
  onOpenChange, 
  imageData, 
  title
}: ImagePreviewDialogProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${title.replace(/\s+/g, '_')}.png`;
    link.click();
    toast.success("Image downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 border-0 bg-black/90 flex items-center justify-center"
        aria-describedby="image-preview-description"
      >
        {/* Hidden accessibility elements */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <span id="image-preview-description" className="sr-only">
          Full screen image preview. Click the X button or press Escape to close.
        </span>
        
        {/* Centered image */}
        <img 
          src={imageData} 
          alt={title}
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
          loading="eager"
        />
        
        {/* Download button - top left corner */}
        <button
          onClick={handleDownload}
          className="absolute top-6 left-6 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full transition-colors"
          aria-label="Download image"
        >
          <Download className="h-5 w-5 text-white" />
        </button>
        
        {/* Close button - top right corner */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-6 right-6 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
