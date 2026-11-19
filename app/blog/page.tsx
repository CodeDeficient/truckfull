import type { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { getSupabaseBuild } from '@/lib/supabase/build-client';

export const revalidate = 15_552_000;



export const metadata: Metadata = {
  title: 'TruckFull Blog — Food Truck Guides, Menus & Local Eats',
  description:
    'Food truck guides, menu deep dives, and local eats across Georgia and South Carolina. Find food trucks near you on TruckFull.',
  alternates: { canonical: 'https://www.truckfull.food/blog' },
  openGraph: {
    title: 'TruckFull Blog — Food Truck Guides, Menus & Local Eats',
    description:
      'Food truck guides, menu deep dives, and local eats across Georgia and South Carolina. Find food trucks near you on TruckFull.',
    url: 'https://www.truckfull.food/blog',
    siteName: 'TruckFull',
    type: 'website',
    images: [{ url: 'https://www.truckfull.food/api/og/default', width: 1200, height: 630, alt: 'TruckFull Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TruckFull Blog — Food Truck Guides, Menus & Local Eats',
    description:
      'Food truck guides, menu deep dives, and local eats across Georgia and South Carolina. Find food trucks near you on TruckFull.',
    images: ['https://www.truckfull.food/api/og/default'],
  },
};

interface BlogPostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

async function getPublishedPosts(): Promise<BlogPostRow[]> {
  const supabase = getSupabaseBuild();
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  return (data as BlogPostRow[] | null) ?? [];
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">TruckFull Blog</h1>
      <p className="text-muted-foreground">
        Food truck guides, menu deep dives, and local eats across Georgia and South Carolina.
      </p>

      {posts.length === 0 && (
        <p className="text-muted-foreground">
          Posts coming soon. Check back for guides to food trucks in Augusta GA and nearby cities.
        </p>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.slug} className="border-b border-border pb-6">
            <Link
              href={`/blog/${post.slug}`}
              className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
            >
              {post.title}
            </Link>
            {post.excerpt && (
              <p className="mt-2 text-muted-foreground line-clamp-2">{post.excerpt}</p>
            )}
            {post.published_at && (
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(post.published_at)}</p>
            )}
          </article>
        ))}
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
      >
        &larr; Back to Home
      </Link>
    </div>
  );
}
