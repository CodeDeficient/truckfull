const HEADING_MARKER = /^#{1,6}$/;
const TABLE_PIPES_AND_SPACES = /[\s|]/g;
const DASHES_ONLY = /^-+$/;
const BLOCKQUOTE_MARKER = /^>\s?/;
const CODE_FENCE_OPEN = /^```([\w-]+)?\s*$/;

export interface HeadingNode {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface LinkSegment {
  type: 'link';
  text: string;
  href: string;
}

export interface StrongSegment {
  type: 'strong';
  content: string;
}

export interface EmphasisSegment {
  type: 'emphasis';
  content: string;
}

export interface CodeSegment {
  type: 'code';
  content: string;
}

export type MarkdownSegment =
  | TextSegment
  | LinkSegment
  | StrongSegment
  | EmphasisSegment
  | CodeSegment;

type InlineMarker = '[' | '**' | '*' | '`';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export function parseHeading(line: string): HeadingNode | null {
  const trimmed = line.trimStart();
  const hashEnd = trimmed.indexOf(' ');
  if (hashEnd < 1 || hashEnd > 6) return null;
  const hashes = trimmed.slice(0, hashEnd);
  if (!HEADING_MARKER.test(hashes)) return null;
  return {
    level: hashes.length as HeadingNode['level'],
    text: trimmed.slice(hashEnd + 1).trim(),
  };
}

export function parseMarkdownLinks(text: string): MarkdownSegment[] {
  if (text.length === 0) return [];

  const segments: MarkdownSegment[] = [];
  let pos = 0;

  while (pos < text.length) {
    const openIdx = text.indexOf('[', pos);
    if (openIdx === -1) {
      if (pos < text.length) {
        segments.push({ type: 'text', content: text.slice(pos) });
      }
      break;
    }

    const { closeIdx, linkText } = findMatchingBracket(text, openIdx);
    if (closeIdx === -1) {
      if (pos < text.length) {
        segments.push({ type: 'text', content: text.slice(pos) });
      }
      break;
    }

    if (closeIdx + 1 >= text.length || text[closeIdx + 1] !== '(') {
      const nextSearch = text.indexOf('[', openIdx + 1);
      const end = nextSearch === -1 ? text.length : nextSearch;
      segments.push({ type: 'text', content: text.slice(pos, end) });
      pos = end;
      continue;
    }

    const parenResult = findMatchingParen(text, closeIdx + 1);
    if (parenResult.closeIdx === -1) {
      const nextSearch = text.indexOf('[', openIdx + 1);
      const end = nextSearch === -1 ? text.length : nextSearch;
      segments.push({ type: 'text', content: text.slice(pos, end) });
      pos = end;
      continue;
    }

    if (openIdx > pos) {
      segments.push({ type: 'text', content: text.slice(pos, openIdx) });
    }

    const href = text.slice(closeIdx + 2, parenResult.closeIdx);
    segments.push({ type: 'link', text: linkText, href });
    pos = parenResult.closeIdx + 1;
  }

  return segments;
}

function findMatchingBracket(
  text: string,
  openIdx: number,
): { closeIdx: number; linkText: string } {
  let depth = 0;
  let i = openIdx;
  let linkText = '';

  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      linkText += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '[') {
      if (depth > 0) linkText += ch;
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return { closeIdx: i, linkText };
      }
      linkText += ch;
    } else {
      linkText += ch;
    }
    i++;
  }

  return { closeIdx: -1, linkText: '' };
}

function findMatchingParen(text: string, openParenIdx: number): { closeIdx: number } {
  if (text[openParenIdx] !== '(') return { closeIdx: -1 };

  let depth = 0;
  let i = openParenIdx;

  while (i < text.length) {
    const ch = text[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return { closeIdx: i };
    }
    i++;
  }

  return { closeIdx: -1 };
}

export function parseMarkdownTable(text: string): TableData | null {
  if (!text.includes('|')) return null;

  const lines = text.trim().split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    const stripped = line.replaceAll(TABLE_PIPES_AND_SPACES, '');
    if (stripped.length === 0 || DASHES_ONLY.test(stripped)) continue;

    const cells = line
      .split('|')
      .filter((cell) => cell.trim().length > 0)
      .map((cell) => cell.trim());

    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length < 2) return null;

  const [headers, ...bodyRows] = rows;
  return { headers, rows: bodyRows };
}

export interface MarkdownListData {
  ordered: boolean;
  items: string[];
}

export interface FencedCodeBlock {
  language: string | null;
  code: string;
}

