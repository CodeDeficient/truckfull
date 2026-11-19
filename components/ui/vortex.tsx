'use client';

import { motion } from 'motion/react';
import type { JSX, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createNoise3D } from 'simplex-noise';
import { cn } from '@/lib/utils';

interface VortexProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly containerClassName?: string;
  readonly particleCount?: number;
  readonly rangeY?: number;
  readonly baseHue?: number;
  readonly rangeHue?: number;
  readonly baseSpeed?: number;
  readonly rangeSpeed?: number;
  readonly baseRadius?: number;
  readonly rangeRadius?: number;
  readonly backgroundColor?: string;
}

interface VortexConfig {
  readonly particleCount: number;
  readonly rangeY: number;
  readonly baseHue: number;
  readonly rangeHue: number;
  readonly baseSpeed: number;
  readonly rangeSpeed: number;
  readonly baseRadius: number;
  readonly rangeRadius: number;
  readonly backgroundColor: string;
}

interface DrawParticleState {
  x: number;
  y: number;
  nextX: number;
  nextY: number;
  life: number;
  ttl: number;
  radius: number;
  hue: number;
  strokeStyle: string;
}

const finalOpacity = { opacity: 1 };

function lerp(n1: number, n2: number, speed: number): number {
  return (1 - speed) * n1 + speed * n2;
}

// Pseudorandom jitter is visual noise for the particle field, not security-sensitive.
function rand(n: number): number {
  // eslint-disable-next-line sonarjs/pseudo-random -- deterministic placement would look mechanical.
  return n * Math.random();
}

function randRange(n: number): number {
  return n - rand(2 * n);
}

class ParticleField {
  private readonly particlePropCount = 9;
  private particlePropsLength: number;
  private readonly baseTTL = 50;
  private readonly rangeTTL = 150;
  private readonly noiseSteps = 3;
  // Noise sampling frequencies match the supplied Vortex reference.
  // eslint-disable-next-line unicorn/numeric-separators-style -- 0.00125 has no valid 3-digit grouping.
  private readonly xOff = 0.00125;
  // eslint-disable-next-line unicorn/numeric-separators-style -- 0.00125 has no valid 3-digit grouping.
  private readonly yOff = 0.00125;
  private readonly zOff = 0.0005;
  private readonly tau = 2 * Math.PI;
  private readonly context: CanvasRenderingContext2D;
  private readonly noise3D = createNoise3D();
  private readonly drawState: DrawParticleState = {
    x: 0,
    y: 0,
    nextX: 0,
    nextY: 0,
    life: 0,
    ttl: 1,
    radius: 1,
    hue: 0,
    strokeStyle: '',
  };
  private particleProps: Float32Array;
  private particleColors: string[];
  private width = 0;
  private height = 0;
  private center: [number, number] = [0, 0];
  private tick = 0;
  private frameDelta = 1;
  private frameBlend = 0.5;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: VortexConfig,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Vortex requires a 2D canvas context');
    this.context = context;
    this.context.lineCap = 'round';

