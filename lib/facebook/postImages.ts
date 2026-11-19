import { isImageUrl } from '@/lib/services/postAnalyzer';

export function parseFullPicture(rawPayload: string | null): string | null {
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const payload = parsed as {
      full_picture?: string | null;
      attachments?: {
        data?: Array<{
          media?: { image?: { src?: string } };
          url?: string;
        }>;
      };
    };

    if (payload.full_picture) return payload.full_picture;

    if (payload.attachments?.data) {
      for (const attachment of payload.attachments.data) {
        if (attachment.media?.image?.src) return attachment.media.image.src;
        if (attachment.url && isImageUrl(attachment.url)) return attachment.url;
      }
    }

    return null;
  } catch {
    return null;
  }
}
