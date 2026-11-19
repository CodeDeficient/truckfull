import { jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Define mocks before imports
jest.unstable_mockModule('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('ModeToggle Component', () => {
  let ModeToggle: any;
  let useTheme: any;
  let mockSetTheme: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import dynamically after mocks
    const nextThemes = await import('next-themes');
    useTheme = nextThemes.useTheme;

    mockSetTheme = jest.fn();
    (useTheme as jest.Mock).mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'light',
    });

    const module = await import('@/components/ModeToggle');
    ModeToggle = module.ModeToggle;
  });

  it('renders the toggle button with visually hidden text', () => {
    render(<ModeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown menu and displays options on click', async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /light/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /dark/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /system/i })).toBeInTheDocument();
    });
  });

  it('calls setTheme with "light" when Light option is clicked', async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    const lightOption = await screen.findByRole('menuitem', { name: /light/i });
    await user.click(lightOption);

    expect(mockSetTheme).toHaveBeenCalledTimes(1);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with "dark" when Dark option is clicked', async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    const darkOption = await screen.findByRole('menuitem', { name: /dark/i });
    await user.click(darkOption);

    expect(mockSetTheme).toHaveBeenCalledTimes(1);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with "system" when System option is clicked', async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    const systemOption = await screen.findByRole('menuitem', { name: /system/i });
    await user.click(systemOption);

    expect(mockSetTheme).toHaveBeenCalledTimes(1);
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
