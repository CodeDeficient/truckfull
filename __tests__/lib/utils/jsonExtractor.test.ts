import { describe, it, expect } from '@jest/globals';
import {
  extractJsonSafely,
  stripMarkdownBlocks,
} from '@/lib/utils/jsonExtractor';

describe('jsonExtractor', () => {
  describe('extractJsonSafely', () => {
    it('returns null for null input', () => {
      expect(extractJsonSafely(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(extractJsonSafely(undefined as unknown as string)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractJsonSafely('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(extractJsonSafely('   ')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(extractJsonSafely(123 as unknown as string)).toBeNull();
    });

    it('parses valid JSON directly', () => {
      const json = '{"key": "value"}';
      expect(extractJsonSafely(json)).toBe(json);
    });

    it('parses JSON with surrounding whitespace', () => {
      const json = '   {"key": "value"}   ';
      expect(extractJsonSafely(json)).toBe('{"key": "value"}');
    });

    it('extracts JSON from markdown code block', () => {
      const text = '```json\n{"key": "value"}\n```';
      expect(extractJsonSafely(text)).toBe('{"key": "value"}');
    });

    it('extracts JSON from text with surrounding content', () => {
      const text = 'Some text before {"key": "value"} some text after';
      expect(extractJsonSafely(text)).toBe('{"key": "value"}');
    });

    it('extracts nested JSON', () => {
      const text = 'Text before {"outer": {"inner": "value"}} text after';
      expect(extractJsonSafely(text)).toBe('{"outer": {"inner": "value"}}');
    });

    it('returns null for invalid JSON', () => {
      expect(extractJsonSafely('{invalid}')).toBeNull();
    });

    it('returns null when no braces found', () => {
      expect(extractJsonSafely('no braces here')).toBeNull();
    });

    it('handles array JSON', () => {
      const json = '[1, 2, 3]';
      expect(extractJsonSafely(json)).toBe(json);
    });

    it('returns null for text without braces', () => {
      expect(extractJsonSafely('Result: [1, 2, 3] end')).toBeNull();
    });
  });

  describe('stripMarkdownBlocks', () => {
    it('removes json code blocks', () => {
      const text = '```json\n{"key": "value"}\n```';
      expect(stripMarkdownBlocks(text)).toBe('{"key": "value"}');
    });

    it('removes javascript code blocks', () => {
      const text = '```javascript\nvar x = 1;\n```';
      expect(stripMarkdownBlocks(text)).toBe('var x = 1;');
    });

    it('removes plain code blocks', () => {
      const text = '```\ncode here\n```';
      expect(stripMarkdownBlocks(text)).toBe('code here');
    });

    it('handles code blocks without language', () => {
      const text = '```\n{"key": "value"}\n```';
      expect(stripMarkdownBlocks(text)).toBe('{"key": "value"}');
    });

    it('removes multiple code blocks', () => {
      const text = '```json\n{}\n``` some text ```js\ncode\n```';
      const result = stripMarkdownBlocks(text);
      expect(result).toContain('{}');
      expect(result).toContain('some text');
      expect(result).toContain('code');
    });

    it('trims result', () => {
      const text = '   ```json\n{}\n```   ';
      expect(stripMarkdownBlocks(text)).toBe('{}');
    });

    it('handles code blocks with extra newlines', () => {
      const text = '```json\n\n{"key": "value"}\n\n```';
      expect(stripMarkdownBlocks(text)).toBe('{"key": "value"}');
    });

    it('handles text without code blocks', () => {
      const text = 'Plain text without code blocks';
      expect(stripMarkdownBlocks(text)).toBe('Plain text without code blocks');
    });
  });
});