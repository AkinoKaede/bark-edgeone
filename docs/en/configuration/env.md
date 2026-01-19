# Environment Variables Configuration Guide

## APNs Proxy Configuration

### ENABLE_APN_PROXY

**Description**: Enable or disable APNs HTTP/2 proxy

**Default**: `true` (enabled)

**Options**:
- `true` - Enable proxy (default)
- `false` - Disable proxy, connect to APNs directly using Fetch API

**Purpose**:
- EdgeOne Edge Functions may not support HTTP/2, requiring proxy through Node Functions
- Disabling the proxy will attempt direct connection to APNs, but may fail

**Example**:
```env
# Enable proxy (default, can be omitted)
ENABLE_APN_PROXY=true

# Disable proxy
ENABLE_APN_PROXY=false
```

---

### APNS_PROXY_URL

**Description**: URL of the APNs proxy

**Default**: Auto-generated based on request domain

**Auto-generation Rules**:
- If user accesses `https://example.com/push`
- Auto-generated proxy URL: `https://example.com/apns-proxy`

**Manual Configuration**:
```env
APNS_PROXY_URL=https://your-domain.com/apns-proxy
```

**Use Cases**:
1. **Not set (recommended)**: Auto-generate based on request domain, suitable for single-domain deployment
2. **Manual configuration**: Use a dedicated proxy server, or specify proxy for multi-domain deployment

**Example**:
```env
# Use custom domain proxy
APNS_PROXY_URL=https://apns-proxy.example.com/apns-proxy

# Use dedicated proxy server
APNS_PROXY_URL=https://proxy-server.com/apns-proxy
```

---

### APNS_PROXY_SECRET

**Description**: APNs proxy access secret (shared between Edge Functions and Node Functions)

**Default**: Empty (no validation)

**Purpose**:
- Edge Functions add `x-apns-proxy-auth` header when requesting proxy
- Node Functions validate this header (constant-time comparison)
- This header is not forwarded to Apple

**Example**:
```env
APNS_PROXY_SECRET=your-shared-secret
```

---

## Workflow

### Scenario 1: Default Configuration (Recommended)

```
Environment Variables: None

1. User accesses: https://bark.example.com/push
2. ENABLE_APN_PROXY defaults to true (proxy enabled)
3. APNS_PROXY_URL not set, auto-generated: https://bark.example.com/apns-proxy
4. Request forwarded to: https://bark.example.com/apns-proxy/3/device/xxx
5. Node Functions proxy forwards to APNs
```

### Scenario 2: Manual Proxy Configuration

```
Environment Variables:
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://apns.example.com/proxy

1. User accesses: https://bark.example.com/push
2. Use specified proxy: https://apns.example.com/proxy/3/device/xxx
3. Request forwarded to specified proxy server
```

### Scenario 3: Proxy Disabled

```
Environment Variables:
ENABLE_APN_PROXY=false

1. User accesses: https://bark.example.com/push
2. Direct connection using Fetch API: https://api.push.apple.com/3/device/xxx
3. May fail due to lack of HTTP/2 support
```

---

## APNs Configuration

### APNS_TOPIC

**Description**: APNs Topic (App Bundle ID)

**Default**: `me.fin.bark`

**Purpose**: Identifies your iOS application to APNs. Must match your app's Bundle ID.

**Example**:
```env
APNS_TOPIC=com.yourcompany.yourapp
```

---

### APNS_KEY_ID

**Description**: APNs Key ID from Apple Developer Portal

**Default**: `LH4T9V5U4R`

**Purpose**: Identifies the authentication key used for APNs token-based authentication.

**How to obtain**:
1. Go to Apple Developer Portal
2. Navigate to Certificates, Identifiers & Profiles
3. Create or view an APNs Auth Key
4. Copy the 10-character Key ID

**Example**:
```env
APNS_KEY_ID=ABC1234DEF
```

---

### APNS_TEAM_ID

**Description**: Apple Developer Team ID

**Default**: `5U8LBRXG3A`

**Purpose**: Identifies your Apple Developer Team for APNs authentication.

**How to obtain**:
1. Go to Apple Developer Portal
2. Navigate to Membership section
3. Copy your Team ID (10 characters)

**Example**:
```env
APNS_TEAM_ID=XYZ9876ABC
```

---

### APNS_PRIVATE_KEY

**Description**: APNs Private Key in P8 format

