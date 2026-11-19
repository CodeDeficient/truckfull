'use client';

import { useState, type Dispatch, type SetStateAction, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MenuItemSchema } from '@/lib/validation/schemas/v1/api';
import { useToast } from '@/hooks/UseToast';
import {
  uploadMenuItemPhoto,
  deleteMenuItemPhoto,
} from '@/lib/supabase/utils/menuItemPhotoService';
import PhotoUploadSection from '@/components/common/PhotoUploadSection';
import { logError } from '@/lib/logging';

// Process image using canvas utilities - moved outside component for scoping
const processImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.addEventListener('load', () => {
      URL.revokeObjectURL(img.src); // Clean up the object URL

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context from canvas.'));
        return;
      }

      // Set target dimensions for menu item photos
      const targetWidth = 800; // Max width for menu photos
      const targetHeight = 600; // Max height for menu photos
      const aspectRatio = img.width / img.height;

      // Calculate dimensions maintaining aspect ratio
      let newWidth = targetWidth;
      let newHeight = targetHeight;

      if (aspectRatio > 1) {
        newHeight = targetWidth / aspectRatio;
      } else {
        newWidth = targetHeight * aspectRatio;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to Blob and return as File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            reject(new Error('Image processing failed'));
          }
        },
        'image/jpeg',
        0.85, // Quality
      );
    });
    img.addEventListener('error', () => {
      reject(new Error('Failed to load image for processing.'));
    });
  });
};

// Create a schema specifically for the menu item form
const MenuItemFormSchema = MenuItemSchema;

// Define the form data structure aligned with MenuItem type
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

interface MenuItemEditorProps {
  readonly initialData: FormData;
  readonly onSave: (data: FormData) => void | Promise<void>;
  readonly onCancel: () => void | Promise<void>;
  readonly loading?: boolean;
}

// Local, focused subcomponents to reduce the main function length
interface CommonProps {
  readonly formData: FormData;
  readonly setFormData: Dispatch<SetStateAction<FormData>>;
}

function BasicInformationSection({ formData, setFormData }: CommonProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category ?? ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description ?? ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function PricingSection({ formData, setFormData }: CommonProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pricing</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                price: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function DietaryInformationSection({ formData, setFormData }: CommonProps) {
  const handleDietaryTagChange = (tag: string, checked: boolean) => {
    setFormData((prev) => {
      const currentTags = prev.dietary_tags ?? [];
      const newTags = checked ? [...currentTags, tag] : currentTags.filter((t) => t !== tag);

      return {
        ...prev,
        dietary_tags: newTags,
      };
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Dietary Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dietary-vegan"
            checked={formData.dietary_tags?.includes('vegan') ?? false}
            onCheckedChange={(checked) => handleDietaryTagChange('vegan', checked === true)}
          />
          <Label htmlFor="dietary-vegan">Vegan</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dietary-vegetarian"
            checked={formData.dietary_tags?.includes('vegetarian') ?? false}
            onCheckedChange={(checked) => handleDietaryTagChange('vegetarian', checked === true)}
          />
          <Label htmlFor="dietary-vegetarian">Vegetarian</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dietary-gluten-free"
            checked={formData.dietary_tags?.includes('gluten-free') ?? false}
            onCheckedChange={(checked) => handleDietaryTagChange('gluten-free', checked === true)}
          />
          <Label htmlFor="dietary-gluten-free">Gluten-Free</Label>
        </div>
      </div>
    </div>
  );
}

function AdditionalOptionsSection({ formData, setFormData }: CommonProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Additional Options</h3>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-popular"
          checked={formData.is_popular ?? false}
          onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked === true })}
        />
        <Label htmlFor="is-popular">Mark as Popular Item</Label>
      </div>
    </div>
  );
}

function SubmitActions({
  loading,
  onCancel,
}: {
  readonly loading: boolean;
  readonly onCancel: () => void | Promise<void>;
}) {
  const handleCancelClick = async () => {
    try {
      const result = onCancel();
      if (result && typeof result.catch === 'function') {
        await result;
      }
    } catch (error) {
      logError('Error during cancel:', error);
    }
  };

  return (
    <div className="flex justify-end space-x-4 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void handleCancelClick();
        }}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

export default function MenuItemEditor({
  initialData,
  onSave,
  onCancel,
  loading = false,
}: MenuItemEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialData);
  const { toast } = useToast();

  // Use form hook with validation
  useForm<z.infer<typeof MenuItemFormSchema>>({
    resolver: zodResolver(MenuItemFormSchema),
    defaultValues: {
      id: initialData.id ?? undefined,
      name: initialData.name ?? '',
      description: initialData.description ?? '',
      price: initialData.price,
      category: initialData.category ?? '',
      dietary_info: initialData.dietary_info ?? [],
      dietary_tags: initialData.dietary_tags ?? [],
      photo_url: initialData.photo_url ?? '',
      is_popular: initialData.is_popular ?? false,
      truck_id: initialData.truck_id ?? '',
      created_at: initialData.created_at ?? '',
      updated_at: initialData.updated_at ?? '',
    },
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const formDataForValidation = {
      ...formData,
      photo_alt_text: undefined,
    };

    const validationResult = MenuItemFormSchema.safeParse(formDataForValidation);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      );

      toast({
        title: 'Validation Error',
        description: (
          <ul className="list-disc pl-4 mt-2">
            {errors.map((error: string, index: number) => (
              <li key={index} className="text-sm">
                {error}
              </li>
            ))}
          </ul>
        ),
        variant: 'destructive',
      });

      return;
    }

    setIsSaving(true);

    try {
      const validatedDataWithAltText = {
        ...validationResult.data,
        photo_alt_text: formData.photo_alt_text,
      };
      await onSave(validatedDataWithAltText as FormData);
      toast({
        title: 'Success',
        description: formData.id
          ? 'Menu item updated successfully!'
          : 'Menu item added successfully!',
      });
    } catch (error) {
      logError('Error saving menu item:', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save menu item. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-4">
      <form onSubmit={onSubmit} className="space-y-6">
        <PhotoUploadSection
          formData={{
            photo_url: formData.photo_url,
            photo_alt_text: formData.photo_alt_text,
            id: formData.id,
            truck_id: formData.truck_id,
          }}
          setFormData={(updater) => {
            if (typeof updater === 'function') {
              setFormData((prev) => {
                const newData = updater({
                  photo_url: prev.photo_url,
                  photo_alt_text: prev.photo_alt_text,
                  id: prev.id,
                  truck_id: prev.truck_id,
                });
                return {
                  ...prev,
                  photo_url: newData.photo_url,
                  photo_alt_text: newData.photo_alt_text,
                };
              });
            } else {
              setFormData((prev) => ({
                ...prev,
                photo_url: updater.photo_url,
                photo_alt_text: updater.photo_alt_text,
              }));
            }
          }}
          uploadService={uploadMenuItemPhoto}
          deleteService={deleteMenuItemPhoto}
          photoType="menu-item"
          processImage={processImage}
          onPhotoUrlChange={(url) => {
            setFormData((prev) => ({ ...prev, photo_url: url }));
          }}
        />
        <BasicInformationSection formData={formData} setFormData={setFormData} />
        <PricingSection formData={formData} setFormData={setFormData} />
        <DietaryInformationSection formData={formData} setFormData={setFormData} />
        <AdditionalOptionsSection formData={formData} setFormData={setFormData} />
        <SubmitActions loading={isSaving || loading} onCancel={onCancel} />
      </form>
    </div>
  );
}
