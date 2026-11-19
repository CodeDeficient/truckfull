'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  MapPin,
  Facebook,
  Edit2,
  Clock,
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle,
} from 'lucide-react';
import type { LocationHistoryEntry } from './LocationHistory';

interface RollbackLocationProps {
  readonly truckId: string;
  readonly locationHistory: readonly LocationHistoryEntry[];
  readonly onRollback: (version: number) => void;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function RollbackLocation({
  truckId: _truckId,
  locationHistory,
  onRollback,
  isOpen = true,
  onClose,
}: RollbackLocationProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const sortedHistory = [...locationHistory].sort((a, b) => b.version - a.version);
  const currentVersion = sortedHistory[0]?.version;

  function handleRollbackClick(version: number) {
    if (version === currentVersion) {
      return;
    }

    setSelectedVersion(version);
    setShowConfirmDialog(true);
  }

  function handleConfirmRollback() {
    if (selectedVersion === null) {
      return;
    }

    setIsRollingBack(true);
    setShowConfirmDialog(false);
    onRollback(selectedVersion);
  }

  function handleCancelRollback() {
    setShowConfirmDialog(false);
    setSelectedVersion(null);
  }

  function handleDialogClose(open: boolean) {
    if (!open && onClose) {
      onClose();
    }
  }

  if (locationHistory.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Location</DialogTitle>
            <DialogDescription>No location history available</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No location history found for this truck.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (locationHistory.length === 1) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Location</DialogTitle>
            <DialogDescription>View location history</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>Only one location available. No rollback needed.</AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedLocation = sortedHistory.find((entry) => entry.version === selectedVersion);

  return (
    <>
      <Dialog open={isOpen && !showConfirmDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rollback Location</DialogTitle>
            <DialogDescription>Select a previous location version to restore</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {sortedHistory.map((entry, _index) => {
                const isCurrent = entry.version === currentVersion;
                const canRollback = !isCurrent;

                return (
                  <div
                    key={entry.id}
                    className={`flex flex-col gap-3 rounded-lg border p-4 ${
                      isCurrent ? 'bg-muted/50 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {entry.location.address || 'Unknown location'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {entry.source === 'facebook' && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Facebook className="h-3 w-3" />
                                  Facebook
                                </Badge>
                              )}
                              {entry.source === 'manual' && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Edit2 className="h-3 w-3" />
                                  Manual
                                </Badge>
                              )}
                              {entry.confidence !== undefined && (
                                <Badge
                                  variant={
                                    entry.confidence >= 0.9
                                      ? 'default'
                                      : entry.confidence >= 0.7
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                >
                                  {Math.round(entry.confidence * 100)}% confidence
                                </Badge>
                              )}
                              <Badge
                                variant={entry.status === 'active' ? 'default' : 'outline'}
                                className={
                                  entry.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''
                                }
                              >
                                {entry.status}
                              </Badge>
                              {isCurrent && (
                                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Version {entry.version} • {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {canRollback && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollbackClick(entry.version)}
                          disabled={isRollingBack}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isRollingBack}
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback to this location version?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will replace your current location. This action cannot be undone.
              </AlertDescription>
            </Alert>

            {selectedLocation && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">Rolling back to:</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {selectedLocation.location.address || 'Unknown location'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Version {selectedLocation.version} •{' '}
                      {new Date(selectedLocation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedLocation.source === 'facebook' && (
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      <Badge variant="outline" className="text-xs">
                        Facebook
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelRollback}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmRollback} disabled={isRollingBack}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
