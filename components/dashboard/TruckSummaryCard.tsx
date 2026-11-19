'use client';

import { Button } from '@/lib/admin/sharedAdminImports';
import { MapPin, Settings } from 'lucide-react';
import { TruckCardBase } from './TruckCardBase';

import type { ReactNode } from 'react';

export interface TruckSummaryCardProps {
  readonly id: string | number;
  readonly name: string;
  readonly cuisine?: string[] | null;
  readonly address?: string | null;
  readonly averageRating?: number | null;
  readonly reviewCount?: number | null;
  readonly verificationStatus?: string | null;
  readonly qualityScore?: number | null; // 0..1
  readonly showEdit?: boolean;
  readonly onEdit?: (id: string | number) => void;
  readonly viewLabel?: string;
  readonly onView?: (id: string | number) => void;
}

export function TruckSummaryCard(props: TruckSummaryCardProps) {
  const {
    id,
    name,
    cuisine,
    address,
    averageRating,
    reviewCount,
    verificationStatus,
    qualityScore,
    showEdit,
    onEdit,
    viewLabel,
    onView,
  } = props;

  let actionButton: ReactNode | undefined;
  if (showEdit === true) {
    actionButton = (
      <Button variant="outline" size="sm" onClick={() => onEdit?.(id)}>
        <Settings className="h-4 w-4 mr-2" />
        Edit
      </Button>
    );
  } else if (typeof onView === 'function') {
    actionButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onView(id);
        }}
      >
        <MapPin className="h-4 w-4 mr-2" /> {viewLabel ?? 'View'}
      </Button>
    );
  }

  return (
    <TruckCardBase
      id={id}
      name={name}
      cuisine={cuisine}
      address={address}
      averageRating={averageRating}
      reviewCount={reviewCount}
      verificationStatus={verificationStatus}
      qualityScore={qualityScore}
      actionButton={actionButton}
    />
  );
}
