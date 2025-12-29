import { memo } from 'react';
import { SkeletonLine } from './skeleton-line';
import { cn } from '@/lib/utils';

interface SkeletonParagraphProps {
  lines?: number;
  className?: string;
}

const LINE_WIDTHS = ['full', '3/4', '2/3', '1/2', '3/4'] as const;

export const SkeletonParagraph = memo(({ lines = 3, className }: SkeletonParagraphProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={`para-line-${i}`}
          width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
        />
      ))}
    </div>
  );
});

SkeletonParagraph.displayName = 'SkeletonParagraph';
