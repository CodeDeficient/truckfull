'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Facebook, AlertCircle } from 'lucide-react';
import type { FacebookPageRecord } from '@/lib/services/facebookService';

type BusinessAuthStatus = 'connected' | 'missing' | 'expired' | 'misconfigured';

interface FacebookPagesResponse {
  pages: FacebookPageRecord[];
  needsBusinessAuth: boolean;
  authStatus: BusinessAuthStatus;
}

interface FacebookPageSelectorProps {
  readonly selectedPageId: string | undefined;
  readonly onPageSelect: (pageId: string, pageName: string) => void;
  readonly userId: string | undefined;
}

function getBusinessAuthMessage(authStatus: BusinessAuthStatus): string {
  if (authStatus === 'expired') {
    return 'Your Facebook Business authorization expired. Reauthorize to continue.';
  }

  if (authStatus === 'misconfigured') {
    return 'Facebook connection is temporarily unavailable. Please try again later.';
  }

  return 'Authorize Facebook Business to fetch and select your Pages.';
}

export function FacebookPageSelector({
  selectedPageId,
  onPageSelect,
  userId,
}: FacebookPageSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<FacebookPageRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsBusinessAuth, setNeedsBusinessAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<BusinessAuthStatus>('missing');

  const authStartUrl = useMemo(() => {
    if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
      return '/api/owner/facebook/oauth/start';
    }

    const params = new URLSearchParams();
    const safeReturnPath = globalThis.location.pathname.startsWith('/owner-dashboard')
      ? globalThis.location.pathname
      : '/owner-dashboard/register';
    params.set('returnPath', safeReturnPath);

    return `/api/owner/facebook/oauth/start?${params.toString()}`;
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPages = async () => {
      try {
        const response = await fetch('/api/owner/facebook/pages');
        const data = (await response.json()) as Partial<FacebookPagesResponse> & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch Facebook pages');
        }

        setPages(data.pages ?? []);
        setNeedsBusinessAuth(data.needsBusinessAuth === true);
        setAuthStatus(data.authStatus ?? 'missing');
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to load Facebook pages');
      } finally {
        setLoading(false);
      }
    };

    void fetchPages();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading Facebook pages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => globalThis.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Connect Facebook Page
          </CardTitle>
          <CardDescription>Connect your Facebook Page to automatically sync posts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {needsBusinessAuth
              ? getBusinessAuthMessage(authStatus)
              : 'No Facebook pages are cached yet. You can authorize again to refresh your pages.'}
          </p>
          <Button asChild>
            <a href={authStartUrl}>Authorize Facebook Business</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Facebook Page (Optional)</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onPageSelect('', '')}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            selectedPageId
              ? 'border-border hover:border-primary/50'
              : 'border-primary bg-primary/5'
          }`}
        >
          <div className="font-medium">No Page</div>
          <div className="text-sm text-muted-foreground">Skip Facebook integration for now</div>
        </button>
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => onPageSelect(page.facebook_page_id, page.page_name)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedPageId === page.facebook_page_id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {page.picture_url && (
                <img
                  src={page.picture_url}
                  alt={page.page_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <div className="font-medium">{page.page_name}</div>
                {page.category && <div className="text-sm text-muted-foreground">{page.category}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
