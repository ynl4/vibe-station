---
title: "Devlog D9-11 — WebLLM 本地推理 + Code Vault"
date: 2026-08-07
tags: [webllm, webgpu, local-ai, code-vault]
---

## 今日目标
- [x] WebLLM 本地模式（Qwen2.5-0.5B-Instruct）
- [x] 模型下载状态机（idle → downloading → ready → error）
- [x] 消息级模型切换（Cloud / Local）
- [x] Code Vault CRUD + AI 三段式解释
- [x] Dockerfile + deploy.sh + 备份脚本
- [x] Vitest 单元测试（31 tests）

## Cursor 对话摘要
- @mlc-ai/web-llm 的 `CreateMLCEngine` 在 WebGPU 可用时自动选用 GPU，否则 fallback WASM
- 模型下载进度通过 `initProgressCallback` 回调，`progress.text` 字段包含百分比信息
- 踩坑：WebLLM 模型约 300MB，首次下载需 3-5 分钟，需要明确的进度 UI 让用户知道在发生什么
- Safari/Firefox 不暴露 `navigator.deviceMemory` → 改用 `navigator.gpu` 检测 WebGPU 支持

## 关键决策
- 下载状态机：idle → downloading(进度%) → ready → error，每个状态有对应 UI
- 默认 Cloud → 用户主动切 Local：降低首次使用门槛
- 不自动降级：Local 失败 → toast 提示切 Cloud，行为可预期
- AI 解释采用三段式中格式（用途/关键点/注意事项），比笼统的解释信息密度更高
- 解释保存异步执行：先保存代码片段，AI 解释后台更新，避免用户等待

## 部署
- Docker 单容器（node:22-alpine），多阶段构建
- SQLite WAL 模式已确认（`PRAGMA journal_mode=WAL`）
- backup-db.sh 每日备份 + 7 天滚动保留

## 明日计划
- 公网部署 + Caddy HTTPS
- Demo 视频录制
