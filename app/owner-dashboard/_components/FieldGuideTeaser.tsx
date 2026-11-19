import { Map, TrendingUp, Zap, Crown, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BILLING_CONFIG } from '@/lib/config/billing';

interface FieldGuideTeaserProps {
  onUpgrade: () => void;
  currentTier?: string;
}

export function FieldGuideTeaser({
  onUpgrade,
  currentTier: _currentTier = 'free',
}: FieldGuideTeaserProps) {
  return (
    <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Field Guide</h1>
            </div>
            <p className="text-lg opacity-90">
              Discover top locations for your food truck with real-time traffic intelligence
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Video Preview */}
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
              <video
                src="/field-guide-demo-optimized.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
                controlsList="nodownload"
                title="Field Guide Demo"
                className="w-full h-auto"
              />
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-3">
                  <Map className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold mb-2">Traffic Heatmaps</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visualize historical traffic patterns to find high-traffic locations
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Top Locations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Rank locations by traffic volume and find the best spots
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Traffic Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Percentile rankings and traffic-level analysis
                </p>
              </div>
            </div>

            {/* Coming Soon Banner */}
            <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                <span className="font-semibold">Coming Soon:</span> Live traffic data, foot traffic
                analytics (Pro), nearby businesses
              </p>
            </div>

            {/* CTA */}
            <div className="text-center">
              <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  Available on Pro tier
                </p>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 line-through">$50/mo</span>
                    <span className="ml-2 font-semibold text-orange-700 dark:text-orange-300">
                      $25/mo
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                    Founding Member: 50% Off
                  </span>
                </div>
              </div>
              {BILLING_CONFIG.PAUSED ? (
                <Button
                  size="lg"
                  disabled
                  variant="outline"
                >
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              ) : (
                <Button
                  onClick={onUpgrade}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
