import { useState, useCallback, useEffect } from 'react';
import { menuItemService } from '@/lib/supabase/MenuItemService';
import type { MenuItem } from '@/lib/types';
import { useToast } from './UseToast';

// Define action history item for undo functionality
interface ActionHistoryItem {
  action: 'add' | 'edit' | 'delete';
  item: MenuItem | null;
  previousState: MenuItem[] | null;
  timestamp: number;
}

export function useMenuItems(truckId: string, initialItems: MenuItem[] = []) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const { toast } = useToast();

  // Fetch menu items from food_trucks.menu JSONB column when truckId changes
  useEffect(() => {
    if (truckId && initialItems.length === 0) {
      const fetchMenuItems = async () => {
        setLoading(true);
        try {
          const result = await menuItemService.getItemsForTruck(truckId);

          if (result.error) {
            throw new Error(result.error);
          }

          setMenuItems(result.data ?? []);
        } catch (error_) {
          const errorMessage =
            error_ instanceof Error ? error_.message : 'Failed to load menu items';
          setError(errorMessage);
          toast({
            title: 'Error Loading Menu Items',
            description: errorMessage,
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      void fetchMenuItems();
    }
  }, [truckId, initialItems.length]);

  // Add action to history for undo functionality
  const addToHistory = useCallback((action: ActionHistoryItem) => {
    setActionHistory((prev) => {
      const newHistory = [...prev, action];
      // Keep only the last 20 actions to prevent memory issues
      if (newHistory.length > 20) {
        return newHistory.slice(-20);
      }
      return newHistory;
    });
  }, []);

  // Add a new menu item with optimistic update
  const addMenuItem = useCallback(
    async (
      itemData: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>,
    ): Promise<{ success: boolean; item?: MenuItem; error?: string }> => {
      const newItem: MenuItem = {
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        category: itemData.category ?? 'Uncategorized',
        dietary_info: itemData.dietary_info,
        dietary_tags: itemData.dietary_tags,
        photo_url: itemData.photo_url,
        is_popular: itemData.is_popular,
      } as MenuItem;

      // Store previous state for potential rollback
      const previousState = [...menuItems];

      // Optimistically update UI
      setMenuItems((prev) => [...prev, newItem]);

      try {
        // Save to database via JSONB update
        const result = await menuItemService.createItem(truckId, itemData);

        if (result.error) {
          throw new Error(result.error);
        }

        // Update with the saved item
        const savedItem = result.data;
        if (savedItem) {
          // Add to action history for undo functionality
          addToHistory({
            action: 'add',
            item: savedItem,
            previousState,
            timestamp: Date.now(),
          });

          return { success: true, item: savedItem };
        } else {
          throw new Error('Item was created but no data returned');
        }
      } catch (error_) {
        // Rollback optimistic update on error
        setMenuItems(previousState);

        const errorMessage = error_ instanceof Error ? error_.message : 'Failed to add menu item';
        setError(errorMessage);
        toast({
          title: 'Error Adding Menu Item',
          description: errorMessage,
          variant: 'destructive',
        });

        return { success: false, error: errorMessage };
      }
    },
    [truckId, menuItems, addToHistory, toast],
  );

  // Update an existing menu item with optimistic update
  // Note: Uses item name to identify since JSONB items don't have IDs
  const updateMenuItem = useCallback(
    async (
      itemName: string,
      updates: Partial<MenuItem>,
    ): Promise<{ success: boolean; item?: MenuItem; error?: string }> => {
      const previousState = [...menuItems];
      const itemToUpdate = menuItems.find((item) => item.name === itemName);

      if (!itemToUpdate) {
        const error = 'Menu item not found';
        toast({
          title: 'Error Updating Menu Item',
          description: error,
          variant: 'destructive',
        });
        return { success: false, error };
      }

      // Optimistically update UI
      setMenuItems((prev) =>
        prev.map((item) => (item.name === itemName ? { ...item, ...updates } : item)),
      );

      try {
        // Save to database via JSONB update
        const result = await menuItemService.updateItem(truckId, itemName, updates);

        if (result.error) {
          throw new Error(result.error);
        }

        const updatedItem = result.data;
        if (updatedItem) {
          setMenuItems((prev) =>
            prev.map((item) => (item.name === (updates.name ?? itemName) ? updatedItem : item)),
          );

          // Add to action history for undo functionality
          addToHistory({
            action: 'edit',
            item: updatedItem,
            previousState,
            timestamp: Date.now(),
          });

          return { success: true, item: updatedItem };
        } else {
          throw new Error('Item was updated but no data returned');
        }
      } catch (error_) {
        // Rollback optimistic update on error
        setMenuItems(previousState);

        const errorMessage =
          error_ instanceof Error ? error_.message : 'Failed to update menu item';
        setError(errorMessage);
        toast({
          title: 'Error Updating Menu Item',
          description: errorMessage,
          variant: 'destructive',
        });

        return { success: false, error: errorMessage };
      }
    },
    [truckId, menuItems, addToHistory, toast],
  );

  // Delete a menu item with optimistic update
  // Note: Uses item name to identify since JSONB items don't have IDs
  const deleteMenuItem = useCallback(
    async (itemName: string): Promise<{ success: boolean; error?: string }> => {
      const itemToDelete = menuItems.find((item) => item.name === itemName);
      if (!itemToDelete) {
        const error = 'Menu item not found';
        toast({
          title: 'Error Deleting Menu Item',
          description: error,
          variant: 'destructive',
        });
        return { success: false, error };
      }

      const previousState = [...menuItems];

      // Optimistically remove from UI
      setMenuItems((prev) => prev.filter((item) => item.name !== itemName));

      // Add to history immediately for undo
      addToHistory({
        action: 'delete',
        item: itemToDelete,
        previousState,
        timestamp: Date.now(),
      });

      try {
        // Delete from database via JSONB update
        const result = await menuItemService.deleteItem(truckId, itemName);

        if (result.success) {
          return { success: true };
        } else {
          throw new Error(result.error ?? 'Failed to delete menu item');
        }
      } catch (error_) {
        // If deletion fails, restore the item
        setMenuItems(previousState);

        const errorMessage =
          error_ instanceof Error ? error_.message : 'Failed to delete menu item';
        setError(errorMessage);
        toast({
          title: 'Error Deleting Menu Item',
          description: errorMessage,
          variant: 'destructive',
        });

        return { success: false, error: errorMessage };
      }
    },
    [truckId, menuItems, addToHistory, toast],
  );

  // Undo the last action
  const undoLastAction = useCallback(async (): Promise<boolean> => {
    if (actionHistory.length === 0) {
      toast({
        title: 'Cannot Undo',
        description: 'No actions available to undo',
        variant: 'destructive',
      });
      return false;
    }

    const lastAction = actionHistory.at(-1);

    if (!lastAction || !lastAction.previousState) {
      toast({
        title: 'Cannot Undo',
        description: 'No previous state available',
        variant: 'destructive',
      });
      return false;
    }

    // Apply the previous state
    setMenuItems(lastAction.previousState);

    // Also persist to database
    const result = await menuItemService.replaceMenu(truckId, lastAction.previousState);

    if (result.error) {
      toast({
        title: 'Error Undoing',
        description: result.error,
        variant: 'destructive',
      });
      return false;
    }

    // Remove the last action from history
    setActionHistory((prev) => prev.slice(0, -1));

    toast({
      title: 'Undo Successful',
      description: `Reverted ${lastAction.action} action`,
    });
    return true;
  }, [truckId, actionHistory, toast]);

  // Refresh menu items from the server
  const refreshMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await menuItemService.getItemsForTruck(truckId);
      if (result.error) {
        throw new Error(result.error);
      }
      setMenuItems(result.data ?? []);
    } catch (error_) {
      const errorMessage =
        error_ instanceof Error ? error_.message : 'Failed to refresh menu items';
      setError(errorMessage);
      toast({
        title: 'Error Refreshing Menu Items',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [truckId, toast]);

  return {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    undoLastAction,
    refreshMenuItems,
    actionHistory,
  };
}
