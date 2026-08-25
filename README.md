# Vibe Station 🚀

**个人 AI Developer Workspace** — 一个单仓一体化的全栈 AI 开发工作台，集成 AI Chat、Prompt Studio、Code Vault 和 Devlog。

> 3 周独立开发 · Nuxt 4.5 + Nitro + SQLite · DeepSeek 云端 + WebLLM 端侧双模型

## ✨ 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| **Home** | `/` | GitHub Stats 卡片 + 功能导航 |
| **AI Chat** | `/chat` | 消息级模型切换（Cloud / Local），会话管理，SSE 流式对话 |
| **Prompt Studio** | `/prompts` | 模板 CRUD + `{{variable}}` 变量系统 + 严格校验 + 测试追踪 |
| **Code Vault** | `/vault` | 代码片段管理 + AI 三段式中解释（用途/关键点/注意事项） |
| **Blog + Devlog** | `/blog` | 博客（DB）+ 开发日志（文件系统 `docs/devlog/*.md`） |
| **Showcase** | `/showcase` | EdgeGallery 端侧 AI 项目入口（壳页面） |

## 🏗 技术架构

```
┌─ UI 层 ──────────────────────────────────────────┐
│  Nuxt 4.5 + Vue 3.5 + Tailwind CSS v4             │
│  pages: index / chat / prompts / vault / blog     │
├─ BFF 层 ──────────────────────────────────────────┤
│  Nitro server routes + Access Token 中间件         │
│  SSE 流式转发 + IP 限流                            │
├─ AI Core ─────────────────────────────────────────┤
│  packages/ai-core: provider 抽象 + SSE 工具        │
│  云端: DeepSeek API (OpenAI 兼容)                  │
│  端侧: WebLLM / Qwen2.5-0.5B (WebGPU)            │
├─ 数据层 ──────────────────────────────────────────┤
│  Drizzle ORM + SQLite (WAL 模式)                   │
│  6 表: posts, prompts, prompt_runs, snippets,     │
│        chat_sessions, chat_messages                │
└──────────────────────────────────────────────────┘
```

## 📦 项目结构

```
vibe-station/
├── apps/web/                 # Nuxt 4.5 应用
│   ├── app/
│   │   ├── pages/            # 6 个核心页面
│   │   ├── composables/      # useChat, useLocalLLM, usePrompts
│   │   └── layouts/          # chat 布局
│   ├── server/
│   │   ├── api/              # Nitro API routes
│   │   ├── middleware/       # Access Token 认证
│   │   └── utils/            # DB 连接 (singleton)
│   └── tests/                # Vitest 单元测试 (31 tests)
├── packages/
│   ├── db/                   # Drizzle schema + migrations
│   ├── shared/               # 共享 TypeScript 类型
│   └── ai-core/              # AI 调用封装 (provider + SSE)
├── scripts/
│   ├── Dockerfile            # 生产 Docker 镜像
│   ├── deploy.sh             # 一键部署
│   └── backup-db.sh          # SQLite 每日备份
├── docs/devlog/              # Vibe Coding 开发日志
├── data/                     # SQLite 数据库文件
└── pnpm-workspace.yaml
```

## 🚀 快速开始

### 前置条件

- Node.js >= 22
- pnpm >= 10

### 安装与运行

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env：填入 DEEPSEEK_API_KEY 和 ACCESS_TOKEN

# 数据库迁移
pnpm db:generate
pnpm db:migrate

# 启动开发服务器
pnpm dev
# → http://localhost:3000
```

### Docker 部署

```bash
# 构建并运行
pnpm docker:build
pnpm docker:run

# 或使用一键部署脚本
bash scripts/deploy.sh
```

### 数据库备份

```bash
# 手动备份
pnpm backup

# Cron 每日凌晨 3 点自动备份
# 0 3 * * * /path/to/vibe-station/scripts/backup-db.sh
```

## 🧪 测试

```bash
pnpm test
# Vitest — 31 unit tests
# ✓ prompt-utils: extractVariables, render, validateVariables, escapeRegex
# ✓ sse: parseSSEStream, [DONE] signal, partial buffers, error handling
```

## 🔐 安全

- **认证**: Bearer Token 中间件保护所有 `/api/*` 路由（`/api/github-stats` 公开）
- **API Key**: DeepSeek API Key 仅存服务器环境变量，前端不可见
- **限流**: IP 限流（每 IP 每分钟 10 次云端调用）
- **Token 生成**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 📓 Devlog

21 篇 Vibe Coding 开发日志记录完整 AI 辅助开发过程——包括 Cursor/Copilot 的错误输出和人工纠正决策。查看 [docs/devlog/](docs/devlog/)。

## 📄 License

MIT

