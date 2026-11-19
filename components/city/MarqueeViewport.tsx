'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';

export function MarqueeViewport({ children }: { readonly children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-marquee-paused={visible ? undefined : ''}
      className="absolute inset-0 overflow-hidden [perspective:1200px]"
    >
      {children}
    </div>
  );
}
