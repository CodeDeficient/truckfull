/**
 * @jest-environment jsdom
 */

import React from 'react';
import { isEmptyDefault } from '@/lib/utils/isEmptyDefault';

describe('isEmptyDefault', () => {
  it('returns true for null', () => {
    expect(isEmptyDefault(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isEmptyDefault(undefined)).toBe(true);
  });

  it('returns true for a plain string', () => {
    expect(isEmptyDefault('hello')).toBe(true);
  });

  it('returns true for a number', () => {
    expect(isEmptyDefault(42)).toBe(true);
  });

  it('returns false for a DOM element type (not a function component)', () => {
    expect(isEmptyDefault(React.createElement('div'))).toBe(false);
  });

  it('returns false for a function component without MobileDefault name', () => {
    function MyComponent() {
      return null;
    }
    expect(isEmptyDefault(React.createElement(MyComponent))).toBe(false);
  });

  it('returns true for the MobileDefault component (matching displayName)', () => {
    function MobileDefault() {
      return null;
    }
    MobileDefault.displayName = 'MobileDefault';
    expect(isEmptyDefault(React.createElement(MobileDefault))).toBe(true);
  });

  it('returns true for a component whose name property is MobileDefault', () => {
    function MobileDefault() {
      return null;
    }
    expect(isEmptyDefault(React.createElement(MobileDefault))).toBe(true);
  });

  it('returns true when MobileDefault is wrapped in MobileLayout', () => {
    function MobileDefault() {
      return null;
    }
    MobileDefault.displayName = 'MobileDefault';

    function MobileLayout({ children }: { readonly children: React.ReactNode }) {
      return React.createElement('div', { className: 'mobile-layout' },
        React.createElement('main', { className: 'mobile-main' }, children),
      );
    }

    const wrapped = React.createElement(MobileLayout, null,
      React.createElement(MobileDefault),
    );

    expect(isEmptyDefault(wrapped)).toBe(true);
  });
});
