import { ImageResponse } from 'next/og';
import { getTruckCount } from '@/lib/seo/getTruckCount';

export async function GET() {
  let rounded: number | null = null;
  try {
    const result = await getTruckCount();
    rounded = result ? result.rounded : null;
  } catch {
    rounded = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: '#f97316',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900 }}>TruckFull</div>
        <div style={{ fontSize: 36, marginTop: 20, opacity: 0.9 }}>
          {rounded === null
            ? 'Food Trucks & Caterers in Georgia & South Carolina'
            : `${rounded}+ Food Trucks & Caterers in Georgia & South Carolina`}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
