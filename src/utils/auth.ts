import { failed } from './response';
import { constantTimeEquals } from './crypto';

const BASIC_PREFIX = 'Basic ';

/**
 * Parse multi-user credentials from environment variable
 * Format: "user1:pass1;user2:pass2;user3:pass3"
 * 
 * @param credentialsString - Semicolon-separated credentials
 * @returns Map of username to password
 */
function parseCredentials(credentialsString: string): Map<string, string> {
  const credentials = new Map<string, string>();
  
  if (!credentialsString) {
    return credentials;
  }

  const pairs = credentialsString.split(';');
  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    if (!trimmedPair) continue;

    const colonIndex = trimmedPair.indexOf(':');
    if (colonIndex === -1) continue;

    const username = trimmedPair.substring(0, colonIndex);
    const password = trimmedPair.substring(colonIndex + 1);

    if (username && password) {
      credentials.set(username, password);
    }
  }

  return credentials;
}

/**
 * Check Basic Authentication with multi-user support
 * 
 * Uses AUTH_CREDENTIALS environment variable
 * Format: "user1:pass1;user2:pass2;user3:pass3"
 * 
 * @param request - HTTP request
 * @param env - Environment variables
 * @returns true if authenticated or auth disabled, false otherwise
 */
export function checkBasicAuth(request: Request, env: any): boolean {
  // Check for multi-user credentials
  const multiUserCreds = env?.AUTH_CREDENTIALS;

  // If no auth configured, allow access
  if (!multiUserCreds) {
    return true;
  }

  // Get authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith(BASIC_PREFIX)) {
    return false;
  }

  // Decode credentials
  let decoded = '';
  try {
    decoded = atob(authHeader.slice(BASIC_PREFIX.length));
  } catch {
    return false;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return false;
  }

  const username = decoded.substring(0, colonIndex);
  const password = decoded.substring(colonIndex + 1);

  // Check multi-user credentials
  const credentials = parseCredentials(multiUserCreds);
  const expectedPassword = credentials.get(username);
  
  if (expectedPassword && constantTimeEquals(password, expectedPassword)) {
    return true;
  }

  return false;
}

export function unauthorizedResponse(): Response {
  const body = failed(401, 'Unauthorized');

  return new Response(JSON.stringify(body), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'WWW-Authenticate': 'Basic',
    },
  });
}
