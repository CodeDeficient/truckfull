import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrucksTab } from './TrucksTab';
import { ScheduleTab } from './ScheduleTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SettingsTab } from './SettingsTab';
import { MenuTab } from './MenuTab';
import type { FoodTruckDomain } from '@/lib/types';

interface OwnerDashboardTabsProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
  readonly onCreate: () => void;
  readonly onEdit: (id: string | number) => void;
  readonly defaultValue?: string;
  readonly userTier?: string;
}

export function OwnerDashboardTabs({
  trucks,
  onCreate,
  onEdit,
  defaultValue = 'trucks',
  userTier = 'free',
}: OwnerDashboardTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="trucks">My Trucks</TabsTrigger>
        <TabsTrigger value="menu">Menu</TabsTrigger>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="trucks">
        <TrucksTab trucks={trucks} onCreate={onCreate} onEdit={onEdit} />
      </TabsContent>

      <TabsContent value="menu">
        <MenuTab trucks={trucks} />
      </TabsContent>

      <TabsContent value="schedule">
        <ScheduleTab trucks={trucks} />
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsTab />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsTab trucks={trucks} userTier={userTier} />
      </TabsContent>
    </Tabs>
  );
}
