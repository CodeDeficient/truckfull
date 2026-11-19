'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TRUCK_LISTING_SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  type TruckListingSubmissionStatus,
} from '@/lib/claim/truckListingSubmission';
import {
  updateListingSubmissionStatus,
  updateListingSubmissionAdminNotes,
} from '../actions';
import type { AdminListingSubmission } from '../page';

interface ListingSubmissionsClientProps {
  readonly submissions: AdminListingSubmission[];
  readonly loadError: string | undefined;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'new': {
      return 'bg-blue-100 text-blue-800';
    }
    case 'reviewing': {
      return 'bg-yellow-100 text-yellow-800';
    }
    case 'needs_info': {
      return 'bg-orange-100 text-orange-800';
    }
    case 'ready': {
      return 'bg-purple-100 text-purple-800';
    }
    case 'created': {
      return 'bg-green-100 text-green-800';
    }
    case 'declined': {
      return 'bg-red-100 text-red-800';
    }
    case 'duplicate': {
      return 'bg-gray-100 text-gray-800';
    }
    default: {
      return 'bg-gray-100 text-gray-800';
    }
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function DetailField({ label, value }: { readonly label: string; readonly value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function AssetLink({ label, url }: { readonly label: string; readonly url: string | null }) {
  if (!url) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          View uploaded file
        </a>
      </dd>
    </div>
  );
}

export function ListingSubmissionsClient({
  submissions: initialSubmissions,
  loadError,
}: ListingSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<AdminListingSubmission[]>(initialSubmissions);
  const [selected, setSelected] = useState<AdminListingSubmission | null>(null);
  const [statusError, setStatusError] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [notesMessage, setNotesMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (loadError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Submissions</CardTitle>
          <CardDescription className="text-red-700">{loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const replaceSubmission = (updated: AdminListingSubmission) => {
    setSubmissions((current) =>
      current.map((submission) => (submission.id === updated.id ? updated : submission)),
    );
    // Only keep the dialog open for the submission the action was run on. If
    // the admin closed the dialog or opened a different submission while the
    // action was in flight, the resolved update must not re-open or swap it.
    setSelected((current) => (current?.id === updated.id ? updated : current));
  };

  const openDetail = (submission: AdminListingSubmission) => {
    setSelected(submission);
    setStatusError('');
    setAdminNotes(submission.admin_notes ?? '');
    setNotesMessage('');
  };

  const handleStatusChange = async (status: TruckListingSubmissionStatus) => {
    if (!selected || busy) return;
    setBusy(true);
    setStatusError('');
    const result = await updateListingSubmissionStatus(selected.id, status);
    setBusy(false);
    if (!result.success) {
      setStatusError(result.error ?? 'Failed to update status');
      return;
    }
    replaceSubmission({ ...selected, status });
  };

  const handleNotesSave = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setNotesMessage('');
    const result = await updateListingSubmissionAdminNotes(selected.id, adminNotes);
    setBusy(false);
    if (!result.success) {
      setNotesMessage(result.error ?? 'Failed to save notes');
      return;
    }
    setNotesMessage('Notes saved.');
    replaceSubmission({ ...selected, admin_notes: adminNotes });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Listing Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Showing newest submissions</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.truck_name}</TableCell>
                  <TableCell>
                    <div>{submission.contact_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{submission.contact_email}</div>
                  </TableCell>
                  <TableCell>{formatDate(submission.created_at)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(submission.status)}`}
                    >
                      {SUBMISSION_STATUS_LABELS[submission.status as TruckListingSubmissionStatus] ??
                        submission.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openDetail(submission)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {submissions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No listing submissions yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.truck_name}</DialogTitle>
            <DialogDescription>
              Submitted {selected ? formatDate(selected.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge className={statusBadgeClass(selected.status)}>
                  {SUBMISSION_STATUS_LABELS[selected.status as TruckListingSubmissionStatus] ??
                    selected.status}
                </Badge>
                <div className="flex items-center gap-2">
                  <Label htmlFor="submission-status" className="sr-only">
                    Status
                  </Label>
                  <Select
                    value={selected.status}
                    onValueChange={(value) =>
                      handleStatusChange(value as TruckListingSubmissionStatus)
                    }
                  >
                    <SelectTrigger id="submission-status" className="w-[160px]" disabled={busy}>
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUCK_LISTING_SUBMISSION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {SUBMISSION_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {busy && <span className="text-xs text-muted-foreground">Saving...</span>}
              </div>
              {statusError && <p className="text-sm text-red-600">{statusError}</p>}

              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Truck name" value={selected.truck_name} />
                <DetailField label="Contact name" value={selected.contact_name} />
                <DetailField label="Contact email" value={selected.contact_email} />
                <DetailField label="Phone" value={selected.phone} />
                <DetailField label="City" value={selected.city} />
                <DetailField label="State" value={selected.state} />
                <DetailField label="Website" value={selected.website} />
                <DetailField label="Instagram" value={selected.instagram_url} />
                <DetailField label="Facebook" value={selected.facebook_url} />
                <DetailField label="Source" value={selected.source} />
                <DetailField label="Submission ID" value={selected.id} />
                <AssetLink label="Logo" url={selected.logo_url} />
                <AssetLink label="Menu file" url={selected.menu_asset_url} />
                <DetailField label="Menu text" value={selected.menu_text} />
                <DetailField label="Notes" value={selected.notes} />
              </dl>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Admin notes</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  placeholder="Research findings, decisions, etc. The submission record itself is never overwritten."
                />
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={handleNotesSave} disabled={busy}>
                    Save notes
                  </Button>
                  {notesMessage && <span className="text-xs text-muted-foreground">{notesMessage}</span>}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
