'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/lib/admin/sharedAdminImports';
import { MapPin, Settings, Utensils } from 'lucide-react';
import { TruckCardBase } from './TruckCardBase';
import MenuManagementSection from '@/components/owner/MenuManagementSection';
import type { MenuItem } from '@/lib/types';

export interface TruckSummaryWithMenuCardProps {
  readonly id: string | number;
  readonly name: string;
  readonly cuisine?: string[] | null;
  readonly address?: string | null;
  readonly averageRating?: number | null;
  readonly reviewCount?: number | null;
  readonly verificationStatus?: string | null;
  readonly qualityScore?: number | null; // 0..1
  readonly showEdit?: boolean;
  readonly showMenu?: boolean;
  readonly menuItems?: MenuItem[];
  readonly onEdit?: (id: string | number) => void;
  readonly viewLabel?: string;
  readonly onView?: (id: string | number) => void;
}

export function TruckSummaryWithMenuCard(props: TruckSummaryWithMenuCardProps) {
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
    showMenu = true,
    menuItems = [],
    onEdit,
    viewLabel,
    onView,
  } = props;

  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  let standardActionButton: ReactNode | undefined;
  if (showEdit === true) {
    standardActionButton = (
      <Button variant="outline" size="sm" onClick={() => onEdit?.(id)}>
        <Settings className="h-4 w-4 mr-2" />
        Edit
      </Button>
    );
  } else if (typeof onView === 'function') {
    standardActionButton = (
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

  const actionButton = (
    <div className="flex gap-2">
      {showMenu && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMenuExpanded(!isMenuExpanded)}
          aria-expanded={isMenuExpanded}
          aria-label={isMenuExpanded ? 'Collapse menu' : 'Expand menu'}
        >
          <Utensils className="h-4 w-4 mr-2" />
          Menu
        </Button>
      )}
      {standardActionButton}
    </div>
  );

  const additionalContent =
    showMenu && isMenuExpanded ? (
      <div className="mt-4 pt-4 border-t">
        <MenuManagementSection truckId={String(id)} initialMenuItems={menuItems} />
      </div>
    ) : undefined;

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
      additionalContent={additionalContent}
      cardClassName="overflow-hidden"
    />
  );
}