    this.particlePropsLength = config.particleCount * this.particlePropCount;
    this.particleProps = new Float32Array(this.particlePropsLength);
    this.particleColors = Array.from({ length: config.particleCount }, () => '');
  }

  resize(): boolean {
    const width = Math.max(this.canvas.clientWidth, 320);
    const height = Math.max(this.canvas.clientHeight, 300);
    if (width === this.width && height === this.height) return false;
    this.width = width;
    this.height = height;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.center = [this.width * 0.5, this.height * 0.5];
    return true;
  }

  initParticle(index: number): void {
    const x = rand(this.width);
    const y = this.center[1] + randRange(Math.min(this.config.rangeY, this.height * 0.28));
    const ttl = this.baseTTL + rand(this.rangeTTL);
    const speed = this.config.baseSpeed + rand(this.config.rangeSpeed);
    const radius = this.config.baseRadius + rand(this.config.rangeRadius);
    const hue = this.config.baseHue + rand(this.config.rangeHue);
    const particleIndex = index / this.particlePropCount;
    this.particleColors[particleIndex] = `hsl(${hue}, 100%, 60%)`;
    this.particleProps.set([x, y, 0, 0, 0, ttl, speed, radius, hue], index);
  }

  initParticles(): void {
    this.tick = 0;
    const particleCount = this.canvas.clientWidth < 540 ? 230 : this.config.particleCount;
    this.particlePropsLength = particleCount * this.particlePropCount;
    this.particleProps = new Float32Array(this.particlePropsLength);
    this.particleColors = Array.from({ length: particleCount }, () => '');
    for (let index = 0; index < this.particlePropsLength; index += this.particlePropCount) {
      this.initParticle(index);
    }
  }

  drawFrame(dt: number): void {
    this.tick += dt;
    this.frameDelta = dt;
    this.frameBlend = 1 - Math.pow(0.5, dt);
    this.context.clearRect(0, 0, this.width, this.height);
    for (let index = 0; index < this.particlePropsLength; index += this.particlePropCount) {
      this.updateParticle(index);
    }
    this.renderGlow();
  }

  private updateParticle(index: number): void {
    const x = this.particleProps[index];
    const y = this.particleProps[index + 1];
    const noise =
      this.noise3D(x * this.xOff, y * this.yOff, this.tick * this.zOff) *
      this.noiseSteps *
      this.tau;
    const velocityX = lerp(this.particleProps[index + 2], Math.cos(noise), this.frameBlend);
    const velocityY = lerp(this.particleProps[index + 3], Math.sin(noise), this.frameBlend);
    const life = this.particleProps[index + 4];
    const ttl = this.particleProps[index + 5];
    const speed = this.particleProps[index + 6];
    const nextX = x + velocityX * speed * this.frameDelta;
    const nextY = y + velocityY * speed * this.frameDelta;

    this.drawState.x = x;
    this.drawState.y = y;
    this.drawState.nextX = nextX;
    this.drawState.nextY = nextY;
    this.drawState.life = life;
    this.drawState.ttl = ttl;
    this.drawState.radius = this.particleProps[index + 7];
    this.drawState.hue = this.particleProps[index + 8];
    this.drawState.strokeStyle = this.particleColors[index / this.particlePropCount] ?? '';
    this.drawParticle(this.drawState);

    this.particleProps[index] = nextX;
    this.particleProps[index + 1] = nextY;
    this.particleProps[index + 2] = velocityX;
    this.particleProps[index + 3] = velocityY;
    this.particleProps[index + 4] = life + this.frameDelta;
    if (this.isExpired(x, y, life, ttl)) this.initParticle(index);
  }

  private isExpired(x: number, y: number, life: number, ttl: number): boolean {
    return x > this.width || x < 0 || y > this.height || y < 0 || life > ttl;
  }

  private drawParticle(state: DrawParticleState): void {
    const halfTtl = state.ttl * 0.5;
    const opacity = Math.abs(((state.life + halfTtl) % state.ttl) - halfTtl) / halfTtl;
    this.context.save();
    this.context.lineCap = 'round';
    this.context.lineWidth = state.radius;
    this.context.globalAlpha = opacity;
    this.context.strokeStyle = state.strokeStyle;
    this.context.beginPath();
    this.context.moveTo(state.x, state.y);
    this.context.lineTo(state.nextX, state.nextY);
    this.context.stroke();
    this.context.closePath();
    this.context.restore();
  }

  private renderGlow(): void {
    // Two additive bloom passes, then a final additive self-draw — the exact
    // single-canvas pipeline of the original Vortex reference. Each self-blit
    // uses the 4-argument form with CSS-pixel dimensions: under the canvas
    // dpr transform the dest rect maps to the full bitmap at every DPR, so
    // the bloom always stays centered (a bare 2-arg drawImage would instead
    // draw at bitmap resolution and pack into the top-left corner).
    this.context.save();
    this.context.filter = 'blur(8px) brightness(200%)';
    this.context.globalCompositeOperation = 'lighter';
    this.context.drawImage(this.canvas, 0, 0, this.width, this.height);
    this.context.restore();

    this.context.save();
    this.context.filter = 'blur(4px) brightness(200%)';
    this.context.globalCompositeOperation = 'lighter';
    this.context.drawImage(this.canvas, 0, 0, this.width, this.height);
    this.context.restore();

    this.context.save();
    this.context.globalCompositeOperation = 'lighter';
    this.context.drawImage(this.canvas, 0, 0, this.width, this.height);
    this.context.restore();
  }
}

