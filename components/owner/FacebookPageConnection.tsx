'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';

type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'connecting' | 'connected';
type BusinessAuthStatus = 'connected' | 'missing' | 'expired' | 'misconfigured';

interface FacebookPage {
  facebook_page_id: string;
  page_name: string;
  picture_url?: string;
}

interface FacebookPagesResponse {
  pages: FacebookPage[];
  needsBusinessAuth: boolean;
  authStatus: BusinessAuthStatus;
}

interface FacebookPageConnectionProps {
  readonly onConnect: (pageId: string, pageName: string) => Promise<void>;
  readonly truckId?: string;
}

function getBusinessErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) {
    return null;
  }

  const messages: Record<string, string> = {
    missing_scopes:
      'Facebook authorization is missing required permissions. Approve all requested business scopes and try again.',
    app_mismatch:
      'Facebook app mismatch detected. Ensure the OAuth app and callback are configured for TruckFull.food.',
    oauth_exchange_failed:
      'Facebook denied or could not complete authorization. Please try connecting again.',
    long_lived_exchange_failed:
      'Facebook authorization completed, but token upgrade failed. Please reconnect and try again.',
    invalid_state: 'Authorization state was invalid or expired. Please start the connection again.',
    invalid_nonce: 'Authorization could not be verified securely. Please try again.',
    state_user_mismatch: 'Authorization was completed for a different account. Please retry while logged in.',
    oauth_not_configured:
      'Facebook connection is temporarily unavailable. Please try again later.',
    callback_internal_error: 'Facebook callback failed unexpectedly. Please retry in a moment.',
  };

  return messages[errorCode] ?? `Facebook authorization failed (${errorCode}). Please try again.`;
}

function getAuthStatusMessage(authStatus: BusinessAuthStatus): string {
  if (authStatus === 'expired') {
    return 'Your Facebook Business authorization has expired. Reauthorize to fetch and connect pages.';
  }

  if (authStatus === 'misconfigured') {
    return 'Facebook connection is temporarily unavailable. Please try again later.';
  }

  return 'Authorize Facebook Business to load and connect your Pages.';
}

