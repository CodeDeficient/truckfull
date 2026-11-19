import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const ATLANTA_SOURCE = `
const vec3 GOLD = vec3(1.0, 0.78, 0.35);
const vec3 RIM = vec3(0.55, 0.8, 1.0);
const vec3 LEAF = vec3(0.35, 0.85, 0.5);
const vec3 HORIZON = vec3(0.45, 0.28, 0.45);
const vec3 HAZE = vec3(1.0, 0.55, 0.35);
const vec3 WHEEL_C = vec3(-3.55, -0.4, -0.4);
const float WHEEL_R = 0.7;

float westin(vec3 p){
  float top = 0.95;
  float hh = (top - GROUND) * 0.5;
  vec3 lp = p - vec3(-0.25, GROUND + hh, -2.1);
  float bb = sdBox(lp, vec3(0.45, hh + 0.15, 0.45));
  if (bb > CULL) return bb;
  float body = sdCylY(lp, 0.3, hh);
  float fy = lp.y - 0.18 * floor(lp.y / 0.18 + 0.5);
  float groove = max(abs(fy) - 0.022, 0.26 - length(lp.xz));
  float crown = sdCylY(lp - vec3(0.0, hh - 0.12, 0.0), 0.35, 0.07) - 0.02;
  return min(max(body, -groove), crown);
}

float bankCrown(vec3 p){
  vec3 lp = p - vec3(1.3, 1.1, -2.4);
  float bb = sdBox(lp - vec3(0.0, 0.6, 0.0), vec3(0.45, 0.75, 0.45));
  if (bb > CULL) return bb;
  float d = sdRBox(lp - vec3(0.0, 0.08, 0.0), vec3(0.3, 0.08, 0.3), 0.02);
  d = min(d, sdRBox(lp - vec3(0.0, 0.24, 0.0), vec3(0.22, 0.08, 0.22), 0.02));
  d = min(d, sdRBox(lp - vec3(0.0, 0.4, 0.0), vec3(0.14, 0.08, 0.14), 0.02));
  vec3 s = vec3(abs(lp.x), lp.y, abs(lp.z));
  d = min(d, sdSeg(s, vec3(0.11, 0.48, 0.11), vec3(0.0, 1.2, 0.0), 0.014));
  d = min(d, sdSeg(lp, vec3(-0.08, 0.75, 0.0), vec3(0.08, 0.75, 0.0), 0.01));
  return min(d, sdSeg(lp, vec3(-0.05, 0.95, 0.0), vec3(0.05, 0.95, 0.0), 0.01));
}

float sdPyramid(vec3 p, float h){
  float m2 = h * h + 0.25;
  p.xz = abs(p.xz);
  p.xz = (p.z > p.x) ? p.zx : p.xz;
  p.xz -= 0.5;
  vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
  float s = max(-q.x, 0.0);
  float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);
  float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
  float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);
  float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);
  return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}

float atlanticCrown(vec3 p){
  vec3 r = p - vec3(2.4, 0.9, -2.3);
  float bb = sdBox(r - vec3(0.0, 0.4, 0.0), vec3(0.45, 0.6, 0.45));
  if (bb > CULL) return bb;
  float pyr = sdPyramid(r / 0.64, 0.8) * 0.64;
  return min(pyr, sdSeg(r, vec3(0.0, 0.45, 0.0), vec3(0.0, 0.75, 0.0), 0.012));
}

vec3 towerColor(float i){
  if (i < 0.5) return vec3(1.0, 0.7, 0.5);
  if (i < 1.5) return vec3(0.9, 0.6, 0.85);
  if (i < 2.5) return vec3(1.0, 0.6, 0.55);
  if (i < 3.5) return vec3(0.85, 0.65, 0.95);
  if (i < 4.5) return vec3(1.0, 0.62, 0.45);
  return vec3(0.95, 0.55, 0.7);
}

float towerAt(vec3 p, float i){
  if (i < 0.5) return tower(p, 1.3, 0.36, 1.1, -2.4);
  if (i < 1.5) return tower(p, 2.4, 0.3, 0.9, -2.3);
  if (i < 2.5) return tower(p, 0.45, 0.27, 0.7, -1.9);
  if (i < 3.5) return tower(p, -1.1, 0.28, 0.55, -2.0);
  if (i < 4.5) return tower(p, 3.6, 0.3, 0.15, -1.8);
  return tower(p, -1.9, 0.25, 0.0, -2.2);
}

float wheelStand(vec3 p){
  vec3 lp = p - WHEEL_C;
  float bb = sdBox(lp - vec3(0.0, -0.7, 0.0), vec3(0.8, 0.8, 0.4));
  if (bb > CULL) return bb;
  vec3 s = vec3(abs(lp.x), lp.y, abs(lp.z));
  float d = sdTaper(s, vec3(0.4, GROUND - WHEEL_C.y, 0.22), vec3(0.0, 0.0, 0.13), 0.035, 0.022);
  return min(d, sdRBox(lp - vec3(0.0, GROUND - WHEEL_C.y + 0.05, 0.0), vec3(0.5, 0.05, 0.3), 0.03));
}

void staticScene(vec3 p, inout float best){
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    take(towerAt(p, fi), best, towerColor(fi), 0.7);
  }
  take(westin(p), best, vec3(0.5, 0.9, 0.9), 0.85);
  take(bankCrown(p), best, GOLD, 1.2);
  take(atlanticCrown(p), best, vec3(0.95, 0.7, 1.0), 1.0);
  storefronts(p, 0.35, 3.71, -1.3, 5.0, best);
  take(wheelStand(p), best, RIM * 0.8, 0.8);
}

vec3 skyline(vec2 f){
  return skyGlow(f, HORIZON, HAZE, 0.8) + moonGlow(f, vec2(-5.3, 1.7), vec3(1.0, 0.9, 0.75));
}

vec3 gondolaColor(float idx){
  return 0.55 + 0.45 * cos(6.2832 * (idx / 12.0 + vec3(0.0, 0.33, 0.67)));
}

void skyWheel(vec3 p, inout float best){
  vec3 lp = p - WHEEL_C;
  float bb = length(lp) - WHEEL_R - 0.2;
  if (bb > CULL) { take(bb, best, RIM, 1.0); return; }
  float rot = uTime * 0.12;
  float rr = length(lp.xy);
  float a = atan(lp.y, lp.x) + rot;
  float zr = abs(lp.z) - 0.05;
  float rim = min(length(vec2(rr - WHEEL_R, zr)) - 0.016, length(vec2(rr - WHEEL_R + 0.08, zr)) - 0.01);
  take(min(rim, length(lp) - 0.07), best, RIM, 1.0);
  float s = 6.2832 / 16.0;
  float ar = mod(a + s * 0.5, s) - s * 0.5;
  float spoke = max(length(vec2(rr * sin(ar), zr)) - 0.006, rr - WHEEL_R);
  take(spoke, best, RIM * 0.7, 0.6);
  float g = 6.2832 / 12.0;
  float idx = floor((a + g * 0.5) / g);
  float ca = idx * g - rot;
  vec3 c = vec3(cos(ca) * WHEEL_R, sin(ca) * WHEEL_R - 0.08, 0.0);
  take(sdRBox(lp - c, vec3(0.06, 0.07, 0.07), 0.035), best, gondolaColor(mod(idx, 12.0)), 1.0);
}

void beacons(vec3 p, inout float best){
  float d = length(p - vec3(1.3, 2.33, -2.4));
  d = min(d, length(p - vec3(2.4, 1.68, -2.3)));
  d = min(d, length(p - vec3(-0.25, 1.05, -2.1))) - 0.03;
  float on = step(0.6, fract(uTime * 0.5));
  take(d, best, vec3(1.0, 0.15, 0.1), 1.4 * on);
}

void liveScene(vec3 p, inout float best){
  skyWheel(p, best);
  roundTree(p, vec3(5.7, GROUND, 0.4), 1.3, 0.75, 0.0, LEAF, best);
  roundTree(p, vec3(4.55, GROUND, 0.9), 0.9, 0.5, 2.0, LEAF, best);
  roundTree(p, vec3(-5.7, GROUND, 0.5), 1.1, 0.6, 4.0, LEAF, best);
  stringLights(p, vec3(0.4, GROUND + 0.9, -0.9), vec3(2.05, GROUND + 0.95, -0.9), 0.2, 0.0, best);
  stringLights(p, vec3(2.05, GROUND + 0.95, -0.9), vec3(3.7, GROUND + 0.9, -0.9), 0.2, 2.0, best);
  stringLights(p, vec3(3.7, GROUND + 0.9, -0.9), vec3(4.55, GROUND + 0.8, 0.7), 0.15, 4.0, best);
  stringLights(p, vec3(4.55, GROUND + 0.8, 0.7), vec3(5.7, GROUND + 1.05, 0.4), 0.18, 6.0, best);
  if (!gMirror) beacons(p, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const ATLANTA_SCENE = buildScene(-0.8, `${SCENE_PARTS}${ATLANTA_SOURCE}`);
