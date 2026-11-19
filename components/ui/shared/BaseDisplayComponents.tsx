import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Shared Loading Content component
interface LoadingContentProps {
  message?: string;
}

export const LoadingContent = ({ message = 'Loading...' }: LoadingContentProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea2a2a] mb-4"></div>
    <p className="text-white">{message}</p>
  </div>
);

// Shared Error Content component
interface ErrorContentProps {
  error: string | null;
  onRetry: () => Promise<void>;
  retryMessage?: string;
}

export const ErrorContent = ({ error, onRetry, retryMessage = 'Retry' }: ErrorContentProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-red-500 text-lg mb-4">Error: {error}</div>
    <Button
      onClick={() => {
        void onRetry();
      }}
      className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full"
    >
      {retryMessage}
    </Button>
  </div>
);

// Shared Empty Content component
interface EmptyContentProps {
  onDiscoverTrucks?: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export const EmptyContent = ({ onDiscoverTrucks, title, message, icon }: EmptyContentProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon ?? <Heart className="w-16 h-16 text-gray-600 mb-4" />}
    <h3 className="text-white text-xl font-bold mb-2">No {title} Yet</h3>
    <p className="text-gray-400 mb-6">{message}</p>
    <Button
      className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2"
      onClick={() => {
        if (onDiscoverTrucks) {
          onDiscoverTrucks();
        } else {
          globalThis.location.href = '/@mobile';
        }
      }}
    >
      <Plus className="w-4 h-4" />
      Discover Food Trucks
    </Button>
  </div>
);

// Shared Auth Required Content component
interface AuthRequiredContentProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  onAuthClick?: () => void;
}

export const AuthRequiredContent = ({
  title,
  message,
  icon,
  onAuthClick,
}: AuthRequiredContentProps) => (
  <div className="flex-grow flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-4">
      {icon ?? <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
      <h3 className="text-white text-xl font-bold mb-2">Sign In Required</h3>
      <p className="text-gray-400 mb-6">{message}</p>
      <Button
        className="bg-[#ea2a2a] hover:bg-[#ea2a2a]/90 text-white px-6 py-3 rounded-full font-medium"
        onClick={() => {
          if (onAuthClick) {
            onAuthClick();
          } else {
            globalThis.location.href = '/@mobile?showAuth=true';
          }
        }}
      >
        Sign In to View {title}
      </Button>
    </div>
  </div>
);

// Type aliases for shared component props
export type LoadingContentType = LoadingContentProps;
export type ErrorContentType = ErrorContentProps;
export type EmptyContentType = EmptyContentProps;
export type AuthRequiredContentType = AuthRequiredContentProps;