**Default**: Hardcoded key in config (should be overridden)

**Purpose**: Private key for APNs token-based authentication.

**Format**: PEM format with newlines escaped as `\n`

**How to obtain**:
1. Download the .p8 file from Apple Developer Portal
2. Convert newlines to `\n` for environment variable

**Example**:
```env
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----
```

**Security Note**: Never commit this key to version control. Use environment variables or secrets management.

---

### APNS_USE_SANDBOX

**Description**: Toggle between APNs production and sandbox environments

**Default**: `false` (production)

**Options**:
- `false` - Use production APNs server (`api.push.apple.com`)
- `true` - Use sandbox APNs server (`api.sandbox.push.apple.com`)

**Purpose**: 
- Use sandbox for development and testing with development builds
- Use production for App Store and TestFlight builds

**Example**:
```env
# Development/Testing
APNS_USE_SANDBOX=true

# Production
APNS_USE_SANDBOX=false
```

---

## Feature Flags

### ENABLE_REGISTER

**Description**: Enable or disable device registration endpoint

**Default**: `true` (enabled)

**Options**:
- `true` or `1` - Enable `/register` endpoint
- `false` or `0` - Disable `/register` endpoint (returns 403 Forbidden)

**Purpose**: 
- Control whether new devices can register
- Useful for limiting access in production or during maintenance

**Example**:
```env
# Enable registration (default)
ENABLE_REGISTER=true

# Disable registration
ENABLE_REGISTER=false
```

**Affected Endpoints**:
- `POST /register` - Device registration

---

### ENABLE_DEVICE_COUNT

**Description**: Enable device counting in `/info` endpoint

**Default**: `false` (disabled)

**Options**:
- `true` or `1` - Enable device count (performs KV list operation)
- `false` or `0` - Disable device count (returns `deviceCount: null`)

**Purpose**: 
- Show total registered device count in server info
- **Warning**: This performs an expensive KV list operation that may impact performance and incur costs

**Performance Impact**: 
- Enabling this will list all keys in the KV namespace on every `/info` request
- Not recommended for high-traffic deployments

**Example**:
```env
# Disable device count (recommended for production)
ENABLE_DEVICE_COUNT=false

# Enable device count (for monitoring/debugging)
ENABLE_DEVICE_COUNT=true
```

**Affected Endpoints**:
- `GET /info` - Server information

---

## Limits and Quotas

### MAX_BATCH_PUSH_COUNT

**Description**: Maximum number of devices per batch push request

**Default**: `64`

**Options**:
- Positive integer - Maximum devices allowed
- `-1` - Unlimited (not recommended)

**Purpose**: 
- Prevent abuse and resource exhaustion
- Control concurrent APNs connections

**Recommendations**:
- **Production**: `64` (balanced performance and resource usage)
- **High-traffic**: `32` (more conservative)
- **Low-traffic**: `128` (more permissive)

**Example**:
```env
# Recommended for production
MAX_BATCH_PUSH_COUNT=64

# Conservative limit
MAX_BATCH_PUSH_COUNT=32

# Unlimited (not recommended)
MAX_BATCH_PUSH_COUNT=-1
```

**Affected Endpoints**:
- `POST /push` - Batch push with multiple device keys

---

## Security and Authentication

### AUTH_CREDENTIALS

**Description**: Multi-user HTTP Basic Authentication credentials

**Default**: Empty (authentication disabled)

**Format**: `username1:password1;username2:password2;...`

**Purpose**: 
- Protect push endpoints with HTTP Basic Auth
- Support multiple users with different credentials

**Protected Endpoints** (when enabled):
- `POST /push` - Push notification
- `GET /:device_key/:title/:body` - V1 API push
- All V1 API routes

**Public Endpoints** (always accessible):
- `POST /register` - Device registration
- `GET /ping` - Health check
- `GET /healthz` - Kubernetes health check
- `GET /info` - Server information

**Example**:
```env
# Single user
AUTH_CREDENTIALS=admin:secretpassword

# Multiple users
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2

# Disable authentication (default)
# AUTH_CREDENTIALS=
```

**Security Notes**:
- Use strong passwords
- Consider using HTTPS to protect credentials in transit
- Credentials are stored in plain text in environment variables

---

## Logging

### LOG_LEVEL

**Description**: Set logging verbosity level

**Default**: `INFO`

