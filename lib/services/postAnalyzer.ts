/**
 * Post Analyzer Service
 * Analyzes Facebook post composition to determine content types
 */

export interface PostComposition {
  hasText: boolean;
  hasImage: boolean;
  hasAttachment: boolean;
  imageCount: number;
  imageUrls: string[];
}

export interface FacebookPost {
  post_id: string;
  message?: string;
  full_picture?: string;
  attachments?: {
    data?: Array<{
      media?: {
        image?: {
          src?: string;
        };
      };
      url?: string;
    }>;
  };
  [key: string]: unknown;
}

export function detectPostComposition(post: FacebookPost): PostComposition {
  const hasText = !!post.message && post.message.trim().length > 0;

  const imageUrls: string[] = [];

  if (post.full_picture) {
    imageUrls.push(post.full_picture);
  }

  if (post.attachments?.data) {
    for (const attachment of post.attachments.data) {
      if (attachment.media?.image?.src) {
        imageUrls.push(attachment.media.image.src);
      } else if (attachment.url && isImageUrl(attachment.url)) {
        imageUrls.push(attachment.url);
      }
    }
  }

  const hasImage = imageUrls.length > 0;

  const hasAttachment = !!post.attachments?.data && post.attachments.data.length > 0;

  return {
    hasText,
    hasImage,
    hasAttachment,
    imageCount: imageUrls.length,
    imageUrls,
  };
}

export function isImageUrl(url: string): boolean {
  if (!url) return false;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = url.toLowerCase();

  if (imageExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true;
  }

  if (lowerUrl.includes('fbcdn.net') || lowerUrl.includes('cdninstagram')) {
    return true;
  }

  return false;
}
