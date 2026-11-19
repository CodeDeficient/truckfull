import { describe, it, expect } from '@jest/globals';
import { cva } from '../../lib/cva';

describe('cva', () => {
  it('should be a function', () => {
    expect(typeof cva).toBe('function');
  });

  it('should create a variant function', () => {
    const testVariant = cva('base-class', {
      variants: {
        size: {
          sm: 'size-sm',
          md: 'size-md',
          lg: 'size-lg',
        },
      },
    });
    expect(typeof testVariant).toBe('function');
  });

  it('should apply base class', () => {
    const testVariant = cva('base-class', {
      variants: {
        size: {
          sm: 'size-sm',
          md: 'size-md',
        },
      },
    });
    const result = testVariant();
    expect(result).toBe('base-class');
  });

  it('should apply variant class', () => {
    const testVariant = cva('base-class', {
      variants: {
        size: {
          sm: 'size-sm',
          md: 'size-md',
        },
      },
    });
    const result = testVariant({ size: 'sm' });
    expect(result).toBe('base-class size-sm');
  });

  it('should apply compound variant', () => {
    const testVariant = cva('base-class', {
      variants: {
        size: {
          sm: 'size-sm',
          md: 'size-md',
        },
        color: {
          blue: 'color-blue',
          red: 'color-red',
        },
      },
      compoundVariants: [
        {
          size: 'sm',
          color: 'blue',
          class: 'compound-sm-blue',
        },
      ],
    });
    const result = testVariant({ size: 'sm', color: 'blue' });
    expect(result).toBe('base-class size-sm color-blue compound-sm-blue');
  });

  it('should handle default variants', () => {
    const testVariant = cva('base-class', {
      variants: {
        size: {
          sm: 'size-sm',
          md: 'size-md',
        },
      },
      defaultVariants: {
        size: 'md',
      },
    });
    const result = testVariant({});
    expect(result).toBe('base-class size-md');
  });
});