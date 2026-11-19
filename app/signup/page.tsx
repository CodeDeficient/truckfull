import { redirect } from 'next/navigation';

/**
 * Signup route shim that redirects to the main page with auth modal open in signup mode
 * This maintains backward compatibility with existing /signup links
 */
export default function SignupPage() {
  // Redirect to the main page with auth parameter and signup mode
  redirect('/?auth=open&mode=signup');
}
