'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Facebook,
  CheckCircle2,
  Wifi,
  WifiOff,
  Trash2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { logError } from '@/lib/logging';
import type { FoodTruckDomain } from '@/lib/types';
import { FacebookPageConnection } from '@/components/owner/FacebookPageConnection';
import { PostProcessingHistory } from '@/components/owner/PostProcessingHistory';
import { NoTrucksGuidance } from './NoTrucksGuidance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface AutomaticUpdatesProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
}

interface FacebookConnection {
  facebook_page_id: string;
  facebook_page_name: string;
  facebook_page_picture?: string;
  facebook_auto_updates_enabled: boolean;
  facebook_last_sync?: string;
}

interface FacebookIntegrationState {
  connection: FacebookConnection | null;
  loading: boolean;
  error: string | null;
}

interface TruckData {
  id: string;
  facebook_page_id?: string;
  facebook_page_name?: string;
  facebook_auto_updates_enabled: boolean;
  facebook_last_sync?: string;
}

interface SyncPostsResponse {
  synced: number;
  syncedAt: string;
}

interface ManualSync {
  readonly truckId: string;
  readonly syncedAt: string;
}

export function ManualSyncStatus({
  currentTruckId,
  sync,
}: {
  readonly currentTruckId: string;
  readonly sync: ManualSync | null;
}): ReactNode {
  if (!sync || sync.truckId !== currentTruckId) return null;

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
      <span className="flex items-center gap-1 text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Last manually synced
      </span>
      <span className="font-medium">{new Date(sync.syncedAt).toLocaleString('en-US')}</span>
    </div>
  );
}

