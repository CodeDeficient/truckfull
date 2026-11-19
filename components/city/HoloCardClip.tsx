'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canPlayOnHover(): boolean {
  return (
    globalThis.matchMedia(HOVER_QUERY).matches &&
    !globalThis.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function HoloCardClip({ src }: { readonly src: string }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const card = video?.closest('a');
    if (!video || !card || !canPlayOnHover()) return;
    const start = (): void => {
      video.play().catch(() => setVisible(false));
    };
    const stop = (): void => {
      setVisible(false);
      video.pause();
      video.currentTime = 0;
    };
    const show = (): void => setVisible(true);
    card.addEventListener('mouseenter', start);
    card.addEventListener('focus', start);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('blur', stop);
    video.addEventListener('playing', show);
    return () => {
      card.removeEventListener('mouseenter', start);
      card.removeEventListener('focus', start);
      card.removeEventListener('mouseleave', stop);
      card.removeEventListener('blur', stop);
      video.removeEventListener('playing', show);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      loop
      playsInline
      preload="none"
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <source src={src} type="video/webm" />
    </video>
  );
}
