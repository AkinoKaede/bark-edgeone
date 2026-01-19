import { describe, it, expect } from 'vitest';
import { getErrorMessage, isNetworkError } from '../error';

describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('test error');
    expect(getErrorMessage(error)).toBe('test error');
  });

  it('should return string error as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error');
  });

  it('should return default for unknown type', () => {
    expect(getErrorMessage(123)).toBe('unknown error');
    expect(getErrorMessage(null)).toBe('unknown error');
    expect(getErrorMessage(undefined)).toBe('unknown error');
    expect(getErrorMessage({})).toBe('unknown error');
  });
});

describe('isNetworkError', () => {
  it('should detect fetch errors', () => {
    const error = new Error('fetch failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect network errors', () => {
    const error = new Error('network timeout');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect timeout errors', () => {
    const error = new Error('request timeout');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    const error = new Error('validation error');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for non-Error types', () => {
    expect(isNetworkError('fetch failed')).toBe(false);
    expect(isNetworkError(123)).toBe(false);
  });
});
