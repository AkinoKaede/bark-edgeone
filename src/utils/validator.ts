import type { PushParams, DeviceInfo } from '../types/common';
import { isEmpty, normalizeSound } from './string';

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
  if (isEmpty(token)) {
    return { valid: false, error: 'device token is empty' };
  }

  if (token!.length > 128) {
    return { valid: false, error: 'device token is too long (max 128 characters)' };
  }

  return { valid: true };
}

/**
 * Validate push parameters
 *
 * Note: bark-server allows empty body/title for encrypted push notifications.
 * The handler will set "Empty Message" as body if all alert fields are empty.
 */
export function validatePushParams(params: PushParams): { valid: boolean; error?: string } {
  // Device key is required (either single or batch)
  if (!params.device_key && (!params.device_keys || params.device_keys.length === 0)) {
    return { valid: false, error: 'device key is empty' };
  }

  // Note: Empty body/title is allowed - handler will set default "Empty Message"
  // This is compatible with bark-server behavior for encrypted notifications

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
  if (normalized.sound) {
    normalized.sound = normalizeSound(normalized.sound);
  } else {
    normalized.sound = normalizeSound('');
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
