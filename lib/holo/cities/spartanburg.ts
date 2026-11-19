import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const SPARTANBURG_SOURCE = `
const vec3 DEPOT = vec3(1.0, 0.65, 0.45);
const vec3 HUB = vec3(1.0, 0.8, 0.35);
const vec3 TOWER = vec3(1.0, 0.62, 0.5);
const vec3 RAIL = vec3(0.6, 0.62, 0.8);
const vec3 TRAIN = vec3(0.45, 0.75, 1.0);
const vec3 LEAF = vec3(0.35, 0.85, 0.5);
const float TRACK_Z = -1.45;
const vec3 DEPOT_C = vec3(2.7, GROUND, -2.2);
const vec3 CLOCK_C = vec3(-4.75, GROUND, -0.5);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 SIGNAL = vec3(0.75, GROUND, -0.95);

float depot(vec3 p){
  vec3 lp = p - DEPOT_C;
  float bb = sdBox(lp - vec3(0.0, 0.6, 0.0), vec3(1.0, 0.9, 0.5));
  if (bb > CULL) return bb;
  float body = sdRBox(lp - vec3(0.0, 0.25, 0.0), vec3(0.85, 0.25, 0.32), 0.02);
  float wx = lp.x - 0.24 * clamp(floor(lp.x / 0.24 + 0.5), -3.0, 3.0);
  float win = sdBox(vec3(wx, lp.y - 0.25, lp.z - 0.32), vec3(0.06, 0.12, 0.05));
  vec3 r = lp - vec3(0.0, 0.5, 0.0);
  float roof = max(abs(r.z) * 0.7 + r.y - 0.2, -r.y);
  roof = max(abs(roof) - 0.012, abs(r.x) - 0.95);
  return min(max(body, -win), roof);
}

float hubSign(vec3 p){
  vec3 lp = p - (DEPOT_C + vec3(0.0, 1.05, 0.0));
  float bb = sdBox(lp, vec3(0.45, 0.45, 0.2));
  if (bb > CULL) return bb;
  float r = length(lp.xy);
  float rim = length(vec2(r - 0.3, lp.z)) - 0.018;
  float a = atan(lp.y, lp.x);
  float sector = 0.7854;
  float sa = mod(a + sector * 0.5, sector) - sector * 0.5;
  float spokes = max(length(vec2(sin(sa) * r, lp.z)) - 0.01, r - 0.3);
  float hub = length(lp) - 0.05;
  float post = sdSeg(lp, vec3(0.0, -0.45, 0.0), vec3(0.0, -0.3, 0.0), 0.02);
  return min(min(rim, spokes), min(hub, post));
}

float clockTower(vec3 p){
  vec3 lp = p - CLOCK_C;
  float bb = sdBox(lp - vec3(0.0, 0.85, 0.0), vec3(0.4, 1.0, 0.4));
  if (bb > CULL) return bb;
  float shaft = sdRBox(lp - vec3(0.0, 0.6, 0.0), vec3(0.17, 0.6, 0.17), 0.02);
  float head = sdRBox(lp - vec3(0.0, 1.32, 0.0), vec3(0.24, 0.13, 0.24), 0.02);
  float roof = sdTaper(lp, vec3(0.0, 1.45, 0.0), vec3(0.0, 1.72, 0.0), 0.2, 0.01);
  float base = sdRBox(lp - vec3(0.0, 0.08, 0.0), vec3(0.28, 0.08, 0.28), 0.02);
  return min(min(shaft, head), min(roof, base));
}

float clockFace(vec3 p){
  vec3 lp = p - CLOCK_C - vec3(0.0, 1.32, 0.24);
  return max(length(lp.xy) - 0.1, abs(lp.z) - 0.015);
}

float tracks(vec3 p){
  float bb = abs(p.y - GROUND - 0.03) - 0.1;
  if (bb > CULL) return bb;
  float rails = length(vec2(p.y - GROUND - 0.04, abs(p.z - TRACK_Z) - 0.1)) - 0.01;
  float tx = p.x - 0.18 * floor(p.x / 0.18 + 0.5);
  float ties = sdBox(vec3(tx, p.y - GROUND - 0.01, p.z - TRACK_Z), vec3(0.025, 0.01, 0.17));
  return min(rails, ties);
}

float signalPost(vec3 p){
  vec3 lp = p - SIGNAL;
  float bb = sdBox(lp - vec3(0.0, 0.5, 0.0), vec3(0.35, 0.6, 0.2));
  if (bb > CULL) return bb;
  float post = sdSeg(lp, vec3(0.0), vec3(0.0, 0.95, 0.0), 0.018);
  vec3 x = lp - vec3(0.0, 0.85, 0.0);
  float c1 = sdBox(vec3((x.x + x.y) * 0.707, (x.y - x.x) * 0.707, x.z), vec3(0.16, 0.018, 0.01));
  float c2 = sdBox(vec3((x.x - x.y) * 0.707, (x.y + x.x) * 0.707, x.z), vec3(0.16, 0.018, 0.01));
  float bar = sdRBox(lp - vec3(0.0, 0.58, 0.0), vec3(0.2, 0.02, 0.02), 0.01);
  return min(min(post, bar), min(c1, c2));
}

void staticScene(vec3 p, inout float best){
  take(depot(p), best, DEPOT, 0.9);
  take(hubSign(p), best, HUB, 1.15);
  take(clockTower(p), best, TOWER, 0.95);
  take(clockFace(p), best, vec3(1.0, 0.92, 0.7), 1.4);
  storefronts(p, -6.4, -2.95, -2.1, 3.0, best);
  storefronts(p, 3.85, 6.6, -2.1, 9.0, best);
  take(tracks(p), best, RAIL, 0.6);
  take(signalPost(p), best, vec3(0.9, 0.9, 0.95), 0.8);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.6, 0.35), 2.7) + moonGlow(f, vec2(-5.1, 1.8), vec3(0.85, 0.88, 1.0));
}

void train(vec3 p, inout float best){
  float region = max(abs(p.z - TRACK_Z) - 0.3, abs(p.y - GROUND - 0.25) - 0.35);
  if (region > CULL) { take(region, best, TRAIN, 0.0); return; }
  float span = 18.0;
  float head = mod(uTime * 0.5, span) - span * 0.5;
  float lx = p.x - head;
  vec3 q = vec3(lx, p.y - GROUND, p.z - TRACK_Z);
  float car = clamp(floor(-q.x / 0.82), 0.0, 3.0);
  vec3 c = q + vec3(0.41 + car * 0.82, 0.0, 0.0);
  float body = sdRBox(c - vec3(0.0, 0.24, 0.0), vec3(0.37, 0.14, 0.13), 0.03);
  float wx = c.x - 0.12 * clamp(floor(c.x / 0.12 + 0.5), -2.0, 2.0);
  float win = sdBox(vec3(wx, c.y - 0.28, abs(c.z) - 0.13), vec3(0.035, 0.04, 0.03));
  float wheels = sdCylZ(vec3(abs(c.x) - 0.24, c.y - 0.07, abs(c.z) - 0.1), 0.05, 0.012);
  take(min(max(body, -win), wheels), best, TRAIN, 1.0);
  take(length(q - vec3(0.0, 0.2, 0.0)) - 0.035, best, vec3(1.0, 0.95, 0.8), 1.5);
}

void crossingLights(vec3 p, inout float best){
  vec3 lp = p - SIGNAL - vec3(0.0, 0.66, 0.06);
  float bb = length(lp) - 0.4;
  if (bb > CULL) { take(bb, best, vec3(1.0, 0.1, 0.1), 0.0); return; }
  float t = step(0.5, fract(uTime * 0.8));
  take(length(lp - vec3(-0.17, 0.0, 0.0)) - 0.04, best, vec3(1.0, 0.12, 0.08), 1.5 * t);
  take(length(lp - vec3(0.17, 0.0, 0.0)) - 0.04, best, vec3(1.0, 0.12, 0.08), 1.5 * (1.0 - t));
}

void liveScene(vec3 p, inout float best){
  train(p, best);
  crossingLights(p, best);
  roundTree(p, vec3(5.4, GROUND, 0.3), 1.25, 0.75, 0.0, LEAF, best);
  roundTree(p, vec3(-6.0, GROUND, 0.2), 1.15, 0.7, 2.5, LEAF, best);
  roundTree(p, vec3(-3.5, GROUND, 0.2), 1.05, 0.62, 5.0, LEAF, best);
  stringLights(p, vec3(-6.0, GROUND + 0.95, 0.0), CLOCK_C + vec3(0.0, 1.15, 0.2), 0.25, 0.0, best);
  stringLights(p, CLOCK_C + vec3(0.0, 1.15, 0.2), vec3(-3.5, GROUND + 0.9, 0.0), 0.22, 3.0, best);
  stringLights(p, vec3(1.95, GROUND + 0.7, -1.9), vec3(3.45, GROUND + 0.7, -1.9), 0.15, 6.0, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const SPARTANBURG_SCENE = buildScene(-0.4, `${SCENE_PARTS}${SPARTANBURG_SOURCE}`);
