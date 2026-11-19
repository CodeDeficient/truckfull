import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Serwist worker source', () => {
  const source = readFileSync(join(process.cwd(), 'app', 'sw.ts'), 'utf8');

  it('uses explicit cache rules instead of defaultCache', () => {
    expect(source).not.toContain('defaultCache');
  });

  it('uses dedicated caches for next/image and Mapbox static assets', () => {
    expect(source).toContain('truckfull-next-image-v1');
    expect(source).toContain('truckfull-mapbox-static-v1');
  });

  it('attaches Serwist lifecycle event listeners', () => {
    expect(source).toContain('.addEventListeners()');
  });

  it('does not load Firebase in the worker', () => {
    expect(source).not.toContain('firebase');
  });
});

describe('Serwist registration component source', () => {
  const source = readFileSync(join(process.cwd(), 'components', 'SerwistRegistration.tsx'), 'utf8');

  it('preserves SerwistProvider', () => {
    expect(source).toContain('SerwistProvider');
  });

  it('defers registration to the controller', () => {
    expect(source).toContain('register={false}');
    expect(source).toContain('.register()');
    expect(source).toContain('.catch(');
  });

  it('handles expected registration errors gracefully', () => {
    expect(source).toContain('serviceworkercontainer\\.register');
    expect(source).toContain('securityerror');
  });
});
