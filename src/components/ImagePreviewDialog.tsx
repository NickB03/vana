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
      <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-black/90 flex items-center justify-center">
        {/* Centered image */}
        <img 
          src={imageData} 
          alt={title}
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
          loading="eager"
        />
        
        {/* Floating header - top center */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium">{title}</p>
        </div>
        
        {/* Floating action buttons - bottom center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          <Button 
            onClick={handleDownload} 
            variant="secondary"
            size="sm"
            className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-white/20"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="secondary"
            size="sm"
            className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-white/20"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
        
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
