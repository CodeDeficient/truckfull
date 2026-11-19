import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const SAVANNAH_SOURCE = `
const vec3 FOUNTAIN = vec3(0.75, 0.85, 1.0);
const vec3 WATER = vec3(0.45, 0.9, 1.0);
const vec3 GOLD = vec3(1.0, 0.78, 0.35);
const vec3 HALL = vec3(0.7, 0.72, 1.0);
const vec3 OAK = vec3(0.35, 0.85, 0.5);
const vec3 MOSS = vec3(0.7, 0.8, 0.72);
const vec3 LAMP = vec3(1.0, 0.8, 0.5);
const vec3 FOUNT_C = vec3(2.3, GROUND, 0.1);

float fountain(vec3 p){
  vec3 lp = p - FOUNT_C;
  float bb = sdBox(lp - vec3(0.0, 0.6, 0.0), vec3(1.05, 0.75, 1.05));
  if (bb > CULL) return bb;
  float rim = length(vec2(length(lp.xz) - 0.9, lp.y - 0.1)) - 0.035;
  float basin = max(sdCylY(lp - vec3(0.0, 0.04, 0.0), 0.9, 0.04), -sdCylY(lp - vec3(0.0, 0.08, 0.0), 0.86, 0.04));
  float stem = sdTaper(lp, vec3(0.0), vec3(0.0, 1.0, 0.0), 0.1, 0.05);
  vec3 b1 = lp - vec3(0.0, 0.58, 0.0);
  float bowl1 = max(length(b1 * vec3(1.0, 3.0, 1.0)) / 3.0 - 0.16, b1.y - 0.01);
  vec3 b2 = lp - vec3(0.0, 1.03, 0.0);
  float bowl2 = max(length(b2 * vec3(1.0, 3.0, 1.0)) / 3.0 - 0.1, b2.y - 0.01);
  float figure = min(sdTaper(lp, vec3(0.0, 1.05, 0.0), vec3(0.0, 1.3, 0.0), 0.04, 0.025), length(lp - vec3(0.0, 1.34, 0.0)) - 0.035);
  return min(min(min(rim, basin), stem), min(min(bowl1, bowl2), figure));
}

float cityHall(vec3 p){
  vec3 lp = p - vec3(-3.75, GROUND, -2.3);
  float bb = sdBox(lp - vec3(0.0, 0.9, 0.0), vec3(0.75, 1.2, 0.55));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, 0.5, 0.0), vec3(0.6, 0.5, 0.4), 0.03);
  float wx = lp.x - 0.2 * clamp(floor(lp.x / 0.2 + 0.5), -2.0, 2.0);
  float wy = lp.y - 0.3 - 0.35 * clamp(floor((lp.y - 0.3) / 0.35 + 0.5), 0.0, 1.0);
  vec3 wp = vec3(wx, wy, lp.z - 0.4);
  float win = min(sdBox(wp, vec3(0.05, 0.1, 0.05)), sdCylZ(wp - vec3(0.0, 0.1, 0.0), 0.05, 0.05));
  float drum = sdCylY(lp - vec3(0.0, 1.12, 0.0), 0.28, 0.12);
  return min(max(body, -win), drum);
}

float hallDome(vec3 p){
  vec3 lp = p - vec3(-3.75, GROUND + 1.24, -2.3);
  float bb = sdBox(lp - vec3(0.0, 0.3, 0.0), vec3(0.45, 0.5, 0.45));
  if (bb > CULL) return bb;
  float dome = max((length(lp * vec3(1.0, 0.8, 1.0)) - 0.3) * 0.8, -lp.y);
  float lantern = sdCylY(lp - vec3(0.0, 0.42, 0.0), 0.06, 0.07);
  return min(dome, min(lantern, sdTaper(lp, vec3(0.0, 0.48, 0.0), vec3(0.0, 0.68, 0.0), 0.02, 0.004)));
}

float lamps(vec3 p){
  float bb = max(abs(p.z - 0.7) - 0.3, p.y - GROUND - 1.2);
  if (bb > CULL) return bb;
  float d = 1e5;
  for (int i = 0; i < 2; i++) {
    vec3 base = vec3(i == 0 ? 0.75 : 3.95, GROUND, 0.7);
    d = min(d, sdTaper(p, base, base + vec3(0.0, 0.85, 0.0), 0.03, 0.015));
  }
  return d;
}

float lampGlass(vec3 p){
  vec3 a = p - vec3(0.75, GROUND + 0.93, 0.7);
  vec3 b = p - vec3(3.95, GROUND + 0.93, 0.7);
  return min(sdRBox(a, vec3(0.05, 0.08, 0.05), 0.02), sdRBox(b, vec3(0.05, 0.08, 0.05), 0.02));
}

void staticScene(vec3 p, inout float best){
  take(fountain(p), best, FOUNTAIN, 0.85);
  take(cityHall(p), best, HALL, 0.9);
  take(hallDome(p), best, GOLD, 1.2);
  take(lamps(p), best, vec3(0.6, 0.6, 0.75), 0.6);
  take(lampGlass(p), best, LAMP, 1.3);
  take(tower(p, -2.75, 0.3, -0.55, -2.5), best, vec3(1.0, 0.62, 0.45), 0.9);
  take(tower(p, 0.4, 0.32, -0.35, -2.6), best, vec3(0.55, 0.65, 1.0), 0.9);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.3, 0.3, 0.5), vec3(1.0, 0.6, 0.35), 1.0) + moonGlow(f, vec2(-5.0, 1.75), vec3(0.85, 0.88, 1.0));
}

void cascades(vec3 p, inout float best){
  vec3 lp = p - FOUNT_C;
  float bb = sdBox(lp - vec3(0.0, 0.8, 0.0), vec3(0.55, 0.8, 0.55));
  if (bb > CULL) { take(bb, best, WATER, 1.0); return; }
  float r = length(lp.xz);
  float a = atan(lp.z, lp.x);
  float lane = floor(a * 5.0);
  float pulse = smoothstep(0.5, 1.0, fract(lp.y * 3.0 + uTime * 1.5 + hash(lane) * 3.0));
  float th = 0.003 + 0.006 * pulse;
  float low = max(abs(r - 0.47) - th, max(lp.y - 0.55, 0.12 - lp.y));
  float high = max(abs(r - 0.29) - th, max(lp.y - 1.0, 0.62 - lp.y));
  float jet = max(length(lp.xz) - 0.012 - 0.01 * pulse, max(lp.y - 1.55, 1.36 - lp.y));
  take(min(min(low, high), jet), best, WATER, 0.75);
}

void mossOak(vec3 p, vec3 base, float side, inout float best){
  roundTree(p, base, 1.25, 0.9, side, OAK, best);
  float bb = sdBox(p - (base + vec3(0.0, 0.9, 0.0)), vec3(1.1, 0.7, 0.6));
  if (bb > CULL) return;
  float moss = 1e5;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 a = base + vec3(-0.85 + fi * 0.28, 1.1 + 0.08 * sin(fi * 1.9), 0.35);
    float len = 0.3 + 0.35 * hash(fi + side);
    vec3 tip = a + vec3(0.05 * sin(uTime * 0.7 + fi * 1.3), -len, 0.0);
    moss = min(moss, sdTaper(p, a, tip, 0.016, 0.002));
  }
  take(moss, best, MOSS, 0.75);
}

void liveScene(vec3 p, inout float best){
  cascades(p, best);
  mossOak(p, vec3(5.4, GROUND, 0.2), 1.0, best);
  mossOak(p, vec3(-5.5, GROUND, 0.4), 5.0, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const SAVANNAH_SCENE = buildScene(-0.3, `${SCENE_PARTS}${SAVANNAH_SOURCE}`);
