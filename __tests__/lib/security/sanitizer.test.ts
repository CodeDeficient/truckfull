import { describe, it, expect } from '@jest/globals';
import { sanitizeInput, sanitizeFilename } from '@/lib/security/sanitizer';

describe('sanitizeInput', () => {
  describe('XSS prevention', () => {
    it('does not expose an image handler after a malformed textarea closing tag', () => {
      const sanitized = sanitizeInput(
        '<textarea></textarea/><img src=x onerror="alert(document.domain)">',
        ['textarea'],
      );
      const container = document.createElement('div');
      container.innerHTML = sanitized;
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('[onerror]')).toBeNull();
    });

    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data: URLs with scripts', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('data:');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Content';
      const result = sanitizeInput(input);
      expect(result).toBe('Content');
    });

    it('should remove object tags', () => {
      const input = '<object data="evil.swf"></object>Text';
      const result = sanitizeInput(input);
      expect(result).toBe('Text');
    });

    it('should remove embed tags', () => {
      const input = '<embed src="evil.swf">Text';
      const result = sanitizeInput(input);
      expect(result).toBe('Text');
    });
  });

  describe('allowed tags', () => {
    it('should preserve allowed tags by default', () => {
      const input = '<b>Bold</b> <i>Italic</i> <a href="https://example.com">Link</a>';
      const result = sanitizeInput(input);
      expect(result).toContain('<b>Bold</b>');
      expect(result).toContain('<i>Italic</i>');
      expect(result).toContain('<a');
    });

    it('should preserve em and strong tags', () => {
      const input = '<em>Emphasized</em> <strong>Strong</strong>';
      const result = sanitizeInput(input);
      expect(result).toContain('<em>Emphasized</em>');
      expect(result).toContain('<strong>Strong</strong>');
    });

    it('should preserve p and br tags', () => {
      const input = '<p>Paragraph</p><br>';
      const result = sanitizeInput(input);
      expect(result).toContain('<p>Paragraph</p>');
      expect(result).toContain('<br');
    });

    it('should respect custom allowed tags', () => {
      const input = '<div>Content</div><span>More</span>';
      const result = sanitizeInput(input, ['div']);
      expect(result).toContain('<div>Content</div>');
      expect(result).not.toContain('<span>');
    });
  });

  describe('allowed attributes', () => {
    it('should preserve href attribute on links', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>';
      const result = sanitizeInput(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('title="Example"');
    });

    it('should preserve target attribute', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeInput(input);
      expect(result).toContain('target="_blank"');
    });

    it('should remove dangerous attributes', () => {
      const input = '<a href="https://example.com" onclick="evil()">Link</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const input = 'Just plain text';
      expect(sanitizeInput(input)).toBe('Just plain text');
    });

    it('should trim whitespace', () => {
      const input = '  content  ';
      expect(sanitizeInput(input)).toBe('content');
    });

    it('should handle nested tag attacks', () => {
      const input = '<<script>script>alert(1)</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('script');
    });

    it('should handle SVG-based XSS', () => {
      const input = '<svg onload="alert(1)"><circle></circle></svg>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onload');
    });
  });
});

describe('sanitizeFilename', () => {
  describe('directory traversal prevention', () => {
    it('should remove ../ sequences', () => {
      const input = '../../../etc/passwd';
      expect(sanitizeFilename(input)).not.toContain('..');
    });

    it('should remove ..\\ sequences', () => {
      const input = '..\\..\\windows\\system32';
      expect(sanitizeFilename(input)).not.toContain('..');
    });

    it('should remove leading slashes', () => {
      const input = '/etc/passwd';
      expect(sanitizeFilename(input)).not.toMatch(/^\//);
    });

    it('should remove leading backslashes', () => {
      const input = '\\windows\\system32';
      expect(sanitizeFilename(input)).not.toMatch(/^\\/);
    });

    it('should prevent recursive path reconstruction bypass', () => {
      const input = '....//....//etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('..');
    });

    it('should prevent single recursive bypass pattern', () => {
      const input = '....//etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('..');
    });
  });

  describe('invalid character handling', () => {
    it('should replace < and > with underscore', () => {
      const input = 'file<name>.txt';
      expect(sanitizeFilename(input)).toBe('file_name_.txt');
    });

    it('should replace : with underscore', () => {
      const input = 'file:name.txt';
      expect(sanitizeFilename(input)).toBe('file_name.txt');
    });

    it('should replace " with underscore', () => {
      const input = 'file"name.txt';
      expect(sanitizeFilename(input)).toBe('file_name.txt');
    });

    it('should replace | with underscore', () => {
      const input = 'file|name.txt';
      expect(sanitizeFilename(input)).toBe('file_name.txt');
    });

    it('should replace ? with underscore', () => {
      const input = 'file?name.txt';
      expect(sanitizeFilename(input)).toBe('file_name.txt');
    });

    it('should replace * with underscore', () => {
      const input = 'file*name.txt';
      expect(sanitizeFilename(input)).toBe('file_name.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle normal filename', () => {
      const input = 'document.pdf';
      expect(sanitizeFilename(input)).toBe('document.pdf');
    });

    it('should trim whitespace', () => {
      const input = '  filename.txt  ';
      expect(sanitizeFilename(input)).toBe('filename.txt');
    });

    it('should handle filename with spaces', () => {
      const input = 'my document.pdf';
      expect(sanitizeFilename(input)).toBe('my document.pdf');
    });

    it('should handle multiple traversal attempts', () => {
      const input = '../../../..//etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('..');
      expect(result).not.toMatch(/^\//);
    });
  });
});
