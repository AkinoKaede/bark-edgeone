/**
 * String utility functions
 */

/**
 * Check if string is empty or whitespace only
 */
export function isEmpty(str?: string): boolean {
  return !str || str.trim() === '';
}

/**
 * Normalize sound filename by adding .caf extension if missing
 */
export function normalizeSound(sound: string): string {
  if (!sound) return '1107.caf';
  return sound.endsWith('.caf') ? sound : `${sound}.caf`;
}

/**
 * Safely decode URI component, return original on error
 */
export function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}
