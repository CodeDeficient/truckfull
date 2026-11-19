import { classifyEvent, ALL_CATEGORIES, type CategoryInfo } from '@/lib/events/eventCategories';

describe('eventCategories', () => {
  describe('classifyEvent', () => {
    it('classifies "Savannah Music Festival" as festival', () => {
      const result = classifyEvent('Savannah Music Festival');
      expect(result.category).toBe('festival');
      expect(result.label).toBe('Festival');
    });

    it('classifies "Forsyth Farmers Market" as market', () => {
      const result = classifyEvent('Forsyth Farmers Market');
      expect(result.category).toBe('market');
      expect(result.label).toBe('Market');
    });

    it('classifies "Jazz Night Live" as music/concert', () => {
      const result = classifyEvent('Jazz Night Live');
      expect(result.category).toBe('concert');
      expect(result.label).toBe('Music');
    });

    it('classifies "5K Run for Charity" as sports (first match wins)', () => {
      const result = classifyEvent('5K Run for Charity');
      expect(result.category).toBe('sports');
      expect(result.label).toBe('Sports');
    });

    it('classifies "BBQ Cookoff" as food_drink', () => {
      const result = classifyEvent('BBQ Cookoff');
      expect(result.category).toBe('food_drink');
      expect(result.label).toBe('Food & Drink');
    });

    it('classifies "Random Event Title" as other', () => {
      const result = classifyEvent('Random Event Title');
      expect(result.category).toBe('other');
      expect(result.label).toBe('Event');
    });
  });

  describe('ALL_CATEGORIES', () => {
    it('has 11 entries', () => {
      expect(ALL_CATEGORIES).toHaveLength(11);
    });

    it('includes all expected categories', () => {
      const categories = ALL_CATEGORIES.map((c) => c.category);
      expect(categories).toContain('festival');
      expect(categories).toContain('market');
      expect(categories).toContain('concert');
      expect(categories).toContain('sports');
      expect(categories).toContain('community');
      expect(categories).toContain('food_drink');
      expect(categories).toContain('art_culture');
      expect(categories).toContain('holiday');
      expect(categories).toContain('charity');
      expect(categories).toContain('business');
      expect(categories).toContain('other');
    });

    it('each category has required properties', () => {
      ALL_CATEGORIES.forEach((cat: CategoryInfo) => {
        expect(cat).toHaveProperty('category');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('icon');
        expect(cat).toHaveProperty('color');
      });
    });
  });
});
