import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { CuisineCard } from '@/components/cuisine/CuisineCard';
import type { FoodTruck } from '@/lib/types';

describe('CuisineCard Component', () => {
  const defaultProps = {
    cuisineType: 'Mexican',
  };

  const mockTrucks: FoodTruck[] = [
    {
      id: 'truck-1',
      name: 'Truck 1',
      average_rating: 4.5,
      // Add other required mock properties as per FoodTruck type
    } as unknown as FoodTruck,
    {
      id: 'truck-2',
      name: 'Truck 2',
      average_rating: 3.5,
    } as unknown as FoodTruck,
  ];

  it('renders successfully with required props', () => {
    render(<CuisineCard {...defaultProps} />);

    // Checks for cuisine type name
    expect(screen.getByText('Mexican')).toBeInTheDocument();
    // Checks for corresponding cuisine icon
    expect(screen.getByText('🌮')).toBeInTheDocument();
  });

  it('shows correct cuisine icon for different types', () => {
    const { rerender } = render(<CuisineCard cuisineType="Pizza" />);
    expect(screen.getByText('🍕')).toBeInTheDocument();

    rerender(<CuisineCard cuisineType="Asian" />);
    expect(screen.getByText('🥢')).toBeInTheDocument();
  });

  it('defaults to general icon if cuisine type is not in the map', () => {
    render(<CuisineCard cuisineType="Unknown Cuisine" />);

    expect(screen.getByText('Unknown Cuisine')).toBeInTheDocument();
    // General icon
    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });

  it('displays correct truck stats (count and average rating)', () => {
    render(<CuisineCard cuisineType="Mexican" trucks={mockTrucks} />);

    // We expect 2 trucks with average rating of 4.0
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('does not display stats if trucks are empty', () => {
    const { container } = render(<CuisineCard cuisineType="Mexican" trucks={[]} />);
    // Stats elements typically contain map pin or star icons.
    // Wait, let's just assert that count '0' is not explicitly rendered.
    // The MapPin and Star are not rendered.
    expect(container.querySelector('.lucide-map-pin')).not.toBeInTheDocument();
    expect(container.querySelector('.lucide-star')).not.toBeInTheDocument();
  });

  it('shows "Selected" badge when isSelected is true', () => {
    render(<CuisineCard cuisineType="Mexican" isSelected={true} />);

    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('calls onSelect with cuisineType when clicked', async () => {
    const onSelectMock = jest.fn();
    render(<CuisineCard cuisineType="Mexican" onSelect={onSelectMock} />);

    const card = screen.getByText('Mexican').closest('.cursor-pointer');
    expect(card).toBeInTheDocument();

    if (card) {
      await userEvent.click(card);
    }

    expect(onSelectMock).toHaveBeenCalledTimes(1);
    expect(onSelectMock).toHaveBeenCalledWith('Mexican');
  });

  it('applies correct size classes based on size prop', () => {
    const { rerender, container } = render(<CuisineCard cuisineType="Mexican" size="small" />);
    // "small" corresponds to "p-3" in sizeClasses
    expect(container.firstChild).toHaveClass('p-3');

    rerender(<CuisineCard cuisineType="Mexican" size="large" />);
    // "large" corresponds to "p-6"
    expect(container.firstChild).toHaveClass('p-6');

    rerender(<CuisineCard cuisineType="Mexican" size="medium" />);
    // "medium" corresponds to "p-4"
    expect(container.firstChild).toHaveClass('p-4');
  });
});
