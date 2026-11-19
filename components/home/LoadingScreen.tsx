import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with real LCP elements — painted before JS chunk loads */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Image
            src="/truckfull-icon-transparent.webp"
            alt="TruckFull Logo"
            width={92}
            height={64}
            priority
            className="h-12 object-contain w-auto"
          />
          <div className="font-lobster text-white text-3xl font-bold neon-glow glow-red">
            TruckFull
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="w-full max-w-4xl p-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-96" />
          </div>
          <div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
