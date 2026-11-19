import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const SUMMERVILLE_SOURCE = `
const vec3 GLASS = vec3(0.7, 0.9, 1.0);
const vec3 TEA = vec3(1.0, 0.5, 0.08);
const vec3 LEMON = vec3(1.0, 0.92, 0.35);
const vec3 GAZEBO = vec3(0.85, 0.85, 1.0);
const vec3 PINE = vec3(0.3, 0.85, 0.55);
const vec3 AZALEA = vec3(1.0, 0.4, 0.75);
const vec3 JAR_C = vec3(2.2, GROUND, -0.4);
const vec3 GAZEBO_C = vec3(-3.75, GROUND, -1.2);

float jar(vec3 p){
  vec3 lp = p - JAR_C;
  float bb = sdBox(lp - vec3(0.0, 0.85, 0.0), vec3(0.65, 1.1, 0.65));
  if (bb > CULL) return bb;
  float body = sdCylY(lp - vec3(0.0, 0.62, 0.0), 0.5, 0.58) - 0.06;
  float shell = abs(body) - 0.012;
  float rings = sdCylY(lp - vec3(0.0, 1.3, 0.0), 0.47, 0.06) - 0.02;
  rings = min(rings, max(sdCylY(lp - vec3(0.0, 1.21, 0.0), 0.5, 0.012) - 0.01, -body - 0.02));
  return min(shell, rings);
}

float tea(vec3 p){
  vec3 lp = p - JAR_C;
  float bb = sdBox(lp - vec3(0.0, 0.5, 0.0), vec3(0.55, 0.6, 0.55));
  if (bb > CULL) return bb;
  float fill = sdCylY(lp - vec3(0.0, 0.48, 0.0), 0.47, 0.43) - 0.04;
  vec3 c1 = lp - vec3(-0.15, 0.82, 0.12);
  vec3 c2 = lp - vec3(0.2, 0.86, 0.05);
  float cubes = min(sdRBox(c1, vec3(0.1), 0.03), sdRBox(vec3(c2.x * 0.8 + c2.y * 0.6, c2.y * 0.8 - c2.x * 0.6, c2.z), vec3(0.09), 0.03));
  return max(fill, -cubes + 0.005);
}

float lemonStraw(vec3 p){
  vec3 lp = p - JAR_C;
  float bb = sdBox(lp - vec3(0.2, 1.4, 0.0), vec3(0.6, 0.6, 0.4));
  if (bb > CULL) return bb;
  vec3 lq = lp - vec3(-0.42, 1.33, 0.25);
  float lemon = max(length(lq.xy) - 0.16, abs(lq.z) - 0.02) - 0.01;
  float a = atan(lq.y, lq.x);
  float seg = abs(fract(a * 1.273) - 0.5) * length(lq.xy) - 0.006;
  lemon = max(lemon, -max(seg, 0.13 - length(lq.xy) + 0.02));
  float straw = sdSeg(lp, vec3(0.1, 0.3, 0.0), vec3(0.42, 1.75, 0.0), 0.025);
  return min(lemon, straw);
}

float gazebo(vec3 p){
  vec3 lp = p - GAZEBO_C;
  float bb = sdBox(lp - vec3(0.0, 0.55, 0.0), vec3(0.75, 0.75, 0.75));
  if (bb > CULL) return bb;
  float a = atan(lp.z, lp.x);
  float sector = 0.7854;
  float ar = mod(a + sector * 0.5, sector) - sector * 0.5;
  vec2 pq = vec2(cos(ar), sin(ar)) * length(lp.xz);
  float posts = sdCylY(vec3(pq.x - 0.55, lp.y - 0.4, pq.y), 0.025, 0.32);
  float floorD = sdCylY(lp - vec3(0.0, 0.06, 0.0), 0.62, 0.05) - 0.01;
  float rail = max(abs(length(lp.xz) - 0.55) - 0.012, abs(lp.y - 0.3) - 0.012);
  vec3 r = lp - vec3(0.0, 0.74, 0.0);
  float roof = max(length(r.xz) * 0.55 + r.y * 0.83 - 0.38, -r.y) - 0.012;
  float finial = sdTaper(lp, vec3(0.0, 1.18, 0.0), vec3(0.0, 1.32, 0.0), 0.02, 0.004);
  return min(min(min(posts, floorD), rail), min(roof, finial));
}

float azaleas(vec3 p){
  float bb = max(abs(p.z - 0.55) - 0.6, p.y - GROUND - 0.5);
  if (bb > CULL) return bb;
  float d = 1e5;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float x = fi < 2.5 ? 1.3 + fi * 0.45 : 3.0 + fi * 0.3;
    vec3 c = vec3(x, GROUND + 0.12 + 0.05 * hash(fi), 0.5 + 0.2 * hash(fi + 3.0));
    d = smin(d, length((p - c) * vec3(1.0, 1.4, 1.0)) / 1.4 - 0.17, 0.08);
  }
  return d + 0.012 * sin(p.x * 31.0) * sin(p.y * 27.0) * sin(p.z * 23.0);
}

void staticScene(vec3 p, inout float best){
  take(jar(p), best, GLASS, 0.3);
  take(tea(p), best, TEA, 1.25);
  take(lemonStraw(p), best, LEMON, 1.3);
  take(gazebo(p), best, GAZEBO, 0.9);
  take(azaleas(p), best, AZALEA, 0.9);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.28, 0.3, 0.5), vec3(1.0, 0.6, 0.3), 2.0) + moonGlow(f, vec2(4.9, 1.85), vec3(1.0, 0.92, 0.8));
}

void fireflies(vec3 p, inout float best){
  float region = max(abs(p.y + 0.6) - 0.9, abs(p.z) - 1.4);
  if (region > CULL) { take(region, best, LEMON, 0.0); return; }
  float d = 1e5;
  float w = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec3 c = vec3(-5.0 + fi * 1.45 + 0.3 * sin(uTime * 0.3 + fi * 2.0), -0.6 + 0.5 * sin(uTime * 0.21 + fi * 1.7), 0.8 * sin(fi * 2.3));
    float l = length(p - c) - 0.02;
    if (l < d) { d = l; w = smoothstep(0.6, 1.0, sin(uTime * 0.9 + fi * 2.7)); }
  }
  take(d, best, vec3(0.85, 1.0, 0.45), 1.5 * w);
}

void liveScene(vec3 p, inout float best){
  pineTree(p, vec3(-5.3, GROUND, 0.3), 2.2, 0.0, PINE, best);
  pineTree(p, vec3(-2.9, GROUND, -1.3), 1.8, 1.5, PINE, best);
  pineTree(p, vec3(4.2, GROUND, 0.0), 2.0, 3.0, PINE, best);
  pineTree(p, vec3(5.3, GROUND, 0.4), 2.4, 4.5, PINE, best);
  if (!gMirror) fireflies(p, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const SUMMERVILLE_SCENE = buildScene(-0.55, `${SCENE_PARTS}${SUMMERVILLE_SOURCE}`);
