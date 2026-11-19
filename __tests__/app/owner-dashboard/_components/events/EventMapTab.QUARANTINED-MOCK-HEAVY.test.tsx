/**
 * EventMapTab Component Tests
 * Phase 2B - Worker B: Events tab + integration
 *
 * ⚠️ QUARANTINED — This file uses heavy mocking (jest.mock, jest.unstable_mockModule)
 * and is NOT a pattern reference. New tests for EventMapTab should use Playwright E2E.
 * See docs/TESTING_PATTERNS.md for the correct approach.
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('react-map-gl/mapbox', () => ({
  Map: ({ children, ...rest }: Record<string, unknown>) => (
    <div data-testid="mapbox-map" {...rest}>{children as React.ReactNode}</div>
  ),
  Marker: ({ children, longitude, latitude, ...props }: Record<string, unknown>) => (
    <div data-testid="marker" data-longitude={longitude} data-latitude={latitude} {...props}>
      {typeof children === 'function'
        ? (children as (args: Record<string, unknown>) => React.ReactNode)({ longitude, latitude })
        : children as React.ReactNode}
    </div>
  ),
  Popup: ({ children, onClose, ...props }: Record<string, unknown>) => (
    <div data-testid="popup" {...props}>{children as React.ReactNode}</div>
  ),
  NavigationControl: () => <div data-testid="navigation-control" />,
  GeolocateControl: () => <div data-testid="geolocate-control" />,
  Source: ({ children }: Record<string, unknown>) => <div>{children as React.ReactNode}</div>,
  Layer: () => <div />,
}));

jest.unstable_mockModule('vaul', () => {
  const MockDrawerRoot = ({ children, open, onOpenChange }: Record<string, unknown>) => {
    if (open === false || open == null) return null;
    return <div data-testid="mobile-event-drawer">{children as React.ReactNode}</div>;
  };
  const MockDrawerPortal = ({ children }: Record<string, unknown>) => (
    <div data-testid="drawer-portal">{children as React.ReactNode}</div>
  );
  const MockDrawerOverlay = () => <div data-testid="drawer-overlay" />;
  const MockDrawerContent = ({ children }: Record<string, unknown>) => (
    <div data-testid="mobile-bottom-sheet">{children as React.ReactNode}</div>
  );
  const MockDrawerTitle = ({ children }: Record<string, unknown>) => (
    <div data-testid="drawer-title">{children as React.ReactNode}</div>
  );
  const MockDrawerDescription = ({ children }: Record<string, unknown>) => (
    <div data-testid="drawer-description">{children as React.ReactNode}</div>
  );
  const MockDrawerClose = ({ children, onClick }: Record<string, unknown>) => (
    <button data-testid="drawer-close" onClick={onClick as () => void}>{children as React.ReactNode}</button>
  );
  return {
    Drawer: {
      Root: MockDrawerRoot,
      Portal: MockDrawerPortal,
      Overlay: MockDrawerOverlay,
      Content: MockDrawerContent,
      Title: MockDrawerTitle,
      Description: MockDrawerDescription,
      Close: MockDrawerClose,
    },
  };
});

jest.unstable_mockModule('@/hooks/useSaveLead', () => ({
  useSaveLead: () => ({ saving: false, saved: false, saveLead: jest.fn() }),
}));

jest.unstable_mockModule('@/components/map/EventFilters', () => ({
  EventFilters: () => <div data-testid="event-filters" />,
}));

jest.unstable_mockModule('@/app/owner-dashboard/_components/events/EventBadges', () => ({
  EventBadges: () => <div data-testid="event-badges" />,
}));

jest.unstable_mockModule('@/app/owner-dashboard/_components/events/EventDetailModal', () => ({
  EventDetailModal: () => <div data-testid="event-detail-modal" />,
}));

jest.unstable_mockModule('@/lib/events/trafficLightBadge', () => ({
  getTrafficLight: () => ({ level: 'none', emoji: '', label: '', bgClass: '' }),
}));

jest.unstable_mockModule('lucide-react', () => ({
  __esModule: true,
  Loader2: () => <svg data-testid="icon-loader" />,
  AlertCircle: () => <svg data-testid="icon-alert" />,
  Calendar: () => <svg data-testid="icon-calendar" />,
  X: () => <svg data-testid="icon-x" />,
  Search: () => <svg data-testid="icon-search" />,
  Bookmark: () => <svg data-testid="icon-bookmark" />,
  EyeOff: () => <svg data-testid="icon-eyeoff" />,
  MapPin: () => <svg data-testid="icon-mappin" />,
  Navigation: () => <svg data-testid="icon-nav" />,
  ExternalLink: () => <svg data-testid="icon-extlink" />,
  Shield: () => <svg data-testid="icon-shield" />,
}));

jest.unstable_mockModule('@/app/owner-dashboard/_components/events/ClusteredEventMarkers', () => ({
  ClusteredEventMarkers: ({ events, onSelectEvent }: Record<string, unknown>) => {
    const evts = (events ?? []) as Array<Record<string, unknown>>;
    const locData = evts[0]?.location_data as Record<string, unknown> | undefined;
    const validEvents = locData != null ? evts : [];
    return (
      <>
        {validEvents.map((event: Record<string, unknown>) => (
          <div
            key={event.id as string}
            data-testid="marker"
            onClick={() => (onSelectEvent as (e: unknown) => void)?.(event)}
            role="button"
          />
        ))}
      </>
    );
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
mockFetch.mockImplementation((url: string | Request | URL) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr.includes('/api/events')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ events: [] }) } as Response);
  }
  return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
});

const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});
mockGeolocation.getCurrentPosition.mockImplementation(
  (_success: (pos: GeolocationPosition) => void, error: (err: GeolocationPositionError) => void) => {
    error({ code: 1, message: 'User denied' } as GeolocationPositionError);
  },
);

const mockEvent = {
  id: 'ext-1',
  name: 'Downtown Food Festival',
  description: 'A community food festival',
  location_data: {
    lat: 33.4735,
    lng: -82.0105,
    address: '123 Main St',
    city: 'Augusta',
    state: 'GA',
  },
  start_date: '2026-05-15T10:00:00Z',
  end_date: '2026-05-15T22:00:00Z',
  status: 'published',
  vendor_fee: null,
  max_vendors: 50,
  source_type: 'eproval',
  event_source: 'external',
  vetting_score: 15,
  source_url: 'https://eproval.example.com/event/1',
  applications_count: 5,
  organizer: null,
};

const mockLowVettingEvent = {
  id: 'low-vet-1',
  name: 'Low Vetted Event',
  description: 'Should be filtered out',
  location_data: {
    lat: 33.49,
    lng: -82.03,
    address: '789 Low St',
    city: 'Augusta',
    state: 'GA',
  },
  start_date: '2026-07-01T10:00:00Z',
  end_date: '2026-07-01T22:00:00Z',
  status: 'published',
  vendor_fee: null,
  max_vendors: 20,
  source_type: 'eproval',
  vetting_score: 2,
  source_url: null,
  applications_count: 0,
  organizer: null,
};

const mockPlatformEvent = {
  id: 'plat-1',
  name: 'Truck Rally',
  description: 'Food truck rally event',
  location_data: {
    lat: 33.48,
    lng: -82.02,
    address: '456 Broad St',
    city: 'Augusta',
    state: 'GA',
  },
  start_date: '2026-06-01T12:00:00Z',
  end_date: '2026-06-01T20:00:00Z',
  status: 'published',
  vendor_fee: 25,
  max_vendors: 30,
  source_type: 'platform',
  vetting_score: 5,
  source_url: null,
  applications_count: 10,
  organizer: {
    business_name: 'Test Organizer',
    rating_avg: 4.5,
    rating_count: 100,
    verification_status: 'verified',
  },
};

function createFetchResponse(events: unknown[] = []) {
  return {
    ok: true,
    json: async () => ({ events }),
  } as Response;
}

function renderWithMobile(jsx: React.ReactElement, width = 375) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  return render(jsx);
}

describe('EventMapTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the map container', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('mapbox-map')).toBeInTheDocument();
    });
  });

  it('should render loading state while events are fetching', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    expect(screen.getByTestId('event-map-loading')).toBeInTheDocument();
  });

  it('should display event count after loading', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(createFetchResponse([mockEvent, mockPlatformEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      const countSpan = screen.getByText((content, el) => {
        return el?.tagName === 'SPAN' && content.trim() === '2 events';
      });
      expect(countSpan).toBeInTheDocument();
    });
  });

  it('should show empty state when no events are available', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByText('No events found')).toBeInTheDocument();
    });
  });

  it('should filter out events with vetting_score < 4', async () => {
    const highZoomViewState = {
      longitude: -82.02,
      latitude: 33.48,
      zoom: 12,
    };
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(
        createFetchResponse([mockEvent, mockLowVettingEvent, mockPlatformEvent]),
      );

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab, { initialViewState: highZoomViewState }));

    await waitFor(() => {
      const countSpan = screen.getByText((content, el) => {
        return el?.tagName === 'SPAN' && content.trim() === '3 events';
      });
      expect(countSpan).toBeInTheDocument();
    });
  });

  it('should call onSelectEvent when clicking an event marker', async () => {
    const onSelectEvent = jest.fn();
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab, { onSelectEvent }));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(onSelectEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ext-1', name: 'Downtown Food Festival' }),
      );
    });
  });

  it('should use initialViewState from props when provided', async () => {
    const initialViewState = {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    };
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab, { initialViewState }));

    await waitFor(() => {
      expect(screen.getByTestId('mapbox-map')).toBeInTheDocument();
    });
  });

  it('should fetch events from API on mount', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/events?status=published&period=future'),
      );
    });
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as Response);

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByText(/Error.*events/i)).toBeInTheDocument();
    });
  });

  it('should show mobile bottom sheet when clicking pin on small viewport', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    renderWithMobile(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });

    const bottomSheet = screen.getByTestId('mobile-bottom-sheet');
    expect(bottomSheet.querySelector('h3')?.textContent).toBe('Downtown Food Festival');

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('should set up 5-minute refresh interval', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should open cluster dialog with events when clicking a cluster', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent, mockPlatformEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    const clusterButton = screen.getByRole('button', { name: /Cluster with/i });
    fireEvent.click(clusterButton);

    await waitFor(() => {
      expect(screen.getByText('2 Events in Cluster')).toBeInTheDocument();
    });
  });

  it('should call onSelectEvent when clicking an event card in cluster dialog', async () => {
    const onSelectEvent = jest.fn();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent, mockPlatformEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab, { onSelectEvent }));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    const clusterButton = screen.getByRole('button', { name: /Cluster with/i });
    fireEvent.click(clusterButton);

    await waitFor(() => {
      expect(screen.getByText('Downtown Food Festival')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Downtown Food Festival'));

    await waitFor(() => {
      expect(onSelectEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ext-1', name: 'Downtown Food Festival' }),
      );
    });
  });
});

describe('EventMapTab - Mobile Drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockImplementation((url: string | Request | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ events: [] }) } as Response);
      }
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('should render vaul Drawer when event is selected on mobile', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });
  });

  it('should NOT render Mapbox Popup for selected event on mobile', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });

    const popups = screen.queryAllByTestId('popup');
    const selectedPopups = popups.filter(
      (p) => p.querySelector('.enhanced-popup-content'),
    );
    expect(selectedPopups).toHaveLength(0);
  });

  it('should show event name and date in mobile drawer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveTextContent('Downtown Food Festival');
    });
  });

  it('should show address in mobile drawer when available', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveTextContent('123 Main St');
      expect(sheet).toHaveTextContent('Augusta, GA');
    });
  });

  it('should show Navigate button linking to Google Maps', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const navigateBtn = screen.getByRole('link', { name: /navigate/i });
      expect(navigateBtn).toBeInTheDocument();
      expect(navigateBtn).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'));
      expect(navigateBtn).toHaveAttribute('href', expect.stringContaining('33.4735'));
      expect(navigateBtn).toHaveAttribute('href', expect.stringContaining('-82.0105'));
    });
  });

  it('should show drag handle bar in mobile drawer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      const handle = sheet.querySelector('[data-testid="drawer-handle"]');
      expect(handle).toBeInTheDocument();
    });
  });

  it('should show close button in mobile drawer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer-close')).toBeInTheDocument();
    });
  });

  it('should show Save Lead button for external events with truckId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab, { truckId: 'truck-123' }));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveTextContent('Save Lead');
    });
  });

  it('should show Hide button that hides event from map', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });

    const hideBtn = screen.getByTestId('mobile-drawer-hide');
    fireEvent.click(hideBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-bottom-sheet')).not.toBeInTheDocument();
    });
  });

  it('should show Source link when source_url is available', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sourceLink = screen.getByTestId('mobile-drawer-source');
      expect(sourceLink).toHaveAttribute('href', 'https://eproval.example.com/event/1');
      expect(sourceLink).toHaveAttribute('target', '_blank');
    });
  });

  it('should show Research button that expands drawer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer-research')).toBeInTheDocument();
    });
  });

  it('should show vendor fee badge when vendor_fee exists', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockPlatformEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveTextContent('$25');
    });
  });

  it('should show Not yet researched message when vetting_score is null', async () => {
    const unvettedEvent = {
      ...mockEvent,
      vetting_score: null,
      relevance_score: null,
    };
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([unvettedEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      const sheet = screen.getByTestId('mobile-bottom-sheet');
      expect(sheet).toHaveTextContent('Not yet researched');
    });
  });

  it('should close drawer when close button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mobile-drawer-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-bottom-sheet')).not.toBeInTheDocument();
    });
  });

  it('should render desktop Popup when not mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response).mockResolvedValueOnce(createFetchResponse([mockEvent]));

    const { EventMapTab } = await import('@/app/owner-dashboard/_components/events/EventMapTab');
    render(React.createElement(EventMapTab));

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('marker'));

    await waitFor(() => {
      const popups = screen.queryAllByTestId('popup');
      const selectedPopups = popups.filter(
        (p) => p.querySelector('.enhanced-popup-content'),
      );
      expect(selectedPopups).toHaveLength(1);
    });
  });
});
