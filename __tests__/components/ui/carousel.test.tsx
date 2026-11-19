import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { jest } from '@jest/globals';

jest.unstable_mockModule('embla-carousel-react', () => ({
  __esModule: true,
  default: jest.fn(() => [
    { current: null },
    {
      canScrollPrev: jest.fn(() => false),
      canScrollNext: jest.fn(() => true),
      scrollPrev: jest.fn(),
      scrollNext: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      reInit: jest.fn(),
    },
  ]),
}));

const { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } = await import(
  '@/components/ui/carousel'
);

describe('carousel', () => {
  describe('Carousel', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(Carousel, { 'data-testid': 'carousel' }, React.createElement('div', null, 'Carousel Content')),
      );
      expect(screen.getByTestId('carousel')).toBeInTheDocument();
    });
  });

  describe('CarouselContent', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          Carousel,
          null,
          React.createElement(
            CarouselContent,
            { 'data-testid': 'content' },
            React.createElement(CarouselItem, null, 'Slide 1'),
          ),
        ),
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('CarouselItem', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          Carousel,
          null,
          React.createElement(
            CarouselContent,
            null,
            React.createElement(CarouselItem, { 'data-testid': 'item' }, 'Slide 1'),
          ),
        ),
      );
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('CarouselPrevious', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          Carousel,
          null,
          React.createElement(CarouselPrevious, { 'data-testid': 'prev' }, 'Previous'),
        ),
      );
      expect(screen.getByTestId('prev')).toBeInTheDocument();
    });
  });

  describe('CarouselNext', () => {
    it('renders without crashing', () => {
      render(
        React.createElement(
          Carousel,
          null,
          React.createElement(CarouselNext, { 'data-testid': 'next' }, 'Next'),
        ),
      );
      expect(screen.getByTestId('next')).toBeInTheDocument();
    });
  });
});
