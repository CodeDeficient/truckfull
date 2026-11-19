import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server.node';
import { TruckMarquee, buildColumns } from '@/components/city/TruckMarquee';

const PHOTOS = Array.from({ length: 56 }, (_, i) => `/photos/truck-${String(i)}.jpg`);

describe('TruckMarquee', () => {
  it('leaves the photo tiles out of the server render', () => {
    const html = renderToString(<TruckMarquee photos={PHOTOS} />);
    expect(html).not.toContain('hub-sticker');
    expect(html).not.toContain('truck-0.jpg');
  });

  it('builds every looped tile in the browser', () => {
    const { container } = render(<TruckMarquee photos={PHOTOS} />);
    expect(container.querySelectorAll('.hub-marquee-col')).toHaveLength(14);
    expect(container.querySelectorAll('.hub-sticker')).toHaveLength(14 * 8 * 4);
  });

  it('spreads the photos across the columns without repeating early', () => {
    const columns = buildColumns(PHOTOS);
    expect(new Set(columns.flat()).size).toBe(56);
    expect(buildColumns([])).toEqual([]);
  });
});
