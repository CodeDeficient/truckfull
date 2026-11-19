import { buildScene } from '@/lib/holo/sceneCommon';
import { SCENE_PARTS } from '@/lib/holo/sceneParts';

const ROCK_HILL_SOURCE = `
const vec3 BRICK = vec3(1.0, 0.55, 0.42);
const vec3 WARM = vec3(1.0, 0.7, 0.38);
const vec3 BRONZE = vec3(0.95, 0.78, 0.55);
const vec3 LEAF = vec3(0.35, 0.85, 0.5);
const vec3 HALL_C = vec3(2.6, GROUND, -1.7);
const vec3 STATUE_C = vec3(5.3, GROUND, -0.3);

float hallWindows(vec3 lp, float z){
  float wx = lp.x - 0.2 * clamp(floor(lp.x / 0.2 + 0.5), -4.0, 4.0);
  float wy = lp.y - 0.2 - 0.28 * clamp(floor((lp.y - 0.2) / 0.28 + 0.5), 0.0, 1.0);
  vec3 wp = vec3(wx, wy, lp.z - z);
  float win = min(sdBox(wp, vec3(0.05, 0.07, 0.04)), sdCylZ(wp - vec3(0.0, 0.07, 0.0), 0.05, 0.04));
  return max(win, 0.27 - abs(lp.x));
}

float tillman(vec3 p){
  vec3 lp = p - HALL_C;
  float bb = sdBox(lp - vec3(0.0, 1.0, 0.0), vec3(1.0, 1.15, 0.45));
  if (bb > CULL) return bb;
  float wing = sdRBox(lp - vec3(0.0, 0.36, 0.0), vec3(0.85, 0.36, 0.3), 0.02);
  wing = max(wing, -hallWindows(lp, 0.3));
  float cornice = sdRBox(lp - vec3(0.0, 0.74, 0.0), vec3(0.88, 0.025, 0.33), 0.01);
  float tower = sdRBox(lp - vec3(0.0, 0.78, 0.05), vec3(0.2, 0.78, 0.2), 0.02);
  float belfry = sdBox(vec3(abs(lp.x) - 0.08, lp.y - 1.4, lp.z - 0.25), vec3(0.035, 0.08, 0.04));
  tower = max(tower, -belfry);
  float roof = sdTaper(lp, vec3(0.0, 1.56, 0.05), vec3(0.0, 2.05, 0.05), 0.24, 0.01);
  return min(min(wing, cornice), min(tower, roof));
}

float hallLights(vec3 p){
  vec3 lp = p - HALL_C;
  float win = hallWindows(lp, 0.28) + 0.01;
  float clock = max(length(lp.xy - vec2(0.0, 1.15)) - 0.1, abs(lp.z - 0.25) - 0.015);
  float belfry = sdBox(vec3(abs(lp.x) - 0.08, lp.y - 1.4, lp.z - 0.23), vec3(0.03, 0.07, 0.02));
  return min(min(win, clock), belfry);
}

float civitas(vec3 p){
  vec3 lp = p - STATUE_C;
  float bb = sdBox(lp - vec3(0.0, 1.1, 0.0), vec3(0.6, 1.25, 0.4));
  if (bb > CULL) return bb;
  float plinth = sdRBox(lp - vec3(0.0, 0.08, 0.0), vec3(0.22, 0.08, 0.22), 0.02);
  float column = sdTaper(lp, vec3(0.0, 0.16, 0.0), vec3(0.0, 1.25, 0.0), 0.09, 0.075);
  float capital = sdRBox(lp - vec3(0.0, 1.28, 0.0), vec3(0.13, 0.03, 0.13), 0.01);
  float body = sdTaper(lp, vec3(0.0, 1.31, 0.0), vec3(0.0, 1.75, 0.0), 0.09, 0.05);
  float head = length(lp - vec3(0.0, 1.83, 0.0)) - 0.06;
  float arm = sdTaper(lp, vec3(0.04, 1.7, 0.05), vec3(0.17, 2.06, 0.05), 0.022, 0.016);
  vec3 w = vec3(abs(lp.x), lp.y, lp.z + 0.06);
  float wing = sdTaper(w, vec3(0.05, 1.7, 0.0), vec3(0.4, 2.08, -0.04), 0.07, 0.015);
  wing = smin(wing, sdTaper(w, vec3(0.05, 1.62, 0.0), vec3(0.36, 1.86, -0.04), 0.06, 0.012), 0.05);
  float statue = min(min(body, head), min(arm, wing));
  return min(min(plinth, min(column, capital)), statue);
}

void staticScene(vec3 p, inout float best){
  take(tillman(p), best, BRICK, 1.0);
  take(hallLights(p), best, WARM, 1.25);
  take(civitas(p), best, BRONZE, 1.0);
  storefronts(p, -6.4, -3.04, -1.7, 21.0, best);
}

vec3 skyline(vec2 f){
  return skyGlow(f, vec3(0.42, 0.28, 0.45), vec3(1.0, 0.58, 0.38), 2.6) + moonGlow(f, vec2(-5.0, 1.75), vec3(1.0, 0.9, 0.75));
}

void liveScene(vec3 p, inout float best){
  vec3 orb = STATUE_C + vec3(0.18, 2.13, 0.05);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.2);
  take(length(p - orb) - 0.065, best, vec3(1.0, 0.85, 0.5), 1.6 * pulse);
  roundTree(p, vec3(4.2, GROUND, 0.4), 1.0, 0.6, 1.0, LEAF, best);
  stringLights(p, vec3(-6.3, GROUND + 0.88, -1.25), vec3(-4.7, GROUND + 0.88, -1.25), 0.18, 0.0, best);
  stringLights(p, vec3(-4.7, GROUND + 0.88, -1.25), vec3(-3.1, GROUND + 0.88, -1.25), 0.18, 3.0, best);
}

vec3 waterOverlay(vec2 f){
  return vec3(0.0);
}

float liveOccluders(vec3 p){
  return 1e5;
}
`;

export const ROCK_HILL_SCENE = buildScene(0.4, `${SCENE_PARTS}${ROCK_HILL_SOURCE}`);
