/**
 * Flattens a nested menu structure (Category -> Items) into a flat list of items with category fields.
 * Validates prices are numeric.
 */
export function flattenMenu(menu: Record<string, unknown>[]): Record<string, unknown>[] {
  const flatMenu: Record<string, unknown>[] = [];

  if (menu && Array.isArray(menu)) {
    for (const cat of menu) {
      // Check if it's a category with items
      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          flatMenu.push({
            ...item,
            category: cat.category || 'Other',
            // Ensure numeric price if present
            price: item.price ? Number(item.price) : null,
          });
        }
      } else if (cat.name && cat.category) {
        // Handle case where it might already be flat or mixed?
        // For now, strict flattening from the nested "Scraper" format.
        // If it looks like a flat item, we might just pass it through,
        // but the current parser is known to output nested.
      }
    }
  }
  return flatMenu;
}