export function AutomaticUpdatesClient({ trucks }: AutomaticUpdatesProps) {
  useSafeAuth();
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [state, setState] = useState<FacebookIntegrationState>({
    connection: null,
    loading: true,
    error: null,
  });
  const [showPageModal, setShowPageModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncRefreshKey, setSyncRefreshKey] = useState(0);
  const [lastManualSync, setLastManualSync] = useState<ManualSync | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const handledBusinessOauthSuccessRef = useRef(false);

  const fetchFacebookConnection = useCallback(async (): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ connection: null, loading: true, error: null });
    try {
      const response = await fetch(`/api/owner/facebook/trucks/${selectedTruckId}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook connection');
      }

      const data = await response.json();

      if (data.truck) {
        const truck = data.truck as TruckData;
        const connection: FacebookConnection = {
          facebook_page_id: truck.facebook_page_id ?? '',
          facebook_page_name: truck.facebook_page_name ?? '',
          facebook_auto_updates_enabled: truck.facebook_auto_updates_enabled ?? false,
          facebook_last_sync: truck.facebook_last_sync,
        };
        setState({ connection, loading: false, error: null });
      } else {
        setState({ connection: null, loading: false, error: null });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      logError('Failed to fetch Facebook connection:', error);
      setState({ connection: null, loading: false, error: 'Failed to load Facebook integration' });
    }
  }, [selectedTruckId]);

  const toggleWebhookSync = async (enabled: boolean): Promise<void> => {
    try {
      const response = await fetch('/api/owner/facebook/toggle-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: selectedTruckId, enabled }),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: 'Failed to update webhook sync' }));
        throw new Error(data.error || 'Failed to update webhook sync');
      }

      toast.success('Webhook sync updated successfully');
      await fetchFacebookConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update webhook sync';
      logError('Failed to toggle webhook sync:', error);
      toast.error(message);
    }
  };

  const handlePageConnect = async (pageId: string, pageName: string): Promise<void> => {
    try {
      const response = await fetch('/api/owner/facebook/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: selectedTruckId, pageId, pageName }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect page');
      }

      toast.success('Facebook page connected successfully');
      setLastManualSync(null);
      setShowPageModal(false);
      await fetchFacebookConnection();
    } catch (error) {
      logError('Failed to connect page:', error);
      toast.error('Failed to connect page');
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/owner/facebook/disconnect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: selectedTruckId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success('Facebook page disconnected');
      setLastManualSync(null);
      setShowDisconnectDialog(false);
      await fetchFacebookConnection();
    } catch (error) {
      logError('Failed to disconnect page:', error);
      toast.error('Failed to disconnect page');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const syncPosts = async (): Promise<void> => {
    const syncingTruckId = selectedTruckId;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/owner/facebook/sync-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: syncingTruckId, limit: 10 }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to sync posts' }));
        throw new Error(data.error || 'Failed to sync posts');
      }

      const data = (await response.json()) as SyncPostsResponse;
      setLastManualSync({ truckId: syncingTruckId, syncedAt: data.syncedAt });
      toast.success(`Synced ${data.synced} posts from Facebook`);
      setSyncRefreshKey((prev) => prev + 1);
      await fetchFacebookConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync posts';
      logError('Failed to sync Facebook posts:', error);
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (trucks.length === 0) {
      setSelectedTruckId('');
      setState({ connection: null, loading: false, error: null });
      return;
    }

    const oauthTruckId =
      globalThis.window === undefined
        ? null
        : new URLSearchParams(globalThis.window.location.search).get('facebookTruckId');
    const resolvedTruckId =
      oauthTruckId && trucks.some((truck) => truck.id === oauthTruckId)
        ? oauthTruckId
        : trucks[0].id;

    if (!selectedTruckId || !trucks.some((t) => t.id === selectedTruckId)) {
      setSelectedTruckId(resolvedTruckId);
    }
  }, [trucks, selectedTruckId]);

  useEffect(() => {
    if (selectedTruckId) {
      void fetchFacebookConnection();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchFacebookConnection, selectedTruckId]);

  useEffect(() => {
    if (
      handledBusinessOauthSuccessRef.current ||
      state.loading ||
      state.error !== null ||
      globalThis.window === undefined
    ) {
      return;
    }

    const url = new URL(globalThis.window.location.href);
    if (url.searchParams.get('facebookBusinessStatus') !== 'success') {
      return;
    }

    handledBusinessOauthSuccessRef.current = true;
    url.searchParams.delete('facebookBusinessStatus');
    url.searchParams.delete('facebookTruckId');
    globalThis.window.history.replaceState(globalThis.window.history.state, '', url.toString());

    if (!state.connection?.facebook_page_id) {
      setShowPageModal(true);
    }
  }, [state.connection?.facebook_page_id, state.loading]);

  if (state.loading) {
    return (
      <div
        data-testid="automatic-updates-loading"
        className="flex items-center justify-center py-12"
      >
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{state.error}</p>
        <Button
          onClick={() => void fetchFacebookConnection()}
          variant="ghost"
          className="bg-primary/10 text-primary font-semibold hover:bg-primary/15"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 md:p-6">
      {trucks.length === 0 ? (
        <NoTrucksGuidance />
      ) : (
        <>
          {trucks.length > 1 && (
            <div className="mb-4">
              <label
                htmlFor="truck-select"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Choose your TruckFull profile
              </label>
              <select
                id="truck-select"
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full rounded-md bg-muted/50 px-3 py-2 text-sm border-0 focus:ring-0"
              >
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedTruckId || trucks[0]?.id) && (
            <FacebookIntegrationContent
              truckId={selectedTruckId ?? trucks[0]!.id}
              connection={state.connection}
              onFetch={fetchFacebookConnection}
              onToggleWebhook={toggleWebhookSync}
              onConnectPage={handlePageConnect}
              onSyncPosts={syncPosts}
              isSyncing={isSyncing}
              syncRefreshKey={syncRefreshKey}
              lastManualSync={lastManualSync}
              showPageModal={showPageModal}
              setShowPageModal={setShowPageModal}
              showDisconnectDialog={showDisconnectDialog}
              setShowDisconnectDialog={setShowDisconnectDialog}
              isDisconnecting={isDisconnecting}
              onDisconnect={handleDisconnect}
            />
          )}
        </>
      )}
    </div>
  );
}

interface FacebookIntegrationContentProps {
  readonly truckId: string;
  readonly connection: FacebookConnection | null;
  readonly onFetch: () => Promise<void>;
  readonly onToggleWebhook: (enabled: boolean) => Promise<void>;
  readonly onConnectPage: (pageId: string, pageName: string) => Promise<void>;
  readonly onSyncPosts: () => Promise<void>;
  readonly isSyncing: boolean;
  readonly syncRefreshKey: number;
  readonly lastManualSync: ManualSync | null;
  readonly showPageModal: boolean;
  readonly setShowPageModal: (show: boolean) => void;
  readonly showDisconnectDialog: boolean;
  readonly setShowDisconnectDialog: (show: boolean) => void;
  readonly isDisconnecting: boolean;
  readonly onDisconnect: () => Promise<void>;
}

function FacebookIntegrationContent({
  truckId,
  connection,
  onToggleWebhook,
  onConnectPage,
  onSyncPosts,
  isSyncing,
  syncRefreshKey,
  lastManualSync,
  showPageModal,
  setShowPageModal,
  showDisconnectDialog,
  setShowDisconnectDialog,
  isDisconnecting,
  onDisconnect,
}: FacebookIntegrationContentProps) {
  const oauthStartUrl = useMemo(() => {
    if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
      return '/api/owner/facebook/oauth/start';
    }
    const params = new URLSearchParams();
    const safeReturnPath = globalThis.location.pathname.startsWith('/owner-dashboard')
      ? globalThis.location.pathname
      : '/owner-dashboard/facebook';
    params.set('returnPath', safeReturnPath);
    if (truckId) {
      params.set('truckId', truckId);
    }
    return `/api/owner/facebook/oauth/start?${params.toString()}`;
  }, [truckId]);

  const handlePageConnect = async (pageId: string, pageName: string): Promise<void> => {
    await onConnectPage(pageId, pageName);
  };

  if (!connection || !connection.facebook_page_id) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-muted p-4">
            <Facebook className="h-12 w-12 text-[#1877F2]" />
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <WifiOff className="h-3 w-3 mr-1" />
                Not Connected
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Connect your Facebook page to automatically sync posts
            </p>
          </div>
          <a
            href={oauthStartUrl}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1877F2]/90 transition-colors"
          >
            <Facebook className="h-4 w-4 mr-2" />
            Connect Facebook Page
          </a>
        </div>

        <Dialog open={showPageModal} onOpenChange={setShowPageModal}>
          <DialogContent className="max-w-2xl border-0 bg-card">
            <DialogHeader>
              <DialogTitle>Select a Facebook Page</DialogTitle>
            </DialogHeader>
            <FacebookPageConnection onConnect={handlePageConnect} truckId={truckId} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const connectedDate = connection.facebook_last_sync
    ? new Date(connection.facebook_last_sync).toLocaleDateString('en-US', { timeZone: 'UTC' })
    : null;

  const isWebhookActive = connection.facebook_auto_updates_enabled;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Facebook Profile:</span>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-border/20 shadow-sm">
                  {connection.facebook_page_picture ? (
                    <AvatarImage
                      src={connection.facebook_page_picture}
                      alt={connection.facebook_page_name}
                    />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <Facebook className="h-8 w-8 text-[#1877F2]" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-green-600 p-1">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{connection.facebook_page_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-600/10 text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </span>
                  {connectedDate && (
                    <span className="text-xs text-muted-foreground">since {connectedDate}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={oauthStartUrl}
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change Page
              </a>
              <Button
                variant="ghost"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={isDisconnecting}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Disconnect Facebook page"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 py-4 border-t border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Automatic Sync
              </h4>
              <p className="text-sm text-muted-foreground">
                {isWebhookActive
                  ? 'New posts will be automatically processed'
                  : 'Turn on to auto-sync posts from Facebook'}
              </p>
            </div>
            <Switch
              checked={connection.facebook_auto_updates_enabled}
              onCheckedChange={(value) => {
                if (typeof value === 'boolean') {
                  void onToggleWebhook(value);
                }
              }}
              aria-label="Enable webhook sync"
            />
          </div>
        </div>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Sync Posts
              </h4>
              <p className="text-sm text-muted-foreground">
                Fetch recent posts from Facebook manually
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onSyncPosts()}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
          <ManualSyncStatus currentTruckId={truckId} sync={lastManualSync} />
        </div>

        <div className="space-y-4 py-4 border-t border-border/20">
          <h4 className="font-medium">Recent Post Processing</h4>
          <PostProcessingHistory
            truckId={truckId}
            limit={5}
            pageName={connection.facebook_page_name}
            refreshKey={syncRefreshKey}
          />
        </div>
      </div>

      <Dialog open={showPageModal} onOpenChange={setShowPageModal}>
        <DialogContent className="max-w-2xl border-0 bg-card">
          <DialogHeader>
            <DialogTitle>Select a Facebook Page</DialogTitle>
          </DialogHeader>
          <FacebookPageConnection onConnect={handlePageConnect} truckId={truckId} />
        </DialogContent>
      </Dialog>

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md border-0 bg-card">
          <DialogHeader>
            <DialogTitle>Disconnect Facebook Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this Facebook page? This will disable auto-sync,
              clear the connected page data, and remove all recent post processing history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onDisconnect()}
              disabled={isDisconnecting}
            >
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
