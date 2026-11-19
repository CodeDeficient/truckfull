'use client';

import { useEffect, useRef, type RefObject } from 'react';

export type ParticleAction = 'add' | 'edit' | 'delete';

interface ParticleActionLayerProps {
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly gridRef: RefObject<HTMLDivElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly dockRef: RefObject<HTMLDivElement | null>;
  readonly actionsForKey: (key: string) => readonly ParticleAction[];
  readonly onAction: (action: ParticleAction, key: string) => void;
  readonly initialKey: string;
  readonly animationsEnabled: boolean;
}

interface IconDefinition {
  paths: string[];
  visualSize: number;
  spacing: number;
  correctionX?: number;
  correctionY?: number;
}

interface IconPoint {
  x: number;
  y: number;
  action: ParticleAction;
  centerX: number;
  centerY: number;
  localX: number;
  localY: number;
}

interface Particle {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  initialColorIndex: number;
  cursorColorIndex: number;
  targetColorIndex: number;
  styleKey: number;
  radius: number;
  phase: number;
  speed: number;
  cursorRadius: number;
  cursorStretch: number;
  cursorDrift: number;
  arrivalDelay: number;
  arrivalRadius: number;
  arrivalRevolutions: number;
  arrivalSpread: number;
  arrivalDirection: number;
  targetAction: ParticleAction;
  targetCenterX: number;
  targetCenterY: number;
  targetLocalX: number;
  targetLocalY: number;
  drawsTrail: boolean;
}

interface TrackingState {
  particles: Particle[];
  targetKey: string;
  lastMotionAt: number;
  startedAt: number;
  previousTime: number;
  pointerX: number;
  pointerY: number;
  previousPointerX: number;
  previousPointerY: number;
  settleAmount: number;
  settleStarted: boolean;
  settleLocked: boolean;
  dockBlend: number;
  colorBuckets: Particle[][];
}

const TAU = Math.PI * 2;
const MAX_DPR = 1.75;
const PARTICLE_COUNT = 126;
const HOVER_DWELL = 85;
const SETTLE_RESPONSE = 14;
const RELEASE_RESPONSE = 18;
const CURSOR_FOLLOW_RESPONSE = 20.5;
const POINTER_MOTION_THRESHOLD = 0.8;
const SETTLE_LOCK_AMOUNT = 0.72;

export function shouldLockSettledPointer(settleAmount: number): boolean {
  return settleAmount >= SETTLE_LOCK_AMOUNT;
}

export function shouldContinueSettling(settleStarted: boolean): boolean {
  return settleStarted;
}

export function actionKeyForDock(activeKey: string, trackingKey: string | null): string {
  return trackingKey ?? activeKey;
}

export function shouldUseParticleAnimation(animationsEnabled: boolean, prefersReducedMotion: boolean): boolean {
  return animationsEnabled && !prefersReducedMotion;
}

export function cellInteractionTarget(
  hoverKey: string | null,
  activeKey: string,
): string | null {
  return hoverKey ?? activeKey;
}

export function cellInteractionClass(
  key: string,
  activeKey: string,
  hoverKey: string | null,
): 'selected' | null {
  return cellInteractionTarget(hoverKey, activeKey) === key ? 'selected' : null;
}
const LEAVE_RETURN_DELAY = 90;

const COLORS: Record<ParticleAction, readonly [number, number, number]> = {
  add: [61, 222, 130],
  edit: [245, 201, 77],
  delete: [240, 87, 87],
};

const ACTION_ORDER: readonly ParticleAction[] = ['add', 'edit', 'delete'];
const ACTION_INDEX: Record<ParticleAction, number> = { add: 0, edit: 1, delete: 2 };
const COLOR_TABLE = ACTION_ORDER.map((action) => COLORS[action]);

const ICON_DEFINITIONS: Record<ParticleAction, IconDefinition> = {
  add: {
    paths: ['M12 5v14M5 12h14'],
    visualSize: 22,
    spacing: 2.8,
  },
  edit: {
    paths: [
      'M4 20l4.2-1 10.7-10.7a1.8 1.8 0 0 0 0-2.6l-.6-.6a1.8 1.8 0 0 0-2.6 0L5 15.8 4 20Z',
      'm14.8 6 3.2 3.2',
    ],
    visualSize: 20,
    spacing: 2.65,
    correctionX: -0.18,
    correctionY: -0.04,
  },
  delete: {
    paths: ['M5 7h14M9 7V5h6v2M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13'],
    visualSize: 22,
    spacing: 2.7,
  },
};

