import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

jest.unstable_mockModule('@radix-ui/react-alert-dialog', () => ({
  Root: ({ children }: any) => React.createElement('div', { 'data-testid': 'alert-dialog-root' }, children),
  Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
  Portal: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Overlay: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Content: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Header: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Footer: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Title: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Description: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Action: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
  Cancel: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
}));

const {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} = await import('@/components/ui/AlertDialog');

describe('AlertDialog', () => {
  describe('AlertDialogTrigger', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          AlertDialog,
          null,
          React.createElement(AlertDialogTrigger, { 'data-testid': 'trigger' }, 'Open'),
        ),
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });

  describe('AlertDialogHeader', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogHeader, { 'data-testid': 'header' }, 'Header Content'));
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('AlertDialogFooter', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogFooter, { 'data-testid': 'footer' }, 'Footer Content'));
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  describe('AlertDialogTitle', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogTitle, { 'data-testid': 'title' }, 'Title'));
      expect(screen.getByTestId('title')).toBeInTheDocument();
    });
  });

  describe('AlertDialogDescription', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogDescription, { 'data-testid': 'desc' }, 'Description'));
      expect(screen.getByTestId('desc')).toBeInTheDocument();
    });
  });

  describe('AlertDialogAction', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogAction, { 'data-testid': 'action' }, 'Confirm'));
      expect(screen.getByTestId('action')).toBeInTheDocument();
    });
  });

  describe('AlertDialogCancel', () => {
    it('renders without crashing', () => {
      render(React.createElement(AlertDialogCancel, { 'data-testid': 'cancel' }, 'Cancel'));
      expect(screen.getByTestId('cancel')).toBeInTheDocument();
    });
  });
});
