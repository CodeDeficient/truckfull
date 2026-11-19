import {
  bindFullScreenTriangle,
  createPass,
  createStaticTarget,
  resizeStaticTarget,
} from '@/lib/holo/holoGl';
import type { ScenePass, StaticTarget } from '@/lib/holo/holoGl';
import { initialQualityLevel, nextQualityLevel, qualityAt } from '@/lib/holo/holoQuality';
import type { DeviceHints } from '@/lib/holo/holoQuality';
import { frameFor } from '@/lib/holo/holoFrame';
import type { HoloScene } from '@/lib/holo/sceneCommon';

const SETTINGS = { exposure: 0.54, sharp: 6, occ: 20 } as const;
const STATIC_BANDS = 4;
const WARMUP_FRAMES = 10;
const SAMPLE_FRAMES = 30;
const FRAME_INTERVAL_MS = 1000 / 30;
const FRAME_SLACK_MS = 4;

interface Scene {
  readonly gl: WebGLRenderingContext;
  readonly still: ScenePass;
  readonly live: ScenePass;
  readonly target: StaticTarget;
  readonly focusX: number;
}

function setSceneUniforms(gl: WebGLRenderingContext, pass: ScenePass): void {
  const at = (name: string): WebGLUniformLocation | null =>
    gl.getUniformLocation(pass.program, name);
  gl.useProgram(pass.program);
  gl.uniformMatrix3fv(at('uRot'), false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
  gl.uniform1f(at('uExposure'), SETTINGS.exposure);
  gl.uniform1f(at('uSharp'), SETTINGS.sharp);
  gl.uniform1f(at('uOcc'), SETTINGS.occ);
  gl.uniform1i(at('uStatic'), 0);
}

function readHints(): DeviceHints {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData ?? false,
  };
}

class HoloLoop {
  private readonly reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    .matches;
  private readonly t0 = performance.now();
  private level = initialQualityLevel(readHints());
  private band = 0;
  private raf = 0;
  private visible = true;
  private last = 0;
  private frames = 0;
  private total = 0;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  applyQuality(): void {
    const { gl, still, live, target } = this.scene;
    const quality = qualityAt(this.level);
    const { canvas } = this;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * quality.scale));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * quality.scale));
    resizeStaticTarget(gl, target, canvas.width, canvas.height);
    this.band = 0;
    const frame = frameFor(canvas.width, canvas.height, this.scene.focusX);
    for (const pass of [still, live]) {
      gl.useProgram(pass.program);
      gl.uniform1f(pass.steps, quality.steps);
      gl.uniform2f(pass.res, canvas.width, canvas.height);
      gl.uniform2f(pass.frame, frame.focusX, frame.span);
    }
    this.renderComplete(performance.now());
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.start();
    else this.stop();
  }

  start(): void {
    if (this.isStill()) this.renderComplete(performance.now());
    else if (!this.raf && this.visible && !document.hidden)
      this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resetMeter();
  }

  private readonly frame = (t: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const interval = FRAME_INTERVAL_MS * qualityAt(this.level).frameSkip;
    if (this.last && t - this.last < interval - FRAME_SLACK_MS) return;
    if (this.band >= STATIC_BANDS) this.measure(t);
    if (this.isStill()) {
      this.stop();
      this.renderComplete(t);
      return;
    }
    this.renderStaticBand();
    this.renderLive(t);
  };

  private measure(t: number): void {
    const dt = this.last ? t - this.last : 0;
    this.last = t;
    if (!dt || ++this.frames <= WARMUP_FRAMES) return;
    this.total += dt;
    if (this.frames < WARMUP_FRAMES + SAMPLE_FRAMES) return;
    const next = nextQualityLevel(this.level, this.total / SAMPLE_FRAMES);
    this.resetMeter();
    if (next === this.level) return;
    this.level = next;
    this.applyQuality();
  }

  private resetMeter(): void {
    this.last = 0;
    this.frames = 0;
    this.total = 0;
  }

  private isStill(): boolean {
    return this.reducedMotion || qualityAt(this.level).frozen;
  }

  private renderComplete(t: number): void {
    while (this.band < STATIC_BANDS) this.renderStaticBand();
    this.renderLive(t);
  }

  private renderStaticBand(): void {
    if (this.band >= STATIC_BANDS) return;
    const { gl, still, target } = this.scene;
    const { width, height } = this.canvas;
    const y0 = Math.floor((height * this.band) / STATIC_BANDS);
    const y1 = Math.floor((height * (this.band + 1)) / STATIC_BANDS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y0, width, y1 - y0);
    gl.useProgram(still.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.band += 1;
  }

  private renderLive(t: number): void {
    const { gl, live, target } = this.scene;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(live.program);
    gl.uniform1f(live.time, this.reducedMotion ? 0 : (t - this.t0) / 1000);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function runLoop(scene: Scene, canvas: HTMLCanvasElement): () => void {
  const loop = new HoloLoop(scene, canvas);
  const resizer = new ResizeObserver(() => loop.applyQuality());
  const watcher = new IntersectionObserver(([entry]) =>
    loop.setVisible(entry?.isIntersecting ?? true),
  );
  const onVisibility = (): void => (document.hidden ? loop.stop() : loop.start());
  resizer.observe(canvas);
  watcher.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  loop.applyQuality();
  loop.start();
  return () => {
    loop.stop();
    resizer.disconnect();
    watcher.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

function releaseContext(gl: WebGLRenderingContext): void {
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

function createScene(gl: WebGLRenderingContext, holo: HoloScene): Scene | null {
  const still = createPass(gl, holo.still);
  const live = createPass(gl, holo.live);
  const target = createStaticTarget(gl);
  if (!still || !live || !target) return null;
  bindFullScreenTriangle(gl);
  setSceneUniforms(gl, still);
  setSceneUniforms(gl, live);
  return { gl, still, live, target, focusX: holo.focusX };
}

export function startHoloScene(canvas: HTMLCanvasElement, holo: HoloScene): () => void {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return () => {};
  const scene = createScene(gl, holo);
  if (!scene) {
    releaseContext(gl);
    return () => {};
  }
  const stopLoop = runLoop(scene, canvas);
  return () => {
    stopLoop();
    releaseContext(gl);
  };
}
