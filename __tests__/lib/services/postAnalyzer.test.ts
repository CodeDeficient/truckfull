import { describe, it, expect } from '@jest/globals';
import { detectPostComposition, isImageUrl } from '@/lib/services/postAnalyzer';
import type { FacebookPost } from '@/lib/services/postAnalyzer';

describe('postAnalyzer', () => {
  describe('detectPostComposition', () => {
    it('should detect text-only posts', () => {
      const post: FacebookPost = {
        post_id: '123',
        message: 'Come visit us today!',
      };

      const result = detectPostComposition(post);

      expect(result.hasText).toBe(true);
      expect(result.hasImage).toBe(false);
      expect(result.hasAttachment).toBe(false);
      expect(result.imageCount).toBe(0);
      expect(result.imageUrls).toEqual([]);
    });

    it('should detect posts with full_picture', () => {
      const post: FacebookPost = {
        post_id: '123',
        message: 'Check out our new menu',
        full_picture: 'https://example.com/image.jpg',
      };

      const result = detectPostComposition(post);

      expect(result.hasText).toBe(true);
      expect(result.hasImage).toBe(true);
      expect(result.imageCount).toBe(1);
      expect(result.imageUrls).toContain('https://example.com/image.jpg');
    });

    it('should detect posts with attachment images', () => {
      const post: FacebookPost = {
        post_id: '123',
        message: 'Our truck',
        attachments: {
          data: [
            {
              media: {
                image: {
                  src: 'https://example.com/photo1.jpg',
                },
              },
              url: 'https://facebook.com/attachment',
            },
          ],
        },
      };

      const result = detectPostComposition(post);

      expect(result.hasText).toBe(true);
      expect(result.hasImage).toBe(true);
      expect(result.imageCount).toBe(1);
      expect(result.imageUrls).toContain('https://example.com/photo1.jpg');
    });

    it('should detect multiple attachment images', () => {
      const post: FacebookPost = {
        post_id: '123',
        attachments: {
          data: [
            {
              media: {
                image: {
                  src: 'https://example.com/photo1.jpg',
                },
              },
            },
            {
              media: {
                image: {
                  src: 'https://example.com/photo2.jpg',
                },
              },
            },
          ],
        },
      };

      const result = detectPostComposition(post);

      expect(result.hasImage).toBe(true);
      expect(result.imageCount).toBe(2);
      expect(result.imageUrls).toHaveLength(2);
    });

    it('should detect hasAttachment correctly', () => {
      const postWithAttachments: FacebookPost = {
        post_id: '123',
        attachments: {
          data: [
            {
              url: 'https://facebook.com/link',
            },
          ],
        },
      };

      const postWithoutAttachments: FacebookPost = {
        post_id: '123',
      };

      expect(detectPostComposition(postWithAttachments).hasAttachment).toBe(true);
      expect(detectPostComposition(postWithoutAttachments).hasAttachment).toBe(false);
    });

    it('should handle empty message', () => {
      const post: FacebookPost = {
        post_id: '123',
        message: '',
      };

      const result = detectPostComposition(post);

      expect(result.hasText).toBe(false);
    });

    it('should handle whitespace-only message', () => {
      const post: FacebookPost = {
        post_id: '123',
        message: '   ',
      };

      const result = detectPostComposition(post);

      expect(result.hasText).toBe(false);
    });

    it('should handle missing attachments data', () => {
      const post: FacebookPost = {
        post_id: '123',
        attachments: {},
      };

      const result = detectPostComposition(post);

      expect(result.hasAttachment).toBe(false);
      expect(result.imageCount).toBe(0);
    });

    it('should handle undefined attachments', () => {
      const post: FacebookPost = {
        post_id: '123',
      };

      const result = detectPostComposition(post);

      expect(result.hasAttachment).toBe(false);
      expect(result.imageCount).toBe(0);
    });

    it('should include both full_picture and attachment images', () => {
      const post: FacebookPost = {
        post_id: '123',
        full_picture: 'https://example.com/main.jpg',
        attachments: {
          data: [
            {
              media: {
                image: {
                  src: 'https://example.com/attachment.jpg',
                },
              },
            },
          ],
        },
      };

      const result = detectPostComposition(post);

      expect(result.imageCount).toBe(2);
      expect(result.imageUrls).toContain('https://example.com/main.jpg');
      expect(result.imageUrls).toContain('https://example.com/attachment.jpg');
    });

    it('should handle attachment with url but no media image', () => {
      const post: FacebookPost = {
        post_id: '123',
        attachments: {
          data: [
            {
              url: 'https://example.com/image.jpg',
            },
          ],
        },
      };

      const result = detectPostComposition(post);

      expect(result.imageCount).toBe(1);
      expect(result.imageUrls).toContain('https://example.com/image.jpg');
    });
  });
});