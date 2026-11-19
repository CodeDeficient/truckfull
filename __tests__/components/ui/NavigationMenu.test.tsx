import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

const mockNavigationMenuPrimitive = {
  Root: ({ children, ...props }: React.PropsWithChildren) =>
    React.createElement('div', { ...props }, children),
  List: ({ children, ...props }: any) => React.createElement('ul', { ...props }, children),
  Item: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
  Content: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Link: ({ children, ...props }: any) => React.createElement('a', { ...props }, children),
  Indicator: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Viewport: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
};

jest.unstable_mockModule('@radix-ui/react-navigation-menu', () => ({
  __esModule: true,
  default: mockNavigationMenuPrimitive,
  ...mockNavigationMenuPrimitive,
}));

const {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} = await import('@/components/ui/NavigationMenu');

describe('NavigationMenu', () => {
  describe('NavigationMenu', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenu, { 'data-testid': 'nav' }, 'Nav'));
      expect(screen.getByTestId('nav')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuList', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuList, { 'data-testid': 'list' }, 'List'));
      expect(screen.getByTestId('list')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuItem', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuItem, { 'data-testid': 'item' }, 'Item'));
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuTrigger', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuTrigger, { 'data-testid': 'trigger' }, 'Trigger'));
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuContent', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuContent, { 'data-testid': 'content' }, 'Content'));
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuLink', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuLink, { 'data-testid': 'link' }, 'Link'));
      expect(screen.getByTestId('link')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuIndicator', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuIndicator, { 'data-testid': 'indicator' }));
      expect(screen.getByTestId('indicator')).toBeInTheDocument();
    });
  });

  describe('NavigationMenuViewport', () => {
    it('renders without crashing', () => {
      render(React.createElement(NavigationMenuViewport, { 'data-testid': 'viewport' }));
      expect(screen.getByTestId('viewport')).toBeInTheDocument();
    });
  });
});
