// Shared dashboard types used across admin components

export interface DataQualityStats {
  readonly total_trucks: number;
  readonly avg_quality_score: number;
  readonly high_quality_count: number;
  readonly medium_quality_count: number;
  readonly low_quality_count: number;
  readonly verified_count: number;
  readonly pending_count: number;
  readonly flagged_count: number;
}

export interface DashboardData {
  readonly totalFoodTrucks: number;
  readonly pendingVerifications: number;
  readonly failedProcessingQueueItemsCount: number;
  readonly dataQualityStats: DataQualityStats;
}

export interface StatisticsCardsSectionProps {
  readonly dashboardData: DashboardData;
}
