import { describe, it, expect } from '@jest/globals';
import {
  parseBlockquote,
  parseFencedCodeBlock,
  parseHeading,
  parseInlineMarkdown,
  parseMarkdownLinks,
  parseMarkdownList,
  parseMarkdownTable,
} from '@/lib/utils/markdownParser';

describe('parseHeading', () => {
  it('returns h1 for single # prefix', () => {
    expect(parseHeading('# Introduction')).toEqual({ level: 1, text: 'Introduction' });
  });

  it('returns h2 for ## prefix', () => {
    expect(parseHeading('## Section Title')).toEqual({ level: 2, text: 'Section Title' });
  });

  it('returns h3 for ### prefix', () => {
    expect(parseHeading('### Subsection')).toEqual({ level: 3, text: 'Subsection' });
  });

  it('returns h4 for #### prefix', () => {
    expect(parseHeading('#### Details')).toEqual({ level: 4, text: 'Details' });
  });

  it('returns h5 for ##### prefix', () => {
    expect(parseHeading('##### Deep dive')).toEqual({ level: 5, text: 'Deep dive' });
  });

  it('returns h6 for ###### prefix', () => {
    expect(parseHeading('###### Fine print')).toEqual({ level: 6, text: 'Fine print' });
  });

  it('returns null for plain text', () => {
    expect(parseHeading('Just a paragraph')).toBeNull();
  });

  it('returns null for # without space', () => {
    expect(parseHeading('#not-a-heading')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseHeading('')).toBeNull();
  });

  it('returns null for 7+ hashes', () => {
    expect(parseHeading('####### too many')).toBeNull();
  });

  it('trims text content', () => {
    expect(parseHeading('##  Title with extra space  ')).toEqual({
      level: 2,
      text: 'Title with extra space',
    });
  });
});

describe('parseMarkdownLinks', () => {
  it('parses a simple link', () => {
    expect(parseMarkdownLinks('Check out [TruckFull](https://truckfull.food)')).toEqual([
      { type: 'text', content: 'Check out ' },
      { type: 'link', text: 'TruckFull', href: 'https://truckfull.food' },
    ]);
  });

  it('parses link at start of string', () => {
    expect(parseMarkdownLinks('[Home](/) is great')).toEqual([
      { type: 'link', text: 'Home', href: '/' },
      { type: 'text', content: ' is great' },
    ]);
  });

  it('parses link at end of string', () => {
    expect(parseMarkdownLinks('Visit [TruckFull](https://truckfull.food)')).toEqual([
      { type: 'text', content: 'Visit ' },
      { type: 'link', text: 'TruckFull', href: 'https://truckfull.food' },
    ]);
  });

  it('parses multiple links', () => {
    expect(parseMarkdownLinks('[A](/a) and [B](/b)')).toEqual([
      { type: 'link', text: 'A', href: '/a' },
      { type: 'text', content: ' and ' },
      { type: 'link', text: 'B', href: '/b' },
    ]);
  });

  it('handles escaped brackets in link text', () => {
    expect(parseMarkdownLinks('[link \\[with\\] brackets](/url)')).toEqual([
      { type: 'link', text: 'link [with] brackets', href: '/url' },
    ]);
  });

  it('handles nested brackets by matching the correct closing bracket', () => {
    expect(parseMarkdownLinks('[link [text]](/url)')).toEqual([
      { type: 'link', text: 'link [text]', href: '/url' },
    ]);
  });

  it('returns plain text when no brackets', () => {
    expect(parseMarkdownLinks('No links here')).toEqual([
      { type: 'text', content: 'No links here' },
    ]);
  });

  it('handles lone open bracket gracefully', () => {
    expect(parseMarkdownLinks('Some [text here')).toEqual([
      { type: 'text', content: 'Some [text here' },
    ]);
  });

  it('handles bracket pair without parens', () => {
    expect(parseMarkdownLinks('[text] but no link')).toEqual([
      { type: 'text', content: '[text] but no link' },
    ]);
  });

  it('handles empty string', () => {
    expect(parseMarkdownLinks('')).toEqual([]);
  });

  it('handles URL with parentheses', () => {
    expect(
      parseMarkdownLinks('[Wiki](https://en.wikipedia.org/wiki/Food_(disambiguation))'),
    ).toEqual([
      { type: 'link', text: 'Wiki', href: 'https://en.wikipedia.org/wiki/Food_(disambiguation)' },
    ]);
  });
});

