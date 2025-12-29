/**
 * Skeleton Primitives - Tier 1 Building Blocks
 *
 * Reusable skeleton components for loading states.
 * Use these primitives to compose inline loading skeletons in your components.
 *
 * @example Basic usage
 * import { SkeletonLine, SkeletonAvatar } from '@/components/ui/skeleton-primitives';
 *
 * // Avatar + Name pattern
 * <div className="flex items-center gap-3">
 *   <SkeletonAvatar size="md" />
 *   <SkeletonLine width="1/3" />
 * </div>
 *
 * @example List loading
 * import { SkeletonCard } from '@/components/ui/skeleton-primitives';
 *
 * {isLoading && (
 *   <div className="space-y-4">
 *     {Array.from({ length: 3 }).map((_, i) => (
 *       <SkeletonCard key={i} hasImage={false} />
 *     ))}
 *   </div>
 * )}
 */

export { SkeletonLine } from './skeleton-line';
export { SkeletonParagraph } from './skeleton-paragraph';
export { SkeletonAvatar } from './skeleton-avatar';
export { SkeletonCard } from './skeleton-card';
