import { redirect } from 'next/navigation';

/**
 * Settings route shim that redirects to the main page with settings modal open
 * This maintains backward compatibility with existing /settings links
 */
export default function SettingsPage() {
  // Redirect to the main page with openSettings query parameter
  redirect('/?openSettings=1');
}
