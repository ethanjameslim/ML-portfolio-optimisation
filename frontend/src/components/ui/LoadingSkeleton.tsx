import { cn } from '@/utils/cn';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn('animate-pulse rounded-2xl bg-stone-200/80', className)} />;
}
