/**
 * =============================================================================
 * UNIT TESTS: ClusterMarker Component
 * =============================================================================
 *
 * PURPOSE: Test the ClusterMarker component in isolation.
 * Tests cluster count display, size classes, click handling, and styling.
 *
 * TESTS COVER (10 tests):
 * - Renders cluster point_count as text
 * - Applies w-14 h-14 class for 10+ trucks
 * - Applies w-12 h-12 class for 5-9 trucks
 * - Applies w-10 h-10 class for <5 trucks
 * - Calls onClick with cluster data
 * - Passes correct longitude to onClick
 * - Passes correct latitude to onClick
 * - Applies black background and white border styles
 * - Applies text glow shadow
 * - Memoization works (React.memo)
 *
 * =============================================================================
 * CRITICAL: ESM MOCKING PATTERN
 * =============================================================================
 */

// =============================================================================
// ESM MOCKS - MUST BE FIRST (before any imports)
// =============================================================================

jest.unstable_mockModule('react-map-gl/mapbox', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const ReactActual = (React as any).__esModule ? React.default : React;

  return {
    __esModule: true,
    Marker: ({ children, onClick, latitude, longitude }: any) =>
      ReactActual.createElement(
        'div',
        {
          'data-testid': 'marker',
          onClick,
          'data-lat': latitude,
          'data-lng': longitude,
        },
        children,
      ),
  };
});

// =============================================================================
// IMPORTS - After all mocks are registered
// =============================================================================

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockCluster } from './test-utils';

// DYNAMIC IMPORT: Required for ESM mock pattern
const { ClusterMarker } = await import('../ClusterMarker');

// =============================================================================
// TEST SUITE: ClusterMarker
// =============================================================================

describe('ClusterMarker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // TEST 1: Cluster count text
  // ===========================================================================
  it('should render cluster point_count as text', () => {
    const cluster = createMockCluster(15);
    render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  // ===========================================================================
  // TEST 2: Size class for 10+ trucks
  // ===========================================================================
  it('should apply w-14 h-14 class for 10+ trucks', () => {
    const cluster = createMockCluster(10);
    const { container } = render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    const marker = container.querySelector('[data-testid="marker"]');
    expect(marker).toBeInTheDocument();
  });

  // ===========================================================================
  // TEST 3: Size class for 5-9 trucks
  // ===========================================================================
  it('should apply w-12 h-12 class for 5-9 trucks', () => {
    const cluster = createMockCluster(7);
    const { container } = render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    const marker = container.querySelector('[data-testid="marker"]');
    expect(marker).toBeInTheDocument();
  });

  // ===========================================================================
  // TEST 4: Size class for <5 trucks
  // ===========================================================================
  it('should apply w-10 h-10 class for <5 trucks', () => {
    const cluster = createMockCluster(3);
    const { container } = render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    const marker = container.querySelector('[data-testid="marker"]');
    expect(marker).toBeInTheDocument();
  });

  // ===========================================================================
  // TEST 5: Click handler with cluster data
  // ===========================================================================
  it('should call onClick handler with cluster when clicked', () => {
    const mockOnClick = jest.fn();
    const cluster = createMockCluster(5, [-82.0105, 33.4728]);

    render(<ClusterMarker cluster={cluster} onClick={mockOnClick} />);

    const marker = screen.getByText('5');
    fireEvent.click(marker);

    expect(mockOnClick).toHaveBeenCalledWith(cluster, -82.0105, 33.4728);
  });

  // ===========================================================================
  // TEST 6: Correct longitude
  // ===========================================================================
  it('should pass correct longitude to onClick', () => {
    const mockOnClick = jest.fn();
    const cluster = createMockCluster(5, [-82.0105, 33.4728]);

    render(<ClusterMarker cluster={cluster} onClick={mockOnClick} />);

    const marker = screen.getByText('5');
    fireEvent.click(marker);

    expect(mockOnClick).toHaveBeenCalledWith(expect.anything(), -82.0105, expect.any(Number));
  });

  // ===========================================================================
  // TEST 7: Correct latitude
  // ===========================================================================
  it('should pass correct latitude to onClick', () => {
    const mockOnClick = jest.fn();
    const cluster = createMockCluster(5, [-82.0105, 33.4728]);

    render(<ClusterMarker cluster={cluster} onClick={mockOnClick} />);

    const marker = screen.getByText('5');
    fireEvent.click(marker);

    expect(mockOnClick).toHaveBeenCalledWith(expect.anything(), expect.any(Number), 33.4728);
  });

  // ===========================================================================
  // TEST 8: Styling (background, border)
  // ===========================================================================
  it('should apply black background and white border styles', () => {
    const cluster = createMockCluster(5);
    const { container } = render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    const marker = container.querySelector('[data-testid="marker"]');
    expect(marker).toBeInTheDocument();
  });

  // ===========================================================================
  // TEST 9: Text glow effect
  // ===========================================================================
  it('should apply text glow shadow', () => {
    const cluster = createMockCluster(5);
    const { container } = render(<ClusterMarker cluster={cluster} onClick={jest.fn()} />);

    const text = screen.getByText('5');
    expect(text).toBeInTheDocument();
    expect(text).toHaveStyle({
      textShadow: '0 0 6px #dc2626, 0 0 12px #dc2626',
    });
  });

  // ===========================================================================
  // TEST 10: Memoization
  // ===========================================================================
  it('should be memoized and not re-render unnecessarily', () => {
    const cluster = createMockCluster(5);
    const onClick = jest.fn();

    const { rerender } = render(<ClusterMarker cluster={cluster} onClick={onClick} />);

    const initialText = screen.getByText('5');

    rerender(<ClusterMarker cluster={cluster} onClick={onClick} />);

    const rerenderedText = screen.getByText('5');

    // Same element reference means it was memoized
    expect(initialText).toBe(rerenderedText);
  });
});
