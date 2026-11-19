/**
 * RED Test: DeleteAccountButton component
 * Phase 3.1.1 — Confirmation dialog appears on click
 * Phase 3.2.1 — API call on confirmation
 *
 * Following TDD: Write failing test FIRST.
 * Following ESM testing rules: use jest.unstable_mockModule()
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================
// MOCK DECLARATIONS (BEFORE imports)
// ============================================================

// Mock sonner toast
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('sonner', () => ({
  toast: mockToast,
}));

// Mock useRouter
const mockPush = jest.fn();
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// ============================================================
// DYNAMIC IMPORT AFTER MOCKS
// ============================================================
const { DeleteAccountButton } = await import('@/components/settings/DeleteAccountButton');

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockPush.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  describe('Phase 3.1.1 — Confirmation dialog', () => {
    it('should render delete account button initially', async () => {
      render(<DeleteAccountButton />);
      expect(screen.getByRole('button', { name: /delete account/i })).toBeTruthy();
    });

    it('should show dialog content when button is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('should display Delete Account title in dialog', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      const headings = screen.getAllByRole('heading');
      const dialogTitle = headings.find(h => /delete account\?/i.test(h.textContent || ''));
      expect(dialogTitle).toBeTruthy();
    });

    it('should have Cancel and Confirm buttons in dialog', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
      expect(cancelBtn).toBeTruthy();
      expect(confirmBtn).toBeTruthy();
    });
  });

  describe('Phase 3.2.1 — API call on confirmation', () => {
    it('should call DELETE /api/account/delete when confirm is clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://truckfull.food/account-deleted' }),
      });

      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/account/delete',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    it('should show success toast and redirect after successful deletion', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://truckfull.food/account-deleted' }),
      });

      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/account-deleted');
      });
    });

    it('should show error toast when API call fails', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('should disable buttons during deletion', async () => {
      const user = userEvent.setup();
      // Delay the fetch to see loading state
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ url: 'https://truckfull.food/account-deleted' }) }), 100)
      ));

      render(<DeleteAccountButton />);
      await user.click(screen.getByRole('button', { name: /delete account/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      // Confirm button should show loading text
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deleting/i })).toBeTruthy();
      });
    });
  });
});
