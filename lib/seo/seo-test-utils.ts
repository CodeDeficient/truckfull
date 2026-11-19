export const MAX_TITLE_LENGTH = 70;

export function isTitleWithinLimit(title: string): boolean {
  return title.length <= MAX_TITLE_LENGTH;
}
