import React from 'react';

export const ClaimTruckModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
  isOpen ? <div data-testid="claim-modal">Claim Modal</div> : null;