export function parseInlineMarkdown(text: string): MarkdownSegment[] {
  if (text.length === 0) return [];

  const segments: MarkdownSegment[] = [];
  let pos = 0;

  while (pos < text.length) {
    const next = findNextInlineToken(text, pos);
    if (!next) {
      pushTextSegment(segments, text.slice(pos));
      break;
    }

    if (next.index > pos) pushTextSegment(segments, text.slice(pos, next.index));
    pos = appendInlineTokenSegment(segments, text, next.index, next.marker);
  }

  return segments;
}

function findNextInlineToken(
  text: string,
  from: number,
): { index: number; marker: InlineMarker } | null {
  const markers: InlineMarker[] = ['[', '**', '*', '`'];
  const hits = markers
    .map((marker) => ({ marker, index: text.indexOf(marker, from) }))
    .filter((hit) => hit.index >= 0)
    .sort((a, b) => a.index - b.index || b.marker.length - a.marker.length);
  return hits[0] ?? null;
}

function appendInlineTokenSegment(
  segments: MarkdownSegment[],
  text: string,
  index: number,
  marker: InlineMarker,
): number {
  if (marker === '[') return appendLinkSegment(segments, text, index);
  if (marker === '`') return appendDelimitedSegment(segments, text, index, '`', 'code');
  if (marker === '**') return appendDelimitedSegment(segments, text, index, '**', 'strong');
  return appendDelimitedSegment(segments, text, index, '*', 'emphasis');
}

function appendLinkSegment(segments: MarkdownSegment[], text: string, openIdx: number): number {
  const { closeIdx, linkText } = findMatchingBracket(text, openIdx);
  if (closeIdx === -1 || text[closeIdx + 1] !== '(') {
    pushTextSegment(segments, text[openIdx]);
    return openIdx + 1;
  }

  const parenResult = findMatchingParen(text, closeIdx + 1);
  if (parenResult.closeIdx === -1) {
    pushTextSegment(segments, text[openIdx]);
    return openIdx + 1;
  }

  segments.push({
    type: 'link',
    text: linkText,
    href: text.slice(closeIdx + 2, parenResult.closeIdx),
  });
  return parenResult.closeIdx + 1;
}

function appendDelimitedSegment(
  segments: MarkdownSegment[],
  text: string,
  openIdx: number,
  delimiter: '*' | '**' | '`',
  type: 'strong' | 'emphasis' | 'code',
): number {
  const closeIdx = text.indexOf(delimiter, openIdx + delimiter.length);
  if (closeIdx === -1) {
    pushTextSegment(segments, delimiter);
    return openIdx + delimiter.length;
  }

  const content = text.slice(openIdx + delimiter.length, closeIdx);
  if (content.length === 0) {
    pushTextSegment(segments, delimiter + delimiter);
    return closeIdx + delimiter.length;
  }

  segments.push({ type, content });
  return closeIdx + delimiter.length;
}

function pushTextSegment(segments: MarkdownSegment[], content: string): void {
  if (content.length === 0) return;
  const last = segments.at(-1);
  if (last?.type === 'text') {
    last.content += content;
    return;
  }
  segments.push({ type: 'text', content });
}

export function parseMarkdownList(text: string): MarkdownListData | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const unorderedItems = lines.map((line) => parseUnorderedListItem(line));
  if (unorderedItems.every((item) => item !== null)) {
    return { ordered: false, items: unorderedItems.filter((item) => item !== null) };
  }

  const orderedItems = lines.map((line) => parseOrderedListItem(line));
  if (orderedItems.every((item) => item !== null)) {
    return { ordered: true, items: orderedItems.filter((item) => item !== null) };
  }

  return null;
}

function parseUnorderedListItem(line: string): string | null {
  if (!['-', '*', '+'].includes(line[0] ?? '') || line[1] !== ' ') return null;
  return line.slice(2).trim();
}

function parseOrderedListItem(line: string): string | null {
  let index = 0;
  while (index < line.length) {
    const codePoint = line.codePointAt(index);
    if (codePoint === undefined || codePoint < 48 || codePoint > 57) break;
    index++;
  }

  if (index === 0 || !['.', ')'].includes(line[index] ?? '') || line[index + 1] !== ' ') {
    return null;
  }

  return line.slice(index + 2).trim();
}

export function parseBlockquote(text: string): string[] | null {
  const lines = text.split('\n').map((line) => line.trim());
  if (lines.length === 0 || !lines.every((line) => line.startsWith('>'))) return null;
  return lines.map((line) => line.replace(BLOCKQUOTE_MARKER, '')).filter((line) => line.length > 0);
}

export function parseFencedCodeBlock(text: string): FencedCodeBlock | null {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const opening = CODE_FENCE_OPEN.exec(lines[0]);
  if (!opening || lines.at(-1)?.trim() !== '```') return null;

  return {
    language: opening[1] ?? null,
    code: lines.slice(1, -1).join('\n'),
  };
}
