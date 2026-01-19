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

**推荐**：**强烈推荐**在生产环境中设置以保护代理端点

**用途**：
- Edge Functions 会在请求代理时添加 `x-apns-proxy-auth` 头
- Node Functions 会验证该头（常数时间比较）
- 该头不会转发给 Apple
- 防止未经授权访问您的 APNs 代理

**安全影响**：
- 不设置此密钥，任何人都可以使用您的代理端点
- 设置此密钥后，只有带有正确头的请求才能访问代理

**示例**：
```env
# 生成安全密钥
APNS_PROXY_SECRET=$(openssl rand -hex 32)

# 或手动设置
APNS_PROXY_SECRET=your-shared-secret
```

**最佳实践**：在生产环境中始终设置此项。

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

## APNs 配置

**注意**：这些变量对大多数用户来说是**可选的**。默认值适用于官方 Bark iOS 应用。仅当您有自己的 APNs 凭据时才需要配置这些。

### APNS_TOPIC

**描述**：APNs Topic（App Bundle ID）

**默认值**：`me.fin.bark`

**必需**：否（默认值适用于 Bark 应用）

**用途**：向 APNs 标识您的 iOS 应用程序。必须与您的应用程序的 Bundle ID 匹配。

**何时自定义**：仅当您使用具有自己 Bundle ID 的自定义 iOS 应用时。

**示例**：
```env
APNS_TOPIC=com.yourcompany.yourapp
```

---

### APNS_KEY_ID

**描述**：从 Apple Developer Portal 获取的 APNs Key ID

**默认值**：`LH4T9V5U4R`

**必需**：否（默认值适用于 Bark 应用）

**用途**：标识用于 APNs 基于令牌的身份验证的认证密钥。

**何时自定义**：仅当您有自己的 APNs 认证密钥时。

**如何获取**：
1. 前往 Apple Developer Portal
2. 导航到 Certificates, Identifiers & Profiles
3. 创建或查看 APNs Auth Key
4. 复制 10 个字符的 Key ID

**示例**：
```env
APNS_KEY_ID=ABC1234DEF
```

---

### APNS_TEAM_ID

**描述**：Apple Developer Team ID

**默认值**：`5U8LBRXG3A`

**必需**：否（默认值适用于 Bark 应用）

**用途**：标识您的 Apple Developer Team 以进行 APNs 身份验证。

**何时自定义**：仅当您有自己的 Apple Developer 账号时。

**如何获取**：
1. 前往 Apple Developer Portal
2. 导航到 Membership 部分
3. 复制您的 Team ID（10 个字符）

**示例**：
```env
APNS_TEAM_ID=XYZ9876ABC
```

---

### APNS_PRIVATE_KEY

**描述**：P8 格式的 APNs 私钥

**默认值**：配置中的硬编码密钥（适用于 Bark 应用）

**必需**：否（默认值适用于 Bark 应用）

**用途**：用于 APNs 基于令牌的身份验证的私钥。

**何时自定义**：仅当您有自己的 APNs 认证密钥时。

**格式**：PEM 格式，换行符转义为 `\n`

**如何获取**：
1. 从 Apple Developer Portal 下载 .p8 文件
2. 将换行符转换为 `\n` 以用于环境变量

**示例**：
```env
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----
```

**安全提示**：切勿将此密钥提交到版本控制。使用环境变量或密钥管理。

---

### APNS_USE_SANDBOX

**描述**：在 APNs 生产环境和沙盒环境之间切换

**默认值**：`false`（生产环境）

**必需**：否

**可选值**：
- `false` - 使用生产 APNs 服务器（`api.push.apple.com`）
- `true` - 使用沙盒 APNs 服务器（`api.sandbox.push.apple.com`）

**用途**：
- 使用沙盒进行开发和测试（开发版本）
- 使用生产环境用于 App Store 和 TestFlight 版本

**何时自定义**：仅当使用自定义应用的开发版本进行测试时。

**示例**：
```env
# 开发/测试
APNS_USE_SANDBOX=true

# 生产环境
APNS_USE_SANDBOX=false
```

