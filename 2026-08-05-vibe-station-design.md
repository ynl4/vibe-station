# Vibe Station — 个人 AI Developer Workspace 设计文档

> **日期**：2026-08-05 ｜ **版本**：v3（2026-08-06 更新）
> **状态**：设计已确认（Grill Session 13 项决策落地）
> **定位**：Vibe Coding 全流程作品集主页 —— 展示"用 AI 造 AI 工具"的完整工作流

## v3 变更记录（Grill Session 产出）

| 变更 | v2 | v3 | 理由 |
|------|----|----|------|
| Devlog 存储 | DB + MD 双源 | **纯 `docs/devlog/*.md`**，Blog 留 DB | 避免双源同步漂移 |
| Chat 模式粒度 | Session 级 `mode` | **Message 级**（`model`/`provider`/`latencyMs` 下移到 messages） | 同会话可自由切换模型 |
| 本地模型下载 | 无状态管理 | **下载状态机**（idle → downloading → ready / error）+ 用户确认 + IndexedDB | 300MB 首次体验可控 |
| Playground 草稿 | 丢失 | **localStorage 自动保存** + 离开页面前未保存提示 | 防止误操作丢失测试内容 |
| 变量缺失处理 | 未定义 | **严格校验**，阻止运行并提示缺失字段 | 保证 Prompt 执行结果可控 |
| 浏览器检测 | `navigator.deviceMemory` | **WebGPU 检测** + 用户主动选择，默认 Cloud | Safari/Firefox 兼容 |
| PM2 部署 | 未定实例数 | **单实例 + WAL 模式 + Docker** | 避免 SQLite 写锁冲突 |
| 开发顺序 | AI Chat + Prompt 并行 | **Cloud → Prompt → WebLLM** | 降低 WebLLM 风险拖累核心交付 |
| 认证 | 无 | **Simple Access Token + IP 限流** | 防止 API 滥用和费用风险 |
| 测试覆盖 | 3 条 E2E | **扩展至变量解析、SSE 中断、模型切换、失败重试等场景** | Prompt Studio 作为核心需保证稳定性 |
| 新增包 | — | **`packages/ai-core`** | 模型能力模块化，Chat 和 Prompt Studio 共享 |

---

## 1. 项目概述

### 1.1 一句话定位

一个**单仓一体化**的个人 AI Developer Workspace，集成 AI Chat（消息级模型切换）、Prompt Studio（Prompt 管理 + 变量校验 + 测试追踪）、Code Vault（代码片段 + AI 解释）、Devlog（Vibe Coding 过程记录）、EdgeGallery Showcase（端侧 AI 项目入口）五大模块。

### 1.2 已确认的关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 部署形态 | 自建服务器 + 全功能后端 | 后端能力全开，面试可讲服务端架构 |
| 前端框架 | Nuxt 3 | 复用已有 Vue 经验，Nitro 内置后端 |
| 架构方案 | 方案 A：Nuxt 3 全栈单仓 | YAGNI，不引独立 Hono 进程 |
| AI 模式 | 消息级手动切换（本地/云端），自动路由后置 | 同会话自由切换，行为可预期 |
| 核心模块 | Prompt Studio（替代 TODO） | 命中 JD Prompt 工程要求 |
| 认证方案 | Simple Access Token + IP 限流 | 挡滥用不引入复杂 OAuth |
| 部署方式 | Docker 单容器 + 单实例 | 匹配个人工具站定位，避免 SQLite 写锁 |
| 模型能力 | `packages/ai-core` 模块化 | Chat 和 Prompt Studio 共享 AI 调用逻辑 |

### 1.3 与 JD 的对口映射

