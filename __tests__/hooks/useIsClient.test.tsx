/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

import { useIsClient } from '../../hooks/useIsClient';

describe('useIsClient', () => {
  it('should initially return false and then true after mount', () => {
    let renders = 0;
    let isClientValues: boolean[] = [];

    const TestComponent = () => {
      renders++;
      const isClient = useIsClient();
      isClientValues.push(isClient);

      return <div data-testid="is-client">{isClient.toString()}</div>;
    };

    const { getByTestId } = render(<TestComponent />);

    // Since effects run synchronously in the testing environment (React 18 default act),
    // the component renders twice:
    // 1st render: false (initial state)
    // 2nd render: true (after effect runs and state updates)

    expect(renders).toBe(2);
    expect(isClientValues).toEqual([false, true]);
    expect(getByTestId('is-client').textContent).toBe('true');
  });
});
