# Cuisine Components

This directory contains components for cuisine exploration functionality.

## Components

### CuisineCard

A card component that represents a cuisine type with optional truck-related information.

#### Props

- `cuisineType` (string, required): The cuisine type for this card
- `trucks` (FoodTruck[]): Optional truck data to show related information
- `onSelect` (function): Optional callback when the card is selected
- `isSelected` (boolean): Whether this card is currently selected
- `className` (string): Optional CSS classes
- `size` ("small" | "medium" | "large"): Size variant

### CuisineExploration

A card-based interface for exploring different cuisine types similar to Truckster's Explore section.

#### Props

- `trucks` (FoodTruck[]): Optional list of food trucks to provide stats for each cuisine
- `onCuisineSelect` (function, required): Callback when a cuisine is selected
- `selectedCuisines` (string[]): Currently selected cuisines
- `className` (string): Optional CSS classes
- `showSearch` (boolean): Whether to show search functionality

## Usage

```tsx
import { CuisineExploration } from '@/components/cuisine';

<CuisineExploration
  trucks={foodTrucks}
  onCuisineSelect={(cuisine) => console.log(cuisine)}
  selectedCuisines={selectedCuisines}
/>;
```

## Features

- Responsive grid layout
- Search functionality
- Stats display (truck count, average rating)
- Visual selection indicators
- Mobile-friendly design
- Integration with filter store
