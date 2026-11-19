import { buildScene } from '@/lib/holo/sceneCommon';

const CHARLESTON_SOURCE = `
const vec3 BRIDGE = vec3(0.45, 0.7, 1.0);
const vec3 PALM = vec3(0.4, 0.95, 0.7);
const vec3 OAK = vec3(0.35, 0.85, 0.5);
const vec3 MOSS = vec3(0.7, 0.8, 0.72);
const vec3 HORIZON = vec3(0.25, 0.32, 0.55);
const vec3 MOON = vec3(0.85, 0.88, 1.0);

vec3 houseColor(float i){
  if (i < 0.5) return vec3(1.0, 0.55, 0.68);
  if (i < 1.5) return vec3(0.5, 0.95, 0.75);
  if (i < 2.5) return vec3(1.0, 0.86, 0.45);
  if (i < 3.5) return vec3(0.55, 0.75, 1.0);
  if (i < 4.5) return vec3(0.8, 0.62, 1.0);
  return vec3(1.0, 0.68, 0.5);
}

float deckY(float x){
  float y = -0.5 + 0.14 * cos((x + 3.7) * 0.55);
  float ramp = max(smoothstep(-1.0, 1.4, x), smoothstep(-6.8, -12.0, x));
  return mix(y, GROUND, ramp);
}

float bridge(vec3 p){
  float z0 = -2.4;
  float bb = sdBox(p - vec3(-5.8, 0.1, z0), vec3(7.4, 1.8, 0.4));
  if (bb > CULL) return bb;
  float dy = p.y - deckY(p.x);
  float deck = min(length(vec2(dy, p.z - z0)) - 0.035, length(vec2(dy + 0.09, p.z - z0)) - 0.018);
  float d = max(deck, abs(p.x + 5.8) - 7.2);
  for (int t = 0; t < 2; t++) {
    float tx = t == 0 ? -5.1 : -2.4;
    vec3 top = vec3(tx, 1.75, z0);
    vec3 knee = vec3(0.0, deckY(tx) - 0.15, z0);
    d = min(d, sdTaper(p, vec3(tx - 0.45, GROUND, z0), vec3(tx - 0.3, knee.y, z0), 0.05, 0.045));
    d = min(d, sdTaper(p, vec3(tx + 0.45, GROUND, z0), vec3(tx + 0.3, knee.y, z0), 0.05, 0.045));
    d = min(d, sdTaper(p, vec3(tx - 0.3, knee.y, z0), top, 0.045, 0.03));
    d = min(d, sdTaper(p, vec3(tx + 0.3, knee.y, z0), top, 0.045, 0.03));
    for (int i = 1; i <= 5; i++) {
      float fi = float(i);
      vec3 a = vec3(tx, 1.6 - fi * 0.11, z0);
      float xl = tx - fi * 0.4;
      float xr = tx + fi * 0.4;
      d = min(d, sdSeg(p, a, vec3(xl, deckY(xl), z0), 0.009));
      d = min(d, sdSeg(p, a, vec3(xr, deckY(xr), z0), 0.009));
    }
  }
  return d;
}

void bridgeTraffic(vec3 p, inout float best){
  float z0 = -2.4;
  float region = max(max(abs(p.z - z0) - 0.1, p.y + 0.2), p.x - 1.45);
  if (region > CULL) {
    take(region, best, vec3(0.0), 0.0);
    return;
  }
  float head = 1e5;
  float tail = 1e5;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float run = mod(uTime * (0.35 + 0.06 * hash(fi)) + fi * 2.4, 14.4);
    bool east = mod(fi, 2.0) < 0.5;
    float x = east ? -13.0 + run : 1.4 - run;
    vec3 c = vec3(x, deckY(x) + 0.05, z0 + (east ? 0.06 : -0.06));
    float l = length(p - c) - 0.024;
    if (east) head = min(head, l); else tail = min(tail, l);
  }
  take(head, best, vec3(1.0, 0.95, 0.82), 1.1);
  take(tail, best, vec3(1.0, 0.2, 0.15), 1.0);
}

float roof(vec3 lp, float hh, float i){
  float kind = mod(i, 3.0);
  vec3 r = lp - vec3(0.0, hh, 0.0);
  float slab = abs(r.z) - 0.3;
  if (kind < 0.5) {
    float arch = length(r.xy) - 0.26;
    return max(max(arch, -r.y), slab);
  }
  if (kind < 1.5) {
    float gable = max(abs(r.x) * 0.62 + r.y * 0.78 - 0.2, -r.y);
    return max(gable, slab) - 0.015;
  }
  return sdRBox(r - vec3(0.0, 0.07, 0.0), vec3(0.3, 0.08, 0.3), 0.04);
}

float house(vec3 p, float i){
  float cx = 1.15 + i * 0.78;
  float h = 1.2 + 0.35 * hash(i + 3.0);
  float hh = h * 0.5;
  vec3 lp = p - vec3(cx, GROUND + hh, 0.1);
  float body = sdRBox(lp, vec3(0.36, hh, 0.35), 0.035);
  float cornice = sdRBox(lp - vec3(0.0, hh - 0.01, 0.02), vec3(0.39, 0.025, 0.37), 0.02);
  float wx = lp.x - 0.24 * clamp(floor(lp.x / 0.24 + 0.5), -1.0, 1.0);
  float ry = lp.y + hh - 0.6;
  float wy = ry - 0.4 * clamp(floor(ry / 0.4 + 0.5), 0.0, floor((h - 0.75) / 0.4));
  vec3 wp = vec3(wx, wy, lp.z - 0.35);
  float win = min(sdBox(wp + vec3(0.0, 0.03, 0.0), vec3(0.055, 0.08, 0.06)), sdCylZ(wp - vec3(0.0, 0.05, 0.0), 0.055, 0.06));
  vec3 dp = vec3(lp.x - 0.2, lp.y + hh, lp.z - 0.35);
  float door = min(sdBox(dp, vec3(0.065, 0.17, 0.06)), sdCylZ(dp - vec3(0.0, 0.17, 0.0), 0.065, 0.06));
  body = max(body, -min(win, door));
  return min(min(body, cornice), roof(lp, hh, i));
}

float houseAt(vec3 p, float i){
  float hb = sdBox(p - vec3(1.15 + i * 0.78, GROUND + 0.95, 0.1), vec3(0.45, 1.05, 0.45));
  return hb > CULL ? hb : house(p, i);
}

float palm(vec3 p, vec3 base, float height, float seed){
  float sway = 0.05 * sin(uTime * 0.7 + seed);
  float bb = sdBox(p - (base + vec3(0.0, height * 0.5 + 0.2, 0.0)), vec3(1.1, height * 0.5 + 0.6, 0.7));
  if (bb > CULL) return bb;
  vec3 mid = base + vec3(-0.06 + sway * 0.3, height * 0.55, 0.0);
  vec3 top = base + vec3(0.12 + sway, height, 0.0);
  float d = min(sdTaper(p, base, mid, 0.065, 0.05), sdTaper(p, mid, top, 0.05, 0.04));
  for (int i = 0; i < 10; i++) {
    float a = float(i) * 0.628 + seed;
    vec3 dir = vec3(cos(a) * 0.5, 0.0, sin(a) * 0.32);
    float lift = 0.1 + 0.06 * sin(a * 3.0 + seed);
    vec3 p1 = top + dir * 0.5 + vec3(sway * 0.5, lift + 0.08, 0.0);
    vec3 p2 = top + dir * 1.0 + vec3(sway, lift - 0.04, 0.0);
    vec3 p3 = top + dir * 1.4 + vec3(sway * 1.6, lift - 0.4, 0.0);
    d = min(d, sdTaper(p, top, p1, 0.006, 0.02));
    d = min(d, sdTaper(p, p1, p2, 0.02, 0.016));
    d = min(d, sdTaper(p, p2, p3, 0.016, 0.003));
  }
  return d;
}

void oakParts(vec3 p, inout float best){
  vec3 c = vec3(6.05, -0.45, -0.2);
  float bb = sdBox(p - vec3(c.x - 0.3, -0.4, c.z), vec3(2.0, 1.3, 1.0));
  if (bb > CULL) { take(bb, best, OAK, 0.85); return; }
  float sway = 0.035 * sin(uTime * 0.5);
  float d = sdTaper(p, vec3(c.x + 0.12, GROUND, c.z), c, 0.13, 0.09);
  d = smin(d, sdTaper(p, c, c + vec3(-1.35, 0.32, 0.15), 0.08, 0.02), 0.09);
  d = smin(d, sdTaper(p, c, c + vec3(-0.55, 0.78, -0.1), 0.07, 0.02), 0.09);
  d = smin(d, sdTaper(p, c, c + vec3(0.85, 0.6, 0.05), 0.07, 0.02), 0.09);
  vec3 cp = p - c;
  cp.x -= sway * max(cp.y, 0.0);
  float canopy = 1e5;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec3 o = vec3(-1.55 + fi * 0.36, 0.62 + 0.16 * sin(fi * 1.9) - 0.12 * abs(fi - 3.5) / 3.5, 0.12 * cos(fi * 2.3));
    vec3 v = (cp - o) * vec3(1.0, 1.55, 1.0);
    canopy = smin(canopy, (length(v) - (0.3 + 0.07 * hash(fi))) / 1.55, 0.16);
  }
  canopy += 0.02 * sin(p.x * 19.0 + uTime * 0.4) * sin(p.y * 17.0) * sin(p.z * 13.0);
  take(min(d, canopy), best, OAK, 0.85);
  float moss = 1e5;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec3 a = c + vec3(-1.5 + fi * 0.3, 0.42 + 0.08 * sin(fi * 1.9), 0.18);
    float len = 0.3 + 0.35 * hash(fi + 7.0);
    vec3 tip = a + vec3(0.05 * sin(uTime * 0.7 + fi * 1.3), -len, 0.0);
    moss = min(moss, sdTaper(p, a, tip, 0.016, 0.002));
  }
  take(moss, best, MOSS, 0.75);
}

void staticScene(vec3 p, inout float best){
  take(bridge(p), best, BRIDGE, 0.8);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    take(houseAt(p, fi), best, houseColor(fi), 0.9);
  }
}

vec3 skyline(vec2 f){
  float hz = exp(-abs(f.y - (GROUND + 0.6)) * 1.1);
  vec3 bg = HORIZON * hz * 0.22;
  float ml = length(f - vec2(4.3, 1.9));
  return bg + MOON * (smoothstep(0.42, 0.38, ml) * 0.16 + exp(-ml * 1.6) * 0.12);
}

void liveScene(vec3 p, inout float best){
  oakParts(p, best);
  take(palm(p, vec3(0.35, GROUND, 0.7), 2.0, 0.3), best, PALM, 0.9);
  if (!gMirror) bridgeTraffic(p, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return min(houseAt(p, 4.0), houseAt(p, 5.0));
}
`;

export const CHARLESTON_SCENE = buildScene(0.5, CHARLESTON_SOURCE);
