/**
 * JWT Token Generation for APNs Authentication
 *
 * APNs uses ES256 (ECDSA with P-256 curve and SHA-256) for JWT signing.
 * Tokens are valid for up to 1 hour, but we refresh at 50 minutes.
 */

import { APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, JWT_TOKEN_VALIDITY_MS } from './config';

// Cached token and expiry time
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Base64URL encode a string or ArrayBuffer
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === 'string') {
    // For strings, use btoa
    base64 = btoa(data);
  } else {
    // For ArrayBuffer, convert to binary string first
    const bytes = new Uint8Array(data);
    let binary = '';

    // Optimize: use spread operator for small arrays, chunked for large arrays
    if (bytes.length < 65536) {
      // For small arrays (< 64KB), use spread operator (2-3x faster)
      binary = String.fromCharCode(...bytes);
    } else {
      // For large arrays, use chunked approach to avoid stack overflow
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
    }

    base64 = btoa(binary);
  }

  // Convert to base64url format
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Parse PEM private key and import as CryptoKey
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Decode base64 to ArrayBuffer
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Import as ECDSA key for signing
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );
}

/**
 * Generate JWT token for APNs authentication
 *
 * @param keyId - APNs Key ID (default from config)
 * @param teamId - Apple Developer Team ID (default from config)
 * @param privateKey - P8 private key in PEM format (default from config)
 * @returns JWT token string
 */
export async function generateJWT(
  keyId: string = APNS_KEY_ID,
  teamId: string = APNS_TEAM_ID,
  privateKey: string = APNS_PRIVATE_KEY
): Promise<string> {
  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId,
  };

  // JWT Payload
  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const cryptoKey = await importPrivateKey(privateKey);

  // Sign with ECDSA SHA-256
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  // The signature from Web Crypto is in IEEE P1363 format (r || s)
  // which is what we need for JWT ES256
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Get a valid JWT token, using cache if available
 *
 * @param keyId - APNs Key ID
 * @param teamId - Apple Developer Team ID
 * @param privateKey - P8 private key in PEM format
 * @param forceRefresh - Force token refresh even if cached token is valid
 * @returns JWT token string
 */
export async function getToken(
  keyId: string = APNS_KEY_ID,
  teamId: string = APNS_TEAM_ID,
  privateKey: string = APNS_PRIVATE_KEY,
  forceRefresh: boolean = false
): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (!forceRefresh && cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  // Generate new token
  cachedToken = await generateJWT(keyId, teamId, privateKey);
  tokenExpiry = now + JWT_TOKEN_VALIDITY_MS;

  return cachedToken;
}

/**
 * Clear the cached token (useful for testing or when token is rejected)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}
