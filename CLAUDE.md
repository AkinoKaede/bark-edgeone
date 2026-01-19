# Bark EdgeOne Implementation Guide

## Project Overview

This project aims to implement the Bark push notification server on EdgeOne Edge Functions, a serverless edge computing platform. The implementation will migrate functionality from the original Go-based bark-server to TypeScript running on EdgeOne's distributed edge nodes.

## Source Project Analysis

### bark-server Architecture

The original bark-server is built with:
- **Language**: Go (Golang)
- **Framework**: Fiber v2 (HTTP web framework)
- **Database**: Multiple implementations (Bbolt, MySQL, EnvBase for serverless, in-memory)
- **APNs Integration**: Uses apns2 library for Apple Push Notification Service
- **Authentication**: Optional Basic Auth

### Core API Endpoints

1. **POST /push** - Main push notification endpoint (V2 API)
   - Single device push via `device_key`
   - Batch push via `device_keys` array
   - Supports rich notification parameters (title, subtitle, body, sound, badge, etc.)

2. **GET/POST /:device_key/:title/:body** - Legacy V1 API (backward compatibility)

3. **POST /register** - Device registration
   - Registers device token with device key
   - Returns generated device_key if not provided

4. **GET /register/:device_key** - Check device registration

5. **GET /ping, /healthz, /info** - Health check endpoints

### Database Interface

```go
type Database interface {
    CountAll() (int, error)
    DeviceTokenByKey(key string) (string, error)
    SaveDeviceTokenByKey(key, token string) (string, error)
    DeleteDeviceByKey(key string) error
    Close() error
}
```

## EdgeOne Edge Functions Environment

### Runtime Capabilities

- **Runtime**: V8 JavaScript engine with ES2023+ support
- **APIs**: Web Service Worker API standards
- **Storage**: KV (Key-Value) storage accessible via context
- **Network**: Fetch API for HTTP requests
- **Location**: Distributed across 3,200+ edge nodes globally

### Key Limitations

| Constraint | Limit | Mitigation Strategy |
|------------|-------|---------------------|
| Code Size | 5 MB max | Minimize dependencies, use native APIs |
| Request Body | 1 MB max | Sufficient for push notifications |
| CPU Time | 200 ms | Use async operations, optimize logic |
| Storage | KV only | Use KV for device token storage |
| Language | JavaScript/TypeScript | Complete rewrite required |

### Available Runtime APIs

- **Fetch**: HTTP client for APNs communication
- **Cache API**: Response caching
- **Web Crypto**: Encryption operations (JWT for APNs)
- **Streams**: Data processing
- **Headers/Request/Response**: Standard HTTP handling
- **Environment Variables**: Via `context.env`

### Context Object Structure

```typescript
interface EventContext {
  request: Request;      // HTTP request with client data
  params: any;          // Dynamic route parameters
  env: any;             // Environment variables (KV bindings, secrets)
  waitUntil: (promise: Promise<any>) => void;  // Async task management
}
```

## Implementation Plan

### Phase 1: Project Setup and Core Infrastructure

#### 1.1 Project Structure

Based on EdgeOne routing rules. Avoiding dynamic routes with custom names, using single files to handle route variations:

```
bark-edgeone/
├── edge-functions/
│   ├── push.ts                 # POST /push (V2 API)
│   ├── register.ts             # POST /register and GET /register/:device_key
│   ├── ping.ts                 # GET /ping
│   ├── healthz.ts              # GET /healthz
│   ├── info.ts                 # GET /info
│   └── [[default]].ts          # Catch-all for V1 API (/:device_key/:title/:body)
├── src/
│   ├── types/
│   │   ├── common.ts           # CommonResp, PushMessage types
│   │   ├── database.ts         # Database interface
│   │   └── apns.ts             # APNs types
│   ├── database/
│   │   ├── kv-database.ts      # KV storage implementation
│   │   └── env-database.ts     # Environment variable fallback
│   ├── apns/
│   │   ├── client.ts           # APNs HTTP/2 client
│   │   ├── token.ts            # JWT token generation
│   │   └── payload.ts          # Notification payload builder
│   ├── handlers/
│   │   ├── push.ts             # Push notification handler
│   │   └── register.ts         # Device registration handler
│   └── utils/
│       ├── response.ts         # Response helpers (success, failed, data)
│       ├── parser.ts           # Request parameter parsing
│       └── validator.ts        # Input validation
├── package.json
├── tsconfig.json
├── CLAUDE.md                   # This file
└── README.md
```

**Routing Strategy:**

