import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BaseFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly title: string;
  readonly message: string;
  readonly icon: React.ReactNode;
  readonly showRetry?: boolean;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly className?: string;
  readonly headerClassName?: string;
  readonly contentClassName?: string;
}

export const BaseFallback = React.forwardRef<HTMLDivElement, BaseFallbackProps>(
  (
    {
      title,
      message,
      icon,
      showRetry = true,
      onRetry,
      retryLabel = 'Try Again',
      className,
      headerClassName,
      contentClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <Card ref={ref} className={cn('w-full max-w-md mx-auto text-center', className)} {...props}>
        <CardHeader className={cn('pb-4', headerClassName)}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {icon}
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{message}</CardDescription>
        </CardHeader>
        {showRetry && onRetry && (
          <CardContent className={cn('pt-0', contentClassName)}>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              {retryLabel}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  },
);

BaseFallback.displayName = 'BaseFallback';
