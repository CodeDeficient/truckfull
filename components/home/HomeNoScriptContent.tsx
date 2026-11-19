import Link from '@/components/navigation/IntentLink';
import type { ReactElement } from 'react';

interface HomeNoScriptContentProps {
  readonly className?: string;
}

export function HomeNoScriptContent({ className }: HomeNoScriptContentProps): ReactElement {
  return (
    <noscript>
      <div className={className} style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
        <h2>Food Trucks Near You - TruckFull</h2>
        <p>
          Find food trucks in Augusta GA and the CSRA area. Browse by city or cuisine, see live
          locations on the map, and check menus and vending opportunities.
        </p>
        <h3>Popular Cities</h3>
        <ul>
          <li>
            <Link href="/city/augusta-ga">Food Trucks in Augusta GA</Link>
          </li>
          <li>
            <Link href="/city/charleston-sc">Food Trucks in Charleston SC</Link>
          </li>
          <li>
            <Link href="/city/aiken-sc">Food Trucks in Aiken SC</Link>
          </li>
          <li>
            <Link href="/city/evans-ga">Food Trucks in Evans GA</Link>
          </li>
          <li>
            <Link href="/city/north-augusta-sc">Food Trucks in North Augusta SC</Link>
          </li>
        </ul>
        <h3>Events</h3>
        <p>
          Food Truck Friday, FoodeesFest, and more local food truck events across the CSRA.
        </p>
        <h3>For Truck Owners</h3>
        <p>
          Free food truck profile management, event discovery, and customer tools. Paid features
          for advanced business growth.
        </p>
      </div>
    </noscript>
  );
}
