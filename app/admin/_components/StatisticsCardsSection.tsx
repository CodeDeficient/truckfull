import { TotalFoodTrucksCard } from '@/components/admin/dashboard/TotalFoodTrucksCard';
import { DataQualityScoreCard } from '@/components/admin/dashboard/DataQualityScoreCard';
import { QualityDistributionCard } from '@/components/admin/dashboard/QualityDistributionCard';
import { RecentErrorsCard } from '@/components/admin/dashboard/RecentErrorsCard';
import { StatisticsCardsSectionProps } from './types';

export function StatisticsCardsSection({ dashboardData }: StatisticsCardsSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TotalFoodTrucksCard
        totalFoodTrucks={dashboardData.totalFoodTrucks}
        pendingVerifications={dashboardData.pendingVerifications}
      />
      <DataQualityScoreCard dataQualityStats={dashboardData.dataQualityStats} />
      <QualityDistributionCard dataQualityStats={dashboardData.dataQualityStats} />
      <RecentErrorsCard
        failedProcessingQueueItemsCount={dashboardData.failedProcessingQueueItemsCount}
      />
    </div>
  );
}
