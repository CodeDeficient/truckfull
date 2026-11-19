import type { HoloScene } from '@/lib/holo/sceneCommon';

const SCENE_LOADERS: Readonly<Record<string, () => Promise<HoloScene>>> = {
  'anderson-sc': () => import('@/lib/holo/cities/anderson').then((m) => m.ANDERSON_SCENE),
  'atlanta-ga': () => import('@/lib/holo/cities/atlanta').then((m) => m.ATLANTA_SCENE),
  'augusta-ga': () => import('@/lib/holo/cities/augusta').then((m) => m.AUGUSTA_SCENE),
  'charleston-sc': () => import('@/lib/holo/cities/charleston').then((m) => m.CHARLESTON_SCENE),
  'columbia-sc': () => import('@/lib/holo/cities/columbia').then((m) => m.COLUMBIA_SCENE),
  'florence-sc': () => import('@/lib/holo/cities/florence').then((m) => m.FLORENCE_SCENE),
  'greenville-sc': () => import('@/lib/holo/cities/greenville').then((m) => m.GREENVILLE_SCENE),
  'mauldin-sc': () => import('@/lib/holo/cities/mauldin').then((m) => m.MAULDIN_SCENE),
  'myrtle-beach-sc': () =>
    import('@/lib/holo/cities/myrtleBeach').then((m) => m.MYRTLE_BEACH_SCENE),
  'north-charleston-sc': () =>
    import('@/lib/holo/cities/northCharleston').then((m) => m.NORTH_CHARLESTON_SCENE),
  'rock-hill-sc': () => import('@/lib/holo/cities/rockHill').then((m) => m.ROCK_HILL_SCENE),
  'savannah-ga': () => import('@/lib/holo/cities/savannah').then((m) => m.SAVANNAH_SCENE),
  'spartanburg-sc': () => import('@/lib/holo/cities/spartanburg').then((m) => m.SPARTANBURG_SCENE),
  'summerville-sc': () => import('@/lib/holo/cities/summerville').then((m) => m.SUMMERVILLE_SCENE),
};

export function hasHoloScene(citySlug: string): boolean {
  return Object.hasOwn(SCENE_LOADERS, citySlug);
}

const loadGenericScene = (): Promise<HoloScene> =>
  import('@/lib/holo/cities/generic').then((m) => m.GENERIC_SCENE);

export async function loadHoloScene(citySlug: string): Promise<HoloScene> {
  const load = hasHoloScene(citySlug) ? SCENE_LOADERS[citySlug] : undefined;
  return (load ?? loadGenericScene)();
}

export const HOLO_SCENE_SLUGS: readonly string[] = Object.keys(SCENE_LOADERS);

const holoAssetName = (citySlug: string): string =>
  hasHoloScene(citySlug) ? citySlug : 'generic';

export function holoStillPath(citySlug: string): string {
  return `/heroes/holo/${holoAssetName(citySlug)}.webp`;
}

export function holoClipPath(citySlug: string): string {
  return `/heroes/holo/clips/${holoAssetName(citySlug)}.webm`;
}
