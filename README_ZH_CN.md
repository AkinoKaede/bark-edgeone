# Bark EdgeOne

[English Documentation](./README.md)

基于 EdgeOne Pages Edge Functions 的 Bark 推送通知服务器实现，可在全球边缘节点上分布式部署推送通知服务。

## 快速开始

### 前置要求

- Node.js 18+
- EdgeOne Pages 账号

### 安装

```bash
# 克隆仓库
git clone https://github.com/AkinoKaede/bark-edgeone.git
cd bark-edgeone

# 安装依赖
npm install
```

## 部署步骤

选择您喜欢的部署方式：

### 方式 1：命令行部署（推荐）

#### 步骤 1：登录 EdgeOne

```bash
# 登录到您的 EdgeOne 账号
npx edgeone login
```

这将打开浏览器窗口进行身份验证。

#### 步骤 2：链接项目

```bash
# 链接到现有项目或创建新项目
npx edgeone link
```

输入您的项目名称。如果项目不存在，系统会提示您创建。

#### 步骤 3：创建和绑定 KV 命名空间

KV 命名空间必须通过网页控制台配置：

1. 前往 **EdgeOne** → **服务总览**（默认页面）
2. 导航到 **KV 存储** → **创建命名空间**
3. 命名为 `bark-kv`（或您喜欢的任何名称）
4. 前往 **EdgeOne** → **服务总览** → **您的项目名称**
5. 导航到 **KV 存储** → **绑定命名空间**
6. 选择 `bark-kv` 并设置绑定名称为 `KV_STORAGE`
7. 保存绑定

#### 步骤 4：配置环境变量

```bash
# 生成安全的代理密钥（强烈推荐）
export PROXY_SECRET=$(openssl rand -hex 32)

# 设置代理密钥（强烈推荐用于安全）
npx edgeone pages env set APNS_PROXY_SECRET "$PROXY_SECRET"

# 可选：设置访问认证凭据
npx edgeone pages env set AUTH_CREDENTIALS "admin:your-secure-password"

# 可选：设置批量推送限制
npx edgeone pages env set MAX_BATCH_PUSH_COUNT "64"

# 可选：配置自定义 APNs 凭据（仅当您有自己的凭据时）
# 大多数用户不需要这些 - 默认值适用于 Bark 应用
# npx edgeone pages env set APNS_TOPIC "me.fin.bark"
# npx edgeone pages env set APNS_KEY_ID "YOUR_KEY_ID"
# npx edgeone pages env set APNS_TEAM_ID "YOUR_TEAM_ID"
# npx edgeone pages env set APNS_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**重要提示**：
- **APNS_PROXY_SECRET** 强烈推荐用于保护代理端点
- APNs 凭据（APNS_TOPIC、APNS_KEY_ID 等）是可选的 - 大多数用户不需要它们
- 查看 [docs/zh-cn/configuration/env.md](./docs/zh-cn/configuration/env.md) 获取完整文档

#### 步骤 6：部署

- **GitHub 集成**：推送到您的仓库以触发自动部署
- **直接上传**：点击**部署**并上传您构建的 `dist` 文件夹

#### 步骤 7：测试部署

```bash
# 健康检查
curl https://your-domain.edgeone.app/api/ping

# 预期响应：{"message":"pong"}
```

---

### 方式 2：网页控制台部署

#### 步骤 1：Fork 仓库

1. 前往 [https://github.com/AkinoKaede/bark-edgeone](https://github.com/AkinoKaede/bark-edgeone)
2. 点击右上角的 **Fork** 按钮
3. 将仓库 Fork 到您的 GitHub 账号

#### 步骤 2：创建项目并连接 GitHub

1. 前往 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 点击**创建项目**
3. 选择 **GitHub 集成**
4. 连接您的 GitHub 账号（如果尚未连接）
5. 选择您 Fork 的 `bark-edgeone` 仓库
6. 点击**部署**

构建配置将自动从仓库中的 `edgeone.json` 加载。

#### 步骤 3：创建 KV 命名空间

1. 前往 **EdgeOne** → **服务总览**（默认页面）
2. 导航到 **KV 存储** → **创建命名空间**
3. 命名为 `bark-kv`（或您喜欢的任何名称）
4. 点击**创建**

#### 步骤 4：绑定 KV 命名空间

1. 前往 **EdgeOne** → **服务总览** → **您的项目名称**
2. 导航到 **KV 存储** → **绑定命名空间**
3. 选择 `bark-kv` 并设置绑定名称为 `KV_STORAGE`
4. 保存绑定

#### 步骤 5：配置环境变量

1. 在项目控制台，导航到**设置** → **环境变量**
2. 添加以下变量：

**强烈推荐**：
```
APNS_PROXY_SECRET = <使用以下命令生成：openssl rand -hex 32>
```

**可选变量**：
```
AUTH_CREDENTIALS = admin:your-secure-password
MAX_BATCH_PUSH_COUNT = 64
```

**自定义 APNs 凭据**（仅当您有自己的凭据时 - 大多数用户不需要）：
```
APNS_TOPIC = me.fin.bark
APNS_KEY_ID = YOUR_KEY_ID
APNS_TEAM_ID = YOUR_TEAM_ID
APNS_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

