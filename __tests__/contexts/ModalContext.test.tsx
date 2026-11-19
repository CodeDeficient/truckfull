import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

import { ModalContext } from '@/contexts/ModalContext';

const TestConsumer = () => {
  const { isOpen, type, props, id, openModal, closeModal, resetModal } = React.useContext(ModalContext);
  return React.createElement(
    'div',
    { 'data-testid': 'consumer' },
    React.createElement('span', { 'data-testid': 'is-open' }, String(isOpen)),
    React.createElement('span', { 'data-testid': 'modal-type' }, String(type)),
    React.createElement('span', { 'data-testid': 'modal-id' }, String(id)),
    React.createElement(
      'button',
      {
        'data-testid': 'open-settings',
        onClick: () => openModal('settings'),
      },
      'Open Settings',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'open-with-props',
        onClick: () => openModal('generic', { title: 'Test Title', description: 'Test Desc' }),
      },
      'Open With Props',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'open-with-id',
        onClick: () => openModal('confirmation', {}, 'modal-123'),
      },
      'Open With ID',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'close-btn',
        onClick: () => closeModal(),
      },
      'Close',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'close-with-id',
        onClick: () => closeModal('modal-123'),
      },
      'Close With ID',
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'reset-btn',
        onClick: () => resetModal(),
      },
      'Reset',
    ),
  );
};

import { ModalProvider } from '@/contexts/ModalContext';

describe('ModalContext', () => {
  describe('ModalProvider', () => {
    it('provides initial closed state', () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-type')).toHaveTextContent('null');
      expect(screen.getByTestId('modal-id')).toHaveTextContent('undefined');
    });

    it('opens modal with type', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-settings'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      expect(screen.getByTestId('modal-type')).toHaveTextContent('settings');
    });

    it('opens modal with props', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-with-props'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      expect(screen.getByTestId('modal-type')).toHaveTextContent('generic');
    });

    it('opens modal with id', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-with-id'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      expect(screen.getByTestId('modal-type')).toHaveTextContent('confirmation');
      expect(screen.getByTestId('modal-id')).toHaveTextContent('modal-123');
    });

    it('closes modal without id', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('close-btn'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });

    it('closes modal with matching id only', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-with-id'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('close-with-id'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });

    it('does not close modal when id does not match', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-with-id'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('close-btn'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });

    it('resets modal state', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-with-id'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('reset-btn'));

      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-type')).toHaveTextContent('null');
    });
  });

  describe('useModal (via useContext)', () => {
    it('returns undefined when used outside provider', () => {
      const BadConsumer = () => {
        const context = React.useContext(ModalContext);
        return React.createElement('div', { 'data-testid': 'context-value' }, String(context));
      };

      render(React.createElement(BadConsumer));
      expect(screen.getByTestId('context-value')).toHaveTextContent('undefined');
    });
  });

  describe('state transitions', () => {
    it('handles open-close-open sequence', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('close-btn'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('open-with-id'));
      expect(screen.getByTestId('is-open')).toHaveTextContent('true');
      expect(screen.getByTestId('modal-id')).toHaveTextContent('modal-123');
    });

    it('replaces modal when opening new one', async () => {
      render(React.createElement(ModalProvider, null, React.createElement(TestConsumer)));

      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.getByTestId('modal-type')).toHaveTextContent('settings');

      fireEvent.click(screen.getByTestId('open-with-props'));
      expect(screen.getByTestId('modal-type')).toHaveTextContent('generic');
    });
  });
});