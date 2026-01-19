import type { PushParams, DeviceInfo } from '../types/common';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate device token
 * - Must not be empty
 * - Must not exceed 128 characters
 */
export function validateDeviceToken(token?: string): ValidationResult {
  if (!token || token.trim() === '') {
    return { valid: false, error: 'device token is empty' };
  }

  if (token.length > 128) {
    return { valid: false, error: 'device token is too long (max 128 characters)' };
  }

  return { valid: true };
}

/**
 * Validate push parameters
 */
export function validatePushParams(params: PushParams): { valid: boolean; error?: string } {
  // Device key is required
  if (!params.device_key && (!params.device_keys || params.device_keys.length === 0)) {
    return { valid: false, error: 'device_key or device_keys is required' };
  }

  // At least body should be present for meaningful notification
  // (title and subtitle are optional)
  if (!params.body && !params.title && !params.ciphertext) {
    return { valid: false, error: 'body, title, or ciphertext is required' };
  }

  return { valid: true };
}

/**
 * Validate device registration info
 */
export function validateDeviceInfo(info: DeviceInfo): { valid: boolean; error?: string } {
  // Get device_token from either new or old field name
  const deviceToken = info.device_token || info.devicetoken;

  if (!deviceToken) {
    return { valid: false, error: 'device_token is required' };
  }

  // Device token should not be too long (APNs limit)
  if (deviceToken.length > 128) {
    return { valid: false, error: 'device_token is invalid (too long)' };
  }

  // Device token should not be too short
  if (deviceToken.length < 8) {
    return { valid: false, error: 'device_token is invalid (too short)' };
  }

  return { valid: true };
}

/**
 * Sanitize and normalize push parameters
 */
export function normalizePushParams(params: PushParams): PushParams {
  const normalized: PushParams = { ...params };

  // Normalize sound parameter
  if (normalized.sound && !normalized.sound.endsWith('.caf')) {
    normalized.sound = `${normalized.sound}.caf`;
  }

  // Default sound if not specified
  if (!normalized.sound) {
    normalized.sound = '1107.caf';
  }

  // Convert string numbers to actual numbers
  if (typeof normalized.badge === 'string') {
    normalized.badge = parseInt(normalized.badge, 10);
  }

  // Normalize boolean-like strings
  const booleanFields = ['call', 'autoCopy', 'isArchive'];
  for (const field of booleanFields) {
    if (normalized[field] === '1' || normalized[field] === 'true') {
      normalized[field] = '1';
    }
  }

  return normalized;
}

/**
 * Check if a value is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
