import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

jest.unstable_mockModule('@radix-ui/react-context-menu', () => ({
  Root: ({ children }: any) => React.createElement('div', { 'data-testid': 'context-menu-root' }, children),
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
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuShortcut,
} = await import('@/components/ui/ContextMenu');

describe('ContextMenu', () => {
  describe('ContextMenuTrigger', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(ContextMenuTrigger, { 'data-testid': 'trigger' }, 'Right Click Me'),
        ),
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });

  describe('ContextMenuContent', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(ContextMenuTrigger, null, 'Target'),
          React.createElement(ContextMenuContent, { 'data-testid': 'content' }, 'Content'),
        ),
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('ContextMenuItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(
            ContextMenuContent,
            null,
            React.createElement(ContextMenuItem, { 'data-testid': 'item' }, 'Item'),
          ),
        ),
      );
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('ContextMenuLabel', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(
            ContextMenuContent,
            null,
            React.createElement(ContextMenuLabel, { 'data-testid': 'label' }, 'Label'),
          ),
        ),
      );
      expect(screen.getByTestId('label')).toBeInTheDocument();
    });
  });

  describe('ContextMenuSeparator', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(
            ContextMenuContent,
            null,
            React.createElement(ContextMenuSeparator, { 'data-testid': 'separator' }),
          ),
        ),
      );
      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });

  describe('ContextMenuCheckboxItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(
            ContextMenuContent,
            null,
            React.createElement(ContextMenuCheckboxItem, { 'data-testid': 'checkbox', checked: false }, 'Checkbox Item'),
          ),
        ),
      );
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    });
  });

  describe('ContextMenuRadioItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          ContextMenu,
          null,
          React.createElement(
            ContextMenuContent,
            null,
            React.createElement(ContextMenuRadioItem, { 'data-testid': 'radio' }, 'Radio Item'),
          ),
        ),
      );
      expect(screen.getByTestId('radio')).toBeInTheDocument();
    });
  });

  describe('ContextMenuShortcut', () => {
    it('renders without crashing', () => {
      render(React.createElement(ContextMenuShortcut, { 'data-testid': 'shortcut' }, 'Ctrl+K'));
      expect(screen.getByTestId('shortcut')).toBeInTheDocument();
    });
  });
});
