'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  FileText,
  Facebook,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logging';
import type { ReactNode } from 'react';

interface Post {
  id: string;
  facebookPostId: string;
  message: string | null;
  status: string;
  confidence: number | null;
  fullPicture?: string | null;
  createdTime: string;
  processedAt: string | null;
}

interface PostsResponse {
  posts: Post[];
}

interface TimeAlternative {
  start: string;
  end: string;
  label: string;
}

interface Confirmation {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  update_type: string;
  proposed_data: {
    food_items?: string[];
    location?: { address?: string; fuzzy?: boolean };
    times?: { start?: string; end?: string; days?: string[] };
    serviceDate?: string;
    timeAlternatives?: TimeAlternative[];
    confidence?: number;
    reviewAction?:
      | 'ambiguous_location'
      | 'ambiguous_time'
      | 'missing_location'
      | 'unresolved_schedule';
  };
  low_confidence_reason: string | null;
}

interface ConfirmationsResponse {
  confirmations: Confirmation[];
}

interface PostProcessingHistoryProps {
  readonly truckId: string;
  readonly limit?: number;
  readonly pageName?: string;
  readonly refreshKey?: number;
}

function getStatusIcon(status: string): ReactNode {
  switch (status) {
    case 'processed': {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    case 'pending_review': {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    case 'pending_confirmation': {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    case 'rejected': {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    case 'failed': {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    default: {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'processed': {
      return 'Applied';
    }
    case 'pending_review': {
      return 'Needs Review';
    }
    case 'pending_confirmation': {
      return 'Needs Confirmation';
    }
    case 'rejected': {
      return 'Rejected';
    }
    case 'failed': {
      return 'Failed';
    }
    case 'pending': {
      return 'Pending';
    }
    default: {
      return status;
    }
  }
}

function truncateText(text: string | null, maxLength: number, hasImage: boolean = false): string {
  if (!text) return hasImage ? 'Photo post' : 'No message';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getReviewActionMessage(
  action?: Confirmation['proposed_data']['reviewAction'],
): string | null {
  switch (action) {
    case 'ambiguous_location': {
      return 'Review required: confirm the exact service location before applying.';
    }
    case 'missing_location': {
      return 'Review required: provide the service location before applying.';
    }
    case 'unresolved_schedule': {
      return 'Review required: confirm the service date before applying.';
    }
    case 'ambiguous_time': {
      return 'Which service hours did you mean?';
    }
    default: {
      return null;
    }
  }
}

function formatProposedSummary(confirmation: Confirmation): string[] {
  const lines: string[] = [];
  const pd = confirmation.proposed_data;
  const updateType = confirmation.update_type;

  if (
    (updateType === 'menu' || updateType === 'both') &&
    pd.food_items &&
    pd.food_items.length > 0
  ) {
    const items = pd.food_items.slice(0, 5).join(', ');
    lines.push(`Menu: ${items}${pd.food_items.length > 5 ? ', ...' : ''}`);
  }

  if (
    (updateType === 'location' || updateType === 'both' || pd.reviewAction === 'ambiguous_time') &&
    pd.location?.address
  ) {
    lines.push(`Location: ${pd.location.address}${pd.location.fuzzy ? ' (estimated)' : ''}`);
  }

  if (
    pd.reviewAction !== 'ambiguous_time' &&
    (updateType === 'schedule' || updateType === 'both') &&
    (pd.times?.days?.length || pd.times?.start || pd.times?.end)
  ) {
    const dayPart = pd.times.days?.length ? pd.times.days.join(', ') : 'Unknown days';
    const hours = pd.times.start && pd.times.end ? ` ${pd.times.start}–${pd.times.end}` : '';
    lines.push(`Hours: ${dayPart}${hours}`);
  }

  if (pd.serviceDate) lines.push(`Date: ${pd.serviceDate}`);

  const reviewMessage = getReviewActionMessage(pd.reviewAction);
  if (reviewMessage) lines.push(reviewMessage);

  return lines;
}

function PageNameLabel({ pageName }: { readonly pageName: string }): ReactNode {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
      <Facebook className="h-3 w-3" />
      <span>{pageName}</span>
    </div>
  );
}

export function shouldShowDeleteNotice(): boolean {
  if (globalThis.window === undefined) return false;
  return !localStorage.getItem('postDeleteNoticeDismissed');
}

export function setPostError(
  errors: Record<string, string>,
  postId: string,
  message: string,
): Record<string, string> {
  return { ...errors, [postId]: message };
}

export function clearPostError(
  errors: Record<string, string>,
  postId: string,
): Record<string, string> {
  if (!errors[postId]) return errors;
  const next = { ...errors };
  delete next[postId];
  return next;
}

export function buildAmbiguousTimeResolution(
  proposedData: Confirmation['proposed_data'],
  choice: { start: string; end: string },
): {
  scheduleResolution: { scope: 'one_off'; serviceDate: string; startTime: string; endTime: string };
} | null {
  if (proposedData.reviewAction !== 'ambiguous_time' || !proposedData.serviceDate) return null;
  const isPersistedChoice = proposedData.timeAlternatives?.some(
    (option) => option.start === choice.start && option.end === choice.end,
  );
  if (!isPersistedChoice) return null;
  return {
    scheduleResolution: {
      scope: 'one_off',
      serviceDate: proposedData.serviceDate,
      startTime: choice.start,
      endTime: choice.end,
    },
  };
}

export function AmbiguousTimeChoices({
  alternatives,
  disabled,
  onSelect,
}: {
  readonly alternatives: TimeAlternative[];
  readonly disabled: boolean;
  readonly onSelect: (choice: TimeAlternative) => void;
}): ReactNode {
  if (alternatives.length !== 2) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2" aria-label="Choose service hours">
      {alternatives.map((choice) => (
        <Button
          key={`${choice.start}-${choice.end}`}
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onSelect(choice)}
        >
          {choice.label}
        </Button>
      ))}
    </div>
  );
}

export function PostProcessingHistory({
  truckId,
  limit = 10,
  pageName,
  refreshKey = 0,
}: PostProcessingHistoryProps): ReactNode {
  const [posts, setPosts] = useState<Post[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [processingConfirmationId, setProcessingConfirmationId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  // Default true (notice hidden) on SSR; useEffect syncs from localStorage
  // after hydration to avoid a flicker where the notice renders then disappears.
  const [noticeDismissed, setNoticeDismissed] = useState(true);

  useEffect(() => {
    setNoticeDismissed(!shouldShowDeleteNotice());
  }, []);

  const handleDeleteClick = (postId: string) => {
    setConfirmingDeleteId(postId);
    setDeleteErrors((prev) => clearPostError(prev, postId));
  };

  const handleCancelDelete = () => {
    const postId = confirmingDeleteId;
    if (postId) {
      setDeleteErrors((prev) => clearPostError(prev, postId));
    }
    setConfirmingDeleteId(null);
  };

  const handleConfirmDelete = async (postId: string) => {
    setDeletingPostId(postId);
    setDeleteErrors((prev) => clearPostError(prev, postId));
    try {
      const response = await fetch('/api/owner/facebook/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setConfirmations((prev) => prev.filter((c) => c.facebook_post_id !== postId));
        setConfirmingDeleteId(null);
      } else {
        const text = await response.text();
        logError('Failed to delete post:', text);
        setDeleteErrors((prev) => setPostError(prev, postId, `Delete failed (${response.status})`));
      }
    } catch (error_) {
      logError('Failed to delete post:', error_);
      setDeleteErrors((prev) =>
        setPostError(prev, postId, 'Network error — check your connection'),
      );
    } finally {
      setDeletingPostId(null);
    }
  };

  const fetchPosts = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const postsResponse = await fetch(
        `/api/owner/facebook/posts?truckId=${truckId}&limit=${limit}`,
      );
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch posts');
      }
      const postsData: PostsResponse = await postsResponse.json();
      setPosts(postsData.posts);

      // Confirmations failure should not block post history display
      try {
        const confirmationsResponse = await fetch('/api/owner/facebook/confirm-update');
        if (confirmationsResponse.ok) {
          const confirmationsData: ConfirmationsResponse = await confirmationsResponse.json();
          setConfirmations(confirmationsData.confirmations.filter((c) => c.truck_id === truckId));
        } else {
          logError('Failed to fetch confirmations');
          setConfirmations([]);
        }
      } catch (error_) {
        logError('Failed to fetch confirmations:', error_);
        setConfirmations([]);
      }
    } catch (error_) {
      logError('Failed to fetch post history:', error_);
      setError('Failed to load post history');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationAction = async (
    confirmationId: string,
    action: 'confirm' | 'reject' | 'resolve',
    resolution?: ReturnType<typeof buildAmbiguousTimeResolution>,
  ): Promise<void> => {
    setProcessingConfirmationId(confirmationId);
    const facebookPostId = confirmations.find((c) => c.id === confirmationId)?.facebook_post_id;
    try {
      const response = await fetch('/api/owner/facebook/confirm-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationId, action, ...(resolution ? { resolution } : {}) }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Failed to ${action} update`);
      }

      // Update locally to avoid full-page loading spinner flash
      setConfirmations((prev) => prev.filter((c) => c.id !== confirmationId));
      if (facebookPostId) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === facebookPostId
              ? { ...p, status: action === 'reject' ? 'rejected' : 'processed' }
              : p,
          ),
        );
      }

      toast.success(
        action === 'confirm'
          ? 'Update confirmed'
          : action === 'resolve'
            ? 'Service hours updated'
            : 'Update rejected',
      );
    } catch (error_) {
      logError(`Failed to ${action} update:`, error_);
      toast.error(error_ instanceof Error ? error_.message : `Failed to ${action} update`);
    } finally {
      setProcessingConfirmationId(null);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, [truckId, limit, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchPosts()}>
          Retry
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        {pageName && <PageNameLabel pageName={pageName} />}
        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No posts processed yet</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-3">
        {pageName && <PageNameLabel pageName={pageName} />}
        {posts.map((post) => {
          const confirmation = confirmations.find((c) => c.facebook_post_id === post.id);
          const isConfirmationPending = Boolean(confirmation);
          const reviewMessage = confirmation
            ? getReviewActionMessage(confirmation.proposed_data.reviewAction)
            : null;
          const timeAlternatives =
            confirmation?.proposed_data.reviewAction === 'ambiguous_time'
              ? confirmation.proposed_data.timeAlternatives
              : undefined;
          return (
            <div
              key={post.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-row items-start gap-2 mt-0.5">
                <div className="mt-0.5">{getStatusIcon(post.status)}</div>
                {post.fullPicture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.fullPicture}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-md object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-start gap-1 text-sm font-medium">
                    {getStatusLabel(post.status)}
                    {isConfirmationPending && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="relative -top-1 inline-flex h-3.5 w-3.5 items-center justify-center cursor-help"
                            aria-label={
                              reviewMessage ? 'Needs your review' : 'Needs your confirmation'
                            }
                          >
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          sideOffset={6}
                          alignOffset={10}
                          className="w-72 max-w-[calc(100vw-2rem)] whitespace-normal rounded-lg border border-white/10 px-3 py-2 text-xs leading-snug shadow-lg"
                        >
                          {reviewMessage ??
                            "This Facebook post was a little unclear, so we need your confirmation before applying changes. Confirm if everything looks right, reject if it doesn't, and we'll try harder next time!"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {truncateText(post.message, 100, !!post.fullPicture)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(post.createdTime).toLocaleString()}
                </p>
                {confirmation && formatProposedSummary(confirmation).length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {formatProposedSummary(confirmation).map((line, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {confirmation && timeAlternatives?.length === 2 && (
                  <AmbiguousTimeChoices
                    alternatives={timeAlternatives}
                    disabled={processingConfirmationId === confirmation.id}
                    onSelect={(choice) => {
                      const resolution = buildAmbiguousTimeResolution(
                        confirmation.proposed_data,
                        choice,
                      );
                      if (resolution) {
                        void handleConfirmationAction(confirmation.id, 'resolve', resolution);
                      }
                    }}
                  />
                )}
              </div>
              <div className="flex-shrink-0 self-center">
                {confirmingDeleteId === post.id ? (
                  <div className="flex flex-col items-end gap-2">
                    {!noticeDismissed && (
                      <div className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800 p-2 rounded w-64">
                        <p>
                          Deleting a post won't affect changes already applied to your truck. This
                          just removes it from history.
                        </p>
                        <label className="flex items-center gap-1 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                localStorage.setItem('postDeleteNoticeDismissed', 'true');
                                setNoticeDismissed(true);
                              } else {
                                localStorage.removeItem('postDeleteNoticeDismissed');
                                setNoticeDismissed(false);
                              }
                            }}
                          />
                          Don't show this again
                        </label>
                      </div>
                    )}
                    {deleteErrors[post.id] && (
                      <p className="text-xs text-destructive">{deleteErrors[post.id]}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Are you sure?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingPostId === post.id}
                        onClick={() => void handleConfirmDelete(post.id)}
                        aria-label="Confirm delete"
                      >
                        {deletingPostId === post.id ? 'Deleting...' : 'Delete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingPostId === post.id}
                        onClick={handleCancelDelete}
                        aria-label="Cancel delete"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {confirmation && (
                      <>
                        {!reviewMessage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-green-500/10"
                                disabled={processingConfirmationId === confirmation.id}
                                onClick={() =>
                                  void handleConfirmationAction(confirmation.id, 'confirm')
                                }
                                aria-label="Confirm"
                              >
                                {processingConfirmationId === confirmation.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin text-green-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              align="start"
                              sideOffset={6}
                              alignOffset={10}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs leading-snug shadow-lg"
                            >
                              Confirm this post and apply the update to your truck.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-orange-500/10"
                              disabled={processingConfirmationId === confirmation.id}
                              onClick={() =>
                                void handleConfirmationAction(confirmation.id, 'reject')
                              }
                              aria-label="Reject"
                            >
                              {processingConfirmationId === confirmation.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-orange-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            sideOffset={6}
                            alignOffset={10}
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs leading-snug shadow-lg"
                          >
                            Reject this post. We'll try harder to understand the next one.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingPostId !== null}
                          onClick={() => handleDeleteClick(post.id)}
                          aria-label={`Delete post from ${new Date(post.createdTime).toLocaleDateString()}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        sideOffset={6}
                        alignOffset={10}
                        className="w-72 max-w-[calc(100vw-2rem)] whitespace-normal rounded-lg border border-white/10 px-3 py-2 text-xs leading-snug shadow-lg"
                      >
                        Remove this post from history. Any changes already applied to your truck
                        stay in place.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
