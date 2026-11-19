import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const MAULDIN_SOURCE = `
const vec3 BRICK = vec3(1.0, 0.55, 0.42);
const vec3 CREAM = vec3(1.0, 0.92, 0.82);
const vec3 SHELL = vec3(0.9, 0.75, 1.0);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 LEAF = vec3(0.35, 0.85, 0.5);
const vec3 CENTER_C = vec3(-4.6, GROUND, -1.8);
const vec3 SHELL_C = vec3(2.7, GROUND, -1.3);
const float SHELL_R = 0.95;

float centerBody(vec3 p){
  vec3 lp = p - CENTER_C;
  float bb = sdBox(lp - vec3(0.0, 0.6, 0.2), vec3(1.05, 0.75, 0.6));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, 0.38, 0.0), vec3(0.95, 0.38, 0.3), 0.02);
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -4.0, 4.0);
  float win = max(sdBox(vec3(wx, lp.y - 0.36, lp.z - 0.3), vec3(0.06, 0.14, 0.04)), 0.42 - abs(lp.x));
  body = max(body, -win);
  float cornice = sdRBox(lp - vec3(0.0, 0.78, 0.0), vec3(0.98, 0.025, 0.33), 0.01);
  float cupola = sdRBox(lp - vec3(0.0, 0.9, 0.0), vec3(0.1, 0.1, 0.1), 0.01);
  float cap = sdTaper(lp, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.2, 0.0), 0.13, 0.01);
  return min(min(body, cornice), min(cupola, cap));
}

float centerPortico(vec3 p){
  vec3 lp = p - CENTER_C;
  float bb = sdBox(lp - vec3(0.0, 0.45, 0.45), vec3(0.5, 0.55, 0.25));
  if (bb > CULL) return bb;
  float cx = abs(abs(lp.x) - 0.1) < abs(abs(lp.x) - 0.3) ? abs(lp.x) - 0.1 : abs(lp.x) - 0.3;
  float cols = sdCylY(vec3(cx, lp.y - 0.3, lp.z - 0.45), 0.03, 0.3);
  float beam = sdRBox(lp - vec3(0.0, 0.63, 0.45), vec3(0.4, 0.03, 0.06), 0.01);
  vec3 r = lp - vec3(0.0, 0.66, 0.45);
  float ped = max(max(abs(r.x) * 0.5 + r.y - 0.17, -r.y), abs(r.z) - 0.06);
  float steps = sdRBox(lp - vec3(0.0, 0.03, 0.5), vec3(0.42, 0.03, 0.1), 0.01);
  return min(min(cols, beam), min(ped, steps));
}

float centerWindows(vec3 p){
  vec3 lp = p - CENTER_C;
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -4.0, 4.0);
  float win = max(sdBox(vec3(wx, lp.y - 0.36, lp.z - 0.28), vec3(0.05, 0.13, 0.02)), 0.42 - abs(lp.x));
  float door = sdBox(lp - vec3(0.0, 0.18, 0.3), vec3(0.08, 0.16, 0.02));
  return min(win, door);
}

float bandShell(vec3 p){
  vec3 lp = p - SHELL_C;
  float bb = sdBox(lp - vec3(0.0, 0.55, -0.2), vec3(1.15, 0.7, 0.6));
  if (bb > CULL) return bb;
  vec2 q = lp.xy - vec2(0.0, 0.12);
  float rings = 1e5;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float r = SHELL_R - fi * 0.17;
    rings = min(rings, length(vec2(length(q) - r, lp.z + fi * 0.14)) - 0.022);
  }
  rings = max(rings, -q.y);
  float back = max(max(length(q) - SHELL_R + 0.5, abs(lp.z + 0.5) - 0.02), -q.y);
  float stage = sdRBox(lp - vec3(0.0, 0.06, -0.1), vec3(1.05, 0.06, 0.4), 0.02);
  return min(min(rings, back), stage);
}

void staticScene(vec3 p, inout float best){
  take(centerBody(p), best, BRICK, 0.95);
  take(centerPortico(p), best, CREAM, 1.0);
  take(centerWindows(p), best, WARM, 1.25);
  take(bandShell(p), best, SHELL, 1.0);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.56, 0.38), 2.7) + moonGlow(f, vec2(-5.0, 1.8), vec3(1.0, 0.9, 0.75));
}

void stageLights(vec3 p, inout float best){
  vec3 lp = p - SHELL_C;
  vec2 q = lp.xy - vec2(0.0, 0.12);
  float bb = length(vec3(q, lp.z)) - SHELL_R - 0.3;
  if (bb > CULL) { take(bb, best, WARM, 0.0); return; }
  float seg = 3.1416 / 14.0;
  float a = clamp(atan(q.y, q.x), 0.0, 3.1416);
  float ai = (clamp(floor(a / seg), 0.0, 13.0) + 0.5) * seg;
  vec3 c = vec3(cos(ai) * (SHELL_R + 0.06), sin(ai) * (SHELL_R + 0.06) + 0.12, 0.03);
  float tw = 0.7 + 0.3 * sin(uTime * 1.5 + ai * 9.0);
  take(length(lp - c) - 0.026, best, vec3(1.0, 0.78, 0.45), 1.2 * tw);
}

void liveScene(vec3 p, inout float best){
  stageLights(p, best);
  roundTree(p, vec3(5.2, GROUND, 0.3), 1.2, 0.7, 0.0, LEAF, best);
  roundTree(p, vec3(-6.4, GROUND, 0.2), 1.0, 0.55, 3.0, LEAF, best);
  stringLights(p, vec3(3.75, GROUND + 0.75, -1.1), vec3(5.2, GROUND + 0.95, 0.1), 0.2, 0.0, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const MAULDIN_SCENE = buildScene(0.3, `${SCENE_PARTS}${MAULDIN_SOURCE}`);
