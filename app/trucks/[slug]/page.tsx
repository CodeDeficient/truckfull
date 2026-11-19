import { redirect } from 'next/navigation';

/**
 * Redirect from old /trucks/[slug] URLs to new clean /[slug] URLs
 * This preserves SEO value by redirecting search engine indexed pages
 * to the new canonical location.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OldTruckPage({ params }: Props) {
  const { slug } = await params;

  // Permanent redirect (301) to new clean URL
  redirect(`/${slug}`);
}

// Also redirect generateMetadata to avoid duplicate content issues
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  return {
    alternates: {
      canonical: `https://www.truckfull.food/${slug}`,
    },
  };
}
