import { redirect } from 'next/navigation';

/**
 * Profile route shim that redirects to the main page with profile modal open
 * This maintains backward compatibility with existing /profile links
 */
export default function ProfilePage() {
  // Redirect to the main page with openProfile query parameter
  redirect('/?openProfile=1');
}
