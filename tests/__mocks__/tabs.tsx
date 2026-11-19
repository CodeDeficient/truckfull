import React, { useState, createContext, useContext } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ value: '' });

export const Tabs = ({ children, onValueChange, value, ...props }: any) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div data-testid="Tabs" data-value={value} {...props}>
      {children}
    </div>
  </TabsContext.Provider>
);
export const TabsList = ({ children, ...props }: any) => (
  <div data-testid="TabsList" {...props}>
    {children}
  </div>
);
export const TabsTrigger = ({ children, value, ...props }: any) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  return (
    <button
      data-testid="TabsTrigger"
      data-value={value}
      data-state={activeValue === value ? 'active' : 'inactive'}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};
export const TabsContent = ({ children, value, ...props }: any) => {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;
  return (
    <div data-testid="TabsContent" data-value={value} {...props}>
      {children}
    </div>
  );
};
