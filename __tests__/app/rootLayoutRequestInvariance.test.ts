import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('root layout request invariance', () => {
  it('does not read request headers in the root layout', () => {
    const source = readSource('app/layout.tsx');

    expect(source).not.toMatch(/from ['"]next\/headers['"]/);
    expect(source).not.toMatch(/await headers\(\)/);
  });

  it('does not set a canonical in the root layout (would leak to non-homepage routes)', () => {
    const source = readSource('app/layout.tsx');

    expect(source).not.toContain('alternates');
  });

  it('sets the homepage canonical on the homepage page segment only', () => {
    const source = readSource('app/page.tsx');

    expect(source).toContain("canonical: 'https://www.truckfull.food/'");
  });

  it('uses the mobile slot as the request-invariant initial representation', () => {
    const source = readSource('app/layout.tsx');

    expect(source).toContain('hasMobileSlot={shouldRenderMobileSlot(null, true, mobile)}');
  });

  it('makes browser device detection authoritative after hydration', () => {
    const source = readSource('app/ClientLayoutWrapper.tsx');

    expect(source).toContain('useState(false)');
    expect(source).toContain('useState(hasMobileSlot)');
    expect(source).toContain('useRef(pathname)');
    expect(source).toContain('useRef(true)');
    expect(source).toContain('useSyncExternalStore(');
    expect(source).toContain('useLayoutEffect(() =>');
    expect(source).toContain('navigator.userAgent');
    expect(source).toMatch(/Mobi\|Android\|iPhone\|iPad\|iPod/);
    expect(source).toMatch(/Googlebot/i);
    expect(source).toContain('shouldUseMobileSlotForPath(pathname)');
    expect(source).toContain('shouldRenderMobileSlot(pathname, true, mobile)');
    expect(source).toContain('wasEventDetail && isEventIndex');
    expect(source).toMatch(/clientIsMobileDevice\s*&&\s*clientHasMobileSlot/);
  });

  it('keeps the home page useful on desktop when JavaScript is unavailable', () => {
    const desktopSource = readSource('app/page.tsx');
    const layoutSource = readSource('app/layout.tsx');
    const mobileSource = readSource('app/@mobile/MobileHome.tsx');

    expect(desktopSource).toContain('<HomeNoScriptContent />');
    expect(mobileSource).toContain('<HomeNoScriptContent />');
    expect(mobileSource).toMatch(/const isClient = useIsClient\(\);[\s\S]*\{isClient \? \(/);
    expect(layoutSource).toContain(
      '#instant-skeleton,.mobile-client-experience{display:none}',
    );
  });
});
