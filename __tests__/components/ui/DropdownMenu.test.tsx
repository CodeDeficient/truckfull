import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

jest.unstable_mockModule('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children }: any) => React.createElement('div', { 'data-testid': 'dropdown-menu-root' }, children),
  Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props }, children),
  Portal: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Content: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Sub: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  SubTrigger: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  SubContent: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Item: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  CheckboxItem: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  RadioItem: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Label: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Separator: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  Group: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  ItemIndicator: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
  RadioGroup: ({ children, ...props }: any) => React.createElement('div', { ...props }, children),
}));

const {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
} = await import('@/components/ui/DropdownMenu');

describe('DropdownMenu', () => {
  describe('DropdownMenuTrigger', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(DropdownMenuTrigger, { 'data-testid': 'trigger' }, 'Open'),
        ),
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuContent', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(DropdownMenuTrigger, null, 'Target'),
          React.createElement(DropdownMenuContent, { 'data-testid': 'content' }, 'Content'),
        ),
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuItem, { 'data-testid': 'item' }, 'Item'),
          ),
        ),
      );
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuLabel', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuLabel, { 'data-testid': 'label' }, 'Label'),
          ),
        ),
      );
      expect(screen.getByTestId('label')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuSeparator', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuSeparator, { 'data-testid': 'separator' }),
          ),
        ),
      );
      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuCheckboxItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuCheckboxItem, { 'data-testid': 'checkbox', checked: false }, 'Checkbox Item'),
          ),
        ),
      );
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuRadioItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuRadioItem, { 'data-testid': 'radio' }, 'Radio Item'),
          ),
        ),
      );
      expect(screen.getByTestId('radio')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuShortcut', () => {
    it('renders without crashing', () => {
      render(React.createElement(DropdownMenuShortcut, { 'data-testid': 'shortcut' }, 'Ctrl+K'));
      expect(screen.getByTestId('shortcut')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuGroup', () => {
    it('renders without crashing', () => {
      render(React.createElement(DropdownMenuGroup, { 'data-testid': 'group' }, 'Group'));
      expect(screen.getByTestId('group')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuSub', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          DropdownMenu,
          null,
          React.createElement(
            DropdownMenuContent,
            null,
            React.createElement(DropdownMenuSub, { 'data-testid': 'sub' }, 'Sub'),
          ),
        ),
      );
      expect(screen.getByTestId('sub')).toBeInTheDocument();
    });
  });
});
