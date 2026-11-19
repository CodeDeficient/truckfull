import { createElement, type ReactNode } from 'react';
import {
  mobileSlotMatchesRoute,
  shouldRenderMobileSlot,
  shouldUseMobileSlotForPath,
} from '@/lib/utils/mobileSlotRouting';

describe('shouldUseMobileSlotForPath', () => {
  it('uses the mobile slot when the pathname is unavailable', () => {
    expect(shouldUseMobileSlotForPath(null)).toBe(true);
  });

  it('uses the mobile slot for regular app routes', () => {
    expect(shouldUseMobileSlotForPath('/')).toBe(true);
    expect(shouldUseMobileSlotForPath('/favorites')).toBe(true);
  });

  it('keeps blog pages on the primary responsive route instead of the mobile slot', () => {
    expect(shouldUseMobileSlotForPath('/blog')).toBe(false);
    expect(shouldUseMobileSlotForPath('/blog/how-to-book-food-trucks')).toBe(false);
  });

  it('does not block similarly named routes from using the mobile slot', () => {
    expect(shouldUseMobileSlotForPath('/blogger')).toBe(true);
    expect(shouldUseMobileSlotForPath('/blogs/archive')).toBe(true);
  });

  it('uses the mobile slot for event index and city routes', () => {
    expect(shouldUseMobileSlotForPath('/events')).toBe(true);
    expect(shouldUseMobileSlotForPath('/events/savannah-ga')).toBe(true);
  });

  it('keeps event detail on the shared primary route', () => {
    expect(shouldUseMobileSlotForPath('/events/savannah-ga/some-event-slug')).toBe(false);
    expect(shouldUseMobileSlotForPath('/events/savannah-ga/some-event-slug/')).toBe(false);
  });

  it('does not classify malformed or deeper event paths as event detail', () => {
    expect(shouldUseMobileSlotForPath('/events/savannah-ga')).toBe(true);
    expect(shouldUseMobileSlotForPath('/events/savannah-ga/')).toBe(true);
    expect(shouldUseMobileSlotForPath('/events/savannah-ga/some-event-slug/extra')).toBe(true);
    expect(shouldUseMobileSlotForPath('/events//some-event-slug')).toBe(true);
  });
});

describe('shouldRenderMobileSlot', () => {
  it('uses the current slot node instead of stale route-level availability', () => {
    function MobileDefault() {
      return null;
    }
    MobileDefault.displayName = 'MobileDefault';

    function MobileEventsPage() {
      return null;
    }

    expect(shouldRenderMobileSlot('/events', true, createElement(MobileDefault))).toBe(false);
    expect(shouldRenderMobileSlot('/events', true, createElement(MobileEventsPage))).toBe(true);
  });

  it('inspects serialized slot content at the server-client boundary', () => {
    expect(
      shouldRenderMobileSlot('/events', true, createElement('div', null, createElement('main'))),
    ).toBe(false);
    expect(
      shouldRenderMobileSlot(
        '/events',
        true,
        createElement(
          'div',
          null,
          createElement('main', null, createElement('div', null, 'Events')),
        ),
      ),
    ).toBe(true);
  });
});

describe('client-side mobile slot checks', () => {
  it('treats a lazy slot reference as renderable because the client cannot look inside it', () => {
    const lazySlot = { $$typeof: Symbol.for('react.lazy') } as unknown as ReactNode;
    expect(shouldRenderMobileSlot('/favorites', true, lazySlot)).toBe(true);
    expect(shouldRenderMobileSlot('/blog', true, lazySlot)).toBe(false);
  });

  it('matches the slot to the current route once route groups are ignored', () => {
    expect(mobileSlotMatchesRoute(['(__SLOT__)', '(mirror)', 'trucks'], ['trucks'])).toBe(true);
    expect(mobileSlotMatchesRoute(['(__SLOT__)', '(home)'], [])).toBe(true);
    expect(mobileSlotMatchesRoute(['(__SLOT__)', 'favorites'], ['favorites'])).toBe(true);
  });

  it('rejects a slot still showing the previous route after a soft navigation', () => {
    expect(mobileSlotMatchesRoute(['(__SLOT__)', '(mirror)', 'about'], ['admin'])).toBe(false);
    expect(mobileSlotMatchesRoute(['(__SLOT__)', '(home)'], ['trucks'])).toBe(false);
  });

  it('rejects the empty default slot', () => {
    expect(mobileSlotMatchesRoute(['__DEFAULT__'], ['admin'])).toBe(false);
  });
});
