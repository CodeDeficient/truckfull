import type { MenuItem } from '@/lib/types';

/**
 * Pure function to build a MenuItem from input
 */
export function buildMenuItemFromInput(
  newItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>,
): MenuItem {
  return {
    name: (newItem.name as string) ?? 'Unknown Item',
    description: newItem.description as string | undefined,
    price: newItem.price as number | undefined,
    category: (newItem.category as string) ?? 'Uncategorized',
    dietary_info: (newItem.dietary_info as string[]) ?? [],
    is_popular: (newItem.is_popular as boolean) ?? false,
    photo_url: newItem.photo_url as string | undefined,
  };
}

/**
 * Pure function to check if item name already exists in menu
 */
export function isDuplicateMenuItemName(menu: MenuItem[], name: string): boolean {
  return menu.some((i) => i.name === name);
}

/**
 * Pure function to find menu item by name
 */
export function findMenuItemByName(menu: MenuItem[], name: string): MenuItem | undefined {
  return menu.find((i) => i.name === name);
}

/**
 * Pure function to find menu item index by name
 */
export function findMenuItemIndexByName(menu: MenuItem[], name: string): number {
  return menu.findIndex((i) => i.name === name);
}

/**
 * Pure function to add item to menu
 */
export function addItemToMenu(menu: MenuItem[], item: MenuItem): MenuItem[] {
  return [...menu, item];
}

/**
 * Pure function to update item in menu by index
 */
export function updateItemInMenu(menu: MenuItem[], index: number, updatedItem: MenuItem): MenuItem[] {
  const newMenu = [...menu];
  newMenu[index] = updatedItem;
  return newMenu;
}

/**
 * Pure function to remove item from menu by name
 */
export function removeItemFromMenu(menu: MenuItem[], name: string): MenuItem[] {
  return menu.filter((i) => i.name !== name);
}

function ownerMenuUrl(truckId: string): string {
  return `/api/owner/trucks/${encodeURIComponent(truckId)}/menu`;
}

async function saveOwnerMenu(truckId: string, menu: MenuItem[]): Promise<string | undefined> {
  const response = await fetch(ownerMenuUrl(truckId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menu }),
  });
  return response.ok ? undefined : `menu API returned ${response.status}`;
}

/**
 * MenuItemService - Service for managing menu items stored in food_trucks.menu JSONB column
 *
 * Menu items are stored as an array in the food_trucks.menu JSONB column,
 * not in a separate table. Each item has: name, description, price, category,
 * dietary_info, is_popular, and optionally photo_url.
 */
export class MenuItemService {
  /**
   * Gets all menu items for a truck from the food_trucks.menu JSONB column
   */
  async getItemsForTruck(truckId: string): Promise<{ data?: MenuItem[]; error?: string }> {
    try {
      const response = await fetch(ownerMenuUrl(truckId), { cache: 'no-store' });
      if (!response.ok) {
        return { error: `Failed to fetch menu: ${response.status}` };
      }
      const body = (await response.json()) as { menu?: MenuItem[] };
      const menuItems = body.menu ?? [];
      return { data: menuItems };
    } catch (error) {
      return {
        error: `Error fetching menu items: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Gets a specific menu item by name from the truck's menu
   * Note: Menu items in JSONB don't have IDs, so we match by name
   */
  async getItemByName(
    truckId: string,
    itemName: string,
  ): Promise<{ data?: MenuItem; error?: string }> {
    try {
      const result = await this.getItemsForTruck(truckId);
      if (result.error) return { error: result.error };

      const item = result.data?.find((i) => i.name === itemName);
      if (!item) {
        return { error: 'Menu item not found' };
      }
      return { data: item };
    } catch (error) {
      return {
        error: `Error fetching menu item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Creates a new menu item by appending to the food_trucks.menu JSONB array
   */
  async createItem(
    truckId: string,
    newItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<{ data?: MenuItem; error?: string }> {
    try {
      const result = await this.getItemsForTruck(truckId);
      if (result.error) return { error: result.error };

      const currentMenu = result.data ?? [];

      if (isDuplicateMenuItemName(currentMenu, newItem.name as string)) {
        return { error: 'A menu item with this name already exists' };
      }

      const itemToAdd = buildMenuItemFromInput(newItem);
      const updatedMenu = addItemToMenu(currentMenu, itemToAdd);

      const updateError = await saveOwnerMenu(truckId, updatedMenu);

      if (updateError) {
        return { error: `Failed to create menu item: ${updateError}` };
      }

      return { data: itemToAdd };
    } catch (error) {
      return {
        error: `Error creating menu item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Updates a menu item in the food_trucks.menu JSONB array
   * Matches by item name since JSONB items don't have IDs
   */
  async updateItem(
    truckId: string,
    itemName: string,
    updates: Partial<MenuItem>,
  ): Promise<{ data?: MenuItem; error?: string }> {
    try {
      const result = await this.getItemsForTruck(truckId);
      if (result.error) return { error: result.error };

      const currentMenu = result.data ?? [];
      const itemIndex = findMenuItemIndexByName(currentMenu, itemName);

      if (itemIndex === -1) {
        return { error: 'Menu item not found' };
      }

      const existingItem = currentMenu[itemIndex];
      const updatedItem: MenuItem = {
        ...existingItem,
        ...updates,
        name: updates.name ?? existingItem.name,
      };
      const updatedMenu = updateItemInMenu(currentMenu, itemIndex, updatedItem);

      const updateError = await saveOwnerMenu(truckId, updatedMenu);

      if (updateError) {
        return { error: `Failed to update menu item: ${updateError}` };
      }

      return { data: updatedItem };
    } catch (error) {
      return {
        error: `Error updating menu item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Deletes a menu item from the food_trucks.menu JSONB array
   * Matches by item name
   */
  async deleteItem(
    truckId: string,
    itemName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.getItemsForTruck(truckId);
      if (result.error) return { success: false, error: result.error };

      const currentMenu = result.data ?? [];
      const itemIndex = findMenuItemIndexByName(currentMenu, itemName);

      if (itemIndex === -1) {
        return { success: false, error: 'Menu item not found' };
      }

      const updatedMenu = removeItemFromMenu(currentMenu, itemName);

      const updateError = await saveOwnerMenu(truckId, updatedMenu);

      if (updateError) {
        return { success: false, error: `Failed to delete menu item: ${updateError}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error deleting menu item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Replaces entire menu for a truck
   */
  async replaceMenu(
    truckId: string,
    newMenu: MenuItem[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateError = await saveOwnerMenu(truckId, newMenu);

      if (updateError) {
        return { success: false, error: `Failed to replace menu: ${updateError}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error replacing menu: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const menuItemService = new MenuItemService();
