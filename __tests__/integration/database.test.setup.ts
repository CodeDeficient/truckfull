import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Test database setup and teardown utilities
 */
export class DatabaseTestSetup {
  private static supabase = getSupabaseAdmin();

  /**
   * Clean up test data by deleting records created during tests
   */
  static async cleanupTestData() {
    try {
      // Delete related records first (due to foreign key constraints)
      await this.supabase.from('reviews').delete().ilike('user_id', 'test-user-%');
      await this.supabase.from('user_favorites').delete().ilike('user_id', 'test-user-%');
      await this.supabase.from('orders').delete().ilike('user_id', 'test-user-%');

      // Then delete food trucks created for tests
      await this.supabase.from('food_trucks').delete().ilike('name', 'Test Truck %');

      // Clean up test user profiles
      await this.supabase.from('profiles').delete().ilike('id', 'test-user-%');
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  /**
   * Generate a unique ID for test data
   */
  static generateTestId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a test user profile
   */
  static async createTestUser(userId?: string) {
    const id = userId || this.generateTestId('user');
    const { data, error } = await this.supabase
      .from('profiles')
      .insert([
        {
          id,
          email: `test-${Date.now()}@example.com`,
          full_name: `Test User ${Date.now()}`,
          role: 'customer',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a test food truck
   */
  static async createTestFoodTruck(userId?: string) {
    const ownerId = userId || this.generateTestId('user');
    const { data, error } = await this.supabase
      .from('food_trucks')
      .insert([
        {
          name: `Test Truck ${Date.now()}`,
          description: 'A test food truck for integration testing',
          cuisine_type: ['test'],
          current_location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749], // San Francisco coordinates
          },
          contact_info: {
            phone: '+1-555-555-5555',
            email: `test-${Date.now()}@example.com`,
          },
          operating_hours: {
            Monday: { open: '10:00', close: '20:00' },
            Tuesday: { open: '10:00', close: '20:00' },
          },
          menu_items: [],
          social_media: {},
          owner_id: ownerId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test food truck: ${error.message}`);
    }

    return data;
  }
}
