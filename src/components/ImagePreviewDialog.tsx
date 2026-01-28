import { Dialog, DialogPortal } from "@/components/ui/dialog";
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Full-screen overlay */}
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          {/* Centered image */}
          <img
            src={imageData}
            alt={title}
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
            loading="eager"
            decoding="async"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Download button - top left corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="absolute top-6 left-6 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full transition-colors"
            aria-label="Download image"
          >
            <Download className="h-5 w-5 text-white" />
          </button>
          
          {/* Close button - top right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="absolute top-6 right-6 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
