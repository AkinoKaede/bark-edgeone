/**
 * APNs Configuration
 *
 * These values are from the original bark-server implementation.
 * The private key should be stored in environment variables for security.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// APNs Topic (App Bundle ID)
export const APNS_TOPIC = 'me.fin.bark';

// APNs Key ID
export const APNS_KEY_ID = 'LH4T9V5U4R';

// Apple Developer Team ID
export const APNS_TEAM_ID = '5U8LBRXG3A';

// APNs Production Host
export const APNS_HOST_PRODUCTION = 'https://api.push.apple.com';

// APNs Development Host
export const APNS_HOST_DEVELOPMENT = 'https://api.sandbox.push.apple.com';

// Maximum payload size (4KB)
export const PAYLOAD_MAXIMUM = 4096;

// Default sound
export const DEFAULT_SOUND = '1107';

// JWT token validity (50 minutes, refresh before 1 hour expiry)
export const JWT_TOKEN_VALIDITY_MS = 50 * 60 * 1000;

/**
 * Bark push private key (P8 format)
 * This is the same key used in bark-server
 */
export const APNS_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg4vtC3g5L5HgKGJ2+
T1eA0tOivREvEAY2g+juRXJkYL2gCgYIKoZIzj0DAQehRANCAASmOs3JkSyoGEWZ
sUGxFs/4pw1rIlSV2IC19M8u3G5kq36upOwyFWj9Gi3Ejc9d3sC7+SHRqXrEAJow
8/7tRpV+
-----END PRIVATE KEY-----
`;

/**
 * Get APNs configuration from environment or defaults
 */
export function getAPNsConfig(env?: any): {
  topic: string;
  keyId: string;
  teamId: string;
  privateKey: string;
  host: string;
} {
  return {
    topic: env?.APNS_TOPIC || APNS_TOPIC,
    keyId: env?.APNS_KEY_ID || APNS_KEY_ID,
    teamId: env?.APNS_TEAM_ID || APNS_TEAM_ID,
    privateKey: env?.APNS_PRIVATE_KEY || APNS_PRIVATE_KEY,
    host: env?.APNS_USE_SANDBOX === 'true' ? APNS_HOST_DEVELOPMENT : APNS_HOST_PRODUCTION,
  };
}
