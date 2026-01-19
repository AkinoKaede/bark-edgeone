# 环境变量配置指南

## APNs 代理配置

### ENABLE_APN_PROXY

**描述**：是否启用 APNs HTTP/2 代理

**默认值**：`true`（启用）

**可选值**：
- `true` - 启用代理（默认）
- `false` - 禁用代理，直接使用 Fetch API 连接 APNs

**用途**：
- EdgeOne Edge Functions 可能不支持 HTTP/2，需要通过 Node Functions 代理
- 禁用代理后会直接连接 APNs，但可能失败

**示例**：
```env
# 启用代理（默认，可以不设置）
ENABLE_APN_PROXY=true

# 禁用代理
ENABLE_APN_PROXY=false
```

---

### APNS_PROXY_URL

**描述**：APNs 代理的 URL

**默认值**：自动根据请求域名生成

**自动生成规则**：
- 如果用户访问 `https://example.com/push`
- 自动生成代理 URL：`https://example.com/apns-proxy`

**手动设置**：
```env
APNS_PROXY_URL=https://your-domain.com/apns-proxy
```

**使用场景**：
1. **不设置（推荐）**：自动根据请求域名生成，适合单域名部署
2. **手动设置**：使用独立的代理服务器，或多域名部署时指定代理

**示例**：
```env
# 使用自定义域名的代理
APNS_PROXY_URL=https://apns-proxy.example.com/apns-proxy

# 使用独立的代理服务器
APNS_PROXY_URL=https://proxy-server.com/apns-proxy
```

---

### APNS_PROXY_SECRET

**描述**：APNs 代理访问密钥（Edge Functions 与 Node Functions 共用）

**默认值**：空（不校验）

**用途**：
- Edge Functions 会在请求代理时添加 `x-apns-proxy-auth` 头
- Node Functions 会验证该头（常数时间比较）
- 该头不会转发给 Apple

**示例**：
```env
APNS_PROXY_SECRET=your-shared-secret
```

---

## 工作流程

### 场景 1：默认配置（推荐）

```
环境变量：无

1. 用户访问：https://bark.example.com/push
2. ENABLE_APN_PROXY 默认为 true（启用代理）
3. APNS_PROXY_URL 未设置，自动生成：https://bark.example.com/apns-proxy
4. 请求转发到：https://bark.example.com/apns-proxy/3/device/xxx
5. Node Functions 代理转发到 APNs
```

### 场景 2：手动指定代理

```
环境变量：
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://apns.example.com/proxy

1. 用户访问：https://bark.example.com/push
2. 使用指定的代理：https://apns.example.com/proxy/3/device/xxx
3. 请求转发到指定的代理服务器
```

### 场景 3：禁用代理

```
环境变量：
ENABLE_APN_PROXY=false

1. 用户访问：https://bark.example.com/push
2. 直接使用 Fetch API 连接：https://api.push.apple.com/3/device/xxx
3. 可能因为不支持 HTTP/2 而失败
```

---

## 其他环境变量

### APNs 配置

```env
# APNs Topic (App Bundle ID)
APNS_TOPIC=me.fin.bark

# APNs Key ID
APNS_KEY_ID=LH4T9V5U4R

# Apple Developer Team ID
APNS_TEAM_ID=5U8LBRXG3A

# APNs Private Key (P8 format)
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# 使用沙盒环境（测试）
APNS_USE_SANDBOX=false
```

### 批量推送限制

```env
# 单次批量推送的最大数量（-1 表示无限制）
MAX_BATCH_PUSH_COUNT=-1
```

### 访问认证（可选）

```env
BARK_AUTH_USER=admin
BARK_AUTH_PASSWORD=secret
```

---

## 推荐配置

### 生产环境（推荐）

```env
# APNs 代理：默认启用，自动生成 URL
# （不需要设置 ENABLE_APN_PROXY 和 APNS_PROXY_URL）

# APNs 配置：使用默认值
# （如需自定义，可以设置 APNS_TOPIC、APNS_KEY_ID 等）

# 批量推送：不限制
MAX_BATCH_PUSH_COUNT=-1
```

### 测试环境

```env
# 使用沙盒环境
APNS_USE_SANDBOX=true

# 其他配置同生产环境
```

### 调试环境（禁用代理）

```env
# 禁用代理，直接连接 APNs（可能失败）
ENABLE_APN_PROXY=false

# 使用沙盒环境
APNS_USE_SANDBOX=true
```

---

## 故障排查

### 问题：代理无法连接

**检查**：
1. 确认 Node Functions 已部署并路由设置为 `/apns-proxy`
2. 检查 `APNS_PROXY_URL` 是否正确（如果手动设置）
3. 查看 Node Functions 日志

### 问题：自动生成的代理 URL 不正确

**解决**：手动设置 `APNS_PROXY_URL`

```env
APNS_PROXY_URL=https://correct-domain.com/apns-proxy
```

### 问题：禁用代理后无法推送

**原因**：Edge Functions 的 Fetch API 可能不支持 HTTP/2

**解决**：启用代理

```env
ENABLE_APN_PROXY=true
```
