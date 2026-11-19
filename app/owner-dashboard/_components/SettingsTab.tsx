import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Facebook, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { getSupabase } from '@/lib/supabase/client';
import { logError } from '@/lib/logging';
import type { FoodTruckDomain } from '@/lib/types';
import { AccountSettingsForm } from './AccountSettingsForm';
import { PreferencesSettingsForm } from './PreferencesSettingsForm';
import { FacebookPageConnection } from '@/components/owner/FacebookPageConnection';
import { PostProcessingHistory } from '@/components/owner/PostProcessingHistory';
import { NoTrucksGuidance } from './NoTrucksGuidance';
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsTabProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
  readonly userTier: string;
}

interface SettingsStore {
  settings: {
    animations: boolean;
    emailNotifications: boolean;
    locationSharing: boolean;
    searchRadius: string;
    language: string;
    region: string;
    analytics: boolean;
  };
  updateSettings: (newSettings: Partial<SettingsStore['settings']>) => void;
  resetSettings: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        animations: true,
        emailNotifications: true,
        locationSharing: true,
        searchRadius: '5',
        language: 'en',
        region: 'us',
        analytics: true,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () =>
        set({
          settings: {
            animations: true,
            emailNotifications: true,
            locationSharing: true,
            searchRadius: '5',
            language: 'en',
            region: 'us',
            analytics: true,
          },
        }),
      loading: false,
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'food-truck-settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

interface AccountSettingsData {
  displayName?: string;
  phone?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

interface User {
  email?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
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

const handleAccountSubmit = async (
  user: User | null,
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>,
  updateSettings: (newSettings: Partial<SettingsStore['settings']>) => void,
  data: AccountSettingsData,
) => {
  setIsSaving(true);
  try {
    const supabase = getSupabase();

    if (
      data.displayName !== (user?.user_metadata?.full_name ?? '') ||
      data.phone !== (user?.user_metadata?.phone ?? '')
    ) {
      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: data.displayName,
          phone: data.phone,
        },
      });

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      toast.success('Profile settings updated successfully!');
    }

    if (data.email && data.email !== user?.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.email,
      });

      if (emailError) {
        throw new Error(`Email update failed: ${emailError.message}`);
      }

      toast.info('Confirmation email sent to your new address.');
    }

    if (data.newPassword && data.currentPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (passwordError) {
        throw new Error(`Password update failed: ${passwordError.message}`);
      }

      toast.success('Password updated successfully!');
    }
  } catch (error: unknown) {
    logError('Account settings update error:', error);
    toast.error((error as Error)?.message ?? 'Failed to update account settings');
  } finally {
    setIsSaving(false);
  }
};

const handlePreferenceSubmit = (
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>,
  updateSettings: (newSettings: Partial<SettingsStore['settings']>) => void,
  data: Partial<SettingsStore['settings']>,
) => {
  setIsSaving(true);
  try {
    updateSettings(data);
    toast.success('Preference settings updated successfully!');
  } catch (error: unknown) {
    logError('Preference settings update error:', error);
    toast.error((error as Error)?.message ?? 'Failed to update preference settings');
  } finally {
    setIsSaving(false);
  }
};

