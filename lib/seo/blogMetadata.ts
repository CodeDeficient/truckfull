/**
 * Pure metadata builder for blog post pages.
 * Extracted from app/blog/[slug]/page.tsx for testability.
 */
import type { Metadata } from 'next';

// eslint-disable-next-line sonarjs/slow-regex
const UPDATED_YEAR_SUFFIX = /\s*\(Updated\s+\d{4}\)/gi;
// eslint-disable-next-line sonarjs/slow-regex
const YEAR_SUFFIX = /\s*\(\d{4}\)/g;

export interface BlogPostMetadata {
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  author: string;
  published_at: string | null;
  updated_at: string | null;
  meta_description: string | null;
  og_image: string | null;
}

function normalizeWhitespace(value: string): string {
  return value.split(' ').filter(Boolean).join(' ').trim();
}

function removeParentheticalDate(value: string): string {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  let output = value;
  // Strip parens containing a month name (with or without year), e.g. "(May 2026)"
  for (const month of monthNames) {
    const marker = ` (${month} `;
    const start = output.indexOf(marker);
    if (start === -1) continue;
    const end = output.indexOf(')', start);
    if (end !== -1) {
      output = output.slice(0, start) + output.slice(end + 1);
    }
  }
  // Strip parens containing only a year, e.g. "(2026)" or "(Updated 2026)"
  output = output.replaceAll(UPDATED_YEAR_SUFFIX, '');
  output = output.replaceAll(YEAR_SUFFIX, '');
  return normalizeWhitespace(output);
}

function removeUnsupportedBestClaims(value: string): string {
  const unsupportedClaimWords = new Set(['best', 'top', 'top-rated', 'rating', 'ratings', 'ranked', 'ranking', 'rankings']);
  return normalizeWhitespace(
    value
      .replaceAll('top-rated', '')
      .replaceAll('Top-rated', '')
      .split(' ')
      .filter((word) => !unsupportedClaimWords.has(word.toLowerCase().replaceAll('.', '').replaceAll(',', '')))
      .join(' '),
  );
}

function normalizeStateComma(value: string): string {
  return value.replaceAll(', GA', ' GA').replaceAll(', SC', ' SC');
}

export function getBlogSeoTitle(title: string): string {
  const withoutDate = normalizeStateComma(removeParentheticalDate(title));
  const numberedBestPrefix = '10 Best Food Trucks in ';
  if (withoutDate.startsWith(numberedBestPrefix)) {
    return `Food Trucks in ${withoutDate.slice(numberedBestPrefix.length)}`;
  }

  if (withoutDate.startsWith('Best ') && withoutDate.endsWith(' Food Trucks CSRA')) {
    const cuisine = withoutDate.slice('Best '.length, -' Food Trucks CSRA'.length);
    return `${cuisine} Food Trucks in CSRA`;
  }

  return removeUnsupportedBestClaims(withoutDate);
}

function getBlogSeoDescription(post: BlogPostMetadata): string {
  const source = post.meta_description ?? post.excerpt ?? post.body.slice(0, 160);
  return normalizeStateComma(removeUnsupportedBestClaims(source.replaceAll('Discover', 'Find').replaceAll('discover', 'find'))).slice(0, 165);
}

export function buildBlogMetadata(post: BlogPostMetadata): Metadata {
  const title = getBlogSeoTitle(post.title);
  const description = getBlogSeoDescription(post);

  const canonicalUrl = `https://www.truckfull.food/blog/${post.slug}`;

  const openGraph: Metadata['openGraph'] = {
    title,
    description,
    type: 'article',
    publishedTime: post.published_at ?? undefined,
    modifiedTime: post.updated_at ?? undefined,
  };

  const imageUrl = post.og_image ?? 'https://www.truckfull.food/api/og/default';
  openGraph.images = [
    {
      url: imageUrl,
      width: 1200,
      height: 630,
      alt: title,
    },
  ];

  return {
    // NO suffix here — app/blog/layout.tsx template adds "| TruckFull Blog"
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}