function startVortex(
  canvas: HTMLCanvasElement,
  config: VortexConfig,
  onMotionChange: (reduced: boolean) => void,
): () => void {
  let engine: ParticleField;
  try {
    engine = new ParticleField(canvas, config);
  } catch {
    return () => {};
  }

  let animationFrameId: number | null = null;
  let lastFrameTime = 0;
  let visible = true;
  // Old/embedded browsers without matchMedia get the safe static render:
  // treated as reduced-motion, no animation loop, no crash.
  // Bulletproof against matchMedia being absent or a non-callable polyfill
  // remnant; unsupported environments get the safe static render.
  const mediaQuery =
    typeof globalThis.matchMedia === 'function'
      ? globalThis.matchMedia('(prefers-reduced-motion: reduce)')
      : undefined;
  // An MQL that cannot take change listeners (old WebKit) is treated as
  // permanently reduced-motion: the preference can never be observed to
  // change, so the static render is the only safe choice.
  let reducedMotion =
    mediaQuery === undefined || typeof mediaQuery.addEventListener !== 'function'
      ? true
      : mediaQuery.matches;
  const observedElement = canvas.closest('[data-events-vortex-hero]') ?? canvas;

  const stopAnimation = (): void => {
    if (animationFrameId !== null) {
      globalThis.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    lastFrameTime = 0;
  };
  const renderOnce = (): void => {
    // Only re-seed particles when the canvas actually changed size; every
    // initParticles() re-randomizes the whole field, which visibly "pops"
    // on unrelated resize events (scrollbar toggling, browser chrome, etc.).
    if (engine.resize()) engine.initParticles();
    engine.drawFrame(1);
  };
  const scheduleAnimation = (): void => {
    if (!reducedMotion && visible && animationFrameId === null) {
      animationFrameId = globalThis.requestAnimationFrame(animate);
    }
  };
  const animate = (now: number): void => {
    animationFrameId = null;
    if (reducedMotion || !visible) return;
    // Normalize motion to 60fps wall-clock time so refresh rate and dropped
    // frames no longer change particle speed (the source of the visible
    // "jitter" when FPS wobbles). Clamped to avoid jumps after long frames.
    const dt =
      lastFrameTime === 0
        ? 1
        : Math.min(Math.max((now - lastFrameTime) / 16.667, 0.2), 2.5);
    lastFrameTime = now;
    engine.drawFrame(dt);
    scheduleAnimation();
  };
  const applyMotionPreference = (reduced: boolean): void => {
    onMotionChange(reduced);
    stopAnimation();
    renderOnce();
    scheduleAnimation();
  };
  const handleMotionChange = (event: MediaQueryListEvent): void => {
    reducedMotion = event.matches;
    applyMotionPreference(event.matches);
  };
  const handleResize = (): void => {
    renderOnce();
  };
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) scheduleAnimation();
    else stopAnimation();
  }, { threshold: 0.05 });

  applyMotionPreference(reducedMotion);
  visibilityObserver.observe(observedElement);
  // Old WebKit exposes matchMedia but MediaQueryList lacks addEventListener;
  // an unlistenable MQL is treated as permanently reduced (static render).
  if (typeof mediaQuery?.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleMotionChange);
  }
  globalThis.addEventListener('resize', handleResize);

  return () => {
    stopAnimation();
    visibilityObserver.disconnect();
    if (typeof mediaQuery?.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handleMotionChange);
    }
    globalThis.removeEventListener('resize', handleResize);
  };
}

export function Vortex({
  children,
  className,
  containerClassName,
  particleCount = 390,
  rangeY = 120,
  baseHue = 13,
  rangeHue = 49,
  baseSpeed = 0,
  rangeSpeed = 0.9,
  baseRadius = 0.75,
  rangeRadius = 1.6,
  backgroundColor = '#08090a',
}: VortexProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    return startVortex(
      canvas,
      {
        particleCount,
        rangeY,
        baseHue,
        rangeHue,
        baseSpeed,
        rangeSpeed,
        baseRadius,
        rangeRadius,
        backgroundColor,
      },
      setPrefersReducedMotion,
    );
  }, [particleCount, rangeY, baseHue, rangeHue, baseSpeed, rangeSpeed, baseRadius, rangeRadius, backgroundColor]);

  return (
    <div
      className={cn('relative h-full w-full', containerClassName)}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <motion.div
        initial={false}
        animate={finalOpacity}
        ref={containerRef}
        className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-transparent"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full opacity-[0.86] mix-blend-screen" />
      </motion.div>
      <div className={cn('relative z-10', className)}>{children}</div>
    </div>
  );
}
