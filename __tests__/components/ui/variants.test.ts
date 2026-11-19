import { buttonVariants, toggleVariants, badgeVariants, labelVariants } from '@/components/ui/variants';

describe('variants', () => {
  describe('buttonVariants', () => {
    it('returns default variant classes', () => {
      const result = buttonVariants();
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
    });

    it('returns correct variant classes for default variant', () => {
      const result = buttonVariants({ variant: 'default' });
      expect(result).toContain('bg-primary');
    });

    it('returns correct variant classes for destructive variant', () => {
      const result = buttonVariants({ variant: 'destructive' });
      expect(result).toContain('bg-destructive');
    });

    it('returns correct variant classes for outline variant', () => {
      const result = buttonVariants({ variant: 'outline' });
      expect(result).toContain('border');
    });

    it('returns correct size classes for default size', () => {
      const result = buttonVariants({ size: 'default' });
      expect(result).toContain('h-10');
    });

    it('returns correct size classes for sm size', () => {
      const result = buttonVariants({ size: 'sm' });
      expect(result).toContain('h-9');
    });

    it('returns correct size classes for lg size', () => {
      const result = buttonVariants({ size: 'lg' });
      expect(result).toContain('h-11');
    });

    it('returns correct size classes for icon size', () => {
      const result = buttonVariants({ size: 'icon' });
      expect(result).toContain('h-10');
      expect(result).toContain('w-10');
    });
  });

  describe('toggleVariants', () => {
    it('returns default toggle classes', () => {
      const result = toggleVariants();
      expect(result).toContain('inline-flex');
    });

    it('returns outline variant', () => {
      const result = toggleVariants({ variant: 'outline' });
      expect(result).toContain('border');
    });
  });

  describe('badgeVariants', () => {
    it('returns default badge classes', () => {
      const result = badgeVariants();
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
    });

    it('returns success variant', () => {
      const result = badgeVariants({ variant: 'success' });
      expect(result).toContain('bg-green-600');
    });

    it('returns destructive variant', () => {
      const result = badgeVariants({ variant: 'destructive' });
      expect(result).toContain('bg-destructive');
    });
  });

  describe('labelVariants', () => {
    it('returns default label classes', () => {
      const result = labelVariants();
      expect(result).toContain('text-sm');
      expect(result).toContain('font-medium');
    });
  });
});
