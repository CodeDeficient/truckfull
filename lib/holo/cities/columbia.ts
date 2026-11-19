import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const COLUMBIA_SOURCE = `
const vec3 CAPITOL = vec3(0.75, 0.8, 1.0);
const vec3 COPPER = vec3(0.4, 0.95, 0.75);
const vec3 BRIDGE = vec3(0.55, 0.7, 1.0);
const vec3 LAMP = vec3(1.0, 0.8, 0.5);
const vec3 PALMETTO = vec3(0.4, 0.95, 0.7);
const vec3 FLAG = vec3(0.3, 0.45, 1.0);
const vec3 HOUSE_C = vec3(2.2, 0.0, -1.6);
const vec3 POLE = vec3(0.75, GROUND, -0.5);

float capitolBody(vec3 p){
  vec3 lp = p - HOUSE_C;
  float bb = sdBox(lp - vec3(0.0, -1.0, 0.1), vec3(1.45, 0.6, 0.65));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, -1.03, 0.0), vec3(1.3, 0.47, 0.42), 0.03);
  float wx = lp.x - 0.2 * floor(lp.x / 0.2 + 0.5);
  float wy = lp.y + 1.2 - 0.25 * clamp(floor((lp.y + 1.2) / 0.25 + 0.5), 0.0, 2.0);
  float win = max(sdBox(vec3(wx, wy, lp.z - 0.42), vec3(0.04, 0.07, 0.03)), 0.6 - abs(lp.x));
  body = max(body, -win);
  float cx = lp.x - 0.16 * (clamp(floor(lp.x / 0.16), -3.0, 2.0) + 0.5);
  float cols = sdCylY(vec3(cx, lp.y + 1.05, lp.z - 0.52), 0.028, 0.42);
  float slab = sdRBox(lp - vec3(0.0, -0.6, 0.5), vec3(0.52, 0.035, 0.1), 0.01);
  vec3 r = lp - vec3(0.0, -0.565, 0.5);
  float ped = max(max(abs(r.x) * 0.35 + r.y - 0.17, -r.y), abs(r.z) - 0.08);
  return min(min(body, cols), min(slab, ped));
}

float capitolDome(vec3 p){
  vec3 lp = p - HOUSE_C;
  float bb = sdBox(lp - vec3(0.0, 0.1, 0.0), vec3(0.6, 0.8, 0.6));
  if (bb > CULL) return bb;
  float drum = sdCylY(lp - vec3(0.0, -0.32, 0.0), 0.4, 0.24);
  float a = atan(lp.z, lp.x);
  float flute = max(abs(fract(a * 2.546) - 0.5) * 0.4 - 0.03, 0.36 - length(lp.xz));
  drum = max(drum, -max(flute, abs(lp.y + 0.32) - 0.17));
  float band = sdCylY(lp - vec3(0.0, -0.06, 0.0), 0.45, 0.025);
  vec3 dp = (lp - vec3(0.0, -0.04, 0.0)) * vec3(1.0, 0.8, 1.0);
  float dome = max((length(dp) - 0.38) * 0.8, -(lp.y + 0.04));
  float lantern = sdCylY(lp - vec3(0.0, 0.37, 0.0), 0.08, 0.09);
  float spire = sdTaper(lp, vec3(0.0, 0.45, 0.0), vec3(0.0, 0.75, 0.0), 0.03, 0.005);
  return min(min(drum, band), min(min(dome, lantern), spire));
}

float gervais(vec3 p){
  vec3 lp = vec3(p.x + 5.05, p.y, p.z + 1.7);
  float bb = sdBox(lp - vec3(0.0, -1.0, 0.0), vec3(2.3, 0.65, 0.35));
  if (bb > CULL) return bb;
  float deckY = -0.75;
  float deck = sdRBox(lp - vec3(0.0, deckY, 0.0), vec3(2.1, 0.035, 0.12), 0.02);
  float ax = lp.x - 1.05 * (clamp(floor(lp.x / 1.05), -2.0, 1.0) + 0.5);
  float ay = lp.y - (GROUND + 0.05);
  float arch = max(abs(length(vec2(ax, ay * 0.75)) - 0.48) - 0.025, -ay);
  arch = max(arch, abs(lp.z) - 0.1);
  float px = lp.x - 1.05 * clamp(floor(lp.x / 1.05 + 0.5), -2.0, 2.0);
  float pier = sdBox(vec3(px, lp.y - (GROUND + deckY) * 0.5, lp.z), vec3(0.05, (deckY - GROUND) * 0.5, 0.11));
  return min(deck, min(arch, pier));
}

float riverBanks(vec3 p){
  vec3 lp = vec3(p.x + 5.05, p.y - GROUND, p.z + 1.7);
  float bb = sdBox(lp - vec3(0.0, 0.3, 0.0), vec3(2.8, 0.5, 0.6));
  if (bb > CULL) return bb;
  vec3 e = vec3(abs(lp.x) - 2.25, lp.y, lp.z);
  float bank = max(sdRBox(e, vec3(0.3, 0.75, 0.4), 0.12), -lp.y);
  bank = max(bank, lp.y - 0.75 + 0.35 * max(abs(lp.x) - 2.25, 0.0));
  return bank + 0.02 * sin(p.x * 11.0) * sin(p.y * 15.0);
}

float gervaisLamps(vec3 p){
  vec3 lp = vec3(p.x + 5.05, p.y, p.z + 1.6);
  float bb = sdBox(lp - vec3(0.0, -0.55, 0.0), vec3(2.2, 0.3, 0.2));
  if (bb > CULL) return bb;
  float lx = lp.x - 0.35 * clamp(floor(lp.x / 0.35 + 0.5), -6.0, 6.0);
  float post = sdSeg(vec3(lx, lp.y, lp.z), vec3(0.0, -0.75, 0.0), vec3(0.0, -0.5, 0.0), 0.008);
  return min(post, length(vec3(lx, lp.y + 0.47, lp.z)) - 0.028);
}

void staticScene(vec3 p, inout float best){
  take(capitolBody(p), best, CAPITOL, 0.9);
  take(capitolDome(p), best, COPPER, 1.1);
  take(gervais(p), best, BRIDGE, 1.0);
  take(riverBanks(p), best, vec3(0.7, 0.55, 0.55), 0.5);
  take(gervaisLamps(p), best, LAMP, 1.5);
  take(sdSeg(p, POLE, POLE + vec3(0.0, 1.45, 0.0), 0.012), best, CAPITOL, 0.8);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.55, 0.35), 2.0) + moonGlow(f, vec2(-5.3, 1.7), vec3(0.85, 0.88, 1.0));
}

void scFlag(vec3 p, inout float best){
  vec3 f = p - (POLE + vec3(0.0, 1.25, 0.0));
  float bb = sdBox(f - vec3(0.3, 0.0, 0.0), vec3(0.45, 0.3, 0.3));
  if (bb > CULL) { take(bb, best, FLAG, 1.0); return; }
  float u = clamp(f.x, 0.0, 0.5);
  float wave = 0.045 * sin(u * 9.0 - uTime * 2.6) * u * 2.0;
  vec3 q = vec3(f.x - 0.25, f.y + 0.03 * u, f.z - wave);
  take(sdBox(q, vec3(0.25, 0.15, 0.006)), best, FLAG, 1.0);
  vec2 m = vec2(f.x - 0.3, f.y + 0.03 * u + 0.01);
  float crescent = max(length(m - vec2(-0.15, 0.08)) - 0.04, -(length(m - vec2(-0.135, 0.095)) - 0.035));
  take(max(crescent, abs(q.z) - 0.012), best, vec3(1.0), 1.1);
}

void liveScene(vec3 p, inout float best){
  scFlag(p, best);
  take(palmTree(p, vec3(4.6, GROUND, 0.5), 1.7, 0.6), best, PALMETTO, 0.9);
  take(palmTree(p, vec3(5.55, GROUND, 0.2), 2.1, 2.1), best, PALMETTO, 0.9);
  take(palmTree(p, vec3(-6.2, GROUND, 0.6), 1.6, 4.0), best, PALMETTO, 0.9);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, -7.5, -3.0, vec3(0.55, 0.8, 1.0)) + riverWater(f + vec2(0.31, 0.0), -6.6, -3.2, LAMP) * 0.7;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const COLUMBIA_SCENE = buildScene(-0.3, `${SCENE_PARTS}${COLUMBIA_SOURCE}`);
