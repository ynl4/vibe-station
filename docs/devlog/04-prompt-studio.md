---
title: "Devlog D6-8 — Prompt Studio 变量系统"
date: 2026-08-07
tags: [prompt, variable, validation, sse]
---

## 今日目标
- [x] Prompt 模板 CRUD（标题/描述/模板/分类/标签）
- [x] `{{variable}}` 变量提取（正则）+ 严格校验
- [x] 测试 Playground + SSE 流式输出
- [x] promptRuns 记录（变量/模型/延迟/token/状态）
- [x] localStorage 草稿自动保存

## Cursor 对话摘要
- 变量系统第一版用 handlebars 做模板渲染，太重；我要求改成正则提取 + replace，代码从 80 行降到 25 行
- 踩坑：变量名含中文时正则失配，改为 `/\{\{\s*([\w一-鿿]+)\s*\}\}/g` —— Unicode 范围 `一-鿿` 覆盖常用汉字
- Vue template 中 `{{ '{{' }}` 语法解析报错 → 改用 HTML entities `&#123;&#123;` 和 `&#125;&#125;`

## 关键决策
- 不引入模板引擎（Handlebars/Mustache）：变量系统只需占位替换，YAGNI
- 所有变量均为必填 —— 不区分可选/必填，降低认知负担
- 失败运行也写入 promptRuns（status='error'）：数据完整性优于"看起来好看"
- useCount 统计 + promptRuns 延迟/token 记录 → "数据驱动的 Prompt 迭代"

## 工程亮点
- 变量校验在前后端各执行一次：前端阻止无效提交提升 UX，后端保底防数据污染
- 草稿保护：切换模板前检测未保存内容 → 确认弹窗，防止误操作丢失

## 明日计划
- WebLLM 本地模式 + 下载状态机
- Code Vault + AI Explanation
