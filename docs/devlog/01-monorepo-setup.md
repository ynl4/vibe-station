---
title: "Devlog D1 - pnpm Monorepo 搭建"
date: 2026-08-06
tags: [monorepo, pnpm, nuxt3, tailwind]
---

## 今日目标
- [x] pnpm workspace 初始化
- [x] Nuxt 4.5 + Tailwind CSS v4 搭建
- [x] packages/db + packages/shared + packages/ai-core 骨架

## Cursor 对话摘要
- Nuxt 4.5 用了 Rolldown 替代 webpack，Windows 上需要额外安装 `@rolldown/binding-win32-x64-msvc`
- Tailwind v3 的 `@nuxtjs/tailwindcss` 模块不兼容 Nuxt 4.5 / Vite 8，改用了 `@tailwindcss/vite` 直连方式
- 踩坑：`@import "tailwindcss"` 语法是 v4 的，之前写成了 v3 的 `@tailwind base/components/utilities`

## 关键决策
- Tailwind CSS v4 替代 v3：Nuxt 4.5 生态已经往前走了，不回头兼容
- 三个独立 package 而非单文件：db、shared、ai-core 各自独立，职责清晰

## 明日计划
- Drizzle migration 首次运行
- Access Token 认证中间件
