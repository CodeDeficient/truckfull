import type { JSX, ReactNode } from 'react';

export function MobileShell({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <div className="mobile-layout min-h-screen">
      <main className="mobile-main">{children}</main>
    </div>
  );
}
