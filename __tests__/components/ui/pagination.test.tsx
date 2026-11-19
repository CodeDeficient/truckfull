import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

describe('pagination', () => {
  describe('Pagination', () => {
    it('renders without crashing', () => {
      render(<Pagination data-testid="pagination">Pagination</Pagination>);
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });
  });

  describe('PaginationContent', () => {
    it('renders without crashing', () => {
      render(<PaginationContent data-testid="content">Content</PaginationContent>);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('PaginationItem', () => {
    it('renders without crashing', () => {
      render(<PaginationItem data-testid="item">Item</PaginationItem>);
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('PaginationLink', () => {
    it('renders without crashing', () => {
      render(
        <PaginationLink data-testid="link" href="/page/1">
          1
        </PaginationLink>,
      );
      expect(screen.getByTestId('link')).toBeInTheDocument();
    });
  });

  describe('PaginationPrevious', () => {
    it('renders without crashing', () => {
      render(<PaginationPrevious data-testid="prev" href="/page/0" />);
      expect(screen.getByTestId('prev')).toBeInTheDocument();
    });
  });

  describe('PaginationNext', () => {
    it('renders without crashing', () => {
      render(<PaginationNext data-testid="next" href="/page/2" />);
      expect(screen.getByTestId('next')).toBeInTheDocument();
    });
  });

  describe('PaginationEllipsis', () => {
    it('renders without crashing', () => {
      render(<PaginationEllipsis data-testid="ellipsis" />);
      expect(screen.getByTestId('ellipsis')).toBeInTheDocument();
    });
  });
});