**Options**:
- `DEBUG` - Verbose logging (all messages)
- `INFO` - Informational messages and above
- `WARN` - Warnings and errors only
- `ERROR` - Errors only

**Purpose**: 
- Control log output verbosity
- Useful for debugging or reducing log noise in production

**Example**:
```env
# Development
LOG_LEVEL=DEBUG

# Production (default)
LOG_LEVEL=INFO

# Production (quiet)
LOG_LEVEL=WARN
```

**Log Output**: Logs are written to console and visible in EdgeOne Pages logs.

---

## Complete Configuration Reference

### All Environment Variables

```env
# ============================================
# APNs Proxy Configuration
# ============================================

# Enable APNs HTTP/2 proxy (default: true)
ENABLE_APN_PROXY=true

# APNs proxy URL (default: auto-generated)
# APNS_PROXY_URL=https://your-domain.com/apns-proxy

# Proxy authentication secret (optional)
# APNS_PROXY_SECRET=your-shared-secret

# ============================================
# APNs Configuration
# ============================================

# APNs Topic (App Bundle ID)
APNS_TOPIC=me.fin.bark

# APNs Key ID (from Apple Developer Portal)
APNS_KEY_ID=LH4T9V5U4R

# Apple Developer Team ID
APNS_TEAM_ID=5U8LBRXG3A

# APNs Private Key (P8 format, newlines as \n)
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# Use sandbox environment (default: false)
APNS_USE_SANDBOX=false

# ============================================
# Feature Flags
# ============================================

# Enable device registration endpoint (default: true)
ENABLE_REGISTER=true

# Enable device count in /info endpoint (default: false)
# Warning: Expensive KV operation
ENABLE_DEVICE_COUNT=false

# ============================================
# Limits and Quotas
# ============================================

# Maximum devices per batch push (default: 64, -1 for unlimited)
MAX_BATCH_PUSH_COUNT=64

# ============================================
# Security and Authentication
# ============================================

# HTTP Basic Auth credentials (optional)
# Format: username1:password1;username2:password2
# AUTH_CREDENTIALS=admin:admin123;user1:pass1

# ============================================
# Logging
# ============================================

# Log level: DEBUG, INFO, WARN, ERROR (default: INFO)
LOG_LEVEL=INFO
```

---

## Recommended Configuration

### Production Environment (Recommended)

```env
# APNs Configuration (required - replace with your values)
APNS_TOPIC=com.yourcompany.yourapp
APNS_KEY_ID=YOUR_KEY_ID
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# APNs Proxy (use defaults)
ENABLE_APN_PROXY=true
# APNS_PROXY_URL is auto-generated

# Limits
MAX_BATCH_PUSH_COUNT=64

# Feature Flags
ENABLE_REGISTER=true
ENABLE_DEVICE_COUNT=false

# Logging
LOG_LEVEL=INFO

# Security (optional but recommended)
AUTH_CREDENTIALS=admin:your-secure-password
```

### Testing/Development Environment

```env
# APNs Configuration (use sandbox)
APNS_TOPIC=com.yourcompany.yourapp
APNS_KEY_ID=YOUR_KEY_ID
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_USE_SANDBOX=true

# APNs Proxy (use defaults)
ENABLE_APN_PROXY=true

# Limits (more permissive for testing)
MAX_BATCH_PUSH_COUNT=128

# Feature Flags
ENABLE_REGISTER=true
ENABLE_DEVICE_COUNT=true

# Logging (verbose for debugging)
LOG_LEVEL=DEBUG

# Security (optional for testing)
# AUTH_CREDENTIALS=
```

### Minimal Configuration

```env
# Only required variables (uses all defaults)
APNS_TOPIC=com.yourcompany.yourapp
APNS_KEY_ID=YOUR_KEY_ID
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

---

## Troubleshooting

### Issue: Proxy Connection Failed

**Check**:
1. Confirm Node Functions is deployed and route is set to `/apns-proxy`
2. Verify `APNS_PROXY_URL` is correct (if manually configured)
3. Check Node Functions logs

### Issue: Auto-generated Proxy URL is Incorrect

**Solution**: Manually set `APNS_PROXY_URL`

```env
APNS_PROXY_URL=https://correct-domain.com/apns-proxy
```

### Issue: Push Fails After Disabling Proxy

**Cause**: Edge Functions Fetch API may not support HTTP/2

**Solution**: Enable proxy

```env
ENABLE_APN_PROXY=true
```
