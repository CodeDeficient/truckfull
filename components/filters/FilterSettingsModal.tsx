'use client';

import { Settings2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FilterSettingsModalProps {
  /** Whether to show only open trucks */
  readonly openNow: boolean;
  /** Callback when open now changes */
  readonly onOpenNowChange: (value: boolean) => void;
  /** Additional settings can be added here */
  readonly className?: string;
}

/**
 * Modal dialog for additional filter settings.
 * Contains settings that don't fit in the main filter bar.
 */
export function FilterSettingsModal({
  openNow,
  onOpenNowChange,
  className,
}: FilterSettingsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
          aria-label="Filter settings"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Settings</DialogTitle>
          <DialogDescription>
            Configure additional filter options for your search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Open Now Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="open-now" className="flex items-center gap-2 cursor-pointer">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Open Now</div>
                <div className="text-xs text-muted-foreground">
                  Show only trucks that are currently open
                </div>
              </div>
            </Label>
            <Switch
              id="open-now"
              checked={openNow}
              onCheckedChange={onOpenNowChange}
              aria-describedby="open-now-description"
            />
          </div>

          {/* Additional settings can be added here */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">More Options Coming Soon</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Price range filters</li>
              <li>• Dietary restrictions</li>
              <li>• Rating filters</li>
              <li>• Sort options</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