export function FacebookPageConnection({ onConnect, truckId }: FacebookPageConnectionProps): JSX.Element {
  const [state, setState] = useState<LoadingState>('loading');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [needsBusinessAuth, setNeedsBusinessAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<BusinessAuthStatus>('missing');

  const businessCallbackError = useMemo(() => {
    if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
      return null;
    }

    const params = new URLSearchParams(globalThis.location.search);
    if (params.get('facebookBusinessStatus') !== 'error') {
      return null;
    }

    return getBusinessErrorMessage(params.get('facebookBusinessError'));
  }, []);

  const authStartUrl = useMemo(() => {
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

  useEffect(() => {
    const controller = new AbortController();

    setPages([]);
    setError(null);
    setState('loading');

    const fetchPages = async (): Promise<void> => {
      try {
        const response = await fetch('/api/owner/facebook/pages', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to fetch pages');
        }

        const raw: unknown = await response.json();

        if (
          typeof raw !== 'object' ||
          raw === null ||
          !('pages' in raw) ||
          !Array.isArray((raw as { pages: unknown }).pages)
        ) {
          throw new Error('Invalid response format');
        }

        const responseData = raw as Partial<FacebookPagesResponse> & { pages: unknown[] };

        const validPages = responseData.pages.filter(
          (page: unknown): page is FacebookPage =>
            typeof page === 'object' &&
            page !== null &&
            'facebook_page_id' in page &&
            'page_name' in page &&
            typeof (page as FacebookPage).facebook_page_id === 'string' &&
            typeof (page as FacebookPage).page_name === 'string' &&
            (!('picture_url' in page) || typeof (page as FacebookPage).picture_url === 'string'),
        );

        setPages(validPages);
        setNeedsBusinessAuth(responseData.needsBusinessAuth === true);
        setAuthStatus(responseData.authStatus ?? 'missing');
        setState('success');
      } catch (error_) {
        if (error_ instanceof DOMException && error_.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch Facebook pages:', error_);
        setError('Failed to load your Facebook pages');
        setState('error');
      }
    };

    void fetchPages();

    return () => {
      controller.abort();
    };
  }, []);

  const handleConnect = async (pageId: string): Promise<void> => {
    setSelectedPageId(pageId);
    setState('connecting');
    setError(null);

    try {
      const page = pages.find((p) => p.facebook_page_id === pageId);
      await onConnect(pageId, page?.page_name ?? '');
      setState('connected');
    } catch (error_) {
      console.error('Failed to connect Facebook page:', error_);
      setError('Failed to connect to Facebook');
      setState('error');
    }
  };

  const renderLoading = (): JSX.Element => (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <span className="ml-3 text-muted-foreground">
        <span className="sr-only">Loading your Facebook pages…</span>
        Loading your Facebook pages...
      </span>
    </div>
  );

  const renderError = (): JSX.Element => (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
      <p className="font-medium text-red-400">{error || 'Failed to load your Facebook pages'}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Please try refreshing the page or check your Facebook connection.
      </p>
    </div>
  );

  const renderBusinessAuthBanner = (): JSX.Element | null => {
    if (!needsBusinessAuth && !businessCallbackError) {
      return null;
    }

    return (
      <div
        className="rounded-lg border border-primary/20 bg-primary/10 p-6"
        data-testid="facebook-business-auth-banner"
      >
        <p className="font-medium text-foreground">Connect Facebook Business</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {businessCallbackError ?? getAuthStatusMessage(authStatus)}
        </p>
        <a
          href={authStartUrl}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Authorize Facebook Business
        </a>
      </div>
    );
  };

  const renderEmpty = (): JSX.Element => (
    <div className="space-y-4">
      {renderBusinessAuthBanner()}
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-foreground">No Facebook pages found.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {needsBusinessAuth
            ? 'Authorize Facebook Business first, then come back to select a page.'
            : 'No pages were returned from Facebook yet. Try reconnecting your business authorization.'}
        </p>
      </div>
    </div>
  );

  const renderConnecting = (): JSX.Element => (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <span className="ml-3 text-muted-foreground">Connecting...</span>
    </div>
  );

  const renderConnected = (): JSX.Element => (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-6">
      <p className="font-medium text-foreground">Page successfully connected!</p>
      <p className="mt-2 text-sm text-muted-foreground">Your Facebook page is now linked to your truck.</p>
    </div>
  );

  const renderPages = (): JSX.Element => (
    <div className="space-y-4">
      {renderBusinessAuthBanner()}
      {pages.map((page) => (
        <div
          key={page.facebook_page_id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {page.picture_url && (
              <img
                src={page.picture_url}
                alt={page.page_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="truncate font-medium text-foreground" title={page.page_name}>
                {page.page_name}
              </h3>
              <p className="font-mono text-sm text-muted-foreground" title={page.facebook_page_id}>
                {page.facebook_page_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleConnect(page.facebook_page_id)}
            disabled={state === 'connecting' || state === 'connected' || needsBusinessAuth}
            className="ml-4 flex-shrink-0 rounded-md bg-primary px-4 py-2 min-h-[44px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedPageId === page.facebook_page_id && state === 'connecting'
              ? 'Connecting...'
              : 'Connect This Page'}
          </button>
        </div>
      ))}
    </div>
  );

  if (state === 'loading' || state === 'idle') {
    return renderLoading();
  }

  if (state === 'connecting') {
    return renderConnecting();
  }

  if (state === 'connected') {
    return renderConnected();
  }

  if (state === 'error') {
    return (
      <div className="space-y-4">
        {renderBusinessAuthBanner()}
        {renderError()}
        {pages.length > 0 && renderPages()}
      </div>
    );
  }

  if (pages.length === 0) {
    return renderEmpty();
  }

  return renderPages();
}
