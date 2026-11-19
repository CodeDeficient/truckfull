import * as React from 'react';
import { Database } from 'lucide-react';
import { BaseFallback } from '@/components/ui/error-states/BaseFallback';
import { cn } from '@/lib/utils';

export interface DataMissingFallbackProps {
  /**
   * Optional retry function to be called when the retry button is clicked
   */
  readonly retry?: () => void;
  /**
   * Optional custom message to override the default message
   */
  readonly messageOverride?: string;
  /**
   * Additional CSS classes to apply to the container
   */
  readonly className?: string;
  /**
   * Title to display, defaults to "No Data Found"
   */
  readonly title?: string;
  /**
   * Whether to show the retry button
   */
  readonly showRetry?: boolean;
}

/**
 * A fallback component to display when data is missing or empty.
 * Provides a consistent UI for empty states with optional retry functionality.
 *
 * @example
 * ```tsx
 * <DataMissingFallback
 *   retry={() => refetch()}
 *   messageOverride="No food trucks found in this area"
 * />
 * ```
 */
export const DataMissingFallback = React.forwardRef<HTMLDivElement, DataMissingFallbackProps>(
  (
    { retry, messageOverride, className, title = 'No Data Found', showRetry = true, ...props },
    ref,
  ) => {
    const defaultMessage =
      "We couldn't find any data to display. This might be because there are no items available or they haven't been loaded yet.";

    return (
      <BaseFallback
        ref={ref}
        title={title}
        message={messageOverride ?? defaultMessage}
        icon={
          <div className="bg-muted">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
        }
        showRetry={showRetry}
        onRetry={retry}
        className={cn('border-dashed border-2', className)}
        {...props}
      />
    );
  },
);

DataMissingFallback.displayName = 'DataMissingFallback';
