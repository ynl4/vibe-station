import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // ── App Head (SEO & Meta) ──────────────────────────────────
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      titleTemplate: '%s — Vibe Station',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Vibe Station — 个人 AI Developer Workspace，集成 AI Chat、Prompt Studio、Code Vault 和 Devlog' },
        { name: 'author', content: 'yzh' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Vibe Station' },
        { property: 'og:description', content: '个人 AI Developer Workspace — AI Chat + Prompt Studio + Code Vault' },
        { name: 'twitter:card', content: 'summary' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  // ── Nitro Server (Performance) ─────────────────────────────
  nitro: {
    compressPublicAssets: true,
    minify: true,
    routeRules: {
      // Cache static assets aggressively
      '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
      // GitHub stats cached 6h in-memory; allow CDN caching
      '/api/github-stats': { headers: { 'Cache-Control': 'public, max-age=3600' } },
    },
  },

  runtimeConfig: {
    githubUsername: process.env.GITHUB_USERNAME || 'yzh',
    public: {
      accessToken: process.env.ACCESS_TOKEN || 'dev-token-change-me',
    },
  },
});
