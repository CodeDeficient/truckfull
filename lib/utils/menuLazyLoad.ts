export function stripMenuFromTrucks(
  trucks: Record<string, unknown>[],
): Record<string, unknown>[] {
  return trucks.map((truck) => {
    const existingHasMenu = truck.has_menu;
    const menuSource = getMenuSource(truck);
    const computedHasMenu = existingHasMenu === true || hasMenuContent(menuSource);
    const keywords = extractMenuKeywords(menuSource);

    const stripped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(truck)) {
      if (key !== 'menu' && key !== 'menu_items') {
        stripped[key] = value;
      }
    }
    stripped.has_menu = computedHasMenu;
    stripped.menu_keywords = keywords;
    return stripped;
  });
}

export function getMenuSource(truck: Record<string, unknown>): unknown {
  return truck.menu ?? truck.menu_items;
}

export function hasMenuContent(menuItems: unknown): boolean {
  const entries = getMenuEntries(menuItems);

  return entries.some((item) => {
    if (isMenuCategory(item)) return item.items.length > 0;
    return isMenuItem(item);
  });
}

export function extractMenuKeywords(menuItems: unknown): string[] {
  const entries = getMenuEntries(menuItems);

  const keywords: string[] = [];
  for (const item of entries) {
    if (isMenuCategory(item)) {
      addKeyword(keywords, item.name);
      for (const menuItem of item.items) {
        addMenuItemKeywords(keywords, menuItem);
      }
    } else if (isMenuItem(item)) {
      addMenuItemKeywords(keywords, item);
    }
  }
  return keywords;
}

function ownCategory(category: unknown): string | null {
  return typeof category === 'string' && category.trim() !== '' ? category : null;
}

export function flattenMenuItems(menu: unknown): Record<string, unknown>[] {
  const entries = getMenuEntries(menu);

  return entries.flatMap((item) => {
    if (isMenuCategory(item)) {
      return item.items.map((menuItem) => ({
        ...menuItem,
        category: ownCategory(menuItem.category) ?? item.name,
      }));
    }
    return isMenuItem(item) ? [item] : [];
  });
}

export function readMenuFromRow(row: unknown): unknown {
  if (typeof row !== 'object' || row === null) return [];

  const menu = Reflect.get(row, 'menu');
  return menu ?? [];
}

export function shouldReuseTruckMenu(
  loadedTruckId: string | null,
  requestedTruckId: string | undefined,
  menuData: unknown,
): boolean {
  return Boolean(menuData && loadedTruckId && requestedTruckId && loadedTruckId === requestedTruckId);
}

export function getMenuEntries(menu: unknown): unknown[] {
  if (Array.isArray(menu)) return menu;

  if (typeof menu !== 'object' || menu === null) return [];

  const categories = Reflect.get(menu, 'categories');
  if (Array.isArray(categories)) return categories;

  const items = Reflect.get(menu, 'items');
  if (Array.isArray(items)) return items;

  return [];
}

function isMenuCategory(value: unknown): value is { name: string; items: Record<string, unknown>[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    Array.isArray((value as Record<string, unknown>).items)
  );
}

function isMenuItem(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).name === 'string'
  );
}

function addMenuItemKeywords(keywords: string[], item: Record<string, unknown>): void {
  addKeyword(keywords, item.name);
  addKeyword(keywords, item.category);
}

function addKeyword(keywords: string[], value: unknown): void {
  if (typeof value !== 'string') return;

  const keyword = value.trim().toLowerCase();
  if (keyword && !keywords.includes(keyword)) {
    keywords.push(keyword);
  }
}
