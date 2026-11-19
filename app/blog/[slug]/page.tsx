import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from '@/components/navigation/IntentLink';
import sanitizeHtml from 'sanitize-html';
import { getSupabaseBuild } from '@/lib/supabase/build-client';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import { getExploreLinks } from '@/lib/services/truckAggregation';
import {
  parseBlockquote,
  parseFencedCodeBlock,
  parseHeading,
  parseInlineMarkdown,
  parseMarkdownList,
  parseMarkdownTable,
} from '@/lib/utils/markdownParser';
import { buildBlogMetadata, getBlogSeoTitle } from '@/lib/seo/blogMetadata';

export const revalidate = 15_552_000;

interface BlogPost {
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

async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabaseBuild();
  const { data } = await supabase
    .from('blog_posts')
    .select(
      'slug, title, body, excerpt, author, published_at, updated_at, meta_description, og_image',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data;
}

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return buildBlogMetadata({
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    author: post.author,
    published_at: post.published_at,
    updated_at: post.updated_at,
    meta_description: post.meta_description,
    og_image: post.og_image,
  });
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return parseInlineMarkdown(text).map((segment, index) => {
    switch (segment.type) {
      case 'link': {
        return (
          <Link key={index} href={segment.href} className="text-primary hover:underline">
            {segment.text}
          </Link>
        );
      }
      case 'strong': {
        return <strong key={index}>{segment.content}</strong>;
      }
      case 'emphasis': {
        return <em key={index}>{segment.content}</em>;
      }
      case 'code': {
        return (
          <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
            {segment.content}
          </code>
        );
      }
      case 'text': {
        return <span key={index}>{segment.content}</span>;
      }
      default: {
        return null;
      }
    }
  });
}

function renderHeading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string, key: number): ReactNode {
  const sizes: Record<number, string> = {
    1: 'text-3xl font-bold mt-10 mb-5',
    2: 'text-2xl font-bold mt-8 mb-4',
    3: 'text-xl font-semibold mt-6 mb-3',
    4: 'text-lg font-semibold mt-5 mb-2',
    5: 'text-base font-semibold mt-4 mb-2',
    6: 'text-sm font-semibold mt-4 mb-2',
  };
  const content = renderInlineMarkdown(text);

  if (level <= 2)
    return (
      <h2 key={key} className={sizes[level]}>
        {content}
      </h2>
    );
  if (level === 3)
    return (
      <h3 key={key} className={sizes[level]}>
        {content}
      </h3>
    );
  if (level === 4)
    return (
      <h4 key={key} className={sizes[level]}>
        {content}
      </h4>
    );
  if (level === 5)
    return (
      <h5 key={key} className={sizes[level]}>
        {content}
      </h5>
    );
  return (
    <h6 key={key} className={sizes[level]}>
      {content}
    </h6>
  );
}

function sanitizeTrustedBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height'],
      a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const explorePromise = getExploreLinks();
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const explore = await explorePromise;

  const paragraphs = post.body.split('\n\n').filter((p) => p.trim().length > 0);

  const seoTitle = getBlogSeoTitle(post.title);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seoTitle,
    description: post.excerpt ?? post.meta_description ?? '',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: 'TruckFull' },
    publisher: { '@type': 'Organization', name: 'TruckFull' },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(jsonLd),
        }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors mb-6"
      >
        &larr; Back to Blog
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">{seoTitle}</h1>

      <p className="text-sm text-muted-foreground mb-8">
        By {post.author}
        {post.published_at && <> · {formatDate(post.published_at)}</>}
      </p>

      <div className="space-y-4 text-foreground/90">
        {paragraphs.map((paragraph, index) => {
          const trimmed = paragraph.trim();
          const codeBlock = parseFencedCodeBlock(trimmed);
          if (codeBlock) {
            return (
              <pre key={index} className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{codeBlock.code}</code>
              </pre>
            );
          }

          if (trimmed.startsWith('<')) {
            return (
              <div
                key={index}
                dangerouslySetInnerHTML={{ __html: sanitizeTrustedBlogHtml(trimmed) }}
                className="prose prose-sm max-w-none"
              />
            );
          }

          if (paragraph.includes('|') && paragraph.includes('\n|')) {
            const tableData = parseMarkdownTable(paragraph);
            if (tableData) {
              return (
                <div key={index} className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border font-medium">
                        {tableData.headers.map((cell, cIdx) => (
                          <th key={cIdx} className="py-2 px-3 text-left">
                            {renderInlineMarkdown(cell)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-border/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3">
                              {renderInlineMarkdown(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          const listData = parseMarkdownList(paragraph);
          if (listData) {
            const ListTag = listData.ordered ? 'ol' : 'ul';
            return (
              <ListTag key={index} className="ml-6 list-outside space-y-2 marker:text-primary">
                {listData.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={listData.ordered ? 'list-decimal' : 'list-disc'}>
                    {renderInlineMarkdown(item)}
                  </li>
                ))}
              </ListTag>
            );
          }

          const quoteLines = parseBlockquote(paragraph);
          if (quoteLines) {
            return (
              <blockquote
                key={index}
                className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground"
              >
                {quoteLines.map((line, lineIndex) => (
                  <p key={lineIndex}>{renderInlineMarkdown(line)}</p>
                ))}
              </blockquote>
            );
          }

          const heading = parseHeading(trimmed);
          if (heading) return renderHeading(heading.level, heading.text, index);

          return <p key={index}>{renderInlineMarkdown(paragraph)}</p>;
        })}
      </div>

      <div className="mt-12 pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Explore Food Trucks</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            All Food Trucks
          </Link>
          {explore.cities.map((city) => (
            <Link
              key={city.href}
              href={city.href}
              className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {city.label}
            </Link>
          ))}
          {explore.cuisines.map((cuisine) => (
            <Link
              key={cuisine.href}
              href={cuisine.href}
              className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {cuisine.label}
            </Link>
          ))}
        </div>
        <Link href="/blog" className="mt-6 inline-block text-sm text-primary hover:underline">
          &larr; Back to Blog
        </Link>
      </div>
    </article>
  );
}
