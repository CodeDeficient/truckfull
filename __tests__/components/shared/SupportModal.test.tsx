import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

describe('SupportModal', () => {
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalClipboard = { ...navigator.clipboard };
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('renders modal when isOpen is true', async () => {
    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={true} onClose={jest.fn()} />
    );

    expect(screen.getByText('Need Help?')).toBeInTheDocument();
    expect(screen.getByText(/Have a question or running into an issue/)).toBeInTheDocument();
    expect(screen.getByText('Open Email Client')).toBeInTheDocument();
    expect(screen.getByText('Copy Email Address')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', async () => {
    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={false} onClose={jest.fn()} />
    );

    expect(screen.queryByText('Need Help?')).not.toBeInTheDocument();
  });

  it('displays custom subject in email link', async () => {
    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={true} onClose={jest.fn()} subject="Custom Subject" />
    );

    const emailLink = screen.getByRole('link', { name: /open email client/i });
    expect(emailLink.getAttribute('href')).toContain('subject=Custom%20Subject');
  });

  it('displays default subject when not provided', async () => {
    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={true} onClose={jest.fn()} />
    );

    const emailLink = screen.getByRole('link', { name: /open email client/i });
    expect(emailLink.getAttribute('href')).toContain('subject=Support%20Request');
  });

  it('shows copied state when clipboard write succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={true} onClose={jest.fn()} />
    );

    const copyButton = screen.getByRole('button', { name: /copy email address/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('falls back to textarea when clipboard write fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard API not available')),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'execCommand', {
      value: jest.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });

    const { SupportModal } = await import('../../../components/shared/SupportModal');

    render(
      <SupportModal isOpen={true} onClose={jest.fn()} />
    );

    const copyButton = screen.getByRole('button', { name: /copy email address/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });
});

describe('useSupportModal hook', () => {
  it('returns correct initial state', async () => {
    const { useSupportModal } = await import('../../../components/shared/SupportModal');

    const TestComponent = () => {
      const hook = useSupportModal();
      return (
        <div>
          <span data-testid="isOpen">{String(hook.isOpen)}</span>
          <span data-testid="subject">{hook.subject}</span>
          <button onClick={() => hook.open('Custom Subject')}>Open</button>
          <button onClick={() => hook.close()}>Close</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('subject')).toHaveTextContent('Support Request');
  });

  it('opens modal with custom subject', async () => {
    const { useSupportModal } = await import('../../../components/shared/SupportModal');

    const TestComponent = () => {
      const hook = useSupportModal();
      return (
        <div>
          <span data-testid="isOpen">{String(hook.isOpen)}</span>
          <span data-testid="subject">{hook.subject}</span>
          <button onClick={() => hook.open('Custom Subject')}>Open</button>
          <button onClick={() => hook.close()}>Close</button>
        </div>
      );
    };

    render(<TestComponent />);

    await act(async () => {
      screen.getByRole('button', { name: 'Open' }).click();
    });

    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('subject')).toHaveTextContent('Custom Subject');
  });

  it('closes modal and resets subject', async () => {
    const { useSupportModal } = await import('../../../components/shared/SupportModal');

    const TestComponent = () => {
      const hook = useSupportModal();
      return (
        <div>
          <span data-testid="isOpen">{String(hook.isOpen)}</span>
          <span data-testid="subject">{hook.subject}</span>
          <button onClick={() => hook.open('Custom Subject')}>Open</button>
          <button onClick={() => hook.close()}>Close</button>
        </div>
      );
    };

    render(<TestComponent />);

    await act(async () => {
      screen.getByRole('button', { name: 'Open' }).click();
    });

    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('subject')).toHaveTextContent('Custom Subject');

    await act(async () => {
      screen.getByRole('button', { name: 'Close' }).click();
    });

    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('subject')).toHaveTextContent('Support Request');
  });
});