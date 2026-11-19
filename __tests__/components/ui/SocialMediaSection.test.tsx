import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { SocialMediaSection } = await import('@/components/ui/SocialMediaSection');

describe('SocialMediaSection', () => {
  describe('SocialMediaSection', () => {
    it('renders without crashing', () => {
      const { container } = render(
        React.createElement(SocialMediaSection, { socialMedia: {} }),
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('normalizeSocialMediaUrl', () => {
    it('handles username without @ prefix', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { instagram: 'testuser' } }));
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('handles username with @ prefix', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { instagram: '@testuser' } }));
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('handles full URL', () => {
      render(
        React.createElement(SocialMediaSection, {
          socialMedia: { instagram: 'https://instagram.com/testuser' },
        }),
      );
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('handles facebook username', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { facebook: 'testpage' } }));
      expect(screen.getByText('Facebook')).toBeInTheDocument();
    });

    it('handles twitter username', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { twitter: 'testhandle' } }));
      expect(screen.getByText('Twitter')).toBeInTheDocument();
    });
  });

  describe('handles showFallback', () => {
    it('shows fallback when no social media provided and showFallback is true', () => {
      render(
        React.createElement(SocialMediaSection, { socialMedia: {}, showFallback: true }),
      );
      expect(screen.getByText('No social media profiles available')).toBeInTheDocument();
    });

    it('does not show fallback when showFallback is false', () => {
      const { container } = render(
        React.createElement(SocialMediaSection, { socialMedia: {}, showFallback: false }),
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('handles empty string values', () => {
    it('treats empty string as no social media', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { instagram: '' } }));
      expect(screen.getByText('No social media profiles available')).toBeInTheDocument();
    });

    it('treats whitespace-only string as no social media', () => {
      render(React.createElement(SocialMediaSection, { socialMedia: { instagram: '   ' } }));
      expect(screen.getByText('No social media profiles available')).toBeInTheDocument();
    });
  });
});
