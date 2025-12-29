import { memo } from 'react';
import { Skeleton } from './skeleton';
import { SkeletonParagraph } from './skeleton-paragraph';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard = memo(({ hasImage = true, className }: SkeletonCardProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {hasImage && <Skeleton className="h-32 w-full rounded-lg" />}
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" /> {/* Title */}
        <SkeletonParagraph lines={2} />
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';
