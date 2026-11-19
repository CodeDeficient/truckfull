/**
 * Pure function tests for lib/realtime/createEventSourceConnection.ts
 */

import { describe, it, expect } from '@jest/globals';
import type { RefObject } from 'react';
import { shouldPreventConnection } from '@/lib/realtime/createEventSourceConnection';

describe('createEventSourceConnection', () => {
  describe('shouldPreventConnection (pure function)', () => {
    it('returns true when eventSourceRef has a current connection', () => {
      const mockEventSource = {} as EventSource;
      const result = shouldPreventConnection(
        { current: mockEventSource } as RefObject<EventSource>,
        false,
      );
      expect(result).toBe(true);
    });

    it('returns true when isConnecting is true', () => {
      const result = shouldPreventConnection(
        { current: undefined } as RefObject<EventSource>,
        true,
      );
      expect(result).toBe(true);
    });

    it('returns false when no connection exists and not connecting', () => {
      const result = shouldPreventConnection(
        { current: undefined } as RefObject<EventSource>,
        false,
      );
      expect(result).toBe(false);
    });

    it('returns true when both conditions are met', () => {
      const mockEventSource = {} as EventSource;
      const result = shouldPreventConnection(
        { current: mockEventSource } as RefObject<EventSource>,
        true,
      );
      expect(result).toBe(true);
    });
  });
});