import React from 'react';

export const Skeleton = ({ className }: any) => (
  <div className={`animate-pulse bg-muted ${className || ''}`} data-testid="Skeleton" />
);
