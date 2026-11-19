'use client';

import { Suspense, useEffect, useRef } from 'react';
import { GemSmoke } from '@paper-design/shaders-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { CuisineTheme } from '@/lib/truck-profile/theme';

interface WebGLContextLike {
  getExtension(name: 'WEBGL_lose_context'): { loseContext(): void } | null;
}

interface PaperShaderHost extends HTMLElement {
  paperShaderMount?: { gl?: WebGLContextLike };
}

interface TruckHeroAtmosphereProps {
  readonly theme: CuisineTheme;
}

export default function TruckHeroAtmosphere({ theme }: TruckHeroAtmosphereProps) {
  const isDesktopViewport = useMediaQuery('(min-width: 768px)');
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLContextLike | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    let raf = 0;
    let attempts = 0;
    const grab = () => {
      const el = host?.querySelector<PaperShaderHost>('[data-paper-shader]');
      const gl = el?.paperShaderMount?.gl ?? null;
      if (gl) {
        glRef.current = gl;
        return;
      }
      if (attempts++ < 120) {
        raf = requestAnimationFrame(grab);
      }
    };
    raf = requestAnimationFrame(grab);
    return () => {
      cancelAnimationFrame(raf);
      glRef.current?.getExtension('WEBGL_lose_context')?.loseContext();
      glRef.current = null;
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="absolute inset-0 md:hidden"
            style={{
              backgroundColor: theme.glow,
              maskImage: 'url(/truck-serving-window-mobile.svg)',
              maskSize: '105% auto',
              maskPosition: 'center',
              maskRepeat: 'no-repeat',
            }}
          />
        }
      >
        <GemSmoke
          suspendWhenProcessingImage
          width="100%"
          height="100%"
          speed={isDesktopViewport ? 0.15 : 0.0675}
          scale={1.05}
          fit="contain"
          image={
            isDesktopViewport ? '/truck-serving-window.svg' : '/truck-serving-window-mobile.svg'
          }
          colorBack={theme.deep}
          colors={[theme.glow, theme.accent, theme.cream]}
          colorInner={theme.glow}
          outerGlow={1}
          innerGlow={1}
          innerDistortion={0.8}
          outerDistortion={0.6}
          size={1.2}
        />
      </Suspense>
    </div>
  );
}
