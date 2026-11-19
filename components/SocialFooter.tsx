'use client';

import { Facebook, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import { useRef, useState, useEffect } from 'react';

export function SocialFooterSpacer() {
  return <div className="h-9 shrink-0" aria-hidden />;
}

export function SocialFooter({ hidePricing }: { readonly hidePricing?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let ticking = false;
    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(checkScroll);
        ticking = true;
      }
    };

    checkScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-card border-t border-border/20 px-4 py-1.5 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 min-w-0">
          <button
            onClick={() => scroll('left')}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`shrink-0 p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div
            ref={scrollRef}
            className="flex items-center gap-x-3 overflow-x-auto scrollbar-hide whitespace-nowrap text-xs text-muted-foreground"
          >
            <span>© 2026 TruckFull</span>
            {!hidePricing && (
              <Link href="/pricing" className="hover:text-foreground hover:underline">
                Pricing
              </Link>
            )}
            <Link href="/features" className="hover:text-foreground hover:underline">
              Features
            </Link>
            <Link href="/for-owners" className="hover:text-foreground hover:underline">
              For Owners
            </Link>
            <Link href="/events" className="hover:text-foreground hover:underline">
              Events
            </Link>
            <Link
              href="/food-truck-event-research"
              className="hover:text-foreground hover:underline"
            >
              Event Research
            </Link>
            <Link href="/" className="hover:text-foreground hover:underline">
              Live Map
            </Link>
            <Link href="/trucks" className="hover:text-foreground hover:underline">
              Food Trucks by City
            </Link>
            <Link href="/food-truck-traffic-data" className="hover:text-foreground hover:underline">
              Traffic
            </Link>
            <Link href="/about" className="hover:text-foreground hover:underline">
              About
            </Link>
            <Link href="/contact" className="hover:text-foreground hover:underline">
              Contact
            </Link>
            <Link href="/partnerships" className="hover:text-foreground hover:underline">
              Partnerships
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
            <Link href="/takedown" className="hover:text-foreground hover:underline">
              Takedown
            </Link>
          </div>
          <button
            onClick={() => scroll('right')}
            tabIndex={canScrollRight ? 0 : -1}
            className={`shrink-0 p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <a
          href="https://www.facebook.com/TruckFull.food/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow TruckFull on Facebook"
          className="flex shrink-0 items-center text-blue-600 dark:text-blue-500 hover:opacity-80 transition-opacity"
        >
          <Facebook className="h-4 w-4 fill-current" />
        </a>
      </div>
    </div>
  );
}
