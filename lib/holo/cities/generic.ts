import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const GENERIC_SOURCE = `
const vec3 LEAF = vec3(0.38, 0.86, 0.52);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 SHINGLE = vec3(0.55, 0.62, 0.9);
const vec3 PORCH = vec3(1.0, 0.82, 0.55);
const float HOUSE_Z = -1.5;

float gable(vec3 r, vec2 q, float depth){
  vec2 t = vec2(abs(r.x), q.y - r.y);
  vec2 a = t - q * clamp(dot(t, q) / dot(q, q), 0.0, 1.0);
  vec2 b = t - q * vec2(clamp(t.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (t.x * q.y - t.y * q.x)), vec2(dot(b, b), s * (t.y - q.y)));
  float tri = -sqrt(d.x) * sign(d.y);
  vec2 w = vec2(tri, abs(r.z) - depth);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

void house(vec3 p, float x, float seed, inout float best){
  vec3 lp = p - vec3(x, GROUND, HOUSE_Z);
  float bb = sdBox(lp - vec3(0.0, 0.45, 0.0), vec3(0.55, 0.5, 0.45));
  if (bb > CULL) { take(bb, best, WARM, 0.0); return; }
  float body = sdBox(lp - vec3(0.0, 0.25, 0.0), vec3(0.4, 0.25, 0.3));
  float win = sdBox(vec3(abs(lp.x) - 0.23, lp.y - 0.28, lp.z - 0.3), vec3(0.07, 0.08, 0.03));
  float door = sdBox(lp - vec3(0.0, 0.12, 0.3), vec3(0.06, 0.12, 0.03));
  float lit = min(win, door);
  vec3 r = lp - vec3(0.0, 0.5, 0.0);
  float roof = gable(r, vec2(0.46, 0.32), 0.36);
  float chimney = seed > 0.5 ? sdBox(lp - vec3(0.2, 0.72, -0.1), vec3(0.04, 0.12, 0.04)) : 1e5;
  take(max(body, -lit), best, facadeColor(hash(seed * 7.3 + 2.0)), 0.6);
  take(lit + 0.012, best, WARM, 1.15);
  take(min(roof, chimney), best, SHINGLE, 0.8);
}

void staticScene(vec3 p, inout float best){
  storefronts(p, -6.4, 0.95, -1.7, 3.0, best);
  house(p, 1.75, 0.2, best);
  house(p, 2.95, 0.7, best);
  house(p, 4.15, 0.4, best);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.4, 0.28, 0.48), vec3(1.0, 0.58, 0.4), 1.5) + moonGlow(f, vec2(4.8, 1.85), vec3(1.0, 0.92, 0.8));
}

void porchLights(vec3 p, inout float best){
  float i = clamp(floor((p.x - 1.75) / 1.2 + 0.5), 0.0, 2.0);
  vec3 c = vec3(1.75 + i * 1.2 + 0.11, GROUND + 0.3, HOUSE_Z + 0.33);
  float tw = 0.8 + 0.2 * sin(uTime * 1.3 + i * 2.1);
  take(length(p - c) - 0.022, best, PORCH, 1.3 * tw);
}

void liveScene(vec3 p, inout float best){
  porchLights(p, best);
  roundTree(p, vec3(-5.8, GROUND, 0.2), 1.15, 0.65, 1.0, LEAF, best);
  roundTree(p, vec3(5.4, GROUND, 0.3), 1.2, 0.7, 5.0, LEAF, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const GENERIC_SCENE = buildScene(0.3, `${SCENE_PARTS}${GENERIC_SOURCE}`);
