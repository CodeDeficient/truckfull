import { jest } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseTheme = jest.fn();

jest.unstable_mockModule('next-themes', () => ({
  useTheme: mockUseTheme,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ThemeProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('renders children within the provider', async () => {
    const { ThemeProvider } = await import('../../components/ThemeProvider');

    render(
      <ThemeProvider>
        <div data-testid="child">Test Child</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('useThemeSwitcher', () => {
  let useThemeSwitcher: () => ReturnType<typeof import('next-themes').useTheme>;
  let ThemeProvider: React.ComponentType<{ children: React.ReactNode }>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
      themes: ['light', 'dark', 'system'],
    });
    const nextThemes = await import('next-themes');
    const module = await import('../../components/ThemeProvider');
    useThemeSwitcher = module.useThemeSwitcher;
    ThemeProvider = nextThemes.ThemeProvider;
  });

  it('returns theme context when theme is set', () => {
    const TestComponent = () => {
      const context = useThemeSwitcher();
      return <div data-testid="theme">{context.theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('throws error when used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUseTheme.mockReturnValue(undefined);

    const TestComponent = () => {
      useThemeSwitcher();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow('useThemeSwitcher must be used within a ThemeProvider');
    consoleSpy.mockRestore();
  });
});