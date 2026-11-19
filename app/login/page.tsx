import { redirect } from 'next/navigation';

/**
 * Login route shim that redirects to the main page with auth modal open
 * This maintains backward compatibility with existing /login links
 */
export default function LoginPage() {
  // Redirect to the main page with auth parameter
  redirect('/?auth=open');
}
