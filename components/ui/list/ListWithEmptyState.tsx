'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ListWithEmptyStateProps {
  readonly itemsCount: number;
  readonly emptyTitle: string;
  readonly emptyHint?: string;
  readonly onCtaClick?: () => void;
  readonly ctaLabel?: string;
  readonly children: React.ReactNode; // render when itemsCount > 0
}

/**
 * ListWithEmptyState
 * - Renders children when there are items
 * - Otherwise shows a standardized empty state card
 */
export function ListWithEmptyState(props: ListWithEmptyStateProps) {
  const { itemsCount, emptyTitle, emptyHint, onCtaClick, ctaLabel, children } = props;

  if (itemsCount > 0) {
    return <>{children}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{emptyTitle}</CardTitle>
        {emptyHint != undefined && <CardDescription>{emptyHint}</CardDescription>}
      </CardHeader>
      {onCtaClick != undefined && (
        <CardContent>
          <Button variant="outline" onClick={onCtaClick}>
            {ctaLabel ?? 'Go back'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
