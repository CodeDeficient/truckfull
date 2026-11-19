import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ManualSyncStatus } from '@/app/owner-dashboard/_components/AutomaticUpdatesClient';

describe('ManualSyncStatus', () => {
  it('stays hidden until Sync Now completes', () => {
    const { container } = render(<ManualSyncStatus currentTruckId="truck-1" sync={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the server timestamp in the browser local time', () => {
    const syncedAt = '2026-09-01T20:40:42.000Z';

    render(<ManualSyncStatus currentTruckId="truck-1" sync={{ truckId: 'truck-1', syncedAt }} />);

    expect(screen.getByText('Last manually synced')).toBeInTheDocument();
    expect(screen.getByText(new Date(syncedAt).toLocaleString('en-US'))).toBeInTheDocument();
  });

  it('stays hidden when a different truck completed the sync', () => {
    const { container } = render(
      <ManualSyncStatus
        currentTruckId="truck-2"
        sync={{ truckId: 'truck-1', syncedAt: '2026-09-01T20:40:42.000Z' }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
