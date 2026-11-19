import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const MYRTLE_BEACH_SOURCE = `
const vec3 FRAME = vec3(0.75, 0.8, 1.0);
const vec3 PIER = vec3(0.9, 0.7, 0.5);
const vec3 SURF = vec3(0.4, 0.85, 1.0);
const vec3 PALM = vec3(0.35, 0.95, 0.6);
const vec3 SKY_C = vec3(2.9, -0.45, -1.7);
const float SKY_R = 0.88;

float wheelStand(vec3 p){
  vec3 lp = p - SKY_C;
  float bb = sdBox(lp - vec3(0.0, -0.6, 0.0), vec3(0.8, 0.7, 0.4));
  if (bb > CULL) return bb;
  vec3 s = vec3(abs(lp.x), lp.y, abs(lp.z));
  float legs = sdSeg(s, vec3(0.0, 0.0, 0.12), vec3(0.6, GROUND - SKY_C.y, 0.25), 0.03);
  float hub = sdCylZ(lp, 0.08, 0.16);
  float base = sdRBox(lp - vec3(0.0, GROUND - SKY_C.y + 0.08, 0.0), vec3(0.75, 0.08, 0.3), 0.02);
  return min(min(legs, hub), base);
}

float pier(vec3 p){
  vec3 lp = p - vec3(-4.6, GROUND, -1.5);
  float bb = sdBox(lp - vec3(0.0, 0.35, 0.0), vec3(1.6, 0.6, 0.3));
  if (bb > CULL) return bb;
  float deck = sdRBox(lp - vec3(0.0, 0.42, 0.0), vec3(1.5, 0.025, 0.18), 0.01);
  float px = lp.x - 0.3 * clamp(floor(lp.x / 0.3 + 0.5), -5.0, 5.0);
  float piles = sdBox(vec3(px, lp.y - 0.2, abs(lp.z) - 0.15), vec3(0.018, 0.22, 0.018));
  float rail = max(length(vec2(lp.y - 0.6, abs(lp.z) - 0.17)) - 0.008, abs(lp.x) - 1.5);
  float posts = sdBox(vec3(lp.x - 0.15 * floor(lp.x / 0.15 + 0.5), lp.y - 0.52, abs(lp.z) - 0.17), vec3(0.006, 0.08, 0.006));
  posts = max(posts, abs(lp.x) - 1.5);
  return min(min(deck, piles), min(rail, posts));
}

float pierLamps(vec3 p){
  vec3 lp = p - vec3(-4.6, GROUND, -1.5);
  float lx = lp.x - 0.75 * clamp(floor(lp.x / 0.75 + 0.5), -2.0, 2.0);
  return length(vec3(lx, lp.y - 0.82, lp.z - 0.17)) - 0.03;
}

void staticScene(vec3 p, inout float best){
  take(wheelStand(p), best, FRAME, 0.9);
  take(pier(p), best, PIER, 0.85);
  take(pierLamps(p), best, vec3(1.0, 0.8, 0.5), 1.3);
  storefronts(p, 0.3, 1.98, -2.3, 11.0, best);
  storefronts(p, 3.85, 6.65, -2.2, 13.0, best);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.55, 0.4), 2.9) + moonGlow(f, vec2(-5.2, 1.6), vec3(1.0, 0.9, 0.75));
}

vec3 ledColor(float a){
  return 0.55 + 0.45 * cos(6.2832 * (a * 0.16 + uTime * 0.12) + vec3(0.0, 2.1, 4.2));
}

void skyWheel(vec3 p, inout float best){
  vec3 lp = p - SKY_C;
  float bb = sdBox(lp, vec3(SKY_R + 0.25, SKY_R + 0.25, 0.3));
  if (bb > CULL) { take(bb, best, FRAME, 1.0); return; }
  float rot = uTime * 0.12;
  float c = cos(rot);
  float s = sin(rot);
  vec2 q = vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y);
  float r = length(q);
  float a = atan(q.y, q.x);
  float rim = length(vec2(r - SKY_R, abs(lp.z) - 0.07)) - 0.014;
  float sector = 6.2832 / 16.0;
  float spokeSector = sector * 2.0;
  float sa = mod(a + spokeSector * 0.5, spokeSector) - spokeSector * 0.5;
  float spokes = max(max(abs(sin(sa) * r) - 0.004, abs(lp.z) - 0.004), r - SKY_R);
  take(rim, best, ledColor(floor((a + 3.1416) / sector)), 1.15);
  take(spokes, best, FRAME, 0.45);
  float ang = floor(a / sector + 0.5) * sector - rot;
  vec3 gc = vec3(cos(ang) * (SKY_R + 0.12), sin(ang) * (SKY_R + 0.12), 0.0);
  float gond = length((lp - gc) * vec3(1.0, 1.2, 1.0)) / 1.2 - 0.07;
  take(gond, best, vec3(0.9, 0.95, 1.0), 0.9);
}

void surf(vec3 p, inout float best){
  float region = max(abs(p.y - GROUND - 0.03) - 0.05, abs(p.z + 1.0) - 0.9);
  if (region > CULL) { take(region, best, SURF, 0.0); return; }
  float gap = max(-2.95 - p.x, p.x - 0.35);
  float d = 1e5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float z = -1.75 + fi * 0.4 + 0.08 * sin(uTime * 0.5 + fi * 1.7);
    float y = GROUND + 0.02 + 0.015 * sin(p.x * 3.0 - uTime * 0.9 + fi);
    d = min(d, length(vec2(p.y - y, p.z - z)) - 0.008);
  }
  float crest = 0.5 + 0.5 * sin(p.x * 1.3 - uTime * 0.8);
  take(max(d, -gap), best, SURF, 0.5 + 0.6 * crest);
}

void liveScene(vec3 p, inout float best){
  skyWheel(p, best);
  if (!gMirror) surf(p, best);
  take(palmTree(p, vec3(5.0, GROUND, 0.3), 1.9, 0.0), best, PALM, 0.85);
  take(palmTree(p, vec3(1.4, GROUND, 0.6), 1.5, 2.0), best, PALM, 0.85);
  take(palmTree(p, vec3(-3.6, GROUND, 0.5), 1.7, 4.0), best, PALM, 0.85);
  for (int i = 0; i < 4; i++) {
    float x = -6.1 + float(i) * 0.75;
    stringLights(p, vec3(x, GROUND + 0.84, -1.33), vec3(x + 0.75, GROUND + 0.84, -1.33), 0.08, float(i) * 2.0, best);
  }
  stringLights(p, vec3(3.9, GROUND + 0.85, -1.7), vec3(6.6, GROUND + 0.85, -1.7), 0.2, 9.0, best);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, -7.5, 7.5, SURF) * 0.7 + riverWater(f + vec2(0.41, 0.0), -6.5, -2.8, vec3(1.0, 0.7, 0.38)) * 0.5;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const MYRTLE_BEACH_SCENE = buildScene(0.5, `${SCENE_PARTS}${MYRTLE_BEACH_SOURCE}`);
