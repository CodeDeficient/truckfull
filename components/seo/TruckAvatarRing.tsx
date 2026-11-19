'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import { getTruckProfileImage } from '@/lib/utils/photoTransform';
import { getTruckStatusFromHours } from '@/lib/utils/foodTruckHelpers';
import { getStatusRingStyleFromStatus } from '@/lib/utils/statusRing';
import type { FoodTruckOperatingHours } from '@/lib/types';

interface TruckAvatarRingProps {
  readonly slug: string;
  readonly name: string;
  readonly socialMedia: unknown;
  readonly operatingHours: unknown;
  readonly isClaimed: boolean | null;
}

export default function TruckAvatarRing({
  slug,
  name,
  socialMedia,
  operatingHours,
  isClaimed,
}: TruckAvatarRingProps) {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    setStatus(
      getTruckStatusFromHours(
        operatingHours as FoodTruckOperatingHours | null,
        isClaimed,
      ),
    );
  }, [operatingHours, isClaimed]);

  const imageSrc = getTruckProfileImage(
    socialMedia == null ? null : { social_media: socialMedia as { photo_url?: string | null } | null },
  );

  return (
    <Link
      href={`/${slug}`}
      tabIndex={-1}
      className="shrink-0 size-14 rounded-full overflow-hidden relative"
      style={getStatusRingStyleFromStatus(status)}
    >
      <Image
        src={imageSrc}
        alt={name}
        fill
        sizes="56px"
        className="object-cover"
      />
    </Link>
  );
}
