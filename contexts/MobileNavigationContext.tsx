'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

type MobileRoute = 'near-me' | 'discover' | 'featured' | 'orders' | 'favorites';

interface MobileNavigationContextType {
  currentRoute: MobileRoute;
  navigateTo: (route: MobileRoute) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

interface MobileNavigationProviderProps {
  children: ReactNode;
  initialRoute?: MobileRoute;
}

export const MobileNavigationProvider: React.FC<MobileNavigationProviderProps> = ({
  children,
  initialRoute = 'near-me',
}) => {
  const [currentRoute, setCurrentRoute] = useState<MobileRoute>(initialRoute);

  const navigateTo = useCallback((route: MobileRoute) => {
    setCurrentRoute(route);
  }, []);

  const contextValue = useMemo(() => ({ currentRoute, navigateTo }), [currentRoute, navigateTo]);

  return (
    <MobileNavigationContext.Provider value={contextValue}>
      {children}
    </MobileNavigationContext.Provider>
  );
};

export const useMobileNavigation = (): MobileNavigationContextType => {
  const context = useContext(MobileNavigationContext);
  if (context === undefined) {
    throw new Error('useMobileNavigation must be used within a MobileNavigationProvider');
  }
  return context;
};
