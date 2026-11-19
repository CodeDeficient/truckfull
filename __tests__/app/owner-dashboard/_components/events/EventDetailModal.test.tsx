/**
 * EventDetailModal Component Tests — Unified Modal (Phase 3B, Worker 5)
 *
 * Tests platform events, external events, research section, Save Lead,
 * Visit Source link, and tier-aware rendering.
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  EventDetailModal,
  type Event,
  type ExternalEvent,
  type ResearchData,
} from '@/app/owner-dashboard/_components/events/EventDetailModal';

const mockOnClose = jest.fn();
const mockOnEdit = jest.fn();

const getMockPlatformEvent = (overrides?: Partial<Event>): Event => ({
  id: 'evt-platform-1',
  name: 'Test Food Truck Festival',
  description: 'A great festival for food trucks in downtown.',
  location_data: {
    lat: 34.0522,
    lng: -118.2437,
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
  },
  start_date: '2024-10-15T10:00:00Z',
  end_date: '2024-10-15T22:00:00Z',
  status: 'upcoming',
  vendor_fee: 25,
  max_vendors: 50,
  organizer: {
    business_name: 'Test Organizer',
    rating_avg: 4.5,
    rating_count: 100,
    verification_status: 'verified',
    user_id: 'user-123',
  },
  source: 'platform',
  ...overrides,
});

const getMockExternalEvent = (overrides?: Partial<ExternalEvent>): ExternalEvent => ({
  id: 'evt-external-1',
  name: 'City Park Food Festival',
  description: 'Annual food festival at City Park.',
  location_data: {
    lat: 33.749,
    lng: -84.388,
    address: '400 Park Dr',
    city: 'Atlanta',
    state: 'GA',
  },
  start_date: '2024-11-01T11:00:00Z',
  end_date: '2024-11-01T20:00:00Z',
  status: 'upcoming',
  vendor_fee: null,
  max_vendors: null,
  organizer: {
    business_name: 'City of Atlanta Parks Dept',
    rating_avg: null,
    rating_count: 0,
    verification_status: null,
    user_id: null,
  },
  source: 'external',
  source_type: 'eproval',
  source_url: 'https://eproval.atlantaga.gov/event/123',
  vetting_score: 14,
  research: {
    vetting_score: 14,
    traffic_data: 'High foot traffic — 15k+ visitors expected',
    foot_traffic_estimate: 'High',
    research_confidence: 'high',
    last_researched: '2024-09-01T00:00:00Z',
    notes: 'Government-verified permit. Well-established annual event.',
  },
  ...overrides,
});

describe('EventDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Platform events (existing behavior)', () => {
    it('should render the modal when open', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Test Food Truck Festival')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={false}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.queryByText('Test Food Truck Festival')).not.toBeInTheDocument();
    });

    it('should display event name', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Test Food Truck Festival')).toBeInTheDocument();
    });

    it('should display organizer name', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText(/Organized by Test Organizer/i)).toBeInTheDocument();
    });

    it('should display verified badge when organizer is verified', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should display vendor fee', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText(/\$25 vendor fee/i)).toBeInTheDocument();
    });

    it('should display description', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('A great festival for food trucks in downtown.')).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should display apply button when user is not owner', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Apply Now')).toBeInTheDocument();
    });

    it('should not show apply button for event owner', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-123"
        />,
      );
      expect(screen.queryByText('Apply Now')).not.toBeInTheDocument();
      expect(screen.getByText('You are the organizer of this event.')).toBeInTheDocument();
    });

    it('should show edit button for event owner', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          truckId="truck-1"
          currentUserId="user-123"
        />,
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should display free to participate for free events', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent({ vendor_fee: null })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Free to participate')).toBeInTheDocument();
    });
  });

  describe('External events', () => {
    it('should render external event with name and description', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('City Park Food Festival')).toBeInTheDocument();
      expect(screen.getByText('Annual food festival at City Park.')).toBeInTheDocument();
    });

    it('should display source badge for external events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ source_type: 'eproval' })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Government')).toBeInTheDocument();
    });

    it('should display "Eventbrite" source badge for eventbrite events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ source_type: 'eventbrite' })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Eventbrite')).toBeInTheDocument();
    });

    it('should display vetting score badge with correct color class', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: 14 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      expect(screen.getByText('Research: 14')).toBeInTheDocument();
    });

    it('should show Save Lead button for external events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Save Lead')).toBeInTheDocument();
    });

    it('should NOT show Apply Now button for external events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.queryByText('Apply Now')).not.toBeInTheDocument();
    });

    it('should show Visit Source link when source_url is provided', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({
            source_url: 'https://eproval.atlantaga.gov/event/123',
          })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.getByText('Visit Source')).toBeInTheDocument();
    });

    it('should NOT show Visit Source link when source_url is missing', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ source_url: null })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      expect(screen.queryByText('Visit Source')).not.toBeInTheDocument();
    });
  });

  describe('Save Lead action', () => {
    it('should call save lead API when Save Lead is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );

      fireEvent.click(screen.getByText('Save Lead'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events/saved-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: 'evt-external-1',
            truck_id: 'truck-1',
          }),
        });
      });
    });

    it('should show saved confirmation after successful save', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );

      fireEvent.click(screen.getByText('Save Lead'));

      await waitFor(() => {
        expect(screen.getByText('Lead saved!')).toBeInTheDocument();
      });
    });

    it('should show error when save lead fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not authenticated' }),
      });

      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );

      fireEvent.click(screen.getByText('Save Lead'));

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      });
    });

    it('should disable Save Lead button while saving', async () => {
      let resolvePromise: (value: unknown) => void;
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );

      fireEvent.click(screen.getByText('Save Lead'));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      resolvePromise!({ ok: true, json: async () => ({ success: true }) });
    });
  });

  describe('Research section (Pro tier)', () => {
    it('should show research section for Pro users with external events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ relevance_score: 8 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      expect(screen.getByText('Event Research')).toBeInTheDocument();
      expect(screen.getByText('Research Score')).toBeInTheDocument();
      expect(screen.getByText('Relevance')).toBeInTheDocument();
    });

    it('should NOT show research section for Free users', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="free"
        />,
      );
      expect(screen.queryByText('Event Research')).not.toBeInTheDocument();
      expect(screen.queryByText('Vetting Score')).not.toBeInTheDocument();
    });

    it('should show upgrade prompt for Free users viewing external events', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="free"
        />,
      );
      expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
    });

    it('should show foot traffic estimate as score when available', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({
            vetting_score: 14,
            relevance_score: 8,
          })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      expect(screen.getByText('Research Score')).toBeInTheDocument();
      expect(screen.getByText('Relevance')).toBeInTheDocument();
    });

    it('should NOT show research section for platform events', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      expect(screen.queryByText('Event Research')).not.toBeInTheDocument();
    });

    it('should handle external event with null research gracefully', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: null })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      expect(screen.getByText('City Park Food Festival')).toBeInTheDocument();
      expect(screen.queryByText('Event Research')).not.toBeInTheDocument();
    });
  });

  describe('Vetting badge colors', () => {
    it('should show green badge for vetting_score >= 12 (Pro users)', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: 14 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      const vettingBadge = screen.getByText('Research: 14');
      expect(vettingBadge.className).toContain('bg-emerald');
    });

    it('should show yellow badge for vetting_score 5-11 (Pro users)', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: 8 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      const vettingBadge = screen.getByText('Research: 8');
      expect(vettingBadge.className).toContain('bg-amber');
    });

    it('should show gray badge for vetting_score < 5 (Pro users)', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: 3 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="pro"
        />,
      );
      const vettingBadge = screen.getByText('Research: 3');
      expect(vettingBadge.className).toContain('bg-zinc');
    });

    it('should NOT show research badge for Free users with null vetting_score', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: null })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="free"
        />,
      );
      expect(screen.queryByText(/Research:/)).not.toBeInTheDocument();
    });

    it('should NOT show vetting score number for Free users', () => {
      render(
        <EventDetailModal
          event={getMockExternalEvent({ vetting_score: 14 })}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
          userTier="free"
        />,
      );
      expect(screen.queryByText('Research: 14')).not.toBeInTheDocument();
    });
  });

  describe('Close behavior', () => {
    it('should call onClose when Close button is clicked', () => {
      render(
        <EventDetailModal
          event={getMockPlatformEvent()}
          open={true}
          onClose={mockOnClose}
          truckId="truck-1"
          currentUserId="user-456"
        />,
      );
      fireEvent.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
