'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@/lib/admin/sharedAdminImports';
import { MapPin, Star, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TruckCardBaseProps {
  readonly id: string | number;
  readonly name: string;
  readonly cuisine?: string[] | null;
  readonly address?: string | null;
  readonly averageRating?: number | null;
  readonly reviewCount?: number | null;
  readonly verificationStatus?: string | null;
  readonly qualityScore?: number | null; // 0..1
  readonly actionButton?: ReactNode;
  readonly additionalContent?: ReactNode;
  readonly cardClassName?: string;
}

export function TruckCardBase(props: TruckCardBaseProps) {
  const {
    name,
    cuisine,
    address,
    averageRating,
    reviewCount,
    verificationStatus,
    qualityScore,
    actionButton,
    additionalContent,
    cardClassName,
  } = props;

  const ratingText = typeof averageRating === 'number' ? averageRating.toFixed(1) : 'No ratings';

  return (
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {name}
              {verificationStatus != undefined && verificationStatus !== '' && (
                <Badge variant={verificationStatus === 'verified' ? 'default' : 'secondary'}>
                  {verificationStatus}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{cuisine?.join(', ') ?? 'No cuisine specified'}</CardDescription>
          </div>
          {actionButton}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{address ?? 'Location not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {ratingText}
              {typeof reviewCount === 'number' && reviewCount > 0
                ? ` (${reviewCount} reviews)`
                : ''}
            </span>
          </div>
          {typeof qualityScore === 'number' ? (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{Math.round(qualityScore * 100)}% complete</span>
            </div>
          ) : undefined}
        </div>
        {additionalContent}
      </CardContent>
    </Card>
  );
}