export function FacebookIntegrationSection({
  userId: _userId,
  truckId,
}: {
  userId: string;
  truckId: string;
}) {
  const [state, setState] = useState<FacebookIntegrationState>({
    connection: null,
    loading: true,
    error: null,
  });
  const [showPageModal, setShowPageModal] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const handledBusinessOauthSuccessRef = useRef(false);

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

  const fetchFacebookConnection = useCallback(async (): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ connection: null, loading: true, error: null });
    try {
      const response = await fetch(`/api/owner/facebook/trucks/${truckId}`, {
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
  }, [truckId]);

  useEffect(() => {
    void fetchFacebookConnection();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchFacebookConnection]);

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

  const toggleWebhookSync = async (enabled: boolean): Promise<void> => {
    try {
      const response = await fetch('/api/owner/facebook/toggle-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId, enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook sync');
      }

      toast.success('Webhook sync updated successfully');
      await fetchFacebookConnection();
    } catch (error) {
      logError('Failed to toggle webhook sync:', error);
      toast.error('Failed to update webhook sync');
    }
  };

  const handlePageConnect = async (pageId: string, pageName: string): Promise<void> => {
    try {
      const response = await fetch('/api/owner/facebook/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId, pageId, pageName }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect page');
      }

      toast.success('Facebook page connected successfully');
      setShowPageModal(false);
      await fetchFacebookConnection();
    } catch (error) {
      logError('Failed to connect page:', error);
      toast.error('Failed to connect page');
    }
  };

  if (state.loading) {
    return (
      <div data-testid="facebook-loading" className="flex items-center justify-center py-12">
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

  if (!state.connection || !state.connection.facebook_page_id) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Facebook className="h-12 w-12 text-[#1877F2]" />
          <p className="text-muted-foreground">No Facebook page connected</p>
          <a
            href={oauthStartUrl}
            className="inline-flex items-center justify-center rounded-md bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1877F2]/90 transition-colors"
          >
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

  const connectedDate = state.connection.facebook_last_sync
    ? new Date(state.connection.facebook_last_sync).toLocaleDateString()
    : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-border/20">
              {state.connection.facebook_page_picture ? (
                <AvatarImage
                  src={state.connection.facebook_page_picture}
                  alt={state.connection.facebook_page_name}
                />
              ) : (
                <AvatarFallback className="bg-muted">
                  <Facebook className="h-8 w-8 text-[#1877F2]" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{state.connection.facebook_page_name}</h3>
              <p className="text-sm text-muted-foreground">
                {connectedDate && `Connected on ${connectedDate}`}
              </p>
            </div>
          </div>
          <a
            href={oauthStartUrl}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Change
          </a>
        </div>

        <div className="space-y-4 py-4 border-t border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Webhook Sync</h4>
              <p className="text-sm text-muted-foreground">Automatically process Facebook posts</p>
            </div>
            <Switch
              checked={state.connection.facebook_auto_updates_enabled}
              onCheckedChange={(value) => {
                if (typeof value === 'boolean') {
                  void toggleWebhookSync(value);
                }
              }}
              aria-label="Enable webhook sync"
            />
          </div>

          {state.connection.facebook_last_sync && (
            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3">
              <span className="text-muted-foreground">Last sync</span>
              <span className="font-medium">
                {new Date(state.connection.facebook_last_sync).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 py-4 border-t border-border/20">
          <h4 className="font-medium">Recent Post Processing</h4>
          <PostProcessingHistory truckId={truckId} limit={5} />
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
    </>
  );
}

export function SettingsTab({ trucks, userTier }: SettingsTabProps) {
  const { user } = useSafeAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const { settings, updateSettings } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const params = new URLSearchParams(globalThis.window.location.search);
    if (params.has('facebookBusinessStatus') || params.has('facebookTruckId')) {
      setActiveTab('facebook');
    }
  }, []);

  useEffect(() => {
    if (trucks.length === 0) {
      setSelectedTruckId('');
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

  const userId = user?.user_metadata?.sub ?? user?.id ?? '';
  const showTruckSelector = (userTier === 'pro' || userTier === 'enterprise') && trucks.length > 1;

  return (
    <div className="bg-card rounded-lg p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4 mt-4">
          <AccountSettingsForm
            onSubmit={(data) => {
              void handleAccountSubmit(user ?? null, setIsSaving, updateSettings, data);
            }}
            isSaving={isSaving}
            resetForm={() => {}}
          />
          <div className="pt-4 border-t border-border/20">
            <DeleteAccountButton />
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-4">
          <PreferencesSettingsForm
            onSubmit={(data) => handlePreferenceSubmit(setIsSaving, updateSettings, data)}
            isSaving={isSaving}
            resetForm={() =>
              updateSettings({
                animations: true,
                emailNotifications: true,
                locationSharing: true,
                searchRadius: '5',
                language: 'en',
                region: 'us',
                analytics: true,
              })
            }
            settings={settings}
          />
        </TabsContent>

        <TabsContent value="facebook" className="space-y-4 mt-4">
          {trucks.length === 0 ? (
            <NoTrucksGuidance />
          ) : (
            <>
              {showTruckSelector && (
                <select
                  id="truck-select"
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="w-full rounded-md bg-muted/50 px-3 py-2 text-sm border-0 focus:ring-0 mb-4"
                >
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name}
                    </option>
                  ))}
                </select>
              )}
              {(selectedTruckId || trucks[0]?.id) && (
                <FacebookIntegrationSection
                  userId={userId}
                  truckId={selectedTruckId ?? trucks[0]!.id}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