1. **Specific Routes** (highest priority):
   - `push.ts` → `/push` for V2 API
   - `register.ts` → `/register` and `/register/*` (handles both POST /register and GET /register/:device_key)
   - `ping.ts` → `/ping`
   - `healthz.ts` → `/healthz`
   - `info.ts` → `/info`

2. **Catch-all Route** (lowest priority):
   - `[[default]].ts` → Matches any unmatched path like `/:device_key`, `/:device_key/:body`, `/:device_key/:title/:body`
   - This handles V1 API compatibility

**Routing Priority:** Specific files > Catch-all `[[default]]`

**Note:** The `register.ts` file will parse the URL path to determine if it's a POST to `/register` (registration) or a GET to `/register/:device_key` (check status).

#### 1.2 Dependencies Setup

**Required packages:**
- `edgeone` (dev): CLI and type definitions
- No external runtime dependencies (use native Web APIs)

**Consider bundling if needed:**
- JWT generation logic (for APNs authentication)
- Crypto utilities (use Web Crypto API when possible)

### Phase 2: Database Layer Implementation

#### 2.1 KV Storage Database

Implement the Database interface using EdgeOne KV:

```typescript
// src/database/kv-database.ts
export class KVDatabase implements Database {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async deviceTokenByKey(key: string): Promise<string> {
    const token = await this.kv.get(`device:${key}`);
    if (!token) throw new Error('Device key not found');
    return token;
  }

  async saveDeviceTokenByKey(key: string, token: string): Promise<string> {
    // Generate UUID if key is empty
    const deviceKey = key || crypto.randomUUID();
    await this.kv.put(`device:${deviceKey}`, token);
    return deviceKey;
  }

  // ... other methods
}
```

**KV Binding Configuration:**
- Bind KV namespace as `BARK_KV` in EdgeOne Pages settings
- Access via `context.env.BARK_KV`

#### 2.2 Environment Variable Fallback

For serverless mode (single device):

```typescript
// src/database/env-database.ts
export class EnvDatabase implements Database {
  async deviceTokenByKey(key: string): Promise<string> {
    if (key === Deno.env.get('BARK_KEY')) {
      return Deno.env.get('BARK_DEVICE_TOKEN') || '';
    }
    throw new Error('Key not found');
  }
  // ... simple implementation for single device
}
```

### Phase 3: APNs Integration

#### 3.1 APNs HTTP/2 Client

Use native Fetch API (supports HTTP/2):

```typescript
// src/apns/client.ts
export class APNsClient {
  private token: string;
  private tokenExpiry: number;

  async push(notification: APNsNotification): Promise<APNsResponse> {
    await this.refreshTokenIfNeeded();

    const response = await fetch(
      `https://api.push.apple.com/3/device/${notification.deviceToken}`,
      {
        method: 'POST',
        headers: {
          'authorization': `bearer ${this.token}`,
          'apns-push-type': notification.pushType,
          'apns-topic': 'me.fin.bark',
          'apns-expiration': notification.expiration,
          'apns-collapse-id': notification.collapseId || '',
        },
        body: JSON.stringify(notification.payload),
      }
    );

    return {
      statusCode: response.status,
      reason: await response.text(),
    };
  }
}
```

#### 3.2 JWT Token Generation

Use Web Crypto API for APNs JWT:

```typescript
// src/apns/token.ts
export async function generateAPNsToken(
  keyId: string,
  teamId: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  // Use Web Crypto API for signing
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(
      `${base64url(header)}.${base64url(payload)}`
    )
  );

  return `${base64url(header)}.${base64url(payload)}.${base64url(signature)}`;
}
```

**APNs Credentials Storage:**
- Store private key in environment variable: `APNS_PRIVATE_KEY`
- Store Key ID: `APNS_KEY_ID` (default: "LH4T9V5U4R")
- Store Team ID: `APNS_TEAM_ID` (default: "5U8LBRXG3A")

#### 3.3 Payload Builder

```typescript
// src/apns/payload.ts
export class PayloadBuilder {
  private payload: any = { aps: {} };

  alertTitle(title: string): this {
    this.payload.aps.alert = this.payload.aps.alert || {};
    this.payload.aps.alert.title = title;
    return this;
  }

  alertBody(body: string): this {
    this.payload.aps.alert = this.payload.aps.alert || {};
    this.payload.aps.alert.body = body;
    return this;
  }

  sound(sound: string): this {
    this.payload.aps.sound = sound;
    return this;
  }

