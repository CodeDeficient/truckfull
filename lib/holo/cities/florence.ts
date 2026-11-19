import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const FLORENCE_SOURCE = `
const vec3 FACADE = vec3(1.0, 0.6, 0.5);
const vec3 BLADE = vec3(1.0, 0.35, 0.45);
const vec3 BULB = vec3(1.0, 0.8, 0.45);
const vec3 CABIN = vec3(0.95, 0.75, 0.6);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 OAK = vec3(0.35, 0.85, 0.5);
const vec3 THEATRE_C = vec3(2.6, GROUND, -0.9);
const vec3 MARQUEE = vec3(1.0, 0.9, 0.72);
const vec3 CABIN_C = vec3(-4.6, GROUND, -1.2);

float theatre(vec3 p){
  vec3 lp = p - THEATRE_C;
  float bb = sdBox(lp - vec3(0.0, 0.9, 0.2), vec3(1.0, 1.1, 0.65));
  if (bb > CULL) return bb;
  float facade = sdRBox(lp - vec3(0.0, 0.62, 0.0), vec3(0.8, 0.62, 0.3), 0.02);
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -3.0, 3.0);
  float win = sdBox(vec3(wx, lp.y - 0.98, lp.z - 0.3), vec3(0.06, 0.1, 0.04));
  win = max(win, 0.14 - abs(lp.x));
  facade = max(facade, -win);
  float parapet = sdRBox(lp - vec3(0.0, 1.3, 0.0), vec3(0.35, 0.07, 0.3), 0.02);
  return min(facade, parapet);
}

float marquee(vec3 p){
  vec3 lp = p - THEATRE_C;
  return sdRBox(lp - vec3(0.0, 0.55, 0.45), vec3(0.62, 0.08, 0.16), 0.02);
}

float bladeSign(vec3 p){
  vec3 lp = p - THEATRE_C;
  return sdRBox(lp - vec3(-0.6, 1.15, 0.36), vec3(0.1, 0.45, 0.04), 0.02);
}

float theatreLights(vec3 p){
  vec3 lp = p - THEATRE_C;
  float wx = lp.x - 0.22 * clamp(floor(lp.x / 0.22 + 0.5), -3.0, 3.0);
  float win = max(sdBox(vec3(wx, lp.y - 0.98, lp.z - 0.28), vec3(0.05, 0.09, 0.02)), 0.14 - abs(lp.x));
  float doors = sdBox(lp - vec3(0.0, 0.2, 0.3), vec3(0.3, 0.19, 0.02));
  return min(win, doors);
}

float schoolhouse(vec3 p){
  vec3 lp = p - CABIN_C;
  float bb = sdBox(lp - vec3(0.0, 0.4, 0.0), vec3(0.6, 0.55, 0.45));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, 0.2, 0.0), vec3(0.42, 0.2, 0.28), 0.02);
  vec3 r = lp - vec3(0.0, 0.4, 0.0);
  float roof = max(abs(r.x) * 0.75 + r.y - 0.3, -r.y);
  roof = max(max(abs(roof) - 0.014, abs(r.z) - 0.33), abs(r.x) - 0.48);
  float stack = sdBox(lp - vec3(0.25, 0.62, -0.1), vec3(0.04, 0.12, 0.04));
  return min(min(body, roof), stack);
}

float schoolWindows(vec3 p){
  vec3 lp = p - CABIN_C;
  float wx = abs(lp.x) - 0.22;
  float win = sdBox(vec3(wx, lp.y - 0.22, lp.z - 0.28), vec3(0.06, 0.07, 0.02));
  float door = sdBox(vec3(lp.x, lp.y - 0.15, lp.z - 0.28), vec3(0.06, 0.13, 0.02));
  return min(win, door);
}

void staticScene(vec3 p, inout float best){
  take(theatre(p), best, FACADE, 0.95);
  take(theatreLights(p), best, WARM, 1.2);
  take(marquee(p), best, MARQUEE, 1.0);
  take(bladeSign(p), best, BLADE, 1.15);
  take(schoolhouse(p), best, CABIN, 0.9);
  take(schoolWindows(p), best, WARM, 1.3);
  storefronts(p, 3.7, 5.94, -2.1, 17.0, best);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.56, 0.38), 2.4) + moonGlow(f, vec2(-5.2, 1.75), vec3(1.0, 0.9, 0.75));
}

void marqueeBulbs(vec3 p, inout float best){
  vec3 lp = p - THEATRE_C;
  float bb = sdBox(lp - vec3(-0.1, 1.05, 0.5), vec3(0.85, 0.85, 0.3));
  if (bb > CULL) { take(bb, best, BULB, 0.0); return; }
  float ix = clamp(floor(lp.x / 0.1 + 0.5), -6.0, 6.0);
  float row = lp.y < 0.55 ? 0.47 : 0.63;
  float rowBulb = length(vec3(lp.x - 0.1 * ix, lp.y - row, lp.z - 0.62)) - 0.026;
  float rowOn = step(0.5, fract(ix * 0.25 - uTime * 1.2 + (row > 0.5 ? 0.5 : 0.0)));
  float iy = clamp(floor((lp.y - 0.75) / 0.1 + 0.5), 0.0, 8.0);
  float colBulb = length(vec3(abs(lp.x + 0.6) - 0.12, lp.y - 0.75 - 0.1 * iy, lp.z - 0.42)) - 0.026;
  float colOn = step(0.5, fract(iy * 0.25 - uTime * 1.2));
  take(rowBulb, best, BULB, 0.6 + 0.9 * rowOn);
  take(colBulb, best, BULB, 0.6 + 0.9 * colOn);
}

void liveScene(vec3 p, inout float best){
  marqueeBulbs(p, best);
  roundTree(p, vec3(-5.95, GROUND, 0.2), 1.2, 0.7, 0.0, OAK, best);
  roundTree(p, vec3(-3.45, GROUND, 0.1), 1.0, 0.58, 2.0, OAK, best);
  roundTree(p, vec3(5.3, GROUND, 0.4), 1.15, 0.65, 4.0, OAK, best);
  stringLights(p, vec3(-5.95, GROUND + 1.0, 0.0), vec3(-3.45, GROUND + 0.88, -0.05), 0.22, 0.0, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const FLORENCE_SCENE = buildScene(0.3, `${SCENE_PARTS}${FLORENCE_SOURCE}`);