const ACTION_ARIA: Record<ParticleAction, string> = {
  add: 'Add schedule',
  edit: 'Edit schedule',
  delete: 'Close schedule',
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value: number): number {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function smootherstep(value: number): number {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function getCellElement(grid: HTMLDivElement, key: string): HTMLDivElement | null {
  return grid.querySelector(`[data-key="${key}"]`);
}

function stagePointForCell(
  stage: HTMLDivElement,
  grid: HTMLDivElement,
  key: string,
  width: number,
  height: number,
  offsetY = 0,
): { x: number; y: number } {
  const cell = getCellElement(grid, key);
  if (!cell) return { x: width / 2, y: height / 2 };
  const stageRect = stage.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    x: cellRect.left - stageRect.left + cellRect.width / 2,
    y: cellRect.top - stageRect.top + cellRect.height - 28 + offsetY,
  };
}

function stagePointFromPointer(
  stage: HTMLDivElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const stageRect = stage.getBoundingClientRect();
  return {
    x: clamp(clientX - stageRect.left, 0, stageRect.width),
    y: clamp(clientY - stageRect.top, 0, stageRect.height),
  };
}

interface CellGeometry {
  readonly stage: HTMLDivElement;
  readonly grid: HTMLDivElement;
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly offsetY?: number;
}

function actionCenters(
  geometry: CellGeometry,
  actions: readonly ParticleAction[],
): { action: ParticleAction; x: number; y: number }[] {
  const offsetY = geometry.offsetY ?? 0;
  const base = stagePointForCell(
    geometry.stage,
    geometry.grid,
    geometry.key,
    geometry.width,
    geometry.height,
    offsetY,
  );
  if (actions.length === 1) return [{ action: actions[0], ...base }];
  const gap = 22;
  return actions.map((action, index) => ({
    action,
    x: base.x + (index === 0 ? -gap : gap),
    y: base.y,
  }));
}

function samplePath(
  pathString: string,
  count: number,
): { x: number; y: number }[] {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathString);
  const length = path.getTotalLength();
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index++) {
    const point = path.getPointAtLength((length * index) / Math.max(1, count - 1));
    points.push({ x: point.x, y: point.y });
  }
  return points;
}

function iconPoints(
  geometry: CellGeometry,
  actionList: readonly ParticleAction[],
): IconPoint[] {
  const centers = actionCenters(geometry, actionList);
  const result: IconPoint[] = [];

  for (const center of centers) {
    const definition = ICON_DEFINITIONS[center.action];
    const sampledByPath = definition.paths.map((pathString) => samplePath(pathString, 24));
    const totalLengths = sampledByPath.map((points) => points.length);
    const combinedLength = totalLengths.reduce((sum, length) => sum + length, 0);
    const desiredCount = Math.max(18, Math.round((combinedLength * definition.visualSize) / 24 / definition.spacing));
    const scale = definition.visualSize / 24;
    const seen = new Set<string>();

    for (const [pathIndex, points] of sampledByPath.entries()) {
      const pathCount = Math.max(2, Math.round((desiredCount * totalLengths[pathIndex]) / combinedLength));
      const stride = Math.max(1, Math.floor(points.length / pathCount));
      for (let index = 0; index < points.length; index += stride) {
        const point = points[index];
        const correctionX = definition.correctionX ?? 0;
        const correctionY = definition.correctionY ?? 0;
        const x = center.x + (point.x - 12) * scale + correctionX;
        const y = center.y + (point.y - 12) * scale + correctionY;
        const marker = `${Math.round(x * 100)}:${Math.round(y * 100)}:${center.action}`;
        if (seen.has(marker)) continue;
        seen.add(marker);
        result.push({
          x,
          y,
          action: center.action,
          centerX: center.x,
          centerY: center.y,
          localX: x - center.x,
          localY: y - center.y,
        });
      }
    }
  }

  return result;
}

function pickPoint(
  points: IconPoint[],
  index: number,
  count: number,
  offset = 0,
): IconPoint {
  const normalized = (index + offset) / count;
  const pointIndex = Math.floor(normalized * points.length) % points.length;
  return points[pointIndex];
}

