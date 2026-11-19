import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacebookPageConnection } from '@/components/owner/FacebookPageConnection';

describe('FacebookPageConnection', () => {
  const mockProps = {
    onConnect: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<FacebookPageConnection {...mockProps} />);
      expect(screen.getByText('Loading your Facebook pages...')).toBeInTheDocument();
    });

    it('should render error state when fetch fails', async () => {
      global.fetch = jest.fn((url) => {
        if (url && typeof url === 'string' && url.includes('/connect')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to fetch pages' }),
        } as Response);
      });

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load your Facebook pages')).toBeInTheDocument();
      });
    });

    it('should render empty state when no pages available', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: [] }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No Facebook pages found/)).toBeInTheDocument();
      });
    });

    it('should render page options when pages are loaded', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic1.jpg',
        },
        {
          facebook_page_id: 'page-2',
          page_name: 'Burger Joint',
          picture_url: 'https://example.com/pic2.jpg',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: mockPages }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
        expect(screen.getByText('Burger Joint')).toBeInTheDocument();
        expect(screen.getAllByText('Connect This Page')).toHaveLength(2);
      });
    });

    it('should display page ID for reference', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-123',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: mockPages }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('page-123')).toBeInTheDocument();
      });
    });

    it('should render connecting state while saving connection', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      let resolveConnect: (value: Response) => void;
      const connectPromise = new Promise<Response>((resolve) => {
        resolveConnect = resolve;
      });

      global.fetch = jest.fn((url) => {
        if (url && typeof url === 'string' && url.includes('/facebook/pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pages: mockPages }),
          } as Response);
        }
        if (url && typeof url === 'string' && url.includes('/connect')) {
          return connectPromise;
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockProps.onConnect.mockImplementation(() => connectPromise);

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });

      const connectButton = screen.getByText('Connect This Page');
      fireEvent.click(connectButton);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      resolveConnect!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await waitFor(() => {
        expect(screen.getByText(/Page successfully connected/)).toBeInTheDocument();
      });
    });

    it('should render connected state after successful connection', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/facebook/pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pages: mockPages }),
          } as Response);
        }
        if (url.includes('/connect')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });

      const connectButton = screen.getByText('Connect This Page');
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Page successfully connected/)).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should fetch pages on mount', async () => {
      const mockFetch = jest.fn((url) => {
        if (url && typeof url === 'string' && url.includes('/connect')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: [] }),
        } as Response);
      });

      global.fetch = mockFetch;

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/owner/facebook/pages'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          }),
        );
      });
    });

    it('should call onConnect callback when page is connected', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/facebook/pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pages: mockPages }),
          } as Response);
        }
        if (url.includes('/connect')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });

      const connectButton = screen.getByText('Connect This Page');
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(mockProps.onConnect).toHaveBeenCalledWith('page-1', 'Taco Truck');
      });
    });

    it('should handle connection failure gracefully', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn((url) => {
        if (url && typeof url === 'string' && url.includes('/facebook/pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pages: mockPages }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const errorOnConnect = mockProps.onConnect;
      errorOnConnect.mockRejectedValueOnce(new Error('Connection failed'));

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });

      const connectButton = screen.getByText('Connect This Page');
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Facebook')).toBeInTheDocument();
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });
    });

    it('should allow retry after connection failure', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn((url) => {
        if (url && typeof url === 'string' && url.includes('/facebook/pages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pages: mockPages }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      let connectCallCount = 0;
      const errorOnConnect = mockProps.onConnect;
      errorOnConnect.mockImplementation(() => {
        connectCallCount++;
        if (connectCallCount === 1) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve(undefined);
      });

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
      });

      let connectButton = screen.getByText('Connect This Page');
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Facebook')).toBeInTheDocument();
      });

      connectButton = screen.getByText('Connect This Page');
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Page successfully connected/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing picture_url gracefully', async () => {
      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: 'Taco Truck',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: mockPages }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Taco Truck')).toBeInTheDocument();
        expect(screen.getByText('page-1')).toBeInTheDocument();
      });
    });

    it('should handle network error on page fetch', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load your Facebook pages')).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON response', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load your Facebook pages')).toBeInTheDocument();
      });
    });

    it('should handle malformed page data', async () => {
      const mockPages = [{}, null, undefined];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: mockPages }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No Facebook pages found/)).toBeInTheDocument();
      });
    });

    it('should handle very long page names gracefully', async () => {
      const longName = 'A'.repeat(200);

      const mockPages = [
        {
          facebook_page_id: 'page-1',
          page_name: longName,
          picture_url: 'https://example.com/pic.jpg',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pages: mockPages }),
        } as Response),
      );

      render(<FacebookPageConnection {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });
  });
});
