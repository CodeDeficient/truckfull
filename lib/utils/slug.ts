const NON_SLUG_CHARS = /[^\w -]+/g;
const SEPARATOR_RUNS = /[\s_-]+/g;
const EDGE_DASHES = /(?:^-+)|(?:-+$)/g;

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(NON_SLUG_CHARS, '') // Simplified to prevent ReDoS
    .replaceAll(SEPARATOR_RUNS, '-') // Simplified to prevent ReDoS
    .replaceAll(EDGE_DASHES, ''); // Remove leading/trailing hyphens
}
