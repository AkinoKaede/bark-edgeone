import { failed } from './response';

const BASIC_PREFIX = 'Basic ';

function constantTimeEquals(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length;

  for (let i = 0; i < maxLength; i++) {
    const aCode = i < a.length ? a.charCodeAt(i) : 0;
    const bCode = i < b.length ? b.charCodeAt(i) : 0;
    result |= aCode ^ bCode;
  }

  return result === 0;
}

export function checkBasicAuth(request: Request, env: any): boolean {
  const user = env?.BARK_AUTH_USER;
  const password = env?.BARK_AUTH_PASSWORD;

  if (!user || !password) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith(BASIC_PREFIX)) {
    return false;
  }

  let decoded = '';
  try {
    decoded = atob(authHeader.slice(BASIC_PREFIX.length));
  } catch {
    return false;
  }

  return constantTimeEquals(decoded, `${user}:${password}`);
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
