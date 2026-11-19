import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const AUGUSTA_SOURCE = `
const vec3 GREEN = vec3(0.3, 0.9, 0.5);
const vec3 AZALEA = vec3(1.0, 0.4, 0.75);
const vec3 BRICK = vec3(1.0, 0.55, 0.4);
const vec3 ROSE_BRICK = vec3(1.0, 0.52, 0.45);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 SPIRES_C = vec3(2.4, GROUND, -1.5);
const float WALK_Z = -0.25;
const vec3 GOLD_FLAG = vec3(1.0, 0.85, 0.3);
const vec3 PIN = vec3(4.4, GROUND, 0.55);

float mill(vec3 p){
  vec3 lp = p - vec3(-4.6, GROUND + 0.38, -2.0);
  float bb = sdBox(lp, vec3(1.1, 0.5, 0.4));
  if (bb > CULL) return bb;
  float body = sdRBox(lp, vec3(1.0, 0.38, 0.3), 0.03);
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -4.0, 4.0);
  float wy = lp.y - 0.05;
  vec3 wp = vec3(wx, wy, lp.z - 0.3);
  float win = min(sdBox(wp, vec3(0.06, 0.12, 0.05)), sdCylZ(wp - vec3(0.0, 0.12, 0.0), 0.06, 0.05));
  float roofLine = sdRBox(lp - vec3(0.0, 0.4, 0.0), vec3(1.04, 0.03, 0.33), 0.015);
  return min(max(body, -win), roofLine);
}

float millWindows(vec3 p){
  vec3 lp = p - vec3(-4.6, GROUND + 0.38, -2.0);
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -4.0, 4.0);
  vec3 wp = vec3(wx, lp.y - 0.05, lp.z - 0.28);
  return min(sdBox(wp, vec3(0.05, 0.11, 0.02)), sdCylZ(wp - vec3(0.0, 0.11, 0.0), 0.05, 0.02));
}

float chimney(vec3 p){
  vec3 base = vec3(-3.35, GROUND, -1.8);
  float bb = sdBox(p - vec3(base.x, 0.0, base.z), vec3(0.3, 1.6, 0.3));
  if (bb > CULL) return bb;
  float d = sdTaper(p, base, base + vec3(0.0, 2.55, 0.0), 0.13, 0.075);
  float y = p.y - base.y;
  float bands = sdTaper(p, base + vec3(0.0, 2.35, 0.0), base + vec3(0.0, 2.45, 0.0), 0.1, 0.1);
  return min(d, max(bands, abs(y - 2.4) - 0.05));
}

float sacredHeart(vec3 p){
  vec3 lp = p - SPIRES_C;
  float bb = sdBox(lp - vec3(0.0, 1.1, 0.0), vec3(0.8, 1.4, 0.5));
  if (bb > CULL) return bb;
  float nave = sdRBox(lp - vec3(0.0, 0.42, -0.1), vec3(0.42, 0.42, 0.35), 0.02);
  vec3 g = lp - vec3(0.0, 0.84, 0.2);
  float gable = max(max(abs(g.x) * 0.8 + g.y - 0.3, -g.y), abs(g.z) - 0.05);
  vec3 t = vec3(abs(lp.x) - 0.45, lp.y, lp.z - 0.15);
  float tower = sdRBox(t - vec3(0.0, 0.62, 0.0), vec3(0.14, 0.62, 0.14), 0.02);
  float belfry = sdBox(vec3(t.x, t.y - 1.1, t.z - 0.14), vec3(0.05, 0.09, 0.03));
  float spire = sdTaper(t, vec3(0.0, 1.24, 0.0), vec3(0.0, 1.95, 0.0), 0.13, 0.008);
  float door = sdCylZ(lp - vec3(0.0, 0.2, 0.25), 0.11, 0.04);
  float rose = abs(length(lp.xy - vec2(0.0, 0.6)) - 0.1) - 0.012;
  rose = max(rose, abs(lp.z - 0.25) - 0.03);
  return min(min(max(min(nave, tower), -min(belfry, door)), gable), min(spire, rose));
}

float spireWindows(vec3 p){
  vec3 lp = p - SPIRES_C;
  vec3 t = vec3(abs(lp.x) - 0.45, lp.y, lp.z - 0.15);
  float belfry = sdBox(vec3(t.x, t.y - 1.1, t.z - 0.13), vec3(0.04, 0.08, 0.02));
  float door = sdCylZ(lp - vec3(0.0, 0.2, 0.22), 0.09, 0.02);
  return min(belfry, door);
}

float riverwalk(vec3 p){
  float bb = max(abs(p.z - WALK_Z) - 0.3, p.y - GROUND - 1.1);
  if (bb > CULL) return bb;
  float rail = max(length(vec2(p.y - GROUND - 0.22, p.z - WALK_Z)) - 0.008, max(0.45 - p.x, p.x - 6.2));
  rail = min(rail, max(length(vec2(p.y - GROUND - 0.22, p.z - WALK_Z)) - 0.008, max(-6.2 - p.x, p.x + 2.75)));
  float lx = p.x - 1.1 * clamp(floor((p.x - 0.75) / 1.1 + 0.5), 0.0, 4.0) - 0.75;
  float posts = sdTaper(vec3(lx, p.y, p.z - WALK_Z), vec3(0.0, GROUND, 0.0), vec3(0.0, GROUND + 0.85, 0.0), 0.025, 0.012);
  return min(rail, posts);
}

float walkLamps(vec3 p){
  float lx = p.x - 1.1 * clamp(floor((p.x - 0.75) / 1.1 + 0.5), 0.0, 4.0) - 0.75;
  return sdRBox(vec3(lx, p.y - GROUND - 0.92, p.z - WALK_Z), vec3(0.045, 0.07, 0.045), 0.02);
}

float green(vec3 p){
  vec3 lp = p - vec3(PIN.x, GROUND - 0.08, PIN.z);
  float bb = sdBox(lp, vec3(1.3, 0.3, 0.8));
  if (bb > CULL) return bb;
  vec3 r = vec3(1.1, 0.22, 0.69);
  float k0 = length(lp / r);
  float k1 = length(lp / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

float azaleas(vec3 p){
  float bb = max(abs(p.z - 0.85) - 0.6, p.y - GROUND - 0.6);
  if (bb > CULL) return bb;
  float d = 1e5;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float x = fi < 3.5 ? 1.0 + fi * 0.35 : 3.3 + fi * 0.38;
    vec3 c = vec3(x, GROUND + 0.12 + 0.05 * hash(fi), 0.8 + 0.2 * hash(fi + 3.0));
    d = smin(d, length((p - c) * vec3(1.0, 1.4, 1.0)) / 1.4 - 0.17, 0.08);
  }
  return d + 0.012 * sin(p.x * 31.0) * sin(p.y * 27.0) * sin(p.z * 23.0);
}

void staticScene(vec3 p, inout float best){
  take(mill(p), best, BRICK * 0.9, 0.9);
  take(millWindows(p), best, WARM, 1.2);
  take(chimney(p), best, BRICK, 1.0);
  take(sacredHeart(p), best, ROSE_BRICK, 1.2);
  take(spireWindows(p), best, WARM, 1.3);
  take(riverwalk(p), best, vec3(0.8, 0.75, 0.7), 0.6);
  take(walkLamps(p), best, WARM, 1.4);
  take(green(p), best, GREEN, 0.7);
  take(azaleas(p), best, AZALEA, 0.9);
  take(sdSeg(p, PIN, PIN + vec3(0.0, 1.05, 0.0), 0.01), best, vec3(0.95), 0.8);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.55, 0.4), 2.0) + moonGlow(f, vec2(4.9, 1.8), vec3(1.0, 0.9, 0.75));
}

void pinFlag(vec3 p, inout float best){
  vec3 f = p - (PIN + vec3(0.0, 0.92, 0.0));
  float bb = sdBox(f - vec3(0.2, 0.0, 0.0), vec3(0.35, 0.25, 0.25));
  if (bb > CULL) { take(bb, best, GOLD_FLAG, 1.0); return; }
  float u = clamp(f.x, 0.0, 0.32);
  float wave = 0.04 * sin(u * 12.0 - uTime * 3.0) * u * 3.0;
  take(sdBox(vec3(f.x - 0.16, f.y + 0.02 * u, f.z - wave), vec3(0.16, 0.1, 0.006)), best, GOLD_FLAG, 1.1);
}

void liveScene(vec3 p, inout float best){
  pinFlag(p, best);
  for (int i = 0; i < 4; i++) {
    float x = 0.75 + float(i) * 1.1;
    stringLights(p, vec3(x, GROUND + 0.86, WALK_Z), vec3(x + 1.1, GROUND + 0.86, WALK_Z), 0.14, float(i), best);
  }
  roundTree(p, vec3(5.8, GROUND, 0.3), 1.3, 0.75, 0.0, vec3(0.35, 0.85, 0.55), best);
  roundTree(p, vec3(-5.6, GROUND, 0.6), 1.0, 0.6, 3.0, vec3(0.35, 0.85, 0.55), best);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, -7.0, 7.0, vec3(0.55, 0.8, 1.0)) + riverWater(f + vec2(0.37, 0.0), 0.3, 5.4, WARM) * 0.6;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const AUGUSTA_SCENE = buildScene(-0.15, `${SCENE_PARTS}${AUGUSTA_SOURCE}`);
