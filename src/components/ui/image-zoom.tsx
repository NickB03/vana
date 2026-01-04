import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface ImageZoomProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    children?: React.ReactNode;
}

export function ImageZoom({ className, alt, src, width, height, ...props }: ImageZoomProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div
                    className={cn(
                        'group relative cursor-zoom-in overflow-hidden rounded-md',
                        className
                    )}
                    style={{ width, height }}
                >
                    <img
                        src={src}
                        alt={alt}
                        width={width}
                        height={height}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        {...props}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/10">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none">
                <div className="relative flex h-[90vh] w-full items-center justify-center overflow-hidden">
                    <img
                        src={src}
                        alt={alt}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
