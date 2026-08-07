---
title: "Devlog D3-5 — Cloud Chat SSE 流式对话"
date: 2026-08-06
tags: [chat, sse, deepseek, ai-core]
---

## 今日目标
- [x] `packages/ai-core` provider 抽象 + DeepSeek provider
- [x] SSE 工具函数（parseSSEStream + createSSEResponse）
- [x] `/api/chat` POST SSE 代理端点
- [x] 前端 Chat 页面 + useChat composable

## Cursor 对话摘要
- DeepSeek API 用的是 OpenAI 兼容格式，直接 fetch `https://api.deepseek.com/v1/chat/completions`，不需要专用 SDK
- SSE 解析踩坑：DeepSeek 返回的 `data:` 行格式和 OpenAI 一致，但有些行结尾没有 `\n\n` 双换行，需要在 buffer 中累积并手动拆行
- `createSSEResponse` 包装 AsyncGenerator<ChatChunk> → ReadableStream，Nuxt/Nitro 自动识别并保持连接

## 关键决策
- `packages/ai-core` 独立为 workspace package：Chat 和 Prompt Studio 共享 AI 调用逻辑，避免代码重复
- 消息级模型标注（`model` + `provider` + `latencyMs`）而非会话级：同一会话可自由切换模型，更符合实际使用场景
- 不引 langchain 等框架：fetch + SSE 解析总共不到 200 行，YAGNI

## 踩坑记录
- Nuxt 4.5 的 `useAsyncData` + `<script setup>` 触发 oxc-walker parseSync 报错 → 全局改用 `ref + onMounted + $fetch` 模式
- `<NuxtLayout name="chat">` 替代 `definePageMeta` 解决 oxc 编译问题

## 明日计划
- 会话管理（列表/新建/删除）
- Prompt Studio 模板 CRUD