| JD 要求 | Vibe Station 对应模块 |
|---------|----------------------|
| 搭建 Prompt 工程与 AI 研发工作流 | **Prompt Studio**（模板管理 + 变量校验 + 测试记录 + 延迟追踪） |
| 端侧大模型 / 端侧 AI 技术 | **AI Chat 本地模式**（WebLLM/Qwen2.5-0.5B，WebGPU 优先）+ EdgeGallery Showcase |
| 使用 Cursor/Trae AI 工具开发 | **Devlog**（全流程记录 AI 辅助开发，含纠错过程） |
| AI 应用架构、开发与迭代 | 整体架构 + Code Vault AI 解释 + `packages/ai-core` 模块化设计 |
| GitHub 持续提交记录 | GitHub Stats + devlog 日更 |

---

## 2. 整体架构

### 2.1 分层设计

| 层 | 职责 | 技术选型 |
|----|------|---------|
| **UI 层** | 6 个核心页面 + Vue 组件 | Nuxt 3 + Tailwind CSS |
| **BFF 层** | 统一 API 入口 + 认证中间件，前端不直连 DB/外部 API | Nitro server routes + Access Token 中间件 |
| **AI Core 层** | 模型调用封装，Chat 和 Prompt Studio 共享 | `packages/ai-core`（provider 抽象 + SSE 工具） |
| **数据层** | 结构化数据存储 | Drizzle ORM + SQLite（WAL 模式，`./data/vibe-station.db`） |
| **AI 推理层** | 本地推理（浏览器 WebGPU/WASM）+ 云端代理（Nitro） | Transformers.js / WebLLM + DeepSeek API |

### 2.2 核心页面（6 个）

| 页面 | 路由 | 内容 |
|------|------|------|
| 首页 | `/` | GitHub Stats 卡片 + 功能导航 + 最新 devlog |
| AI Chat | `/chat` | 消息级模型切换 + 会话历史 + 模型下载管理 |
| Prompt Studio | `/prompts` | 模板库 + 变量校验 + 测试 Playground + 草稿保存 |
| Code Vault | `/vault` | 代码片段 CRUD + AI 解释 + 搜索 |
| Devlog | `/blog` | 博客（DB）+ devlog 专栏（Nuxt Content，读 `docs/devlog/*.md`） |
| Showcase | `/showcase` | EdgeGallery 项目入口（本期壳，后续填内容） |

### 2.3 API 路由（Nitro server routes）

