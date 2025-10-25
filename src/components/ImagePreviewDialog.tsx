import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Edit, X } from "lucide-react";
import { toast } from "sonner";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: string;
  title: string;
  onEditInCanvas: () => void;
}

export function ImagePreviewDialog({ 
  open, 
  onOpenChange, 
  imageData, 
  title,
  onEditInCanvas 
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
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 overflow-auto px-6 pb-6 flex items-center justify-center bg-muted/30">
          <img 
            src={imageData} 
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          />
        </div>
        
        <div className="flex gap-2 px-6 pb-6 border-t pt-4 bg-background">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={onEditInCanvas} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit in Canvas
          </Button>
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
