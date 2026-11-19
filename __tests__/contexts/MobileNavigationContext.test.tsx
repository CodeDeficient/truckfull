import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

const { MobileNavigationProvider, useMobileNavigation } =
  await import('@/contexts/MobileNavigationContext');

// Test consumer component
const TestConsumer = ({ onRouteChange }: { onRouteChange?: (route: string) => void }) => {
  const { currentRoute, navigateTo } = useMobileNavigation();
  return React.createElement(
    'div',
    { 'data-testid': 'consumer' },
    React.createElement('span', { 'data-testid': 'current-route' }, currentRoute),
    React.createElement(
      'button',
      {
        'data-testid': 'navigate-discover',
        onClick: () => navigateTo('discover'),
      },
      'Go to Discover',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'navigate-favorites',
        onClick: () => navigateTo('favorites'),
      },
      'Go to Favorites',
    ),
    onRouteChange &&
      React.createElement(
        'button',
        {
          'data-testid': 'navigate-with-callback',
          onClick: () => {
            navigateTo('orders');
            onRouteChange('orders');
          },
        },
        'Navigate with callback',
      ),
  );
};

describe('MobileNavigationContext', () => {
  describe('MobileNavigationProvider', () => {
    it('provides default route as near-me', () => {
      render(
        React.createElement(MobileNavigationProvider, null, React.createElement(TestConsumer)),
      );

      expect(screen.getByTestId('current-route')).toHaveTextContent('near-me');
    });

    it('accepts initialRoute prop', () => {
      render(
        React.createElement(
          MobileNavigationProvider,
          { initialRoute: 'discover' },
          React.createElement(TestConsumer),
        ),
      );

      expect(screen.getByTestId('current-route')).toHaveTextContent('discover');
    });

    it('supports all route types as initialRoute', () => {
      const routes: Array<'near-me' | 'discover' | 'featured' | 'orders' | 'favorites'> = [
        'near-me',
        'discover',
        'featured',
        'orders',
        'favorites',
      ];

      routes.forEach((route) => {
        const { unmount } = render(
          React.createElement(
            MobileNavigationProvider,
            { initialRoute: route },
            React.createElement(TestConsumer),
          ),
        );

        expect(screen.getByTestId('current-route')).toHaveTextContent(route);
        unmount();
      });
    });
  });

  describe('navigateTo', () => {
    it('changes currentRoute when navigateTo is called', () => {
      render(
        React.createElement(MobileNavigationProvider, null, React.createElement(TestConsumer)),
      );

      expect(screen.getByTestId('current-route')).toHaveTextContent('near-me');

      fireEvent.click(screen.getByTestId('navigate-discover'));

      expect(screen.getByTestId('current-route')).toHaveTextContent('discover');
    });

    it('navigates to multiple routes sequentially', () => {
      render(
        React.createElement(MobileNavigationProvider, null, React.createElement(TestConsumer)),
      );

      fireEvent.click(screen.getByTestId('navigate-discover'));
      expect(screen.getByTestId('current-route')).toHaveTextContent('discover');

      fireEvent.click(screen.getByTestId('navigate-favorites'));
      expect(screen.getByTestId('current-route')).toHaveTextContent('favorites');
    });
  });

  describe('useMobileNavigation', () => {
    it('throws error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const BadConsumer = () => {
        useMobileNavigation();
        return React.createElement('div', null, 'Bad');
      };

      expect(() => {
        render(React.createElement(BadConsumer));
      }).toThrow('useMobileNavigation must be used within a MobileNavigationProvider');

      consoleError.mockRestore();
    });
  });
});
