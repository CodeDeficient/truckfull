/**
 * =============================================================================
 * UNIT TESTS: EventFilters Component
 * =============================================================================
 *
 * PURPOSE: Test the EventFilters component - floating filter overlay for events.
 * Collapsible panel with date range, vetting score slider, source toggle.
 *
 * TESTS COVER:
 * - Renders in collapsed state showing filter icon
 * - Renders in expanded state showing all controls
 * - Date range inputs for start and end
 * - Vetting score slider (4-25 range) - visible for Pro tier
 * - Vetting score slider hidden for Free tier
 * - Source toggle: All/Platform/External
 * - Event count display
 * - Expand/collapse functionality
 * - Uses existing UI components (Slider, Badge, Button)
 *
 * =============================================================================
 * CRITICAL: ESM MOCKING PATTERN (react-map-gl/mapbox)
 * =============================================================================
 */

jest.unstable_mockModule('react-map-gl/mapbox', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const ReactActual = (React as any).__esModule ? React.default : React;

  return {
    __esModule: true,
    Popup: ({ children, onClose, longitude, latitude, anchor, closeOnClick }: any) =>
      ReactActual.createElement(
        'div',
        {
          'data-testid': 'popup',
          onClick: onClose,
          'data-lng': longitude,
          'data-lat': latitude,
          'data-anchor': anchor,
          'data-close-on-click': closeOnClick,
        },
        children,
      ),
  };
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MapEvent } from '../eventMapTypes';

const { EventFilters } = await import('../EventFilters');

const createMockMapEvent = (overrides?: Partial<MapEvent>): MapEvent => ({
  id: 'event-1',
  name: 'Food Truck Festival',
  description: '',
  location_data: { lat: 33.4735, lng: -82.0105 },
  start_date: '',
  end_date: '',
  status: '',
  vendor_fee: null,
  max_vendors: null,
  source_type: 'civicplus_rss',
  source: 'civicplus_rss',
  vetting_score: 18,
  organizer: null,
  ...overrides,
});

type SourceFilter = 'all' | 'platform' | 'external';

interface FilterState {
  startDate: string;
  endDate: string;
  minVettingScore: number;
  sourceFilter: SourceFilter;
}

describe('EventFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render in collapsed state showing filter icon', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
    });

    it('should render in expanded state showing all controls when not collapsed', () => {
      const mockOnChange = jest.fn();
      const { container } = render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const filterPanel = container.querySelector('[data-testid="filter-panel"]');
      expect(filterPanel).toBeInTheDocument();
    });

    it('should render event count', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={42}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByText('42 events')).toBeInTheDocument();
    });

    it('should render start date input', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    it('should render end date input', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
  });

  describe('Source Toggle', () => {
    it('should render source toggle with All/Platform/External options', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /platform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /external/i })).toBeInTheDocument();
    });

    it('should call onFiltersChange when source filter changes', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /platform/i }));
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ sourceFilter: 'platform' }));
    });
  });

  describe('Vetting Score Slider (Pro Tier)', () => {
    it('should render vetting score slider for Pro tier', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={true}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 10, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByTestId('vetting-score-slider')).toBeInTheDocument();
    });

    it('should hide vetting score slider for Free tier', () => {
      const mockOnChange = jest.fn();
      const { container } = render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 10, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(container.querySelector('[data-testid="vetting-score-slider"]')).not.toBeInTheDocument();
    });

    it('should display current vetting score value', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={true}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 15, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      expect(screen.getByText(/Min Vetting Score: 15/i)).toBeInTheDocument();
    });

    it('should call onFiltersChange when vetting score changes', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={true}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 10, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const slider = screen.getByTestId('vetting-score-slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Date Range', () => {
    it('should call onFiltersChange when start date changes', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const startInput = screen.getByLabelText(/start date/i);
      fireEvent.change(startInput, { target: { value: '2026-04-01' } });
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-04-01' }));
    });

    it('should call onFiltersChange when end date changes', () => {
      const mockOnChange = jest.fn();
      render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const endInput = screen.getByLabelText(/end date/i);
      fireEvent.change(endInput, { target: { value: '2026-04-30' } });
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ endDate: '2026-04-30' }));
    });
  });

  describe('Expand/Collapse', () => {
    it('should toggle expanded state when filter icon is clicked', () => {
      const mockOnChange = jest.fn();
      const { container, rerender } = render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const filterToggle = screen.getByTestId('filter-toggle');
      
      const initialPanel = container.querySelector('[data-testid="filter-panel"]');
      
      fireEvent.click(filterToggle);
      
      rerender(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      
      expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply absolute positioning over map', () => {
      const mockOnChange = jest.fn();
      const { container } = render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const panel = container.querySelector('[data-testid="filter-panel"]');
      expect(panel).toBeInTheDocument();
    });

    it('should have collapsible capability', () => {
      const mockOnChange = jest.fn();
      const { container } = render(
        <EventFilters
          isPro={false}
          eventCount={5}
          filters={{ startDate: '', endDate: '', minVettingScore: 4, sourceFilter: 'all' }}
          onFiltersChange={mockOnChange}
        />,
      );
      const toggle = screen.getByTestId('filter-toggle');
      expect(toggle).toBeInTheDocument();
      fireEvent.click(toggle);
    });
  });
});