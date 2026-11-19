export const SCENE_PARTS = `
float tower(vec3 p, float cx, float hw, float top, float z0){
  float hh = (top - GROUND) * 0.5;
  vec3 lp = p - vec3(cx, GROUND + hh, z0);
  float bb = sdBox(lp, vec3(hw, hh, hw) + 0.1);
  if (bb > CULL) return bb;
  float body = sdRBox(lp, vec3(hw, hh, hw), 0.03);
  float fy = lp.y - 0.18 * floor(lp.y / 0.18 + 0.5);
  float groove = sdBox(vec3(lp.x, fy, lp.z - hw), vec3(hw - 0.07, 0.022, 0.03));
  return max(body, -groove);
}

void roundTree(vec3 p, vec3 base, float h, float r, float seed, vec3 col, inout float best){
  vec3 top = base + vec3(0.0, h, 0.0);
  float bb = sdBox(p - (base + vec3(0.0, (h + r) * 0.5, 0.0)), vec3(r + 0.2, (h + r) * 0.5 + 0.2, r + 0.2));
  if (bb > CULL) { take(bb, best, col, 0.85); return; }
  float trunk = sdTaper(p, base, top, 0.07, 0.04);
  vec3 cp = p - top;
  cp.x -= 0.04 * sin(uTime * 0.55 + seed) * max(cp.y + r, 0.0);
  float canopy = 1e5;
  for (int i = 0; i < 5; i++) {
    float fi = float(i) + seed;
    vec3 o = vec3(cos(fi * 1.26) * r * 0.55, sin(fi * 2.1) * r * 0.25, sin(fi * 1.26) * r * 0.35);
    canopy = smin(canopy, length(cp - o) - r * (0.5 + 0.1 * hash(fi)), 0.15);
  }
  canopy += 0.02 * sin(p.x * 19.0 + uTime * 0.4) * sin(p.y * 17.0) * sin(p.z * 13.0);
  take(min(trunk, canopy), best, col, 0.85);
}

void pineTree(vec3 p, vec3 base, float h, float seed, vec3 col, inout float best){
  float bb = sdBox(p - (base + vec3(0.0, h * 0.5, 0.0)), vec3(0.6, h * 0.5 + 0.25, 0.6));
  if (bb > CULL) { take(bb, best, col, 0.85); return; }
  vec3 lp = p - base;
  float sway = 0.05 * sin(uTime * 0.6 + seed) * max(lp.y, 0.0) / h;
  lp.x -= sway;
  float trunk = sdTaper(lp, vec3(0.0), vec3(0.0, h * 0.95, 0.0), 0.045, 0.015);
  float crown = 1e5;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float y = h * (0.4 + fi * 0.11);
    vec3 o = vec3((hash(fi + seed) - 0.5) * 0.08, y, 0.0);
    float r = 0.36 - fi * 0.055;
    crown = smin(crown, length((lp - o) * vec3(1.0, 2.6, 1.0)) / 2.6 - r * 0.4, 0.06);
  }
  crown += 0.018 * sin(p.x * 23.0 + uTime * 0.5) * sin(p.y * 19.0) * sin(p.z * 17.0);
  take(min(trunk, crown), best, col, 0.85);
}

void stringLights(vec3 p, vec3 a, vec3 b, float sag, float seed, inout float best){
  vec3 ab = b - a;
  float bb = sdBox(p - (a + b) * 0.5 + vec3(0.0, sag * 0.5, 0.0), abs(ab) * 0.5 + vec3(0.15, sag * 0.5 + 0.15, 0.15));
  if (bb > CULL) { take(bb, best, vec3(1.0, 0.7, 0.4), 0.0); return; }
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  float wire = length(p - (a + ab * t - vec3(0.0, sag * 4.0 * t * (1.0 - t), 0.0))) - 0.004;
  float n = max(floor(length(ab) / 0.17), 1.0);
  float u = t * n;
  float ci = min(floor(u), n - 1.0);
  float cj = clamp(ci + (fract(u) < 0.5 ? -1.0 : 1.0), 0.0, n - 1.0);
  float ti = (ci + 0.5) / n;
  float tj = (cj + 0.5) / n;
  float bi = length(p - (a + ab * ti - vec3(0.0, sag * 4.0 * ti * (1.0 - ti) + 0.03, 0.0))) - 0.024;
  float bj = length(p - (a + ab * tj - vec3(0.0, sag * 4.0 * tj * (1.0 - tj) + 0.03, 0.0))) - 0.024;
  float bulb = min(bi, bj);
  ti = bi < bj ? ti : tj;
  float tw = 0.75 + 0.25 * sin(uTime * 1.6 + ti * 37.0 + seed);
  take(wire, best, vec3(0.6, 0.5, 0.45), 0.3);
  take(bulb, best, vec3(1.0, 0.72, 0.38), 1.05 * tw);
}

vec3 riverWater(vec2 f, float x0, float x1, vec3 tint){
  float dy = GROUND - f.y;
  if (dy <= 0.0 || dy > 1.3) return vec3(0.0);
  float edge = smoothstep(x0 - 0.4, x0 + 0.4, f.x) * smoothstep(x1 + 0.4, x1 - 0.4, f.x);
  float row = 1.4 / (dy + 0.1);
  float ri = floor(row);
  float flow = f.x * (2.5 + 2.0 * hash(ri + 5.0)) - uTime * (0.6 + 0.5 * hash(ri + 3.0)) + hash(ri) * 6.28;
  float dash = smoothstep(0.5, 0.95, sin(flow));
  float line = 1.0 - smoothstep(0.05, 0.3, abs(fract(row) - 0.5));
  float fade = smoothstep(0.02, 0.12, dy) * exp(-dy * 1.2);
  float bank = exp(-dy * 45.0) * 0.4;
  return tint * edge * (dash * line * fade * 1.1 + bank * 0.5);
}

vec3 facadeColor(float h){
  if (h < 0.25) return vec3(1.0, 0.5, 0.45);
  if (h < 0.5) return vec3(1.0, 0.75, 0.5);
  if (h < 0.75) return vec3(0.95, 0.6, 0.8);
  return vec3(0.6, 0.85, 0.8);
}

void shopCell(vec3 p, float x0, float z0, float seed, float i, inout float best){
  float w = 0.56;
  float h = 0.62 + 0.32 * hash(i + seed);
  vec3 lp = p - vec3(x0 + (i + 0.5) * w, GROUND, z0);
  float body = sdBox(lp - vec3(0.0, h * 0.5, 0.0), vec3(w * 0.47, h * 0.5, 0.25));
  float cornice = sdRBox(lp - vec3(0.0, h, 0.02), vec3(w * 0.5, 0.025, 0.27), 0.01);
  float win = sdBox(vec3(abs(lp.x) - 0.12, lp.y - h + 0.2, lp.z - 0.25), vec3(0.05, 0.075, 0.03));
  float shop = sdBox(vec3(lp.x, lp.y - 0.17, lp.z - 0.25), vec3(0.17, 0.12, 0.03));
  float lit = min(win, shop);
  vec3 a = lp - vec3(0.0, 0.33, 0.32);
  float awning = sdBox(vec3(a.x, a.y * 0.9 + a.z * 0.45, a.z * 0.9 - a.y * 0.45), vec3(0.2, 0.008, 0.08));
  take(min(max(body, -lit), cornice), best, facadeColor(hash(i * 3.1 + seed)), 0.6);
  take(lit + 0.012, best, vec3(1.0, 0.68, 0.35), 1.15);
  take(awning, best, facadeColor(hash(i * 5.7 + seed + 1.0)), 1.0);
}

void storefronts(vec3 p, float x0, float x1, float z0, float seed, inout float best){
  float bb = sdBox(p - vec3((x0 + x1) * 0.5, GROUND + 0.55, z0), vec3((x1 - x0) * 0.5 + 0.1, 0.65, 0.4));
  if (bb > CULL) { take(bb, best, vec3(1.0, 0.6, 0.4), 0.0); return; }
  float u = (p.x - x0) / 0.56;
  float last = floor((x1 - x0) / 0.56) - 1.0;
  float i = clamp(floor(u), 0.0, last);
  float j = clamp(i + (fract(u) < 0.5 ? -1.0 : 1.0), 0.0, last);
  shopCell(p, x0, z0, seed, i, best);
  if (j != i) shopCell(p, x0, z0, seed, j, best);
}

float palmTree(vec3 p, vec3 base, float height, float seed){
  float sway = 0.05 * sin(uTime * 0.7 + seed);
  float bb = sdBox(p - (base + vec3(0.0, height * 0.5 + 0.2, 0.0)), vec3(1.1, height * 0.5 + 0.6, 0.7));
  if (bb > CULL) return bb;
  vec3 mid = base + vec3(-0.06 + sway * 0.3, height * 0.55, 0.0);
  vec3 top = base + vec3(0.12 + sway, height, 0.0);
  float d = min(sdTaper(p, base, mid, 0.065, 0.05), sdTaper(p, mid, top, 0.05, 0.04));
  for (int i = 0; i < 9; i++) {
    float a = float(i) * 0.698 + seed;
    vec3 dir = vec3(cos(a) * 0.45, 0.0, sin(a) * 0.3);
    float lift = 0.1 + 0.06 * sin(a * 3.0 + seed);
    vec3 p1 = top + dir * 0.5 + vec3(sway * 0.5, lift + 0.08, 0.0);
    vec3 p2 = top + dir * 1.0 + vec3(sway, lift - 0.04, 0.0);
    vec3 p3 = top + dir * 1.35 + vec3(sway * 1.6, lift - 0.38, 0.0);
    d = min(d, sdTaper(p, top, p1, 0.006, 0.02));
    d = min(d, sdTaper(p, p1, p2, 0.02, 0.016));
    d = min(d, sdTaper(p, p2, p3, 0.016, 0.003));
  }
  return d;
}

void laneTraffic(vec3 p, float y, float z, float span, inout float best){
  float region = max(abs(p.z - z) - 0.1, abs(p.y - y) - 0.08);
  if (region > CULL) { take(region, best, vec3(0.0), 0.0); return; }
  float head = 1e5;
  float tail = 1e5;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float run = mod(uTime * (0.45 + 0.1 * hash(fi)) + fi * span / 6.0, span);
    bool east = mod(fi, 2.0) < 0.5;
    float x = east ? run - span * 0.5 : span * 0.5 - run;
    vec3 c = vec3(x, y, z + (east ? 0.06 : -0.06));
    float l = length(p - c) - 0.024;
    if (east) head = min(head, l); else tail = min(tail, l);
  }
  take(head, best, vec3(1.0, 0.95, 0.82), 1.1);
  take(tail, best, vec3(1.0, 0.2, 0.15), 1.0);
}

vec3 skyGlow(vec2 f, vec3 horizon, vec3 haze, float hazeX){
  float hz = exp(-abs(f.y - (GROUND + 0.6)) * 1.1);
  float low = exp(-abs(f.y - GROUND) * 2.2) * exp(-abs(f.x - hazeX) * 0.25);
  return horizon * hz * 0.24 + haze * low * 0.1;
}

vec3 moonGlow(vec2 f, vec2 c, vec3 col){
  float ml = length(f - c);
  return col * (smoothstep(0.42, 0.38, ml) * 0.16 + exp(-ml * 1.6) * 0.12);
}
`;
