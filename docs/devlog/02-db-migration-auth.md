---
title: "Devlog D2 - DB Migration + Auth 中间件"
date: 2026-08-06
tags: [drizzle, sqlite, auth, nitro]
---

## 今日目标
- [x] Drizzle 首次 migration 生成（6 表）
- [x] SQLite WAL 模式 + 迁移应用
- [x] Access Token 认证中间件
- [x] `/api/health` 验证端点

## Cursor 对话摘要
- drizzle-kit 的 `migrate` 命令不直接支持 SQLite，需要自己写 `migrate.ts` 脚本用 `drizzle-orm/migrate` 的 `migrate()`
- 需要安装 `tsx` 来运行 TS 迁移脚本
- Nitro middleware 放在 `server/middleware/` 目录，`defineEventHandler` 对每个请求执行

## 关键决策
- 迁移脚本放在 `packages/db/src/migrate.ts`，不在 apps/web 里 —— DB 包自己管理自己的迁移
- Auth 中间件用 Nitro 原生 `defineEventHandler`，不引第三方库

## 明日计划
- 博客系统 + devlog 专栏