---

## 功能开关

### ENABLE_REGISTER

**描述**：启用或禁用设备注册端点

**默认值**：`true`（启用）

**可选值**：
- `true` 或 `1` - 启用 `/register` 端点
- `false` 或 `0` - 禁用 `/register` 端点（返回 403 Forbidden）

**用途**：
- 控制是否允许新设备注册
- 在生产环境或维护期间限制访问时很有用

**示例**：
```env
# 启用注册（默认）
ENABLE_REGISTER=true

# 禁用注册
ENABLE_REGISTER=false
```

**影响的端点**：
- `POST /register` - 设备注册

---

### ENABLE_DEVICE_COUNT

**描述**：在 `/info` 端点中启用设备计数

**默认值**：`false`（禁用）

**可选值**：
- `true` 或 `1` - 启用设备计数（执行 KV 列表操作）
- `false` 或 `0` - 禁用设备计数（返回 `deviceCount: null`）

**用途**：
- 在服务器信息中显示已注册设备总数
- **警告**：这会执行昂贵的 KV 列表操作，可能影响性能并产生费用

**性能影响**：
- 启用此功能将在每次 `/info` 请求时列出 KV 命名空间中的所有键
- 不建议用于高流量部署

**示例**：
```env
# 禁用设备计数（生产环境推荐）
ENABLE_DEVICE_COUNT=false

# 启用设备计数（用于监控/调试）
ENABLE_DEVICE_COUNT=true
```

**影响的端点**：
- `GET /info` - 服务器信息

---

## 限制和配额

### MAX_BATCH_PUSH_COUNT

**描述**：每次批量推送请求的最大设备数

**默认值**：`64`

**可选值**：
- 正整数 - 允许的最大设备数
- `-1` - 无限制（不推荐）

**用途**：
- 防止滥用和资源耗尽
- 控制并发 APNs 连接

**建议**：
- **生产环境**：`64`（平衡性能和资源使用）
- **高流量**：`32`（更保守）
- **低流量**：`128`（更宽松）

**示例**：
```env
# 生产环境推荐
MAX_BATCH_PUSH_COUNT=64

# 保守限制
MAX_BATCH_PUSH_COUNT=32

# 无限制（不推荐）
MAX_BATCH_PUSH_COUNT=-1
```

**影响的端点**：
- `POST /push` - 多设备密钥批量推送

---

## 安全和认证

### AUTH_CREDENTIALS

**描述**：多用户 HTTP Basic Authentication 凭据

**默认值**：空（禁用认证）

**格式**：`username1:password1;username2:password2;...`

**用途**：
- 使用 HTTP Basic Auth 保护推送端点
- 支持具有不同凭据的多个用户

**受保护的端点**（启用时）：
- `POST /push` - 推送通知
- `GET /:device_key/:title/:body` - V1 API 推送
- 所有 V1 API 路由

**公开端点**（始终可访问）：
- `POST /register` - 设备注册
- `GET /ping` - 健康检查
- `GET /healthz` - Kubernetes 健康检查
- `GET /info` - 服务器信息

**示例**：
```env
# 单用户
AUTH_CREDENTIALS=admin:secretpassword

# 多用户
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2

# 禁用认证（默认）
# AUTH_CREDENTIALS=
```

**安全提示**：
- 使用强密码
- 考虑使用 HTTPS 保护传输中的凭据
- 凭据以明文形式存储在环境变量中

---

## 日志记录

### LOG_LEVEL

**描述**：设置日志详细程度级别

**默认值**：`INFO`

**可选值**：
- `DEBUG` - 详细日志（所有消息）
- `INFO` - 信息性消息及以上
- `WARN` - 仅警告和错误
- `ERROR` - 仅错误

**用途**：
- 控制日志输出详细程度
- 用于调试或减少生产环境中的日志噪音

**示例**：
```env
# 开发环境
LOG_LEVEL=DEBUG

# 生产环境（默认）
LOG_LEVEL=INFO

# 生产环境（安静）
LOG_LEVEL=WARN
```

