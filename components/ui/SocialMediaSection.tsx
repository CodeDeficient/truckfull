import { Instagram, Facebook, Twitter } from 'lucide-react';

interface SocialMediaSectionProps {
  readonly socialMedia?: { instagram?: string; facebook?: string; twitter?: string };
  readonly showFallback?: boolean;
}

// Default props to ensure consistent behavior
const defaultProps = {
  socialMedia: undefined,
  showFallback: true,
};

/**
 * Normalizes a social media handle or URL to a full URL
 * @param value - Username, handle, or full URL
 * @param platform - Social media platform (instagram, facebook, twitter)
 * @returns Full URL to the social media profile
 */
function normalizeSocialMediaUrl(
  value: string,
  platform: 'instagram' | 'facebook' | 'twitter',
): string {
  const trimmed = value.trim();

  // If it's already a full URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Remove @ prefix if present
  const cleaned = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // Build the full URL based on platform
  const platformUrls = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    twitter: 'https://twitter.com/',
  };

  return `${platformUrls[platform]}${cleaned}`;
}

/**
 * Renders a section with links to social media profiles if provided.
 * @example
 * SocialMediaSection({ socialMedia: { instagram: 'username', facebook: 'user', twitter: 'user' } })
 * Returns JSX elements with social media links.
 * @param {Readonly<SocialMediaSectionProps>} props - Object containing social media usernames/URLs and options.
 * @returns {JSX.Element | undefined} JSX elements representing social media links if available.
 * @description
 *   - Only renders if at least one social media username is provided.
 *   - Supports Instagram, Facebook, and Twitter links.
 *   - Handles both full URLs and usernames/handles.
 *   - Styles links with appropriate colors based on social media platform.
 *   - Shows fallback message when no social media is available (if showFallback is true).
 */
export function SocialMediaSection(props: Readonly<SocialMediaSectionProps>) {
  const { socialMedia, showFallback } = { ...defaultProps, ...props };

  // Validate and normalize social media handles/URLs - check for undefined, null, empty string, and whitespace-only strings
  const validSocialMedia = {
    instagram:
      typeof socialMedia?.instagram === 'string' && socialMedia.instagram.trim().length > 0
        ? normalizeSocialMediaUrl(socialMedia.instagram, 'instagram')
        : undefined,
    facebook:
      typeof socialMedia?.facebook === 'string' && socialMedia.facebook.trim().length > 0
        ? normalizeSocialMediaUrl(socialMedia.facebook, 'facebook')
        : undefined,
    twitter:
      typeof socialMedia?.twitter === 'string' && socialMedia.twitter.trim().length > 0
        ? normalizeSocialMediaUrl(socialMedia.twitter, 'twitter')
        : undefined,
  };

  // Check if any valid social media handles exist
  const hasValidSocialMedia = Boolean(
    validSocialMedia.instagram ?? validSocialMedia.facebook ?? validSocialMedia.twitter,
  );

  // If no valid social media and fallback is disabled, don't render anything
  if (!hasValidSocialMedia && !showFallback) {
    return;
  }

  return (
    <div>
      <h4 className="font-medium mb-2 text-sm dark:text-gray-100">Social Media</h4>
      {hasValidSocialMedia ? (
        <div className="flex flex-wrap gap-2">
          {typeof validSocialMedia.instagram === 'string' && (
            <a
              href={validSocialMedia.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded-md text-xs hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-200"
            >
              <Instagram className="size-3" />
              Instagram
            </a>
          )}
          {typeof validSocialMedia.facebook === 'string' && (
            <a
              href={validSocialMedia.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
            >
              <Facebook className="size-3" />
              Facebook
            </a>
          )}
          {typeof validSocialMedia.twitter === 'string' && (
            <a
              href={validSocialMedia.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-800 rounded-md text-xs hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-200"
            >
              <Twitter className="size-3" />
              Twitter
            </a>
          )}
        </div>
      ) : (
        showFallback && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No social media profiles available
          </p>
        )
      )}
    </div>
  );
}
