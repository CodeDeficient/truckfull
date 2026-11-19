'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Map as MapIcon,
  FileText,
  Calendar,
  Bookmark,
  ClipboardList,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { EventDiscovery } from './events/EventDiscovery';
import { EventMapTab } from './events/EventMapTab';
import { MyApplications } from './events/MyApplications';
import { EventCalendar } from './events/EventCalendar';
import { SavedLeads } from './events/SavedLeads';
import { EventInvestigate } from './events/EventInvestigate';
import { EventQuickCheck } from './events/EventQuickCheck';
import {
  getMobileGridCols,
  getTabTouchTargetClass,
  getCollapseBtnClass,
} from './eventsTabLayout';

const TRIGGER =
  'flex items-center gap-2 px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-600/25 hover:text-red-100';

export interface TabConfig {
  value: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  proOnly?: boolean;
  spanTwo?: boolean;
}

export const TAB_CONFIG: TabConfig[] = [
  { value: 'map', label: 'Map', mobileLabel: 'Map', icon: MapIcon },
  { value: 'discover', label: 'Discover', mobileLabel: 'Discover', icon: Search },
  { value: 'applications', label: 'My Applications', mobileLabel: 'Apps', icon: FileText },
  { value: 'calendar', label: 'Calendar', mobileLabel: 'Calendar', icon: Calendar },
  { value: 'saved', label: 'Saved', mobileLabel: 'Saved', icon: Bookmark },
  { value: 'quick-check', label: 'Quick Check', mobileLabel: 'Check', icon: ShieldCheck },
  {
    value: 'investigate',
    label: 'Investigate',
    mobileLabel: 'Investigate',
    icon: ClipboardList,
    proOnly: true,
    spanTwo: true,
  },
];

export function getVisibleTabs(userTier?: string): TabConfig[] {
  return TAB_CONFIG.filter((tab) => !tab.proOnly || userTier === 'pro' || userTier === 'enterprise');
}

interface EventsTabProps {
  truckId?: string;
  userId?: string;
  userTier?: string;
}

export function EventsTab({ truckId, userId, userTier }: EventsTabProps) {
  const [activeTab, setActiveTab] = useState('map');
  const [gridCollapsed, setGridCollapsed] = useState(false);
  const isMap = activeTab === 'map';

  const visibleTabs = getVisibleTabs(userTier);

  const activeTabConfig = visibleTabs.find((t) => t.value === activeTab);

  return (
    <div className="flex flex-col h-full min-h-0 sm:gap-4">

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={`w-full flex flex-col flex-1 min-h-0 ${isMap ? 'overflow-hidden' : ''}`}
      >
        <TabsList className="hidden sm:inline-flex h-10 items-center justify-center rounded-md bg-red-950/40 p-1 text-red-100/70 border border-red-900/30 shrink-0">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={TRIGGER}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.proOnly && (
                <span className="ml-1.5 experimental-glow-border rounded">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-amber-400">
                    Experimental
                  </span>
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {gridCollapsed ? (
          <button
            data-testid="floating-tab-btn"
            type="button"
            onClick={() => setGridCollapsed(false)}
            className="sm:hidden flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            {activeTabConfig && <activeTabConfig.icon className="w-4 h-4" />}
            <span>{activeTabConfig?.mobileLabel}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="sm:hidden flex flex-col gap-1.5" data-testid="mobile-tab-grid-wrapper">
            <div
              data-testid="mobile-tab-grid"
              className={getMobileGridCols(visibleTabs.length)}
            >
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.value;
                if (tab.proOnly) {
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      data-testid={
                        isActive
                          ? 'mobile-tab-cell-active'
                          : `mobile-tab-${tab.value}`
                      }
                      onClick={() => setActiveTab(tab.value)}
                      className={`experimental-glow-btn w-full rounded-lg ${
                        tab.spanTwo ? 'col-span-2' : ''
                      }`}
                    >
                      <div
                        className="glow-inner flex-row"
                        data-active={isActive}
                      >
                        <tab.icon className="w-5 h-5 shrink-0" />
                        <div className="flex flex-col items-center">
                          <span className={`text-xs text-white ${tab.spanTwo ? 'font-medium' : ''}`}>
                            {tab.mobileLabel}
                          </span>
                          <span className="text-[8px] text-amber-400 font-medium uppercase tracking-wider">
                            Experimental
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
                return (
                  <button
                    key={tab.value}
                    type="button"
                    data-testid={
                      isActive
                        ? 'mobile-tab-cell-active'
                        : `mobile-tab-${tab.value}`
                    }
                    onClick={() => setActiveTab(tab.value)}
                    className={`${getTabTouchTargetClass()} ${
                      tab.spanTwo ? 'col-span-2' : ''
                    } ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'bg-red-950/40 text-red-100/70'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className={`text-xs ${tab.spanTwo ? 'font-medium' : ''}`}>
                      {tab.mobileLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              data-testid="collapse-grid-btn"
              type="button"
              onClick={() => setGridCollapsed(true)}
              className={`${getCollapseBtnClass()} text-red-100/70 hover:text-white`}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={`flex-1 min-h-0 ${isMap ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
          <TabsContent value="discover" className="mt-4 w-full">
            <EventDiscovery truckId={truckId} userTier={userTier} />
          </TabsContent>

          <TabsContent value="map" className="[&[data-state=active]]:flex-1 [&[data-state=active]]:min-h-0 mt-0 w-full">
            <EventMapTab truckId={truckId} userTier={userTier} />
          </TabsContent>

          <TabsContent value="applications" className="mt-4 w-full">
            <MyApplications truckId={truckId} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 w-full">
            <EventCalendar truckId={truckId} userId={userId} />
          </TabsContent>

          <TabsContent value="saved" className="mt-4 w-full">
            <SavedLeads truckId={truckId} userTier={userTier} />
          </TabsContent>

          <TabsContent value="quick-check" className="mt-4 w-full">
            <EventQuickCheck />
          </TabsContent>

          {(userTier === 'pro' || userTier === 'enterprise') && (
          <TabsContent value="investigate" className="mt-4 w-full">
            <EventInvestigate truckId={truckId} userTier={userTier} onSwitchTab={setActiveTab} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
