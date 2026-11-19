import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

const mockSelectPrimitive = {
  Root: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Group: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Value: ({ children, ...props }: any) => React.createElement('span', { ...props }, children),
  Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
  Portal: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Content: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Label: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Item: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Separator: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Viewport: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  ScrollUpButton: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  ScrollDownButton: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  ItemIndicator: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  ItemText: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Icon: ({ children, ...props }: any) => React.createElement('span', { ...props }, children),
};

jest.unstable_mockModule('@radix-ui/react-select', () => ({
  __esModule: true,
  default: mockSelectPrimitive,
  ...mockSelectPrimitive,
}));

const {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} = await import('@/components/ui/select');

describe('select', () => {
  describe('Select', () => {
    it('renders without crashing', () => {
      render(React.createElement(Select, null, 'Select'));
      expect(screen.getByText('Select')).toBeInTheDocument();
    });
  });

  describe('SelectGroup', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectGroup, { 'data-testid': 'group' }, 'Group'));
      expect(screen.getByTestId('group')).toBeInTheDocument();
    });
  });

  describe('SelectValue', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectValue, { 'data-testid': 'value' }, 'Value'));
      expect(screen.getByTestId('value')).toBeInTheDocument();
    });
  });

  describe('SelectTrigger', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectTrigger, { 'data-testid': 'trigger' }, 'Trigger'));
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });

  describe('SelectContent', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectContent, { 'data-testid': 'content' }, 'Content'));
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('SelectLabel', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectLabel, { 'data-testid': 'label' }, 'Label'));
      expect(screen.getByTestId('label')).toBeInTheDocument();
    });
  });

  describe('SelectItem', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectItem, { 'data-testid': 'item' }, 'Item'));
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('SelectSeparator', () => {
    it('renders without crashing', () => {
      render(React.createElement(SelectSeparator, { 'data-testid': 'separator' }));
      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });
});
