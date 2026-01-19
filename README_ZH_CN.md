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

### 步骤 1: 配置环境变量

你可以使用 EdgeOne CLI 或控制台设置环境变量。

#### 使用 EdgeOne CLI（推荐）

```bash
# 生成安全的代理密钥
export PROXY_SECRET=$(openssl rand -hex 32)

# 设置环境变量
# APNs 代理密钥配置（推荐）
npx edgeone pages env set APNS_PROXY_SECRET "$PROXY_SECRET"
# 访问认证（可选）
npx edgeone pages env set AUTH_CREDENTIALS "admin:admin123;user1:pass1"
```

#### 使用 EdgeOne Pages 控制台

进入项目设置并添加以下环境变量：

#### 可选变量

```env
# APNs 代理密钥配置（推荐）
APNS_PROXY_SECRET=your-shared-secret     # 代理认证密钥

# 访问认证（可选）
AUTH_CREDENTIALS=admin:admin123;user1:pass1;user2:pass2
```

**生成安全的代理密钥**：
```bash
# 生成随机 32 字节十六进制字符串
openssl rand -hex 32
```

**环境变量详细说明**: 查看 [ENV.md](./ENV.md) 获取完整文档。

### 步骤 2: 创建 KV 命名空间

1. 在 EdgeOne Pages 控制台，进入 **KV 存储**
2. 创建新的 KV 命名空间（例如 `bark-kv`）
3. 将其绑定到项目，绑定名称为 `KV_STORAGE`

### 步骤 3: 部署到 EdgeOne Pages

#### 方式 A: 使用 EdgeOne CLI

```bash
# 登录 EdgeOne
npx edgeone login

# 部署
npx edgeone pages deploy
```

#### 方式 B: 使用 GitHub 集成

1. 将代码推送到 GitHub
2. 在 EdgeOne Pages 控制台连接你的仓库
3. 配置构建设置：
   - **构建命令**: `npm run build`
   - **输出目录**: `dist`
4. 推送代码后自动部署

### 步骤 4: 测试部署

```bash
# 健康检查
curl https://your-domain.com/api/ping
```

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
├── ENV.md                   # 环境变量指南
└── AGENTS.md                # 开发指南
```

## 贡献

欢迎贡献！请阅读 [AGENTS.md](./AGENTS.md) 了解开发指南。

## 许可证

ISC

## 致谢

- [Bark](https://github.com/Finb/Bark)
- [Bark Server](https://github.com/Finb/bark-server)
