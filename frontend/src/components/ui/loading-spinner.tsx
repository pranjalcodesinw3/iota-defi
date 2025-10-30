/**
 * Loading Spinner Component - Reusable loading indicator
 */

import React from 'react';
import { Loader2, RefreshCw, Loader } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'refresh';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
};

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner', 
  className, 
  text, 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const renderSpinner = () => {
    const spinnerClass = cn(sizeClasses[size], 'animate-spin', className);
    
    switch (variant) {
      case 'refresh':
        return <RefreshCw className={spinnerClass} />;
      case 'dots':
        return (
          <div className={cn('flex space-x-1', className)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-current animate-pulse',
                  size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full bg-current animate-pulse',
              sizeClasses[size],
              className
            )}
          />
        );
      default:
        return <Loader2 className={spinnerClass} />;
    }
  };

  const content = (
    <div className={cn(
      'flex items-center justify-center',
      text ? 'flex-col space-y-2' : '',
      fullScreen ? 'min-h-screen' : 'p-4'
    )}>
      {renderSpinner()}
      {text && (
        <p className={cn(
          'text-muted-foreground animate-pulse',
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton loader for better UX
export interface SkeletonProps {
  className?: string;
  rows?: number;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, rows = 1, width, height }: SkeletonProps) {
  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height || '1rem'
  };

  if (rows === 1) {
    return (
      <div 
        className={cn('animate-pulse bg-muted rounded-md', className)}
        style={skeletonStyle}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div 
          key={i}
          className="animate-pulse bg-muted rounded-md"
          style={{
            ...skeletonStyle,
            width: i === rows - 1 ? '75%' : skeletonStyle.width || '100%'
          }}
        />
      ))}
    </div>
  );
}

// Loading states for different components
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} height="2rem" className="flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} height="1.5rem" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <Skeleton height="1.5rem" width="60%" />
      <Skeleton rows={3} />
      <div className="flex space-x-2">
        <Skeleton height="2rem" width="5rem" />
        <Skeleton height="2rem" width="5rem" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-2">
      <Skeleton height="1rem" width="50%" />
      <Skeleton height="2rem" width="70%" />
      <Skeleton height="0.75rem" width="40%" />
    </div>
  );
}