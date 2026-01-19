import { describe, it, expect } from 'vitest';
import { isEmpty, normalizeSound, safeDecodeURIComponent } from '../string';

describe('isEmpty', () => {
  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for whitespace only', () => {
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty('\t\n')).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty(' hello ')).toBe(false);
  });
});

describe('normalizeSound', () => {
  it('should add .caf extension if missing', () => {
    expect(normalizeSound('1107')).toBe('1107.caf');
    expect(normalizeSound('bell')).toBe('bell.caf');
  });

  it('should not add .caf if already present', () => {
    expect(normalizeSound('1107.caf')).toBe('1107.caf');
    expect(normalizeSound('bell.caf')).toBe('bell.caf');
  });

  it('should return default for empty string', () => {
    expect(normalizeSound('')).toBe('1107.caf');
  });
});

describe('safeDecodeURIComponent', () => {
  it('should decode valid URI component', () => {
    expect(safeDecodeURIComponent('hello%20world')).toBe('hello world');
    expect(safeDecodeURIComponent('%E4%BD%A0%E5%A5%BD')).toBe('你好');
  });

  it('should return original for invalid URI component', () => {
    expect(safeDecodeURIComponent('hello%')).toBe('hello%');
    expect(safeDecodeURIComponent('hello%2')).toBe('hello%2');
  });

  it('should handle already decoded strings', () => {
    expect(safeDecodeURIComponent('hello world')).toBe('hello world');
  });
});
