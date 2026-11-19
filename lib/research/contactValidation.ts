const NON_DIGITS = /\D/g;
const WHITESPACE_RUNS = /\s+/g;
const HTTP_PROTOCOL = /^https?:\/\//;
const WWW_PREFIX = /^www\./;
const TRAILING_SLASH = /\/$/;
const REDACTED_MARKER = /\[redacted\]/i;

export interface ContactMismatch {
  type: 'email' | 'phone' | 'address' | 'website';
  posterValue: string;
  sourceValue: string;
}

export interface ContactFields {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replaceAll(NON_DIGITS, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits;
}

const ADDRESS_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bhighway\b/gi, 'hwy'],
  [/\bstreet\b/gi, 'st'],
  [/\bavenue\b/gi, 'ave'],
  [/\bboulevard\b/gi, 'blvd'],
  [/\broad\b/gi, 'rd'],
  [/\bdrive\b/gi, 'dr'],
  [/\blane\b/gi, 'ln'],
  [/\bsuite\b/gi, 'ste'],
  [/\bcircle\b/gi, 'cir'],
  [/\bcourt\b/gi, 'ct'],
  [/\bparkway\b/gi, 'pkwy'],
  [/\bplace\b/gi, 'pl'],
  [/\btrace\b/gi, 'trce'],
  [/\bnorth\b/gi, 'n'],
  [/\bsouth\b/gi, 's'],
  [/\beast\b/gi, 'e'],
  [/\bwest\b/gi, 'w'],
  [/\bnortheast\b/gi, 'ne'],
  [/\bnorthwest\b/gi, 'nw'],
  [/\bsoutheast\b/gi, 'se'],
  [/\bsouthwest\b/gi, 'sw'],
];

export function normalizeAddress(address: string): string {
  let normalized = address.trim().toLowerCase();
  normalized = normalized.replaceAll('.', '');
  normalized = normalized.replaceAll(WHITESPACE_RUNS, ' ');

  for (const [pattern, replacement] of ADDRESS_NORMALIZATIONS) {
    normalized = normalized.replaceAll(pattern, replacement);
  }

  return normalized;
}

export function normalizeWebsite(url: string): string {
  let normalized = url.trim().toLowerCase();
  normalized = normalized.replace(HTTP_PROTOCOL, '');
  normalized = normalized.replace(WWW_PREFIX, '');
  normalized = normalized.replace(TRAILING_SLASH, '');
  return normalized;
}

export function isMaskedContact(value: string): boolean {
  if (!value || !value.trim()) return false;
  if (value.includes('***')) return true;
  if (value.includes('...')) return true;
  if (REDACTED_MARKER.test(value)) return true;
  const atIndex = value.indexOf('@');
  if (atIndex > 0) {
    const localPart = value.slice(0, atIndex);
    if (localPart.length > 1) {
      const starCount = [...localPart].filter((c) => c === '*').length;
      if (starCount >= 2) return true;
    }
  }
  if (value.includes('***-***') || value.includes('-***-')) return true;
  return false;
}

export function detectContactMismatches(
  poster: ContactFields,
  source: ContactFields,
): ContactMismatch[] {
  const mismatches: ContactMismatch[] = [];

  if (poster.email?.trim() && source.email?.trim()) {
    const posterNormalized = normalizeEmail(poster.email);
    const sourceNormalized = normalizeEmail(source.email);
    if (posterNormalized !== sourceNormalized) {
      mismatches.push({
        type: 'email',
        posterValue: poster.email,
        sourceValue: source.email,
      });
    }
  }

  if (poster.phone?.trim() && source.phone?.trim()) {
    const posterDigits = normalizePhoneDigits(poster.phone);
    const sourceDigits = normalizePhoneDigits(source.phone);
    if (posterDigits !== sourceDigits) {
      mismatches.push({
        type: 'phone',
        posterValue: poster.phone,
        sourceValue: source.phone,
      });
    }
  }

  if (poster.address?.trim() && source.address?.trim()) {
    const posterNormalized = normalizeAddress(poster.address);
    const sourceNormalized = normalizeAddress(source.address);
    if (posterNormalized !== sourceNormalized) {
      mismatches.push({
        type: 'address',
        posterValue: poster.address,
        sourceValue: source.address,
      });
    }
  }

  if (poster.website?.trim() && source.website?.trim()) {
    const posterNormalized = normalizeWebsite(poster.website);
    const sourceNormalized = normalizeWebsite(source.website);
    if (posterNormalized !== sourceNormalized) {
      mismatches.push({
        type: 'website',
        posterValue: poster.website,
        sourceValue: source.website,
      });
    }
  }

  return mismatches;
}
