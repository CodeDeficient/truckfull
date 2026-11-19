'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Mobile-optimized error boundary component
 * Provides user-friendly error states for mobile route failures
 */
export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError('Mobile Error Boundary caught an error', error);
    this.props.onError?.(error, errorInfo);
  }

  render(): React.ReactElement {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <div className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden">
          <div className="flex-grow flex items-center justify-center p-4">
            <Card className="bg-white/5 border-white/10 max-w-md w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-white text-xl">Something went wrong</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-300 text-sm">
                  We encountered an error while loading this page. Please try again.
                </p>
                {typeof globalThis !== 'undefined' &&
                  globalThis.process?.env?.NODE_ENV === 'development' &&
                  this.state.error && (
                    <details className="text-left">
                      <summary className="text-gray-400 text-xs cursor-pointer mb-2">
                        Error Details (Development)
                      </summary>
                      <pre className="text-xs text-red-400 bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                        {this.state.error.message}
                      </pre>
                    </details>
                  )}
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    globalThis.location.reload();
                  }}
                  className="bg-[var(--primary-color)] text-white w-full"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return <>{this.props.children ?? <div />}</>;
  }
}

/**
 * Higher-order component to wrap mobile routes with error boundary
 */
export function withMobileErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
): React.FC<P> {
  const WrappedComponent = (props: P): React.ReactElement => {
    return React.createElement(MobileErrorBoundary, {
      fallback,
      children: React.createElement(Component, props),
    });
  };

  const displayName = Component.displayName ?? Component.name ?? 'Component';
  WrappedComponent.displayName = `withMobileErrorBoundary(${displayName})`;

  return WrappedComponent;
}

export default MobileErrorBoundary;
