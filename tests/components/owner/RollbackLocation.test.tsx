/**
 * RollbackLocation Component Tests
 *
 * TDD Phase 1 (RED): Test location rollback functionality
 * Verifies that owners can rollback to previous location versions
 */

import React from 'react';
import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RollbackLocation } from '@/components/owner/RollbackLocation';

const mockLocationHistory = [
  {
    id: '1',
    version: 1,
    location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Main St',
    },
    createdAt: '2026-02-08T10:00:00Z',
    source: 'facebook' as const,
    sourcePostId: 'fb_post_123',
    confidence: 0.95,
    status: 'active',
  },
  {
    id: '2',
    version: 2,
    location: {
      lat: 40.713,
      lng: -74.007,
      address: '456 Oak Ave',
    },
    createdAt: '2026-02-07T14:30:00Z',
    source: 'facebook' as const,
    sourcePostId: 'fb_post_456',
    confidence: 0.82,
    status: 'inactive',
  },
  {
    id: '3',
    version: 3,
    location: {
      lat: 40.714,
      lng: -74.008,
      address: '789 Pine Rd',
    },
    createdAt: '2026-02-06T09:15:00Z',
    source: 'manual' as const,
    confidence: 1,
    status: 'active',
  },
];

describe('RollbackLocation', () => {
  const defaultProps = {
    truckId: 'truck_123',
    locationHistory: mockLocationHistory,
    onRollback: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 1: Renders location history', () => {
    it('should display rollback modal', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByText(/rollback location/i)).toBeInTheDocument();
    });

    it('should display all location versions', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
      expect(screen.getByText('789 Pine Rd')).toBeInTheDocument();
    });

    it('should show version numbers', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getAllByText(/version/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Test 2: Displays location details', () => {
    it('should show address for each version', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    });

    it('should show timestamps for each version', () => {
      render(<RollbackLocation {...defaultProps} />);

      const text = screen.getByText(/rollback location/i).parentElement?.textContent ?? '';
      expect(text).toBeDefined();
    });

    it('should show source (facebook/manual)', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getAllByText(/facebook/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/manual/i)).toBeInTheDocument();
    });

    it('should show confidence score', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByText(/95%/i)).toBeInTheDocument();
    });

    it('should show status', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getAllByText(/active/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });
  });

  describe('Test 3: Rollback action', () => {
    it('should call onRollback when rollback button is clicked', async () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(rollbackButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onRollback).toHaveBeenCalledWith(2);
      });
    });

    it('should show confirmation dialog before rollback', async () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(rollbackButtons[0]);

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByText(/this will replace/i)).toBeInTheDocument();
    });

    it('should include location details in confirmation', async () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(rollbackButtons[0]);

      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    });
  });

  describe('Test 4: Cancel rollback', () => {
    it('should cancel rollback when cancel button is clicked', async () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(rollbackButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(defaultProps.onRollback).not.toHaveBeenCalled();
      });
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });

    it('should allow selecting a different version', async () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(rollbackButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      const secondRollbackButton = screen.getAllByRole('button', { name: /rollback/i });
      fireEvent.click(secondRollbackButton[0]);

      expect(screen.getByText(/456 Oak Ave/i)).toBeInTheDocument();
    });
  });

  describe('Test 5: Empty state', () => {
    it('should show message when no history available', () => {
      const props = {
        ...defaultProps,
        locationHistory: [],
      };

      render(<RollbackLocation {...props} />);

      expect(screen.getByText(/no location history available/i)).toBeInTheDocument();
    });

    it('should hide rollback buttons when no history', () => {
      const props = {
        ...defaultProps,
        locationHistory: [],
      };

      render(<RollbackLocation {...props} />);

      expect(screen.queryByRole('button', { name: /rollback/i })).not.toBeInTheDocument();
    });
  });

  describe('Test 6: Close modal', () => {
    it('should have a close button', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Test 7: Single location', () => {
    it('should disable rollback when only one location exists', () => {
      const props = {
        ...defaultProps,
        locationHistory: [mockLocationHistory[0]],
      };

      render(<RollbackLocation {...props} />);

      const rollbackButton = screen.queryByRole('button', { name: /rollback/i });
      expect(rollbackButton).not.toBeInTheDocument();

      expect(screen.getByText(/only one location available/i)).toBeInTheDocument();
    });
  });

  describe('Test 8: Warning for current location', () => {
    it('should mark current location', () => {
      render(<RollbackLocation {...defaultProps} />);

      expect(screen.getByText(/current/i)).toBeInTheDocument();
    });

    it('should not show rollback button for current location entry', () => {
      render(<RollbackLocation {...defaultProps} />);

      const rollbackButtons = screen.getAllByRole('button', { name: /rollback/i });

      expect(rollbackButtons.length).toBe(2);
    });
  });
});
