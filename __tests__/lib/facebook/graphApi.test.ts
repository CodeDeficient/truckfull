/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';

import {
  getUserFacebookPages,
  getPageDetails,
  validateAccessToken,
  getPagePosts,
  type FacebookPage,
} from '../../../lib/facebook/graphApi';

// Mock global fetch
global.fetch = jest.fn();

describe('Facebook Graph API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserFacebookPages', () => {
    const mockAccessToken = 'EAABtestAccessToken';
    const mockUserId = '123456789';

    const mockPagesResponse = {
      data: [
        {
          id: 'page-1-id',
          name: 'Test Food Truck Page',
          category: 'Restaurant',
          access_token: 'page-access-token-1',
          permalink_url: 'https://facebook.com/testfoodtruck',
          username: 'testfoodtruck',
        },
        {
          id: 'page-2-id',
          name: 'Another Business Page',
          category: 'Local Business',
          access_token: 'page-access-token-2',
          permalink_url: 'https://facebook.com/anotherbusiness',
        },
      ],
    };

    it('should fetch user pages successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPagesResponse,
      });

      const pages = await getUserFacebookPages(mockAccessToken, mockUserId);

      expect(pages).toHaveLength(2);
      expect(pages[0]).toEqual({
        id: 'page-1-id',
        name: 'Test Food Truck Page',
        category: 'Restaurant',
        access_token: 'page-access-token-1',
        permalink_url: 'https://facebook.com/testfoodtruck',
        username: 'testfoodtruck',
      });
      expect(pages[1]).toEqual({
        id: 'page-2-id',
        name: 'Another Business Page',
        category: 'Local Business',
        access_token: 'page-access-token-2',
        permalink_url: 'https://facebook.com/anotherbusiness',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com/v25.0/123456789/accounts'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }),
      );
    });

    it('should use "me" as default user ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPagesResponse,
      });

      await getUserFacebookPages(mockAccessToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com/v25.0/me/accounts'),
        expect.anything(),
      );
    });

    it('should handle pagination when multiple pages of results exist', async () => {
      const firstPageResponse = {
        data: [
          {
            id: 'page-1',
            name: 'Page 1',
            category: 'Category 1',
            access_token: 'token-1',
          },
        ],
        paging: {
          cursors: { before: 'cursor-before', after: 'cursor-after' },
          next: 'https://graph.facebook.com/v25.0/me/accounts?after=cursor-after',
        },
      };

      const secondPageResponse = {
        data: [
          {
            id: 'page-2',
            name: 'Page 2',
            category: 'Category 2',
            access_token: 'token-2',
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => firstPageResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => secondPageResponse,
        });

      const pages = await getUserFacebookPages(mockAccessToken);

      expect(pages).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when API returns error response', async () => {
      const errorResponse = {
        error: {
          message: 'Invalid OAuth access token',
          type: 'OAuthException',
          code: 190,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      await expect(getUserFacebookPages(mockAccessToken)).rejects.toThrow(
        'Facebook Graph API error: 400 - Invalid OAuth access token',
      );
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getUserFacebookPages(mockAccessToken)).rejects.toThrow('Network error');
    });

    it('should throw specific error for 401 expired token (OAuthException code 190)', async () => {
      const expiredTokenResponse = {
        error: {
          message: 'Error validating access token: Session has expired',
          type: 'OAuthException',
          code: 190,
          error_subcode: 463,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => expiredTokenResponse,
      });

      await expect(getUserFacebookPages(mockAccessToken)).rejects.toThrow(
        'Facebook Graph API error: 401 - Error validating access token: Session has expired',
      );
    });

    it('should throw specific error for 403 permission denied', async () => {
      const permissionDeniedResponse = {
        error: {
          message: 'Permission denied',
          type: 'OAuthException',
          code: 200,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => permissionDeniedResponse,
      });

      await expect(getUserFacebookPages(mockAccessToken)).rejects.toThrow(
        'Facebook Graph API error: 403 - Permission denied',
      );
    });

    it('should include followers_count when available', async () => {
      const responseWithFollowers = {
        data: [
          {
            id: 'page-with-followers',
            name: 'Popular Page',
            category: 'Restaurant',
            access_token: 'token',
            followers_count: 15000,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithFollowers,
      });

      const pages = await getUserFacebookPages(mockAccessToken);

      expect(pages[0].id).toBe('page-with-followers');
      expect(pages[0].name).toBe('Popular Page');
    });
  });

  describe('getPageDetails', () => {
    const mockPageId = 'test-page-id';
    const mockAccessToken = 'page-access-token';

    const mockPageDetails = {
      id: 'test-page-id',
      name: 'Test Food Truck',
      category: 'Restaurant',
      access_token: 'page-access-token',
      permalink_url: 'https://facebook.com/testfoodtruck',
      username: 'testfoodtruck',
      followers_count: 5000,
      about: 'Best food truck in town',
      description: 'Serving delicious street food',
      website: 'https://testfoodtruck.com',
      phone: '+1234567890',
    };

    it('should fetch page details successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPageDetails,
      });

      const page = await getPageDetails(mockPageId, mockAccessToken);

      expect(page).toEqual({
        id: 'test-page-id',
        name: 'Test Food Truck',
        category: 'Restaurant',
        access_token: 'page-access-token',
        permalink_url: 'https://facebook.com/testfoodtruck',
        username: 'testfoodtruck',
        followers_count: 5000,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`graph.facebook.com/v25.0/${mockPageId}`),
        expect.anything(),
      );
    });

    it('should throw error for invalid page ID', async () => {
      const errorResponse = {
        error: {
          message: 'Unsupported get request',
          type: 'GraphMethodException',
          code: 100,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      await expect(getPageDetails('invalid-page-id', mockAccessToken)).rejects.toThrow(
        'Facebook Graph API error: 400 - Unsupported get request',
      );
    });
  });

  describe('validateAccessToken', () => {
    const mockAccessToken = 'EAABtestAccessToken';

    const mockDebugResponse = {
      data: {
        app_id: 'test-app-id',
        type: 'USER',
        application: 'Test App',
        data_access_expires_at: 1234567890,
        expires_at: 1234567890,
        is_valid: true,
        issued_at: 1234500000,
        metadata: {
          auth_type: 'rerequest',
          sso: 'chrome_custom_tab',
        },
        scopes: ['public_profile', 'email', 'pages_manage_pages', 'pages_read_engagement'],
        user_id: '123456789',
      },
    };

    it('should validate access token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDebugResponse,
      });

      const result = await validateAccessToken(mockAccessToken, 'test-app-id', 'test-app-secret');

      expect(result).toEqual({
        userId: '123456789',
        appId: 'test-app-id',
        expiresAt: new Date(1234567890 * 1000).toISOString(),
        isValid: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('input_token=EAABtestAccessToken'),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('access_token=test-app-id'),
        expect.anything(),
      );
    });

    it('should return isValid false for expired token', async () => {
      const expiredTokenResponse = {
        data: {
          app_id: 'test-app-id',
          is_valid: false,
          user_id: '123456789',
          expires_at: 1234500000,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => expiredTokenResponse,
      });

      const result = await validateAccessToken(mockAccessToken, 'test-app-id', 'test-app-secret');

      expect(result.isValid).toBe(false);
      expect(result.userId).toBe('123456789');
    });

    it('should handle token validation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token code',
            type: 'OAuthException',
          },
        }),
      });

      await expect(
        validateAccessToken('invalid-token', 'test-app-id', 'test-app-secret'),
      ).rejects.toThrow('Token validation failed: 400');
    });
  });

  describe('getPagePosts', () => {
    const mockPageId = 'test-page-id';
    const mockAccessToken = 'page-access-token';

    const mockPostsResponse = {
      data: [
        {
          id: 'post-1-id',
          message: 'Today special: Tacos! 🌮',
          created_time: '2024-01-15T10:00:00+0000',
          permalink_url: 'https://facebook.com/posts/post-1',
        },
        {
          id: 'post-2-id',
          message: 'We are open until 8pm today!',
          created_time: '2024-01-14T15:30:00+0000',
          full_picture: 'https://scontent.facebook.com/image.jpg',
        },
      ],
    };

    it('should fetch page posts successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostsResponse,
      });

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      expect(posts).toHaveLength(2);
      expect(posts[0]).toEqual({
        id: 'post-1-id',
        message: 'Today special: Tacos! 🌮',
        created_time: '2024-01-15T10:00:00+0000',
        permalink_url: 'https://facebook.com/posts/post-1',
      });
      expect(posts[1]).toEqual({
        id: 'post-2-id',
        message: 'We are open until 8pm today!',
        created_time: '2024-01-14T15:30:00+0000',
        full_picture: 'https://scontent.facebook.com/image.jpg',
      });

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).toContain(`graph.facebook.com/v25.0/${mockPageId}/posts`);
      expect(new URL(fetchUrl).searchParams.get('fields')).toContain('created_time');
    });

    it('should respect limit parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostsResponse,
      });

      await getPagePosts(mockPageId, mockAccessToken, 5);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('limit=5');
    });

    it('should return empty array when no posts exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      expect(posts).toHaveLength(0);
    });

    it('should handle posts without message field', async () => {
      const responseWithoutMessage = {
        data: [
          {
            id: 'post-without-message',
            created_time: '2024-01-15T10:00:00+0000',
            full_picture: 'https://example.com/image.jpg',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithoutMessage,
      });

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      expect(posts[0].message).toBeUndefined();
      expect(posts[0].full_picture).toBe('https://example.com/image.jpg');
    });
  });

  describe('Page Details Caching', () => {
    const mockPageId = 'test-page-id';
    const mockAccessToken = 'page-access-token';
    const mockPageDetails: FacebookPage = {
      id: 'test-page-id',
      name: 'Test Food Truck',
      category: 'Restaurant',
      access_token: 'page-access-token',
      permalink_url: 'https://facebook.com/testfoodtruck',
      username: 'testfoodtruck',
      followers_count: 5000,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should cache page details for 30 minutes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPageDetails,
      });

      const { getCachedPageDetails, cachePageDetails, invalidatePageDetailsCache } =
        await import('../../../lib/facebook/graphApi');

      const page = await getPageDetails(mockPageId, mockAccessToken);

      cachePageDetails(mockPageId, page);

      const cached = getCachedPageDetails(mockPageId);
      expect(cached).toEqual(page);
    });

    it('should return undefined for expired cache entries', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPageDetails,
      });

      const { getCachedPageDetails, cachePageDetails } =
        await import('../../../lib/facebook/graphApi');

      const page = await getPageDetails(mockPageId, mockAccessToken);

      cachePageDetails(mockPageId, page, -1);

      const cached = getCachedPageDetails(mockPageId);
      expect(cached).toBeUndefined();
    });

    it('should invalidate cache entry', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPageDetails,
      });

      const { getCachedPageDetails, cachePageDetails, invalidatePageDetailsCache } =
        await import('../../../lib/facebook/graphApi');

      const page = await getPageDetails(mockPageId, mockAccessToken);

      cachePageDetails(mockPageId, page);

      invalidatePageDetailsCache(mockPageId);

      const cached = getCachedPageDetails(mockPageId);
      expect(cached).toBeUndefined();
    });

    it('should limit cache size to 1000 entries', async () => {
      const { cachePageDetails, getCachedPageDetails } =
        await import('../../../lib/facebook/graphApi');

      for (let i = 0; i < 1001; i++) {
        cachePageDetails(`page-${i}`, mockPageDetails);
      }

      expect(getCachedPageDetails('page-0')).toBeUndefined();
      expect(getCachedPageDetails('page-1')).toEqual(mockPageDetails);
      expect(getCachedPageDetails('page-1000')).toEqual(mockPageDetails);
    });
  });

  describe('Posts Caching', () => {
    const mockPageId = 'test-page-id';
    const mockAccessToken = 'page-access-token';
    const mockPosts = [
      {
        id: 'post-1',
        message: 'Test post',
        created_time: '2024-01-15T10:00:00+0000',
      },
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should cache posts for 5 minutes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosts }),
      });

      const { getCachedPosts, cachePosts, invalidatePostsCache } =
        await import('../../../lib/facebook/graphApi');

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      cachePosts(mockPageId, posts);

      const cached = getCachedPosts(mockPageId);
      expect(cached).toEqual(posts);
    });

    it('should return undefined for expired posts cache', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosts }),
      });

      const { getCachedPosts, cachePosts } = await import('../../../lib/facebook/graphApi');

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      cachePosts(mockPageId, posts, -1);

      const cached = getCachedPosts(mockPageId);
      expect(cached).toBeUndefined();
    });

    it('should invalidate posts cache', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosts }),
      });

      const { getCachedPosts, cachePosts, invalidatePostsCache } =
        await import('../../../lib/facebook/graphApi');

      const posts = await getPagePosts(mockPageId, mockAccessToken);

      cachePosts(mockPageId, posts);

      invalidatePostsCache(mockPageId);

      const cached = getCachedPosts(mockPageId);
      expect(cached).toBeUndefined();
    });

    it('should limit posts cache size to 1000 entries', async () => {
      const { cachePosts, getCachedPosts } = await import('../../../lib/facebook/graphApi');

      for (let i = 0; i < 1001; i++) {
        cachePosts(`page-${i}`, mockPosts);
      }

      expect(getCachedPosts('page-0')).toBeUndefined();
      expect(getCachedPosts('page-1')).toEqual(mockPosts);
      expect(getCachedPosts('page-1000')).toEqual(mockPosts);
    });
  });
});
