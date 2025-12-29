import { memo } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface SkeletonLineProps {
  width?: 'full' | '3/4' | '2/3' | '1/2' | '1/3' | '1/4';
  className?: string;
}

export const SkeletonLine = memo(({ width = 'full', className }: SkeletonLineProps) => {
  const widthClass = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '2/3': 'w-2/3',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  }[width];

  return <Skeleton className={cn('h-4', widthClass, className)} />;
});

SkeletonLine.displayName = 'SkeletonLine';
