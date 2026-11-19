import { FacebookIntegrationClient } from './FacebookIntegrationClient';

export const dynamic = 'force-dynamic';

 
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function getFacebookStats() {
  try {
    const response = await fetch(`${APP_URL}/api/admin/facebook/stats`);
    if (!response.ok) {
      return {
        totalPosts: 0,
        postsByStatus: {
          pending: 0,
          processed: 0,
          pending_review: 0,
          rejected: 0,
          failed: 0,
        },
        connectedPages: 0,
      };
    }
    return await response.json();
  } catch {
    return {
      totalPosts: 0,
      postsByStatus: {
        pending: 0,
        processed: 0,
        pending_review: 0,
        rejected: 0,
        failed: 0,
      },
      connectedPages: 0,
    };
  }
}

export default async function FacebookIntegrationPage() {
  const stats = await getFacebookStats();

  return <FacebookIntegrationClient initialStats={stats} />;
}
