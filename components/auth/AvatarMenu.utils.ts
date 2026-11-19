import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Helper function to generate user initials from a Supabase User object.
 * @param user - The Supabase user object.
 * @returns A string containing the user's initials, or '?' if not available.
 */
export const getUserInitials = (user: SupabaseUser | null): string => {
  if (!user) return '?';

  const metadata = user.user_metadata as Record<string, unknown> | null | undefined;
  const { email } = user;

  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name : undefined;
  if (fullName != undefined && fullName.length > 0) {
    const names = fullName.split(' ');
    return names
      .map((name: string) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name : undefined;
  const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name : undefined;
  if (
    firstName != undefined &&
    lastName != undefined &&
    firstName.length > 0 &&
    lastName.length > 0
  ) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  if (typeof email === 'string' && email.length > 0) {
    return email.slice(0, 2).toUpperCase();
  }

  return '?';
};

/**
 * Gets the display name for a user from a Supabase User object.
 * @param user - The Supabase user object.
 * @returns A string representing the user's display name.
 */
export const getUserDisplayName = (user: SupabaseUser | null): string => {
  if (!user) return 'Anonymous';

  const metadata = user.user_metadata as Record<string, unknown> | null | undefined;
  const { email } = user;

  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name : undefined;
  if (fullName != undefined && fullName.length > 0) {
    return fullName;
  }

  const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name : undefined;
  const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name : undefined;
  if (
    firstName != undefined &&
    lastName != undefined &&
    firstName.length > 0 &&
    lastName.length > 0
  ) {
    return `${firstName} ${lastName}`;
  }

  const name = typeof metadata?.name === 'string' ? metadata.name : undefined;
  if (name != undefined && name.length > 0) {
    return name;
  }

  if (typeof email === 'string' && email.length > 0) {
    return email.split('@')[0];
  }

  return 'User';
};