function createParticles(
  geometry: CellGeometry,
  actions: readonly ParticleAction[],
): Particle[] {
  const sourcePoints = iconPoints(geometry, actions);
  const offsetY = geometry.offsetY ?? 0;
  const base = stagePointForCell(
    geometry.stage,
    geometry.grid,
    geometry.key,
    geometry.width,
    geometry.height,
    offsetY,
  );
  const particles: Particle[] = [];

  for (let index = 0; index < PARTICLE_COUNT; index++) {
    const source = pickPoint(sourcePoints, index, PARTICLE_COUNT, 0);
    const randomA = seededRandom(index + 11);
    const randomB = seededRandom(index + 41);
    const randomC = seededRandom(index + 83);
    const dx = source.x - base.x;
    const dy = source.y - base.y;
    const length = Math.max(1, Math.hypot(dx, dy));

    particles.push({
      x: source.x,
      y: source.y,
      previousX: source.x,
      previousY: source.y,
      vx: (dx / length) * (22 + randomB * 58) + (randomA - 0.5) * 26,
      vy: (dy / length) * (22 + randomC * 58) + (randomB - 0.5) * 26,
      tx: source.x,
      ty: source.y,
      initialColorIndex: ACTION_INDEX[source.action],
      cursorColorIndex: index % 3,
      targetColorIndex: ACTION_INDEX[source.action],
      styleKey: 0,
      radius: 0.72 + randomC * 0.82,
      phase: randomA * TAU,
      speed: 0.72 + randomB * 0.55,
      cursorRadius: 7 + randomA * 17,
      cursorStretch: 0.58 + randomC * 0.28,
      cursorDrift: (randomB - 0.5) * 5.5,
      arrivalDelay: seededRandom(index + 127) * 0.075,
      arrivalRadius: 24 + seededRandom(index + 149) * 22,
      arrivalRevolutions: 1.25 + seededRandom(index + 173) * 1.05,
      arrivalSpread: -46 + seededRandom(index + 197) * 92,
      arrivalDirection: seededRandom(index + 223) > 0.5 ? 1 : -1,
      targetAction: source.action,
      targetCenterX: base.x,
      targetCenterY: base.y,
      targetLocalX: dx,
      targetLocalY: dy,
      drawsTrail: index % 2 === 0 || index % 5 === 0,
    });
  }

  return particles;
}

function animatedArrivalPoint(
  particle: Particle,
  settle: number,
): { x: number; y: number } {
  const delayedStart = 0.06 + particle.arrivalDelay;
  const formation = smootherstep((settle - delayedStart) / Math.max(0.001, 0.92 - delayedStart));
  const remaining = 1 - formation;
  const centerX = particle.targetCenterX;
  const centerY = particle.targetCenterY;
  const localX = particle.targetLocalX;
  const localY = particle.targetLocalY;

  if (particle.targetAction === 'add') {
    const angle = particle.phase + particle.arrivalRevolutions * TAU * formation;
    const radius = particle.arrivalRadius * Math.pow(remaining, 1.22);
    return {
      x: centerX + localX * formation + Math.cos(angle) * radius,
      y: centerY + localY * formation + Math.sin(angle) * radius,
    };
  }

  if (particle.targetAction === 'edit') {
    const diagonalX = Math.SQRT1_2;
    const diagonalY = -Math.SQRT1_2;
    const normalX = Math.SQRT1_2;
    const normalY = Math.SQRT1_2;
    const sweep = particle.arrivalSpread * remaining;
    const ribbon = Math.sin(particle.phase + formation * TAU * 1.65) * 7.2 * remaining;
    const writingPull = -30 * remaining;
    return {
      x: centerX + localX * formation + diagonalX * (sweep + writingPull) + normalX * ribbon,
      y: centerY + localY * formation + diagonalY * (sweep + writingPull) + normalY * ribbon,
    };
  }

  const isLid = localY < -5.2;
  if (isLid) {
    return {
      x: centerX + localX * formation + Math.sin(particle.phase + formation * TAU) * 4.2 * remaining,
      y: centerY + localY * formation - 38 * remaining,
    };
  }

  const angle = particle.phase + particle.arrivalDirection * particle.arrivalRevolutions * TAU * formation;
  const sidePull = particle.arrivalDirection * 39 * Math.pow(remaining, 1.08);
  const orbit = 11.5 * remaining;
  return {
    x: centerX + localX * formation + sidePull + Math.cos(angle) * orbit,
    y: centerY + localY * formation + Math.sin(angle) * orbit * 0.7,
  };
}

