export interface HoloScene {
  readonly focusX: number;
  readonly still: string;
  readonly live: string;
}

const HEADER = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uFrame;
uniform float uTime;
uniform mat3 uRot;
uniform float uExposure;
uniform float uSharp;
uniform float uSteps;
uniform float uOcc;

const float GROUND = -1.5;
const float CULL = 0.8;
const vec3 TRUCK = vec3(1.0, 0.1, 0.16);
vec3 gCol;
float gW;
bool gMirror;

float sdSeg(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdTaper(vec3 p, vec3 a, vec3 b, float r0, float r1){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(r0, r1, h);
}
float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
float sdCylZ(vec3 p, float r, float h){
  vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdCylY(vec3 p, float r, float h){
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float hash(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
float rnd(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

void take(float d, inout float best, vec3 col, float w){
  if (d < best) { best = d; gCol = col; gW = w; }
}

float sdBoxFrame(vec3 p, vec3 b, float e){
  p = abs(p) - b;
  vec3 q = abs(p + e) - e;
  return min(min(
    length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
    length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
    length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
}
`;

const TRUCK_SOURCE = `
const vec3 WHEEL_A = vec3(-0.68, 0.17, 0.0);
const vec3 WHEEL_B = vec3(0.62, 0.17, 0.0);
const vec3 SHIELD_N = vec3(0.721, 0.693, 0.0);
const vec3 HOOD_N = vec3(0.258, 0.966, 0.0);
const vec3 BODY_DROP = vec3(0.0, 0.04, 0.0);

float archDist(vec3 q){
  return min(length(q.xy - WHEEL_A.xy), length(q.xy - WHEEL_B.xy)) - 0.21;
}

float truckShell(vec3 q){
  float cargo = sdRBox(q - vec3(-0.4, 0.67, 0.0), vec3(0.75, 0.43, 0.34), 0.07);
  float cab = sdRBox(q - vec3(0.65, 0.59, 0.0), vec3(0.3, 0.33, 0.31), 0.05);
  cab = max(cab, min(dot(q - vec3(0.55, 0.92, 0.0), SHIELD_N), q.y - 0.66));
  cab = max(cab, min(dot(q - vec3(0.8, 0.66, 0.0), HOOD_N), q.x - 0.8));
  float shell = smin(cargo, cab, 0.03);
  float hatch = sdBox(q - vec3(-0.4, 0.74, 0.34), vec3(0.5, 0.17, 0.05));
  return max(shell, -min(hatch, archDist(q)));
}

float truckEdges(vec3 q){
  vec3 s = vec3(q.xy, abs(q.z));
  float e = sdBoxFrame(q - vec3(-0.4, 0.67, 0.0), vec3(0.73, 0.41, 0.32), 0.012);
  e = min(e, sdSeg(s, vec3(0.35, 0.92, 0.3), vec3(0.55, 0.92, 0.3), 0.012));
  e = min(e, sdSeg(s, vec3(0.55, 0.92, 0.3), vec3(0.8, 0.66, 0.3), 0.012));
  e = min(e, sdSeg(s, vec3(0.8, 0.66, 0.3), vec3(0.94, 0.62, 0.3), 0.012));
  e = min(e, sdSeg(s, vec3(0.94, 0.62, 0.3), vec3(0.94, 0.27, 0.3), 0.012));
  e = min(e, sdSeg(s, vec3(0.35, 0.27, 0.31), vec3(0.94, 0.27, 0.31), 0.012));
  e = min(e, sdSeg(q, vec3(0.55, 0.92, -0.3), vec3(0.55, 0.92, 0.3), 0.012));
  e = min(e, sdSeg(q, vec3(0.8, 0.66, -0.3), vec3(0.8, 0.66, 0.3), 0.012));
  e = min(e, sdSeg(q, vec3(0.94, 0.62, -0.3), vec3(0.94, 0.62, 0.3), 0.012));
  e = max(e, -archDist(q));
  float arcs = min(length(vec2(length(s.xy - WHEEL_A.xy) - 0.21, s.z - 0.32)), length(vec2(length(s.xy - WHEEL_B.xy) - 0.21, s.z - 0.31))) - 0.012;
  return min(e, max(arcs, 0.26 - q.y));
}

vec3 truckFace(vec3 q){
  vec2 h = vec2(0.01, 0.0);
  vec3 n = normalize(vec3(
    truckShell(q + h.xyy) - truckShell(q - h.xyy),
    truckShell(q + h.yxy) - truckShell(q - h.yxy),
    truckShell(q + h.yyx) - truckShell(q - h.yyx)));
  if (dot(n, SHIELD_N) > 0.93) return vec3(0.95, 0.6, 0.78) * 0.75;
  vec3 side = TRUCK * 0.5;
  vec3 front = TRUCK * vec3(1.0, 0.7, 0.7);
  vec3 top = mix(TRUCK, vec3(1.0, 0.65, 0.7), 0.4) * 0.85;
  return side * abs(n.z) + front * max(n.x, 0.0) + side * 0.6 * max(-n.x, 0.0) + top * max(n.y, 0.0);
}

float tire(vec3 w){
  float sag = smoothstep(-0.09, -0.17, w.y);
  float t = length(vec2(length(w.xy) - 0.115, w.z)) - 0.055 - 0.01 * sag;
  return max(t, -(w.y + 0.165));
}

vec3 truckSpace(vec3 p){
  vec3 w = p - vec3(-1.25, GROUND, 1.3);
  return vec3(0.877 * w.x + 0.479 * w.z, w.y, -0.479 * w.x + 0.877 * w.z);
}

float truckBounds(vec3 q){
  return sdBox(q - vec3(-0.1, 0.6, 0.0), vec3(1.2, 0.65, 0.55));
}

void truckParts(vec3 p, inout float best){
  vec3 q = truckSpace(p);
  float bb = truckBounds(q);
  if (bb > CULL) { take(bb, best, TRUCK, 1.0); return; }
  vec3 b = q + BODY_DROP;
  float shell = truckShell(b);
  if (shell < best) take(shell, best, shell < 0.12 ? truckFace(b) : TRUCK * 0.5, 0.45);
  take(truckEdges(b), best, TRUCK + vec3(0.25, 0.05, 0.06), 1.3);
  vec3 cream = vec3(1.0, 0.86, 0.88);
  take(sdBox(b - vec3(-0.4, 0.74, 0.3), vec3(0.48, 0.15, 0.005)), best, vec3(1.0, 0.78, 0.5), 0.9);
  take(sdBoxFrame(b - vec3(-0.4, 0.74, 0.34), vec3(0.5, 0.17, 0.0), 0.01), best, cream, 0.8);
  take(sdRBox(b - vec3(-0.4, 0.57, 0.39), vec3(0.52, 0.012, 0.06), 0.01), best, cream, 0.7);
  vec3 aq = b - vec3(-0.4, 0.93, 0.34);
  aq.y -= aq.z * 0.35;
  float stripe = step(0.5, fract(aq.x * 5.0 + 0.25));
  take(sdRBox(aq - vec3(0.0, 0.0, 0.08), vec3(0.54, 0.008, 0.08), 0.006), best, mix(TRUCK, cream, stripe), 0.9);
  take(sdBox(b - vec3(0.48, 0.76, 0.31), vec3(0.08, 0.09, 0.004)), best, vec3(0.95, 0.6, 0.78), 0.5);
  vec3 hq = b - vec3(0.955, 0.46, 0.0); hq.z = abs(hq.z) - 0.21;
  take(length(hq) - 0.035, best, vec3(1.0, 0.95, 0.8), 1.2);
  float grille = 1e5;
  for (int i = 0; i < 3; i++) {
    float y = 0.37 + float(i) * 0.05;
    grille = min(grille, sdSeg(b, vec3(0.955, y, -0.12), vec3(0.955, y, 0.12), 0.007));
  }
  take(grille, best, cream, 0.6);
  take(sdRBox(b - vec3(0.98, 0.28, 0.0), vec3(0.03, 0.025, 0.32), 0.02), best, cream * 0.8, 0.55);
  vec3 w1 = q - WHEEL_A; w1.z = abs(w1.z) - 0.25;
  vec3 w2 = q - WHEEL_B; w2.z = abs(w2.z) - 0.25;
  float tires = min(tire(w1), tire(w2));
  take(tires, best, TRUCK * vec3(0.6, 0.4, 0.45), 0.7);
  take(min(sdCylZ(w1, 0.05, 0.012), sdCylZ(w2, 0.05, 0.012)), best, cream, 0.6);
}

float truckOccluder(vec3 p){
  vec3 q = truckSpace(p);
  float bb = truckBounds(q);
  return bb > CULL ? bb : truckShell(q + BODY_DROP);
}

float frameScale(){
  return min(uRes.y * 0.185, uRes.x / uFrame.y);
}

vec2 sceneCoord(){
  return (gl_FragCoord.xy - 0.5 * uRes) / frameScale() + vec2(uFrame.x, 0.15);
}

float vignette(){
  vec2 uv = gl_FragCoord.xy / uRes;
  return 0.55 + 0.45 * smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(1.0, 1.6)));
}

float mirror(inout vec3 p){
  gMirror = p.y < GROUND;
  if (!gMirror) return 1.0;
  float dy = GROUND - p.y;
  p.y = GROUND + dy;
  p.x += 0.05 * sin(dy * 26.0 + uTime * 1.3) * min(dy, 1.0);
  return 0.3 * exp(-dy * 1.1);
}

float glow(float am, float pz){
  float d = 0.06 + 0.2 * am;
  float depth = smoothstep(-3.0, 1.8, pz);
  float k = mix(uSharp * 0.6, uSharp, depth);
  return pow(0.06 / d, k) * (1.0 - smoothstep(0.25, 0.7, am)) * mix(0.3, 1.0, depth);
}
`;

const STATIC_MAIN = `
float map(vec3 p){
  float best = 1e5;
  staticScene(p, best);
  if (gMirror) truckParts(p, best);
  float curb = min(length(vec2(p.y - GROUND, p.z - 1.95)) - 0.008, length(vec2(p.y - GROUND, p.z + 0.5)) - 0.008);
  take(curb, best, vec3(0.55, 0.5, 0.5), 0.35);
  return best;
}

vec3 truckPass(vec2 f, inout float T){
  vec3 acc = vec3(0.0);
  float z = 4.5;
  for (int i = 0; i < 90; i++) {
    if (T < 0.02 || z < -1.0) break;
    vec3 p = uRot * vec3(f, z);
    if (p.y < GROUND) break;
    float best = 1e5;
    truckParts(p, best);
    float am = abs(best);
    if (am > 0.7) { z -= am - 0.45; continue; }
    float d = 0.025 + 0.15 * am;
    float g = pow(0.025 / d, uSharp * 1.3) * (1.0 - smoothstep(0.2, 0.55, am));
    acc += T * gCol * gW * g * 0.5;
    if (best < 0.0) T *= exp(-uOcc * d);
    z -= d;
  }
  return acc;
}

void main(){
  vec2 f = sceneCoord();
  float T = 1.0;
  vec3 acc = truckPass(f, T);
  float z = 4.5;
  for (int i = 0; i < 180; i++) {
    if (float(i) >= uSteps || T < 0.02) break;
    vec3 p = uRot * vec3(f, z);
    float refl = mirror(p);
    float m = map(p);
    float am = abs(m);
    float d = 0.06 + 0.2 * am;
    acc += T * gCol * gW * glow(am, p.z) * refl;
    if (m < 0.0) T *= exp(-uOcc * d);
    z -= d;
  }
  vec3 col = 1.0 - exp(-acc * uExposure);
  vec3 bg = skyline(f);
  vec2 tp = f - vec2(-1.0, GROUND - 0.1);
  bg += TRUCK * exp(-length(tp * vec2(0.55, 2.2))) * 0.22;
  col = 1.0 - (1.0 - bg) * (1.0 - col);
  gl_FragColor = vec4(clamp(col * vignette(), 0.0, 1.0), 1.0);
}
`;

const LIVE_MAIN = `
uniform sampler2D uStatic;

void main(){
  vec2 f = sceneCoord();
  vec3 acc = vec3(0.0);
  float T = 1.0;
  float z = 4.5;
  for (int i = 0; i < 180; i++) {
    if (float(i) >= uSteps || T < 0.02 || z < -3.5) break;
    vec3 p = uRot * vec3(f, z);
    float refl = mirror(p);
    float best = 1e5;
    liveScene(p, best);
    float am = abs(best);
    float o = min(liveOccluders(p), truckOccluder(p));
    float near = min(am, abs(o));
    if (near > 0.7) { z -= near - 0.45; continue; }
    float d = 0.06 + 0.2 * near;
    acc += T * gCol * gW * glow(am, p.z) * refl;
    if (best < 0.0 || o < 0.0) T *= exp(-uOcc * d);
    z -= d;
  }
  vec3 dyn = (1.0 - exp(-acc * uExposure) + waterOverlay(f)) * vignette();
  vec2 uv = gl_FragCoord.xy / uRes;
  float dy = max(GROUND - f.y, 0.0);
  float ripple = 0.05 * (sin(dy * 26.0 + uTime * 1.3) - sin(dy * 26.0)) * min(dy, 1.0);
  uv.x += ripple * frameScale() / uRes.x;
  vec3 base = texture2D(uStatic, uv).rgb;
  vec3 col = 1.0 - (1.0 - base) * (1.0 - dyn);
  col += (rnd(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.03;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export function buildScene(focusX: number, citySource: string): HoloScene {
  const shared = `${HEADER}${TRUCK_SOURCE}${citySource}`;
  return {
    focusX,
    still: `${shared}${STATIC_MAIN}`,
    live: `${shared}${LIVE_MAIN}`,
  };
}
