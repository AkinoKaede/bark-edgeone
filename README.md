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
BARK_AUTH_USER=admin
BARK_AUTH_PASSWORD=secret

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

### Health Checks

```bash
# Ping
GET /ping

# Health check
GET /healthz

# Server info
GET /info
```

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