function frameColor(styleKey: number, releaseBlend: number, targetBlend: number): string {
  const initialIndex = Math.floor(styleKey / 9);
  const cursorIndex = Math.floor(styleKey / 3) % 3;
  const targetIndex = styleKey % 3;
  const initial = COLOR_TABLE[initialIndex];
  const cursor = COLOR_TABLE[cursorIndex];
  const target = COLOR_TABLE[targetIndex];
  const cursorR = initial[0] + (cursor[0] - initial[0]) * releaseBlend;
  const cursorG = initial[1] + (cursor[1] - initial[1]) * releaseBlend;
  const cursorB = initial[2] + (cursor[2] - initial[2]) * releaseBlend;
  return `rgb(${Math.round(cursorR + (target[0] - cursorR) * targetBlend)},${Math.round(cursorG + (target[1] - cursorG) * targetBlend)},${Math.round(cursorB + (target[2] - cursorB) * targetBlend)})`;
}

export function ParticleActionLayer({
  stageRef,
  gridRef,
  canvasRef,
  dockRef,
  actionsForKey,
  onAction,
  initialKey,
  animationsEnabled,
}: ParticleActionLayerProps) {
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const actionsRef = useRef(actionsForKey);
  actionsRef.current = actionsForKey;

  useEffect(() => {
    const stage = stageRef.current!;
    const grid = gridRef.current!;
    const canvas = canvasRef.current!;
    const dock = dockRef.current!;
    if (!stage || !grid || !canvas || !dock) return;
    if (globalThis.window !== undefined && globalThis.CanvasRenderingContext2D === undefined) return;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d', { alpha: true });
    } catch {
      return;
    }
    if (!ctx) return;
    const context = ctx;

    const prefersReducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useParticles = shouldUseParticleAnimation(animationsEnabled, prefersReducedMotion);
    const desktopHover = globalThis.matchMedia('(hover: hover) and (pointer: fine)');
    const mobileWidth = globalThis.matchMedia('(max-width: 767px)');
    const mobileDockOffset = () => (mobileWidth.matches ? 14 : 0);

    let activeKey = initialKey;
    let hoverKey: string | null = null;
    let pendingKey: string | null = null;
    let tracking: TrackingState | null = null;
    let animationFrame = 0;
    let resizeFrame = 0;
    let leaveTimer: ReturnType<typeof globalThis.setTimeout> | 0 = 0;
    let dpr = 1;
    let width = 1;
    let height = 1;
    let hoveredAction: ParticleAction | null = null;
    let orbitStart = 0;
    let pointerX = 0;
    let pointerY = 0;

    const actionButtons = [...dock.querySelectorAll<HTMLButtonElement>('[data-action]')];

    function clearCanvas(): void {
      context.clearRect(0, 0, width, height);
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.globalCompositeOperation = 'source-over';
    }

    function resizeCanvas(): void {
      const rect = stage.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!tracking && !hoveredAction) clearCanvas();
    }

    function scheduleResize(): void {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resizeCanvas();
        positionDock(activeKey);
        if (tracking) assignTargets(tracking.targetKey, performance.now(), false);
      });
    }

    function positionDock(key: string): void {
      const point = stagePointForCell(stage, grid, key, width, height, mobileDockOffset());
      dock.style.left = `${point.x}px`;
      dock.style.top = `${point.y}px`;
    }

    function configureDock(key: string, opacity = 1): void {
      const actions = new Set(actionsRef.current(key));
      const isTraveling = opacity < 0.999;
      for (const button of actionButtons) {
        const visible = actions.has(button.dataset.action as ParticleAction);
        button.hidden = !visible;
        button.style.display = visible ? '' : 'none';
      }
      dock.style.opacity = String(opacity);
      dock.style.pointerEvents = isTraveling ? 'none' : 'auto';
      dock.classList.toggle('traveling', isTraveling);
    }

    function updateSelectionClasses(): void {
      for (const cell of grid.querySelectorAll<HTMLElement>('[data-key]')) {
        const key = cell.dataset.key ?? '';
        cell.classList.toggle('selected', cellInteractionClass(key, activeKey, hoverKey) === 'selected');
        cell.classList.toggle('pending', key === pendingKey && pendingKey !== activeKey);
      }
    }

    function jumpToCell(key: string): void {
      activeKey = key;
      hoverKey = key;
      pendingKey = null;
      tracking = null;
      configureDock(key, 1);
      positionDock(key);
      updateSelectionClasses();
      clearCanvas();
      canvas.classList.remove('active');
    }

    function assignTargets(targetKey: string, time: number, resetDwell = true, point: { x: number; y: number } | null = null): void {
      if (!tracking) return;
      tracking.targetKey = targetKey;
      if (point) {
        tracking.pointerX = point.x;
        tracking.pointerY = point.y;
        tracking.previousPointerX = point.x;
        tracking.previousPointerY = point.y;
        pointerX = point.x;
        pointerY = point.y;
      }
      if (resetDwell) tracking.lastMotionAt = time;
      tracking.dockBlend = 0;

      pendingKey = targetKey;
      hoveredAction = null;
      if (hoverKey !== targetKey) {
        hoverKey = targetKey;
      }
      updateSelectionClasses();
      configureDock(targetKey, 0);
      positionDock(targetKey);

      const targetPoints = iconPoints(
        {
          stage,
          grid,
          key: targetKey,
          width,
          height,
          offsetY: mobileDockOffset(),
        },
        actionsRef.current(targetKey),
      );
      const count = tracking.particles.length;

      for (const [index, particle] of tracking.particles.entries()) {
        const target = pickPoint(targetPoints, (index * 7) % count, count, 0.37);
        particle.tx = target.x;
        particle.ty = target.y;
        particle.targetAction = target.action;
        particle.targetCenterX = target.centerX;
        particle.targetCenterY = target.centerY;
        particle.targetLocalX = target.localX;
        particle.targetLocalY = target.localY;
        particle.targetColorIndex = ACTION_INDEX[target.action];
        particle.styleKey = particle.initialColorIndex * 9 + particle.cursorColorIndex * 3 + particle.targetColorIndex;
      }

      for (const bucket of tracking.colorBuckets) bucket.length = 0;
      for (const particle of tracking.particles) {
        tracking.colorBuckets[particle.styleKey].push(particle);
      }
    }

    function startTracking(targetKey: string, time = performance.now(), point: { x: number; y: number } | null = null, force = false): void {
      if (targetKey === activeKey && !tracking && !force) return;
      globalThis.clearTimeout(leaveTimer);
      leaveTimer = 0;
      hoveredAction = null;

      const initialPoint = point ?? stagePointForCell(stage, grid, targetKey, width, height, mobileDockOffset());
      pointerX = initialPoint.x;
      pointerY = initialPoint.y;

      if (!tracking) {
        const actions = actionsRef.current(activeKey);
        tracking = {
          particles: createParticles(
            { stage, grid, key: activeKey, width, height, offsetY: mobileDockOffset() },
            actions,
          ),
          targetKey,
          lastMotionAt: time,
          startedAt: time,
          previousTime: time,
          pointerX: initialPoint.x,
          pointerY: initialPoint.y,
          previousPointerX: initialPoint.x,
          previousPointerY: initialPoint.y,
          settleAmount: 0,
          settleStarted: false,
          settleLocked: false,
          dockBlend: 0,
          colorBuckets: Array.from({ length: 27 }, () => []),
        };
        configureDock(activeKey, 0);
        canvas.classList.add('active');
      }

      assignTargets(targetKey, time, true, initialPoint);
      startAnimation();
    }

    function retargetTracking(targetKey: string, point: { x: number; y: number } | null = null, time = performance.now()): void {
      if (!tracking) {
        startTracking(targetKey, time, point);
        return;
      }
      if (tracking.targetKey !== targetKey) {
        assignTargets(targetKey, time, true, point);
        return;
      }
      if (point) updateTrackingPointer(point, time);
    }

    function updateTrackingPointer(point: { x: number; y: number }, time = performance.now()): void {
      pointerX = point.x;
      pointerY = point.y;
      if (!tracking) return;
      if (tracking.settleStarted) return;
      const movement = Math.hypot(point.x - tracking.previousPointerX, point.y - tracking.previousPointerY);
      tracking.pointerX = point.x;
      tracking.pointerY = point.y;
      if (movement >= POINTER_MOTION_THRESHOLD) tracking.lastMotionAt = time;
      tracking.previousPointerX = point.x;
      tracking.previousPointerY = point.y;
      startAnimation();
    }

    function hoverCell(key: string, point: { x: number; y: number } | null = null, time = performance.now()): void {
      globalThis.clearTimeout(leaveTimer);
      leaveTimer = 0;
      if (!useParticles) {
        jumpToCell(key);
        updateSelectionClasses();
        return;
      }
      if (hoverKey !== key) {
        hoverKey = key;
        updateSelectionClasses();
      }
      if (!tracking && key === activeKey) return;
      retargetTracking(key, point, time);
    }

    function returnToActiveAfterLeave(): void {
      globalThis.clearTimeout(leaveTimer);
      leaveTimer = globalThis.setTimeout(() => {
        hoverKey = null;
        if (tracking && tracking.targetKey !== activeKey) {
          const point = stagePointForCell(stage, grid, activeKey, width, height, mobileDockOffset());
          assignTargets(activeKey, performance.now(), true, point);
        }
        updateSelectionClasses();
      }, LEAVE_RETURN_DELAY);
    }

    function finishTracking(key: string): void {
      activeKey = key;
      pendingKey = null;
      tracking = null;
      configureDock(activeKey, 1);
      positionDock(activeKey);
      updateSelectionClasses();
      clearCanvas();
      canvas.classList.remove('active');
      if (hoverKey && hoverKey !== activeKey) {
        startTracking(hoverKey, performance.now(), { x: pointerX, y: pointerY });
      }
    }

    function drawTracking(time: number): boolean {
      if (!tracking) return false;

      const dt = Math.min(40, Math.max(4, time - (tracking.previousTime || time))) / 1000;
      tracking.previousTime = time;

      const idleLongEnough = time - tracking.lastMotionAt >= HOVER_DWELL;
      if (idleLongEnough) tracking.settleStarted = true;
      const settleGoal = shouldContinueSettling(tracking.settleStarted) ? 1 : 0;
      const settleResponse = settleGoal > tracking.settleAmount ? SETTLE_RESPONSE : RELEASE_RESPONSE;
      const settleFollow = 1 - Math.exp(-settleResponse * dt);
      tracking.settleAmount += (settleGoal - tracking.settleAmount) * settleFollow;
      if (tracking.settleAmount < 0.0005) tracking.settleAmount = 0;
      if (tracking.settleAmount > 0.9995) tracking.settleAmount = 1;
      if (shouldLockSettledPointer(tracking.settleAmount)) tracking.settleLocked = true;

      const settle = smootherstep(tracking.settleAmount);
      const cloud = 1 - settle;
      const releaseBlend = smoothstep((time - tracking.startedAt) / 105);
      const targetColorBlend = smoothstep((settle - 0.18) / 0.72);
      const movementGlow = 3 + cloud * 1.25;
      const arrivalGlow = smoothstep((settle - 0.44) / 0.56);
      const particleFade = 1 - smoothstep((settle - 0.72) / 0.28);
      const tailFade = (0.38 + cloud * 0.62) * (1 - smoothstep((settle - 0.54) / 0.27));

      clearCanvas();
      canvas.classList.add('active');
      context.shadowBlur = movementGlow + arrivalGlow * 2.7;

      let maximumDistance = 0;

      for (let styleKey = 0; styleKey < tracking.colorBuckets.length; styleKey++) {
        const bucket = tracking.colorBuckets[styleKey];
        if (bucket.length === 0) continue;
        const rgb = frameColor(styleKey, releaseBlend, targetColorBlend);
        context.fillStyle = rgb;
        context.strokeStyle = rgb;
        context.shadowColor = rgb;

        for (const particle of bucket) {
          const orbitAngle = particle.phase + time * 0.002_55 * particle.speed;
          const breathing = 1 + Math.sin(time * 0.002 + particle.phase) * 0.07;
          const cursorCloudX =
            tracking.pointerX +
            Math.cos(orbitAngle) * particle.cursorRadius * breathing +
            particle.cursorDrift * Math.sin(time * 0.0013 + particle.phase);
          const cursorCloudY =
            tracking.pointerY +
            Math.sin(orbitAngle) * particle.cursorRadius * particle.cursorStretch * breathing;

          const arrival = animatedArrivalPoint(particle, settle);
          const departure = smoothstep(settle / 0.34);
          const targetX = cursorCloudX + (arrival.x - cursorCloudX) * departure;
          const targetY = cursorCloudY + (arrival.y - cursorCloudY) * departure;
          const followRate = CURSOR_FOLLOW_RESPONSE + settle * 11;
          const follow = 1 - Math.exp(-followRate * dt);

          particle.vx *= Math.exp(-(8.4 + settle * 3.8) * dt);
          particle.vy *= Math.exp(-(8.4 + settle * 3.8) * dt);

          const nextX = particle.x + (targetX - particle.x) * follow + particle.vx * dt;
          const nextY = particle.y + (targetY - particle.y) * follow + particle.vy * dt;
          const velocityX = nextX - particle.x;
          const velocityY = nextY - particle.y;
          const velocity = Math.hypot(velocityX, velocityY);

          particle.previousX = particle.x;
          particle.previousY = particle.y;
          particle.x = nextX;
          particle.y = nextY;

          const targetDistance = Math.hypot(particle.tx - particle.x, particle.ty - particle.y);
          maximumDistance = Math.max(maximumDistance, targetDistance);

          if (particle.drawsTrail && velocity > 0.3 && tailFade > 0.01) {
            const inverseVelocity = 1 / velocity;
            const tailLength = Math.min(12, velocity * 2.15) * tailFade;
            context.globalAlpha = 0.27 * particleFade * tailFade;
            context.lineWidth = Math.max(0.5, particle.radius * 0.7);
            context.beginPath();
            context.moveTo(particle.x - velocityX * inverseVelocity * tailLength, particle.y - velocityY * inverseVelocity * tailLength);
            context.lineTo(particle.x, particle.y);
            context.stroke();
          }

          context.globalAlpha = (0.5 + settle * 0.5) * particleFade;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius * (0.9 + settle * 0.1), 0, TAU);
          context.fill();
        }
      }

      const dockBlend = smoothstep((settle - 0.78) / 0.22);
      tracking.dockBlend = dockBlend;
      positionDock(tracking.targetKey);
      configureDock(tracking.targetKey, dockBlend);

      if (settle >= 0.999 && maximumDistance < 0.6) {
        finishTracking(tracking.targetKey);
        return false;
      }
      return true;
    }

    function drawOrbit(time: number): boolean {
      if (!hoveredAction || tracking) return false;
      const actions = actionsRef.current(activeKey);
      const centers = actionCenters(
        { stage, grid, key: activeKey, width, height, offsetY: mobileDockOffset() },
        actions,
      );
      const center = centers.find((item) => item.action === hoveredAction);
      if (!center) return false;

      clearCanvas();
      canvas.classList.add('active');
      const color = COLORS[hoveredAction];
      context.fillStyle = `rgb(${color.join(',')})`;
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 7;

      for (let index = 0; index < 8; index++) {
        const phase = (index / 8) * TAU;
        const angle = phase + (time - orbitStart) * 0.000_75 * (1 + (index % 3) * 0.08);
        const radius = 18 + (index % 3) * 1.6;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius * 0.78;
        context.globalAlpha = 0.25 + 0.18 * Math.sin(angle + phase);
        context.beginPath();
        context.arc(x, y, index % 3 === 0 ? 1 : 0.72, 0, TAU);
        context.fill();
      }
      return true;
    }

    function animate(time: number): void {
      animationFrame = 0;
      const trackingRunning = drawTracking(time);
      const orbitRunning = !trackingRunning && drawOrbit(time);
      if (trackingRunning || orbitRunning) {
        animationFrame = requestAnimationFrame(animate);
      } else if (!tracking) {
        canvas.classList.remove('active');
      }
    }

    function startAnimation(): void {
      if (!animationFrame) animationFrame = requestAnimationFrame(animate);
    }

    function selectCellByTap(key: string): void {
      if (!useParticles) {
        jumpToCell(key);
        updateSelectionClasses();
        return;
      }
      if (desktopHover.matches && !tracking) return;
      if (hoverKey !== key) {
        hoverKey = key;
        updateSelectionClasses();
      }
      if (!tracking && key === activeKey) return;
      retargetTracking(key);
      if (tracking) {
        tracking.lastMotionAt = performance.now() - HOVER_DWELL - 80;
        tracking.settleAmount = Math.max(tracking.settleAmount, 0.18);
      }
    }

    function onGridPointerMove(event: PointerEvent): void {
      if (event.pointerType !== 'mouse' || !desktopHover.matches) return;
      const cell = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-key]');
      if (!cell) return;
      const key = cell.dataset.key ?? '';
      if (actionsRef.current(key).length === 0) {
        if (hoverKey !== null) {
          hoverKey = null;
          updateSelectionClasses();
        }
        return;
      }
      if (!useParticles) {
        jumpToCell(key);
        updateSelectionClasses();
        return;
      }
      const point = stagePointFromPointer(stage, event.clientX, event.clientY);
      const time = performance.now();
      pointerX = point.x;
      pointerY = point.y;
      if (hoverKey !== key) {
        hoverKey = key;
        updateSelectionClasses();
      }
      globalThis.clearTimeout(leaveTimer);
      leaveTimer = 0;

      if (!tracking && hoverKey === activeKey) return;
      retargetTracking(hoverKey, point, time);
    }

    function onGridPointerLeave(event: PointerEvent): void {
      if (event.pointerType !== 'mouse' || !desktopHover.matches) return;
      returnToActiveAfterLeave();
    }

    function onGridPointerEnter(event: PointerEvent): void {
      if (event.pointerType !== 'mouse' || !desktopHover.matches) return;
      globalThis.clearTimeout(leaveTimer);
      leaveTimer = 0;
    }

    function onCellPointerEnter(event: PointerEvent): void {
      if (event.pointerType !== 'mouse' || !desktopHover.matches) return;
      const cell = event.currentTarget as HTMLElement;
      const key = cell.dataset.key ?? '';
      if (actionsRef.current(key).length === 0) return;
      const point = stagePointFromPointer(stage, event.clientX, event.clientY);
      hoverCell(key, point, performance.now());
    }

    function onCellClick(event: MouseEvent): void {
      if (desktopHover.matches && event.detail !== 0) return;
      const cell = event.currentTarget as HTMLElement;
      const key = cell.dataset.key ?? '';
      if (!desktopHover.matches) {
        const actions = actionsRef.current(key);
        if (actions.length === 1) {
          onActionRef.current(actions[0], key);
          return;
        }
      }
      selectCellByTap(key);
    }

    function onCellFocus(event: FocusEvent): void {
      if (!desktopHover.matches) return;
      const cell = event.currentTarget as HTMLElement;
      const key = cell.dataset.key ?? '';
      hoverCell(key);
    }

    function onButtonPointerEnter(event: PointerEvent): void {
      if (event.pointerType !== 'mouse' || tracking) return;
      hoveredAction = (event.currentTarget as HTMLButtonElement).dataset.action as ParticleAction;
      orbitStart = performance.now();
      startAnimation();
    }

    function onButtonPointerLeave(): void {
      hoveredAction = null;
      if (!tracking) {
        clearCanvas();
        canvas.classList.remove('active');
      }
    }

    function onButtonFocus(event: FocusEvent): void {
      if (tracking) return;
      hoveredAction = (event.currentTarget as HTMLButtonElement).dataset.action as ParticleAction;
      orbitStart = performance.now();
      startAnimation();
    }

    function onButtonClick(event: MouseEvent): void {
      event.stopPropagation();
      const button = event.currentTarget as HTMLButtonElement;
      const action = button.dataset.action as ParticleAction;
      onActionRef.current(action, actionKeyForDock(activeKey, tracking?.targetKey ?? null));
    }

    resizeCanvas();
    positionDock(activeKey);
    configureDock(activeKey, 1);
    updateSelectionClasses();

    grid.addEventListener('pointermove', onGridPointerMove);
    grid.addEventListener('pointerleave', onGridPointerLeave);
    grid.addEventListener('pointerenter', onGridPointerEnter);

    for (const cell of grid.querySelectorAll<HTMLElement>('[data-key]')) {
      cell.addEventListener('pointerenter', onCellPointerEnter);
      cell.addEventListener('click', onCellClick);
      cell.addEventListener('focus', onCellFocus);
    }

    for (const button of actionButtons) {
      button.addEventListener('pointerenter', onButtonPointerEnter);
      button.addEventListener('pointerleave', onButtonPointerLeave);
      button.addEventListener('focus', onButtonFocus);
      button.addEventListener('blur', onButtonPointerLeave);
      button.addEventListener('click', onButtonClick);
    }

    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(stage);

    const onPageHide = () => {
      resizeObserver.disconnect();
      globalThis.clearTimeout(leaveTimer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      canvas.width = 1;
      canvas.height = 1;
    };
    globalThis.addEventListener('pagehide', onPageHide, { once: true });

    return () => {
      resizeObserver.disconnect();
      globalThis.removeEventListener('pagehide', onPageHide);
      globalThis.clearTimeout(leaveTimer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      grid.removeEventListener('pointermove', onGridPointerMove);
      grid.removeEventListener('pointerleave', onGridPointerLeave);
      grid.removeEventListener('pointerenter', onGridPointerEnter);
      for (const cell of grid.querySelectorAll<HTMLElement>('[data-key]')) {
        cell.removeEventListener('pointerenter', onCellPointerEnter);
        cell.removeEventListener('click', onCellClick);
        cell.removeEventListener('focus', onCellFocus);
      }
      for (const button of actionButtons) {
        button.removeEventListener('pointerenter', onButtonPointerEnter);
        button.removeEventListener('pointerleave', onButtonPointerLeave);
        button.removeEventListener('focus', onButtonFocus);
        button.removeEventListener('blur', onButtonPointerLeave);
        button.removeEventListener('click', onButtonClick);
      }
      clearCanvas();
      canvas.classList.remove('active');
    };
  }, [animationsEnabled, canvasRef, dockRef, gridRef, initialKey, stageRef]);

  return null;
}

export { ACTION_ARIA, ACTION_ORDER };
