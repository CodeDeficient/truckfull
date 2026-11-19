import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const ANDERSON_SOURCE = `
const vec3 BRICK = vec3(1.0, 0.58, 0.45);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 GLASS = vec3(0.85, 0.9, 1.0);
const vec3 BRASS = vec3(1.0, 0.78, 0.45);
const vec3 FILAMENT = vec3(1.0, 0.62, 0.25);
const vec3 SAIL = vec3(1.0, 0.94, 0.88);
const vec3 HULL = vec3(0.6, 0.85, 1.0);
const vec3 LEAF = vec3(0.35, 0.85, 0.5);
const vec3 COURT_C = vec3(-4.5, GROUND, -1.8);
const vec3 BULB_C = vec3(1.5, GROUND, -0.5);
const float BULB_S = 1.35;

float courtWindows(vec3 lp, float z){
  float wx = lp.x - 0.2 * clamp(floor(lp.x / 0.2 + 0.5), -3.0, 3.0);
  vec3 wp = vec3(wx, lp.y - 0.4, lp.z - z);
  float win = min(sdBox(wp, vec3(0.05, 0.12, 0.04)), sdCylZ(wp - vec3(0.0, 0.12, 0.0), 0.05, 0.04));
  return max(win, 0.24 - abs(lp.x));
}

float courthouse(vec3 p){
  vec3 lp = p - COURT_C;
  float bb = sdBox(lp - vec3(0.0, 0.8, 0.0), vec3(0.95, 0.95, 0.45));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, 0.42, 0.0), vec3(0.8, 0.42, 0.32), 0.02);
  body = max(body, -courtWindows(lp, 0.32));
  float cornice = sdRBox(lp - vec3(0.0, 0.86, 0.0), vec3(0.84, 0.025, 0.35), 0.01);
  float tower = sdRBox(lp - vec3(0.0, 0.9, 0.05), vec3(0.17, 0.5, 0.17), 0.02);
  float dome = max(length(lp - vec3(0.0, 1.4, 0.05)) - 0.19, 1.4 - lp.y);
  float finial = sdTaper(lp, vec3(0.0, 1.58, 0.05), vec3(0.0, 1.75, 0.05), 0.025, 0.004);
  return min(min(body, cornice), min(tower, min(dome, finial)));
}

float courtLights(vec3 p){
  vec3 lp = p - COURT_C;
  float win = courtWindows(lp, 0.3) + 0.01;
  float clock = max(length(lp.xy - vec2(0.0, 1.18)) - 0.1, abs(lp.z - 0.22) - 0.015);
  return min(win, clock);
}

float bulbGlass(vec3 p){
  vec3 lp = (p - BULB_C) / BULB_S;
  float bb = sdBox(lp - vec3(0.0, 0.85, 0.0), vec3(0.45, 0.95, 0.45));
  if (bb > CULL) return bb * BULB_S;
  float globe = length(lp - vec3(0.0, 1.35, 0.0)) - 0.3;
  float neck = sdTaper(lp, vec3(0.0, 1.08, 0.0), vec3(0.0, 1.3, 0.0), 0.11, 0.24);
  float shell = abs(smin(globe, neck, 0.12)) - 0.01;
  return max(shell, 1.07 - lp.y) * BULB_S;
}

float bulbBase(vec3 p){
  vec3 lp = (p - BULB_C) / BULB_S;
  float bb = sdBox(lp - vec3(0.0, 0.55, 0.0), vec3(0.3, 0.6, 0.3));
  if (bb > CULL) return bb * BULB_S;
  float post = sdTaper(lp, vec3(0.0), vec3(0.0, 0.92, 0.0), 0.05, 0.03);
  float foot = sdRBox(lp - vec3(0.0, 0.05, 0.0), vec3(0.18, 0.05, 0.18), 0.02);
  float screw = sdCylY(lp - vec3(0.0, 1.0, 0.0), 0.11, 0.08) - 0.008;
  screw += 0.012 * sin(lp.y * 120.0);
  return min(min(post, foot), screw) * BULB_S;
}

void staticScene(vec3 p, inout float best){
  take(courthouse(p), best, BRICK, 1.0);
  take(courtLights(p), best, WARM, 1.25);
  take(bulbGlass(p), best, GLASS, 0.35);
  take(bulbBase(p), best, BRASS, 1.0);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.56, 0.38), 1.5) + moonGlow(f, vec2(-5.1, 1.8), vec3(1.0, 0.9, 0.75));
}

void filament(vec3 p, inout float best){
  vec3 lp = (p - BULB_C) / BULB_S - vec3(0.0, 1.35, 0.0);
  float bb = (length(lp) - 0.45) * BULB_S;
  if (bb > CULL) { take(bb, best, FILAMENT, 0.0); return; }
  float wire = 1e5;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x0 = -0.12 + fi * 0.08;
    wire = min(wire, sdSeg(lp, vec3(x0, 0.06 - mod(fi, 2.0) * 0.1, 0.0), vec3(x0 + 0.08, -0.04 + mod(fi, 2.0) * 0.1, 0.0), 0.012));
  }
  wire = min(wire, sdSeg(lp, vec3(-0.12, 0.06, 0.0), vec3(-0.06, -0.25, 0.0), 0.008));
  wire = min(wire, sdSeg(lp, vec3(0.2, 0.06, 0.0), vec3(0.06, -0.25, 0.0), 0.008));
  float flick = 0.92 + 0.08 * sin(uTime * 7.0) * sin(uTime * 2.3);
  take(wire * BULB_S, best, FILAMENT, 1.7 * flick);
}

void sailboat(vec3 p, vec3 base, float s, float seed, inout float best){
  vec3 lp = (p - base) / s;
  float bb = sdBox(lp - vec3(0.0, 0.5, 0.0), vec3(0.7, 0.7, 0.3));
  if (bb > CULL) { take(bb * s, best, SAIL, 0.0); return; }
  float rock = 0.05 * sin(uTime * 0.8 + seed);
  lp.y -= 0.02 * sin(uTime * 1.1 + seed);
  lp.xy = vec2(lp.x * cos(rock) - lp.y * sin(rock), lp.x * sin(rock) + lp.y * cos(rock));
  vec3 hp = lp - vec3(0.0, 0.1, 0.0);
  vec3 hr = vec3(0.52, 0.15, 0.2);
  float k0 = length(hp / hr);
  float hull = max(k0 * (k0 - 1.0) / length(hp / (hr * hr)), lp.y - 0.1);
  float mast = sdSeg(lp, vec3(0.0, 0.08, 0.0), vec3(0.0, 1.05, 0.0), 0.012);
  vec2 q = lp.xy;
  float mainSail = max(max(max(0.04 - q.x, 0.14 - q.y), dot(q - vec2(0.04, 1.0), vec2(0.886, 0.463))), q.y - 1.0);
  float jib = max(max(max(q.x + 0.04, 0.14 - q.y), dot(q - vec2(-0.04, 0.9), vec2(-0.908, 0.419))), q.y - 0.9);
  float sails = max(min(mainSail, jib), abs(lp.z) - 0.012);
  take(min(hull, mast) * s, best, HULL, 1.0);
  take(sails * s, best, SAIL, 0.85);
  take((length(lp - vec3(0.0, 1.08, 0.0)) - 0.025) * s, best, vec3(1.0, 0.3, 0.2), 1.3);
}

void liveScene(vec3 p, inout float best){
  filament(p, best);
  sailboat(p, vec3(3.6, GROUND, -0.9), 1.0, 0.0, best);
  sailboat(p, vec3(5.5, GROUND, -1.7), 0.8, 2.0, best);
  roundTree(p, vec3(-6.3, GROUND, 0.3), 1.1, 0.62, 1.0, LEAF, best);
  roundTree(p, vec3(-3.15, GROUND, 0.0), 0.9, 0.5, 3.0, LEAF, best);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, 2.3, 7.5, vec3(0.55, 0.8, 1.0)) + riverWater(f + vec2(0.35, 0.0), 2.8, 6.5, WARM) * 0.5;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const ANDERSON_SCENE = buildScene(0.35, `${SCENE_PARTS}${ANDERSON_SOURCE}`);