**日志输出**：日志写入控制台，可在 EdgeOne Pages 日志中查看。

---

## 完整配置参考

### 所有环境变量

```env
# ============================================
# APNs 代理配置
# ============================================

# 启用 APNs HTTP/2 代理（默认：true）
ENABLE_APN_PROXY=true

# APNs 代理 URL（默认：自动生成）
# APNS_PROXY_URL=https://your-domain.com/apns-proxy

# 代理认证密钥（可选）
APNS_PROXY_SECRET=<使用以下命令生成：openssl rand -hex 32>

# ============================================
# APNs 配置（可选 - 大多数用户不需要这些）
# ============================================

# APNs Topic（App Bundle ID）- 默认值适用于 Bark 应用
# APNS_TOPIC=me.fin.bark

# APNs Key ID（从 Apple Developer Portal 获取）- 默认值适用于 Bark 应用
# APNS_KEY_ID=LH4T9V5U4R

# Apple Developer Team ID - 默认值适用于 Bark 应用
# APNS_TEAM_ID=5U8LBRXG3A

# APNs 私钥（P8 格式，换行符为 \n）- 默认值适用于 Bark 应用
# APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# 使用沙盒环境（默认：false）
# APNS_USE_SANDBOX=false

# ============================================
# 功能开关
# ============================================

# 启用设备注册端点（默认：true）
ENABLE_REGISTER=true

# 在 /info 端点中启用设备计数（默认：false）
# 警告：昂贵的 KV 操作
ENABLE_DEVICE_COUNT=false

# ============================================
# 限制和配额
# ============================================

# 每次批量推送的最大设备数（默认：64，-1 表示无限制）
MAX_BATCH_PUSH_COUNT=64

# ============================================
# 安全和认证
# ============================================

# HTTP Basic Auth 凭据（可选）
# 格式：username1:password1;username2:password2
# AUTH_CREDENTIALS=admin:admin123;user1:pass1

# ============================================
# 日志记录
# ============================================

# 日志级别：DEBUG、INFO、WARN、ERROR（默认：INFO）
LOG_LEVEL=INFO
```

---

## 推荐配置

### 生产环境（推荐）

```env
# 安全（强烈推荐）
APNS_PROXY_SECRET=<使用以下命令生成：openssl rand -hex 32>

# APNs 代理（使用默认值）
ENABLE_APN_PROXY=true
# APNS_PROXY_URL 自动生成

# 限制
MAX_BATCH_PUSH_COUNT=64

# 功能开关
ENABLE_REGISTER=true
ENABLE_DEVICE_COUNT=false

# 日志记录
LOG_LEVEL=INFO

# 认证（可选）
# AUTH_CREDENTIALS=admin:your-secure-password

# APNs 配置（可选 - 仅当您有自定义凭据时）
# APNS_TOPIC=com.yourcompany.yourapp
# APNS_KEY_ID=YOUR_KEY_ID
# APNS_TEAM_ID=YOUR_TEAM_ID
# APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

### 测试/开发环境

```env
# 安全（强烈推荐）
APNS_PROXY_SECRET=<使用以下命令生成：openssl rand -hex 32>

# APNs 代理（使用默认值）
ENABLE_APN_PROXY=true

# 限制（测试时更宽松）
MAX_BATCH_PUSH_COUNT=128

# 功能开关
ENABLE_REGISTER=true
ENABLE_DEVICE_COUNT=true

# 日志记录（调试时详细）
LOG_LEVEL=DEBUG

# 认证（测试时可选）
# AUTH_CREDENTIALS=

# APNs 配置（可选 - 测试自定义应用时使用沙盒）
# APNS_USE_SANDBOX=true
# APNS_TOPIC=com.yourcompany.yourapp
# APNS_KEY_ID=YOUR_KEY_ID
# APNS_TEAM_ID=YOUR_TEAM_ID
# APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

### 最小配置

```env
# 仅设置代理密钥以确保安全（强烈推荐）
APNS_PROXY_SECRET=<使用以下命令生成：openssl rand -hex 32>

# 其他所有内容使用默认值
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
