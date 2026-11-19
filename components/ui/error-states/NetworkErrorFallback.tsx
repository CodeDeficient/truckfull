import * as React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { BaseFallback } from '@/components/ui/error-states/BaseFallback';
import { cn } from '@/lib/utils';

export interface NetworkErrorFallbackProps {
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
   * Title to display, defaults to "Connection Problem"
   */
  readonly title?: string;
  /**
   * Whether to show the retry button
   */
  readonly showRetry?: boolean;
  /**
   * Whether to show the offline icon instead of the regular network error icon
   */
  readonly isOffline?: boolean;
}

/**
 * A fallback component to display when network errors occur.
 * Provides a consistent UI for network-related errors with retry functionality.
 *
 * @example
 * ```tsx
 * <NetworkErrorFallback
 *   retry={() => refetch()}
 *   messageOverride="Unable to connect to the server. Please check your internet connection."
 *   isOffline={!navigator.onLine}
 * />
 * ```
 */
export const NetworkErrorFallback = React.forwardRef<HTMLDivElement, NetworkErrorFallbackProps>(
  (
    {
      retry,
      messageOverride,
      className,
      title = 'Connection Problem',
      showRetry = true,
      isOffline = false,
      ...props
    },
    ref,
  ) => {
    const defaultMessage = isOffline
      ? 'You appear to be offline. Please check your internet connection and try again.'
      : "We're having trouble connecting to our servers. This might be a temporary issue.";

    const icon = isOffline ? (
      <div className="bg-destructive/10 rounded-full">
        <WifiOff className="h-8 w-8 text-destructive" />
      </div>
    ) : (
      <div className="bg-destructive/10 rounded-full">
        <Wifi className="h-8 w-8 text-destructive" />
      </div>
    );

    return (
      <BaseFallback
        ref={ref}
        title={title}
        message={messageOverride ?? defaultMessage}
        icon={icon}
        showRetry={showRetry}
        onRetry={retry}
        className={cn('border-destructive/20 bg-destructive/5', className)}
        contentClassName="pt-0"
        {...props}
      />
    );
  },
);

NetworkErrorFallback.displayName = 'NetworkErrorFallback';