  custom(key: string, value: any): this {
    this.payload[key] = value;
    return this;
  }

  // ... other builder methods
}
```

### Phase 4: Route Handlers Implementation

#### 4.1 Push Endpoint (V2 API)

```typescript
// edge-functions/push.ts
import { handlePushV2 } from '../src/handlers/push';
import type { EventContext } from '../src/types/common';

// V2 API - POST /push with JSON body
export async function onRequestPost(context: EventContext): Promise<Response> {
  return handlePushV2(context);
}

// Also support GET for query parameter style
export async function onRequestGet(context: EventContext): Promise<Response> {
  return handlePushV2(context);
}
```

#### 4.1.1 Catch-all for V1 API

```typescript
// edge-functions/[[default]].ts
import { handlePushV1 } from '../src/handlers/push';
import type { EventContext } from '../src/types/common';

// V1 API - Handles routes like:
// /:device_key
// /:device_key/:body
// /:device_key/:title/:body
// /:device_key/:title/:subtitle/:body
export async function onRequest(context: EventContext): Promise<Response> {
  const path = new URL(context.request.url).pathname;

  // Parse path segments
  const segments = path.split('/').filter(s => s);

  // Build params from path segments
  const params: any = {};
  if (segments.length >= 1) params.device_key = decodeURIComponent(segments[0]);
  if (segments.length >= 2) params.body = decodeURIComponent(segments[1]);
  if (segments.length >= 3) {
    params.title = params.body;
    params.body = decodeURIComponent(segments[2]);
  }
  if (segments.length >= 4) {
    params.subtitle = params.title;
    params.title = decodeURIComponent(segments[1]);
    params.body = decodeURIComponent(segments[3]);
  }

  return handlePushV1(context, params);
}
```

#### 4.2 Request Parameter Parsing

Support multiple input methods:
1. JSON body (V2 API): `POST /push` with JSON
2. URL path parameters (V1 API): `GET /:device_key/:title/:body`
3. Query parameters: `?title=foo&body=bar`
4. Form data: `application/x-www-form-urlencoded`

```typescript
// src/utils/parser.ts
export async function parseParams(context: EventContext): Promise<PushParams> {
  const params: any = {};
  const { request } = context;
  const contentType = request.headers.get('content-type') || '';

  // Parse JSON body (highest priority)
  if (contentType.includes('application/json')) {
    const body = await request.json();
    Object.assign(params, body);
  }

  // Parse URL query parameters
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    params[key.toLowerCase()] = value;
  });

  // Parse URL path parameters
  if (context.params) {
    // Handle dynamic route params like [device_key], [title], [body]
    Object.assign(params, context.params);
  }

  return params;
}
```

#### 4.3 Batch Push Implementation

```typescript
// src/handlers/push.ts
export async function handleBatchPush(
  deviceKeys: string[],
  params: PushParams,
  context: EventContext
): Promise<Response> {
  const maxBatchCount = parseInt(context.env.MAX_BATCH_PUSH_COUNT || '-1');

  if (maxBatchCount > 0 && deviceKeys.length > maxBatchCount) {
    return jsonResponse(
      { code: 400, message: `Batch push count exceeds limit: ${maxBatchCount}` },
      400
    );
  }

  const results = await Promise.all(
    deviceKeys.map(async (deviceKey) => {
      const pushParams = { ...params, device_key: deviceKey };
      try {
        await executePush(pushParams, context);
        return { code: 200, device_key: deviceKey };
      } catch (error) {
        return {
          code: 500,
          device_key: deviceKey,
          message: error.message
        };
      }
    })
  );

  return jsonResponse({ code: 200, data: results, timestamp: Date.now() });
}
```

#### 4.4 Register Endpoint

```typescript
// edge-functions/register.ts
import { handleRegister, handleRegisterCheck } from '../src/handlers/register';
import type { EventContext } from '../src/types/common';

export async function onRequest(context: EventContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /register - Device registration
  if (request.method === 'POST' && path === '/register') {
    return handleRegister(context);
  }

  // GET /register/:device_key - Check registration status
  if (request.method === 'GET' && path.startsWith('/register/')) {
    const deviceKey = path.replace('/register/', '');
    if (deviceKey) {
      return handleRegisterCheck(context, deviceKey);
    }
  }

  // Default: 404
  return new Response(JSON.stringify({
    code: 404,
    message: 'Not found',
    timestamp: Math.floor(Date.now() / 1000)
  }), {
    status: 404,
    headers: { 'content-type': 'application/json' }
  });
}

