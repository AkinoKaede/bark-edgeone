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

Choose your preferred deployment method:

### Method 1: Command Line Deployment (Recommended)

#### Step 1: Login to EdgeOne

```bash
# Login to your EdgeOne account
npx edgeone login
```

This will open a browser window for authentication.

#### Step 2: Link Project

```bash
# Link to existing project or create new one
npx edgeone link
```

Enter your project name. If the project doesn't exist, you'll be prompted to create it.

#### Step 3: Create and Bind KV Namespace

KV namespace must be configured via the web dashboard:

1. Go to **EdgeOne** → **Service Overview** (default page)
2. Navigate to **KV Storage** → **Create Namespace**
3. Name it `bark-kv` (or any name you prefer)
4. Go to **EdgeOne** → **Service Overview** → **Your Project Name**
5. Navigate to **KV Storage** → **Bind Namespace**
6. Select `bark-kv` and set binding name to `KV_STORAGE`
7. Save the binding

#### Step 4: Configure Environment Variables

```bash
# Generate a secure proxy secret (HIGHLY RECOMMENDED)
export PROXY_SECRET=$(openssl rand -hex 32)

# Set proxy secret (highly recommended for security)
npx edgeone pages env set APNS_PROXY_SECRET "$PROXY_SECRET"

# Optional: Set authentication credentials
npx edgeone pages env set AUTH_CREDENTIALS "admin:your-secure-password"

# Optional: Set batch push limit
npx edgeone pages env set MAX_BATCH_PUSH_COUNT "64"

# Optional: Configure custom APNs credentials (only if you have your own)
# Most users don't need these - default values work for Bark app
# npx edgeone pages env set APNS_TOPIC "me.fin.bark"
# npx edgeone pages env set APNS_KEY_ID "YOUR_KEY_ID"
# npx edgeone pages env set APNS_TEAM_ID "YOUR_TEAM_ID"
# npx edgeone pages env set APNS_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Important**: 
- **APNS_PROXY_SECRET** is highly recommended for securing the proxy endpoint
- APNs credentials (APNS_TOPIC, APNS_KEY_ID, etc.) are optional - most users don't need them
- See [docs/en/configuration/env.md](./docs/en/configuration/env.md) for complete documentation

#### Step 6: Deploy

- **GitHub Integration**: Push to your repository to trigger automatic deployment
- **Direct Upload**: Click **Deploy** and upload your built `dist` folder

#### Step 7: Test Your Deployment

```bash
# Health check
curl https://your-domain.edgeone.app/api/ping

# Expected response: {"message":"pong"}
```

---

### Method 2: Web Dashboard Deployment

#### Step 1: Fork Repository

1. Go to [https://github.com/AkinoKaede/bark-edgeone](https://github.com/AkinoKaede/bark-edgeone)
2. Click **Fork** button in the top-right corner
3. Fork the repository to your GitHub account

#### Step 2: Create Project and Connect GitHub

1. Go to [EdgeOne Pages Dashboard](https://console.cloud.tencent.com/edgeone/pages)
2. Click **Create Project**
3. Select **GitHub Integration**
4. Connect your GitHub account (if not already connected)
5. Select your forked `bark-edgeone` repository
6. Click **Deploy**

The build configuration is automatically loaded from `edgeone.json` in the repository.

#### Step 3: Create KV Namespace

1. Go to **EdgeOne** → **Service Overview** (default page)
2. Navigate to **KV Storage** → **Create Namespace**
3. Name it `bark-kv` (or any name you prefer)
4. Click **Create**

#### Step 4: Bind KV Namespace

1. Go to **EdgeOne** → **Service Overview** → **Your Project Name**
2. Navigate to **KV Storage** → **Bind Namespace**
3. Select `bark-kv` and set binding name to `KV_STORAGE`
4. Save the binding

#### Step 5: Configure Environment Variables

1. In your project dashboard, navigate to **Settings** → **Environment Variables**
2. Add the following variables:

**Highly Recommended**:
```
APNS_PROXY_SECRET = <generate using: openssl rand -hex 32>
```

**Optional Variables**:
```
AUTH_CREDENTIALS = admin:your-secure-password
MAX_BATCH_PUSH_COUNT = 64
```

**Custom APNs Credentials** (only if you have your own - most users don't need these):
```
APNS_TOPIC = me.fin.bark
APNS_KEY_ID = YOUR_KEY_ID
APNS_TEAM_ID = YOUR_TEAM_ID
APNS_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

3. Click **Save**

**Important**: 
- **APNS_PROXY_SECRET** is highly recommended for securing the proxy endpoint
- APNs credentials are optional - default values work for the Bark app
- See [docs/en/configuration/env.md](./docs/en/configuration/env.md) for complete documentation

#### Step 6: Deploy

Push to your forked repository to trigger automatic deployment.

#### Step 7: Test Your Deployment

1. Go to your project's **Deployments** page
2. Click on the latest deployment to view the URL
3. Test the health endpoint:

```bash
curl https://your-domain.edgeone.app/api/ping

# Expected response: {"message":"pong"}
```

---

### Post-Deployment Configuration

#### Custom Domain (Optional)

1. In your project page, navigate to **Domain Management**
2. Click **Add Custom Domain**
3. Enter your domain name
4. Configure DNS records as instructed
5. Wait for SSL certificate provisioning

#### Monitoring and Logs

- **Real-time Logs**: Navigate to **Logs** to view function execution logs
- **Analytics**: Navigate to **Analytics** to view request metrics
- **Alerts**: Configure alerts for errors and performance issues

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
├── docs/                    # Documentation
│   ├── en/                  # English documentation
│   │   └── configuration/   # Configuration guides
│   │       └── env.md       # Environment variables guide
│   └── zh-cn/               # Chinese documentation
│       └── configuration/   # Configuration guides
│           └── env.md       # Environment variables guide
└── AGENTS.md                # Development guidelines
```

## Contributing

Contributions are welcome! Please read [AGENTS.md](./AGENTS.md) for development guidelines.

## License

SPDX-License-Identifier: [Apache-2.0](./LICENSE)

## Acknowledgments

- [Bark](https://github.com/Finb/Bark)
- [Bark Server](https://github.com/Finb/bark-server)
