import { memo } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SkeletonAvatar = memo(({ size = 'md', className }: SkeletonAvatarProps) => {
  const sizeClass = {
    'sm': 'h-8 w-8',
    'md': 'h-10 w-10',
    'lg': 'h-12 w-12',
  }[size];

  return <Skeleton className={cn(sizeClass, 'rounded-full', className)} />;
});

SkeletonAvatar.displayName = 'SkeletonAvatar';