// Handler implementation in src/handlers/register.ts
export async function handleRegister(context: EventContext): Promise<Response> {
  const body = await context.request.json();
  const deviceToken = body.device_token || body.devicetoken;
  const deviceKey = body.device_key || body.key || '';

  if (!deviceToken) {
    return errorResponse(400, 'device_token is required');
  }

  if (deviceToken.length > 128) {
    return errorResponse(400, 'device_token is invalid');
  }

  const db = getDatabaseInstance(context);
  const newKey = await db.saveDeviceTokenByKey(deviceKey, deviceToken);

  return jsonResponse(data({
    key: newKey,
    device_key: newKey,
    device_token: deviceToken,
  }));
}

export async function handleRegisterCheck(
  context: EventContext,
  deviceKey: string
): Promise<Response> {
  if (!deviceKey) {
    return errorResponse(400, 'device_key is required');
  }

  const db = getDatabaseInstance(context);
  try {
    await db.deviceTokenByKey(deviceKey);
    return jsonResponse(success());
  } catch (error) {
    return errorResponse(400, error.message);
  }
}
```

### Phase 5: Response Helpers and Error Handling

```typescript
// src/utils/response.ts
export interface CommonResp {
  code: number;
  message: string;
  data?: any;
  timestamp: number;
}

export function success(): CommonResp {
  return {
    code: 200,
    message: 'success',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export function failed(code: number, message: string): CommonResp {
  return {
    code,
    message,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export function data(responseData: any): CommonResp {
  return {
    code: 200,
    message: 'success',
    data: responseData,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export function jsonResponse(resp: CommonResp, status?: number): Response {
  return new Response(JSON.stringify(resp), {
    status: status || resp.code,
    headers: { 'content-type': 'application/json' },
  });
}
```

### Phase 6: Authentication and Security

#### 6.1 Basic Authentication (Optional)

```typescript
// src/middleware/auth.ts
export function checkAuth(request: Request, env: any): boolean {
  const authUser = env.BARK_AUTH_USER;
  const authPassword = env.BARK_AUTH_PASSWORD;

  if (!authUser || !authPassword) {
    return true; // Auth disabled
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(':');

  return username === authUser && password === authPassword;
}
```

#### 6.2 Rate Limiting

Use EdgeOne's built-in rate limiting or implement custom:

```typescript
// src/middleware/ratelimit.ts
export async function checkRateLimit(
  key: string,
  kv: KVNamespace,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<boolean> {
  const rateLimitKey = `ratelimit:${key}`;
  const count = await kv.get(rateLimitKey);

  if (!count) {
    await kv.put(rateLimitKey, '1', { expirationTtl: windowSeconds });
    return true;
  }

  const currentCount = parseInt(count);
  if (currentCount >= maxRequests) {
    return false;
  }

  await kv.put(rateLimitKey, (currentCount + 1).toString(), {
    expirationTtl: windowSeconds
  });
  return true;
}
```

### Phase 7: Testing and Deployment

#### 7.1 Local Development

```bash
# Install EdgeOne CLI
npm install edgeone

# Start local dev server
npx edgeone pages dev

# Test endpoints
curl -X POST http://localhost:8788/push \
  -H "Content-Type: application/json" \
  -d '{"device_key":"test","title":"Hello","body":"World"}'
```

#### 7.2 Environment Variables Configuration

Configure in EdgeOne Pages dashboard:

```env
# APNs Configuration
APNS_PRIVATE_KEY=<base64-encoded-p8-key>
APNS_KEY_ID=LH4T9V5U4R
APNS_TEAM_ID=5U8LBRXG3A
APNS_TOPIC=me.fin.bark

# Authentication (optional)
BARK_AUTH_USER=admin
BARK_AUTH_PASSWORD=secret

# Batch Push Limit
MAX_BATCH_PUSH_COUNT=100

# Serverless Mode (single device)
BARK_KEY=test-device-key
BARK_DEVICE_TOKEN=test-token
```

#### 7.3 KV Namespace Binding

1. Create KV namespace in EdgeOne dashboard
2. Bind to `BARK_KV` variable
3. Access in code via `context.env.BARK_KV`

#### 7.4 Deployment

```bash
# Build TypeScript
npm run build

# Deploy to EdgeOne Pages
edgeone pages deploy

# Or use CI/CD with GitHub integration
```

## Implementation Priorities

### Must-Have (MVP)
1. ✅ Push endpoint with JSON API (V2)
2. ✅ Device registration endpoint
3. ✅ KV database implementation
4. ✅ APNs HTTP/2 client with JWT
5. ✅ Basic error handling
6. ✅ Health check endpoints

### Should-Have
1. ✅ Batch push support
2. ✅ V1 API compatibility (URL path params)
3. ⏳ Basic authentication
4. ⏳ Environment variable fallback database
5. ✅ Request validation

### Nice-to-Have
1. ⏺ Rate limiting
2. ⏺ Detailed logging
3. ⏺ Metrics collection
4. ⏺ Admin dashboard
5. ⏺ Device token cleanup

## Key Technical Decisions

### 1. No External Dependencies
- **Decision**: Use native Web APIs exclusively
- **Rationale**: Minimize bundle size, maximize compatibility
- **Trade-off**: More manual implementation required

### 2. KV Storage for Device Tokens
- **Decision**: Use EdgeOne KV for primary storage
- **Rationale**: Native platform support, distributed, fast
- **Trade-off**: Eventually consistent (not strongly consistent)

### 3. JWT Generation for APNs
- **Decision**: Implement JWT signing with Web Crypto API
- **Rationale**: No external libraries needed, standard API
- **Trade-off**: More complex implementation

### 4. Catch-All Routing
- **Decision**: Use `[[route]].ts` for V1 API compatibility
- **Rationale**: Flexible routing for multiple path formats
- **Trade-off**: Need manual route parsing

### 5. Async Operations
- **Decision**: Use `context.waitUntil()` for non-critical tasks
- **Rationale**: Avoid hitting 200ms CPU time limit
- **Trade-off**: Some operations may complete after response

## Performance Optimization Tips

1. **Minimize Cold Starts**: Keep code size small, avoid heavy initialization
2. **Cache APNs Tokens**: Reuse JWT tokens (valid for 1 hour)
3. **Parallel Processing**: Use `Promise.all()` for batch operations
4. **Edge Caching**: Cache static responses with Cache API
5. **KV Caching**: Cache frequently accessed device tokens in memory
6. **Async Cleanup**: Use `waitUntil()` for logging and cleanup tasks

## Common Pitfalls to Avoid

1. **Don't use Node.js APIs**: EdgeOne uses Web APIs, not Node.js
2. **Don't rely on filesystem**: No filesystem access in edge functions
3. **Don't use long-running processes**: 200ms CPU time limit
4. **Don't store large data in KV values**: Keep values reasonably sized
5. **Don't skip input validation**: Always validate user input
6. **Don't forget error handling**: Network requests can fail

## Migration Checklist

- [x] Set up project structure
- [x] Implement KV database interface
- [x] Implement APNs client with JWT
- [x] Create push endpoint handler (V2 API)
- [x] Create register endpoint handler
- [x] Add health check endpoints
- [x] Implement request parsing utilities
- [x] Add response helpers
- [x] Configure environment variables
- [x] Set up KV namespace binding
- [x] Test locally with EdgeOne CLI
- [x] Deploy to EdgeOne Pages
- [ ] Test with real APNs credentials
- [x] Add V1 API compatibility
- [x] Add batch push support
- [ ] Add authentication (optional)
- [ ] Set up monitoring and logging

## References

- **EdgeOne Edge Functions Docs**: https://pages.edgeone.ai/document/edge-functions
- **EdgeOne Runtime APIs**: https://edgeone.ai/document/53374
- **Web Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **APNs Provider API**: https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server
- **Original Bark Server**: https://github.com/Finb/bark-server
- **EdgeOne Pages Templates**: https://github.com/TencentEdgeOne/pages-templates

## Next Steps for Development

1. **Read this entire document** to understand the architecture
2. **Set up the project structure** as outlined in Phase 1
3. **Implement core types** in `src/types/` directory
4. **Start with KV database** implementation
5. **Build APNs client** with JWT authentication
6. **Create push endpoint** with V2 API support
7. **Test locally** with EdgeOne CLI
8. **Deploy and iterate** based on real-world usage

## Development Tips

- Use TypeScript strict mode for type safety
- Write small, focused functions for better testability
- Comment complex logic, especially JWT signing and APNs integration
- Use meaningful variable names for better code readability
- Follow EdgeOne's best practices for edge functions
- Monitor function execution time to stay under 200ms limit
- Use environment variables for configuration, not hardcoded values
- Test error cases thoroughly (network failures, invalid tokens, etc.)

---

**Last Updated**: 2026-01-19
**Target Platform**: EdgeOne Pages Edge Functions
**Source Project**: bark-server v2 (Go)
**Target Language**: TypeScript/JavaScript
