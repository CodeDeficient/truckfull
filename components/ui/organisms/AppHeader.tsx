/* eslint-disable jsx-a11y/no-autofocus -- Intentional: autoFocus improves UX when user toggles search */
import Image from 'next/image';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Link from '@/components/navigation/IntentLink';
import type { User } from '@supabase/supabase-js';
import { AvatarMenu } from '@/components/auth';
import { flickerVariants } from '@/lib/animations/flickerAnimation';

interface MobileHeaderProps {
  title?: string;
  showAvatarButton?: boolean;
  onAvatarClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
  backButtonHref?: string;
  className?: string;
  isAuthenticated?: boolean;
  loadingAuth?: boolean;
  user?: User | null;
  onSearchChange?: (query: string) => void;
  onHomeClick?: () => void; // Navigate to home/near-me view
  showSearchButton?: boolean;
}

const AppHeader: React.FC<MobileHeaderProps> = ({
  title = 'TruckFull',
  showAvatarButton = true,
  onAvatarClick,
  onBackClick,
  showBackButton = false,
  backButtonHref = '/',
  className = '',
  isAuthenticated,
  loadingAuth,
  user,
  onSearchChange,
  onHomeClick,
  showSearchButton = true,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleBackClick = useCallback(() => {
    if (onBackClick) {
      onBackClick();
    }
  }, [onBackClick]);

  const controls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      await controls.start('flicker');
      await controls.start('steady');
    };
    sequence();
  }, [controls]);

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-[10001] h-[56px] flex items-center px-1 bg-black/70 backdrop-blur-md ${className}`}
      role="banner"
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-center w-full">
        <div className="w-1/4 flex items-center">
          {showBackButton ? (
            <Link
              href={backButtonHref}
              onClick={handleBackClick}
              className="text-white flex items-center h-16 min-h-[48px] min-w-[48px] justify-center"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </Link>
          ) : (
            <button
              onClick={onHomeClick}
              className="bg-transparent border-none p-0 cursor-pointer h-16 w-16 flex items-center justify-center"
              aria-label="Go to home"
            >
              <Image
                src="/truckfull-icon-transparent.webp"
                alt="TruckFull Logo"
                width={92}
                height={64}
                className="h-16 object-contain w-auto"
                sizes="92px"
              />
            </button>
          )}
        </div>

        <div className="w-1/2 text-center flex items-center justify-center">
          {showSearch ? (
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                className="bg-gray-800 text-white rounded-md px-2 py-1 pr-8 w-full"
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Prevent form submission when Enter is pressed in the search field
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                autoFocus
              />
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchValue('');
                    onSearchChange?.('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onHomeClick}
              className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-2"
              aria-label="Go to home"
            >
              <motion.h1
                className="font-lobster text-white text-3xl font-bold text-center neon-glow glow-red"
                aria-label={`${title} page header`}
                variants={flickerVariants}
                initial="flicker"
                animate={controls}
              >
                {title}
              </motion.h1>
            </button>
          )}
        </div>

        <div className="w-1/4 flex items-center justify-end">
          {showSearchButton && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="inline-flex items-center justify-center text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white bg-transparent border-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-search size-6"
                aria-hidden="true"
              >
                <path d="m21 21-4.34-4.34"></path>
                <circle cx="11" cy="11" r="8"></circle>
              </svg>
            </button>
          )}
          {loadingAuth ? (
            <div className="h-16 w-12 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <>
              {isAuthenticated ? (
                <div className="h-16 w-12 flex items-center justify-center">
                  <AvatarMenu mounted={true} user={user ?? undefined} />
                </div>
              ) : (
                showAvatarButton && (
                  <button
                    onClick={onAvatarClick}
                    className="text-[#f87171] bg-transparent border-none transition-all duration-200 flex items-center justify-center text-sm font-semibold px-1 whitespace-nowrap"
                    aria-label="Sign In"
                  >
                    Sign In
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(AppHeader);
