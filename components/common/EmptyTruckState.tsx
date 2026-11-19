import React from 'react';

interface EmptyTruckStateProps {
  readonly message?: string;
  readonly subMessage?: string;
}

export const EmptyTruckState: React.FC<EmptyTruckStateProps> = ({
  message = 'No food trucks found in your area.',
  subMessage = 'Try expanding your search radius or check back later!',
}) => {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <p>{message}</p>
      <p className="text-sm mt-2">{subMessage}</p>
    </div>
  );
};
