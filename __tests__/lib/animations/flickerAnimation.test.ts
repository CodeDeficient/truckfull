import { describe, it, expect } from '@jest/globals';
import { flickerVariants } from '../../../lib/animations/flickerAnimation';

describe('flickerAnimation', () => {
  describe('flickerVariants', () => {
    it('should have flicker variant', () => {
      expect(flickerVariants.flicker).toBeDefined();
      expect(flickerVariants.flicker).toHaveProperty('opacity');
      expect(flickerVariants.flicker).toHaveProperty('transition');
    });

    it('should have steady variant', () => {
      expect(flickerVariants.steady).toBeDefined();
      expect(flickerVariants.steady).toHaveProperty('opacity');
      expect(flickerVariants.steady).toHaveProperty('transition');
    });

    it('flicker variant should have array opacity values', () => {
      expect(Array.isArray(flickerVariants.flicker.opacity)).toBe(true);
      expect(flickerVariants.flicker.opacity.length).toBeGreaterThan(0);
    });

    it('flicker variant should have correct transition duration', () => {
      expect(flickerVariants.flicker.transition.duration).toBe(2);
    });

    it('flicker variant should have easeInOut easing', () => {
      expect(flickerVariants.flicker.transition.ease).toBe('easeInOut');
    });

    it('steady variant should have opacity of 1', () => {
      expect(flickerVariants.steady.opacity).toBe(1);
    });

    it('steady variant should have correct transition duration', () => {
      expect(flickerVariants.steady.transition.duration).toBe(0.5);
    });

    it('flicker opacity array should contain expected pattern values', () => {
      const opacityArray = flickerVariants.flicker.opacity;
      expect(opacityArray).toContain(1);
      expect(opacityArray).toContain(0.3);
      expect(opacityArray).toContain(0.5);
    });
  });
});