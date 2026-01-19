import { describe, it, expect } from 'vitest';
import { validateDeviceToken, validatePushParams } from '../validator';

describe('validateDeviceToken', () => {
  it('should reject empty token', () => {
    const result = validateDeviceToken('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject undefined token', () => {
    const result = validateDeviceToken(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject whitespace-only token', () => {
    const result = validateDeviceToken('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject token over 128 characters', () => {
    const longToken = 'a'.repeat(129);
    const result = validateDeviceToken(longToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should accept valid token', () => {
    const result = validateDeviceToken('valid-token-123');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept token with exactly 128 characters', () => {
    const token = 'a'.repeat(128);
    const result = validateDeviceToken(token);
    expect(result.valid).toBe(true);
  });
});

describe('validatePushParams', () => {
  it('should reject params without device_key or device_keys', () => {
    const result = validatePushParams({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('device key');
  });

  it('should accept params with device_key', () => {
    const result = validatePushParams({ device_key: 'test' });
    expect(result.valid).toBe(true);
  });

  it('should accept params with device_keys array', () => {
    const result = validatePushParams({ device_keys: ['test1', 'test2'] });
    expect(result.valid).toBe(true);
  });

  it('should reject params with empty device_keys array', () => {
    const result = validatePushParams({ device_keys: [] });
    expect(result.valid).toBe(false);
  });

  it('should allow empty body and title', () => {
    const result = validatePushParams({ device_key: 'test', body: '', title: '' });
    expect(result.valid).toBe(true);
  });
});
