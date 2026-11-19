import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SeoPageShell } from '../../../components/ui/organisms/SeoPageShell';

describe('SeoPageShell', () => {
  it('renders TruckFull logo image', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    const logo = screen.getByAltText('TruckFull Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders TruckFull brand name in header', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    expect(screen.getByText('TruckFull')).toBeInTheDocument();
  });

  it('links brand name to homepage', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    const homeLinks = screen.getAllByRole('link', { name: /truckfull/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute('href', '/');
  });

  it('renders children inside scrollable content area', () => {
    render(<SeoPageShell>Test child content</SeoPageShell>);
    expect(screen.getByText('Test child content')).toBeInTheDocument();
  });

  it('uses fixed positioning to escape body overflow hidden', () => {
    const { container } = render(<SeoPageShell>Content</SeoPageShell>);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('fixed');
    expect(outerDiv.className).toContain('inset-0');
  });

  it('header matches homepage AppHeader styling', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-black');
    expect(header.className).toContain('shadow-md');
  });

  it('content area is scrollable', () => {
    const { container } = render(<SeoPageShell>Content</SeoPageShell>);
    const outerDiv = container.firstChild as HTMLElement;
    const contentArea = outerDiv.querySelector('[class*="overflow-y-auto"]');
    expect(contentArea).not.toBeNull();
  });

  it('uses main landmark for content area', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('does not render a Beta badge', () => {
    render(<SeoPageShell>Content</SeoPageShell>);
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});