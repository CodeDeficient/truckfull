/**
 * ScoreBreakdownBar Component Tests
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { ScoreBreakdownBar } from '@/components/ui/ScoreBreakdownBar';

describe('ScoreBreakdownBar', () => {
  describe('Renders label and score correctly', () => {
    it('should display label and score', () => {
      render(<ScoreBreakdownBar label="Traffic" score={16} maxScore={25} />);
      expect(screen.getByText('Traffic')).toBeInTheDocument();
      expect(screen.getByText('16/25')).toBeInTheDocument();
    });

    it('should display zero score correctly', () => {
      render(<ScoreBreakdownBar label="Vetting" score={0} maxScore={25} />);
      expect(screen.getByText('0/25')).toBeInTheDocument();
    });

    it('should display max score correctly', () => {
      render(<ScoreBreakdownBar label="Foot Traffic" score={25} maxScore={25} />);
      expect(screen.getByText('25/25')).toBeInTheDocument();
    });
  });

  describe('Color transitions based on score percentage', () => {
    it('should show green for scores >= 80%', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={20} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-green"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show green for exactly 80%', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={20} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-green"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show yellow for scores >= 40% and < 80%', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={12} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-yellow"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show yellow for exactly 40%', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={10} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-yellow"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show gray for scores < 40%', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={8} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-gray"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show gray for zero score', () => {
      const { container } = render(<ScoreBreakdownBar label="Traffic" score={0} maxScore={25} />);
      const progressBar = container.querySelector('[class*="bg-gray"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle score of zero', () => {
      const { container } = render(<ScoreBreakdownBar label="Empty" score={0} maxScore={25} />);
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('0/25')).toBeInTheDocument();
    });

    it('should handle score equal to maxScore', () => {
      const { container } = render(<ScoreBreakdownBar label="Full" score={25} maxScore={25} />);
      expect(screen.getByText('25/25')).toBeInTheDocument();
      const progressBar = container.querySelector('[class*="bg-green"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should handle small maxScore values', () => {
      render(<ScoreBreakdownBar label="Small" score={3} maxScore={5} />);
      expect(screen.getByText('3/5')).toBeInTheDocument();
    });
  });

  describe('Custom color override', () => {
    it('should respect provided color prop', () => {
      const { container } = render(
        <ScoreBreakdownBar label="Custom" score={10} maxScore={25} color="green" />
      );
      const progressBar = container.querySelector('[class*="bg-green"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should respect yellow color prop', () => {
      const { container } = render(
        <ScoreBreakdownBar label="Custom" score={20} maxScore={25} color="yellow" />
      );
      const progressBar = container.querySelector('[class*="bg-yellow"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should respect gray color prop', () => {
      const { container } = render(
        <ScoreBreakdownBar label="Custom" score={24} maxScore={25} color="gray" />
      );
      const progressBar = container.querySelector('[class*="bg-gray"]');
      expect(progressBar).toBeInTheDocument();
    });
  });
});