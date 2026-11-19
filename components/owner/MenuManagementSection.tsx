/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Intentional: tabIndex needed for keyboard navigation */
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/UseToast';
import type { MenuItem } from '@/lib/types';
import MenuItemEditor from './MenuItemEditor';
import { useMenuItems } from '@/hooks/useMenuItems';

// FormData interface - needs to match the MenuItemEditor component
interface FormData {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  dietary_info?: string[];
  dietary_tags?: string[];
  photo_url?: string;
  photo_alt_text?: string;
  is_popular?: boolean;
  truck_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface MenuManagementSectionProps {
  readonly truckId: string;
  readonly initialMenuItems?: MenuItem[];
}

export default function MenuManagementSection({
  truckId,
  initialMenuItems = [],
}: MenuManagementSectionProps) {
  const { menuItems, loading, addMenuItem, updateMenuItem, deleteMenuItem, undoLastAction } =
    useMenuItems(truckId, initialMenuItems);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<FormData | null>(null);
  const { toast } = useToast();

  // Filter menu items based on search term
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const descriptionMatch =
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const categoryMatch =
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      return nameMatch || descriptionMatch || categoryMatch;
    });
  }, [menuItems, searchTerm]);

  const handleAddItem = () => {
    setEditingItem(null);
    setIsAdding(true);
  };

  const handleEditItem = (item: MenuItem) => {
    // Convert MenuItem to FormData format with proper type checking
    const formData: FormData = {
      id: typeof item.id === 'string' ? item.id : undefined,
      name: typeof item.name === 'string' ? item.name : '',
      description: typeof item.description === 'string' ? item.description : undefined,
      price: typeof item.price === 'number' ? item.price : undefined,
      category: typeof item.category === 'string' ? item.category : undefined,
      dietary_info: Array.isArray(item.dietary_info) ? item.dietary_info : [],
      dietary_tags: Array.isArray(item.dietary_tags) ? item.dietary_tags : [],
      photo_url: typeof item.photo_url === 'string' ? item.photo_url : undefined,
      photo_alt_text: typeof item.photo_alt_text === 'string' ? item.photo_alt_text : undefined,
      is_popular: typeof item.is_popular === 'boolean' ? item.is_popular : false,
      truck_id: typeof item.truck_id === 'string' ? item.truck_id : undefined,
      created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
      updated_at: typeof item.updated_at === 'string' ? item.updated_at : undefined,
    };
    setEditingItem(formData);
    setIsAdding(false);
  };

  // Function to handle undo actions - moved from inline arrow function to outer scope
  const handleUndoAction = () => {
    undoLastAction();
  };

  const handleDeleteItem = async (itemName: string) => {
    const result = await deleteMenuItem(itemName);

    if (result.success) {
      toast({
        title: 'Menu Item Deleted',
        description: 'The menu item has been deleted. You can undo this action.',
        action: (
          <Button size="sm" variant="outline" onClick={handleUndoAction}>
            Undo
          </Button>
        ),
        duration: 8000,
      });
    } else {
      toast({
        title: 'Delete Failed',
        description: result.error ?? 'Could not delete menu item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveItem = async (itemData: FormData) => {
    // For JSONB menu items, we use name as the identifier (not id)
    // Check if this is an update by seeing if we're in editing mode
    if (editingItem && editingItem.name) {
      // Update existing item - use the original name to find it
      const result = await updateMenuItem(editingItem.name, {
        ...itemData,
        truck_id: truckId,
      });

      if (result.success) {
        setIsAdding(false);
        setEditingItem(null);
      }
    } else {
      // Create new item
      const result = await addMenuItem({
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        category: itemData.category,
        dietary_info: itemData.dietary_info,
        dietary_tags: itemData.dietary_tags,
        photo_url: itemData.photo_url,
        photo_alt_text: itemData.photo_alt_text,
        is_popular: itemData.is_popular,
        truck_id: truckId,
      });

      if (result.success) {
        setIsAdding(false);
        setEditingItem(null);
      }
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingItem(null);
  };

  // Helper function to create aria-label for menu items
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const getItemAriaLabel = (item: MenuItem) => {
    const descriptionPart = item.description ? `. Description: ${item.description}. ` : '. ';
    const pricePart = item.price?.toFixed(2) ?? '0.00';
    return `${item.name}${descriptionPart}Price: ${pricePart}`;
  };

  // Helper to get the empty state message
  const getEmptyStateMessage = () => {
    return searchTerm
      ? 'No menu items match your search'
      : 'No menu items yet. Add your first menu item!';
  };

  // Helper to render the menu items based on state
  const renderMenuItems = () => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading menu items...</div>;
    } else if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
          {getEmptyStateMessage()}
        </div>
      );
    } else {
      return (
        <>
          {filteredItems.map((item, index) => (
            <div
              key={item.name ?? `menu-item-${index}`}
              className="bg-card rounded-lg p-4 hover:bg-muted/50 transition-colors"
              role="group"
              aria-label={getItemAriaLabel(item)}
              tabIndex={0}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium truncate">{item.name}</h4>
                {item.is_popular && (
                  <Badge variant="secondary" className="text-xs shrink-0" aria-label="Popular item">
                    Popular
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {item.description ?? 'No description'}
              </p>
              <div className="flex items-center gap-2 mb-3">
                {item.category && (
                  <Badge
                    variant="outline"
                    className="text-xs border-0 bg-muted/50"
                    aria-label={`Category: ${item.category}`}
                  >
                    {item.category}
                  </Badge>
                )}
                {item.price != null && (
                  <span className="text-sm font-medium text-primary">
                    ${item.price.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleEditItem(item);
                  }}
                  aria-label={`Edit ${item.name}`}
                  title={`Edit ${item.name}`}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleDeleteItem(item.name);
                  }}
                  aria-label={`Delete ${item.name}`}
                  title={`Delete ${item.name}`}
                  disabled={loading}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </>
      );
    }
  };

  return (
    <div role="region" aria-labelledby="menu-management-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2
            id="menu-management-title"
            className="text-2xl font-bold tracking-tight"
          >
            Menu Management
          </h2>
          <p className="text-muted-foreground mt-1">Manage your food truck's menu items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndoAction}
            aria-label="Undo last action"
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button
            onClick={handleAddItem}
            size="sm"
            aria-label="Add new menu item"
            disabled={loading}
            className="bg-primary/10 text-primary font-semibold hover:bg-primary/15"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
          aria-label="Search menu items"
          role="search"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list" aria-label="Menu items list">
        {renderMenuItems()}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAdding || !!editingItem} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <DialogTitle className="sr-only">
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editingItem
              ? 'Update the details of this menu item'
              : 'Add a new item to your food truck menu'}
          </DialogDescription>
          <MenuItemEditor
            initialData={
              editingItem
                ? {
                    ...editingItem,
                    truck_id: truckId,
                  }
                : {
                    truck_id: truckId,
                    name: '',
                    description: undefined,
                    price: undefined,
                    category: undefined,
                    dietary_info: [],
                    dietary_tags: [],
                    photo_url: undefined,
                    photo_alt_text: undefined,
                    is_popular: false,
                    created_at: undefined,
                    updated_at: undefined,
                  }
            }
            onSave={(itemData) => {
              void handleSaveItem(itemData);
            }}
            onCancel={handleCancel}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
