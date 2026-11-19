/**
 * Role hierarchy and permission system
 *
 * Roles (must match database CHECK constraint):
 * - admin: Administrative access (full system access)
 * - food_truck_owner: Can edit their own truck information
 * - customer: Regular user/foodie, can favorite trucks and leave reviews
 */

export type UserRole = 'admin' | 'food_truck_owner' | 'customer';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100, // Highest level - complete access
  food_truck_owner: 50, // Truck owner access
  customer: 10, // Basic user access
};

/**
 * Check if a user role has access to a required role level
 * Admin can access everything
 */
export function hasRoleAccess(
  userRole: string | undefined,
  requiredRole: UserRole | UserRole[],
): boolean {
  if (userRole == undefined || userRole === '') return false;

  // Admin has access to everything
  if (userRole === 'admin') return true;

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  // Check if user's role matches any of the required roles
  return requiredRoles.includes(userRole as UserRole);
}

/**
 * Check if a user has admin dashboard access
 * Only admin role can access the admin dashboard
 */
export function hasAdminDashboardAccess(userRole: string | undefined): boolean {
  if (userRole == undefined || userRole === '') return false;
  return userRole === 'admin';
}

/**
 * Check if a user can edit a specific truck
 * Admin can edit any truck
 * Truck owners can edit their own trucks
 */
export function canEditTruck(
  userRole: string | undefined,
  userId: string,
  truckOwnerId: string,
): boolean {
  return (
    userRole != undefined &&
    userRole !== '' &&
    userId !== '' &&
    (userRole === 'admin' || (userRole === 'food_truck_owner' && userId === truckOwnerId))
  );
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    food_truck_owner: 'Truck Owner',
    customer: 'User',
  };

  return displayNames[role] ?? 'Unknown';
}

/**
 * Check if user is an admin
 */
export function isAdmin(email: string | undefined, role: string | undefined): boolean {
  return role === 'admin';
}