3. 点击**保存**

**重要提示**：
- **APNS_PROXY_SECRET** 强烈推荐用于保护代理端点
- APNs 凭据是可选的 - 默认值适用于 Bark 应用
- 查看 [docs/zh-cn/configuration/env.md](./docs/zh-cn/configuration/env.md) 获取完整文档

#### 步骤 6：部署

推送到您 Fork 的仓库以触发自动部署。

#### 步骤 7：测试部署

1. 前往项目的**部署**页面
2. 点击最新的部署以查看 URL
3. 测试健康检查端点：

```bash
curl https://your-domain.edgeone.app/api/ping

# 预期响应：{"message":"pong"}
```

---

### 部署后配置

#### 自定义域名（可选）

1. 在项目页面，导航到**域名管理**
2. 点击**添加自定义域名**
3. 输入您的域名
4. 按照说明配置 DNS 记录
5. 等待 SSL 证书配置完成

#### 监控和日志

- **实时日志**：导航到**日志**查看函数执行日志
- **分析**：导航到**分析**查看请求指标
- **告警**：配置错误和性能问题的告警

## 已知问题

### HTTP/2 代理需求

**问题**：EdgeOne Edge Functions Runtime 目前的 `fetch` API 不支持 HTTP/2，而 Apple Push Notification service (APNs) 需要 HTTP/2。

**当前解决方案**：
- 使用 **Node Functions** 作为 HTTP/2 反向代理（`/apns-proxy`）
- Edge Functions 将 APNs 请求转发到 Node Functions 代理
- 代理处理与 Apple 服务器的 HTTP/2 通信

**路由限制**：
- 由于 EdgeOne 路由约束，所有 Edge Functions 放置在 `/api/*` 下
- 这避免了 Edge Functions catch-all 路由与 Node Functions 的冲突

**未来变更**（破坏性）：
- 一旦 EdgeOne Edge Functions Runtime 的 `fetch` 支持 HTTP/2：
  - Node Functions 代理将被移除
  - API 路径将从 `/api/*` 迁移到 `/*`（破坏性变更）
  - 示例：`/api/push` → `/push`，`/api/register` → `/register`

**迁移计划**：
- 当 HTTP/2 支持添加后，我们将：
  1. 提前公告破坏性变更并给予迁移期
  2. 提供重定向规则以保持向后兼容
  3. 更新文档说明新端点

## 本地开发

```bash
# 启动本地开发服务器
npx edgeone pages dev

# 服务器将在 http://localhost:8088 运行
```

## 项目结构

```
bark-edgeone/
├── edge-functions/          # EdgeOne Edge Functions
│   └── api/                 # 所有 API 端点在 /api 下
│       ├── push.ts          # POST /api/push
│       ├── register/        # /api/register/*
│       ├── ping.ts          # GET /api/ping
│       ├── healthz.ts       # GET /api/healthz
│       ├── info.ts          # GET /api/info
│       └── [[default]].ts   # V1 API catch-all
├── node-functions/          # Node.js Functions
│   └── apns-proxy/          # APNs 的 HTTP/2 代理
├── src/
│   ├── apns/                # APNs 客户端和工具
│   ├── handlers/            # 业务逻辑处理器
│   ├── types/               # TypeScript 类型定义
│   └── utils/               # 辅助函数
├── docs/                    # 文档
│   ├── en/                  # 英文文档
│   │   └── configuration/   # 配置指南
│   │       └── env.md       # 环境变量指南
│   └── zh-cn/               # 中文文档
│       └── configuration/   # 配置指南
│           └── env.md       # 环境变量指南
└── AGENTS.md                # 开发指南
```

## 贡献

欢迎贡献！请阅读 [AGENTS.md](./AGENTS.md) 了解开发指南。

## 许可证

SPDX-License-Identifier: [Apache-2.0](./LICENSE)

## 致谢

- [Bark](https://github.com/Finb/Bark)
- [Bark Server](https://github.com/Finb/bark-server)
