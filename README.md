# Bark EdgeOne

A Bark push notification server implementation for EdgeOne Edge Functions.

## Overview

This project ports the [Bark Server](https://github.com/Finb/bark-server) functionality to EdgeOne Pages Edge Functions, enabling distributed push notification delivery on edge nodes worldwide.

## Features

- ✅ APNs (Apple Push Notification Service) integration
- ✅ Device registration and management
- ✅ Single and batch push notifications
- ✅ RESTful API (V2) with V1 compatibility
- ✅ KV storage for device tokens
- ✅ JWT-based APNs authentication
- ✅ Edge deployment on 3,200+ global nodes

## Quick Start

### Prerequisites

- Node.js 18+
- EdgeOne Pages account
- Apple Developer account with APNs credentials

### Installation

```bash
# Install dependencies
npm install

# Install EdgeOne CLI
npm install -g edgeone

# Build the project
npm run build
```

### Local Development

```bash
# Start local development server
edgeone pages dev

# The server will be available at http://localhost:8788
```

### Configuration

Create environment variables in EdgeOne Pages dashboard:

```env
# APNs Configuration (Required)
APNS_PRIVATE_KEY=<your-p8-key-base64-encoded>
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_TOPIC=me.fin.bark

# Authentication (Optional)
# Multi-user authentication
# Format: username1:password1;username2:password2;username3:password3
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2

# Batch Push Limit (Optional)
MAX_BATCH_PUSH_COUNT=100
```

### KV Namespace Setup

1. Create a KV namespace in EdgeOne Pages dashboard
2. Bind it with the name `BARK_KV`
3. The application will use it to store device tokens

## API Documentation

### Register Device

```bash
POST /register
Content-Type: application/json

{
  "device_token": "your-apns-device-token",
  "device_key": "optional-custom-key"
}

# Response
{
  "code": 200,
  "message": "success",
  "data": {
    "device_key": "generated-or-provided-key",
    "device_token": "your-apns-device-token"
  },
  "timestamp": 1234567890
}
```

### Push Notification

#### V2 API (JSON)

```bash
POST /push
Content-Type: application/json

{
  "device_key": "your-device-key",
  "title": "Notification Title",
  "body": "Notification body text",
  "sound": "default",
  "badge": 1,
  "icon": "https://example.com/icon.png",
  "group": "notification-group",
  "url": "https://example.com"
}

# Response
{
  "code": 200,
  "message": "success",
  "timestamp": 1234567890
}
```

#### Batch Push

```bash
POST /push
Content-Type: application/json

{
  "device_keys": ["key1", "key2", "key3"],
  "title": "Batch Notification",
  "body": "Sent to multiple devices"
}

# Response
{
  "code": 200,
  "data": [
    { "code": 200, "device_key": "key1" },
    { "code": 200, "device_key": "key2" },
    { "code": 500, "device_key": "key3", "message": "Push failed" }
  ],
  "timestamp": 1234567890
}
```

#### V1 API (URL Path)

For backward compatibility with the original Bark server:

```bash
# Simple push with body only
GET /:device_key/:body

# Push with title and body
GET /:device_key/:title/:body

# Push with title, subtitle, and body
GET /:device_key/:title/:subtitle/:body

# With query parameters
GET /:device_key?title=Hello&body=World&sound=default

# POST with form data
POST /:device_key
Content-Type: application/x-www-form-urlencoded

title=Hello&body=World&sound=default
```

### Push Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `device_key` | string | Required - Device identifier |
| `device_keys` | array | For batch push (V2 only) |
| `title` | string | Notification title |
| `subtitle` | string | Notification subtitle |
| `body` | string | Notification content |
| `sound` | string | Sound file name (auto-appends .caf) |
| `badge` | number | App icon badge number |
| `icon` | string | Custom icon URL (iOS 15+) |
| `group` | string | Thread ID for grouping |
| `url` | string | URL to open on tap |
| `level` | string | active/timeSensitive/passive/critical |
| `call` | string | "1" for 30-second ringtone |
| `isArchive` | string | "1" to archive notification |
| `ciphertext` | string | Encrypted content |

### Health Checks

```bash
# Ping
GET /ping

# Health check
GET /healthz

# Server info
GET /info
```

## Authentication

Bark EdgeOne supports HTTP Basic Authentication with multi-user support to protect your endpoints.

### Configuration

Set the `AUTH_CREDENTIALS` environment variable with semicolon-separated credentials:

```env
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2
```

**Format**: `username1:password1;username2:password2;username3:password3`

### Protected Endpoints

When authentication is enabled, the following endpoints require Basic Auth:
- `/push` - Push notifications (V2 API)
- `/:device_key/:title/:body` - V1 API routes

### Auth-Free Endpoints

The following endpoints do NOT require authentication (always accessible):
- `/register` - Device registration
- `/ping` - Health check
- `/healthz` - Kubernetes-style health check
- `/info` - Server information

### Using Authentication

```bash
# Using curl with -u flag
curl -u admin:admin123 -X POST https://your-domain.com/push \
  -H "Content-Type: application/json" \
  -d '{"device_key":"test","title":"Hello","body":"World"}'

# Using Authorization header
curl -X POST https://your-domain.com/push \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"device_key":"test","title":"Hello","body":"World"}'

# V1 API with auth
curl -u admin:admin123 https://your-domain.com/test-key/Hello/World

# Auth-free endpoints (no credentials needed)
curl https://your-domain.com/ping
curl https://your-domain.com/register -d '{"device_token":"xxx"}'
```

### Security Features

- **Constant-time comparison**: Prevents timing attacks on password validation
- **Shared crypto utilities**: Both edge functions and node functions use the same secure comparison logic
- **Multi-user support**: Multiple users can access the API with different credentials

### Disabling Authentication

To disable authentication, simply don't set the `AUTH_CREDENTIALS` environment variable. The server will allow all requests without authentication.

## Deployment

### Using EdgeOne CLI

```bash
# Deploy to EdgeOne Pages
edgeone pages deploy
```

### Using GitHub Integration

1. Connect your GitHub repository to EdgeOne Pages
2. Push to the main branch
3. Automatic deployment will trigger

## Architecture

```
┌─────────────────────────────────────────────────┐
│           EdgeOne Edge Functions                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Push Handler  │  Register  │  Health     │  │
│  └───────────────────────────────────────────┘  │
│           │                │                     │
│  ┌────────┴────────┐  ┌────┴──────┐            │
│  │  APNs Client    │  │  KV Store │            │
│  │  (JWT Auth)     │  │  (Tokens) │            │
│  └─────────────────┘  └───────────┘            │
└─────────────────────────────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │  Apple APNs   │
    │   Servers     │
    └───────────────┘
```

## Project Structure

```
bark-edgeone/
├── edge-functions/          # EdgeOne function handlers
│   ├── push.ts              # POST /push (V2 API)
│   ├── register.ts          # POST /register, GET /register/:device_key
│   ├── ping.ts              # GET /ping
│   ├── healthz.ts           # GET /healthz
│   ├── info.ts              # GET /info
│   └── [[default]].ts       # Catch-all for V1 API (/:device_key/:body)
├── src/
│   ├── types/               # TypeScript type definitions
│   ├── database/            # Storage implementations
│   ├── apns/                # APNs client and utilities
│   ├── utils/               # Helper functions
│   └── handlers/            # Business logic handlers
├── CLAUDE.md                # Development guide
└── README.md                # This file
```

**Routing Strategy:**
- Specific routes (`push.ts`, `register.ts`, `ping.ts`) have highest priority
- Each route file can handle multiple paths by parsing the URL
- Catch-all route (`[[default]].ts`) handles V1 API compatibility for unmatched paths

## Development Guide

For detailed implementation guidelines, architecture decisions, and development tips, see [CLAUDE.md](./CLAUDE.md).

## Performance

- **Cold Start**: < 100ms
- **Average Response Time**: < 50ms
- **Global Coverage**: 3,200+ edge nodes
- **Scalability**: Auto-scaling on EdgeOne platform

## Limitations

- Code size: 5 MB max
- Request body: 1 MB max
- CPU time: 200 ms per request
- Storage: KV only (eventually consistent)

## Contributing

Contributions are welcome! Please read the development guide in CLAUDE.md before submitting pull requests.

## License

ISC

## Acknowledgments

- Original [Bark](https://github.com/Finb/Bark) iOS app by Finb
- [Bark Server](https://github.com/Finb/bark-server) by mritd and Finb
- EdgeOne Pages platform by Tencent

## Support

For issues and questions:
- Check [CLAUDE.md](./CLAUDE.md) for implementation details
- Review EdgeOne Edge Functions documentation
- Open an issue on GitHub

---

**Note**: This is a serverless implementation running on edge nodes. For traditional server deployment, use the original [bark-server](https://github.com/Finb/bark-server).
