# Development Overview

This document provides a comprehensive overview of the Bark EdgeOne architecture, technology stack, and development workflow.

## Project Overview

Bark EdgeOne is a push notification server implementation for EdgeOne Pages Edge Functions, providing APNs (Apple Push Notification service) integration with global edge deployment. It is compatible with the [Bark](https://github.com/Finb/Bark) iOS app and [bark-server](https://github.com/Finb/bark-server) API.

### Key Features

- **Edge Computing**: Deployed on EdgeOne Pages edge nodes worldwide for low-latency push delivery
- **APNs Integration**: Full support for Apple Push Notification service with JWT authentication
- **Bark Compatibility**: Compatible with Bark app and bark-server V1/V2 APIs
- **KV Storage**: Device token management using EdgeOne KV Storage
- **Batch Push**: Support for sending notifications to multiple devices simultaneously
- **HTTP/2 Proxy**: Node Functions proxy for APNs HTTP/2 communication

## Technology Stack

### Core Technologies

- **TypeScript**: Type-safe development with strict mode enabled
- **EdgeOne Pages**: Serverless edge computing platform
- **EdgeOne Edge Functions**: Serverless functions running on edge nodes
- **EdgeOne Node Functions**: Node.js serverless functions for HTTP/2 proxy
- **EdgeOne KV Storage**: Distributed key-value storage for device tokens

### Development Tools

- **Vitest**: Fast unit testing framework
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **TypeScript Compiler**: ES2020 target with CommonJS modules

### Runtime Environment

- **Node.js**: 24.5.0 (specified in edgeone.json)
- **Target**: ES2020
- **Module System**: CommonJS

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Bark App)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EdgeOne Edge Functions                    │
│                         (/api/*)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/register  │  /api/push  │  /api/ping  │  etc.  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌───────────────────┐   ┌──────────────────┐
        │   KV Storage      │   │  Node Functions  │
        │  (Device Tokens)  │   │  (APNs Proxy)    │
        └───────────────────┘   └──────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │   Apple APNs Server   │
                            │     (HTTP/2)          │
                            └───────────────────────┘
```

### Component Architecture

#### 1. Edge Functions Layer (`edge-functions/`)

Edge Functions handle all API endpoints and run on edge nodes worldwide.

**API Endpoints:**
- `/api/register` - Device registration (POST)
- `/api/register/:device_key` - Device info retrieval (GET)
- `/api/push` - Push notification V2 API (POST)
- `/api/ping` - Health check (GET)
- `/api/healthz` - Health check with KV status (GET)
- `/api/info` - Server information (GET)
- `/api/*` - V1 API catch-all (GET/POST)

**Key Files:**
- `edge-functions/api/push.ts` - V2 push endpoint
- `edge-functions/api/register/index.ts` - Device registration
- `edge-functions/api/[[default]].ts` - V1 API catch-all handler

#### 2. Node Functions Layer (`node-functions/`)

Node Functions provide HTTP/2 proxy support for APNs communication.

**Purpose:**
- EdgeOne Edge Functions Runtime currently does not support HTTP/2 in the `fetch` API
- Node Functions act as an HTTP/2 reverse proxy to Apple's APNs servers
- Edge Functions forward APNs requests to the Node Functions proxy

**Key Files:**
- `node-functions/apns-proxy/index.ts` - HTTP/2 proxy implementation

**Note:** This is a temporary workaround. Once EdgeOne Edge Functions Runtime supports HTTP/2, the proxy will be removed and API paths will change from `/api/*` to `/*` (breaking change).

#### 3. Core Logic Layer (`src/`)

The core logic layer contains business logic, utilities, and type definitions.

**Directory Structure:**

```
src/
├── apns/                    # APNs integration
│   ├── client.ts           # APNs HTTP/2 client
│   ├── proxy-client.ts     # Proxy client for Node Functions
│   ├── jwt.ts              # JWT token generation
│   ├── payload.ts          # APNs payload builder
│   ├── config.ts           # APNs configuration
│   └── index.ts            # Public exports
├── handlers/                # Business logic handlers
│   ├── push.ts             # Push notification handler
│   └── register.ts         # Device registration handler
├── types/                   # TypeScript type definitions
│   ├── common.ts           # Common types (EventContext, PushMessage)
│   ├── apns.ts             # APNs-specific types
│   └── environment.ts      # Environment variable types
└── utils/                   # Utility functions
    ├── auth.ts             # Basic authentication
    ├── crypto.ts           # Cryptographic utilities
    ├── error.ts            # Error handling
    ├── kv.ts               # KV storage utilities
    ├── logger.ts           # Logging utilities
    ├── parser.ts           # Request parsing
    ├── response.ts         # Response builders
    ├── string.ts           # String utilities
    ├── uuid.ts             # UUID generation
    └── validator.ts        # Input validation
```

### Data Flow

#### Device Registration Flow

```
1. Client → POST /api/register
   Body: { device_key: "abc123", device_token: "apns_token..." }

2. Edge Function → handlers/register.ts
   - Validate device_key and device_token
   - Check token length (max 128 chars)

3. Handler → KV Storage
   - Save: device:abc123 → apns_token...

4. Response → Client
   { code: 200, message: "success", timestamp: 1234567890 }
```

#### Push Notification Flow (V2 API)

```
1. Client → POST /api/push
   Body: { device_key: "abc123", title: "Hello", body: "World" }

2. Edge Function → handlers/push.ts
   - Check authentication (if enabled)
   - Parse request parameters

3. Handler → KV Storage
   - Get device token: device:abc123 → apns_token...

4. Handler → apns/client.ts
   - Build APNs payload
   - Generate JWT token (cached)

5. APNs Client → Node Functions Proxy
   POST /apns-proxy
   - Forward APNs request with JWT

6. Node Functions → Apple APNs Server
   - HTTP/2 POST to api.push.apple.com
   - Send notification payload

7. Response Chain
   APNs → Proxy → Client
   { code: 200, message: "success" }
```

#### Push Notification Flow (V1 API)

```
1. Client → GET /api/:device_key/:title/:body
   Example: /api/abc123/Hello/World

2. Edge Function → [[default]].ts
   - Parse URL path segments
   - Extract device_key, title, body

3. Handler → Same as V2 flow (steps 3-7)
```

### Storage Architecture

#### KV Storage Schema

EdgeOne KV Storage is used for device token management.

**Key Format:**
```
device:{device_key} → {apns_device_token}
```

**Example:**
```
device:abc123 → 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Operations:**
- `getDeviceToken(deviceKey)` - Retrieve device token
- `saveDeviceToken(deviceKey, token)` - Save/update device token
- `deleteDeviceToken(deviceKey)` - Delete device token
- `countDevices()` - Count total registered devices

**KV Storage Limits:**
- Key size: Max 512 bytes
- Value size: Max 25 MB
- Keys must be alphanumeric + underscores

### Authentication

#### Basic Authentication

Optional HTTP Basic Authentication for push endpoints.

**Configuration:**
```bash
AUTH_CREDENTIALS="username:password"
```

**Implementation:**
- `src/utils/auth.ts` - Basic auth validation
- Applied to `/api/push` endpoint
- Returns 401 Unauthorized if credentials don't match

#### APNs Proxy Authentication

Secure the APNs proxy endpoint with a shared secret.

**Configuration:**
```bash
APNS_PROXY_SECRET="your-secret-key"
```

**Implementation:**
- Proxy client sends secret in `X-Apns-Proxy-Auth` header
- Node Functions validate secret before forwarding requests

## API Compatibility

### V1 API (bark-server compatible)

**Endpoint Format:**
```
GET/POST /:device_key/:title/:body
GET/POST /:device_key/:title
GET/POST /:device_key
```

**Example:**
```bash
curl "https://your-domain.edgeone.app/api/abc123/Hello/World"
```

**Parameters:**
- Path segments: `device_key`, `title`, `body`
- Query parameters: `sound`, `badge`, `url`, etc.
- POST body: Form data or multipart

### V2 API (JSON-based)

**Endpoint:**
```
POST /api/push
```

**Example:**
```bash
curl -X POST https://your-domain.edgeone.app/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "device_key": "abc123",
    "title": "Hello",
    "body": "World",
    "sound": "bell.caf"
  }'
```

**Batch Push:**
```bash
curl -X POST https://your-domain.edgeone.app/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "device_keys": ["key1", "key2", "key3"],
    "title": "Hello",
    "body": "World"
  }'
```

## Build and Deployment

### Build Process

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build TypeScript to dist/
npm run build

# Output: dist/ directory with compiled JavaScript
```

**Build Configuration:**
- Input: `src/`, `edge-functions/`, `node-functions/`
- Output: `dist/`
- Target: ES2020
- Module: CommonJS

### Deployment Process

**EdgeOne Pages Deployment:**

1. **Build**: `npm run build`
2. **Upload**: Deploy `dist/` folder to EdgeOne Pages
3. **Routing**: EdgeOne automatically routes requests to edge/node functions
4. **KV Binding**: Bind KV namespace as `KV_STORAGE`
5. **Environment Variables**: Configure via EdgeOne dashboard or CLI

**Deployment Methods:**
- GitHub integration (automatic deployment on push)
- CLI deployment (`npx edgeone pages deploy`)
- Manual upload via web dashboard

### Environment Configuration

**Required:**
- `KV_STORAGE` - KV namespace binding (configured in dashboard)

**Optional:**
- `AUTH_CREDENTIALS` - Basic auth credentials
- `APNS_PROXY_SECRET` - Proxy authentication secret
- `MAX_BATCH_PUSH_COUNT` - Max batch push limit (default: 64)
- `APNS_TOPIC` - APNs topic (default: me.fin.bark)
- `APNS_KEY_ID` - APNs key ID
- `APNS_TEAM_ID` - Apple Developer Team ID
- `APNS_PRIVATE_KEY` - APNs P8 private key

See [docs/en/configuration/env.md](../configuration/env.md) for complete documentation.

## Development Workflow

### Local Development

```bash
# Start local dev server
npx edgeone pages dev

# Server runs on http://localhost:8088
# Hot reload enabled for code changes
```

**Local Environment:**
- Edge Functions run in local runtime
- KV Storage requires binding (configure in `.edgeone/config.json`)
- Environment variables loaded from `.env` file

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/utils/__tests__/string.test.ts
```

**Test Structure:**
- Test files: `__tests__/*.test.ts`
- Framework: Vitest
- Coverage: v8 provider
- Location: Co-located with source files

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

**Standards:**
- ESLint with TypeScript plugin
- Prettier for formatting
- Strict TypeScript mode
- 100 character line length

## Known Issues and Limitations

### HTTP/2 Support

**Issue:** EdgeOne Edge Functions Runtime does not support HTTP/2 in the `fetch` API.

**Current Solution:** Node Functions proxy for APNs communication.

**Impact:**
- All Edge Functions under `/api/*` (routing constraint)
- Additional latency from proxy hop

**Future Changes (Breaking):**
- Once HTTP/2 is supported, proxy will be removed
- API paths will change: `/api/push` → `/push`
- Migration period will be provided

### Routing Constraints

**Issue:** EdgeOne routing prevents mixing Edge Functions catch-all routes with Node Functions.

**Current Solution:** All Edge Functions under `/api/*` prefix.

**Impact:**
- API paths differ from original bark-server
- V1 API: `/api/:device_key/:title/:body` instead of `/:device_key/:title/:body`

## Security Considerations

### Authentication

- **Basic Auth**: Optional HTTP Basic Authentication for push endpoints
- **Proxy Secret**: Secure APNs proxy with shared secret
- **Device Key**: Random UUID-based device keys

### Data Protection

- **HTTPS Only**: All traffic encrypted in transit
- **KV Storage**: Encrypted at rest by EdgeOne
- **No Logging**: Device tokens not logged in production

### Best Practices

1. **Enable Authentication**: Set `AUTH_CREDENTIALS` for production
2. **Secure Proxy**: Set `APNS_PROXY_SECRET` to prevent unauthorized access
3. **Rotate Secrets**: Periodically rotate authentication credentials
4. **Monitor Access**: Review EdgeOne logs for suspicious activity

## Next Steps

- [Configuration Guide](../configuration/env.md) - Environment variable reference
- [API Reference](../api/README.md) - Complete API documentation
- [Contributing Guide](../../../AGENTS.md) - Development guidelines
- [Deployment Guide](../../../README.md#deployment) - Deployment instructions

## References

- [EdgeOne Pages Documentation](https://pages.edgeone.ai/)
- [EdgeOne KV Storage](https://pages.edgeone.ai/zh/document/kv-storage)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Bark iOS App](https://github.com/Finb/Bark)
- [bark-server](https://github.com/Finb/bark-server)
