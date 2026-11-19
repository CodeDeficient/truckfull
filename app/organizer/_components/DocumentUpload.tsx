'use client';

/**
 * Document Upload Component
 * WBS: 6.3.3
 *
 * Organizer document upload with verification status.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, CheckCircle, Clock, XCircle, Trash, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Document {
  id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
  verified: boolean;
  verified_at: string | null;
  notes: string | null;
}

interface DocumentUploadProps {
  eventId: string;
  onDocumentsChange?: () => void;
}

const DOCUMENT_TYPES = [
  { type: 'permit', label: 'Special Event Permit', required: true },
  { type: 'insurance', label: 'Liability Insurance', required: true },
  { type: 'fire_marshal', label: 'Fire Marshal Approval', required: false },
  { type: 'other', label: 'Other Document', required: false },
];

const STATUS_CONFIG = {
  verified: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Verified',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Pending Review',
  },
  rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rejected' },
};

export function DocumentUpload({ eventId, onDocumentsChange }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents ?? []);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (type: string, file: File) => {
    try {
      setUploading(type);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', type);

      const response = await fetch(`/api/organizer/events/${eventId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      await fetchDocuments();
      onDocumentsChange?.();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      await fetchDocuments();
      onDocumentsChange?.();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Delete failed');
    }
  };

  const getDocumentStatus = (doc: Document): 'verified' | 'pending' | 'rejected' => {
    if (doc.verified) return 'verified';
    if (doc.notes?.toLowerCase().includes('reject')) return 'rejected';
    return 'pending';
  };

  const getExistingDoc = (type: string) => documents.find((d) => d.document_type === type);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Event Documents
        </CardTitle>
        <CardDescription>
          Upload permits and documentation for your event. Required documents must be verified
          before publishing paid events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {DOCUMENT_TYPES.map((docType) => {
          const existing = getExistingDoc(docType.type);
          const status = existing ? getDocumentStatus(existing) : null;
          const StatusConfig = status ? STATUS_CONFIG[status] : null;

          return (
            <div
              key={docType.type}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{docType.label}</span>
                    {docType.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  {existing && (
                    <p className="text-sm text-muted-foreground">
                      Uploaded {new Date(existing.uploaded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {StatusConfig && (
                  <Badge className={`${StatusConfig.bgColor} ${StatusConfig.color}`}>
                    <StatusConfig.icon className="w-3 h-3 mr-1" />
                    {StatusConfig.label}
                  </Badge>
                )}

                {existing ? (
                  <div className="flex items-center gap-1">
                    <a
                      href={existing.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </a>
                    {status !== 'verified' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(existing.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-48"
                      disabled={uploading === docType.type}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(docType.type, file);
                      }}
                    />
                    {uploading === docType.type && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Documents are reviewed by our team. For paid events, at least one permit must be
            verified before publishing.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
