/**
 * RED Test: /account-deleted page
 * Phase 2.1.1 — Confirmation page renders correctly
 *
 * Following TDD: Write failing test FIRST.
 * Following ESM testing rules: use jest.unstable_mockModule()
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// ============================================================
// MOCK DECLARATIONS (BEFORE imports)
// ============================================================

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush, back: jest.fn(), forward: jest.fn() };

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn().mockReturnValue('/account-deleted'),
}));

// Mock next/link
jest.unstable_mockModule('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ============================================================
// DYNAMIC IMPORT AFTER MOCKS
// ============================================================
const { default: AccountDeletedPage } = await import('@/app/account-deleted/page');

describe('/account-deleted page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phase 2.1.1 — Confirmation page renders', () => {
    it('should display "Account Deleted" as h1 heading', async () => {
      render(<AccountDeletedPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toBe('Account Deleted');
    });

    it('should include link back to home with href "/"', async () => {
      render(<AccountDeletedPage />);
      const link = screen.getByRole('link', { name: /return.*home/i });
      expect(link.getAttribute('href')).toBe('/');
    });

    it('should mention data is permanently deleted', async () => {
      render(<AccountDeletedPage />);
      const text = screen.getByText(/permanently deleted/i);
      expect(text).toBeTruthy();
    });
  });
});
