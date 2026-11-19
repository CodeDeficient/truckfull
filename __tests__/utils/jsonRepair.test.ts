import { describe, it, expect } from '@jest/globals';
import { repairJson } from '@/lib/utils/jsonRepair';

describe('repairJson', () => {
  it('returns null for empty or minimal input', () => {
    expect(repairJson('')).toBeNull();
    expect(repairJson('{')).toBeNull();
  });

  it('repairs non-JSON text into valid JSON', () => {
    expect(repairJson('not json at all')).toBe('"not json at all"');
  });

  it('returns valid JSON unchanged', () => {
    const valid = '{"name": "test", "value": 42}';
    expect(repairJson(valid)).toBe(valid);
  });

  it('removes markdown code blocks', () => {
    const markdown = '```json\n{"name": "test"}\n```';
    expect(repairJson(markdown)).toBe('{"name": "test"}');
  });

  it('fixes unterminated strings (most common LLM bug)', () => {
    const broken = '{"name": "test';
    expect(repairJson(broken)).toBe('{"name": "test"}');
  });

  it('fixes trailing commas', () => {
    const trailing = '{"name": "test",}';
    expect(repairJson(trailing)).toBe('{"name": "test"}');
  });

  it('fixes missing closing braces', () => {
    const missing = '{"name": "test"';
    expect(repairJson(missing)).toBe('{"name": "test"}');
  });

  it('fixes single quotes used as delimiters', () => {
    const singleQuotes = "{'name': 'test'}";
    expect(repairJson(singleQuotes)).toBe('{"name": "test"}');
  });

  it('handles complex nested repairs', () => {
    const complex = '{"event": {"name": "Party", "date": "2026-06-11",}}';
    const result = repairJson(complex);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.event.name).toBe('Party');
    expect(parsed.event.date).toBe('2026-06-11');
  });
});