describe('parseMarkdownTable', () => {
  it('parses a simple table into header and body rows', () => {
    const input = '| Name | Price |\n| --- | --- |\n| Taco | $5 |\n| Burger | $8 |';
    const result = parseMarkdownTable(input);
    expect(result).toEqual({
      headers: ['Name', 'Price'],
      rows: [
        ['Taco', '$5'],
        ['Burger', '$8'],
      ],
    });
  });

  it('returns null for non-table text', () => {
    expect(parseMarkdownTable('Just some text')).toBeNull();
  });

  it('returns null for single-row table', () => {
    expect(parseMarkdownTable('| Name | Price |')).toBeNull();
  });

  it('handles table without separator row', () => {
    const input = '| Name | Price |\n| Taco | $5 |';
    const result = parseMarkdownTable(input);
    expect(result).toEqual({
      headers: ['Name', 'Price'],
      rows: [['Taco', '$5']],
    });
  });

  it('trims cell content', () => {
    const input = '|  Name  |  Price  |\n|  Taco  |  $5  |';
    const result = parseMarkdownTable(input);
    expect(result?.headers).toEqual(['Name', 'Price']);
    expect(result?.rows[0]).toEqual(['Taco', '$5']);
  });
});

describe('parseInlineMarkdown', () => {
  it('parses bold, emphasis, inline code, and links together', () => {
    expect(parseInlineMarkdown('Try **bold**, *emphasis*, `code`, and [link](/food).')).toEqual([
      { type: 'text', content: 'Try ' },
      { type: 'strong', content: 'bold' },
      { type: 'text', content: ', ' },
      { type: 'emphasis', content: 'emphasis' },
      { type: 'text', content: ', ' },
      { type: 'code', content: 'code' },
      { type: 'text', content: ', and ' },
      { type: 'link', text: 'link', href: '/food' },
      { type: 'text', content: '.' },
    ]);
  });

  it('keeps unmatched delimiters as text', () => {
    expect(parseInlineMarkdown('Keep **literal and `literal')).toEqual([
      { type: 'text', content: 'Keep **literal and `literal' },
    ]);
  });
});

describe('parseMarkdownList', () => {
  it('parses unordered list blocks', () => {
    expect(parseMarkdownList('- Tacos\n- BBQ')).toEqual({
      ordered: false,
      items: ['Tacos', 'BBQ'],
    });
  });

  it('parses ordered list blocks', () => {
    expect(parseMarkdownList('1. First\n2. Second')).toEqual({
      ordered: true,
      items: ['First', 'Second'],
    });
  });

  it('returns null for mixed prose and list text', () => {
    expect(parseMarkdownList('Intro\n- Item')).toBeNull();
  });
});

describe('parseBlockquote', () => {
  it('parses blockquote lines', () => {
    expect(parseBlockquote('> First line\n> Second line')).toEqual(['First line', 'Second line']);
  });

  it('returns null for non-blockquote text', () => {
    expect(parseBlockquote('Plain text')).toBeNull();
  });
});

describe('parseFencedCodeBlock', () => {
  it('parses fenced code blocks with an optional language', () => {
    expect(parseFencedCodeBlock('```ts\nconst truck = true;\n```')).toEqual({
      language: 'ts',
      code: 'const truck = true;',
    });
  });

  it('returns null for inline code', () => {
    expect(parseFencedCodeBlock('`const truck = true;`')).toBeNull();
  });
});
