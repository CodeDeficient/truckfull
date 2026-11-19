/**
 * Represents a user in the system
 */
export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  phone?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}
