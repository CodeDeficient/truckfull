import { beforeAll, describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocialFooter } from '@/components/SocialFooter';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

describe('SocialFooter', () => {
  it('links to the food trucks by city hub', () => {
    render(<SocialFooter />);
    expect(screen.getByRole('link', { name: 'Food Trucks by City' })).toHaveAttribute(
      'href',
      '/trucks',
    );
  });
});