所有 `/api/*` 路由经 Access Token 中间件校验（`Authorization: Bearer <token>`），`/api/github-stats` 除外（公开）。

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/chat` | POST (SSE) | 需要 | AI 对话云端代理，流式转发 |
| `/api/chat/sessions` | GET/POST/DELETE | 需要 | 会话管理 |
| `/api/explain` | POST | 需要 | 代码片段 AI 解释（云端） |
| `/api/prompts` | GET/POST/PATCH/DELETE | 需要 | Prompt 模板 CRUD |
| `/api/prompts/:id/run` | POST (SSE) | 需要 | Prompt 测试执行 + 变量校验 + 记录 |
| `/api/snippets` | GET/POST/PATCH/DELETE | 需要 | Code Vault CRUD |
| `/api/github-stats` | GET | 无需 | GitHub API 聚合，缓存 6h |

### 2.4 目录结构

```
vibe-station/
├── apps/web/
│   ├── pages/                  # index, chat, prompts, vault, blog, showcase
│   ├── components/             # ChatBox, ModelSwitcher, PromptEditor,
│   │                           # PromptPlayground, SnippetCard, ExplainPanel,
│   │                           # ModelDownloadDialog, VariableForm...
│   ├── composables/            # useChat, useLocalLLM, usePrompts, useSnippets,
│   │                           # useDraft, useModelDownload
│   ├── server/
│   │   ├── api/                # Nitro routes
│   │   ├── middleware/         # auth.ts（Access Token 校验）
│   │   └── db/                 # 运行时数据库连接（import from @vibe/db）
│   └── nuxt.config.ts
├── packages/
│   ├── db/                     # Drizzle schema + migrations
│   │   ├── schema/             # posts, prompts, prompt_runs, snippets, chat
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   └── package.json        # pnpm db:migrate 命令
│   ├── shared/                 # 共享 TypeScript 类型
│   │   └── types/              # ChatMessage, Prompt, PromptRun, Snippet, Post
│   └── ai-core/                # AI 模型调用封装
│       ├── providers/          # deepseek.ts, qwen-local.ts
│       ├── sse.ts              # SSE 流式响应工具
│       └── types.ts            # AIProvider, ChatRequest, ChatChunk
├── scripts/
│   ├── backup-db.sh            # SQLite 每日备份（cron）
│   ├── deploy.sh               # 服务器部署一键脚本
│   └── Dockerfile              # 单容器部署
├── docs/
│   ├── devlog/                 # Vibe Coding 开发日志（Nuxt Content 源文件）
│   └── plans/                  # 设计文档（本文档）
├── .env.example                # DEEPSEEK_API_KEY / ACCESS_TOKEN
└── pnpm-workspace.yaml
```

**包依赖关系：**
- `apps/web` → `@vibe/db`（workspace:* 直接 import schema + db 实例）
- `apps/web` → `@vibe/ai-core`（workspace:* 共享 AI 调用逻辑）
- `apps/web` → `@vibe/shared`（workspace:* 共享类型）
- `packages/db` 独立管理 migrations（`pnpm --filter @vibe/db db:migrate`）

---

## 3. 数据模型（Drizzle Schema）

```typescript
// packages/db/schema/posts.ts — 博客（仅 blog 类型）
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),           // markdown
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Devlog 不存数据库，由 @nuxt/content 直接读取 docs/devlog/*.md
// 职责分离：DB 管博客（动态内容），MD 管开发日志（版本化文档）

// packages/db/schema/prompts.ts — Prompt Studio 模板
export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  template: text('template').notNull(),         // 含 {{variable}} 占位符
  category: text('category').notNull(),         // coding | writing | analysis | review
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  useCount: integer('use_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// packages/db/schema/prompt_runs.ts — Prompt 测试记录
export const promptRuns = sqliteTable('prompt_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  promptId: integer('prompt_id')
    .references(() => prompts.id).notNull(),
  variables: text('variables', { mode: 'json' })
    .$type<Record<string, string>>().notNull(),
  model: text('model').notNull(),               // 'qwen2.5-0.5b' | 'deepseek-v3'
  provider: text('provider').notNull(),         // 'local' | 'cloud'
  output: text('output').notNull(),
  outputTokenCount: integer('output_token_count'),   // 估算 token 数
  outputTruncated: integer('output_truncated').default(0),  // 0=完整 1=已截断
  latencyMs: integer('latency_ms'),
  status: text('status').notNull().default('success'),  // 'success' | 'error'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// packages/db/schema/snippets.ts — Code Vault
export const snippets = sqliteTable('snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  code: text('code').notNull(),
  language: text('language').notNull(),
  explanation: text('explanation'),             // AI 生成的解释（可选）
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// packages/db/schema/chat.ts — AI Chat 会话（不再存储 mode）
export const chatSessions = sqliteTable('chat_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),               // 首条用户消息截断自动生成
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id')
    .references(() => chatSessions.id).notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  model: text('model'),                         // 'qwen2.5-0.5b' | 'deepseek-v3'（assistant 消息）
  provider: text('provider'),                   // 'local' | 'cloud'（assistant 消息）
  latencyMs: integer('latency_ms'),             // 推理耗时（assistant 消息）
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**设计说明：**
- **Devlog** 不存数据库，由 `@nuxt/content` 读 `docs/devlog/*.md`。Blog 和 Devlog 职责分离 —— DB 管动态内容，Markdown 管版本化文档
- **`chatSessions.mode` 移除**，模式信息下沉到 `chatMessages`（`model` + `provider` + `latencyMs`），同一会话内可自由切换模型
- **`promptRuns` 新增字段**：`outputTokenCount`（估算）、`outputTruncated`（超长截断标记）、`status`（区分成功/失败），数据规模可控
- Prompt 运行失败也写入 `promptRuns`（`status='error'`, `output` 记错误信息），便于复盘
- 会话标题由首条用户消息截断自动生成（省一次 API 调用）
- Prompt 版本管理、A/B 对比测试 → v2.1 增强（YAGNI 暂缓）

---

## 4. 核心模块详解

### 4.1 AI Chat（消息级模型切换 + 下载状态管理）

**模型切换逻辑（v3）：**

```
/chat 页顶部 ModelSwitcher 组件
   │
   ├── [Local] Qwen2.5-0.5B ──► WebLLM / Transformers.js（WebGPU → WASM fallback）
   │      │
   │      ├── 模型状态机：idle → downloading(进度%) → ready → error
   │      │   - 首次使用：弹窗展示模型大小(~300MB)、下载进度条、确认按钮
   │      │   - 模型缓存在 IndexedDB（WebLLM 默认）或 Cache API
   │      │   - 支持失败重试（续传由 WebLLM 库自身支持）
   │      │   - ready 后：正常对话，消息气泡标注 Local badge
   │      │
   │      ├── 设备检测：优先检测 WebGPU 支持（navigator.gpu），
   │      │   不依赖 navigator.deviceMemory（Safari/Firefox 不兼容）
   │      │   WebGPU 不可用 → WASM fallback（慢但能跑）
   │      │   两者都不可用 → 禁用 Local 选项并说明原因
   │      │
   │      └── 失败 → toast "本地推理不可用，请切换云端"
   │          （不自动降级，用户手动切换 —— 行为可预期）
   │
   └── [Cloud] DeepSeek ──► POST /api/chat (SSE)
          Nitro 代理，API Key 只存服务器环境变量
          Access Token + IP 限流：每 IP 每分钟 10 次
```

**要点：**
- **消息级模型标注**：每条 assistant 消息记录 `model`、`provider`、`latencyMs`，气泡上展示 badge（`Local` / `Cloud`）和延迟
- **默认模式**：新会话默认 Cloud（降低首次使用门槛），用户主动切换到 Local
- **切换行为**：在同一会话中切换模型后，下一条消息使用新模型，历史消息保留各自的模型标注
- 自动复杂度路由 → v2.1 增强，届时基于手动切换的使用数据设计规则

### 4.2 Prompt Studio（本期技术核心）

**三大功能区：**

**① 模板库（左侧）**
- 卡片列表：标题、分类 badge、描述、使用次数
- 分类筛选：coding / writing / analysis / review
- 新建/编辑：模板编辑器支持 `{{variable}}` 语法高亮，输入时实时提取并展示变量列表

**② 测试 Playground（右侧，含草稿保护）**
```
选中模板 → 自动解析 {{variables}} → 生成变量表单
   → 每个变量为必填字段，缺失时红色边框 + 提示文案
   → 填充变量 → 选择模型（Local / Cloud）
   → 点击运行 → 前端校验：变量完整性检查
       ├── 缺失变量 → 阻止运行，滚动到第一个缺失字段，提示 "请填写 {{variable_name}}"
       └── 通过 → 渲染最终 Prompt（可展开查看）→ SSE 流式输出
           → 自动写入 prompt_runs（变量/模型/输出/token数/耗时/状态）
```

**变量校验规则：**
- 正则 `/{{\s*([\w一-龥]+)\s*}}/g` 提取模板中所有变量
- 所有变量为必填（不区分可选/必填，YAGNI）
- 校验不通过时阻止运行，不将原始占位符或空值发给模型

**草稿保护机制：**
- 用户修改模板或填写变量后，自动存入 `localStorage`（key: `prompt-draft-{templateId}`）
- 切换模板时检测未保存内容 → 弹窗确认 "当前 Playground 有未保存内容，是否丢弃？"
- 切换前自动保存当前草稿，切回时恢复

**③ 测试记录（底部折叠面板）**
- 该模板的最近 10 次运行：变量快照、模型 provider、延迟、token 数、输出预览（超长截断显示）
- 支持"再次运行"（复用变量）和"对比两次输出"（v2.1）
- 失败运行也展示（`status='error'`），output 显示错误信息

**工程亮点（面试话术）：**
- 变量系统：正则提取 + 严格校验，不引模板引擎（YAGNI），含中文变量名支持
- useCount 统计 + promptRuns 延迟/token 记录 → "数据驱动的 Prompt 迭代"叙事
- 草稿保护 + localStorage 自动保存 → 工程化细节

### 4.3 Code Vault（+ AI 解释）

- **保存流程**：粘贴代码 → 选语言 → 填标题/标签 → 可选勾选"AI 生成解释"
- **AI 解释**：勾选后调 `/api/explain`（需 Access Token）→ 云端生成中文解释（用途/关键点/注意事项三段式）→ 存入 `explanation` 字段
- **保存时 AI 解释异步**：先保存代码片段（即时完成），若勾选了 AI 解释则在后台异步生成后更新 `explanation` 字段，避免用户等待
- **展示**：代码（Shiki 高亮）与解释双栏布局，解释可折叠
- **搜索**：关键词 + 语言 + 标签筛选（SQLite LIKE 够用）

### 4.4 Devlog

- **数据源**：纯文件系统，不经过数据库。`@nuxt/content` + Shiki 读取 `docs/devlog/*.md` 按日期倒序排列
- **与 Blog 的职责分离**：Blog 存 DB（`posts` 表），Devlog 存 MD 文件（版本可控，可随代码提交）
- 固定模板（见 6.3），真实记录"AI 出错 → 人工纠正"过程

### 4.5 EdgeGallery Showcase（本期做壳）

- 静态展示页：项目简介、架构图占位、演示视频占位（`<video>` 预留）、APK 下载卡片（"Coming Soon"态）
- 价值：提前把叙事线埋好，EdgeGallery 完成后只需填内容不改结构

---

## 5. 错误处理、认证与测试

### 5.1 错误处理

| 场景 | 策略 |
|------|------|
| API 错误 | 统一格式 `{ code, message }`，前端 toast |
| Access Token 缺失/无效 | 返回 401 `{ code: 'UNAUTHORIZED', message: 'Access token required' }` |
| 云端 API 限流 | 429 + Retry-After header，前端提示"请求过于频繁，请稍后重试" |
| 本地推理失败 | toast 提示手动切云端（不自动降级，行为可预期） |
| 模型下载失败 | 状态机 → error，展示重试按钮，提示"下载失败，请检查网络后重试" |
| 云端 API 失败 | 重试 1 次 → 友好错误，不暴露上游 API Key 或内部细节 |
| Prompt 变量校验失败 | 阻止运行，滚动到缺失字段，逐个提示 |
| Prompt 运行失败 | 失败也写入 prompt_runs（`status='error'`, `output` 记错误信息），便于复盘 |
| SQLite 写入失败 | 重试 2 次 + 错误日志落盘 |

### 5.2 认证方案

- **方案**：Simple Access Token（`Authorization: Bearer <token>`）
- **配置**：Token 存储在服务器 `.env`（`ACCESS_TOKEN=<random-64-char>`），部署时设置
- **中间件**：Nitro server middleware 拦截 `/api/*` 路由（`/api/github-stats` 白名单除外）
- **前端**：Token 存入 `localStorage`，首次访问时弹窗要求输入（或直接在 URL 中携带 `?token=xxx`）
- **限流叠加**：即使 Token 通过，仍执行 IP 限流（每 IP 每分钟 10 次云端调用）

### 5.3 测试策略

| 层 | 工具 | 范围 |
|----|------|------|
| 单元测试 | Vitest | Prompt 变量解析（含中文变量名）、模板渲染、API handler 核心逻辑、Access Token 中间件 |
| 集成测试 | Vitest + Test DB | DB CRUD 操作、promptRuns 写入（成功/失败场景）、会话+消息关联查询 |
| E2E | Playwright | 至少 5 条核心链路 |
| CI | GitHub Actions | PR 触发 lint + 单测 + 集成测试，主分支触发 e2e |

**E2E 核心链路（Playwright）：**

| # | 链路 | 验证点 |
|---|------|--------|
| 1 | 新建 Prompt → 填变量 → Cloud 运行 → 查看测试记录 | 变量校验、SSE 流式输出、promptRuns 落库 |
| 2 | 变量缺失时阻止运行 → 补全后成功 | 前端校验生效、错误提示正确 |
| 3 | 保存代码片段 + 勾选 AI 解释 | 片段即时保存、explanation 异步更新 |
| 4 | 发一条云端对话 → 切 Local → 再发一条 | 消息级模型标注、会话历史完整性 |
| 5 | 未认证请求 /api/chat → 401 | Access Token 中间件生效 |

---

## 6. 开发路线图（3 周）

### Week 1：骨架 + Devlog + Stats

| 天 | 任务 | 产出 |
|----|------|------|
| D1 | pnpm monorepo + Nuxt 3 + Tailwind 初始化 + `packages/ai-core` 骨架 | 仓跑起来 |
| D2 | Drizzle schema（5 表）+ SQLite WAL 迁移 + Access Token 中间件 | DB + 认证就绪 |
| D3-4 | 博客系统（DB posts）+ devlog 专栏（Nuxt Content） | 内容系统上线 |
| D5 | GitHub Stats API + 6h 缓存 | Stats 卡片 |
| D6-7 | 首页整合 + 导航 + Showcase 壳页面 | 站点成型 |

**里程碑**：站点可访问，有内容，Showcase 占位可见，认证中间件就位。

### Week 2：Cloud Chat → Prompt Studio → WebLLM（顺序调整）

| 天 | 任务 | 产出 |
|----|------|------|
| D1-2 | `packages/ai-core` provider 抽象 + `/api/chat` SSE 代理 + 云端对话 | 云端 Chat 可用 |
| D3 | Chat 会话管理（列表/新建/删除）+ 消息级模型标注 | 会话系统完整 |
| D4 | Prompt 模板 CRUD + 变量提取/渲染 + 严格校验 | 模板库可用 |
| D5-6 | Playground + promptRuns 记录 + 草稿保护（localStorage） | **Prompt Studio 完整闭环** |
| D7 | 缓冲日 / Prompt Studio 打磨 | 核心模块稳定 |

**里程碑**：Prompt Studio 全流程跑通（本期技术含量最高部分），Cloud Chat 可用。

### Week 3：WebLLM + Code Vault + 部署 + 打磨

| 天 | 任务 | 产出 |
|----|------|------|
| D1-2 | WebLLM 本地模式 + 下载状态机 + 消息级切换 | 双模式 Chat 完整 |
| D3 | Code Vault CRUD + `/api/explain` AI 解释（异步） | 片段库上线 |
| D4 | Dockerfile + deploy.sh + WAL 模式确认 | Docker 可运行 |
| D5-6 | 性能优化（Lighthouse 90+）+ SEO + 测试补全 | 体验达标 |
| D7 | README + 演示视频 + devlog 补全 | 可写进简历 |

**为什么 WebLLM 放 Week 3：**
- Cloud Chat 和 Prompt Studio 是核心业务价值，先保证上线
- WebLLM 调试周期不确定性高（WebGPU 兼容性、WASM 性能、300MB 加载体验）
- 后置可确保即使 WebLLM 遇到困难，核心功能已全量交付

### 6.3 devlog 固定模板

```markdown
# Devlog D5 - Prompt 变量系统设计

## 今日目标
- [x] 模板 CRUD
- [ ] 变量表单动态生成（进度 70%）

## Cursor 对话摘要
- Cursor 第一版用 handlebars 做模板渲染，太重；我要求改成正则提取 + replace，代码从 80 行降到 25 行
- 踩坑：变量名含中文时正则失配，改为 /{{\s*([\w一-龥]+)\s*}}/g

## 关键决策
- 不引模板引擎：变量系统只需占位替换，YAGNI

## 明日计划
- Playground SSE 接入
```

**要点**：真实记录"AI 出了什么错、你怎么纠正的" —— 比"AI 帮我写了 XX"值钱 10 倍。

---

## 7. 部署方案

```
用户 ──► Caddy（自动 HTTPS）──► Nuxt/Nitro (Docker 单容器, 端口 3000)
                                     │
                                     ├── SQLite 文件（./data/，WAL 模式）
                                     └── 上游 AI API（DeepSeek/Moonshot）
```

- **容器化**：单 Docker 容器（`node:20-alpine`），`docker build -t vibe-station . && docker run -p 3000:3000 --volume ./data:/app/data vibe-station`
- **进程管理**：单实例运行（配合 SQLite 避免写锁冲突）
- **SQLite**：WAL 模式开启（`PRAGMA journal_mode=WAL;`），提升并发读能力
- **反代**：Caddy（自动 HTTPS，配置 3 行），后续公网部署时开启
- **备份**：cron 每日 `backup-db.sh`，7 天滚动保留
- **开发阶段**：优先确保 Docker 可运行，公网部署作为后续阶段（需提前准备服务器+域名；国内需备案，推荐香港/海外节点快速展示）

**安全红线：**
- API Key（DeepSeek/Moonshot）只在 `.env` + 服务器环境变量，`.env.example` 只提交占位符
- `ACCESS_TOKEN` 同上述管理，前端 bundle grep 不到任何 key（CI 加检查脚本）
- `/api/*` 路由统一 Access Token 中间件（`/api/github-stats` 除外）
- 云端接口 IP 限流 + Token 双重防护

---

## 8. 简历文案（v3）

> **Vibe Station — 个人 AI Developer Workspace**（独立开发，3 周上线）
> 基于 Nuxt 3 + Nitro + SQLite 的单仓全栈应用。核心模块 **Prompt Studio** 实现 Prompt 模板管理、`{{variable}}` 变量系统与严格校验、双模型（浏览器端侧 Qwen2.5-0.5B / 云端 DeepSeek）测试 Playground、运行记录追踪（含 token 消耗与延迟统计）；自研 `packages/ai-core` 模块化 AI 调用层；Code Vault 集成异步 AI 代码解释；AI Chat 支持消息级模型切换，WebLLM 本地推理含下载状态机管理。开发全程使用 Cursor AI 辅助，21 篇 devlog 公开于站内。GitHub: xxx

**面试话术锚点：**
- "Prompt Studio 的 promptRuns 表记录每次测试的变量/模型/延迟/token —— 我做的不是 Prompt 收藏夹，是**数据驱动的 Prompt 迭代工具**"
- "我设计了消息级模型切换而非会话级，因为实际使用中用户会在同一对话中对比本地和云端效果 —— 这是从真实使用场景倒推的数据模型设计"
- "`packages/ai-core` 是我刻意拆出的独立包 —— Chat 和 Prompt Studio 都需要调用 AI，模块化避免了代码重复，也展示了工程化思维"

---

## 9. v2.1+ 增强 backlog（本期不做）

| 增强 | 触发条件 |
|------|---------|
| AI 自动复杂度路由 | 积累 50+ 次手动切换数据后设计规则 |
| Prompt 版本管理 + A/B 对比 | 模板数 > 30 |
| promptRuns 大资源 artifact 存储 | 单次输出超 100K token 时 |
| Code Vault 向量语义检索 | 片段数 > 100 |
| EdgeGallery Showcase 填内容 | EdgeGallery Week 2 完成后 |
| Prompt 市场（公开分享） | 有真实用户后 |

---

**设计确认人**：yzh ｜ **Grill Session**：2026-08-06（13/13 决议落地）
**下一步**：Week 1 D1 搭建 monorepo 骨架
