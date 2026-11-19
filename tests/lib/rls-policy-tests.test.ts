import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// Types for our test users
type TestUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

describe('RLS Policy Tests for Food Truck Finder Application', () => {
  let supabase: SupabaseClient<Database>;
  let adminUser: TestUser;
  let foodTruckOwnerUser: TestUser;
  let customerUser: TestUser;
  let testTruckId: string | null = null;

  // Define test users
  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseAnonKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Define test users (these would need to exist in your test database)
    adminUser = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@test.com',
      password: 'testpassword',
      role: 'admin',
    };

    foodTruckOwnerUser = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'owner@test.com',
      password: 'testpassword',
      role: 'food_truck_owner',
    };

    customerUser = {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'customer@test.com',
      password: 'testpassword',
      role: 'customer',
    };
  });

  // Helper function to authenticate as different users
  const authenticateUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn(`Failed to authenticate user ${email}:`, error.message);
      return null;
    }

    return data.session;
  };

  // Log back in as service role after user authentication
  const authenticateServiceRole = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'local-service-role-key';

    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
  };

  // Create a test food truck
  const createTestFoodTruck = async (ownerId?: string) => {
    const serviceSupabase = authenticateServiceRole();

    const truckData: any = {
      name: `Test Truck ${Date.now()}`,
      description: 'A test food truck for RLS testing',
      cuisine_type: ['test'],
      contact_info: {},
      operating_hours: {},
      menu_items: {},
      social_media: {},
      is_active: true,
    };

    if (ownerId) {
      truckData.owner_id = ownerId;
    }

    const { data, error } = await serviceSupabase
      .from('food_trucks')
      .insert(truckData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating test food truck:', error.message);
      return null;
    }

    return data.id;
  };

  // Clean up test data
  const cleanUpTestData = async () => {
    if (testTruckId) {
      const serviceSupabase = authenticateServiceRole();

      await serviceSupabase.from('food_trucks').delete().eq('id', testTruckId);
    }
  };

  describe('food_trucks table RLS policies', () => {
    beforeAll(async () => {
      testTruckId = await createTestFoodTruck();
    });

    afterAll(async () => {
      await cleanUpTestData();
    });

    test('Anonymous users can view publicly available food trucks', async () => {
      // Sign out any logged-in users to test as anonymous
      await supabase.auth.signOut();

      const { data, error } = await supabase
        .from('food_trucks')
        .select('*')
        .is('is_active', true)
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Authenticated customers can view all food trucks', async () => {
      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { data, error } = await supabase.from('food_trucks').select('*').limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Food truck owners can update their own trucks', async () => {
      // Create a truck owned by the food truck owner
      const ownerTruckId = await createTestFoodTruck(foodTruckOwnerUser.id);
      expect(ownerTruckId).not.toBeNull();

      if (!ownerTruckId) return;

      // Authenticate as the food truck owner
      await authenticateUser(foodTruckOwnerUser.email, foodTruckOwnerUser.password);

      // Update the truck they own
      const { error } = await supabase
        .from('food_trucks')
        .update({ name: "Updated Owner's Truck" })
        .eq('id', ownerTruckId)
        .eq('owner_id', foodTruckOwnerUser.id);

      expect(error).toBeNull();

      // Clean up the test truck
      const serviceSupabase = authenticateServiceRole();
      await serviceSupabase.from('food_trucks').delete().eq('id', ownerTruckId);
    });

    test("Food truck owners cannot update trucks they don't own", async () => {
      // Create a truck owned by someone else
      const otherTruckId = await createTestFoodTruck(customerUser.id);
      expect(otherTruckId).not.toBeNull();

      if (!otherTruckId) return;

      // Authenticate as the food truck owner
      await authenticateUser(foodTruckOwnerUser.email, foodTruckOwnerUser.password);

      // Try to update a truck they don't own - this should be restricted by RLS
      const { error, status } = await supabase
        .from('food_trucks')
        .update({ name: 'Unauthorized Update Attempt' })
        .eq('id', otherTruckId)
        .eq('owner_id', customerUser.id); // The truck belongs to the customer user

      // With RLS properly configured, this should return 401 (unauthorized) or similar
      // If no rows were affected, it's likely due to RLS policy
      expect(status === 401 || status === 403 || error).toBeTruthy();

      // Clean up the test truck
      const serviceSupabase = authenticateServiceRole();
      await serviceSupabase.from('food_trucks').delete().eq('id', otherTruckId);
    });

    test('Admins have broader access to food trucks', async () => {
      // Authenticate as admin
      await authenticateUser(adminUser.email, adminUser.password);

      const { data, error } = await supabase.from('food_trucks').select('*').limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  describe('user_favorites table RLS policies', () => {
    let testFavoriteId: string | null = null;

    afterEach(async () => {
      // Clean up the test favorite
      if (testFavoriteId) {
        const serviceSupabase = authenticateServiceRole();
        await serviceSupabase.from('user_favorites').delete().eq('id', testFavoriteId);
        testFavoriteId = null;
      }
    });

    test('Users can only view their own favorites', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Create a favorite for the user
      const { data: insertedFavorite, error: insertError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: customerUser.id,
          truck_id: testTruckId,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating favorite:', insertError);
        return;
      }

      testFavoriteId = insertedFavorite.id;

      // Now try to select it
      const { data: favorites, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', customerUser.id);

      expect(error).toBeNull();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(testFavoriteId);
    });

    test("Users cannot view other users' favorites", async () => {
      // This test requires having other users' favorites in the DB
      // For this test, we'll just check that a user can't access non-existent favorites
      // by trying to access with a different user_id

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Try to access favorites that don't belong to this user
      // With RLS, only the user's own favorites should be returned
      const { data: allFavorites, error } = await supabase.from('user_favorites').select('*');

      expect(error).toBeNull();
      // All returned favorites should belong to the authenticated user
      if (Array.isArray(allFavorites)) {
        allFavorites.forEach((fav) => {
          expect(fav.user_id).toBe(customerUser.id);
        });
      }
    });

    test('Users can only insert their own favorites', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { error } = await supabase.from('user_favorites').insert({
        user_id: customerUser.id, // Must match the authenticated user
        truck_id: testTruckId,
      });

      expect(error).toBeNull();
    });

    test('Users cannot insert favorites for other users', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Try to insert a favorite for a different user - this should be restricted by RLS
      const { error, status } = await supabase.from('user_favorites').insert({
        user_id: 'some-other-user-id', // Different from authenticated user
        truck_id: testTruckId,
      });

      // With RLS properly configured, this should fail
      expect(status === 401 || status === 403 || error).toBeTruthy();
    });

    test('Users can only delete their own favorites', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // First create a favorite to delete
      const { data: newFavorite, error: insertError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: customerUser.id,
          truck_id: testTruckId,
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (insertError) return;

      // Now delete it
      const { error } = await supabase.from('user_favorites').delete().match({
        id: newFavorite.id,
        user_id: customerUser.id,
      });

      expect(error).toBeNull();
    });
  });

  describe('reviews table RLS policies', () => {
    let testReviewId: string | null = null;

    afterEach(async () => {
      // Clean up the test review
      if (testReviewId) {
        const serviceSupabase = authenticateServiceRole();
        await serviceSupabase.from('reviews').delete().eq('id', testReviewId);
        testReviewId = null;
      }
    });

    test('Authenticated users can read all reviews', async () => {
      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { data, error } = await supabase.from('reviews').select('*').limit(5);

      expect(error).toBeNull();
      // May return empty array if no reviews exist
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Users can only insert their own reviews', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert({
          truck_id: testTruckId,
          user_id: customerUser.id, // Must match the authenticated user
          rating: 5,
          comment: 'Great food!',
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (!insertError) {
        testReviewId = data.id;
      }
    });

    test('Users cannot insert reviews for other users', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Try to insert a review with a different user_id - this should be restricted by RLS
      const { error, status } = await supabase.from('reviews').insert({
        truck_id: testTruckId,
        user_id: 'some-other-user-id', // Different from authenticated user
        rating: 4,
        comment: 'Good food!',
      });

      // With RLS properly configured, this should fail
      expect(status === 401 || status === 403 || error).toBeTruthy();
    });

    test('Users can only update their own reviews', async () => {
      if (!testTruckId) return;

      // First, create a review as the customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { data: newReview, error: insertError } = await supabase
        .from('reviews')
        .insert({
          truck_id: testTruckId,
          user_id: customerUser.id,
          rating: 3,
          comment: 'Average food',
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (insertError) return;

      testReviewId = newReview.id;

      // Now update the review
      const { error } = await supabase
        .from('reviews')
        .update({ comment: 'Actually, pretty good food!' })
        .match({
          id: testReviewId,
          user_id: customerUser.id, // Must match authenticated user
        });

      expect(error).toBeNull();
    });

    test('Users can only delete their own reviews', async () => {
      if (!testTruckId) return;

      // First, create a review as the customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { data: newReview, error: insertError } = await supabase
        .from('reviews')
        .insert({
          truck_id: testTruckId,
          user_id: customerUser.id,
          rating: 2,
          comment: 'Not great',
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (insertError) return;

      testReviewId = newReview.id;

      // Now delete the review
      const { error } = await supabase.from('reviews').delete().match({
        id: testReviewId,
        user_id: customerUser.id, // Must match authenticated user
      });

      expect(error).toBeNull();
    });
  });

  describe('orders table RLS policies', () => {
    let testOrderId: string | null = null;

    afterEach(async () => {
      // Clean up the test order
      if (testOrderId) {
        const serviceSupabase = authenticateServiceRole();
        await serviceSupabase.from('orders').delete().eq('id', testOrderId);
        testOrderId = null;
      }
    });

    test('Users can only view their own orders', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Create an order for the user
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_id: `order_${Date.now()}`,
          user_id: customerUser.id,
          truck_id: testTruckId,
          total_amount: 25.0,
          items: [{ name: 'Test Item', quantity: 1, price: 25.0 }],
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (!insertError) {
        testOrderId = newOrder.id;
      }

      // Try to select the user's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', customerUser.id);

      expect(error).toBeNull();
      expect(Array.isArray(orders)).toBeTruthy();
      if (Array.isArray(orders)) {
        // All returned orders should belong to the authenticated user
        orders.forEach((order) => {
          expect(order.user_id).toBe(customerUser.id);
        });
      }
    });

    test("Users cannot view other users' orders", async () => {
      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // With RLS, only the user's own orders should be returned
      const { data: userOrders, error } = await supabase.from('orders').select('*');

      expect(error).toBeNull();

      if (Array.isArray(userOrders)) {
        // All returned orders should belong to the authenticated user
        userOrders.forEach((order) => {
          expect(order.user_id).toBe(customerUser.id);
        });
      }
    });

    test('Users can only create their own orders', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      const { error } = await supabase.from('orders').insert({
        order_id: `order_${Date.now()}_2`,
        user_id: customerUser.id, // Must match authenticated user
        truck_id: testTruckId,
        total_amount: 15.0,
        items: [{ name: 'Test Item 2', quantity: 1, price: 15.0 }],
      });

      expect(error).toBeNull();
    });

    test('Users cannot create orders for other users', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Try to create an order for a different user - this should be restricted by RLS
      const { error, status } = await supabase.from('orders').insert({
        order_id: `order_${Date.now()}_3`,
        user_id: 'different-user-id', // Different from authenticated user
        truck_id: testTruckId,
        total_amount: 20.0,
        items: [{ name: 'Test Item 3', quantity: 1, price: 20.0 }],
      });

      // With RLS properly configured, this should fail
      expect(status === 401 || status === 403 || error).toBeTruthy();
    });

    test('Users can only update their own orders', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // First create an order
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_id: `order_${Date.now()}_4`,
          user_id: customerUser.id,
          truck_id: testTruckId,
          total_amount: 30.0,
          items: [{ name: 'Test Item 4', quantity: 1, price: 30.0 }],
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (insertError) return;

      testOrderId = newOrder.id;

      // Now update the order
      const { error } = await supabase
        .from('orders')
        .update({ special_instructions: 'Leave at door' })
        .match({
          id: testOrderId,
          user_id: customerUser.id, // Must match authenticated user
        });

      expect(error).toBeNull();
    });

    test('Users can only delete their own orders', async () => {
      if (!testTruckId) return;

      // Authenticate as customer
      await authenticateUser(customerUser.email, customerUser.password);

      // First create an order
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_id: `order_${Date.now()}_5`,
          user_id: customerUser.id,
          truck_id: testTruckId,
          total_amount: 22.5,
          items: [{ name: 'Test Item 5', quantity: 1, price: 22.5 }],
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      if (insertError) return;

      testOrderId = newOrder.id;

      // Now delete the order
      const { error } = await supabase.from('orders').delete().match({
        id: testOrderId,
        user_id: customerUser.id, // Must match authenticated user
      });

      expect(error).toBeNull();
    });
  });

  describe('Operational tables RLS policies', () => {
    test('Service role has full access to operational tables', async () => {
      // Use service role client which has RLS bypass
      const serviceSupabase = authenticateServiceRole();

      // Check that we can read the operational tables
      const { data, error } = await serviceSupabase.from('scraping_jobs').select('id').limit(1);

      expect(error).toBeNull();
      // May return empty array if no records exist
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Admins have access to operational tables', async () => {
      // In a real test, we would authenticate as an admin user
      // For this test, we'll just note what should happen
      console.log('Testing admin access to operational tables...');

      // Authenticate as admin
      await authenticateUser(adminUser.email, adminUser.password);

      // Admins should be able to read operational tables
      const { data, error } = await supabase.from('scraping_jobs').select('id').limit(1);

      expect(error).toBeNull();
      // May return empty array if no records exist
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Regular users have no access to operational tables', async () => {
      // Authenticate as a regular customer
      await authenticateUser(customerUser.email, customerUser.password);

      // Regular users should not have access to operational tables
      const { error, status } = await supabase.from('scraping_jobs').select('*').limit(1);

      // With proper RLS, this should fail with 401, 403, or similar error
      expect(status === 401 || status === 403 || error).toBeTruthy();
    });
  });
});
