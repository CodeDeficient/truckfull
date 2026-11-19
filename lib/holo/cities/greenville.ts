import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const GREENVILLE_SOURCE = `
const vec3 CABLE = vec3(0.85, 0.85, 1.0);
const vec3 ROCK = vec3(0.6, 0.5, 0.62);
const vec3 WATER = vec3(0.6, 0.92, 1.0);
const vec3 LEAF = vec3(0.4, 0.9, 0.55);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const float BRIDGE_Z = -0.9;
const float LEFT_X = 0.75;
const float RIGHT_X = 3.85;
const vec3 MAST_TOP = vec3(4.05, 0.75, -1.25);

float deckY(float x){
  return -0.62 + 0.12 * sin((x - LEFT_X) / (RIGHT_X - LEFT_X) * 3.1416);
}

float banks(vec3 p){
  float bb = sdBox(p - vec3(2.3, GROUND + 0.45, BRIDGE_Z), vec3(2.6, 0.6, 0.6));
  if (bb > CULL) return bb;
  vec3 l = p - vec3(LEFT_X - 0.35, GROUND, BRIDGE_Z);
  float left = length((l - vec3(0.0, 0.2, 0.0)) * vec3(0.9, 1.0, 1.2)) - 0.62;
  vec3 r = p - vec3(RIGHT_X + 0.4, GROUND, BRIDGE_Z);
  float right = length((r - vec3(0.0, 0.2, 0.0)) * vec3(0.9, 1.0, 1.2)) - 0.66;
  float ledges = 1e5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 c = vec3(1.4 + fi * 0.9, GROUND + 0.38 - fi * 0.11, BRIDGE_Z - 0.15);
    ledges = min(ledges, length((p - c) * vec3(0.8, 2.6, 1.4)) / 2.6 - 0.12);
  }
  float d = max(min(min(left, right), ledges), GROUND - p.y);
  return d + 0.025 * sin(p.x * 13.0) * sin(p.y * 17.0 + p.z * 5.0);
}

float liberty(vec3 p){
  float bb = sdBox(p - vec3(2.4, -0.4, BRIDGE_Z - 0.15), vec3(1.9, 1.3, 0.5));
  if (bb > CULL) return bb;
  float dy = p.y - deckY(p.x);
  float span = max(LEFT_X - 0.1 - p.x, p.x - RIGHT_X - 0.1);
  float deck = max(min(length(vec2(dy, p.z - BRIDGE_Z)) - 0.03, length(vec2(dy + 0.07, p.z - BRIDGE_Z)) - 0.014), span);
  float rail = max(length(vec2(dy - 0.12, p.z - BRIDGE_Z - 0.05)) - 0.008, span);
  float mast = sdTaper(p, vec3(RIGHT_X + 0.25, deckY(RIGHT_X), BRIDGE_Z - 0.2), MAST_TOP, 0.055, 0.025);
  float cables = 1e5;
  for (int i = 0; i < 9; i++) {
    float x = LEFT_X + 0.25 + float(i) * 0.33;
    cables = min(cables, sdSeg(p, MAST_TOP, vec3(x, deckY(x), BRIDGE_Z), 0.006));
  }
  return min(min(deck, rail), min(mast, cables));
}

float deckLamps(vec3 p){
  float lx = p.x - 0.42 * clamp(floor((p.x - LEFT_X) / 0.42 + 0.5), 0.0, 7.0) - LEFT_X;
  return length(vec3(lx, p.y - deckY(p.x) - 0.14, p.z - BRIDGE_Z - 0.05)) - 0.025;
}

void staticScene(vec3 p, inout float best){
  take(banks(p), best, ROCK, 0.45);
  take(liberty(p), best, CABLE, 0.95);
  take(deckLamps(p), best, WARM, 1.5);
  storefronts(p, -6.3, -3.1, -1.6, 4.0, best);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.6, 0.35), 2.3) + moonGlow(f, vec2(5.2, 1.8), vec3(1.0, 0.92, 0.8));
}

void falls(vec3 p, inout float best){
  vec3 lp = p - vec3(2.3, GROUND, BRIDGE_Z + 0.12);
  float bb = sdBox(lp - vec3(0.0, 0.25, 0.0), vec3(1.45, 0.35, 0.3));
  if (bb > CULL) { take(bb, best, WATER, 1.0); return; }
  float idx = floor(lp.x / 0.06 + 0.5);
  float wx = lp.x - 0.06 * idx;
  float lip = 0.42 - 0.11 * clamp((lp.x + 0.9) / 0.9, 0.0, 2.0);
  float pulse = smoothstep(0.6, 1.0, fract(lp.y * 2.2 + uTime * 1.3 + hash(idx) * 3.0));
  float streak = length(vec2(wx, lp.z)) - (0.005 + 0.012 * pulse);
  streak = max(streak, max(lp.y - lip, abs(lp.x) - 1.3));
  float foam = length((lp - vec3(0.0, 0.03, 0.15)) * vec3(0.75, 5.0, 2.0)) / 5.0 - 0.06;
  foam += 0.01 * sin(lp.x * 40.0 + uTime * 3.0);
  take(min(streak, foam), best, WATER, 1.35);
}

void liveScene(vec3 p, inout float best){
  falls(p, best);
  roundTree(p, vec3(-5.7, GROUND, -0.6), 1.15, 0.65, 0.0, LEAF, best);
  roundTree(p, vec3(-4.35, GROUND, -0.6), 1.05, 0.6, 2.0, LEAF, best);
  roundTree(p, vec3(-3.05, GROUND, -0.6), 1.1, 0.6, 4.0, LEAF, best);
  stringLights(p, vec3(-5.7, GROUND + 0.95, -0.4), vec3(-4.35, GROUND + 0.9, -0.4), 0.22, 0.0, best);
  stringLights(p, vec3(-4.35, GROUND + 0.9, -0.4), vec3(-3.05, GROUND + 0.92, -0.4), 0.22, 3.0, best);
  roundTree(p, vec3(5.5, GROUND, 0.3), 1.3, 0.75, 1.0, LEAF, best);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, 0.2, 7.0, WATER) + riverWater(f + vec2(0.29, 0.0), 0.6, 4.5, WARM) * 0.5;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const GREENVILLE_SCENE = buildScene(0.2, `${SCENE_PARTS}${GREENVILLE_SOURCE}`);
