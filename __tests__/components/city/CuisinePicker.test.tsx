import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CuisinePicker, type CuisinePickerItem } from '@/components/city/CuisinePicker';

function items(count: number): CuisinePickerItem[] {
  return Array.from({ length: count }, (_, index) => ({
    cuisine: `Cuisine ${String(index + 1).padStart(2, '0')}`,
    count: count - index,
    href: `/cuisine/c-${index + 1}`,
    title: `title ${index + 1}`,
  }));
}

describe('CuisinePicker', () => {
  it('shows every cuisine with no search when the list is short', () => {
    render(<CuisinePicker items={items(5)} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('keeps all links in the page but shows only the first twelve until expanded', () => {
    const { container } = render(<CuisinePicker items={items(20)} />);
    expect(container.querySelectorAll('a')).toHaveLength(20);
    expect(screen.getAllByRole('link')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 20 cuisines' }));
    expect(screen.getAllByRole('link')).toHaveLength(20);
  });

  it('filters the full list from the search box', () => {
    render(<CuisinePicker items={items(20)} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a cuisine' }), {
      target: { value: '19' },
    });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Cuisine 19 (2)']);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No cuisines match');
  });
});
