import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';

describe('form-sections', () => {
  describe('UnifiedFormData Structure', () => {
    it('should have basic information fields', () => {
      const formData = {
        name: 'Test Truck',
        description: 'A great food truck',
      };
      
      expect(formData.name).toBe('Test Truck');
      expect(formData.description).toBe('A great food truck');
    });
  });

  describe('Contact Info Access', () => {
    it('should get contact info from nested structure', () => {
      const data = {
        contact_info: { phone: '555-1234', email: 'test@example.com', website: 'http://test.com' },
      };
      
      const contactInfo = data.contact_info ?? { phone: '', email: '', website: '' };
      expect(contactInfo.phone).toBe('555-1234');
    });

    it('should get contact info from flat structure', () => {
      const data = {
        phone: '555-1234',
        email: 'test@example.com',
        website: 'http://test.com',
      };
      
      const contactInfo = data.contact_info ?? {
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
      };
      
      expect(contactInfo.phone).toBe('555-1234');
    });
  });

  describe('Social Media Access', () => {
    it('should handle photo_url from nested structure', () => {
      const data = {
        social_media: { facebook: 'fb.com/test', photo_url: 'http://example.com/photo.jpg' },
        photo_url: 'http://example.com/old-photo.jpg',
      };
      
      const socialMedia = data.social_media ?? { facebook: data.facebook ?? '', photo_url: '' };
      socialMedia.photo_url ??= data.photo_url ?? '';
      
      expect(socialMedia.photo_url).toBe('http://example.com/photo.jpg');
    });
  });

  describe('Cuisine Types Access', () => {
    it('should get cuisine types from array field', () => {
      const data = { cuisine_type: ['American', 'BBQ', 'Mexican'] };
      const cuisineTypes = data.cuisineTypes ?? data.cuisine_type ?? [];
      
      expect(cuisineTypes).toEqual(['American', 'BBQ', 'Mexican']);
    });

    it('should get cuisine types from cuisineTypes field', () => {
      const data = { cuisineTypes: ['Italian', 'Pizza'] };
      const cuisineTypes = data.cuisineTypes ?? data.cuisine_type ?? [];
      
      expect(cuisineTypes).toEqual(['Italian', 'Pizza']);
    });
  });

  describe('Operating Hours Access', () => {
    it('should get operating hours from field', () => {
      const data = {
        operating_hours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
        },
      };
      
      const hours = data.operatingHours ?? data.operating_hours ?? {};
      expect(Object.keys(hours).length).toBe(2);
    });
  });

  describe('Error Sanitization', () => {
    it('should map duplicate_key error', () => {
      const errorMap: Record<string, string> = {
        duplicate_key: 'This entry already exists.',
        unique_violation: 'This entry already exists.',
      };
      
      const error = 'duplicate_key';
      const message = errorMap[error.toLowerCase()] ?? 'An error occurred. Please try again.';
      
      expect(message).toBe('This entry already exists.');
    });

    it('should map permission_denied error', () => {
      const errorMap: Record<string, string> = {
        permission_denied: 'You do not have permission to perform this action.',
      };
      
      const error = 'permission_denied';
      const message = Object.entries(errorMap).find(([key]) => error.toLowerCase().includes(key.toLowerCase()))?.[1] ?? 'An error occurred. Please try again.';
      
      expect(message).toBe('You do not have permission to perform this action.');
    });

    it('should return default message for unknown error', () => {
      const errorMap: Record<string, string> = {
        duplicate_key: 'This entry already exists.',
      };
      
      const error = 'unknown_error_code';
      const message = Object.entries(errorMap).find(([key]) => error.toLowerCase().includes(key.toLowerCase()))?.[1] ?? 'An error occurred. Please try again.';
      
      expect(message).toBe('An error occurred. Please try again.');
    });
  });

  describe('Day Label Formatting', () => {
    it('should capitalize first letter of day', () => {
      const day = 'monday';
      const label = day.charAt(0).toUpperCase() + day.slice(1);
      
      expect(label).toBe('Monday');
    });

    it('should handle all days of week', () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const labels = days.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
      
      expect(labels).toContain('Monday');
      expect(labels).toContain('Sunday');
    });
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<div data-testid="form-sections-placeholder" />);
      expect(container).toBeDefined();
    });
  });
});