# Bark EdgeOne

[简体中文](./README_ZH_CN.md)

A Bark push notification server implementation for EdgeOne Pages Edge Functions, enabling distributed push notification delivery on edge nodes worldwide.

## Quick Start

### Prerequisites

- Node.js 18+
- EdgeOne Pages account

### Installation

```bash
# Clone the repository
git clone https://github.com/AkinoKaede/bark-edgeone.git
cd bark-edgeone

# Install dependencies
npm install
```

## Deployment

### Step 1: Configure Environment Variables

You can set environment variables using the EdgeOne CLI or the dashboard.

#### Using EdgeOne CLI (Recommended)

```bash
# Generate a secure proxy secret
export PROXY_SECRET=$(openssl rand -hex 32)

# Set environment variables
# APNs Proxy Secret Configuration (recommended)
npx edgeone pages env set APNS_PROXY_SECRET "$PROXY_SECRET"
# Authentication (optional)
npx edgeone pages env set AUTH_CREDENTIALS "admin:admin123;user1:pass1"
```

#### Using EdgeOne Pages Dashboard

Navigate to your project settings and add the following environment variables:

#### Optional Variables

```env
# APNs Proxy Secret Configuration (recommended)
APNS_PROXY_SECRET=your-shared-secret     # Proxy authentication secret

# Authentication (optional)
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2
```

**Generate Secure Proxy Secret**:
```bash
# Generate a random 32-byte hex string
openssl rand -hex 32
```

**Environment Variable Details**: See [ENV.md](./ENV.md) for complete documentation.

### Step 2: Create KV Namespace

1. In EdgeOne Pages dashboard, navigate to **KV Storage**
2. Create a new KV namespace (e.g., `bark-kv`)
3. Bind it to your project with the name `KV_STORAGE`

### Step 3: Deploy to EdgeOne Pages

#### Option A: Using EdgeOne CLI

```bash
# Login to EdgeOne
npx edgeone login

# Deploy
npx edgeone pages deploy
```

#### Option B: Using GitHub Integration

1. Push your code to GitHub
2. In EdgeOne Pages dashboard, connect your repository
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy automatically on push

### Step 4: Test Your Deployment

```bash
# Health check
curl https://your-domain.com/api/ping
```

## Known Issues

### HTTP/2 Proxy Requirement

**Issue**: EdgeOne Edge Functions Runtime currently does not support HTTP/2 in the `fetch` API, which is required by Apple Push Notification service (APNs).

**Current Solution**: 
- We use **Node Functions** as an HTTP/2 reverse proxy (`/apns-proxy`)
- Edge Functions forward APNs requests to the Node Functions proxy
- The proxy handles HTTP/2 communication with Apple's servers

**Routing Limitation**:
- Due to EdgeOne routing constraints, all Edge Functions are placed under `/api/*`
- This prevents conflicts between Edge Functions catch-all routes and Node Functions

**Future Changes** (Breaking):
- Once EdgeOne Edge Functions Runtime supports HTTP/2 in `fetch`:
  - The Node Functions proxy will be removed
  - API paths will be moved from `/api/*` to `/*` (breaking change)
  - Example: `/api/push` → `/push`, `/api/register` → `/register`

**Migration Plan**:
- When HTTP/2 support is added, we will:
  1. Announce the breaking change with a migration period
  2. Provide redirect rules for backward compatibility
  3. Update documentation with new endpoints

**Workaround for Testing**:
```env
# Disable proxy (may fail due to HTTP/2 requirement)
ENABLE_APN_PROXY=false
```

## Local Development

```bash
# Start local development server
npx edgeone pages dev

# Server will be available at http://localhost:8088
```

## Project Structure

```
bark-edgeone/
├── edge-functions/          # EdgeOne Edge Functions
│   └── api/                 # All API endpoints under /api
│       ├── push.ts          # POST /api/push
│       ├── register/        # /api/register/*
│       ├── ping.ts          # GET /api/ping
│       ├── healthz.ts       # GET /api/healthz
│       ├── info.ts          # GET /api/info
│       └── [[default]].ts   # V1 API catch-all
├── node-functions/          # Node.js Functions
│   └── apns-proxy/          # HTTP/2 proxy for APNs
├── src/
│   ├── apns/                # APNs client and utilities
│   ├── handlers/            # Business logic handlers
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
├── ENV.md                   # Environment variables guide
└── AGENTS.md                # Development guidelines
```

## Contributing

Contributions are welcome! Please read [AGENTS.md](./AGENTS.md) for development guidelines.

## License

ISC

## Acknowledgments

- [Bark](https://github.com/Finb/Bark)
- [Bark Server](https://github.com/Finb/bark-server)
