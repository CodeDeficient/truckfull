import {
  hasRoleAccess,
  hasAdminDashboardAccess,
  canEditTruck,
  getRoleDisplayName,
  isAdmin,
  ROLE_HIERARCHY,
  type UserRole,
} from '@/lib/auth/roles';

describe('roles', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.admin).toBe(100);
      expect(ROLE_HIERARCHY.food_truck_owner).toBe(50);
      expect(ROLE_HIERARCHY.customer).toBe(10);
    });
  });

  describe('hasRoleAccess', () => {
    it('should return false for undefined role', () => {
      expect(hasRoleAccess(undefined, 'admin')).toBe(false);
    });

    it('should return false for empty string role', () => {
      expect(hasRoleAccess('', 'admin')).toBe(false);
    });

    it('should return true when admin accesses any role', () => {
      expect(hasRoleAccess('admin', 'customer')).toBe(true);
      expect(hasRoleAccess('admin', 'food_truck_owner')).toBe(true);
      expect(hasRoleAccess('admin', 'admin')).toBe(true);
    });

    it('should return true when role matches required role', () => {
      expect(hasRoleAccess('customer', 'customer')).toBe(true);
      expect(hasRoleAccess('food_truck_owner', 'food_truck_owner')).toBe(true);
    });

    it('should return false when role does not match', () => {
      expect(hasRoleAccess('customer', 'admin')).toBe(false);
      expect(hasRoleAccess('customer', 'food_truck_owner')).toBe(false);
    });

    it('should handle array of required roles', () => {
      expect(hasRoleAccess('customer', ['admin', 'customer'])).toBe(true);
      expect(hasRoleAccess('food_truck_owner', ['admin', 'food_truck_owner'])).toBe(true);
      expect(hasRoleAccess('customer', ['admin', 'food_truck_owner'])).toBe(false);
    });
  });

  describe('hasAdminDashboardAccess', () => {
    it('should return false for undefined role', () => {
      expect(hasAdminDashboardAccess(undefined)).toBe(false);
    });

    it('should return false for empty string role', () => {
      expect(hasAdminDashboardAccess('')).toBe(false);
    });

    it('should return true for admin role', () => {
      expect(hasAdminDashboardAccess('admin')).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(hasAdminDashboardAccess('customer')).toBe(false);
      expect(hasAdminDashboardAccess('food_truck_owner')).toBe(false);
    });
  });

  describe('canEditTruck', () => {
    it('should return false for undefined role', () => {
      expect(canEditTruck(undefined, 'user1', 'owner1')).toBe(false);
    });

    it('should return false for empty role', () => {
      expect(canEditTruck('', 'user1', 'owner1')).toBe(false);
    });

    it('should return false for empty userId', () => {
      expect(canEditTruck('admin', '', 'owner1')).toBe(false);
    });

    it('should return true for admin regardless of owner', () => {
      expect(canEditTruck('admin', 'admin1', 'owner1')).toBe(true);
      expect(canEditTruck('admin', 'admin1', 'owner2')).toBe(true);
    });

    it('should return true for truck owner editing own truck', () => {
      expect(canEditTruck('food_truck_owner', 'user1', 'user1')).toBe(true);
    });

    it('should return false for truck owner editing others truck', () => {
      expect(canEditTruck('food_truck_owner', 'user1', 'user2')).toBe(false);
    });

    it('should return false for customer trying to edit', () => {
      expect(canEditTruck('customer', 'user1', 'user1')).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display name for superadmin', () => {
      expect(getRoleDisplayName('superadmin')).toBe('Super Admin');
    });

    it('should return correct display name for admin', () => {
      expect(getRoleDisplayName('admin')).toBe('Admin');
    });

    it('should return correct display name for food_truck_owner', () => {
      expect(getRoleDisplayName('food_truck_owner')).toBe('Truck Owner');
    });

    it('should return correct display name for customer', () => {
      expect(getRoleDisplayName('customer')).toBe('User');
    });

    it('should return Unknown for unknown role', () => {
      expect(getRoleDisplayName('unknown')).toBe('Unknown');
      expect(getRoleDisplayName('random')).toBe('Unknown');
    });
  });

  describe('isAdmin', () => {
    it('should return true when role is admin', () => {
      expect(isAdmin('test@example.com', 'admin')).toBe(true);
    });

    it('should return false when role is not admin', () => {
      expect(isAdmin('test@example.com', 'customer')).toBe(false);
      expect(isAdmin('test@example.com', 'food_truck_owner')).toBe(false);
    });

    it('should return false when role is undefined', () => {
      expect(isAdmin('test@example.com', undefined)).toBe(false);
    });

    it('should return false when role is empty string', () => {
      expect(isAdmin('test@example.com', '')).toBe(false);
    });
  });
});
