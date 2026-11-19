import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const NORTH_CHARLESTON_SOURCE = `
const vec3 OAK = vec3(0.4, 0.88, 0.5);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 SHELTER = vec3(0.95, 0.8, 0.65);

float shelter(vec3 p){
  vec3 lp = p - vec3(4.6, GROUND, -0.4);
  float bb = sdBox(lp - vec3(0.0, 0.5, 0.0), vec3(0.9, 0.7, 0.6));
  if (bb > CULL) return bb;
  vec3 s = vec3(abs(lp.x), lp.y, abs(lp.z));
  float posts = sdSeg(s, vec3(0.6, 0.0, 0.35), vec3(0.6, 0.62, 0.35), 0.022);
  vec3 r = lp - vec3(0.0, 0.62, 0.0);
  float roof = max(max(abs(r.x) * 0.45 + r.y - 0.28, -r.y), abs(r.z) - 0.48);
  roof = max(abs(roof) - 0.012, -r.y);
  float floorD = sdRBox(lp - vec3(0.0, 0.04, 0.0), vec3(0.75, 0.04, 0.45), 0.02);
  return min(min(posts, roof), floorD);
}

void staticScene(vec3 p, inout float best){
  storefronts(p, -6.4, -3.05, -1.7, 2.0, best);
  storefronts(p, 0.45, 3.85, -1.8, 7.0, best);
  take(shelter(p), best, SHELTER, 0.55);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.55, 0.35), 4.0) + moonGlow(f, vec2(-5.0, 1.75), vec3(1.0, 0.92, 0.8));
}

void liveScene(vec3 p, inout float best){
  roundTree(p, vec3(-5.6, GROUND, -0.4), 1.25, 0.75, 0.0, OAK, best);
  roundTree(p, vec3(-3.9, GROUND, -0.4), 1.15, 0.7, 2.0, OAK, best);
  roundTree(p, vec3(5.9, GROUND, 0.3), 1.2, 0.7, 4.0, OAK, best);
  stringLights(p, vec3(-5.6, GROUND + 1.0, -0.2), vec3(-3.9, GROUND + 0.95, -0.2), 0.25, 0.0, best);
  stringLights(p, vec3(-3.9, GROUND + 0.95, -0.2), vec3(-2.75, GROUND + 0.7, -0.6), 0.15, 2.0, best);
  stringLights(p, vec3(0.5, GROUND + 0.85, -1.2), vec3(2.15, GROUND + 0.85, -1.2), 0.22, 4.0, best);
  stringLights(p, vec3(2.15, GROUND + 0.85, -1.2), vec3(3.8, GROUND + 0.85, -1.2), 0.22, 6.0, best);
  stringLights(p, vec3(3.95, GROUND + 0.75, -0.05), vec3(5.25, GROUND + 0.75, -0.05), 0.12, 8.0, best);
}

vec3 waterOverlay(vec2 f){
  return riverWater(f, 3.2, 7.0, vec3(0.55, 0.8, 1.0)) + riverWater(f + vec2(0.33, 0.0), 3.6, 6.5, WARM) * 0.6;
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const NORTH_CHARLESTON_SCENE = buildScene(0.3, `${SCENE_PARTS}${NORTH_CHARLESTON_SOURCE}`);
